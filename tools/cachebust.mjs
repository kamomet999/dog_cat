#!/usr/bin/env node
/**
 * docs/app/index.html のローカルCSS/JS/manifest参照に ?v=<版> を付け、
 * ブラウザ/CDNの古いキャッシュを確実に無効化する（GitHub Pagesはヘッダを設定できないため）。
 * build:web の最後に実行。版はビルド時刻（base36）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(ROOT, 'docs/app/index.html');
const V = Date.now().toString(36);

let html = fs.readFileSync(file, 'utf8');
// href/src が css/… js/… assets/sprites/manifest.js のものに ?v= を付与（既存の?vは置換）
html = html.replace(/\b(href|src)="(css\/[^"?]+|js\/[^"?]+|assets\/sprites\/manifest\.js)(\?v=[^"]*)?"/g,
  (_m, attr, p) => `${attr}="${p}?v=${V}"`);
fs.writeFileSync(file, html);
console.log('cache-bust: v=' + V);
