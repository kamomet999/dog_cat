#!/usr/bin/env node
/**
 * nanobanana（Gemini 2.5 Flash Image）で品種スプライトを一括生成する。
 * 設計書 docs/art/CHARACTER_DESIGN.md §0.5 のプロンプトに準拠（パステル絵本調・透過PNG）。
 *
 *   GEMINI_API_KEY=xxxx node tools/gen_sprites.mjs                 # 全品種
 *   GEMINI_API_KEY=xxxx node tools/gen_sprites.mjs --only shiba,spitz,mike   # 一部だけ（試写）
 *   GEMINI_API_KEY=xxxx node tools/gen_sprites.mjs --free          # 無料60種のみ
 *   node tools/gen_sprites.mjs --manifest                          # 既存PNGからmanifest.jsを再生成（キー不要）
 *
 * 出力: www/assets/sprites/<id>.png ＋ www/assets/sprites/manifest.js
 * 既に存在するPNGはスキップ（--force で上書き）。
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPR = path.join(ROOT, 'www/assets/sprites');
// 生成モデル。既定は nano banana（gemini-2.5-flash-image, 高品質・約$0.039/枚）。
// コスト優先なら GEMINI_IMAGE_MODEL=gemini-2.0-flash-preview-image-generation などに切替可。
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const SIZE = 512, INNER = 472, PAD = (SIZE - INNER) / 2; // 出力解像度（<img>でcontain表示。1024は重すぎ）
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };

function loadBreeds() {
  const sb = { window: {} }; sb.window = sb;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'www/js/breeds.js'), 'utf8'), sb);
  return sb.Breeds;
}
const EAR = { prick: 'pointy upright', bigprick: 'big upright', flop: 'floppy', round: 'rounded', fold: 'folded' };
const PAT = { solid: 'solid color', tan: 'two-tone tan', patch: 'patches', spot: 'spots', tabby: 'tabby stripes', calico: 'calico patches', tuxedo: 'tuxedo bicolor', point: 'color-point' };

function prompt(b) {
  const a = b.art;
  return `A super-cute kawaii mascot illustration of a ${b.name} (${b.species === 'dog' ? 'dog' : 'cat'}), `
    + `soft pastel picture-book / watercolor style. Chubby rounded fluffy body, big head, short stubby limbs, `
    + `sitting front-facing, full body, centered. Big round sparkly eyes with white highlights, rosy blushing cheeks, `
    + `gentle happy smile, tiny visible paw pads. Thick SOFT outline in warm dark-brown (NOT black), flat soft shading. `
    + `Main fur color ${a.color}, accent ${a.color2}, ${PAT[a.pattern] || a.pattern} markings, ${EAR[a.ear] || a.ear} ears`
    + `${a.fluffy ? ', extra fluffy fur' : ''}${a.tail === 'curl' ? ', curled tail' : ''}. `
    + `Adorable, clean, LINE-sticker friendliness, Pokemon-Sleep-like coziness. `
    + `Place the character ALONE on a completely flat, uniform, solid pure chroma-green background `
    + `(RGB 0,224,0) that fills the whole frame edge to edge — NO checkerboard, NO gradient, NO shadow, `
    + `NO pattern, the green is the only color behind the character (it will be keyed out to transparent). `
    + `1:1 square. No text, no watermark. `
    + `Original character — do NOT copy any existing brand or the "Bonless" characters.`;
}

function writeManifest(ids) {
  const body = '/* 自動生成: tools/gen_sprites.mjs。生成済みスプライトの登録簿。 */\n'
    + 'window.INUNEKO_SPRITES = ' + JSON.stringify(ids.reduce((o, id) => (o[id] = 1, o), {}), null, 0) + ';\n'
    + 'if (window.Art && Art.registerSprites) Art.registerSprites(window.INUNEKO_SPRITES);\n';
  fs.writeFileSync(path.join(SPR, 'manifest.js'), body);
  console.log(`manifest.js 更新: ${ids.length}件`);
}
function existingIds() {
  return fs.readdirSync(SPR).filter(f => f.endsWith('.png')).map(f => f.replace(/\.png$/, ''));
}

