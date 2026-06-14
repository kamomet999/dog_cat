#!/usr/bin/env node
/**
 * 各品種の「元の目付きスプライト(<id>.png)」から、左右それぞれの目の中心点(1pxの点)を検出し、
 * www/assets/sprites/eyepos.js（window.INUNEKO_EYEPOS = {id:{lx,ly,rx,ry}}・512座標）を書き出す。
 * 目なしベース<id>_noeye に、その点へ目レイヤーを差し込むために使う。
 *   node tools/eyepos.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPR = path.join(ROOT, 'www/assets/sprites');
const DEF = { lx: 190, ly: 184, rx: 322, ry: 184 }; // 既定（検出失敗時）。512座標。

const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

async function detect(id) {
  const N = 384;
  const { data, info } = await sharp(path.join(SPR, id + '.png')).resize(N, N, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, k = 512 / N;
  // 左右の半分ごとに「いちばん暗い塊(=瞳)」の重心を出す
  function side(x0, x1) {
    let sx = 0, sy = 0, n = 0, sw = 0;
    for (let y = Math.round(H * 0.26); y < H * 0.45; y++) for (let x = Math.round(x0 * W); x < x1 * W; x++) {
      const fx = x / W; if (Math.abs(fx - 0.5) < 0.05) continue; // 鼻筋を除外
      const i = (y * W + x) * 4; if (data[i + 3] < 180) continue;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum < 64) { const w = (64 - lum); sx += x * w; sy += y * w; sw += w; n++; } // 暗いほど重み大（瞳に寄る）
    }
    if (n < 5) return null;
    return { x: sx / sw * k, y: sy / sw * k };
  }
  const L = side(0.16, 0.50), R = side(0.50, 0.84);
  let lx, ly, rx, ry;
  if (L && R) { lx = L.x; ly = L.y; rx = R.x; ry = R.y; }
  else if (L) { lx = L.x; ly = L.y; rx = 512 - L.x; ry = L.y; }       // 片側だけ→ミラー
  else if (R) { rx = R.x; ry = R.y; lx = 512 - R.x; ly = R.y; }
  else return null;
  // 健全範囲にクランプ＋左右の高さ差が大きすぎたら平均化（傾き防止）
  lx = cl(lx, 120, 246); rx = cl(rx, 266, 392);
  ly = cl(ly, 150, 228); ry = cl(ry, 150, 228);
  if (Math.abs(ly - ry) > 14) { const m = (ly + ry) / 2; ly = m; ry = m; }
  return { lx: Math.round(lx), ly: Math.round(ly), rx: Math.round(rx), ry: Math.round(ry) };
}

(async () => {
  const ids = fs.readdirSync(SPR).filter(f => /^[a-z0-9]+\.png$/.test(f)).map(f => f.replace('.png', '')).sort();
  const map = {}; let def = 0;
  for (const id of ids) { const d = await detect(id); if (d) map[id] = d; else def++; }
  const body = '/* 自動生成: tools/eyepos.mjs。左右の目の中心点(lx,ly,rx,ry・512座標)。 */\n'
    + 'window.INUNEKO_EYEPOS = ' + JSON.stringify(map) + ';\n';
  fs.writeFileSync(path.join(SPR, 'eyepos.js'), body);
  console.log('eyepos.js: ' + Object.keys(map).length + '種を検出 / ' + def + '種は既定値');
})();
