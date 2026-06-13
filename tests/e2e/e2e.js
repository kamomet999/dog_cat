/**
 * E2Eテスト — 実ブラウザ(Playwright)でユーザー操作をジャーニーごと通す。
 *
 *   npm run e2e          # 全テスト
 *   npm run e2e -- 巣立ち  # 名前の部分一致で絞り込み
 *
 * 方針:
 * - www/ を簡易HTTPで配信し、Date.now() を __t に固定して決定論化（エンジン規約と同じ）
 * - 時間経過は warp() で __t を進め、UIの1秒ループに拾わせる
 * - セーブは各テストごとに localStorage へ注入（未注入時のみ書く＝リロード永続化も検証可能）
 * - 検証は「画面に見えるもの」(モーダル/トースト/ラベル) ＋ Engine状態 の両面
 */
'use strict';
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../../');
const WWW = path.join(ROOT, 'www');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

const T0 = 1750000000000;
const H = 3600000, MIN = 60000;
const KEY = 'inuneko_dex_save_v1';
const TUT = 'inuneko_tutorial_done_v1';

function serve() {
  return http.createServer((req, res) => {
    const p = path.join(WWW, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]);
    try { res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'text/plain' }); res.end(fs.readFileSync(p)); }
    catch (e) { res.writeHead(404); res.end(); }
  });
}

function petBase(over) {
  return Object.assign({
    breedId: 'shiba', xp: 300, hunger: 64, clean: 60,
    health: 100, sanpo: 60, runawayH: 0, away: false, careCount: 12
  }, over || {});
}
function saveBase(over) {
  return Object.assign({
    version: 9, premium: false, coin: 180, luck: 0.05,
    current: petBase(),
    dex: { shiba: { count: 1, firstAt: T0 - 86400000, unseen: false } },
    lastSavedAt: T0, graduates: 1, deaths: 0, runaways: 0,
    foodStock: 6, task: null, walk: null,
    walkStats: { success: 5, fail: 1, streak: 2, best: 3, totalMin: 240 },
    album: []
  }, over || {});
}

let browser;
async function newPage(save, opts) {
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page._errors = [];
  page.on('pageerror', e => page._errors.push(e.message));
  await page.addInitScript(([s, t, key, tut, skipTut]) => {
    window.__t = t;
    Date.now = () => window.__t;
    // 未注入のときだけ書く（リロード後はアプリが保存した内容を保持＝永続化テスト可能）
    if (s && !localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(s));
    if (skipTut) localStorage.setItem(tut, '1');
  }, [save || null, opts.t0 || T0, KEY, TUT, opts.skipTutorial !== false]);
  await page.goto('http://localhost:8940/');
  await page.waitForSelector('#app');
  await page.waitForTimeout(600);
  return page;
}
async function warp(page, ms) {
  await page.evaluate(t => { window.__t += t; }, ms);
  await page.waitForTimeout(1300); // 1秒ループに拾わせる
}
async function engineState(page) { return page.evaluate(() => window.Engine.getState()); }
async function text(page, sel) {
  const el = await page.$(sel);
  return el ? (await el.textContent()) : null;
}
async function closePage(page) {
  const errs = page._errors;
  await page.context().close();
  if (errs.length) throw new Error('JSエラー: ' + errs.join(' / '));
}

const all = [];
function t(name, fn) { all.push({ name, fn }); }

// ---------------------------------------------------------------

t('初回フロー: intro→種選択→チュートリアル5歩→ホーム到達・セーブ生成', async () => {
  const page = await newPage(null, { skipTutorial: false });
  assert.ok(await page.$('#introGo'), 'イントロが出る');
  await page.click('#introGo');
  await page.waitForTimeout(300);
  assert.ok(await page.$('[data-sp="dog"]'), '種選択が出る');
  await page.click('[data-sp="dog"]');
  await page.waitForTimeout(700);
  for (let i = 0; i < 5; i++) {
    assert.ok(await page.$('#tutNext'), `チュートリアル${i + 1}枚目`);
    await page.click('#tutNext');
    await page.waitForTimeout(220);
  }
  assert.ok(!(await page.$('#tutNext')), 'チュートリアルが閉じた');
  const st = await engineState(page);
  assert.strictEqual(st.version, 11);
  assert.ok(st.current, 'ペットがいる');
  assert.strictEqual((await text(page, '#petName')).trim(), 'ねんねちゅう…');
  const tut = await page.evaluate(k => localStorage.getItem(k), TUT);
  assert.strictEqual(tut, '1', 'チュートリアル完了フラグ');
  await closePage(page);
});

