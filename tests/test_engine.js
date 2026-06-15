/**
 * エンジン単体テスト（依存なし・Node標準のみ）
 * 実行: node tests/test_engine.js
 * breeds.js / engine.js を vm で読み込み、時刻を注入して決定論的に検証する。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const H = 3600000;
const MIN = 60000;

function makeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _map: m
  };
}

/** breeds.js + engine.js を新しいサンドボックスに読み込む */
function freshWorld(storage) {
  const sandbox = { localStorage: storage || makeStorage() };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  for (const f of ['www/js/breeds.js', 'www/js/engine.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), sandbox, { filename: f });
  }
  sandbox.Engine.setTest(false); // 単体テストは通常バランス（成長18/h・生存の時計も等倍）で決定論的に検証
  return sandbox;
}

/** vmコンテキスト間ではプロトタイプが異なるため、JSONに正規化して比較する */
function eqJSON(a, b) {
  assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
}

let passed = 0;
const failed = [];
function test(name, fn) {
  try { fn(); passed++; console.log('  ok - ' + name); }
  catch (e) { failed.push(name); console.error('  NG - ' + name + '\n      ' + e.message); }
}

const T0 = 1750000000000; // 固定の基準時刻
const rnd0 = () => 0.0;   // 常に先頭（コモン）を引く決定論的rnd

// ---------------------------------------------------------------

console.log('# 図鑑データ');

test('品種は30種以上で、定義が揃っている', () => {
  const w = freshWorld();
  const B = w.Breeds;
  assert.ok(B.ALL.length >= 30, `品種数 ${B.ALL.length}`);
  const ids = new Set();
  const ears = ['prick', 'bigprick', 'flop', 'round', 'fold'];
  const pats = ['solid', 'tan', 'patch', 'spot', 'tabby', 'calico', 'tuxedo', 'point'];
  for (const b of B.ALL) {
    assert.ok(!ids.has(b.id), `id重複: ${b.id}`);
    ids.add(b.id);
    assert.ok(['dog', 'cat'].includes(b.species), b.id);
    assert.ok(B.RARITY[b.rarity], `${b.id}: rarity ${b.rarity}`);
    assert.ok(b.name && b.desc, b.id);
    assert.ok(ears.includes(b.art.ear), `${b.id}: ear ${b.art.ear}`);
    assert.ok(pats.includes(b.art.pattern), `${b.id}: pattern ${b.art.pattern}`);
    assert.match(b.art.color, /^#[0-9a-f]{6}$/i, `${b.id}: color`);
    assert.match(b.art.eye, /^#[0-9a-f]{6}$/i, `${b.id}: eye`);
    assert.strictEqual(b.art.base, b.species, `${b.id}: base と species の不一致`);
    assert.ok(w.Breeds.NATURES[b.nature], `${b.id}: nature「${b.nature}」が NATURES に未定義`);
  }
  const dogs = B.ofSpecies('dog').length, cats = B.ofSpecies('cat').length;
  assert.ok(dogs >= 15 && cats >= 15, `dog=${dogs} cat=${cats}`);
});

test('無料抽選は無料ティアのみ／課金抽選は全品種', () => {
  const w = freshWorld();
  const freeCount = w.Breeds.ALL.filter(w.Breeds.isFree).length;
  const seenFree = new Set(), seenAll = new Set();
  for (let i = 0; i < 5000; i++) {
    seenFree.add(w.Breeds.roll(() => i / 5000, 0, false).id); // 無料
    seenAll.add(w.Breeds.roll(() => i / 5000, 0, true).id);   // 課金
  }
  assert.strictEqual(seenFree.size, freeCount);            // 無料は30種だけ
  assert.strictEqual(seenAll.size, w.Breeds.ALL.length);   // 課金で全種
  // 無料プールにプレミアム種が混ざらない
  assert.ok(![...seenFree].some(id => w.Breeds.isPremium(w.Breeds.get(id))));
});

test('抽選: 収集済み・直前と同じ品種は出にくい（同じ子ばかり対策）', () => {
  const w = freshWorld();
  const B = w.Breeds;
  const countRolls = (opts) => {
    const c = {};
    for (let i = 0; i < 2000; i++) { const b = B.roll(() => i / 2000, 0, false, 'dog', opts); c[b.id] = (c[b.id] || 0) + 1; }
    return c;
  };
  const base = countRolls(undefined);
  const top = Object.keys(base).sort((a, b) => base[b] - base[a])[0]; // 最頻の犬種
  const damped = countRolls({ owned: { [top]: 1 }, avoid: top });
  assert.ok((damped[top] || 0) < base[top] * 0.5, `収集済み＆直前は半減以下: ${base[top]}→${damped[top] || 0}`);
  const sum = (o) => Object.keys(o).reduce((a, k) => a + o[k], 0);
  assert.strictEqual(sum(damped), 2000, '必ず何か返る（合計不変）');
});

console.log('# 新規ゲームとセーブ');

test('newGame で v14 の初期状態ができる', () => {
  const w = freshWorld();
  const s = w.Engine.newGame('dog', T0, rnd0);
  assert.strictEqual(s.version, 14);
  assert.strictEqual(s.points, 0);
  assert.strictEqual(s.premium, false);
  eqJSON(s.album, []);
  assert.strictEqual(s.foodStock, 6);
  assert.strictEqual(s.task, null);
  assert.ok(s.current);
  assert.ok(w.Breeds.isFree(w.Breeds.get(s.current.breedId))); // 初回は必ず無料種
  assert.strictEqual(s.current.health, 100);
  assert.strictEqual(s.current.sanpo, 100);
  assert.strictEqual(s.deaths, 0);
  assert.strictEqual(s.runaways, 0);
  assert.strictEqual(s.walk, null);
  eqJSON(s.walkStats, { success: 0, fail: 0, streak: 0, best: 0, totalMin: 0 });
  eqJSON(s.taskStats, { success: 0, days: 0, bestDays: 0, lastDay: null, totalMin: 0, byKind: {} });
  eqJSON(s.allowApps, []);
  eqJSON(s.reminders, { enabled: false, times: [] });
  eqJSON(s.wardrobe, { owned: {}, equipped: null });
});

test('unlockPremium で全品種が解放される', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  assert.strictEqual(w.Engine.isPremium(), false);
  const prog0 = w.Engine.dexProgress();
  assert.strictEqual(prog0.total, prog0.freeTotal); // 無料時の目標は30種
  const r = w.Engine.unlockPremium(T0);
  assert.ok(r.unlocked);
  assert.strictEqual(w.Engine.isPremium(), true);
  const prog1 = w.Engine.dexProgress();
  assert.strictEqual(prog1.total, w.Breeds.ALL.length); // 課金後は全種が目標
  assert.ok(prog1.premiumTotal > 0);
  // 二重解放は no-op
  assert.ok(w.Engine.unlockPremium(T0).already);
});

test('部屋: 既定cream→はめ込み→外す（課金と独立に保存）', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  assert.strictEqual(w.Engine.getRoom().bg, 'cream');
  assert.strictEqual(w.Engine.getRoom().wall, null);
  w.Engine.equipRoom('wall', 'w_pic', T0);
  assert.strictEqual(w.Engine.getRoom().wall, 'w_pic');
  w.Engine.equipRoom('bg', 'bg_sky', T0);
  assert.strictEqual(w.Engine.getRoom().bg, 'bg_sky');
  w.Engine.equipRoom('wall', null, T0); // 外す
  assert.strictEqual(w.Engine.getRoom().wall, null);
  assert.strictEqual(w.Engine.isPremium(), false); // 部屋の操作は課金フラグに影響しない
});

test('セーブ→ロードで状態が一致する', () => {
  const storage = makeStorage();
  const w1 = freshWorld(storage);
  const s1 = w1.Engine.newGame('cat', T0, rnd0);
  const w2 = freshWorld(storage);
  const s2 = w2.Engine.init();
  eqJSON(s2, s1);
});

test('v1セーブが 最新版 にマイグレーションされる', () => {
  const storage = makeStorage();
  const v1save = {
    version: 1, coin: 42, luck: 0.1,
    current: { breedId: 'shiba', xp: 30, hunger: 50, mood: 50, clean: 50, energy: 50, careCount: 3 },
    dex: { shiba: { count: 1, firstAt: T0, unseen: false } },
    lastSavedAt: T0, graduates: 1
  };
  storage.setItem('inuneko_dex_save_v1', JSON.stringify(v1save));
  const w = freshWorld(storage);
  const s = w.Engine.init();
  assert.strictEqual(s.version, 14);
  assert.strictEqual(s.premium, false); // 既存ユーザーは無料ティアへ移行
  assert.strictEqual(s.coin, 42);
  assert.strictEqual(s.foodStock, 6); // v4のitems(5+1)がv5でストックに統合
  assert.strictEqual(s.walk, null);
  assert.strictEqual(s.task, null);
  assert.strictEqual(s.current.health, 100);
  assert.strictEqual(s.current.sanpo, 100);
  assert.strictEqual(s.current.detox, undefined);
  assert.strictEqual(s.deaths, 0);
  assert.strictEqual(s.room.bg, 'cream'); // v9で部屋が既定値で付与される
  assert.strictEqual(s.taskStats.days, 0); // v10でさんぽダッシュボードが付与される
  eqJSON(s.allowApps, []);
  eqJSON(s.reminders, { enabled: false, times: [] });
  eqJSON(s.wardrobe, { owned: {}, equipped: null }); // v11できせかえが付与される
});

console.log('# オフライン進行');

test('オフライン進行は24時間で頭打ち', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  const rep = w.Engine.applyOffline(T0 + 72 * H);
  assert.strictEqual(rep.cappedMs, 24 * H);
  assert.strictEqual(rep.elapsedMs, 72 * H);
});

