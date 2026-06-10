/**
 * ゲームエンジン：時間減衰・オフライン進行・成長・図鑑登録・永続化
 * - 時刻は now(ms) を注入できる決定論的設計（Date.now() を直呼びしない）
 * - 状態はイミュータブルに更新（{...s} で新規生成）
 */
(function (global) {
  'use strict';

  var SAVE_KEY = 'inuneko_dex_save_v1';
  var VERSION = 2;
  var H = 3600000; // 1時間(ms)
  var MAX_OFFLINE = 24 * H;

  // ----- おさんぽ（Forest型セッション）-----
  // 開始後はアプリを閉じて過ごす。満了前にアプリへ戻ると失敗（開始直後の猶予あり）。
  var WALK_GRACE = 60000;            // 開始から60秒は戻っても失敗にしない（誤タップ救済）
  var WALK_OPTIONS = [30, 60, 120];  // 選べる長さ（分）
  var WALK_XP_PER_H = 36;            // 成功ボーナスxp/時（通常放置18/hの2倍を上乗せ）
  var WALK_COIN_PER_H = 60;          // 成功ボーナスコイン/時
  var WALK_LUCK = 0.03;              // 成功ごとのレア運上昇
  var WALK_MOOD = 20;                // 成功時の機嫌アップ
  var WALK_FAIL_MOOD = -12;          // 失敗時の機嫌ダウン

  // 成長に必要な累積なかよし度（xp）。index=到達stage
  var GROW = [0, 12, 70, 180]; // 0:卵 1:赤ちゃん 2:子 3:成体

  // 1時間あたりの自然減衰量
  var DECAY = { hunger: 12.5, mood: 8.34, clean: 6.25, energy: 10 };

  // 世話アクション効果
  var CARE = {
    feed:  { hunger: 38, xp: 8, coin: 3, label: 'ごはん' },
    play:  { mood: 32, energy: -8, xp: 8, coin: 3, label: 'あそぶ' },
    wash:  { clean: 42, xp: 8, coin: 3, label: 'おそうじ' },
    sleep: { energy: 45, mood: 5, xp: 6, coin: 2, label: 'ねんね' }
  };

  var REROLL_COST = 30;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function stageOf(xp) {
    var st = 0;
    for (var i = 1; i < GROW.length; i++) if (xp >= GROW[i]) st = i;
    return st;
  }

  function avgStatus(p) {
    return (p.hunger + p.mood + p.clean + p.energy) / 4;
  }

  function freshPet(breedId) {
    return {
      breedId: breedId,
      xp: 0,
      hunger: 72, mood: 72, clean: 78, energy: 78,
      careCount: 0
    };
  }

  function newState(now) {
    return {
      version: VERSION,
      coin: 0,
      luck: 0,
      current: null,        // 種選択後に設定
      dex: {},              // breedId -> { count, firstAt, unseen }
      lastSavedAt: now,
      graduates: 0,
      walk: null,           // { startedAt, endsAt, minutes } おさんぽ中のみ
      walkStats: { success: 0, fail: 0, streak: 0, best: 0, totalMin: 0 }
    };
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
    return s.version === VERSION ? s : null; // 未知のバージョンは初期化扱い
  }

  function persist(state) {
    try {
      if (global.localStorage) global.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) { /* 容量超過などは無視 */ }
  }

  // ----- 時間進行（純粋計算）-----
  // state を ms 分だけ進めた新しい state を返す
  function advance(state, ms) {
    if (ms <= 0 || !state.current) return { state: state, coinGain: 0, xpGain: 0 };
    var hours = ms / H;
    var p = state.current;
    var hf = clamp(avgStatus(p) / 100, 0.15, 1); // 健康度（瀕死でも0.15は育つ）

    var xpGain = 18 * hours * hf;
    var coinGain = (50 * hours) * (0.4 + 0.6 * hf);

    var np = {
      breedId: p.breedId,
      xp: p.xp + xpGain,
      hunger: clamp(p.hunger - DECAY.hunger * hours, 0, 100),
      mood:   clamp(p.mood   - DECAY.mood   * hours, 0, 100),
      clean:  clamp(p.clean  - DECAY.clean  * hours, 0, 100),
      energy: clamp(p.energy - DECAY.energy * hours, 0, 100),
      careCount: p.careCount
    };
    var ns = { ...state, current: np, coin: state.coin + coinGain };
    return { state: ns, coinGain: coinGain, xpGain: xpGain };
  }

  // ====== 公開API ======
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

    /** 初回：種(species)を選んで最初の卵を抽選 */
    newGame: function (species, now, rnd) {
      rnd = rnd || Math.random;
      var s = newState(now);
      var pool = Breeds.ofSpecies(species);
      var pick = pool[Math.floor(rnd() * pool.length)];
      // レアリティ重みで引き直す（初回は selected species 内で）
      var chosen = rollFrom(pool, rnd, 0) || pick;
      s.current = freshPet(chosen.id);
      this._state = s;
      persist(s);
      return s;
    },

    getState: function () { return this._state; },

    breed: function () { return this._state && this._state.current ? Breeds.get(this._state.current.breedId) : null; },
    stage: function () { return this._state && this._state.current ? stageOf(this._state.current.xp) : 0; },

    /** 起動時オフライン進行。報告用の差分を返す */
    applyOffline: function (now) {
      var s = this._state;
      if (!s || !s.current) return null;
      var raw = now - s.lastSavedAt;
      if (raw < 0) raw = 0;                 // 端末時計の巻き戻り対策（簡易）
      var ms = clamp(raw, 0, MAX_OFFLINE);
      var beforeStage = stageOf(s.current.xp);
      var beforeStatus = { ...s.current };
      var r = advance(s, ms);
      var ns = { ...r.state, lastSavedAt: now };
      this._state = ns;
      persist(ns);
      return {
        elapsedMs: raw,
        cappedMs: ms,
        coinGain: Math.floor(r.coinGain),
        beforeStage: beforeStage,
        afterStage: stageOf(ns.current.xp),
        before: beforeStatus
      };
    },

    /** 毎フレーム（=毎秒程度）の進行。lastSavedAt から now までを適用 */
    tick: function (now) {
      var s = this._state;
      if (!s || !s.current) return;
      var ms = now - s.lastSavedAt;
      if (ms < 0) ms = 0;
      if (ms > MAX_OFFLINE) ms = MAX_OFFLINE; // タブ放置などの巨大ギャップもオフライン上限に揃える
      var r = advance(s, ms);
      this._state = { ...r.state, lastSavedAt: now };
      persist(this._state);
    },

    /** 世話アクション */
    care: function (action, now) {
      var s = this._state;
      if (!s || !s.current) return null;
      var def = CARE[action];
      if (!def) return null;
      var p = s.current;
      var np = {
        breedId: p.breedId,
        xp: p.xp + (def.xp || 0),
        hunger: clamp(p.hunger + (def.hunger || 0), 0, 100),
        mood:   clamp(p.mood   + (def.mood   || 0), 0, 100),
        clean:  clamp(p.clean  + (def.clean  || 0), 0, 100),
        energy: clamp(p.energy + (def.energy || 0), 0, 100),
        careCount: p.careCount + 1
      };
      var ns = { ...s, current: np, coin: s.coin + (def.coin || 0), lastSavedAt: now };
      this._state = ns;
      persist(ns);
      return { stageBefore: stageOf(p.xp), stageAfter: stageOf(np.xp) };
    },

    /** キャラなでなで（軽い回復＋なかよし） */
    pet: function (now) {
      var s = this._state;
      if (!s || !s.current) return null;
      var p = s.current;
      var np = { ...p, mood: clamp(p.mood + 10, 0, 100), energy: clamp(p.energy - 2, 0, 100), xp: p.xp + 3 };
      var ns = { ...s, current: np, lastSavedAt: now };
      this._state = ns;
      persist(ns);
      return { stageBefore: stageOf(p.xp), stageAfter: stageOf(np.xp) };
    },

    canGraduate: function () { return this.stage() >= 3; },

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
        var np = { ...p, xp: p.xp + xpGain, mood: clamp(p.mood + WALK_MOOD, 0, 100) };
        var ns = {
          ...s,
          current: np,
          coin: s.coin + coinGain,
          luck: clamp(s.luck + WALK_LUCK, 0, 2),
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
          xpGain: Math.floor(xpGain), streak: streak,
          isBest: streak > st.best,
          stageBefore: stageBefore, stageAfter: stageOf(np.xp)
        };
      } else {
        var np2 = { ...p, mood: clamp(p.mood + WALK_FAIL_MOOD, 0, 100) };
        var ns2 = {
          ...s,
          current: np2,
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

    /** 成体を巣立たせ図鑑に登録 → 次の卵を抽選 */
    graduate: function (now, rnd) {
      rnd = rnd || Math.random;
      var s = this._state;
      if (!s || !s.current || stageOf(s.current.xp) < 3) return null;
      var breed = Breeds.get(s.current.breedId);
      var isNew = !s.dex[breed.id];
      var rstars = Breeds.RARITY[breed.rarity].stars;
      var reward = 20 + rstars * 40 + (isNew ? 100 : 0);

      var dex = { ...s.dex };
      var prev = dex[breed.id] || { count: 0, firstAt: now };
      dex[breed.id] = { count: prev.count + 1, firstAt: prev.firstAt || now, unseen: true };

      var luck = clamp(s.luck + 0.04, 0, 2);
      var next = Breeds.roll(rnd, luck);

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

    /** 卵(stage0)を別品種に引き直す（コイン消費） */
    reroll: function (now, rnd) {
      rnd = rnd || Math.random;
      var s = this._state;
      if (!s || !s.current) return null;
      if (stageOf(s.current.xp) !== 0) return { error: 'already_hatched' };
      if (s.coin < REROLL_COST) return { error: 'no_coin' };
      var next = Breeds.roll(rnd, s.luck);
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
      var total = Breeds.ALL.length;
      var found = s ? Object.keys(s.dex).length : 0;
      var dogTotal = Breeds.ofSpecies('dog').length;
      var catTotal = Breeds.ofSpecies('cat').length;
      var dogFound = 0, catFound = 0, newCount = 0;
      if (s) {
        Object.keys(s.dex).forEach(function (id) {
          var b = Breeds.get(id);
          if (!b) return;
          if (b.species === 'dog') dogFound++; else catFound++;
          if (s.dex[id].unseen) newCount++;
        });
      }
      return { total: total, found: found, dogTotal: dogTotal, catTotal: catTotal, dogFound: dogFound, catFound: catFound, newCount: newCount };
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