t('タップ: 成長せずしぐさで反応（演出のみ）＋手でごはんはストック減', async () => {
  const page = await newPage(saveBase());
  const xp0 = (await engineState(page)).current.xp;
  await page.click('#petArt');
  await page.waitForTimeout(150);
  assert.strictEqual((await engineState(page)).current.xp, xp0, 'タップでは成長しない');
  const cls = await page.getAttribute('#petArt', 'class');
  assert.match(cls, /bounce|wiggle|hop|spin|shake|pop/, 'しぐさアニメが付く');
  await page.click('[data-act="feed"]');
  await page.waitForTimeout(350);
  const stock0 = (await engineState(page)).foodStock;
  await page.click('#handFeed');
  await page.waitForTimeout(400);
  const st = await engineState(page);
  assert.ok(st.foodStock < stock0, 'ストックが減る');
  assert.ok(st.current.hunger > 64, 'お腹が回復');
  assert.match(await text(page, '#toast'), /もぐもぐ/);
  await closePage(page);
});

t('ごはん探し成功: 30分満了→自慢の1枚モーダル→エサ+2', async () => {
  const page = await newPage(saveBase());
  const stock0 = (await engineState(page)).foodStock;
  await page.click('#walkBtn');
  await page.waitForTimeout(350);
  await page.click('[data-min="30"]');
  await page.waitForTimeout(400);
  assert.ok(await page.$('#walkCancel'), 'お留守番オーバーレイが出る');
  await warp(page, 31 * MIN);
  assert.ok(await page.$('#walkOk'), '成功モーダル');
  assert.match(await text(page, '.modal h2'), /スマホを置けた/);
  await page.click('#walkOk');
  await page.waitForTimeout(300);
  const st = await engineState(page);
  assert.ok(Math.abs(st.foodStock - (stock0 + 2)) < 0.1, `エサ+2 (${stock0}→${st.foodStock})`);
  assert.strictEqual(st.walkStats.success, 6);
  await closePage(page);
});

t('ごはん探しを諦める: 穏やかな失敗モーダル・streakリセット', async () => {
  const page = await newPage(saveBase());
  await page.click('#walkBtn');
  await page.waitForTimeout(350);
  await page.click('[data-min="30"]');
  await page.waitForTimeout(400);
  await page.click('#walkCancel');
  await page.waitForTimeout(400);
  assert.match(await text(page, '.modal h2'), /やめたよ/);
  await page.click('#walkNg');
  await page.waitForTimeout(250);
  const st = await engineState(page);
  assert.strictEqual(st.walkStats.streak, 0);
  assert.strictEqual(st.walk, null);
  await closePage(page);
});

t('お散歩(プリセット): ほんよみ30分→満了で散歩ゲージ回復', async () => {
  const page = await newPage(saveBase({ current: petBase({ sanpo: 30 }) }));
  await page.click('#taskBtn');
  await page.waitForTimeout(350);
  await page.click('[data-place="park"]');
  await page.click('[data-kind="ほんよみ"]');
  await page.click('[data-min="30"]');
  await page.waitForTimeout(200);
  await page.click('#sanpoStart');
  await page.waitForTimeout(400);
  assert.match(await text(page, '#taskRow'), /ほんよみで おさんぽ中/);
  await warp(page, 31 * MIN);
  const st = await engineState(page);
  assert.strictEqual(st.task, null, 'お散歩が終わる');
  assert.ok(st.current.sanpo > 60, `散歩ゲージ回復 (${st.current.sanpo})`);
  await closePage(page);
});