test('時計の巻き戻りでは進行しない', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  const coin0 = w.Engine.getState().coin;
  const rep = w.Engine.applyOffline(T0 - 5 * H);
  assert.strictEqual(rep.cappedMs, 0);
  assert.strictEqual(w.Engine.getState().coin, coin0);
});

test('tick の巨大ギャップも24時間で頭打ち', () => {
  const w1 = freshWorld();
  w1.Engine.newGame('dog', T0, rnd0);
  w1.Engine.tick(T0 + 24 * H);
  const w2 = freshWorld();
  w2.Engine.newGame('dog', T0, rnd0);
  w2.Engine.tick(T0 + 100 * H);
  assert.strictEqual(w2.Engine.getState().coin, w1.Engine.getState().coin);
});

test('同じ経過時間なら結果が同じ（決定論）', () => {
  const a = freshWorld(); a.Engine.newGame('dog', T0, rnd0); a.Engine.applyOffline(T0 + 3 * H);
  const b = freshWorld(); b.Engine.newGame('dog', T0, rnd0); b.Engine.applyOffline(T0 + 3 * H);
  eqJSON(a.Engine.getState(), b.Engine.getState());
});

console.log('# おさんぽ');

test('開始 → 満了で成功し、報酬と streak が付く', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  const coin0 = w.Engine.getState().coin;
  const xp0 = w.Engine.getState().current.xp;
  assert.ok(w.Engine.startWalk(30, T0));
  const r = w.Engine.checkWalk(T0 + 30 * MIN, true);
  assert.strictEqual(r.result, 'success');
  assert.strictEqual(r.streak, 1);
  assert.ok(w.Engine.getState().coin > coin0);
  assert.ok(w.Engine.getState().current.xp > xp0);
  assert.strictEqual(w.Engine.walk(), null);
  assert.strictEqual(w.Engine.getState().walkStats.totalMin, 30);
});

