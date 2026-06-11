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
  const ears = ['prick', 'flop', 'round', 'fold'];
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

test('全品種が抽選で出現しうる（重み>0）', () => {
  const w = freshWorld();
  const seen = new Set();
  // [0,1) を細かく走査して全品種に到達できることを確認
  for (let i = 0; i < 5000; i++) {
    seen.add(w.Breeds.roll(() => i / 5000, 0).id);
  }
  assert.strictEqual(seen.size, w.Breeds.ALL.length);
});

console.log('# 新規ゲームとセーブ');

test('newGame で v2 の初期状態ができる', () => {
  const w = freshWorld();
  const s = w.Engine.newGame('dog', T0, rnd0);
  assert.strictEqual(s.version, 2);
  assert.ok(s.current);
  assert.strictEqual(s.walk, null);
  eqJSON(s.walkStats, { success: 0, fail: 0, streak: 0, best: 0, totalMin: 0 });
});

test('セーブ→ロードで状態が一致する', () => {
  const storage = makeStorage();
  const w1 = freshWorld(storage);
  const s1 = w1.Engine.newGame('cat', T0, rnd0);
  const w2 = freshWorld(storage);
  const s2 = w2.Engine.init();
  eqJSON(s2, s1);
});

test('v1セーブが v2 にマイグレーションされる', () => {
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
  assert.strictEqual(s.version, 2);
  assert.strictEqual(s.coin, 42);
  assert.strictEqual(s.walk, null);
  assert.strictEqual(s.walkStats.success, 0);
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

// ---------------------------------------------------------------
console.log('');
if (failed.length) {
  console.error(`FAILED: ${failed.length} / ${passed + failed.length}`);
  process.exit(1);
}
console.log(`all ${passed} tests passed`);
