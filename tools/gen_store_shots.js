/**
 * ストア掲載用スクリーンショット生成（docs/store/listing.md §スクリーンショット構成案 が正）。
 *
 *   npm run store:shots            # 全部生成
 *   npm run store:shots -- home    # 名前で絞り込み
 *
 * 実アプリを Playwright で描画し、上部にキャプション帯を重ねて
 *   docs/store/shots/android/*.png  (1080x1920)
 *   docs/store/shots/ios/*.png      (1290x2796)
 *   docs/store/shots/feature-graphic.png (1024x500・Google Play)
 * に書き出す。tests/visual/snapshot.js と同じ配信・時刻固定方式。
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const WWW = path.join(ROOT, 'www');
const OUT = path.join(ROOT, 'docs/store/shots');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const T0 = 1751850000000; // 固定時刻（決定論）

// ---- 撮影に使うセーブ（見栄え重視の健康な状態） ----
function pet(over) {
  // 成体（xp>=760）で撮る: 絵が原寸で最大になり「ペットの顔が画面の1/3以上」(DESIGN.md §10)を満たす。
  // 子ども以下は成長段階で縮小表示されるため、ヒーローカットには使わない。
  return Object.assign({
    breedId: 'shiba', xp: 900, hunger: 86, clean: 90,
    health: 100, sanpo: 82, runawayH: 0, away: false, careCount: 12,
    mark: 'none', eyeStyle: 'batchiri'
  }, over || {});
}
function save(over) {
  return Object.assign({
    version: 19, premium: false, coin: 320, points: 860, luck: 0.1, // pointsは最初のマイルストーン(1000)未満＝達成モーダルが写り込まない
    current: pet(),
    dex: {
      shiba:  { count: 2, firstAt: T0 - 86400000 * 9, unseen: false },
      golden: { count: 1, firstAt: T0 - 86400000 * 7, unseen: false },
      pug:    { count: 1, firstAt: T0 - 86400000 * 5, unseen: false },
      kijitora: { count: 1, firstAt: T0 - 86400000 * 4, unseen: false },
      calico:   { count: 1, firstAt: T0 - 86400000 * 2, unseen: false },
      scottish: { count: 1, firstAt: T0 - 86400000, unseen: false }
    },
    lastSavedAt: T0, graduates: 6, deaths: 0, runaways: 0,
    foodStock: 12, task: null, walk: null,
    walkStats: { success: 18, fail: 1, streak: 6, best: 9, totalMin: 1240 },
    taskStats: { success: 14, days: 6, bestDays: 6, lastDay: Math.floor(T0 / 86400000), totalMin: 320, byKind: { 'ほんよみ': 180, 'うんどう': 140 } },
    allowApps: [], reminders: { enabled: false, times: [] },
    wardrobe: { owned: {}, items: [] }, room: { bg: 'cream', items: [] }
  }, over || {});
}

// ---- 5枚構成（listing.md: Value → Usage → Trust）＋予備1枚 ----
const SHOTS = [
  {
    name: '1-home', copy: 'スマホを置くと、育つ。', sub: '見ない時間が、この子の ごはんになる',
    save: save(), steps: [{ wait: 900 }]
  },
  {
    name: '2-osuwari', copy: 'スマホを置いた時間が<br>ごはんになる', sub: '🍖 おすわり ＝ 長いほど たくさん',
    save: save({ walk: { startedAt: T0 - 5000, endsAt: T0 + 25 * 60000, minutes: 30 } }),
    steps: [{ wait: 1600 }]
  },
  {
    name: '3-dex', copy: '犬猫30種の図鑑を<br>あつめよう', sub: 'レアな子との 出会いも',
    save: save(), steps: [{ click: '#dexBtn' }, { wait: 700 }]
  },
  {
    name: '4-kisekae', copy: 'その子だけの おしゃれ', sub: 'おさんぽの ごほうびで あつまる',
    save: save({
      wardrobe: { owned: { ribbon: 1, straw: 1, scarf: 1, flower: 1 }, items: [{ id: 'straw', x: 0.5, y: 0.16 }, { id: 'scarf', x: 0.5, y: 0.58 }] },
      room: { bg: 'sakura', items: [{ id: 'l_plant', x: 0.14, y: 0.62 }, { id: 'r_bear', x: 0.86, y: 0.66 }] }
    }),
    steps: [{ wait: 900 }]
  },
  {
    name: '5-trust', copy: '広告ゼロ・登録不要<br>課金なし', sub: 'スマホを離れている間、この子は いなくなりません',
    save: save(), steps: [
      { click: '#dexBtn' }, { wait: 700 },
      { eval: "document.querySelector('.modal').scrollTop = 99999" }, { wait: 400 }
    ]
  },
  {
    // 予備（6枚目候補）。お散歩の景色画面
    name: '6-osanpo', copy: '勉強・運動の間、となりに', sub: '🐾 お散歩 ＝ 失敗のない じぶん時間',
    save: save({ task: { startedAt: T0 - 60000, endsAt: T0 + 29 * 60000, minutes: 30, kind: 'ほんよみ', place: 'river' } }),
    steps: [{ wait: 900 }, { click: '#taskBtn' }, { wait: 900 }]
  }
];

// 端末別の出力（キャプション帯は CSS px で共通デザイン）
const TARGETS = [
  { dir: 'android', width: 432, height: 768, dsf: 2.5 },  // 1080x1920
  { dir: 'ios', width: 430, height: 932, dsf: 3 }         // 1290x2796（6.7"）
];

// アプリ画面の上にキャプション帯を重ねる（ブランド: DESIGN.md §2 のトークン準拠）
function captionCss() {
  return `
  #storeCap { position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
    background: linear-gradient(180deg, #fdf6ec 78%, rgba(253,246,236,0)); padding: 26px 20px 34px; text-align: center;
    font-family: 'Hiragino Maru Gothic ProN', 'BIZ UDGothic', 'Noto Sans JP', sans-serif; }
  #storeCap .main { font-size: 29px; font-weight: 800; color: #4a3f35; letter-spacing: .02em; line-height: 1.3; }
  #storeCap .sub { font-size: 14px; font-weight: 700; color: #6f6354; margin-top: 6px; }`;
}

function serve() {
  return http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    const p = path.join(WWW, url === '/' ? 'index.html' : url);
    try {
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'text/plain' });
      res.end(fs.readFileSync(p));
    } catch (e) { res.writeHead(404); res.end(); }
  });
}

async function shoot(browser, target, sc) {
  const page = await browser.newPage({
    viewport: { width: target.width, height: target.height },
    deviceScaleFactor: target.dsf
  });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(([s, t]) => {
    window.__t = t;
    Date.now = () => window.__t;
    localStorage.setItem('inuneko_dex_save_v1', JSON.stringify(s));
    localStorage.setItem('inuneko_tutorial_done_v1', '1'); // コーチマークは映さない
  }, [sc.save, T0]);
  await page.goto('http://localhost:8921/');
  await page.waitForSelector('#app');
  await page.waitForTimeout(700);
  for (const step of (sc.steps || [])) {
    if (step.wait) await page.waitForTimeout(step.wait);
    if (step.click) { try { await page.click(step.click, { timeout: 2000 }); } catch (e) { console.warn('  click skip:', step.click); } }
    if (step.eval) await page.evaluate(step.eval);
  }
  await page.evaluate(([css, copy, sub]) => {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const d = document.createElement('div'); d.id = 'storeCap';
    d.innerHTML = '<div class="main">' + copy + '</div>' + (sub ? '<div class="sub">' + sub + '</div>' : '');
    document.body.appendChild(d);
  }, [captionCss(), sc.copy, sc.sub || '']);
  await page.waitForTimeout(250);
  const file = path.join(OUT, target.dir, sc.name + '.png');
  await page.screenshot({ path: file });
  console.log((errs.length ? '✗' : '✓') + ' ' + path.relative(ROOT, file) + (errs.length ? '  ERRORS: ' + errs.join('; ') : ''));
  await page.close();
  return errs.length;
}

// Google Play フィーチャーグラフィック（1024x500）: ペット顔＋1メッセージ（DESIGN.md §10）
async function featureGraphic(browser) {
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
  const html = `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;width:1024px;height:500px;overflow:hidden}
    body{display:flex;align-items:center;justify-content:center;gap:48px;
      background:linear-gradient(135deg,#fdf6ec 0%,#ffe9d2 60%,#ffd9b8 100%);
      font-family:'Hiragino Maru Gothic ProN','BIZ UDGothic','Noto Sans JP',sans-serif}
    img{width:340px;height:340px;object-fit:contain;filter:drop-shadow(0 14px 22px rgba(120,80,40,.18))}
    .t{max-width:520px}
    .main{font-size:58px;font-weight:800;color:#4a3f35;line-height:1.25;letter-spacing:.02em}
    .sub{font-size:24px;font-weight:700;color:#6f6354;margin-top:16px}
    .logo{font-size:22px;font-weight:800;color:#c9772e;margin-top:22px}
  </style><body>
    <img src="http://localhost:8921/assets/sprites/shiba_sit.png">
    <div class="t">
      <div class="main">スマホを置くと、<br>育つ。</div>
      <div class="sub">責めない、やさしい デジタルデトックス</div>
      <div class="logo">いぬねこ図鑑 🐾</div>
    </div>
  </body>`;
  await page.setContent(html, { waitUntil: 'networkidle' });
  const file = path.join(OUT, 'feature-graphic.png');
  await page.screenshot({ path: file });
  console.log('✓ ' + path.relative(ROOT, file));
  await page.close();
}

(async () => {
  const filter = process.argv.slice(2);
  const list = filter.length ? SHOTS.filter(s => filter.some(f => s.name.includes(f))) : SHOTS;
  for (const t of TARGETS) fs.mkdirSync(path.join(OUT, t.dir), { recursive: true });
  const srv = serve();
  await new Promise(r => srv.listen(8921, r));
  const browser = await chromium.launch();
  let errs = 0;
  for (const t of TARGETS) for (const sc of list) errs += await shoot(browser, t, sc);
  if (!filter.length) await featureGraphic(browser);
  await browser.close();
  srv.close();
  process.exit(errs ? 1 : 0);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