t('お散歩(カスタム): 「ピアノ」25分が通り、範囲外(200分)は弾く', async () => {
  const page = await newPage(saveBase());
  await page.click('#taskBtn');
  await page.waitForTimeout(350);
  await page.click('[data-place="river"]');
  await page.click('[data-kind="__custom"]');
  await page.fill('#customKind', 'ピアノ');
  await page.click('[data-min="__custom"]');
  await page.fill('#customMin', '200'); // 上限180を超える
  await page.waitForTimeout(200);
  assert.ok(await page.getAttribute('#sanpoStart', 'disabled') !== null, '範囲外は はじめる が無効');
  await page.fill('#customMin', '25');
  await page.waitForTimeout(200);
  await page.click('#sanpoStart');
  await page.waitForTimeout(400);
  const task = await page.evaluate(() => window.Engine.task());
  assert.strictEqual(task.kind, 'ピアノ');
  assert.strictEqual(task.minutes, 25);
  await closePage(page);
});

t('オフライン復帰: 26時間後に「おかえりなさい」・コイン獲得・自動給餌の報告', async () => {
  const page = await newPage(saveBase({ lastSavedAt: T0 - 26 * H, current: petBase({ hunger: 50 }) }));
  assert.match(await text(page, '.modal h2'), /おかえりなさい/);
  const body = await text(page, '.modal');
  assert.match(body, /コイン/);
  assert.match(body, /ごはんを \d+回 食べたよ/, '留守中の自動給餌が報告される');
  await page.click('#okBtn');
  await page.waitForTimeout(250);
  const st = await engineState(page);
  assert.ok(st.coin > 180, 'コインが増えている');
  await closePage(page);
});

t('おわかれ(おほしさま): 餓死→看取り→新しい子・deaths+1', async () => {
  const page = await newPage(saveBase({ current: petBase({ hunger: 0, health: 0 }), foodStock: 0 }));
  await page.waitForTimeout(800);
  assert.match(await text(page, '.modal h2'), /おほしさまに/);
  await page.click('#fwBtn');
  await page.waitForTimeout(400);
  const st = await engineState(page);
  assert.strictEqual(st.deaths, 1);
  assert.strictEqual(st.current.health, 100, '新しい子は健康');
  assert.match(await text(page, '#toast'), /赤ちゃんが やってきた/);
  await closePage(page);
});

t('家出(旅立ち): 散歩の怠り→旅に出ました・runaways+1', async () => {
  const page = await newPage(saveBase({ current: petBase({ sanpo: 0, runawayH: 80, away: true }) }));
  await page.waitForTimeout(800);
  assert.match(await text(page, '.modal h2'), /旅に出ました/);
  await page.click('#fwBtn');
  await page.waitForTimeout(400);
  assert.strictEqual((await engineState(page)).runaways, 1);
  await closePage(page);
});

t('図鑑と課金: 4種集めるとCTA→¥500解放→目標が全種に広がる', async () => {
  const page = await newPage(saveBase({
    dex: {
      shiba: { count: 1, firstAt: T0, unseen: false },
      golden: { count: 1, firstAt: T0, unseen: false },
      kijitora: { count: 1, firstAt: T0, unseen: false },
      calico: { count: 1, firstAt: T0, unseen: false }
    }
  }));
  const totalFree = await page.evaluate(() => window.Engine.dexProgress().total);
  await page.click('#dexBtn');
  await page.waitForTimeout(500);
  assert.ok(await page.$('#premBtn'), '3種以上でプレミアムCTAが出る');
  await page.evaluate(() => document.querySelector('#premBtn').click());
  await page.waitForTimeout(400);
  await page.click('#buyPrem');
  await page.waitForTimeout(400);
  assert.ok(await page.evaluate(() => window.Engine.isPremium()), '解放された');
  const totalAll = await page.evaluate(() => window.Engine.dexProgress().total);
  assert.ok(totalAll > totalFree, `図鑑の目標が広がる (${totalFree}→${totalAll})`);
  await closePage(page);
});

t('図鑑と課金: 3種未満ではCTAも¥500も見えない', async () => {
  const page = await newPage(saveBase()); // 1種のみ
  await page.click('#dexBtn');
  await page.waitForTimeout(500);
  assert.ok(!(await page.$('#premBtn')), '課金導線が出ない');
  assert.ok(!/¥500/.test(await text(page, '.modal')), '¥500の文字も出ない');
  await closePage(page);
});