// 背景除去: 四辺から色のフラッドフィルで「外側の地色」だけを透過にする。
// キャラはこげ茶の太い輪郭で囲まれているので塗りが内部に漏れない（背景色が何色でも効く）。
// 1024pxで2値カットし、後段の縮小でエッジを自然にアンチエイリアス。
async function removeBg(srcBuf) {
  const { data, info } = await sharp(srcBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const idx = (x, y) => (y * W + x) * 4;
  // 背景の基準色＝外周バンド（端から1〜10%）の「不透明」画素のチャンネル別メディアン。
  // メディアンなので、はみ出した耳/尾など少数のキャラ画素や透過パディングに強い。
  const rs = [], gs = [], bs = [];
  const o1 = Math.round(Math.min(W, H) * 0.01), o2 = Math.round(Math.min(W, H) * 0.10);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const inBand = (x >= o1 && x < o2) || (x >= W - o2 && x < W - o1) || (y >= o1 && y < o2) || (y >= H - o2 && y < H - o1);
    const inFrame = x >= o1 && x < W - o1 && y >= o1 && y < H - o1;
    if (!(inBand || !inFrame)) continue;
    const i = idx(x, y); if (data[i + 3] > 200) { rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]); }
  }
  const med = (a) => { a.sort((p, q) => p - q); return a.length ? a[a.length >> 1] : -999; };
  let br = med(rs), bg = med(gs), bb = med(bs);
  const T2 = 72 * 72; // 色距離のしきい値（²）
  // 背景＝すでに透過 or 基準色に近い不透明画素
  const isBg = (i) => data[i + 3] < 8 || (() => { const dr = data[i] - br, dg = data[i + 1] - bg, db = data[i + 2] - bb; return dr * dr + dg * dg + db * db < T2; })();
  const visited = new Uint8Array(W * H);
  const stack = [];
  const seed = (x, y) => { const p = y * W + x; if (!visited[p] && isBg(p * 4)) { visited[p] = 1; stack.push(p); } };
  for (let x = 0; x < W; x++) { seed(x, 0); seed(x, H - 1); }
  for (let y = 0; y < H; y++) { seed(0, y); seed(W - 1, y); }
  while (stack.length) {
    const p = stack.pop(), x = p % W, y = (p / W) | 0;
    if (x > 0) seed(x - 1, y); if (x < W - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1); if (y < H - 1) seed(x, y + 1);
  }
  for (let p = 0; p < W * H; p++) if (visited[p]) data[p * 4 + 3] = 0;
  return sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .trim({ threshold: 12 })
    .resize(INNER, INNER, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ palette: true, quality: 90, effort: 8, compressionLevel: 9 }) // パレット量子化で~1/4に（パステルの階調は保たれる）
    .toBuffer();
}

async function genOne(b, key) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt(b) }] }] })
  });
  if (!res.ok) throw new Error(`${b.id}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const img = parts.find(p => p.inlineData && /image/.test(p.inlineData.mimeType || ''));
  if (!img) throw new Error(`${b.id}: 画像パートが返らなかった`);
  const out = await removeBg(Buffer.from(img.inlineData.data, 'base64'));
  fs.writeFileSync(path.join(SPR, `${b.id}.png`), out);
}

(async () => {
  fs.mkdirSync(SPR, { recursive: true });
  if (has('--manifest')) { writeManifest(existingIds()); return; }

  // --rebg: 既存PNGの背景除去だけをやり直す（API不要。キーアルゴリズム調整用）。
  if (has('--rebg')) {
    let ids = existingIds();
    const only = val('--only');
    if (only) { const set = new Set(only.split(',')); ids = ids.filter(id => set.has(id)); }
    for (const id of ids) {
      const p = path.join(SPR, `${id}.png`);
      try { fs.writeFileSync(p, await removeBg(fs.readFileSync(p))); console.log(`✓ rebg ${id}`); }
      catch (e) { console.error(`✗ rebg ${id}: ${e.message}`); }
    }
    writeManifest(existingIds());
    return;
  }

  const Breeds = loadBreeds();
  let list = Breeds.ALL;
  if (has('--free')) list = list.filter(Breeds.isFree);
  const only = val('--only');
  if (only) { const set = new Set(only.split(',')); list = list.filter(b => set.has(b.id)); }

  const key = process.env.GEMINI_API_KEY;
  if (!key) { console.error('GEMINI_API_KEY が未設定です。例: GEMINI_API_KEY=xxx node tools/gen_sprites.mjs --only shiba'); process.exit(1); }

  let ok = 0; const fails = [];
  for (const b of list) {
    const out = path.join(SPR, `${b.id}.png`);
    if (fs.existsSync(out) && !has('--force')) { ok++; continue; }
    try { await genOne(b, key); ok++; console.log(`✓ ${b.id} (${b.name})`); }
    catch (e) { fails.push(b.id); console.error(`✗ ${e.message}`); }
    await new Promise(r => setTimeout(r, 400)); // レート制御
  }
  writeManifest(existingIds());
  console.log(`完了: ${ok}件成功 / ${fails.length}件失敗${fails.length ? ' (' + fails.join(',') + ')' : ''}`);
})();