test('30分おさんぽ成功で赤ちゃんがめざめる（xp+18 >= めざめ12）', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  w.Engine.startWalk(30, T0);
  const r = w.Engine.checkWalk(T0 + 30 * MIN, true);
  assert.strictEqual(r.stageBefore, 0);
  assert.ok(r.stageAfter >= 1);
});

test('猶予60秒以内の復帰は失敗にならない', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  w.Engine.startWalk(30, T0);
  const r = w.Engine.checkWalk(T0 + 30 * 1000, true); // 30秒後に画面を見ている
  assert.strictEqual(r.result, 'ongoing');
  assert.strictEqual(r.inGrace, true);
  assert.ok(w.Engine.walk()); // まだ継続中
});

test('猶予を過ぎた復帰（画面が見えている）は失敗・streakリセット', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  // 1回成功させて streak=1 にしてから
  w.Engine.startWalk(30, T0);
  w.Engine.checkWalk(T0 + 30 * MIN, true);
  assert.strictEqual(w.Engine.getState().walkStats.streak, 1);
  // 2回目を途中で開いてしまう
  const t1 = T0 + 40 * MIN;
  w.Engine.startWalk(60, t1);
  const r = w.Engine.checkWalk(t1 + 10 * MIN, true);
  assert.strictEqual(r.result, 'fail');
  assert.strictEqual(r.reason, 'returned');
  assert.strictEqual(w.Engine.getState().walkStats.streak, 0);
  assert.strictEqual(w.Engine.getState().walkStats.fail, 1);
  assert.strictEqual(w.Engine.walk(), null);
});

test('画面が見えていない間（バックグラウンド）は失敗しない', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  w.Engine.startWalk(60, T0);
  const r = w.Engine.checkWalk(T0 + 30 * MIN, false);
  assert.strictEqual(r.result, 'ongoing');
});

test('あきらめる は失敗扱い（reason=cancel）', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  w.Engine.startWalk(30, T0);
  const r = w.Engine.cancelWalk(T0 + 5 * MIN);
  assert.strictEqual(r.result, 'fail');
  assert.strictEqual(r.reason, 'cancel');
});

test('連続成功でボーナス倍率が上がる', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  let t = T0;
  let first = null, third = null;
  for (let i = 0; i < 3; i++) {
    w.Engine.startWalk(30, t);
    const r = w.Engine.checkWalk(t + 30 * MIN, true);
    assert.strictEqual(r.result, 'success');
    if (i === 0) first = r.coinGain;
    if (i === 2) third = r.coinGain;
    t += 40 * MIN;
  }
  assert.ok(third > first, `3回目(${third}) > 1回目(${first})`);
  assert.strictEqual(w.Engine.getState().walkStats.best, 3);
});

