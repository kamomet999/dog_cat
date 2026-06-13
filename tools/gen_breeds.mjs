#!/usr/bin/env node
/**
 * docs/art/breed-master-list.md を解析し、未登録の品種を tier:'premium' として
 * www/js/breeds.js の BREEDS 配列に一括投入する（犬・猫それぞれ計200になるよう上限）。
 * art params は妥当値を自動付与（SVGフォールバック用。本番は nanobanana 画像で差し替え）。
 *
 *   node tools/gen_breeds.mjs            # 投入
 *   node tools/gen_breeds.mjs --dry      # 件数だけ確認（書き込まない）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BREEDS_JS = path.join(ROOT, 'www/js/breeds.js');
const MD = path.join(ROOT, 'docs/art/breed-master-list.md');
const TARGET_PER_SPECIES = 200;
const dry = process.argv.includes('--dry');

const NATURES = ['いちず', 'ひとなつっこい', 'がんばりや', 'おりこう', 'こうきしん', 'げんきいっぱい',
  'のんびりや', 'ぼうけんずき', 'クール', 'きまぐれ', 'きれいずき', 'あまえんぼう', 'おしゃべり', 'おっとり', 'やさしい'];

// --- マスターリストを解析して species ごとの名前リストを得る ---
function parseMaster() {
  const lines = fs.readFileSync(MD, 'utf8').split('\n');
  let sp = null; const out = { dog: [], cat: [] };
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('## 🐶')) { sp = 'dog'; continue; }
    if (line.startsWith('## 🐱')) { sp = 'cat'; continue; }
    if (line.startsWith('## ')) { sp = null; continue; }
    if (!sp || !line || line.startsWith('#') || line.startsWith('>') || line.startsWith('|')) continue;
    let body = line.replace(/^[-*]\s*/, '');
    const colon = body.search(/[:：]/);
    if (colon >= 0 && /\(\d+\)/.test(body.slice(0, colon + 1))) body = body.slice(colon + 1); // "ラベル(10): ..."
    body.split(/[,、]/).forEach((tok) => {
      let n = tok.replace(/★/g, '').replace(/※.*$/, '').trim();
      if (n && !n.startsWith('←') && n.length <= 24) out[sp].push(n);
    });
  }
  // 重複除去（出現順維持）
  for (const k of ['dog', 'cat']) out[k] = [...new Set(out[k])];
  return out;
}

