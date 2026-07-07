/**
 * ゲームエンジン：時間減衰・オフライン進行・成長・図鑑登録・永続化
 * - 時刻は now(ms) を注入できる決定論的設計（Date.now() を直呼びしない）
 * - 状態はイミュータブルに更新（{...s} で新規生成）
 */
(function (global) {
  'use strict';

  var SAVE_KEY = 'inuneko_dex_save_v1';
  var VERSION = 19;
  var H = 3600000; // 1時間(ms)
  var MAX_OFFLINE = 24 * H; // 報酬（コイン・なかよし）の上限
  var MAX_SIM = 72 * H;     // 生存シミュレーションの上限（3日分は結果と向き合う）

  // ▼▼ バランス: 通常は本番設定（成体まで数日／放置だけでは死なない＝“育てた重み”と“責めない”を守る）。
  // 手動プレイテスト用に「はや回し」を隠しトグルで有効化できる（localStorageに永続）。出荷既定はOFF。
  var DEV_FAST_KEY = 'inuneko_dev_fast_v1';
  var IS_TEST = false;
  var TEST_XP_PER_H = 2400; // はや回し時のみ: 成体xp760まで快適度しだいで約25〜35分
  var TEST_DECAY_MUL = 14;  // はや回し時のみ: 生存の時計も速める（放置で“死ぬ気がする”か確認用）
  try { if (typeof global !== 'undefined' && global.localStorage && global.localStorage.getItem(DEV_FAST_KEY) === '1') IS_TEST = true; } catch (e) {}
  // E2E/単体テストは必ず通常バランス（決定論検証。はや回しフラグより優先）
  if (typeof global !== 'undefined' && global.__INUNEKO_NORMAL_BALANCE__) IS_TEST = false;
  // ▲▲

  // ----- いのちと家出（生存システム。docs/GAME_DESIGN.md が正）-----
  // ごはん（えさ）を切らすと おほしさま（死・リミット短め／ストックが日数バッファ）。
  // さんぽ（学習・運動などのいい時間）を怠ると 家出（リミット長め）。
  var SANPO_DECAY = 100 / 168;  // さんぽゲージの自然減衰 /h（1週間で空＝リミット長め）
  var STARVE_DRAIN = 100 / 24;  // おなか0のあいだの いのち消耗 /h（空腹12h+24h=ストック切れから36hでおわかれ）
  var HEALTH_REGEN = 100 / 48;  // おなか>30のときの いのち回復 /h
  var RUNAWAY_H = 72;           // さんぽゲージ0がこの時間つづくと家出（7日+3日=計10日で出ていく）
  // えさ: スマホを触らない時間で貯まり、自動で与えられる
  var FOOD_PER_HOUR = 0.1;      // アプリを閉じている時間の弱い補給（2.4えさ/日。主獲得は「おすわり」セッション）
  var FOOD_STOCK_MAX = 21;      // ストック上限（約1週間ぶん）
  var FOOD_HUNGER = 60;         // えさ1つぶん の満腹回復
  var AUTO_FEED_AT = 40;        // おなかがこれ未満になったら自動給餌
  // ----- えさ（食料の源泉はスマホを置いた時間。GAME_DESIGN.md §2.5）-----
  var FOOD_COST = 20;                  // コインでの購入（コイン=放置時間の蓄積→これも間接デトックス由来）
  var HAND_FEED_BONUS = { xp: 6 };     // 自動給餌でなく「てであげる」と仲が深まる（なかよし＝xp）
  function walkFoodGain(minutes) { return minutes >= 180 ? 12 : minutes >= 120 ? 8 : minutes >= 60 ? 4 : 2; } // おすわり（長いほど増量）
  function taskFoodGain(minutes) { return Math.max(1, Math.round(minutes / 30)); } // さんぽ課題でも餌（取り組んだぶん・控えめ）
  var STARTER_STOCK = 6;
  // さんぽ（課題セッション）: 読書・英語・運動＋自由入力。失敗なし・時間ぶんゲージ回復
  var TASK_KINDS = ['ほんよみ', 'えいご', 'うんどう', 'ダイエット']; // ＋UIで「じぶんで」自由入力
  var TASK_OPTIONS = [15, 30, 60];     // 分（＋UIでカスタム分）
  var TASK_MIN = 5, TASK_MAX = 180;    // カスタム分の許容範囲
  function taskSanpoGain(minutes) { return 20 + minutes; } // 15分=+35 / 30分=+50 / 60分=+80
  // さんぽ課題の完了でダッシュボード統計を更新（継続日数＝連続して取り組んだ日数）
  function bumpTaskStats(prev, kind, minutes, now) {
    var st = prev || { success: 0, days: 0, bestDays: 0, lastDay: null, totalMin: 0, byKind: {} };
    var day = dayIndex(now), days = st.days || 0, newDay = false;
    if (st.lastDay == null || day > st.lastDay + 1) { days = 1; newDay = true; }   // 初回 or 間があいた→リセット
    else if (day === st.lastDay + 1) { days = (st.days || 0) + 1; newDay = true; } // 連続した日
    // day === st.lastDay は同じ日の2回目以降（日数は据え置き）
    var byKind = { ...(st.byKind || {}) };
    byKind[kind] = (byKind[kind] || 0) + minutes;
    var bestDays = Math.max(st.bestDays || 0, days);
    return {
      stats: { success: (st.success || 0) + 1, days: days, bestDays: bestDays, lastDay: day, totalMin: (st.totalMin || 0) + minutes, byKind: byKind },
      newDay: newDay, isBestDay: newDay && days >= bestDays
    };
  }

  // ----- おすわり（UI「おすわり」/ Forest型オナーセッション）= ごはんの主獲得 -----
  // 開始後はスマホを置いて過ごす。満了前にアプリへ戻ると中断（開始直後60秒の猶予あり）。長いほど餌増。
  var WALK_GRACE = 60000;            // 開始から60秒は戻っても失敗にしない（誤タップ・着信の救済）
  var WALK_OPTIONS = [30, 60, 120, 180]; // おすわりの長さ（分）。長いほど餌が増える
  var WALK_XP_PER_H = 36;            // 成功ボーナスxp/時（通常放置18/hの2倍を上乗せ）
  var WALK_COIN_PER_H = 60;          // 成功ボーナスコイン/時
  var WALK_LUCK = 0.03;              // 成功ごとのレア運上昇
  var WALK_MOOD = 20;                // 成功時の機嫌アップ
  var WALK_FAIL_MOOD = -12;          // 失敗時の機嫌ダウン

  // きせかえ（おさんぽ報酬でランダム入手するペットのアクセサリ。無料コレクション要素）
  var WEAR_IDS = ['ribbon', 'straw', 'cap', 'crown', 'flower', 'glasses', 'scarf', 'bowtie', 'tiara', 'star', 'bandana', 'mush'];
  var WEAR_DROP_RATE = 0.5; // おさんぽ成功ごとの入手確率
  // なかよしポイント達成で解放するレア装備（おさんぽドロップ WEAR_IDS には含めない＝達成限定）
  var MILESTONES = [
    { pts: 1000,  wear: 'halo' },
    { pts: 5000,  wear: 'medal' },
    { pts: 20000, wear: 'party' },
    { pts: 60000, wear: 'rainbow' }
  ];

  // おすそわけ: きせかえを友だちにコードで贈る（一方向・通信なし）。
  // 対象=通常装備のみ。レア装備（MILESTONES）はコードが静的で使い回せてしまい
  // 「なかよしポイント達成のしるし」の価値が崩れるため贈れない。
  var GIFT_ITEMS = WEAR_IDS.slice();
  function giftChk(id) { var h = 0; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000; return h; }

  // 成長に必要な累積なかよし度（xp）。index=到達stage
  // 巣立ち(成体)まで体感60時間イメージ（放置xp≈12.6/h・hf0.7想定で 760≈60h）。赤ちゃんは早めに目覚める
  // 0:おくるみ(ねんね) 1:赤ちゃん 2:子 3:成体。
  // おくるみは「姿が見えるまでの短い導入」なので約1分で目覚める（放置xp≈13.5/h・快適度0.75想定で 0.225≈1分）。
  // 赤ちゃん以降は通常ペース（巣立ちまで体感60時間）。
  var GROW = [0, 0.225, 200, 760];

  // 1時間あたりの自然減衰量（hungerは12hで空＝1日3〜4食ペース）。指標は3つ（おなか/さんぽ/きれい）に簡素化
  var DECAY = { hunger: 8.34, clean: 6.25 };

  // 世話アクション効果（ごはんは在庫制の feed()／さんぽは task。残る世話は おそうじ のみ）
  // ※おそうじは「きれい」回復のみ。成長(なかよし)は与えない（クリック連打で無限成長するのを防ぐ）。
  var CARE = {
    wash:  { clean: 42, xp: 0, coin: 3, label: 'おそうじ' }
  };

  var REROLL_COST = 30;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function dayIndex(now) { return Math.floor(now / 86400000); } // さんぽ継続日数の日付バケツ（UTC日。tz微調整はv2）

  function stageOf(xp) {
    var st = 0;
    for (var i = 1; i < GROW.length; i++) if (xp >= GROW[i]) st = i;
    return st;
  }

  function avgStatus(p) {
    // 快適度は おなか と きれい の平均（機嫌・元気は廃止）
    return (p.hunger + p.clean) / 2;
  }

  function freshPet(breedId, rnd) {
    return {
      breedId: breedId,
      xp: 0,
      hunger: 72, clean: 78,
      health: 100, sanpo: 100,
      runawayH: 0, away: false,
      careCount: 0,
      mark: rollMark(rnd),
      eyeStyle: rollEye(rnd)
    };
  }

  function newState(now) {
    return {
      version: VERSION,
      coin: 0,
      points: 0,            // なかよしポイント（口座・無限に貯まる。達成でレア装備解放）
      luck: 0,
      premium: false,       // ¥500買い切りで true。全公式品種が抽選・図鑑に解放される
      current: null,        // 種選択後に設定
      dex: {},              // 図鑑（原種も交配種も同じ）。id -> { count, firstAt, unseen }
      lastSavedAt: now,
      graduates: 0,
      deaths: 0,            // おほしさまになった子の数
      runaways: 0,          // 家出していった子の数
      foodStock: STARTER_STOCK, // えさストック（小数あり。表示は切り捨て）
      task: null,           // { startedAt, endsAt, minutes, kind } さんぽ（課題）中のみ
      walk: null,           // { startedAt, endsAt, minutes } おさんぽ中のみ
      walkStats: { success: 0, fail: 0, streak: 0, best: 0, totalMin: 0 }, // おすわりの記録
      taskStats: { success: 0, days: 0, bestDays: 0, lastDay: null, totalMin: 0, byKind: {} }, // さんぽ課題ダッシュボード
      allowApps: [],        // おすわり中に使ってよいアプリ（{name,url?}）。v1はオナー/ショートカット、v2でOS遮断対象
      reminders: { enabled: false, times: [] }, // 時間指定「さんぽしないの？」（"HH:MM" 配列）
      wardrobe: { owned: {}, items: [] }, // きせかえ（おさんぽ報酬で集める・自由配置）
      room: defaultRoom()   // 部屋の模様替え（スロット→アイテムid。¥500で全アイテム解放）
    };
  }
  // 部屋（自由配置）: 背景bg ＋ 飾りリスト items[{id,x,y}]（x,y は 0..1 の相対座標）
  function defaultRoom() {
    return { bg: 'cream', items: [] };
  }
  // きせかえ（自由配置）: 所持owned ＋ 着けているアクセサリ items[{id,x,y}]
  function cloneWardrobe(s) {
    var w = (s && s.wardrobe) || {};
    return { owned: Object.assign({}, w.owned || {}), items: w.items ? w.items.slice() : [] };
  }

  // ----- 永続化 -----
  function load() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s) return null;
      return s.version === VERSION ? s : migrate(s);
    } catch (e) { return null; }
  }
  function migrate(s) {
    if (s.version === 1) {
      s = {
        ...s,
        version: 2,
        walk: null,
        walkStats: { success: 0, fail: 0, streak: 0, best: 0, totalMin: 0 }
      };
    }
    if (s.version === 2) {
      s = {
        ...s,
        version: 3,
        deaths: 0,
        current: s.current ? { ...s.current, health: 100, detox: 100 } : null
      };
    }
    if (s.version === 3) {
      s = {
        ...s,
        version: 4,
        runaways: 0,
        items: { kibble: 5, souvenir: 1 },
        current: s.current ? { ...s.current, runawayH: 0, away: false } : null
      };
    }
    if (s.version === 4) {
      var stock = s.items ? (s.items.kibble || 0) + (s.items.souvenir || 0) : STARTER_STOCK;
      var cur = s.current ? { ...s.current, sanpo: s.current.detox == null ? 100 : s.current.detox } : null;
      if (cur) delete cur.detox;
      var s5 = { ...s, version: 5, foodStock: stock, task: null, current: cur };
      delete s5.items;
      s = s5;
    }
    if (s.version === 5) {
      s = { ...s, version: 6, premium: false }; // 課金フラグ導入（既存ユーザーは無料ティア）
    }
    if (s.version === 6) {
      s = { ...s, version: 7, album: [] }; // おみあい（ミックスのアルバム）導入
    }
    if (s.version === 7) {
      // 指標を3つ（おなか/さんぽ/きれい）に簡素化＝機嫌・元気を撤去
      var c7 = s.current ? { ...s.current } : null;
      if (c7) { delete c7.mood; delete c7.energy; }
      s = { ...s, version: 8, current: c7 };
    }
    if (s.version === 8) {
      s = { ...s, version: 9, room: defaultRoom() }; // 部屋の模様替え導入
    }
    if (s.version === 9) {
      // おすわり×さんぽ課題ダッシュボード（GAME_DESIGN v6）
      s = {
        ...s, version: 10,
        taskStats: s.taskStats || { success: 0, days: 0, bestDays: 0, lastDay: null, totalMin: 0, byKind: {} },
        allowApps: s.allowApps || [],
        reminders: s.reminders || { enabled: false, times: [] }
      };
    }
    if (s.version === 10) {
      // きせかえ（おさんぽ報酬で集めるペットのアクセサリ）
      s = { ...s, version: 11, wardrobe: s.wardrobe || { owned: {}, equipped: null } };
    }
    if (s.version === 11) {
      // 体の記号模様（個体の特徴）。既存の子は none から
      s = { ...s, version: 12, current: s.current ? { ...s.current, mark: s.current.mark || 'none' } : null };
    }
    if (s.version === 12) {
      // 目スタイル（個体の特徴）。既存の子は batchiri から
      s = { ...s, version: 13, current: s.current ? { ...s.current, eyeStyle: s.current.eyeStyle || 'batchiri' } : null };
    }
    if (s.version === 13) {
      // なかよしポイント（口座・無限）導入
      s = { ...s, version: 14, points: s.points || 0 };
    }
    if (s.version === 14) {
      // 交配種の図鑑（おみあいでのみ生まれる名前付き掛け合わせ）導入
      s = { ...s, version: 15, crossDex: s.crossDex || {} };
    }
    if (s.version === 15) {
      // 部屋を「スロット固定」→「自由配置」へ。旧スロットの飾りを既定位置に置き換える
      var oldRoom = s.room || {};
      var items;
      if (Array.isArray(oldRoom.items)) {
        items = oldRoom.items; // すでに自由配置形式ならそのまま保持
      } else {
        var DEFPOS = { wall: { x: 0.5, y: 0.24 }, left: { x: 0.2, y: 0.6 }, right: { x: 0.8, y: 0.6 }, floor: { x: 0.5, y: 0.82 } };
        items = [];
        ['wall', 'left', 'right', 'floor'].forEach(function (sl) {
          if (oldRoom[sl]) items.push({ id: oldRoom[sl], x: DEFPOS[sl].x, y: DEFPOS[sl].y });
        });
      }
      s = { ...s, version: 16, room: { bg: oldRoom.bg || 'cream', items: items } };
    }
    if (s.version === 16) {
      // きせかえを「1個装備」→「自由配置」へ。装備中のものは頭あたりの既定位置へ
      var w = s.wardrobe || { owned: {} };
      var witems = Array.isArray(w.items) ? w.items : (w.equipped ? [{ id: w.equipped, x: 0.5, y: 0.12 }] : []);
      s = { ...s, version: 17, wardrobe: { owned: w.owned || {}, items: witems } };
    }
    if (s.version === 17) {
      // 交配種を専用図鑑(crossDex)から 通常の図鑑(dex)へ統合（原種と分けない）
      var mdex = Object.assign({}, s.dex || {});
      var cd = s.crossDex || {};
      Object.keys(cd).forEach(function (id) { if (!mdex[id]) mdex[id] = cd[id]; });
      s = { ...s, version: 18, dex: mdex };
      delete s.crossDex;
    }
    if (s.version === 18) {
      // 品種を60種（犬30・猫30）へ圧縮＋おみあい撤去の後始末。
      // 消えた品種: 図鑑からは除去、育成中の子は旧idから決めた無料種として引き継ぐ（進捗は保持）
      var d19 = {};
      Object.keys(s.dex || {}).forEach(function (id) { if (Breeds.get(id)) d19[id] = s.dex[id]; });
      var c19 = s.current;
      if (c19 && !c19.mix && !Breeds.get(c19.breedId)) {
        var pool19 = Breeds.ALL.filter(Breeds.isFree);
        var h19 = 0;
        String(c19.breedId).split('').forEach(function (ch) { h19 = (h19 * 31 + ch.charCodeAt(0)) % pool19.length; });
        c19 = { ...c19, breedId: pool19[h19].id };
      }
      var s19 = { ...s, version: 19, dex: d19, current: c19 };
      delete s19.album;
      s = s19;
    }
    return s.version === VERSION ? s : null; // 未知のバージョンは初期化扱い
  }

  function persist(state) {
    try {
      if (global.localStorage) global.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) { /* 容量超過などは無視 */ }
  }

  // ----- 時間進行（純粋計算）-----
  // state を simMs 分シミュレーションし、報酬は rewardMs 分だけ与えた新しい state を返す。
  // 生存（いのち）は区分線形なので 0.25h 刻みで決定論的に積分する。
  // opts.survive=true（前面=スマホ稼働中）のときだけ 生存の減衰・死/家出が進む。
  // 離れている間（applyOffline）は減らさない＝「スマホを使わない限り いなくならない」(GAME_DESIGN.md §4)。
  function advance(state, simMs, rewardMs, opts) {
    if (rewardMs === undefined) rewardMs = simMs;
    if (simMs <= 0 || !state.current) return { state: state, coinGain: 0, xpGain: 0, died: false };
    var survive = !!(opts && opts.survive); // デスタイマーは前面(tick)でのみ稼働
    var p = state.current;
    var stage0 = stageOf(p.xp) === 0; // おくるみは保護（生存消耗なし）
    var hf = clamp(avgStatus(p) / 100, 0.15, 1); // 快適度（瀕死でも0.15は育つ）

    var rHours = rewardMs / H;
    var mixBoost = p.mix ? 1.2 : 1; // 雑種強勢: ミックスは成長+20%（BREEDING_SPEC §3）
    // TEST段階: stage≥1 は高速成長（約30分で成体）。おくるみ(stage0)の目覚めは通常レート据え置き。
    var xpRate = (!stage0 && IS_TEST) ? TEST_XP_PER_H : 18;
    var xpGain = xpRate * rHours * hf * mixBoost;
    var coinGain = (50 * rHours) * (0.4 + 0.6 * hf);

    var hunger = p.hunger, clean = p.clean;
    var sanpo = p.sanpo == null ? 100 : p.sanpo;
    var health = p.health == null ? 100 : p.health;
    var runawayH = p.runawayH || 0;
    var away = !!p.away;
    var stock = state.foodStock == null ? STARTER_STOCK : state.foodStock;
    var earnLeft = rewardMs / H;   // えさ獲得はスマホを置いていた時間（報酬と同じ24h上限）
    var autoFed = 0;
    var remaining = simMs / H;
    while (remaining > 0 && health > 0 && !away) {
      var dt = remaining < 0.25 ? remaining : 0.25;
      remaining -= dt;
      // えさ獲得＝「スマホを置いた（アプリを閉じた）時間」。前面(survive)では貯まらない
      if (!survive && earnLeft > 0) {
        var edt = earnLeft < dt ? earnLeft : dt;
        stock = Math.min(FOOD_STOCK_MAX, stock + FOOD_PER_HOUR * edt);
        earnLeft -= edt;
      }
      var dmul = IS_TEST ? TEST_DECAY_MUL : 1; // はや回し時のみ 生存の時計を速める
      // 生存の減衰は「スマホ稼働中（前面）」だけ。離れている間は おなか・きれい・さんぽは減らない
      if (survive) {
        hunger = clamp(hunger - DECAY.hunger * dt * dmul, 0, 100);
        clean  = clamp(clean  - DECAY.clean  * dt * dmul, 0, 100);
        sanpo  = clamp(sanpo  - SANPO_DECAY  * dt * dmul, 0, 100);
      }
      // 自動給餌は常に働く（離れている間も、置いた時間でたまった在庫で空腹を満たす＝救われる）
      if (!stage0 && hunger < AUTO_FEED_AT && stock >= 1) {
        stock -= 1;
        hunger = clamp(hunger + FOOD_HUNGER, 0, 100);
        autoFed++;
      }
      if (!stage0) {
        // いのち＝ごはん。飢えで減るのは前面のときだけ。満たされていれば いつでも回復する（休息）
        if (survive && hunger <= 0) health = clamp(health - STARVE_DRAIN * dt * dmul, 0, 100);
        else if (hunger > 30) health = clamp(health + HEALTH_REGEN * dt * dmul, 0, 100);
        // 家出＝さんぽ（いい時間）。前面でゲージ0がつづくと旅に出る。離れている間は進まない
        if (survive) {
          if (sanpo <= 0) {
            runawayH += dt * dmul;
            if (runawayH >= RUNAWAY_H) away = true;
          } else {
            runawayH = 0;
          }
        }
      }
    }
    var died = !stage0 && health <= 0;
    var ranAway = !stage0 && away && !died;

    var np = {
      ...p,
      xp: p.xp + xpGain,
      hunger: hunger, clean: clean,
      sanpo: sanpo, health: health,
      runawayH: runawayH, away: away
    };
    // なかよしポイント（口座・無限に貯まる。成体後も加算され、達成でレア装備が解放される）
    var ns = { ...state, current: np, coin: state.coin + coinGain, foodStock: stock, points: (state.points || 0) + xpGain };
    return { state: ns, coinGain: coinGain, xpGain: xpGain, died: died, ranAway: ranAway, autoFed: autoFed };
  }

  // 体の記号模様（個体ごとの特徴。レア度つき。none＝模様なし）
  var MARK_IDS = ['none', 'circle', 'triangle', 'heart', 'star', 'dbl', 'diamond'];
  var MARK_RARITY = { none: '', circle: 'コモン', triangle: 'コモン', heart: 'アンコモン', star: 'レア', dbl: 'レア', diamond: 'スーパーレア' };
  var MARK_WEIGHT = { none: 55, circle: 14, triangle: 14, heart: 9, star: 4, dbl: 3, diamond: 1 }; // 合計100
  function rollMark(rnd) {
    var r = (rnd || Math.random)() * 100, acc = 0, k;
    for (k in MARK_WEIGHT) { if (!Object.prototype.hasOwnProperty.call(MARK_WEIGHT, k)) continue; acc += MARK_WEIGHT[k]; if (r < acc) return k; }
    return 'none';
  }

  // 目のスタイル（個体ごと・色や模様とは独立に遺伝）。目なしベース＋このレイヤーを合成して描画。
  var EYE_STYLES = ['batchiri', 'genki', 'downer', 'majime', 'ojou']; // バッチリ/元気/ダウナー/真面目/お嬢様
  function rollEye(rnd) { return EYE_STYLES[Math.floor((rnd || Math.random)() * EYE_STYLES.length) % EYE_STYLES.length]; }

  // 旧セーブ互換: 過去に おみあいで生まれたミックス個体(current.mix)を描画するための合成品種オブジェクト
  function mixBreed(mix) {
    return {
      id: 'mix', mix: true, species: mix.species,
      name: mix.name || 'ミックス', rarity: 'mix', nature: mix.nature,
      desc: mix.parents ? (mix.parents[0] + ' と ' + mix.parents[1] + ' の子') : 'ミックスの子',
      art: mix.art
    };
  }


  var Engine = {
    SAVE_KEY: SAVE_KEY,
    CARE: CARE,
    REROLL_COST: REROLL_COST,
    GROW: GROW,
    stageOf: stageOf,
    avgStatus: avgStatus,

    /** セーブをロード。なければ null（=種選択へ） */
    init: function () {
      var s = load();
      this._state = s;
      return s;
    },

    /** 初回：種(species)を選んで最初の子（おくるみ）を抽選 */
    newGame: function (species, now, rnd) {
      rnd = rnd || Math.random;
      var s = newState(now);
      // 初回は無料ティア内から（選んだ種で抽選）
      var pool = Breeds.ofSpecies(species).filter(Breeds.isFree);
      var pick = pool[Math.floor(rnd() * pool.length)];
      // レアリティ重みで引き直す（初回は selected species 内で）
      var chosen = rollFrom(pool, rnd, 0) || pick;
      s.current = freshPet(chosen.id, rnd);
      this._state = s;
      persist(s);
      return s;
    },

    getState: function () { return this._state; },

    // ===== 課金（プレミアム解放）=====
    isPremium: function () { return !!(this._state && this._state.premium); },
    /** ¥500買い切りで全公式品種を解放。実購入の成功後に呼ぶ（端末側で課金処理）。 */
    unlockPremium: function (now) {
      var s = this._state;
      if (!s) return null;
      if (s.premium) return { already: true };
      var ns = { ...s, premium: true, lastSavedAt: now || s.lastSavedAt };
      this._state = ns;
      persist(ns);
      return { unlocked: true };
    },

    // ===== 部屋の模様替え（はめ込み式。slot→itemId） =====
    getRoom: function () {
      var r = (this._state && this._state.room) || defaultRoom();
      return { bg: r.bg || 'cream', items: r.items ? r.items.slice() : [] };
    },
    MAX_ROOM_ITEMS: 24,
    _saveRoom: function (room, now) {
      var s = this._state; if (!s) return null;
      var ns = { ...s, room: room, lastSavedAt: now || s.lastSavedAt };
      this._state = ns; persist(ns); return room;
    },
    /** 背景を変える */
    setRoomBg: function (bgId, now) {
      var r = this.getRoom(); r.bg = bgId; return this._saveRoom(r, now);
    },
    /** 飾りを自由な位置に置く（x,y は 0..1 の相対座標）。上限まで。追加した index を返す */
    addRoomItem: function (id, x, y, now) {
      var r = this.getRoom();
      if (r.items.length >= this.MAX_ROOM_ITEMS) return { error: 'full' };
      r.items.push({ id: id, x: clamp(x, 0, 1), y: clamp(y, 0, 1) });
      this._saveRoom(r, now);
      return { index: r.items.length - 1, room: r };
    },
    /** 置いた飾りを動かす（index 指定・x,y は 0..1） */
    moveRoomItem: function (i, x, y, now) {
      var r = this.getRoom();
      if (!r.items[i]) return null;
      r.items[i] = { ...r.items[i], x: clamp(x, 0, 1), y: clamp(y, 0, 1) };
      return this._saveRoom(r, now);
    },
    /** 置いた飾りを外す（index 指定） */
    removeRoomItem: function (i, now) {
      var r = this.getRoom();
      if (i < 0 || i >= r.items.length) return null;
      r.items.splice(i, 1);
      return this._saveRoom(r, now);
    },

    // 現在のペット（pure品種なら Breeds、ミックスなら合成した品種オブジェクト）
    breed: function () {
      var s = this._state;
      if (!s || !s.current) return null;
      return s.current.mix ? mixBreed(s.current.mix) : Breeds.get(s.current.breedId);
    },
    stage: function () { return this._state && this._state.current ? stageOf(this._state.current.xp) : 0; },

    /** 起動時オフライン進行。報告用の差分を返す */
    applyOffline: function (now) {
      var s = this._state;
      if (!s || !s.current) return null;
      var raw = now - s.lastSavedAt;
      if (raw < 0) raw = 0;                 // 端末時計の巻き戻り対策（簡易）
      var msReward = clamp(raw, 0, MAX_OFFLINE);
      var msSim = clamp(raw, 0, MAX_SIM);
      var beforeStage = stageOf(s.current.xp);
      var beforeStatus = { ...s.current };
      // 離れていた間: 生存は減らさない（むしろ在庫で回復）。育ち・コイン・えさだけ進む
      var r = advance(s, msSim, msReward, { survive: false });
      var ns = { ...r.state, lastSavedAt: now };
      this._state = ns;
      persist(ns);
      return {
        elapsedMs: raw,
        cappedMs: msReward,
        coinGain: Math.floor(r.coinGain),
        beforeStage: beforeStage,
        afterStage: stageOf(ns.current.xp),
        before: beforeStatus,
        died: r.died,
        ranAway: r.ranAway,
        autoFed: r.autoFed || 0
      };
    },

    /** 毎フレーム（=毎秒程度）の進行。lastSavedAt から now までを適用 */
    tick: function (now) {
      var s = this._state;
      if (!s || !s.current) return;
      var ms = now - s.lastSavedAt;
      if (ms < 0) ms = 0;
      // 前面（スマホ稼働中）の進行: デスタイマー（生存の減衰・死/家出）はここでのみ進む
      var r = advance(s, clamp(ms, 0, MAX_SIM), clamp(ms, 0, MAX_OFFLINE), { survive: true });
      this._state = { ...r.state, lastSavedAt: now };
      // 毎秒呼ばれるので書き込みは5秒に1回に間引く（死/家出の節目は即保存。落ちても失うのは数秒ぶんの報酬のみ）
      if (r.died || r.ranAway || !this._nextPersistAt || now >= this._nextPersistAt) {
        persist(this._state);
        this._nextPersistAt = now + 5000;
      }
    },

    FOOD_HUNGER: FOOD_HUNGER,
    FOOD_COST: FOOD_COST,
    /** おすわり minutes 分 成功時の餌数（UIの表示もこれを使う＝二重定義しない） */
    walkFoodGain: walkFoodGain,
    TASK_KINDS: TASK_KINDS,
    TASK_OPTIONS: TASK_OPTIONS,
    TASK_MIN: TASK_MIN,
    TASK_MAX: TASK_MAX,

    /** えさストック（表示用に切り捨てた数と「あと何日ぶん」） */
    foodInfo: function () {
      var s = this._state;
      var stock = s ? (s.foodStock == null ? 0 : s.foodStock) : 0;
      // 1日の消費 ≈ 自動給餌3回ぶん
      return { stock: Math.floor(stock), days: stock / 3 };
    },

    /** てであげる（自動給餌と違い、なかよし＋機嫌のボーナス） */
    feed: function (now) {
      var s = this._state;
      if (!s || !s.current) return null;
      var stock = s.foodStock == null ? 0 : s.foodStock;
      if (stock < 1) return { error: 'no_food' };
      var p = s.current;
      var np = {
        ...p,
        xp: p.xp + HAND_FEED_BONUS.xp,
        hunger: clamp(p.hunger + FOOD_HUNGER, 0, 100),
        careCount: p.careCount + 1
      };
      // なかよしポイント（口座）も同額たまる（「お世話でたまる」の一貫性）
      var ns = { ...s, current: np, foodStock: stock - 1, points: (s.points || 0) + HAND_FEED_BONUS.xp, lastSavedAt: now };
      this._state = ns;
      persist(ns);
      return { stageBefore: stageOf(p.xp), stageAfter: stageOf(np.xp), left: Math.floor(ns.foodStock) };
    },

    /** えさを買う（コイン消費。コイン=放置時間の蓄積） */
    buyFood: function (now) {
      var s = this._state;
      if (!s) return null;
      if (s.coin < FOOD_COST) return { error: 'no_coin' };
      var stock = Math.min(FOOD_STOCK_MAX, (s.foodStock == null ? 0 : s.foodStock) + 1);
      var ns = { ...s, coin: s.coin - FOOD_COST, foodStock: stock, lastSavedAt: now };
      this._state = ns;
      persist(ns);
      return { stock: Math.floor(stock), coin: ns.coin };
    },

    // ===== さんぽ（学習・運動などの「いい時間」。失敗なしの課題セッション） =====
    task: function () { return this._state ? this._state.task : null; },
    taskStats: function () { return this._state ? this._state.taskStats : null; },
    /** さんぽダッシュボードのスコア（継続日数を重く＋累計時間ぶん） */
    taskScore: function () {
      var st = this._state && this._state.taskStats;
      if (!st) return 0;
      return (st.days || 0) * 100 + Math.floor(st.totalMin || 0);
    },
    /** おすわり中に使ってよいアプリ（{name,url?} の配列） */
    allowApps: function () { return this._state ? (this._state.allowApps || []) : []; },
    setAllowApps: function (list, now) {
      var s = this._state; if (!s) return null;
      var arr = (Array.isArray(list) ? list : []).slice(0, 20).map(function (a) {
        if (typeof a === 'string') return { name: a.slice(0, 24) };
        return { name: String(a.name || '').slice(0, 24), url: a.url ? String(a.url).slice(0, 200) : undefined };
      }).filter(function (a) { return a.name; });
      var ns = { ...s, allowApps: arr, lastSavedAt: now || s.lastSavedAt };
      this._state = ns; persist(ns); return arr;
    },
    /** 時間指定リマインド設定（{enabled, times:["HH:MM"]}） */
    reminders: function () { return this._state ? (this._state.reminders || { enabled: false, times: [] }) : { enabled: false, times: [] }; },
    setReminders: function (cfg, now) {
      var s = this._state; if (!s) return null;
      cfg = cfg || {};
      var times = (Array.isArray(cfg.times) ? cfg.times : []).filter(function (t) { return /^([01]?\d|2[0-3]):[0-5]\d$/.test(t); }).slice(0, 6);
      var rem = { enabled: !!cfg.enabled, times: times };
      var ns = { ...s, reminders: rem, lastSavedAt: now || s.lastSavedAt };
      this._state = ns; persist(ns); return rem;
    },

    /** さんぽ開始（kind: TASK_KINDS, minutes: TASK_OPTIONS）。他アプリの使用OK・失敗なし */
    startTask: function (kind, minutes, now, place) {
      var s = this._state;
      if (!s || !s.current || s.task || s.walk) return null;
      minutes = Math.round(minutes);
      // プリセット(15/30/60)＋カスタム（5〜180分）を許容
      if (!(minutes >= TASK_MIN && minutes <= TASK_MAX)) return null;
      kind = (kind && String(kind).slice(0, 12)) || 'おさんぽ';
      place = place ? String(place).slice(0, 12) : null; // さんぽの場所（景色）。任意
      var ns = { ...s, task: { startedAt: now, endsAt: now + minutes * 60000, minutes: minutes, kind: kind, place: place }, lastSavedAt: now };
      this._state = ns;
      persist(ns);
      return ns.task;
    },

    /** さんぽの判定。満了していれば完了（ゲージ回復）。途中なら残り時間 */
    checkTask: function (now, rnd) {
      var s = this._state;
      if (!s || !s.task) return null;
      var t = s.task;
      if (now < t.endsAt) return { result: 'ongoing', remainMs: t.endsAt - now, kind: t.kind, minutes: t.minutes };
      rnd = rnd || Math.random;
      var p = s.current;
      var gain = taskSanpoGain(t.minutes);
      var foods = taskFoodGain(t.minutes);
      var np = { ...p, sanpo: clamp((p.sanpo == null ? 100 : p.sanpo) + gain, 0, 100), runawayH: 0 };
      var bumped = bumpTaskStats(s.taskStats, t.kind, t.minutes, now);
      // きせかえドロップ: 確率で未所持のアクセサリを1つ入手（所持に追加・配置はUIで）
      var ward = cloneWardrobe(s);
      var wear = null;
      if (rnd() < WEAR_DROP_RATE) {
        var pool = WEAR_IDS.filter(function (id) { return !ward.owned[id]; });
        if (pool.length) { wear = pool[Math.floor(rnd() * pool.length)]; ward.owned[wear] = 1; } // 所持に追加。装備はUIで確認して決める
      }
      var ns = {
        ...s, current: np, task: null,
        foodStock: Math.min(FOOD_STOCK_MAX, (s.foodStock == null ? 0 : s.foodStock) + foods),
        taskStats: bumped.stats, wardrobe: ward, lastSavedAt: now
      };
      this._state = ns;
      persist(ns);
      return { result: 'done', kind: t.kind, minutes: t.minutes, gain: gain, foods: foods, days: bumped.stats.days, newDay: bumped.newDay, isBestDay: bumped.isBestDay, wear: wear };
    },

    // ===== 体の記号模様（個体の特徴・レア度つき） =====
    MARK_IDS: MARK_IDS,
    MARK_RARITY: MARK_RARITY,
    markOf: function () { return (this._state && this._state.current && this._state.current.mark) || 'none'; },
    EYE_STYLES: EYE_STYLES,
    eyeStyleOf: function () { return (this._state && this._state.current && this._state.current.eyeStyle) || 'batchiri'; },

    // ===== なかよしポイント（口座・無限）＆達成報酬 =====
    points: function () { return this._state ? (this._state.points || 0) : 0; },
    MILESTONES: MILESTONES,
    /** ポイント到達で未獲得のレア装備を解放。新規解放した wear id の配列を返す */
    claimMilestones: function (now) {
      var s = this._state; if (!s) return [];
      var pts = s.points || 0;
      var ward = cloneWardrobe(s);
      var got = [];
      for (var i = 0; i < MILESTONES.length; i++) { var m = MILESTONES[i]; if (pts >= m.pts && !ward.owned[m.wear]) { ward.owned[m.wear] = 1; got.push(m.wear); } }
      if (got.length) { var ns = { ...s, wardrobe: ward, lastSavedAt: now || s.lastSavedAt }; this._state = ns; persist(ns); }
      return got;
    },
    /** 成長/生存の「はや回し」トグル（手動テスト用。localStorageに永続。出荷既定OFF） */
    setTest: function (b) {
      IS_TEST = !!b;
      try { if (global.localStorage) { if (b) global.localStorage.setItem(DEV_FAST_KEY, '1'); else global.localStorage.removeItem(DEV_FAST_KEY); } } catch (e) {}
    },
    /** いまが「はや回し」かどうか（設定の開発者トグル表示用） */
    isTest: function () { return IS_TEST; },

    // ===== きせかえ（ペットのアクセサリ。おさんぽ報酬で集める。自由配置） =====
    WEAR_IDS: WEAR_IDS,
    MAX_WEAR_ITEMS: 8,
    wardrobe: function () {
      var w = (this._state && this._state.wardrobe) || { owned: {}, items: [] };
      return { owned: Object.assign({}, w.owned || {}), items: w.items ? w.items.slice() : [] };
    },
    _saveWard: function (ward, now) {
      var s = this._state; if (!s) return null;
      var ns = { ...s, wardrobe: ward, lastSavedAt: now || s.lastSavedAt };
      this._state = ns; persist(ns); return ward;
    },
    /** アクセサリをペットの自由な位置に着ける（x,y=0..1・petArt相対）。未所持は無視 */
    addWear: function (id, x, y, now) {
      var s = this._state; if (!s) return null;
      var ward = cloneWardrobe(s);
      if (!ward.owned[id]) return { error: 'not_owned' };
      if (ward.items.length >= this.MAX_WEAR_ITEMS) return { error: 'full' };
      ward.items.push({ id: id, x: clamp(x, 0, 1), y: clamp(y, 0, 1) });
      this._saveWard(ward, now);
      return { index: ward.items.length - 1, wardrobe: ward };
    },
    /** 着けたアクセサリを動かす（index指定・x,y=0..1） */
    moveWear: function (i, x, y, now) {
      var ward = cloneWardrobe(this._state || {});
      if (!ward.items[i]) return null;
      ward.items[i] = { ...ward.items[i], x: clamp(x, 0, 1), y: clamp(y, 0, 1) };
      return this._saveWard(ward, now);
    },
    /** 着けたアクセサリを外す（index指定） */
    removeWear: function (i, now) {
      var ward = cloneWardrobe(this._state || {});
      if (i < 0 || i >= ward.items.length) return null;
      ward.items.splice(i, 1);
      return this._saveWard(ward, now);
    },

    // ===== おすそわけ（かざりを 友だちにコードで贈る・通信なし・一方向） =====
    GIFT_ITEMS: GIFT_ITEMS,
    /** 所持しているかざりの おすそわけコードを発行（未所持/無効はnull）。渡しても自分のは減らない */
    giftCode: function (id) {
      if (GIFT_ITEMS.indexOf(id) < 0) return null;
      var owned = (this._state && this._state.wardrobe && this._state.wardrobe.owned) || {};
      if (!owned[id]) return null;
      return 'OKURI-' + id.toUpperCase() + '-' + giftChk(id);
    },
    /** もらったコードを開封してかざりを所持に追加。{item}/{already}/{error} */
    redeemGift: function (code, now) {
      if (!code || typeof code !== 'string') return { error: 'format' };
      var mm = code.toUpperCase().match(/OKURI-([A-Z0-9]+)-(\d+)/);
      if (!mm) return { error: 'format' };
      var id = mm[1].toLowerCase();
      if (GIFT_ITEMS.indexOf(id) < 0 || String(giftChk(id)) !== mm[2]) return { error: 'bad_code' };
      var s = this._state; if (!s) return { error: 'no_state' };
      var ward = cloneWardrobe(s);
      if (ward.owned[id]) return { already: true, item: id };
      ward.owned[id] = 1;
      this._saveWard(ward, now);
      return { item: id };
    },

    /** さんぽをやめる（失敗ではない。ゲージ回復なしなだけ） */
    cancelTask: function (now) {
      var s = this._state;
      if (!s || !s.task) return null;
      var t = s.task;
      var ns = { ...s, task: null, lastSavedAt: now };
      this._state = ns;
      persist(ns);
      return { result: 'cancel', kind: t.kind };
    },

    /** 世話アクション */
    care: function (action, now) {
      var s = this._state;
      if (!s || !s.current) return null;
      var def = CARE[action];
      if (!def) return null;
      var p = s.current;
      var np = {
        ...p,
        xp: p.xp + (def.xp || 0),
        hunger: clamp(p.hunger + (def.hunger || 0), 0, 100),
        clean:  clamp(p.clean  + (def.clean  || 0), 0, 100),
        careCount: p.careCount + 1
      };
      var ns = { ...s, current: np, coin: s.coin + (def.coin || 0), points: (s.points || 0) + (def.xp || 0), lastSavedAt: now };
      this._state = ns;
      persist(ns);
      return { stageBefore: stageOf(p.xp), stageAfter: stageOf(np.xp) };
    },

    /** キャラなでなで＝演出のみ（成長させない・発案者FB）。種を返してUIがしぐさを選ぶ */
    pet: function () {
      var b = this.breed();
      if (!b) return null;
      return { species: b.species, asleep: this.stage() === 0 };
    },

    canGraduate: function () { return this.stage() >= 3; },

    // ===== いのちと家出（生存システム） =====
    /** いのちが尽きているか＝ごはんの怠り（おくるみは死なない） */
    isDead: function () {
      var s = this._state;
      return !!(s && s.current && stageOf(s.current.xp) >= 1 && s.current.health <= 0);
    },

    /** 家出してしまったか＝おさんぽの怠り */
    isAway: function () {
      var s = this._state;
      return !!(s && s.current && stageOf(s.current.xp) >= 1 && s.current.away && s.current.health > 0);
    },

    /** もういない（どちらかの結末を迎えた） */
    isGone: function () { return this.isDead() || this.isAway(); },

    /** おわかれ/見送り → あたらしい子（おくるみ）をおむかえ。図鑑には登録されない */
    farewell: function (now, rnd, species) {
      rnd = rnd || Math.random;
      var s = this._state;
      if (!s || !s.current) return null;
      var cause = s.current.health <= 0 ? 'star' : (s.current.away ? 'away' : null);
      if (!cause) return null;
      var breed = Breeds.get(s.current.breedId);
      var next = Breeds.roll(rnd, s.luck, !!s.premium, species, { owned: s.dex, avoid: s.current.breedId });
      var ns = {
        ...s,
        deaths: (s.deaths || 0) + (cause === 'star' ? 1 : 0),
        runaways: (s.runaways || 0) + (cause === 'away' ? 1 : 0),
        current: freshPet(next.id, rnd),
        walk: null,
        lastSavedAt: now
      };
      this._state = ns;
      persist(ns);
      return { breed: breed, next: next, cause: cause };
    },

    /** 危険の予測（通知スケジュール用）。
        新設計では「離れている間（スマホを使わない間）は いのちが減らない」ため、
        留守中の危険予告は存在しない＝常に空（責めない／途切れる予告をしない・DESIGN.md 原則2）。
        デスタイマーはアプリ前面（スマホ稼働中）でのみ進む。 */
    dangerForecast: function () { return []; },

    // ===== おさんぽ（Forest型セッション） =====
    WALK_OPTIONS: WALK_OPTIONS,
    WALK_GRACE: WALK_GRACE,

    walk: function () { return this._state ? this._state.walk : null; },

    /** おさんぽ開始。アプリを閉じて minutes 分もどらなければ成功 */
    startWalk: function (minutes, now) {
      var s = this._state;
      if (!s || !s.current || s.walk) return null;
      if (WALK_OPTIONS.indexOf(minutes) < 0) return null;
      var ns = { ...s, walk: { startedAt: now, endsAt: now + minutes * 60000, minutes: minutes }, lastSavedAt: now };
      this._state = ns;
      persist(ns);
      return ns.walk;
    },

    /**
     * おさんぽ状態の判定。起動時・復帰時・毎秒ループから呼ぶ。
     * activeUse: 画面が見えている（=スマホを触っている）か
     * 返り値: null / {result:'success',...} / {result:'fail',...} / {result:'ongoing', remainMs, inGrace}
     */
    checkWalk: function (now, activeUse) {
      var s = this._state;
      if (!s || !s.walk) return null;
      var w = s.walk;
      if (now >= w.endsAt) return this._finishWalk(now, true, 'done');
      if (activeUse && now - w.startedAt > WALK_GRACE) return this._finishWalk(now, false, 'returned');
      return {
        result: 'ongoing',
        remainMs: w.endsAt - now,
        inGrace: now - w.startedAt <= WALK_GRACE,
        graceRemainMs: Math.max(0, WALK_GRACE - (now - w.startedAt)),
        minutes: w.minutes
      };
    },

    /** あきらめる（失敗扱い・streakリセット） */
    cancelWalk: function (now) {
      var s = this._state;
      if (!s || !s.walk) return null;
      return this._finishWalk(now, false, 'cancel');
    },

    _finishWalk: function (now, success, reason) {
      var s = this._state;
      var w = s.walk;
      var st = s.walkStats || { success: 0, fail: 0, streak: 0, best: 0, totalMin: 0 };
      var p = s.current;
      var hours = w.minutes / 60;
      var res;

      if (success) {
        var streak = st.streak + 1;
        var mult = 1 + 0.08 * Math.min(streak - 1, 5); // 連続成功で最大+40%
        var xpGain = WALK_XP_PER_H * hours * mult;
        var coinGain = Math.floor(WALK_COIN_PER_H * hours * mult);
        var stageBefore = stageOf(p.xp);
        var np = { ...p, xp: p.xp + xpGain };
        var foods = walkFoodGain(w.minutes);
        var ns = {
          ...s,
          current: np,
          coin: s.coin + coinGain,
          points: (s.points || 0) + xpGain, // おすわり成功ぶんも なかよしポイントへ
          luck: clamp(s.luck + WALK_LUCK, 0, 2),
          foodStock: Math.min(FOOD_STOCK_MAX, (s.foodStock == null ? 0 : s.foodStock) + foods),
          walk: null,
          walkStats: {
            success: st.success + 1, fail: st.fail,
            streak: streak, best: Math.max(st.best, streak),
            totalMin: st.totalMin + w.minutes
          },
          lastSavedAt: now
        };
        this._state = ns;
        persist(ns);
        res = {
          result: 'success', minutes: w.minutes, coinGain: coinGain,
          foods: foods,
          xpGain: Math.floor(xpGain), streak: streak,
          isBest: streak > st.best,
          stageBefore: stageBefore, stageAfter: stageOf(np.xp)
        };
      } else {
        var ns2 = {
          ...s,
          current: { ...p },
          walk: null,
          walkStats: { ...st, fail: st.fail + 1, streak: 0 },
          lastSavedAt: now
        };
        this._state = ns2;
        persist(ns2);
        res = { result: 'fail', minutes: w.minutes, reason: reason };
      }
      return res;
    },

    /** 成体を巣立たせ図鑑に登録 → 次の子（おくるみ）を抽選 */
    graduate: function (now, rnd, species) {
      rnd = rnd || Math.random;
      var s = this._state;
      if (!s || !s.current || stageOf(s.current.xp) < 3) return null;
      var dex = { ...s.dex };
      var isNew = false, reward, breed;
      if (s.current.mix) {
        // 旧セーブ互換: 過去のミックス個体は図鑑に登録しない。巣立ちボーナスのみ
        breed = mixBreed(s.current.mix);
        reward = 60;
      } else {
        breed = Breeds.get(s.current.breedId);
        isNew = !dex[breed.id];
        reward = 20 + Breeds.RARITY[breed.rarity].stars * 40 + (isNew ? 100 : 0);
        var prev = dex[breed.id] || { count: 0, firstAt: now };
        dex[breed.id] = { count: prev.count + 1, firstAt: prev.firstAt || now, unseen: true };
      }

      var luck = clamp(s.luck + 0.04, 0, 2);
      // 次の子は「未収集が出やすく・直前と同じになりにくい」よう抽選（同じ品種ばかり対策）。次は必ず原種
      var next = Breeds.roll(rnd, luck, !!s.premium, species, { owned: dex, avoid: s.current.breedId });

      var ns = {
        ...s,
        dex: dex,
        coin: s.coin + reward,
        luck: luck,
        graduates: s.graduates + 1,
        current: freshPet(next.id, rnd),
        lastSavedAt: now
      };
      this._state = ns;
      persist(ns);
      return { breed: breed, isNew: isNew, reward: reward, next: next };
    },


    /** ねんね中(stage0)のうちは別の子と会い直せる（コイン消費） */
    reroll: function (now, rnd, species) {
      rnd = rnd || Math.random;
      var s = this._state;
      if (!s || !s.current) return null;
      if (stageOf(s.current.xp) !== 0) return { error: 'already_hatched' };
      if (s.coin < REROLL_COST) return { error: 'no_coin' };
      var next = Breeds.roll(rnd, s.luck, !!s.premium, species, { owned: s.dex, avoid: s.current.breedId });
      var ns = { ...s, coin: s.coin - REROLL_COST, current: freshPet(next.id, rnd), lastSavedAt: now };
      this._state = ns;
      persist(ns);
      return { next: next };
    },

    /** 図鑑の特定マスを「確認済み」にする（NEWドット消し） */
    markSeen: function (breedId) {
      var s = this._state;
      if (!s || !s.dex[breedId]) return;
      var dex = { ...s.dex };
      dex[breedId] = { ...dex[breedId], unseen: false };
      this._state = { ...s, dex: dex };
      persist(this._state);
    },

    dexProgress: function () {
      var s = this._state;
      var premium = !!(s && s.premium);
      var universe = Breeds.ALL;
      function isFreeEntry(b) { return Breeds.isFree(b); }
      var freeTotal = universe.filter(isFreeEntry).length;
      var premiumTotal = universe.length - freeTotal;
      function speciesTotal(sp) { return universe.filter(function (b) { return b.species === sp && (premium || isFreeEntry(b)); }).length; }
      var found = 0, dogFound = 0, catFound = 0, newCount = 0, premiumFound = 0, dogPremFound = 0, catPremFound = 0;
      if (s) {
        Object.keys(s.dex).forEach(function (id) {
          var b = Breeds.get(id);
          if (!b) return;
          found++;
          if (b.species === 'dog') dogFound++; else catFound++;
          if (!isFreeEntry(b)) { premiumFound++; if (b.species === 'dog') dogPremFound++; else catPremFound++; }
          if (s.dex[id].unseen) newCount++;
        });
      }
      // 無課金の目標は無料種＋（過去に手に入れた）プレミアム種。found が total を超えないようにする
      var total = premium ? universe.length : freeTotal + premiumFound;
      var dogTotal = speciesTotal('dog') + (premium ? 0 : dogPremFound);
      var catTotal = speciesTotal('cat') + (premium ? 0 : catPremFound);
      return {
        total: total, found: found, dogTotal: dogTotal, catTotal: catTotal,
        dogFound: dogFound, catFound: catFound, newCount: newCount,
        premium: premium, freeTotal: freeTotal, premiumTotal: premiumTotal, premiumFound: premiumFound
      };
    },

    reset: function (now) {
      try { if (global.localStorage) global.localStorage.removeItem(SAVE_KEY); } catch (e) {}
      this._state = null;
      return null;
    },

    _persist: function () { persist(this._state); }
  };

  function rollFrom(pool, rnd, luck) {
    var total = 0;
    var weighted = pool.map(function (b) {
      var st = Breeds.RARITY[b.rarity].stars;
      var w = Breeds.RARITY[b.rarity].weight * (1 + luck * (st - 1) * 0.5);
      total += w;
      return { b: b, w: w };
    });
    var t = rnd() * total;
    for (var i = 0; i < weighted.length; i++) { t -= weighted[i].w; if (t <= 0) return weighted[i].b; }
    return pool[0];
  }

  global.Engine = Engine;
})(typeof window !== 'undefined' ? window : this);