test('成功でレア運(luck)が上がる', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  const luck0 = w.Engine.getState().luck;
  w.Engine.startWalk(30, T0);
  w.Engine.checkWalk(T0 + 30 * MIN, true);
  assert.ok(w.Engine.getState().luck > luck0);
});

test('おさんぽ中の状態はセーブ・復元される', () => {
  const storage = makeStorage();
  const w1 = freshWorld(storage);
  w1.Engine.newGame('dog', T0, rnd0);
  w1.Engine.startWalk(120, T0);
  // アプリ再起動を模擬
  const w2 = freshWorld(storage);
  w2.Engine.init();
  const r = w2.Engine.checkWalk(T0 + 120 * MIN, true);
  assert.strictEqual(r.result, 'success');
  assert.strictEqual(r.minutes, 120);
});

test('不正な長さの startWalk は拒否される', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  assert.strictEqual(w.Engine.startWalk(7, T0), null);
  assert.strictEqual(w.Engine.walk(), null);
});

test('おさんぽ中の二重開始は拒否される', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  assert.ok(w.Engine.startWalk(30, T0));
  assert.strictEqual(w.Engine.startWalk(30, T0 + 1000), null);
});

console.log('# いのち（生存システム）');

/** stage1 まで育てるヘルパ（おそうじは成長しなくなったので、なかよしを直接与える） */
function toStage1(w, t) {
  // GROW[1]=0.225 を超えれば赤ちゃん
  w.Engine.getState().current.xp = 10;
  assert.ok(w.Engine.stage() >= 1);
}

test('スマホを使わない（離れている）かぎり、どれだけ放置しても死なない・家出しない', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  toStage1(w, T0);
  // おなかを空にして在庫も0＝最悪条件にしても、離れている間は減らない
  const st = w.Engine.getState();
  st.current.hunger = 0; st.current.sanpo = 0; st.current.health = 100; st.foodStock = 0;
  // 何度 長期不在しても いのちは減らない（デスタイマーは前面でのみ進むため）
  for (let d = 1; d <= 10; d++) {
    const rep = w.Engine.applyOffline(T0 + d * 72 * H);
    assert.strictEqual(rep.died, false, `${d}回目でも死なない`);
    assert.strictEqual(rep.ranAway, false, `${d}回目でも家出しない`);
    assert.ok(!w.Engine.isGone());
  }
  assert.strictEqual(w.Engine.getState().current.health, 100, '留守の間に減っていない');
});

test('24時間の放置では自動給餌が効いて元気なまま', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  toStage1(w, T0);
  const rep = w.Engine.applyOffline(T0 + 24 * H);
  assert.strictEqual(rep.died, false);
  const h = w.Engine.getState().current.health;
  assert.ok(h > 50, `health=${h}`);
  // ストックは消費と微獲得で増減している
  assert.ok(w.Engine.getState().foodStock < 6 + 3);
});

test('おくるみ（stage0）は死なない', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  const rep = w.Engine.applyOffline(T0 + 72 * H);
  assert.strictEqual(rep.died, false);
  assert.strictEqual(w.Engine.getState().current.health, 100);
});

test('ごはんが足りていても さんぽ（いい時間）をサボると約10日で家出', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  toStage1(w, T0);
  let t = T0;
  let gone = false;
  let days = 0;
  for (let d = 0; d < 14 && !gone; d++) { // 毎日えさだけ補充して、さんぽはしない
    t += 24 * H;
    w.Engine.tick(t);
    gone = w.Engine.isGone();
    days = d + 1;
    if (!gone) { w.Engine.buyFood(t); w.Engine.buyFood(t); w.Engine.buyFood(t); }
  }
  assert.ok(gone, 'さんぽなしで居なくなるはず');
  assert.ok(days >= 9 && days <= 11, `リミットは約10日: ${days}日`);
  assert.ok(w.Engine.isAway(), '結末は家出（死ではない）');
  assert.ok(!w.Engine.isDead());
  // 家出の見送り → runaways が増える
  const r = w.Engine.farewell(t, rnd0);
  assert.strictEqual(r.cause, 'away');
  assert.strictEqual(w.Engine.getState().runaways, 1);
  assert.strictEqual(w.Engine.getState().deaths, 0);
  assert.ok(!w.Engine.isGone());
});

test('さんぽ課題（失敗なし）でゲージが回復し、家出タイマーがリセットされる', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  toStage1(w, T0);
  let t = T0 + 96 * H; // 4日放置でゲージを減らす
  w.Engine.tick(t);
  const before = w.Engine.getState().current.sanpo;
  assert.ok(before < 60);
  assert.ok(w.Engine.startTask('どくしょ', 30, t));
  // 途中で開いても失敗しない
  const mid = w.Engine.checkTask(t + 10 * MIN);
  assert.strictEqual(mid.result, 'ongoing');
  const done = w.Engine.checkTask(t + 31 * MIN);
  assert.strictEqual(done.result, 'done');
  assert.strictEqual(done.gain, 50);
  assert.ok(w.Engine.getState().current.sanpo > before + 40);
});