t('おとな→チョイス→おみあい: 種類を継いだ子・親は図鑑へ', async () => {
  const page = await newPage(saveBase({ current: petBase({ xp: 800 }) })); // 成体
  // 種類継承は確率。roll<0.40 で親A(柴)の種類を継ぐよう固定
  await page.evaluate(() => { window.Math.random = () => 0.1; });
  const code = await page.evaluate(() => window.Engine.mateCode());
  assert.match(code, /^INU-/);
  // おとな → チョイス画面 → 「子供を産ませる」
  await page.click('#actBtn');
  await page.waitForTimeout(300);
  assert.ok(await page.$('#gcMate'), 'おとなチョイスが出る');
  await page.click('#gcMate');
  await page.waitForTimeout(300);
  await page.click('#mateInput');
  await page.waitForTimeout(300);
  await page.fill('#codeIn', code);
  await page.waitForTimeout(300);
  assert.match(await text(page, '#codePrev'), /柴犬.*おみあいできる/);
  await page.click('#doMate');
  await page.waitForTimeout(500);
  assert.match(await text(page, '.modal'), /柴犬 と 柴犬 の子/);
  await page.click('#mrOk');
  await page.waitForTimeout(300);
  const st = await engineState(page);
  assert.strictEqual(st.dex.shiba.count, 2, '親が巣立って図鑑+1');
  assert.strictEqual(st.album.length, 0, '種類継承（純血）はアルバム外');
  assert.ok(!st.current.mix, '子は純血');
  await closePage(page);
});

t('おみあい: 異品種コードでミックス誕生→アルバム記録', async () => {
  const page = await newPage(saveBase({ current: petBase({ xp: 800 }) }));
  await page.evaluate(() => { window.Math.random = () => 0.9; }); // roll≥0.80 → ミックス固定
  // コーギーの成体コードを同一ページ内の別計算で生成（決定論）
  const code = await page.evaluate(() => {
    const real = window.Engine.getState();
    window.Engine._state = { ...real, current: { ...real.current, breedId: 'corgi' } };
    const c = window.Engine.mateCode();
    window.Engine._state = real;
    return c;
  });
  await page.click('#actBtn');
  await page.waitForTimeout(300);
  await page.click('#gcMate');
  await page.waitForTimeout(300);
  await page.click('#mateInput');
  await page.waitForTimeout(300);
  await page.fill('#codeIn', code);
  await page.waitForTimeout(300);
  await page.click('#doMate');
  await page.waitForTimeout(500);
  await page.click('#mrOk');
  await page.waitForTimeout(300);
  const st = await engineState(page);
  assert.strictEqual(st.album.length, 1, 'アルバムに記録');
  assert.ok(st.current.mix, '子はミックス');
  // 図鑑にアルバム欄が出る
  await page.click('#dexBtn');
  await page.waitForTimeout(500);
  assert.match(await text(page, '.modal'), /おみあいアルバム/);
  await closePage(page);
});

t('おみあい: 猫コードは犬と不成立（プレビューで弾く）', async () => {
  const page = await newPage(saveBase({ current: petBase({ xp: 800 }) }));
  const code = await page.evaluate(() => {
    const real = window.Engine.getState();
    window.Engine._state = { ...real, current: { ...real.current, breedId: 'kijitora' } };
    const c = window.Engine.mateCode();
    window.Engine._state = real;
    return c;
  });
  await page.click('#actBtn');
  await page.waitForTimeout(300);
  await page.click('#gcMate');
  await page.waitForTimeout(300);
  await page.click('#mateInput');
  await page.waitForTimeout(300);
  await page.fill('#codeIn', code);
  await page.waitForTimeout(300);
  assert.match(await text(page, '#codePrev'), /同じ動物どうし/);
  assert.ok(await page.getAttribute('#doMate', 'disabled') !== null, 'ボタン無効');
  await closePage(page);
});

