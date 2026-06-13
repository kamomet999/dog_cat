/**
 * ゲームエンジン：時間減衰・オフライン進行・成長・図鑑登録・永続化
 * - 時刻は now(ms) を注入できる決定論的設計（Date.now() を直呼びしない）
 * - 状態はイミュータブルに更新（{...s} で新規生成）
 */
(function (global) {
  'use strict';

  var SAVE_KEY = 'inuneko_dex_save_v1';
  var VERSION = 11;
  var H = 3600000; // 1時間(ms)
  var MAX_OFFLINE = 24 * H; // 報酬（コイン・なかよし）の上限
  var MAX_SIM = 72 * H;     // 生存シミュレーションの上限（3日分は結果と向き合う）

  // ▼▼ テスト段階の成長加速（リリース前に IS_TEST=false に戻す）▼▼
  // 赤ちゃん以降(stage≥1)を高速化して、約30分で成体（＝おみあい可）に到達させる。
  // おくるみの目覚め(約1分・stage0)は据え置き。通常成長は 18/h。
  var IS_TEST = true;
  var TEST_XP_PER_H = 2400; // 成体xp760まで快適度しだいで約25〜35分
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

  // 成長に必要な累積なかよし度（xp）。index=到達stage
  // 巣立ち(成体)まで体感60時間イメージ（放置xp≈12.6/h・hf0.7想定で 760≈60h）。赤ちゃんは早めに目覚める
  // 0:おくるみ(ねんね) 1:赤ちゃん 2:子 3:成体。
  // おくるみは「姿が見えるまでの短い導入」なので約1分で目覚める（放置xp≈13.5/h・快適度0.75想定で 0.225≈1分）。
  // 赤ちゃん以降は通常ペース（巣立ちまで体感60時間）。
  var GROW = [0, 0.225, 200, 760];

  // 1時間あたりの自然減衰量（hungerは12hで空＝1日3〜4食ペース）。指標は3つ（おなか/さんぽ/きれい）に簡素化
  var DECAY = { hunger: 8.34, clean: 6.25 };

  // 世話アクション効果（ごはんは在庫制の feed()／さんぽは task。残る世話は おそうじ のみ）
  var CARE = {
    wash:  { clean: 42, xp: 8, coin: 3, label: 'おそうじ' }
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

  function freshPet(breedId) {
    return {
      breedId: breedId,
      xp: 0,
      hunger: 72, clean: 78,
      health: 100, sanpo: 100,
      runawayH: 0, away: false,
      careCount: 0
    };
  }

  function newState(now) {
    return {
      version: VERSION,
      coin: 0,
      luck: 0,
      premium: false,       // ¥500買い切りで true。全公式品種が抽選・図鑑に解放される
      current: null,        // 種選択後に設定
      dex: {},              // breedId -> { count, firstAt, unseen }
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
      wardrobe: { owned: {}, equipped: null }, // きせかえ（おさんぽ報酬で集める）
      album: [],            // おみあいで生まれたミックスの記録（30種図鑑とは別）
      room: defaultRoom()   // 部屋の模様替え（スロット→アイテムid。¥500で全アイテム解放）
    };
  }
  // 部屋の初期スロット（はめ込み式。背景＝bg、その他は飾り。null=なし）
  function defaultRoom() {
    return { bg: 'cream', wall: null, left: null, right: null, floor: null };
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
  function advance(state, simMs, rewardMs) {
    if (rewardMs === undefined) rewardMs = simMs;
    if (simMs <= 0 || !state.current) return { state: state, coinGain: 0, xpGain: 0, died: false };
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
      // えさ獲得（スマホを触らない時間がそのまま えさ になる）
      if (earnLeft > 0) {
        var edt = earnLeft < dt ? earnLeft : dt;
        stock = Math.min(FOOD_STOCK_MAX, stock + FOOD_PER_HOUR * edt);
        earnLeft -= edt;
      }
      hunger = clamp(hunger - DECAY.hunger * dt, 0, 100);
      clean  = clamp(clean  - DECAY.clean  * dt, 0, 100);
      sanpo  = clamp(sanpo  - SANPO_DECAY  * dt, 0, 100);
      // 自動給餌（ストックがあるかぎり、何日先まででも勝手にごはんを食べる）
      if (!stage0 && hunger < AUTO_FEED_AT && stock >= 1) {
        stock -= 1;
        hunger = clamp(hunger + FOOD_HUNGER, 0, 100);
        autoFed++;
      }
      if (!stage0) {
        // いのち＝ごはん。飢えで減り、満たされていれば回復する（リミット短め）
        if (hunger <= 0) health = clamp(health - STARVE_DRAIN * dt, 0, 100);
        else if (hunger > 30) health = clamp(health + HEALTH_REGEN * dt, 0, 100);
        // 家出＝さんぽ（いい時間）。ゲージ0がつづくと、あたらしい家族をさがしに出ていく（リミット長め）
        if (sanpo <= 0) {
          runawayH += dt;
          if (runawayH >= RUNAWAY_H) away = true;
        } else {
          runawayH = 0;
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
    var ns = { ...state, current: np, coin: state.coin + coinGain, foodStock: stock };
    return { state: ns, coinGain: coinGain, xpGain: xpGain, died: died, ranAway: ranAway, autoFed: autoFed };
  }

  // ====== おみあい（ブリード）: サーバーなし・コードのコピペで遺伝 ======
  // docs/BREEDING_SPEC.md が正。成体どうしの特徴をランダム継承した「ミックス」を産む。
  var MATE_VER = 1;
  var EARS = ['prick', 'flop', 'round', 'fold', 'bigprick'];
  var PATTERNS = ['solid', 'tan', 'patch', 'spot', 'tabby', 'calico', 'tuxedo', 'point'];
  var TAILS = ['normal', 'curl'];
  var EYE_RARE = ['#f2c84a', '#e6e8ee']; // 金・銀（まれに出る希少な瞳）
  var HYBRID_NATURE = 'じゆうじん'; // ミックス限定の新性格（5%）
  var B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford（I/L/O/U を除く）

  function natureList() { return Object.keys(Breeds.NATURES); } // 15種（idx 0-14）
  function idxOf(arr, v) { var i = arr.indexOf(v); return i < 0 ? 0 : i; }
  function hex2rgb(h) {
    h = (h || '#000000').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
  }
  function rgb2hex(r, g, b) {
    function p(x) { return ('0' + (x & 255).toString(16)).slice(-2); }
    return '#' + p(r) + p(g) + p(b);
  }
  function bytes2b32(bytes) {
    var bits = 0, val = 0, out = '';
    for (var i = 0; i < bytes.length; i++) {
      val = (val << 8) | (bytes[i] & 255); bits += 8;
      while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; }
    }
    if (bits > 0) out += B32[(val << (5 - bits)) & 31];
    return out;
  }
  function b32toBytes(str) {
    var bits = 0, val = 0, out = [];
    for (var i = 0; i < str.length; i++) {
      var c = B32.indexOf(str[i]); if (c < 0) continue;
      val = (val << 5) | c; bits += 5;
      if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; }
    }
    return out;
  }
  // ペット（成体）から遺伝子 genome を取り出す。pure品種なら breedIdx、ミックスなら null
  function genomeOf(state) {
    var p = state.current;
    if (p.mix) {
      return { species: p.mix.species, breedIdx: null, nature: p.mix.nature, art: p.mix.art, name: 'ミックス' };
    }
    var b = Breeds.get(p.breedId);
    return { species: b.species, breedIdx: Breeds.ALL.indexOf(b), nature: b.nature, art: b.art, name: b.name };
  }
  function genomeToBytes(g) {
    var nat = natureList();
    var natIdx = g.nature === HYBRID_NATURE ? 15 : nat.indexOf(g.nature);
    if (natIdx < 0) natIdx = 0;
    var ear = idxOf(EARS, g.art.ear);
    var tail = idxOf(TAILS, g.art.tail || 'normal');
    var pat = idxOf(PATTERNS, g.art.pattern);
    var b = [];
    b[0] = MATE_VER;
    b[1] = (g.species === 'cat' ? 1 : 0) | (g.art.fluffy ? 2 : 0) | (ear << 2) | (tail << 5);
    b[2] = (pat & 7) | ((natIdx & 15) << 3);
    b[3] = g.breedIdx == null ? 255 : (g.breedIdx & 255);
    var c1 = hex2rgb(g.art.color), c2 = hex2rgb(g.art.color2), ce = hex2rgb(g.art.eye);
    b[4] = c1[0]; b[5] = c1[1]; b[6] = c1[2];
    b[7] = c2[0]; b[8] = c2[1]; b[9] = c2[2];
    b[10] = ce[0]; b[11] = ce[1]; b[12] = ce[2];
    var sum = 0; for (var i = 0; i < 13; i++) sum = (sum + b[i]) & 255;
    b[13] = sum;
    return b;
  }
  function bytesToGenome(b) {
    if (!b || b.length < 14) return { error: 'format' };
    if (b[0] !== MATE_VER) return { error: 'version' };
    var sum = 0; for (var i = 0; i < 13; i++) sum = (sum + b[i]) & 255;
    if (sum !== b[13]) return { error: 'checksum' };
    var nat = natureList();
    var natIdx = (b[2] >> 3) & 15;
    return {
      species: (b[1] & 1) ? 'cat' : 'dog',
      breedIdx: b[3] === 255 ? null : b[3],
      nature: natIdx === 15 ? HYBRID_NATURE : (nat[natIdx] || nat[0]),
      art: {
        base: (b[1] & 1) ? 'cat' : 'dog',
        fluffy: !!(b[1] & 2),
        ear: EARS[(b[1] >> 2) & 7] || 'prick',
        tail: TAILS[(b[1] >> 5) & 3] || 'normal',
        pattern: PATTERNS[b[2] & 7] || 'solid',
        color: rgb2hex(b[4], b[5], b[6]),
        color2: rgb2hex(b[7], b[8], b[9]),
        eye: rgb2hex(b[10], b[11], b[12])
      }
    };
  }
  // 全品種の色プール（突然変異の引き先）
  function colorPool() {
    var out = [];
    Breeds.ALL.forEach(function (b) { out.push(b.art.color); out.push(b.art.color2); });
    return out;
  }
  // 1遺伝子の継承: prob で親A/B、mut で突然変異（mutate() の戻り値）
  function inherit(rnd, a, bb, mut, mutChance, flags) {
    if (rnd() < mutChance) { if (flags) flags.mutated = true; return mut(rnd); }
    return rnd() < 0.5 ? a : bb;
  }
  // ミックスの genome から、描画・表示に使える合成「品種」オブジェクトを作る
  function mixBreed(mix) {
    return {
      id: 'mix', mix: true, species: mix.species,
      name: mix.name || 'ミックス', rarity: 'mix', nature: mix.nature,
      desc: mix.parents ? (mix.parents[0] + ' と ' + mix.parents[1] + ' の子') : 'おみあいで うまれた子',
      art: mix.art
    };
  }
  function pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length) % arr.length]; }
  // 2つの genome から子の art と nature をランダム継承する
  function mixGenes(rnd, A, Bp) {
    var pool = colorPool();
    var flags = { mutated: false };
    var art = {
      base: A.species,
      color:  inherit(rnd, A.art.color,  Bp.art.color,  function (r) { return pick(r, pool); }, 0.08, flags),
      color2: inherit(rnd, A.art.color2, Bp.art.color2, function (r) { return pick(r, pool); }, 0.08, flags),
      ear:     inherit(rnd, A.art.ear,     Bp.art.ear,     function (r) { return pick(r, EARS); }, 0.05, flags),
      pattern: inherit(rnd, A.art.pattern, Bp.art.pattern, function (r) { return pick(r, PATTERNS); }, 0.05, flags),
      fluffy:  inherit(rnd, !!A.art.fluffy, !!Bp.art.fluffy, function (r) { return r() < 0.5; }, 0.05, flags),
      tail:    inherit(rnd, A.art.tail || 'normal', Bp.art.tail || 'normal', function (r) { return pick(r, TAILS); }, 0.05, flags),
      eye:     inherit(rnd, A.art.eye, Bp.art.eye, function (r) { return pick(r, EYE_RARE); }, 0.02, flags)
    };
    var nature = rnd() < 0.05 ? HYBRID_NATURE : (rnd() < 0.5 ? A.nature : Bp.nature);
    return { art: art, nature: nature, mutated: flags.mutated };
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
      s.current = freshPet(chosen.id);
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
    getRoom: function () { return (this._state && this._state.room) || defaultRoom(); },
    /** スロットにアイテムをはめる（itemId=null で外す）。アイテムの解放可否はUI側で判定 */
    equipRoom: function (slot, itemId, now) {
      var s = this._state;
      if (!s) return null;
      var room = Object.assign(defaultRoom(), s.room || {});
      room[slot] = itemId;
      var ns = { ...s, room: room, lastSavedAt: now || s.lastSavedAt };
      this._state = ns;
      persist(ns);
      return room;
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
      var r = advance(s, msSim, msReward);
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
      var r = advance(s, clamp(ms, 0, MAX_SIM), clamp(ms, 0, MAX_OFFLINE));
      this._state = { ...r.state, lastSavedAt: now };
      persist(this._state);
    },

    FOOD_HUNGER: FOOD_HUNGER,
    FOOD_COST: FOOD_COST,
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
      var ns = { ...s, current: np, foodStock: stock - 1, lastSavedAt: now };
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
      // きせかえドロップ: 確率で未所持のアクセサリを1つ入手（初回は自動で着せる）
      var ward = { owned: Object.assign({}, (s.wardrobe && s.wardrobe.owned) || {}), equipped: (s.wardrobe && s.wardrobe.equipped) || null };
      var wear = null;
      if (rnd() < WEAR_DROP_RATE) {
        var pool = WEAR_IDS.filter(function (id) { return !ward.owned[id]; });
        if (pool.length) { wear = pool[Math.floor(rnd() * pool.length)]; ward.owned[wear] = 1; if (!ward.equipped) ward.equipped = wear; }
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

    // ===== きせかえ（ペットのアクセサリ。おさんぽ報酬で集める） =====
    WEAR_IDS: WEAR_IDS,
    wardrobe: function () { return this._state ? (this._state.wardrobe || { owned: {}, equipped: null }) : { owned: {}, equipped: null }; },
    /** きせかえを着る（id=null で脱ぐ）。未所持は無視 */
    equipWear: function (id, now) {
      var s = this._state; if (!s) return null;
      var ward = { owned: Object.assign({}, (s.wardrobe && s.wardrobe.owned) || {}), equipped: (s.wardrobe && s.wardrobe.equipped) || null };
      if (id && !ward.owned[id]) return ward;
      ward.equipped = id || null;
      var ns = { ...s, wardrobe: ward, lastSavedAt: now || s.lastSavedAt };
      this._state = ns;
      persist(ns);
      return ward;
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
      var ns = { ...s, current: np, coin: s.coin + (def.coin || 0), lastSavedAt: now };
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
    farewell: function (now, rnd) {
      rnd = rnd || Math.random;
      var s = this._state;
      if (!s || !s.current) return null;
      var cause = s.current.health <= 0 ? 'star' : (s.current.away ? 'away' : null);
      if (!cause) return null;
      var breed = Breeds.get(s.current.breedId);
      var next = Breeds.roll(rnd, s.luck);
      var ns = {
        ...s,
        deaths: (s.deaths || 0) + (cause === 'star' ? 1 : 0),
        runaways: (s.runaways || 0) + (cause === 'away' ? 1 : 0),
        current: freshPet(next.id),
        walk: null,
        lastSavedAt: now
      };
      this._state = ns;
      persist(ns);
      return { breed: breed, next: next, cause: cause };
    },

    /** 危険の予測（通知スケジュール用）。
        hunger=空腹予告 / detox=おさんぽ催促（家出の前ぶれ） / health=いのち警告 */
    dangerForecast: function (now) {
      var s = this._state;
      if (!s || !s.current || stageOf(s.current.xp) < 1) return [];
      var p = s.current;
      var ev = [];
      var stock = s.foodStock == null ? 0 : s.foodStock;
      // ストックがあるかぎり自動給餌される＝飢えるのは「ストック切れ＋おなかが空いたとき」
      var hoursOfStock = (stock * FOOD_HUNGER + p.hunger) / DECAY.hunger;
      var tHunger0 = hoursOfStock; // 実質の空腹到達(h)
      ev.push({ type: 'hunger', at: now + tHunger0 * H });
      var sp = p.sanpo == null ? 100 : p.sanpo;
      if (sp > 0) ev.push({ type: 'sanpo', at: now + (sp / SANPO_DECAY) * H });
      // いのち50%割れ＝飢えのみで決まるため閉形式で出せる
      var health = p.health == null ? 100 : p.health;
      if (health > 50) {
        ev.push({ type: 'health', at: now + (tHunger0 + (health - 50) / STARVE_DRAIN) * H });
      }
      ev.sort(function (a, b) { return a.at - b.at; });
      return ev;
    },

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
    graduate: function (now, rnd) {
      rnd = rnd || Math.random;
      var s = this._state;
      if (!s || !s.current || stageOf(s.current.xp) < 3) return null;
      var dex = { ...s.dex };
      var isNew = false, reward, breed;
      if (s.current.mix) {
        // ミックスは30種図鑑には登録しない（アルバムが記録）。巣立ちボーナスのみ
        breed = mixBreed(s.current.mix);
        reward = 60;
      } else {
        breed = Breeds.get(s.current.breedId);
        isNew = !s.dex[breed.id];
        reward = 20 + Breeds.RARITY[breed.rarity].stars * 40 + (isNew ? 100 : 0);
        var prev = dex[breed.id] || { count: 0, firstAt: now };
        dex[breed.id] = { count: prev.count + 1, firstAt: prev.firstAt || now, unseen: true };
      }

      var luck = clamp(s.luck + 0.04, 0, 2);
      var next = Breeds.roll(rnd, luck, !!s.premium);

      var ns = {
        ...s,
        dex: dex,
        coin: s.coin + reward,
        luck: luck,
        graduates: s.graduates + 1,
        current: freshPet(next.id),
        lastSavedAt: now
      };
      this._state = ns;
      persist(ns);
      return { breed: breed, isNew: isNew, reward: reward, next: next };
    },

    // ===== おみあい（ブリード）API =====
    /** 成体どうしだけ おみあいできる */
    canMate: function () { return this.stage() >= 3; },

    /** 自分の成体の「おみあいコード」を発行（成体のみ・端末外送信なし） */
    mateCode: function () {
      var s = this._state;
      if (!s || !s.current || stageOf(s.current.xp) < 3) return null;
      var g = genomeOf(s);
      var code = bytes2b32(genomeToBytes(g));
      var prefix = g.species === 'cat' ? 'NEK' : 'INU';
      var groups = code.match(/.{1,4}/g) || [code];
      return prefix + '-' + groups.join('-');
    },

    /** 相手のコードを解読。{species, nature, art, name} または {error} */
    decodeMate: function (code) {
      if (!code || typeof code !== 'string') return { error: 'format' };
      var up = code.toUpperCase();
      // メッセージ全文（LINE等）を貼ってもOK: プレフィックス INU-/NEK- を起点にコード塊だけ抜き出す。
      // 見つからなければ従来どおり最初の '-' 以降を本体扱い。b32toBytes は '-' や非base32文字を読み飛ばす。
      var m = up.match(/(?:INU|NEK)-[0-9A-HJKMNP-TV-Z\-]+/);
      var body = m ? m[0].slice(m[0].indexOf('-') + 1)
                   : (up.indexOf('-') >= 0 ? up.slice(up.indexOf('-') + 1) : up);
      var g = bytesToGenome(b32toBytes(body));
      if (g.error) return g;
      if (g.breedIdx != null && Breeds.ALL[g.breedIdx]) g.name = Breeds.ALL[g.breedIdx].name;
      else g.name = 'ミックス';
      return g;
    },

    /**
     * おみあい成立: 自分の成体を巣立ち登録し、相手 partner との特徴を継いだミックスのおくるみを迎える。
     * partner = decodeMate の結果。成功で { child, isMix, isNew, parents, mutated }。
     */
    breedWith: function (partner, now, rnd) {
      rnd = rnd || Math.random;
      var s = this._state;
      if (!s || !s.current || stageOf(s.current.xp) < 3) return { error: 'not_adult' };
      if (!partner || partner.error) return { error: 'bad_code' };
      var mine = genomeOf(s);
      if (mine.species !== partner.species) return { error: 'species' };

      // 自分の成体を巣立たせる（pure品種なら図鑑に登録）
      var dex = { ...s.dex };
      var graduates = s.graduates;
      var isNew = false, reward = 0;
      if (mine.breedIdx != null) {
        var pb = Breeds.ALL[mine.breedIdx];
        isNew = !dex[pb.id];
        reward = 20 + Breeds.RARITY[pb.rarity].stars * 40 + (isNew ? 100 : 0);
        var prev = dex[pb.id] || { count: 0, firstAt: now };
        dex[pb.id] = { count: prev.count + 1, firstAt: prev.firstAt || now, unseen: true };
        graduates += 1;
      }

      // 種類(品種)を確率で継承: 両親とも純血種なら 40%親A / 40%親B / 20%ミックス。
      // 先頭の1回の rnd() が分岐を決める（テストで決定論的に再現できるように）
      var parents = [mine.name, partner.name];
      var bothPure = mine.breedIdx != null && partner.breedIdx != null;
      var roll = bothPure ? rnd() : 1; // 片方でもミックス親なら必ずミックス
      var childBreedIdx = null;
      if (roll < 0.40) childBreedIdx = mine.breedIdx;
      else if (roll < 0.80) childBreedIdx = partner.breedIdx;
      var childIsMix = childBreedIdx == null;

      var child, genes = null;
      if (childIsMix) {
        // ミックス: 色・目の色・模様・耳・ふわふわ・しっぽを 親から各50%で継承（突然変異あり）
        genes = mixGenes(rnd, mine, partner);
        child = mixBreed({ species: mine.species, nature: genes.nature, art: genes.art, parents: parents });
      } else {
        // 種類を継承した純血の子（どちらかの親の品種）
        child = Breeds.ALL[childBreedIdx];
      }
      var inheritedBreed = childIsMix ? null : child.name;
      var mutated = genes ? genes.mutated : false;

      var newPet = freshPet(childIsMix ? 'mix' : child.id);
      if (childIsMix) {
        newPet.mix = { species: mine.species, nature: genes.nature, art: genes.art, parents: parents };
      }

      var album = s.album ? s.album.slice() : [];
      if (childIsMix) {
        album.unshift({ at: now, species: mine.species, nature: genes.nature, art: genes.art, parents: parents });
      }

      var ns = {
        ...s,
        current: newPet,
        dex: dex,
        graduates: graduates,
        coin: s.coin + reward,
        luck: clamp(s.luck + (childIsMix ? 0.04 : 0.06), 0, 2),
        album: album,
        lastSavedAt: now
      };
      this._state = ns;
      persist(ns);
      return { child: child, isMix: childIsMix, isNew: isNew, reward: reward, parents: parents, mutated: mutated, inheritedBreed: inheritedBreed };
    },

    /** ミックスのアルバム（新しい順） */
    album: function () { return (this._state && this._state.album) || []; },

    /** ねんね中(stage0)のうちは別の子と会い直せる（コイン消費） */
    reroll: function (now, rnd) {
      rnd = rnd || Math.random;
      var s = this._state;
      if (!s || !s.current) return null;
      if (stageOf(s.current.xp) !== 0) return { error: 'already_hatched' };
      if (s.coin < REROLL_COST) return { error: 'no_coin' };
      var next = Breeds.roll(rnd, s.luck, !!s.premium);
      var ns = { ...s, coin: s.coin - REROLL_COST, current: freshPet(next.id), lastSavedAt: now };
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
      // 進捗の「全体」は解放状況で変わる（無料は30種コンプ、課金後は全種コンプが目標）
      var freeTotal = Breeds.ALL.filter(Breeds.isFree).length;
      var premiumTotal = Breeds.ALL.length - freeTotal;
      var total = premium ? Breeds.ALL.length : freeTotal;
      var dogTotal = Breeds.ofSpecies('dog').filter(function (b) { return premium || Breeds.isFree(b); }).length;
      var catTotal = Breeds.ofSpecies('cat').filter(function (b) { return premium || Breeds.isFree(b); }).length;
      var found = 0, dogFound = 0, catFound = 0, newCount = 0, premiumFound = 0;
      if (s) {
        Object.keys(s.dex).forEach(function (id) {
          var b = Breeds.get(id);
          if (!b) return;
          found++;
          if (b.species === 'dog') dogFound++; else catFound++;
          if (!Breeds.isFree(b)) premiumFound++;
          if (s.dex[id].unseen) newCount++;
        });
      }
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