test('さんぽ課題でも餌がもらえる＋継続日数が伸びる/リセットする', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  const DAY = 24 * H;
  const base = Math.floor(T0 / DAY) * DAY; // UTC日の境界にそろえる（同日判定を安定させる）
  const f0 = w.Engine.getState().foodStock;
  // 1日目
  w.Engine.startTask('ほんよみ', 60, base);
  const d1 = w.Engine.checkTask(base + 61 * MIN);
  assert.strictEqual(d1.foods, 2, '60分=餌2');
  assert.strictEqual(d1.days, 1);
  assert.ok(w.Engine.getState().foodStock > f0, 'さんぽで えさが増える');
  // 同じ日の2回目は継続日数 据え置き
  w.Engine.startTask('えいご', 30, base + 2 * H);
  const d1b = w.Engine.checkTask(base + 2 * H + 31 * MIN);
  assert.strictEqual(d1b.days, 1, '同じ日は据え置き');
  assert.strictEqual(d1b.foods, 1, '30分=餌1');
  // 翌日 → 継続日数 +1
  const d2 = (w.Engine.startTask('うんどう', 30, base + DAY), w.Engine.checkTask(base + DAY + 31 * MIN));
  assert.strictEqual(d2.days, 2, '連続した日で+1');
  // 2日あけると継続リセット
  const d3 = (w.Engine.startTask('ダイエット', 30, base + 4 * DAY), w.Engine.checkTask(base + 4 * DAY + 31 * MIN));
  assert.strictEqual(d3.days, 1, '間があくとリセット');
  const ts = w.Engine.taskStats();
  assert.strictEqual(ts.bestDays, 2);
  assert.strictEqual(ts.success, 4);
  assert.strictEqual(ts.byKind['ほんよみ'], 60);
  assert.strictEqual(ts.byKind['ダイエット'], 30);
  assert.ok(w.Engine.taskScore() > 0);
});

test('おさんぽ報酬: きせかえが手に入る（所持に追加・装備はUIで確認）', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  // rnd=0 → ドロップ判定ヒット＆pool[0] を取得
  w.Engine.startTask('ほんよみ', 30, T0);
  const done = w.Engine.checkTask(T0 + 31 * MIN, () => 0);
  assert.ok(done.wear, 'きせかえをドロップ');
  const ward = w.Engine.wardrobe();
  assert.ok(ward.owned[done.wear], '所持に追加される');
  assert.strictEqual(ward.equipped, null, '自動装備はしない（UIで聞く）');
  w.Engine.equipWear(done.wear, T0); // UIで「着る」を選んだ相当
  assert.strictEqual(w.Engine.wardrobe().equipped, done.wear, '選べば着られる');
  // rnd=0.99 → ドロップなし
  w.Engine.startTask('えいご', 30, T0 + 2 * 60 * MIN);
  const d2 = w.Engine.checkTask(T0 + 2 * 60 * MIN + 31 * MIN, () => 0.99);
  assert.strictEqual(d2.wear, null, '確率に外れたら出ない');
  // 脱ぐ／着替える
  w.Engine.equipWear(null, T0);
  assert.strictEqual(w.Engine.wardrobe().equipped, null);
});

test('維持シナリオ: 毎日30分のごはんさがし＋2日に1回のさんぽ課題で10日間元気', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  toStage1(w, T0);
  let t = T0;
  for (let d = 0; d < 10; d++) {
    t += 22 * H;
    w.Engine.applyOffline(t);             // 22hはスマホを離れている＝いのちは減らない（むしろ安全）
    w.Engine.startWalk(30, t);            // ごはんさがし（えさ+2）
    w.Engine.checkWalk(t + 30 * MIN, true);
    t += 30 * MIN;
    if (d % 2 === 0) {
      w.Engine.startTask('えいご', 30, t); // さんぽ課題
      w.Engine.checkTask(t + 31 * MIN);
      t += 31 * MIN;
    }
    t += 90 * MIN;
    w.Engine.applyOffline(t);
  }
  assert.ok(!w.Engine.isGone(), '世話していれば居なくならない');
  const st = w.Engine.getState();
  assert.ok(st.current.health > 80, `いのち: ${st.current.health}`);
  assert.ok(st.current.sanpo > 30, `さんぽゲージ: ${st.current.sanpo}`);
  assert.ok(st.foodStock > 1, `えさ: ${st.foodStock}`);
});