t('巣立ち: おとな→チョイス→新しい子をもらう→図鑑登録・次の子が来る', async () => {
  const page = await newPage(saveBase({ current: petBase({ xp: 800 }), dex: {} }));
  assert.match(await text(page, '#actBtn'), /おとなに なった/);
  await page.click('#actBtn');
  await page.waitForTimeout(300);
  assert.ok(await page.$('#gcGrad'), 'おとなチョイスに巣立ち選択');
  await page.click('#gcGrad'); // 新しい子をもらう（巣立ち）
  await page.waitForTimeout(500);
  assert.match(await text(page, '.modal'), /巣立ったよ/);
  await page.click('#nextEgg');
  await page.waitForTimeout(400);
  const st = await engineState(page);
  assert.strictEqual(st.graduates, 2);
  assert.ok(st.dex.shiba, '柴犬が図鑑に登録');
  assert.match(await text(page, '#petName'), /ねんねちゅう/);
  await closePage(page);
});

t('成長: 赤ちゃんは保護され、時間がたつと目を覚ます(stage0→1)', async () => {
  const page = await newPage(saveBase({ current: petBase({ xp: 0 }) }));
  assert.match(await text(page, '#petName'), /ねんねちゅう/);
  assert.match(await text(page, '#growStage'), /めざめまで/);
  // タップでは育たない → 時間経過（放置xp）で目を覚ます
  await page.click('#petArt'); await page.waitForTimeout(150);
  assert.match(await text(page, '#petName'), /ねんねちゅう/, 'タップしても寝たまま');
  await warp(page, 3 * H);
  assert.match(await text(page, '#petName'), /柴犬/, '時間で目を覚まして品種名が出る');
  await closePage(page);
});

t('部屋の模様替え: 無料の飾りをはめ込む→シーンに反映。プレミアム飾りは課金導線', async () => {
  const page = await newPage(saveBase());
  await page.click('#roomBtn');
  await page.waitForTimeout(400);
  await page.click('.room-cell[data-item="w_pic"]'); // 無料の壁飾り
  await page.waitForTimeout(250);
  assert.strictEqual((await engineState(page)).room.wall, 'w_pic', '壁にはめ込まれた');
  await page.click('.room-cell[data-item="bg_sky"]'); // 無料の背景
  await page.waitForTimeout(250);
  assert.strictEqual((await engineState(page)).room.bg, 'bg_sky');
  await page.click('.room-cell[data-item="w_clock"]'); // プレミアム品（ロック）
  await page.waitForTimeout(350);
  assert.ok(await page.$('#buyPrem'), 'ロック品タップで課金モーダルへ');
  assert.notStrictEqual((await engineState(page)).room.wall, 'w_clock', '未解放品は装備されない');
  await page.click('.modal-close');
  await page.waitForTimeout(250);
  assert.match(await text(page, '#rsWall'), /🖼️/, 'シーンに反映');
  await closePage(page);
});

t('部屋(課金後): プレミアム飾りもはめ込める', async () => {
  const page = await newPage(saveBase({ premium: true }));
  await page.click('#roomBtn');
  await page.waitForTimeout(400);
  await page.click('.room-cell[data-item="w_clock"]');
  await page.waitForTimeout(250);
  assert.strictEqual((await engineState(page)).room.wall, 'w_clock', '課金済みなら装備できる');
  await closePage(page);
});

t('永続化: 操作→リロードしても状態が残る', async () => {
  const page = await newPage(saveBase());
  await page.click('[data-act="feed"]');
  await page.waitForTimeout(350);
  await page.click('#handFeed');
  await page.waitForTimeout(400);
  const before = await engineState(page);
  await page.reload();
  await page.waitForSelector('#app');
  await page.waitForTimeout(700);
  const after = await engineState(page);
  assert.strictEqual(Math.floor(after.foodStock), Math.floor(before.foodStock), 'ストックが保持');
  assert.strictEqual(after.current.breedId, before.current.breedId);
  assert.strictEqual(after.version, 11);
  await closePage(page);
});

