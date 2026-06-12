/**
 * スナップショット検証ハーネス（動画事例の「AIに画面を見せる」ループの実体）。
 *
 *   npm run snap                # 全シナリオを描画
 *   npm run snap -- home dex    # 名前で絞り込み
 *
 * www/ を簡易HTTPで配信し、各シナリオの save を localStorage に流し込んで
 * Date.now() を固定 → 操作 → tests/visual/out/<name>.png に書き出す。
 * playwright はグローバル導入を使う（package.json の snap が NODE_PATH を設定）。
 * 出力PNGは生成物なので .gitignore 済み。描画後に Read で目視して反復する。
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { scenarios, T0 } = require('./scenarios');

const ROOT = path.resolve(__dirname, '../../');
const WWW = path.join(ROOT, 'www');
const OUT = path.join(__dirname, 'out');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };

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

async function runStep(page, step) {
  if (step.wait) await page.waitForTimeout(step.wait);
  if (step.click) { try { await page.click(step.click, { timeout: 2000 }); } catch (e) { console.warn('  click skip:', step.click); } }
  if (step.eval) await page.evaluate(step.eval);
}

(async () => {
  const filter = process.argv.slice(2);
  const list = filter.length ? scenarios.filter(s => filter.includes(s.name)) : scenarios;
  if (!list.length) { console.error('該当シナリオなし:', filter.join(', ')); process.exit(1); }

  fs.mkdirSync(OUT, { recursive: true });
  const srv = serve();
  await new Promise(r => srv.listen(8920, r));
  const browser = await chromium.launch();
  let errTotal = 0;

  for (const sc of list) {
    const page = await browser.newPage({
      viewport: sc.viewport || { width: 390, height: 844 },
      deviceScaleFactor: 2
    });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.addInitScript(([s, t]) => {
      window.__t = t;
      Date.now = () => window.__t;
      if (s) localStorage.setItem('inuneko_dex_save_v1', JSON.stringify(s));
      else localStorage.removeItem('inuneko_dex_save_v1');
    }, [sc.save || null, T0]);
    await page.goto('http://localhost:8920/');
    await page.waitForSelector('#app');
    await page.waitForTimeout(700);
    for (const step of (sc.steps || [])) await runStep(page, step);
    const file = path.join(OUT, sc.name + '.png');
    await page.screenshot({ path: file, fullPage: !!sc.fullPage });
    console.log((errs.length ? '✗' : '✓') + ' ' + sc.name + ' → ' + path.relative(ROOT, file) + (errs.length ? '  ERRORS: ' + errs.join('; ') : ''));
    errTotal += errs.length;
    await page.close();
  }

  await browser.close();
  srv.close();
  process.exit(errTotal ? 1 : 0);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