test('ごはんさがし（ふせセッション）成功でえさを持ちかえる（30分=2・2h=8）', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  const s0 = w.Engine.getState().foodStock;
  w.Engine.startWalk(30, T0);
  const r1 = w.Engine.checkWalk(T0 + 30 * MIN, true);
  assert.strictEqual(r1.foods, 2);
  assert.ok(w.Engine.getState().foodStock >= s0 + 2);
  w.Engine.startWalk(120, T0 + H);
  const r2 = w.Engine.checkWalk(T0 + 3 * H, true);
  assert.strictEqual(r2.foods, 8);
});

test('衰弱からの回復（前面で衰弱→えさ補充で いのち が戻る）', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  toStage1(w, T0);
  // 前面（スマホ稼働中）で 在庫切れ＋空腹を放置 → デスタイマーで衰弱
  const st = w.Engine.getState();
  st.current.hunger = 0; st.current.health = 100; st.foodStock = 0;
  w.Engine.tick(T0 + 12 * H);
  const low = w.Engine.getState().current.health;
  assert.ok(low < 100 && low > 0, `衰弱している: ${low}`);
  let t = T0 + 12 * H;
  for (let i = 0; i < 5; i++) w.Engine.buyFood(t); // えさを補充
  w.Engine.feed(t); // てであげる
  t += 24 * H;
  w.Engine.tick(t); // 満腹で1日 → 回復
  const now2 = w.Engine.getState().current.health;
  assert.ok(now2 > low, `${low} -> ${now2}`);
});

test('離れている間: 報酬(コイン)は24h上限・生存(さんぽ)は減らない', () => {
  const a = freshWorld(); a.Engine.newGame('dog', T0, rnd0);
  const b = freshWorld(); b.Engine.newGame('dog', T0, rnd0);
  a.Engine.applyOffline(T0 + 24 * H);
  b.Engine.applyOffline(T0 + 72 * H);
  // 報酬（コイン）は24hで頭打ち＝同じ
  assert.strictEqual(Math.floor(a.Engine.getState().coin), Math.floor(b.Engine.getState().coin));
  // 離れている間は さんぽゲージが減らない（どちらも満タンのまま）
  assert.strictEqual(a.Engine.getState().current.sanpo, 100);
  assert.strictEqual(b.Engine.getState().current.sanpo, 100);
});

test('前面(tick)では デスタイマーが進む（おなかが減る）', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  toStage1(w, T0);
  const h0 = w.Engine.getState().current.hunger;
  w.Engine.tick(T0 + 3 * H); // スマホ稼働中3時間
  assert.ok(w.Engine.getState().current.hunger < h0, '前面では おなかが減る');
});

test('farewell で deaths が増え、あたらしい子（健康）が来る', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  toStage1(w, T0);
  // 前面で 在庫切れ＋空腹を放置 → デスタイマーで餓死（離れている間は死なないので tick で）
  const st = w.Engine.getState();
  st.current.hunger = 0; st.current.health = 100; st.foodStock = 0;
  w.Engine.tick(T0 + 30 * H); // いのち100→0（STARVE 100/24・約24hで尽きる）
  assert.ok(w.Engine.isDead());
  const r = w.Engine.farewell(T0 + 30 * H, rnd0);
  assert.ok(r && r.next);
  const s = w.Engine.getState();
  assert.strictEqual(s.deaths, 1);
  assert.strictEqual(s.current.health, 100);
  assert.ok(!w.Engine.isDead());
});

test('えさストック: てであげる消費・在庫切れ・コイン購入', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  assert.strictEqual(w.Engine.buyFood(T0).error, 'no_coin'); // 開始直後はコイン0
  w.Engine.tick(T0 + 4 * H); // おなかを減らしてから（放置でコインも貯まる）
  const h0 = w.Engine.getState().current.hunger;
  const r = w.Engine.feed(T0 + 4 * H);
  assert.ok(r && !r.error);
  assert.ok(w.Engine.getState().current.hunger > h0);
  // 使い切る（自動給餌の介入を避けるため即時連続で）
  let res;
  for (let i = 0; i < 10; i++) { res = w.Engine.feed(T0 + 4 * H + i); if (res && res.error) break; }
  assert.strictEqual(res.error, 'no_food');
  // 放置収入で購入できる
  const buy = w.Engine.buyFood(T0 + 4 * H);
  assert.ok(buy && !buy.error);
});

test('てであげると 自動給餌にない なかよし(xp)ボーナス', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  w.Engine.tick(T0 + 6 * H);
  const p0 = { ...w.Engine.getState().current };
  const r = w.Engine.feed(T0 + 6 * H);
  assert.ok(r && !r.error);
  const p1 = w.Engine.getState().current;
  assert.ok(p1.hunger > p0.hunger);
  assert.ok(p1.xp > p0.xp); // 手であげると なかよし(xp)が増える
  assert.strictEqual(p1.mood, undefined); // 機嫌は廃止
});

