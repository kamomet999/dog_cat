#!/usr/bin/env node
/**
 * 各品種の「元の目付きスプライト(<id>.png)」から目の位置(高さy・中心からの間隔dx)を検出し、
 * www/assets/sprites/eyepos.js（window.INUNEKO_EYEPOS）を書き出す。
 * 目なしベース<id>_noeye に目レイヤーを“本来あった位置”へ差し込むために使う。
 *   node tools/eyepos.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPR = path.join(ROOT, 'www/assets/sprites');
const DEF = { y: 184, dx: 66 }; // 既定（検出失敗時）。512座標、中心256。

async function detect(id) {
  const N = 384;
  const { data, info } = await sharp(path.join(SPR, id + '.png')).resize(N, N, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  let lx = 0, ly = 0, ln = 0, rx = 0, ry = 0, rn = 0;
  for (let y = Math.round(H * 0.26); y < H * 0.45; y++) for (let x = Math.round(W * 0.20); x < W * 0.80; x++) {
    const fx = x / W; if (Math.abs(fx - 0.5) < 0.05) continue; // 鼻筋を除外
    const i = (y * W + x) * 4; if (data[i + 3] < 180) continue;
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (lum < 72) { if (fx < 0.5) { lx += x; ly += y; ln++; } else { rx += x; ry += y; rn++; } }
  }
  if (ln < 6 || rn < 6) return null;
  lx /= ln; ly /= ln; rx /= rn; ry /= rn;
  const k = 512 / N;
  const y = Math.round((ly + ry) / 2 * k);
  const dx = Math.round(((W / 2 - lx) + (rx - W / 2)) / 2 * k);
  if (y < 150 || y > 225 || dx < 55 || dx > 115) return null; // 異常値はデフォルト
  return { y, dx };
}

(async () => {
  const ids = fs.readdirSync(SPR).filter(f => /^[a-z0-9]+\.png$/.test(f)).map(f => f.replace('.png', '')).sort();
  const map = {};
  let def = 0;
  for (const id of ids) { const d = await detect(id); if (d) map[id] = d; else def++; }
  const body = '/* 自動生成: tools/eyepos.mjs。各品種の目の位置(高さy/中心からの間隔dx・512座標)。 */\n'
    + 'window.INUNEKO_EYEPOS = ' + JSON.stringify(map) + ';\n';
  fs.writeFileSync(path.join(SPR, 'eyepos.js'), body);
  console.log('eyepos.js: ' + Object.keys(map).length + '種を検出 / ' + def + '種は既定値');
})();