t('おみあい: いぬ×ねこは「おみあいできません」／ いぬ×いぬはOK', async () => {
  // ねこ(キジトラ)成体の おみあいコードを用意
  const catPage = await newPage(saveBase({ current: petBase({ breedId: 'kijitora', xp: 800 }) }));
  const catCode = await catPage.evaluate(() => window.Engine.mateCode());
  await closePage(catPage);
  assert.match(catCode, /^NEK-/, 'ねこコードは NEK-');
  // いぬ(柴)成体で おみあい入力画面へ
  const page = await newPage(saveBase({ current: petBase({ xp: 800 }) }));
  const dogCode = await page.evaluate(() => window.Engine.mateCode());
  assert.match(dogCode, /^INU-/, 'いぬコードは INU-');
  await page.click('#actBtn'); await page.waitForTimeout(200);
  await page.click('#gcMate'); await page.waitForTimeout(200);
  await page.click('#mateInput'); await page.waitForTimeout(200);
  // 猫コード → 「おみあいできません」＋ボタン無効
  await page.fill('#codeIn', catCode); await page.waitForTimeout(150);
  assert.match(await text(page, '#codePrev'), /おみあいできません/);
  assert.ok(await page.getAttribute('#doMate', 'disabled') !== null, 'いぬ×ねこは ボタン無効');
  // 犬コード → OK＋ボタン有効
  await page.fill('#codeIn', dogCode); await page.waitForTimeout(150);
  assert.match(await text(page, '#codePrev'), /おみあいできるよ/);
  assert.ok(await page.getAttribute('#doMate', 'disabled') === null, 'いぬ×いぬは ボタン有効');
  await closePage(page);
});

t('設定: 累計ログ表示・チュートリアル再表示・データリセットは2タップ確認', async () => {
  const page = await newPage(saveBase());
  await page.click('#settingsBtn');
  await page.waitForTimeout(400);
  const body = await text(page, '.modal');
  assert.match(body, /おすわり/);
  assert.match(body, /ダッシュボード/);
  assert.ok(await page.$('#tutAgain'), 'あそびかた再表示ボタン');
  // リセットは1タップ目で確認文言に変わるだけ（誤操作防止）
  await page.click('#resetBtn');
  await page.waitForTimeout(200);
  assert.match(await text(page, '#resetBtn'), /もう一度タップ/);
  assert.ok(await engineState(page), 'まだ消えていない');
  await closePage(page);
});

t('旧セーブ(v1)読み込み: 最新v11へ移行して起動できる', async () => {
  const v1 = {
    version: 1, coin: 42, luck: 0.1,
    current: { breedId: 'shiba', xp: 30, hunger: 50, mood: 50, clean: 50, energy: 50, careCount: 3 },
    dex: { shiba: { count: 1, firstAt: T0, unseen: false } },
    lastSavedAt: T0, graduates: 1
  };
  const page = await newPage(v1);
  // 復帰モーダルが出ることがあるので閉じる
  const ok = await page.$('#okBtn');
  if (ok) { await ok.click(); await page.waitForTimeout(300); }
  const st = await engineState(page);
  assert.strictEqual(st.version, 11);
  assert.strictEqual(st.current.mood, undefined, 'moodは消える');
  assert.ok(st.current.sanpo != null && st.current.health != null);
  await closePage(page);
});

// ---------------------------------------------------------------

(async () => {
  const filter = process.argv.slice(2).join(' ');
  const list = filter ? all.filter(x => x.name.includes(filter)) : all;
  if (!list.length) { console.error('該当テストなし:', filter); process.exit(1); }

  const srv = serve();
  await new Promise(r => srv.listen(8940, r));
  browser = await chromium.launch();

  let pass = 0; const fails = [];
  for (const { name, fn } of list) {
    const t0 = Date.now();
    try {
      await fn();
      pass++;
      console.log(`  ok - ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    } catch (e) {
      fails.push(name);
      console.error(`  NG - ${name}\n      ${e.message}`);
    }
  }
  await browser.close();
  srv.close();
  console.log('');
  if (fails.length) { console.error(`E2E FAILED: ${fails.length} / ${list.length}`); process.exit(1); }
  console.log(`E2E all ${pass} passed`);
  process.exit(0);
})().catch(e => { console.error('RUNNER FAILED:', e); process.exit(1); });