// --- 既存 breeds.js の名前・id ---
const src = fs.readFileSync(BREEDS_JS, 'utf8');
const existNames = new Set([...src.matchAll(/name:\s*'([^']+)'/g)].map(m => m[1]));
const existDog = (src.match(/species:\s*'dog'/g) || []).length;
const existCat = (src.match(/species:\s*'cat'/g) || []).length;

// --- art params をキーワードから推定 ---
const C = {
  black: '#2c2622', white: '#fbf6ee', grey: '#8a9aa5', brown: '#b5642f', tan: '#d8b88a',
  cream: '#e8c87a', choco: '#5a4a3a', lilac: '#b8a8c0', red: '#c8763a', gold: '#e0b074'
};
function pickColor(name, species) {
  if (/黒|ブラック|ボンベイ/.test(name)) return C.black;
  if (/白|ホワイト|マルチ|サモ|スピッツ|ビション/.test(name)) return C.white;
  if (/グレー|灰|青|ブルー|シルバー|ロシアン|シャル|コラット|ワイマラ|ネベ/.test(name)) return C.grey;
  if (/チョコ|肝|ブラウン|チョコレート/.test(name)) return C.choco;
  if (/クリーム|フォーン|ゴールデン|金/.test(name)) return C.cream;
  if (/茶|レッド|赤|アビ|ソマリ|セッター|ビズラ|トラ/.test(name)) return C.brown;
  if (/ライラック/.test(name)) return C.lilac;
  return species === 'dog' ? C.tan : C.gold;
}
function pickEar(name, species, i) {
  if (/折れ|フォールド/.test(name)) return 'fold';
  if (/立ち|プリック|スピッツ|シェパード|ハスキー|コーギー|チワワ/.test(name)) return 'prick';
  if (/垂れ|フロップ|レトリ|スパニエル|ハウンド|ダックス|ビーグル|セッター/.test(name)) return 'flop';
  if (species === 'cat') return /カール/.test(name) ? 'round' : 'prick';
  return ['prick', 'flop', 'round', 'bigprick'][i % 4];
}
function pickPattern(name) {
  if (/三毛|キャリコ|calico/.test(name)) return 'calico';
  if (/トラ|タビー|縞|tabby|マッカレル|渦|クラシック/.test(name)) return 'tabby';
  if (/タキシード|白黒|tuxedo/.test(name)) return 'tuxedo';
  if (/ブチ|パッチ|×白|白×|patch|バイカラー|ヴァン|モーガン|靴下/.test(name)) return 'patch';
  if (/スポット|spot|斑|ベンガル|マウ|オシ/.test(name)) return 'spot';
  if (/ポイント|point|シャム|ヒマラヤン|バーマン/.test(name)) return 'point';
  if (/タン|tan|ドーベル|セッター/.test(name)) return 'tan';
  return 'solid';
}
function pickEye(name, species) {
  if (/青目|ブルー目|シャム|ポイント|ラグドール/.test(name)) return '#7ab3e0';
  if (/金目|銅目|金/.test(name)) return '#e8a83a';
  if (/緑目/.test(name)) return '#9bd24a';
  return species === 'dog' ? '#3b2a1a' : '#9bd24a';
}
function isFluffy(name) { return /長毛|ふさ|ふわ|サモ|ポメ|チャウ|ペルシャ|メイン|ノルウェ|ラガマ|スピッツ|シープドッグ|コリー|セルカーク|ソマリ|バーニーズ|ピレ|レオンベル/.test(name); }
const RARITIES = ['common', 'common', 'uncommon', 'uncommon', 'uncommon', 'rare', 'rare', 'epic', 'common', 'uncommon', 'rare', 'legendary'];

function slug(species, n) { return (species === 'dog' ? 'pd' : 'pc') + String(n).padStart(3, '0'); }
function entry(id, species, name, i) {
  const color = pickColor(name, species);
  const e = {
    id, species, name,
    rarity: RARITIES[i % RARITIES.length],
    nature: NATURES[i % NATURES.length],
    desc: (species === 'dog' ? 'いろんな表情を見せる' : 'きまぐれでかわいい') + name + '。',
    art: {
      base: species, ear: pickEar(name, species, i),
      color, color2: '#fbf2e6', pattern: pickPattern(name),
      eye: pickEye(name, species), fluffy: isFluffy(name)
    }
  };
  return e;
}
function fmt(e) {
  const a = e.art;
  return `    {\n      id: '${e.id}', species: '${e.species}', name: '${e.name}', rarity: '${e.rarity}', nature: '${e.nature}', tier: 'premium',\n`
    + `      desc: '${e.desc}',\n`
    + `      art: { base: '${a.base}', ear: '${a.ear}', color: '${a.color}', color2: '${a.color2}', pattern: '${a.pattern}', eye: '${a.eye}', fluffy: ${a.fluffy} }\n    }`;
}

const master = parseMaster();
const add = { dog: [], cat: [] };
for (const sp of ['dog', 'cat']) {
  const have = sp === 'dog' ? existDog : existCat;
  let n = 1, i = 0;
  for (const name of master[sp]) {
    if (have + add[sp].length >= TARGET_PER_SPECIES) break;
    if (existNames.has(name)) continue;
    existNames.add(name);
    add[sp].push(entry(slug(sp, n++), sp, name, i++));
  }
}
console.log(`既存: 犬${existDog} 猫${existCat} ／ 追加: 犬${add.dog.length} 猫${add.cat.length} → 合計 犬${existDog + add.dog.length} 猫${existCat + add.cat.length}`);
if (dry) process.exit(0);

const block = '\n\n    // ============ プレミアム拡張（自動生成 tools/gen_breeds.mjs。本番絵は画像で差し替え） ============\n'
  + [...add.dog, ...add.cat].map(fmt).join(',\n') + '\n';
// BREEDS 配列の閉じ `\n  ];` の直前に挿入
const marker = '\n  ];';
const idx = src.indexOf(marker);
if (idx < 0) { console.error('BREEDS 配列の終端が見つからない'); process.exit(1); }
const out = src.slice(0, idx) + ',' + block + src.slice(idx + 1); // 直前要素のあとにカンマ＋ブロック、元の改行は marker が担う
fs.writeFileSync(BREEDS_JS, out);
console.log('breeds.js に追記しました');