test('スマホを触らない時間で えさが少しずつ貯まる（passive 0.1/h）', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  // stage0は消費なし → 純粋に獲得だけ確認できる
  const s0 = w.Engine.getState().foodStock;
  w.Engine.applyOffline(T0 + 10 * H);
  const s1 = w.Engine.getState().foodStock;
  assert.ok(Math.abs(s1 - (s0 + 1)) < 0.05, `${s0} -> ${s1}（+1.0前後）`);
});

test('dangerForecast は空（離れている間は危険がない＝責めない・途切れる予告をしない）', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  toStage1(w, T0);
  // 留守中は いのちが減らない設計なので、危険予告は出さない（vm跨ぎのため length で判定）
  assert.strictEqual(w.Engine.dangerForecast(T0).length, 0);
});

// ---------------------------------------------------------------
console.log('# おみあい（ブリード）');

const rndHi = () => 0.99; // 突然変異を避け、常に「もう一方の親」を選ぶ決定論rnd

function adultWorld(breedId) {
  const storage = makeStorage();
  const save = {
    version: 7, premium: false, coin: 0, luck: 0,
    current: { breedId, xp: 800, hunger: 80, clean: 80, health: 100, sanpo: 100, runawayH: 0, away: false, careCount: 5, mix: undefined },
    dex: {}, lastSavedAt: T0, graduates: 0, deaths: 0, runaways: 0,
    foodStock: 6, task: null, walk: null,
    walkStats: { success: 0, fail: 0, streak: 0, best: 0, totalMin: 0 }, album: []
  };
  storage.setItem('inuneko_dex_save_v1', JSON.stringify(save));
  const w = freshWorld(storage);
  w.Engine.init();
  assert.strictEqual(w.Engine.stage(), 3, '成体になっている');
  return w;
}

test('mateCode は成体のみ・コードを発行する', () => {
  const w = freshWorld();
  w.Engine.newGame('dog', T0, rnd0);
  assert.strictEqual(w.Engine.mateCode(), null); // おくるみ(stage0)では不可
  const a = adultWorld('shiba');
  const code = a.Engine.mateCode();
  assert.ok(/^INU-/.test(code), code);
});

test('おみあいコードは encode→decode で往復する', () => {
  const a = adultWorld('shiba');
  const code = a.Engine.mateCode();
  const g = a.Engine.decodeMate(code);
  assert.ok(!g.error);
  const shiba = a.Breeds.get('shiba');
  assert.strictEqual(g.species, 'dog');
  assert.strictEqual(g.name, '柴犬');
  assert.strictEqual(g.nature, shiba.nature);
  assert.strictEqual(g.art.color, shiba.art.color);
  assert.strictEqual(g.art.color2, shiba.art.color2);
  assert.strictEqual(g.art.eye, shiba.art.eye);
  assert.strictEqual(g.art.ear, shiba.art.ear);
  assert.strictEqual(g.art.pattern, shiba.art.pattern);
  assert.strictEqual(g.art.tail, shiba.art.tail);
});

test('壊れたコードは checksum / format で弾く', () => {
  const a = adultWorld('mike' in {} ? 'mike' : 'kijitora');
  const code = a.Engine.mateCode();
  // 末尾チェックサム付近の1文字を別の英数字へ → checksum 不一致
  const bad = code.slice(0, -1) + (code.slice(-1) === 'Z' ? '0' : 'Z');
  const r = a.Engine.decodeMate(bad);
  assert.ok(r.error, '改変を検出する: ' + JSON.stringify(r));
  assert.ok(a.Engine.decodeMate('まったく無効').error);
  assert.ok(a.Engine.decodeMate('').error);
});

test('おみあいコードは メッセージ全文を貼っても抜き出せる', () => {
  const a = adultWorld('kijitora'); // ねこ
  const code = a.Engine.mateCode();
  const msg = 'うちの「サバトラ」と おみあいしない？🐾\nおみあいコード: ' + code + '\n#いぬねこ図鑑';
  const g = a.Engine.decodeMate(msg);
  assert.ok(!g.error, '全文からデコードできる: ' + JSON.stringify(g));
  assert.strictEqual(g.species, 'cat');
});

test('記号模様: コードで往復＋おみあいで親から遺伝する', () => {
  const a = adultWorld('shiba');
  a.Engine.getState().current.mark = 'star'; // テスト用に直接セット
  const g = a.Engine.decodeMate(a.Engine.mateCode());
  assert.strictEqual(g.mark, 'star', 'mateコードで模様が往復する');
  let fromParent = 0;
  for (let i = 0; i < 40; i++) {
    const w = adultWorld('corgi');
    w.Engine.getState().current.mark = 'heart';
    w.Engine.breedWith(g, T0, Math.random); // 相手=star / 自分=heart
    const m = w.Engine.markOf();
    if (m === 'star' || m === 'heart') fromParent++;
  }
  assert.ok(fromParent >= 30, `模様の大半が親由来 (${fromParent}/40)`); // 約94%期待
});

