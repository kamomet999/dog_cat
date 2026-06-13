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

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPR = path.join(ROOT, 'www/assets/sprites');
const MODEL = 'gemini-2.5-flash-image'; // 別名: nano banana。preview期は gemini-2.5-flash-image-preview
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
    + `Plain TRANSPARENT background (PNG alpha). 1:1 square. No text, no watermark. `
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
  fs.writeFileSync(path.join(SPR, `${b.id}.png`), Buffer.from(img.inlineData.data, 'base64'));
}

(async () => {
  fs.mkdirSync(SPR, { recursive: true });
  if (has('--manifest')) { writeManifest(existingIds()); return; }

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
