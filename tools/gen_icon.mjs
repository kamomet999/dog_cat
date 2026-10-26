#!/usr/bin/env node
/**
 * アプリアイコンを生成する（ドット絵をやめ、ゲーム内と同じ手描き調スプライトで作る）。
 * 元絵: www/assets/sprites/shiba.png（犬）＋ calico.png（三毛猫）＝「いぬねこ」が一目で伝わる構図。
 * 背景: DESIGN.md §2 の暖色トークン（クリーム #fff6e9 → アクセント #ff9a76）の放射グラデ。
 *
 *   node tools/gen_icon.mjs
 *
 * 出力:
 *   assets/icon.png / icon-foreground.png / icon-background.png (1024)   ← @capacitor/assets 用の原本
 *   android/app/src/main/res/mipmap-*                                     ← ランチャー（通常・丸・適応アイコン）
 *   www/icons/icon-*.webp（中身はPNG。既存の参照名を変えない）             ← PWA/Web用
 *   ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png     ← iOS（未検証のまま残置）
 *   docs/slides/img/icon.png                                              ← スライド資料
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPR = path.join(ROOT, 'www/assets/sprites');
const S = 1024; // 原本サイズ

// 背景（全面グラデ。適応アイコンの background にもそのまま使う）
const BG_SVG = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">` +
  '<defs><radialGradient id="g" cx="50%" cy="32%" r="80%">' +
  '<stop offset="0%" stop-color="#fff6e9"/><stop offset="55%" stop-color="#ffd0ab"/><stop offset="100%" stop-color="#ff9a76"/>' +
  '</radialGradient></defs>' +
  `<rect width="${S}" height="${S}" fill="url(#g)"/></svg>`
);
const CIRCLE_SVG = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><circle cx="${S / 2}" cy="${S / 2}" r="${S / 2}" fill="#fff"/></svg>`
);

// 配置（1024座標・中心指定）。猫を後ろ右、犬を前左に重ねて「2匹でこっちを見ている」構図にする。
const LAYOUT = [
  { id: 'calico', w: 570, cx: 678, cy: 448 }, // 三毛猫（後ろ）
  { id: 'shiba',  w: 650, cx: 415, cy: 525 }  // 柴犬（手前）
];

async function petLayers(scale, dx, dy) {
  const out = [];
  for (const l of LAYOUT) {
    const w = Math.round(l.w * scale);
    const buf = await sharp(path.join(SPR, l.id + '.png')).resize({ width: w }).toBuffer();
    const m = await sharp(buf).metadata();
    out.push({
      input: buf,
      left: Math.round(S / 2 + (l.cx - S / 2) * scale - m.width / 2 + dx),
      top: Math.round(S / 2 + (l.cy - S / 2) * scale - m.height / 2 + dy)
    });
  }
  return out;
}

function write(file, buf) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
}
const resized = (buf, n) => sharp(buf).resize(n, n, { fit: 'cover' }).png().toBuffer();

async function main() {
  // --- 原本 3枚 ---
  const background = await sharp(BG_SVG).png().toBuffer();
  const icon = await sharp(background).composite(await petLayers(1, 0, 0)).png().toBuffer();
  // 適応アイコンの foreground は XML 側で 16.7% インセットされるため、ここでは画面いっぱいに描く
  const foreground = await sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(await petLayers(1.26, 0, 18)).png().toBuffer();
  write(path.join(ROOT, 'assets/icon.png'), icon);
  write(path.join(ROOT, 'assets/icon-background.png'), background);
  write(path.join(ROOT, 'assets/icon-foreground.png'), foreground);

  // --- Android ランチャー ---
  const round = await sharp(icon).composite([{ input: CIRCLE_SVG, blend: 'dest-in' }]).png().toBuffer();
  const DENS = { ldpi: 36, mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }; // 適応アイコン(fg/bg)は 2.25倍
  for (const [d, n] of Object.entries(DENS)) {
    const dir = path.join(ROOT, 'android/app/src/main/res/mipmap-' + d);
    const a = Math.round(n * 2.25);
    write(path.join(dir, 'ic_launcher.png'), await resized(icon, n));
    write(path.join(dir, 'ic_launcher_round.png'), await resized(round, n));
    write(path.join(dir, 'ic_launcher_foreground.png'), await resized(foreground, a));
    write(path.join(dir, 'ic_launcher_background.png'), await resized(background, a));
  }

  // --- Web / PWA（既存の参照名を保つ。中身はPNG） ---
  for (const n of [48, 72, 96, 128, 192, 256, 512]) {
    write(path.join(ROOT, 'www/icons/icon-' + n + '.webp'), await resized(icon, n));
  }

  // --- iOS（未検証のまま残置）／スライド資料 ---
  write(path.join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'), await resized(icon, 1024));
  const slide = path.join(ROOT, 'docs/slides/img/icon.png');
  if (fs.existsSync(slide)) {
    const m = await sharp(slide).metadata();
    write(slide, await resized(icon, m.width));
  }
  console.log('icon: assets/ + android mipmap-* + www/icons/ + ios + docs/slides を更新しました');
}

main();