test('目スタイル: コードで往復＋おみあいで親から遺伝する', () => {
  const a = adultWorld('shiba');
  a.Engine.getState().current.eyeStyle = 'ojou';
  const g = a.Engine.decodeMate(a.Engine.mateCode());
  assert.strictEqual(g.eyeStyle, 'ojou', 'mateコードで目スタイルが往復する');
  let fromParent = 0;
  for (let i = 0; i < 40; i++) {
    const w = adultWorld('corgi');
    w.Engine.getState().current.eyeStyle = 'downer';
    w.Engine.breedWith(g, T0, Math.random); // 相手=ojou / 自分=downer
    const e = w.Engine.eyeStyleOf();
    if (e === 'ojou' || e === 'downer') fromParent++;
  }
  assert.ok(fromParent >= 30, `目の大半が親由来 (${fromParent}/40)`);
});

test('別の種とはおみあいできない（いぬ×ねこ不可）', () => {
  const dog = adultWorld('shiba');
  const cat = adultWorld('kijitora');
  const catGenome = cat.Engine.decodeMate(cat.Engine.mateCode());
  const r = dog.Engine.breedWith(catGenome, T0, rndHi);
  assert.strictEqual(r.error, 'species');
});

test('種類を確率継承: 異品種どうしでも 親Aの品種を継いだ純血の子（roll<0.25）', () => {
  const a = adultWorld('shiba');
  const corgi = adultWorld('corgi');
  const partner = a.Engine.decodeMate(corgi.Engine.mateCode());
  const r = a.Engine.breedWith(partner, T0, () => 0.0); // 先頭rnd<0.25 → 親A（柴）の種類
  assert.ok(!r.error);
  assert.strictEqual(r.isMix, false);
  assert.strictEqual(r.child.id, 'shiba');
  assert.strictEqual(r.inheritedBreed, '柴犬');
  const s = a.Engine.getState();
  assert.strictEqual(s.dex['shiba'].count, 1); // 親が巣立って登録
  assert.strictEqual(s.current.mix, undefined);
  eqJSON(s.album, []);
});

test('種類を確率継承: 親Bの品種を継ぐ（0.25≤roll<0.50）', () => {
  const a = adultWorld('shiba');
  const corgi = adultWorld('corgi');
  const partner = a.Engine.decodeMate(corgi.Engine.mateCode());
  const r = a.Engine.breedWith(partner, T0, () => 0.4); // 0.25≤0.4<0.50 → 親B（コーギー）の種類
  assert.strictEqual(r.isMix, false);
  assert.strictEqual(r.child.id, 'corgi');
  assert.strictEqual(r.inheritedBreed, 'コーギー');
});

test('ミックスの子（roll≥0.50）: 色・模様を継承しアルバムに記録', () => {
  const a = adultWorld('shiba');
  const corgi = adultWorld('corgi');
  const partner = a.Engine.decodeMate(corgi.Engine.mateCode());
  const r = a.Engine.breedWith(partner, T0, () => 0.9); // ミックス
  assert.ok(!r.error);
  assert.strictEqual(r.isMix, true);
  assert.strictEqual(r.child.species, 'dog');
  eqJSON(r.parents, ['柴犬', 'コーギー']);
  const s = a.Engine.getState();
  assert.ok(s.current.mix, '子はミックスのおくるみ');
  assert.strictEqual(s.album.length, 1);
  eqJSON(s.album[0].parents, ['柴犬', 'コーギー']);
  const b = a.Engine.breed();
  assert.ok(b.mix && b.art && b.art.color); // 継承した見た目を持つ
});

test('ミックスは成長+20%（雑種強勢）', () => {
  const mixW = adultWorld('shiba');
  const corgi = adultWorld('corgi');
  mixW.Engine.breedWith(mixW.Engine.decodeMate(corgi.Engine.mateCode()), T0, () => 0.9); // ミックス
  const pureW = adultWorld('shiba');
  pureW.Engine.breedWith(pureW.Engine.decodeMate(pureW.Engine.mateCode()), T0, () => 0.0); // 純血（柴）
  // 同じおくるみ(xp0)から同時間進めて、ミックスの方が育つ
  mixW.Engine.applyOffline(T0 + 6 * H);
  pureW.Engine.applyOffline(T0 + 6 * H);
  assert.ok(mixW.Engine.getState().current.xp > pureW.Engine.getState().current.xp,
    `mix ${mixW.Engine.getState().current.xp} > pure ${pureW.Engine.getState().current.xp}`);
});

// ---------------------------------------------------------------
console.log('');
if (failed.length) {
  console.error(`FAILED: ${failed.length} / ${passed + failed.length}`);
  process.exit(1);
}
console.log(`all ${passed} tests passed`);
