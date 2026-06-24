/**
 * 図鑑データ（犬・猫の品種定義）
 * すべてプロシージャルSVG(art.js)で描き分けるためのパラメータを持つ。
 * art:
 *   base    : 'dog' | 'cat'
 *   ear     : 'prick'(立ち) | 'flop'(垂れ) | 'round'(丸) | 'fold'(折れ)
 *   color   : メイン体色
 *   color2  : アクセント色（口元/胸/模様の副色）
 *   pattern : 'solid' | 'tan' | 'patch' | 'spot' | 'tabby' | 'calico' | 'tuxedo' | 'point'
 *   eye     : 目の色
 *   fluffy  : ふわふわ輪郭か
 * rarity   : 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
 * tier     : 省略=無料（メジャー30種）／ 'premium'=¥500課金で解放（全公式品種）
 *
 * 課金モデル（ユーザー決定 2026-06）:
 *   無料 = メジャーな犬種・猫種（このファイルの tier 無し＝30種）。
 *   ¥500買い切りで「全公式品種」を解放（犬は最終的に200〜300、猫は公認種＋毛色変種）。
 *   ※延命・復活の課金は永久になし（DESIGN.md 原則2）。これはコレクション拡張のみ。
 *   現状は仕組み実装＋プレミアム見本数種。本データの拡充（可愛い人気種）は後続。
 */
(function (global) {
  'use strict';

  var BREEDS = [
    // ---------------- 犬 ----------------
    {
      id: 'shiba', species: 'dog', name: '柴犬', rarity: 'common', nature: 'いちず',
      desc: 'くるんと巻いた尻尾。日本の代表犬。',
      art: { base: 'dog', ear: 'prick', color: '#d99a5c', color2: '#fbf2e6', pattern: 'tan', eye: '#3b2a1a', fluffy: false, tail: 'curl' }
    },
    {
      id: 'golden', species: 'dog', name: 'ゴールデンレトリバー', rarity: 'common', nature: 'ひとなつっこい',
      desc: '人なつっこい黄金の毛なみ。',
      art: { base: 'dog', ear: 'flop', color: '#e3b76b', color2: '#f3dcab', pattern: 'solid', eye: '#3b2a1a', fluffy: true }
    },
    {
      id: 'chihuahua', species: 'dog', name: 'チワワ', rarity: 'common', nature: 'がんばりや',
      desc: 'うるうるの瞳と大きな耳。世界最小級。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#f4e7d4', pattern: 'solid', eye: '#2a1d12', fluffy: false }
    },
    {
      id: 'poodle', species: 'dog', name: 'トイプードル', rarity: 'uncommon', nature: 'おりこう',
      desc: 'もこもこカール。お利口さん。',
      art: { base: 'dog', ear: 'flop', color: '#e8d5b0', color2: '#fff7ea', pattern: 'solid', eye: '#2a1d12', fluffy: true }
    },
    {
      id: 'dachshund', species: 'dog', name: 'ダックスフント', rarity: 'uncommon', nature: 'こうきしん',
      desc: 'チョコレート色の胴長短足。',
      art: { base: 'dog', ear: 'flop', color: '#7a4a2b', color2: '#c98a4f', pattern: 'tan', eye: '#1f1209', fluffy: false }
    },
    {
      id: 'pomeranian', species: 'dog', name: 'ポメラニアン', rarity: 'uncommon', nature: 'げんきいっぱい',
      desc: 'まん丸ふわふわの小さな太陽。',
      art: { base: 'dog', ear: 'prick', color: '#e0a558', color2: '#f6dcab', pattern: 'solid', eye: '#2a1d12', fluffy: true }
    },
    {
      id: 'pug', species: 'dog', name: 'パグ', rarity: 'uncommon', nature: 'のんびりや',
      desc: 'くしゃっと顔、黒いマスク。',
      art: { base: 'dog', ear: 'round', color: '#d9bf8f', color2: '#3a3330', pattern: 'patch', eye: '#1f1209', fluffy: false }
    },
    {
      id: 'corgi', species: 'dog', name: 'コーギー', rarity: 'rare', nature: 'げんきいっぱい',
      desc: '短い脚と大きなおしり。',
      art: { base: 'dog', ear: 'bigprick', color: '#e0913f', color2: '#fbf3e8', pattern: 'tan', eye: '#2a1d12', fluffy: false }
    },
    {
      id: 'husky', species: 'dog', name: 'ハスキー', rarity: 'rare', nature: 'ぼうけんずき',
      desc: '氷のような青い瞳の雪国犬。',
      art: { base: 'dog', ear: 'prick', color: '#6b7785', color2: '#f1f3f6', pattern: 'patch', eye: '#5fc8e8', fluffy: true }
    },
    {
      id: 'bulldog', species: 'dog', name: 'ブルドッグ', rarity: 'rare', nature: 'のんびりや',
      desc: 'どっしり貫禄、しわが魅力。',
      art: { base: 'dog', ear: 'round', color: '#c9a36f', color2: '#f3e7d4', pattern: 'patch', eye: '#1f1209', fluffy: false }
    },
    {
      id: 'dalmatian', species: 'dog', name: 'ダルメシアン', rarity: 'epic', nature: 'ぼうけんずき',
      desc: '白地に黒い水玉のスター犬。',
      art: { base: 'dog', ear: 'flop', color: '#f3f0ea', color2: '#2c2c2c', pattern: 'spot', eye: '#2a1d12', fluffy: false }
    },
    {
      id: 'wolfdog', species: 'dog', name: 'ウルフドッグ', rarity: 'legendary', nature: 'クール',
      desc: '野生の血を引く誇り高き存在。ごく稀に現れる。',
      art: { base: 'dog', ear: 'prick', color: '#5b626b', color2: '#d7dade', pattern: 'patch', eye: '#e8c84a', fluffy: true }
    },
    {
      id: 'kurolab', species: 'dog', name: '黒ラブラドール', rarity: 'common', nature: 'おりこう',
      desc: 'つやつやの黒い毛。かしこくて家族おもい。',
      art: { base: 'dog', ear: 'flop', color: '#3a3531', color2: '#5a5048', pattern: 'solid', eye: '#7a5a32', fluffy: false }
    },
    {
      id: 'beagle', species: 'dog', name: 'ビーグル', rarity: 'uncommon', nature: 'こうきしん',
      desc: 'はなぺこ名探偵。三色のしましまボディ。',
      art: { base: 'dog', ear: 'flop', color: '#d9a35c', color2: '#fbf3e8', pattern: 'patch', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'samoyed', species: 'dog', name: 'サモエド', rarity: 'epic', nature: 'ひとなつっこい',
      desc: 'まっしろもふもふ。サモエドスマイルにいやされる。',
      art: { base: 'dog', ear: 'prick', color: '#f5f1e8', color2: '#ffffff', pattern: 'solid', eye: '#3b2a1a', fluffy: true }
    },
    {
      id: 'labrador', species: 'dog', name: 'ラブラドール', rarity: 'common', nature: 'ひとなつっこい',
      desc: '金色の毛なみ。やさしくて かしこい人気者。',
      art: { base: 'dog', ear: 'flop', color: '#e8c87a', color2: '#f3dcab', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'jackrussell', species: 'dog', name: 'ジャックラッセル', rarity: 'uncommon', nature: 'げんきいっぱい',
      desc: '小さな体に あふれる元気。やんちゃ大将。',
      art: { base: 'dog', ear: 'flop', color: '#fbf6ee', color2: '#c98a4f', pattern: 'patch', eye: '#2a1d12', fluffy: false }
    },
    {
      id: 'schnauzer', species: 'dog', name: 'シュナウザー', rarity: 'uncommon', nature: 'おりこう',
      desc: 'りっぱな おひげが トレードマーク。',
      art: { base: 'dog', ear: 'prick', color: '#8a8580', color2: '#c8c2b8', pattern: 'solid', eye: '#2a1d12', fluffy: true }
    },
    {
      id: 'yorkie', species: 'dog', name: 'ヨークシャテリア', rarity: 'uncommon', nature: 'きれいずき',
      desc: '動く宝石とよばれる つややかな毛。',
      art: { base: 'dog', ear: 'prick', color: '#6a5a48', color2: '#c98a4f', pattern: 'tan', eye: '#2a1d12', fluffy: true }
    },
    {
      id: 'sheltie', species: 'dog', name: 'シェルティ', rarity: 'rare', nature: 'おりこう',
      desc: 'ふさふさの えりまき。かしこい牧羊犬。',
      art: { base: 'dog', ear: 'flop', color: '#c87f3a', color2: '#fbf3e8', pattern: 'tan', eye: '#3b2a1a', fluffy: true }
    },
    {
      id: 'boston', species: 'dog', name: 'ボストンテリア', rarity: 'common', nature: 'おしゃべり',
      desc: 'タキシードを着たような白黒。アメリカの紳士。',
      art: { base: 'dog', ear: 'bigprick', color: '#2c2622', color2: '#ffffff', pattern: 'tuxedo', eye: '#1f1209', fluffy: false }
    },
    {
      id: 'cavalier', species: 'dog', name: 'キャバリア', rarity: 'uncommon', nature: 'やさしい',
      desc: 'たれ耳と やさしい瞳。おうさまに愛された犬。',
      art: { base: 'dog', ear: 'flop', color: '#fbf2e6', color2: '#b5532f', pattern: 'patch', eye: '#2a1d12', fluffy: true }
    },
    {
      id: 'bernese', species: 'dog', name: 'バーニーズ', rarity: 'rare', nature: 'のんびりや',
      desc: '三色の大きな体。山のやさしい巨人。',
      art: { base: 'dog', ear: 'flop', color: '#2c2622', color2: '#b5532f', pattern: 'tan', eye: '#3b2a1a', fluffy: true }
    },
    {
      id: 'stbernard', species: 'dog', name: 'セントバーナード', rarity: 'epic', nature: 'おっとり',
      desc: '雪山の救助犬。どっしり やさしい大型犬。',
      art: { base: 'dog', ear: 'flop', color: '#c8763a', color2: '#fbf3e8', pattern: 'patch', eye: '#3b2a1a', fluffy: true }
    },
    {
      id: 'bichon', species: 'dog', name: 'ビションフリーゼ', rarity: 'uncommon', nature: 'あまえんぼう',
      desc: 'まんまる わたあめみたいな白い毛。',
      art: { base: 'dog', ear: 'flop', color: '#fbf6ee', color2: '#efe2cf', pattern: 'solid', eye: '#2a1d12', fluffy: true }
    },
    {
      id: 'papillon', species: 'dog', name: 'パピヨン', rarity: 'rare', nature: 'こうきしん',
      desc: 'ちょうちょの羽のような大きな耳。',
      art: { base: 'dog', ear: 'bigprick', color: '#fbf2e6', color2: '#3a3330', pattern: 'patch', eye: '#2a1d12', fluffy: true }
    },
    {
      id: 'whippet', species: 'dog', name: 'ウィペット', rarity: 'rare', nature: 'クール',
      desc: 'しなやかな すらり体型。風のように走る。',
      art: { base: 'dog', ear: 'flop', color: '#c9b89a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'shikoku', species: 'dog', name: '四国犬', rarity: 'rare', nature: 'いちず',
      desc: '凛とした和犬。胡麻色の毛と巻き尾。',
      art: { base: 'dog', ear: 'prick', color: '#c98a4f', color2: '#fbf3e8', pattern: 'tan', eye: '#3b2a1a', fluffy: false, tail: 'curl' }
    },
    {
      id: 'spitz', species: 'dog', name: '日本スピッツ', rarity: 'uncommon', nature: 'げんきいっぱい',
      desc: 'まっしろふわふわ。くるんと巻いた尻尾。',
      art: { base: 'dog', ear: 'prick', color: '#ffffff', color2: '#f5f1e8', pattern: 'solid', eye: '#1f1209', fluffy: true, tail: 'curl' }
    },
    {
      id: 'greatdane', species: 'dog', name: 'グレートデン', rarity: 'epic', nature: 'おっとり',
      desc: '見上げるほど大きい。やさしい巨犬。',
      art: { base: 'dog', ear: 'prick', color: '#d9bf8f', color2: '#3a3330', pattern: 'patch', eye: '#3b2a1a', fluffy: false }
    },

    // ---------------- 猫 ----------------
    {
      id: 'kijitora', species: 'cat', name: 'キジトラ', rarity: 'common', nature: 'ぼうけんずき',
      desc: '野生味のある茶縞。日本で一番多い柄。',
      art: { base: 'cat', ear: 'prick', color: '#9a7b4f', color2: '#5b452a', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'calico', species: 'cat', name: '三毛猫', rarity: 'common', nature: 'きまぐれ',
      desc: '白・茶・黒の三色。福を招くといわれる。',
      art: { base: 'cat', ear: 'prick', color: '#f2ede4', color2: '#e0944a', pattern: 'calico', eye: '#e0b24a', fluffy: false }
    },
    {
      id: 'black', species: 'cat', name: '黒猫', rarity: 'common', nature: 'クール',
      desc: '夜にとけこむ漆黒。金色の瞳が光る。',
      art: { base: 'cat', ear: 'prick', color: '#2e2e35', color2: '#444', pattern: 'solid', eye: '#e8c84a', fluffy: false }
    },
    {
      id: 'white', species: 'cat', name: '白猫', rarity: 'common', nature: 'きれいずき',
      desc: '雪のように真っ白。青い瞳が涼やか。',
      art: { base: 'cat', ear: 'prick', color: '#f4f1eb', color2: '#e6e0d6', pattern: 'solid', eye: '#5fc8e8', fluffy: false }
    },
    {
      id: 'chatora', species: 'cat', name: '茶トラ', rarity: 'common', nature: 'ひとなつっこい',
      desc: 'おっとり甘えん坊のオレンジ縞。',
      art: { base: 'cat', ear: 'prick', color: '#e0944a', color2: '#b86a28', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'sabatora', species: 'cat', name: 'サバトラ', rarity: 'uncommon', nature: 'こうきしん',
      desc: '銀灰色のクールな縞模様。',
      art: { base: 'cat', ear: 'prick', color: '#8c97a3', color2: '#525a63', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'hachiware', species: 'cat', name: 'ハチワレ', rarity: 'uncommon', nature: 'あまえんぼう',
      desc: '額のV字と白い靴下がチャームポイント。',
      art: { base: 'cat', ear: 'prick', color: '#33333a', color2: '#f4f1eb', pattern: 'tuxedo', eye: '#e0b24a', fluffy: false }
    },
    {
      id: 'siamese', species: 'cat', name: 'シャム', rarity: 'rare', nature: 'おしゃべり',
      desc: '顔と手足だけ濃い、気品ある貴族猫。',
      art: { base: 'cat', ear: 'prick', color: '#ece0cc', color2: '#5a4636', pattern: 'point', eye: '#5fc8e8', fluffy: false }
    },
    {
      id: 'russianblue', species: 'cat', name: 'ロシアンブルー', rarity: 'rare', nature: 'クール',
      desc: '青みがかった銀の毛と翡翠の瞳。',
      art: { base: 'cat', ear: 'prick', color: '#7d8a99', color2: '#9aa6b3', pattern: 'solid', eye: '#7ad26a', fluffy: true }
    },
    {
      id: 'scottish', species: 'cat', name: 'スコティッシュフォールド', rarity: 'rare', nature: 'のんびりや',
      desc: 'ぺたんと折れた耳がたまらない。',
      art: { base: 'cat', ear: 'fold', color: '#c9bca8', color2: '#9a8c78', pattern: 'tabby', eye: '#e0b24a', fluffy: true }
    },
    {
      id: 'mainecoon', species: 'cat', name: 'メインクーン', rarity: 'epic', nature: 'やさしい',
      desc: '森の妖精。長毛のやさしい大型猫。',
      art: { base: 'cat', ear: 'prick', color: '#8a6a45', color2: '#4a3826', pattern: 'tabby', eye: '#9bd24a', fluffy: true }
    },
    {
      id: 'bengal', species: 'cat', name: 'ベンガル', rarity: 'legendary', nature: 'ぼうけんずき',
      desc: '豹のようなロゼット柄。野性の宝石。',
      art: { base: 'cat', ear: 'prick', color: '#cf9a4f', color2: '#3a2c14', pattern: 'spot', eye: '#e8a83a', fluffy: false }
    },
    {
      id: 'munchkin', species: 'cat', name: 'マンチカン', rarity: 'uncommon', nature: 'あまえんぼう',
      desc: 'みじかいあんよでトコトコ。あまえんぼう。',
      art: { base: 'cat', ear: 'prick', color: '#e0c08a', color2: '#fbf2e6', pattern: 'solid', eye: '#7ab3e0', fluffy: false }
    },
    {
      id: 'ragdoll', species: 'cat', name: 'ラグドール', rarity: 'rare', nature: 'おっとり',
      desc: 'だっこが大すき。ぬいぐるみみたいな長毛猫。',
      art: { base: 'cat', ear: 'prick', color: '#ece5d8', color2: '#8a7460', pattern: 'point', eye: '#7ab3e0', fluffy: true }
    },
    {
      id: 'sphynx', species: 'cat', name: 'スフィンクス', rarity: 'epic', nature: 'ひとなつっこい',
      desc: '毛のないふしぎな猫。じつはとても人なつっこい。',
      art: { base: 'cat', ear: 'prick', color: '#d8b59a', color2: '#b08a6a', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'chashiro', species: 'cat', name: '茶白', rarity: 'common', nature: 'のんびりや',
      desc: 'オレンジと白の人なつっこい和猫。',
      art: { base: 'cat', ear: 'prick', color: '#e0913f', color2: '#fbf6ee', pattern: 'patch', eye: '#d9b13a', fluffy: false }
    },
    {
      id: 'sabashiro', species: 'cat', name: 'サバ白', rarity: 'common', nature: 'げんきいっぱい',
      desc: 'グレーと白の元気もの。',
      art: { base: 'cat', ear: 'prick', color: '#8a9aa5', color2: '#fbf6ee', pattern: 'patch', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'britishshort', species: 'cat', name: 'ブリティッシュSH', rarity: 'uncommon', nature: 'おっとり',
      desc: 'まるい顔とふくよかな体。青灰色の人気猫。',
      art: { base: 'cat', ear: 'round', color: '#8a9aa5', color2: '#aebac2', pattern: 'solid', eye: '#e8a83a', fluffy: false }
    },
    {
      id: 'exotic', species: 'cat', name: 'エキゾチックSH', rarity: 'rare', nature: 'のんびりや',
      desc: 'ぺたんこ顔の短毛ペルシャ。のんびり屋。',
      art: { base: 'cat', ear: 'round', color: '#e0c08a', color2: '#fbf2e6', pattern: 'solid', eye: '#e8a83a', fluffy: true }
    },
    {
      id: 'tonkinese', species: 'cat', name: 'トンキニーズ', rarity: 'uncommon', nature: 'おしゃべり',
      desc: 'シャムとバーミーズの間。よくおしゃべり。',
      art: { base: 'cat', ear: 'prick', color: '#c8a06a', color2: '#8a6a4a', pattern: 'point', eye: '#7ab3e0', fluffy: false }
    },
    {
      id: 'somali', species: 'cat', name: 'ソマリ', rarity: 'rare', nature: 'こうきしん',
      desc: 'きつねのような ふさふさ尻尾の長毛アビシニアン。',
      art: { base: 'cat', ear: 'prick', color: '#b5642f', color2: '#e0a558', pattern: 'tabby', eye: '#9bd24a', fluffy: true }
    },
    {
      id: 'korat', species: 'cat', name: 'コラット', rarity: 'rare', nature: 'クール',
      desc: 'タイの幸運の猫。銀がかった青い毛。',
      art: { base: 'cat', ear: 'prick', color: '#8a9aa5', color2: '#9aa6ad', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'burmese', species: 'cat', name: 'バーミーズ', rarity: 'uncommon', nature: 'あまえんぼう',
      desc: 'つやめく こげ茶の毛と金の瞳。甘えん坊。',
      art: { base: 'cat', ear: 'prick', color: '#5a4a3a', color2: '#7a6a52', pattern: 'solid', eye: '#e8a83a', fluffy: false }
    },
    {
      id: 'singapura', species: 'cat', name: 'シンガプーラ', rarity: 'epic', nature: 'げんきいっぱい',
      desc: '世界最小級の猫。小さくても好奇心いっぱい。',
      art: { base: 'cat', ear: 'bigprick', color: '#c8a06a', color2: '#e0c896', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'devonrex', species: 'cat', name: 'デボンレックス', rarity: 'rare', nature: 'きまぐれ',
      desc: '巻き毛と大きな耳。妖精のような猫。',
      art: { base: 'cat', ear: 'bigprick', color: '#9a8a7a', color2: '#c8b8a8', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'selkirk', species: 'cat', name: 'セルカークレックス', rarity: 'rare', nature: 'おっとり',
      desc: 'もこもこの巻き毛。羊のような長毛猫。',
      art: { base: 'cat', ear: 'round', color: '#ece5d8', color2: '#d8c4a8', pattern: 'solid', eye: '#e8a83a', fluffy: true }
    },
    {
      id: 'egyptianmau', species: 'cat', name: 'エジプシャンマウ', rarity: 'epic', nature: 'ぼうけんずき',
      desc: '自然にできた美しい斑点。俊足のハンター。',
      art: { base: 'cat', ear: 'prick', color: '#b8c0c6', color2: '#3a4248', pattern: 'spot', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'ocicat', species: 'cat', name: 'オシキャット', rarity: 'rare', nature: 'ぼうけんずき',
      desc: '野生のオセロットみたいな斑点。人なつっこい。',
      art: { base: 'cat', ear: 'prick', color: '#c8a06a', color2: '#5a4632', pattern: 'spot', eye: '#d9b13a', fluffy: false }
    },
    {
      id: 'ragamuffin', species: 'cat', name: 'ラガマフィン', rarity: 'uncommon', nature: 'やさしい',
      desc: 'ふわふわ長毛で だっこ大好き。ラグドールの親戚。',
      art: { base: 'cat', ear: 'round', color: '#ece5d8', color2: '#b5957a', pattern: 'point', eye: '#7ab3e0', fluffy: true }
    },
    {
      id: 'lykoi', species: 'cat', name: 'ライコイ', rarity: 'legendary', nature: 'きまぐれ',
      desc: 'オオカミ猫とよばれる めずらしい毛なみ。',
      art: { base: 'cat', ear: 'prick', color: '#6a625a', color2: '#c8c2b8', pattern: 'solid', eye: '#d9b13a', fluffy: false }
    },

    // ============ プレミアム（¥500で解放）見本 ============
    // 本リリースでは全公式品種へ拡張。ここは仕組み確認のための先行サンプル。
    // ---- 犬（プレミアム見本）----
    {
      id: 'border', species: 'dog', name: 'ボーダーコリー', rarity: 'rare', nature: 'おりこう', tier: 'premium',
      desc: '世界一かしこいといわれる牧羊犬。',
      art: { base: 'dog', ear: 'flop', color: '#2c2622', color2: '#fbf2e6', pattern: 'tuxedo', eye: '#3b2a1a', fluffy: true }
    },
    {
      id: 'frenchbull', species: 'dog', name: 'フレンチブルドッグ', rarity: 'rare', nature: 'のんびりや', tier: 'premium',
      desc: 'コウモリみたいな耳。ぷくっと愛嬌たっぷり。',
      art: { base: 'dog', ear: 'bigprick', color: '#c9b89a', color2: '#fbf2e6', pattern: 'patch', eye: '#1f1209', fluffy: false }
    },
    {
      id: 'shihtzu', species: 'dog', name: 'シーズー', rarity: 'uncommon', nature: 'あまえんぼう', tier: 'premium',
      desc: 'ながい毛とまんまる顔。おうさまの犬。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fff7ea', pattern: 'patch', eye: '#2a1d12', fluffy: true }
    },
    {
      id: 'akita', species: 'dog', name: '秋田犬', rarity: 'epic', nature: 'いちず', tier: 'premium',
      desc: '忠犬の代名詞。どっしりとした和の大型犬。',
      art: { base: 'dog', ear: 'prick', color: '#e0b074', color2: '#fbf3e8', pattern: 'tan', eye: '#3b2a1a', fluffy: true, tail: 'curl' }
    },
    {
      id: 'maltese', species: 'dog', name: 'マルチーズ', rarity: 'uncommon', nature: 'やさしい', tier: 'premium',
      desc: 'まっ白な絹のような毛なみ。',
      art: { base: 'dog', ear: 'flop', color: '#fbf6ee', color2: '#efe2cf', pattern: 'solid', eye: '#2a1d12', fluffy: true }
    },
    {
      id: 'doberman', species: 'dog', name: 'ドーベルマン', rarity: 'epic', nature: 'クール', tier: 'premium',
      desc: 'ひきしまった体。見た目はクール、じつは甘えん坊。',
      art: { base: 'dog', ear: 'prick', color: '#241c16', color2: '#a8682f', pattern: 'tan', eye: '#7a4a2b', fluffy: false }
    },
    // ---- 猫（プレミアム見本）----
    {
      id: 'norwegian', species: 'cat', name: 'ノルウェージャン', rarity: 'rare', nature: 'おっとり', tier: 'premium',
      desc: '森からきた長毛の大型猫。ふさふさの尻尾。',
      art: { base: 'cat', ear: 'prick', color: '#c8a06a', color2: '#fbf2e6', pattern: 'tabby', eye: '#9bd24a', fluffy: true }
    },
    {
      id: 'persian', species: 'cat', name: 'ペルシャ', rarity: 'epic', nature: 'のんびりや', tier: 'premium',
      desc: 'ぺたんこ顔とゴージャスな毛。猫の貴族。',
      art: { base: 'cat', ear: 'round', color: '#ece5d8', color2: '#d8c4a8', pattern: 'solid', eye: '#e8a83a', fluffy: true }
    },
    {
      id: 'abyssinian', species: 'cat', name: 'アビシニアン', rarity: 'rare', nature: 'こうきしん', tier: 'premium',
      desc: 'すらりとした体とつやめく毛。古代エジプトの面影。',
      art: { base: 'cat', ear: 'prick', color: '#b07444', color2: '#e0c08a', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'americanshort', species: 'cat', name: 'アメショー', rarity: 'uncommon', nature: 'げんきいっぱい', tier: 'premium',
      desc: '渦巻き模様の人気猫。まるくて元気。',
      art: { base: 'cat', ear: 'prick', color: '#9aa6ad', color2: '#3a4248', pattern: 'tabby', eye: '#d9b13a', fluffy: false }
    },
    {
      id: 'bombay', species: 'cat', name: 'ボンベイ', rarity: 'rare', nature: 'クール', tier: 'premium',
      desc: 'まっ黒な毛に金の瞳。小さな黒豹。',
      art: { base: 'cat', ear: 'prick', color: '#1c1814', color2: '#2a2420', pattern: 'solid', eye: '#e8a83a', fluffy: false }
    },
    {
      id: 'scottishfold2', species: 'cat', name: 'ターキッシュアンゴラ', rarity: 'epic', nature: 'きれいずき', tier: 'premium',
      desc: 'シルクのような白い長毛。優雅でしなやか。',
      art: { base: 'cat', ear: 'prick', color: '#fbf6ee', color2: '#efe2cf', pattern: 'solid', eye: '#7ab3e0', fluffy: true }
    },

    // ============ プレミアム拡張（自動生成 tools/gen_breeds.mjs。本番絵は画像で差し替え） ============
    {
      id: 'pd001', species: 'dog', name: '豆柴', rarity: 'common', nature: 'いちず', tier: 'premium',
      desc: 'いろんな表情を見せる豆柴。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd002', species: 'dog', name: '黒柴', rarity: 'common', nature: 'ひとなつっこい', tier: 'premium',
      desc: 'いろんな表情を見せる黒柴。',
      art: { base: 'dog', ear: 'flop', color: '#2c2622', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd003', species: 'dog', name: '白柴', rarity: 'uncommon', nature: 'がんばりや', tier: 'premium',
      desc: 'いろんな表情を見せる白柴。',
      art: { base: 'dog', ear: 'round', color: '#fbf6ee', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd004', species: 'dog', name: '北海道犬', rarity: 'uncommon', nature: 'おりこう', tier: 'premium',
      desc: 'いろんな表情を見せる北海道犬。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd005', species: 'dog', name: '紀州犬', rarity: 'uncommon', nature: 'こうきしん', tier: 'premium',
      desc: 'いろんな表情を見せる紀州犬。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd006', species: 'dog', name: '甲斐犬', rarity: 'rare', nature: 'げんきいっぱい', tier: 'premium',
      desc: 'いろんな表情を見せる甲斐犬。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd007', species: 'dog', name: '狆(チン)', rarity: 'rare', nature: 'のんびりや', tier: 'premium',
      desc: 'いろんな表情を見せる狆(チン)。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd008', species: 'dog', name: '土佐犬', rarity: 'epic', nature: 'ぼうけんずき', tier: 'premium',
      desc: 'いろんな表情を見せる土佐犬。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd009', species: 'dog', name: 'チャウチャウ', rarity: 'common', nature: 'クール', tier: 'premium',
      desc: 'いろんな表情を見せるチャウチャウ。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: true }
    },
    {
      id: 'pd010', species: 'dog', name: 'シャーペイ', rarity: 'uncommon', nature: 'きまぐれ', tier: 'premium',
      desc: 'いろんな表情を見せるシャーペイ。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd011', species: 'dog', name: 'チベタンマスティフ', rarity: 'rare', nature: 'きれいずき', tier: 'premium',
      desc: 'いろんな表情を見せるチベタンマスティフ。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'tan', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd012', species: 'dog', name: 'ラサアプソ', rarity: 'legendary', nature: 'あまえんぼう', tier: 'premium',
      desc: 'いろんな表情を見せるラサアプソ。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd013', species: 'dog', name: 'キースホンド', rarity: 'common', nature: 'おしゃべり', tier: 'premium',
      desc: 'いろんな表情を見せるキースホンド。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd014', species: 'dog', name: '台湾犬', rarity: 'common', nature: 'おっとり', tier: 'premium',
      desc: 'いろんな表情を見せる台湾犬。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd015', species: 'dog', name: 'カーディガンコーギー', rarity: 'uncommon', nature: 'やさしい', tier: 'premium',
      desc: 'いろんな表情を見せるカーディガンコーギー。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd016', species: 'dog', name: 'ラフコリー', rarity: 'uncommon', nature: 'いちず', tier: 'premium',
      desc: 'いろんな表情を見せるラフコリー。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: true }
    },
    {
      id: 'pd017', species: 'dog', name: 'オーストラリアンシェパード', rarity: 'uncommon', nature: 'ひとなつっこい', tier: 'premium',
      desc: 'いろんな表情を見せるオーストラリアンシェパード。',
      art: { base: 'dog', ear: 'prick', color: '#b5642f', color2: '#fbf2e6', pattern: 'tabby', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd018', species: 'dog', name: 'ジャーマンシェパード', rarity: 'rare', nature: 'がんばりや', tier: 'premium',
      desc: 'いろんな表情を見せるジャーマンシェパード。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd019', species: 'dog', name: 'ホワイトスイスシェパード', rarity: 'rare', nature: 'おりこう', tier: 'premium',
      desc: 'いろんな表情を見せるホワイトスイスシェパード。',
      art: { base: 'dog', ear: 'prick', color: '#fbf6ee', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd020', species: 'dog', name: 'ベルジアンマリノア', rarity: 'epic', nature: 'こうきしん', tier: 'premium',
      desc: 'いろんな表情を見せるベルジアンマリノア。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd021', species: 'dog', name: 'ベルジアングローネンダール', rarity: 'common', nature: 'げんきいっぱい', tier: 'premium',
      desc: 'いろんな表情を見せるベルジアングローネンダール。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd022', species: 'dog', name: 'ベルジアンタービュレン', rarity: 'uncommon', nature: 'のんびりや', tier: 'premium',
      desc: 'いろんな表情を見せるベルジアンタービュレン。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd023', species: 'dog', name: 'ボースロン', rarity: 'rare', nature: 'ぼうけんずき', tier: 'premium',
      desc: 'いろんな表情を見せるボースロン。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd024', species: 'dog', name: 'ブリアード', rarity: 'legendary', nature: 'クール', tier: 'premium',
      desc: 'いろんな表情を見せるブリアード。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd025', species: 'dog', name: 'オールドイングリッシュシープドッグ', rarity: 'common', nature: 'きまぐれ', tier: 'premium',
      desc: 'いろんな表情を見せるオールドイングリッシュシープドッグ。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: true }
    },
    {
      id: 'pd026', species: 'dog', name: 'プーリー', rarity: 'common', nature: 'きれいずき', tier: 'premium',
      desc: 'いろんな表情を見せるプーリー。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd027', species: 'dog', name: 'コモンドール', rarity: 'uncommon', nature: 'あまえんぼう', tier: 'premium',
      desc: 'いろんな表情を見せるコモンドール。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd028', species: 'dog', name: 'グレータースイスマウンテンドッグ', rarity: 'uncommon', nature: 'おしゃべり', tier: 'premium',
      desc: 'いろんな表情を見せるグレータースイスマウンテンドッグ。',
      art: { base: 'dog', ear: 'bigprick', color: '#8a9aa5', color2: '#fbf2e6', pattern: 'spot', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd029', species: 'dog', name: 'グレートピレニーズ', rarity: 'uncommon', nature: 'おっとり', tier: 'premium',
      desc: 'いろんな表情を見せるグレートピレニーズ。',
      art: { base: 'dog', ear: 'prick', color: '#8a9aa5', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: true }
    },
    {
      id: 'pd030', species: 'dog', name: 'マレンマシープドッグ', rarity: 'rare', nature: 'やさしい', tier: 'premium',
      desc: 'いろんな表情を見せるマレンマシープドッグ。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: true }
    },
    {
      id: 'pd031', species: 'dog', name: 'アナトリアンシェパード', rarity: 'rare', nature: 'いちず', tier: 'premium',
      desc: 'いろんな表情を見せるアナトリアンシェパード。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd032', species: 'dog', name: 'カンガール', rarity: 'epic', nature: 'ひとなつっこい', tier: 'premium',
      desc: 'いろんな表情を見せるカンガール。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd033', species: 'dog', name: 'コーカシアンシェパード', rarity: 'common', nature: 'がんばりや', tier: 'premium',
      desc: 'いろんな表情を見せるコーカシアンシェパード。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd034', species: 'dog', name: '中央アジアンシェパード', rarity: 'uncommon', nature: 'おりこう', tier: 'premium',
      desc: 'いろんな表情を見せる中央アジアンシェパード。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd035', species: 'dog', name: 'クバース', rarity: 'rare', nature: 'こうきしん', tier: 'premium',
      desc: 'いろんな表情を見せるクバース。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd036', species: 'dog', name: 'オーストラリアンキャトルドッグ', rarity: 'legendary', nature: 'げんきいっぱい', tier: 'premium',
      desc: 'いろんな表情を見せるオーストラリアンキャトルドッグ。',
      art: { base: 'dog', ear: 'bigprick', color: '#b5642f', color2: '#fbf2e6', pattern: 'tabby', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd037', species: 'dog', name: 'オーストラリアンケルピー', rarity: 'common', nature: 'のんびりや', tier: 'premium',
      desc: 'いろんな表情を見せるオーストラリアンケルピー。',
      art: { base: 'dog', ear: 'prick', color: '#b5642f', color2: '#fbf2e6', pattern: 'tabby', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd038', species: 'dog', name: 'ダッチシェパード', rarity: 'common', nature: 'ぼうけんずき', tier: 'premium',
      desc: 'いろんな表情を見せるダッチシェパード。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd039', species: 'dog', name: 'アイスランドシープドッグ', rarity: 'uncommon', nature: 'クール', tier: 'premium',
      desc: 'いろんな表情を見せるアイスランドシープドッグ。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: true }
    },
    {
      id: 'pd040', species: 'dog', name: 'ウェルシュシープドッグ', rarity: 'uncommon', nature: 'きまぐれ', tier: 'premium',
      desc: 'いろんな表情を見せるウェルシュシープドッグ。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: true }
    },
    {
      id: 'pd041', species: 'dog', name: 'パーソンラッセル', rarity: 'uncommon', nature: 'きれいずき', tier: 'premium',
      desc: 'いろんな表情を見せるパーソンラッセル。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd042', species: 'dog', name: 'シュナウザー(ミニチュア)', rarity: 'rare', nature: 'あまえんぼう', tier: 'premium',
      desc: 'いろんな表情を見せるシュナウザー(ミニチュア)。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd043', species: 'dog', name: 'ジャイアントシュナウザー', rarity: 'rare', nature: 'おしゃべり', tier: 'premium',
      desc: 'いろんな表情を見せるジャイアントシュナウザー。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd044', species: 'dog', name: 'ウェストハイランドホワイトテリア', rarity: 'epic', nature: 'おっとり', tier: 'premium',
      desc: 'いろんな表情を見せるウェストハイランドホワイトテリア。',
      art: { base: 'dog', ear: 'bigprick', color: '#fbf6ee', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd045', species: 'dog', name: 'ケアーンテリア', rarity: 'common', nature: 'やさしい', tier: 'premium',
      desc: 'いろんな表情を見せるケアーンテリア。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd046', species: 'dog', name: 'スコティッシュテリア', rarity: 'uncommon', nature: 'いちず', tier: 'premium',
      desc: 'いろんな表情を見せるスコティッシュテリア。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd047', species: 'dog', name: 'ノーフォークテリア', rarity: 'rare', nature: 'ひとなつっこい', tier: 'premium',
      desc: 'いろんな表情を見せるノーフォークテリア。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd048', species: 'dog', name: 'ノーリッチテリア', rarity: 'legendary', nature: 'がんばりや', tier: 'premium',
      desc: 'いろんな表情を見せるノーリッチテリア。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd049', species: 'dog', name: 'ボーダーテリア', rarity: 'common', nature: 'おりこう', tier: 'premium',
      desc: 'いろんな表情を見せるボーダーテリア。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd050', species: 'dog', name: 'エアデールテリア', rarity: 'common', nature: 'こうきしん', tier: 'premium',
      desc: 'いろんな表情を見せるエアデールテリア。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd051', species: 'dog', name: 'アイリッシュテリア', rarity: 'uncommon', nature: 'げんきいっぱい', tier: 'premium',
      desc: 'いろんな表情を見せるアイリッシュテリア。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd052', species: 'dog', name: 'ケリーブルーテリア', rarity: 'uncommon', nature: 'のんびりや', tier: 'premium',
      desc: 'いろんな表情を見せるケリーブルーテリア。',
      art: { base: 'dog', ear: 'bigprick', color: '#8a9aa5', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd053', species: 'dog', name: 'ソフトコーテッドウィートンテリア', rarity: 'uncommon', nature: 'ぼうけんずき', tier: 'premium',
      desc: 'いろんな表情を見せるソフトコーテッドウィートンテリア。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd054', species: 'dog', name: 'ベドリントンテリア', rarity: 'rare', nature: 'クール', tier: 'premium',
      desc: 'いろんな表情を見せるベドリントンテリア。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd055', species: 'dog', name: 'フォックステリア(スムース)', rarity: 'rare', nature: 'きまぐれ', tier: 'premium',
      desc: 'いろんな表情を見せるフォックステリア(スムース)。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd056', species: 'dog', name: 'フォックステリア(ワイヤー)', rarity: 'epic', nature: 'きれいずき', tier: 'premium',
      desc: 'いろんな表情を見せるフォックステリア(ワイヤー)。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd057', species: 'dog', name: 'ブルテリア', rarity: 'common', nature: 'あまえんぼう', tier: 'premium',
      desc: 'いろんな表情を見せるブルテリア。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd058', species: 'dog', name: 'ミニチュアブルテリア', rarity: 'uncommon', nature: 'おしゃべり', tier: 'premium',
      desc: 'いろんな表情を見せるミニチュアブルテリア。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd059', species: 'dog', name: 'スタッフォードシャーブルテリア', rarity: 'rare', nature: 'おっとり', tier: 'premium',
      desc: 'いろんな表情を見せるスタッフォードシャーブルテリア。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd060', species: 'dog', name: 'アメリカンスタッフォードシャーテリア', rarity: 'legendary', nature: 'やさしい', tier: 'premium',
      desc: 'いろんな表情を見せるアメリカンスタッフォードシャーテリア。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd061', species: 'dog', name: 'ラットテリア', rarity: 'common', nature: 'いちず', tier: 'premium',
      desc: 'いろんな表情を見せるラットテリア。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd062', species: 'dog', name: 'シーリハムテリア', rarity: 'common', nature: 'ひとなつっこい', tier: 'premium',
      desc: 'いろんな表情を見せるシーリハムテリア。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd063', species: 'dog', name: 'オーストラリアンテリア', rarity: 'uncommon', nature: 'がんばりや', tier: 'premium',
      desc: 'いろんな表情を見せるオーストラリアンテリア。',
      art: { base: 'dog', ear: 'round', color: '#b5642f', color2: '#fbf2e6', pattern: 'tabby', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd064', species: 'dog', name: 'オーストラリアンシルキーテリア', rarity: 'uncommon', nature: 'おりこう', tier: 'premium',
      desc: 'いろんな表情を見せるオーストラリアンシルキーテリア。',
      art: { base: 'dog', ear: 'bigprick', color: '#b5642f', color2: '#fbf2e6', pattern: 'tabby', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd065', species: 'dog', name: 'ウェルシュテリア', rarity: 'uncommon', nature: 'こうきしん', tier: 'premium',
      desc: 'いろんな表情を見せるウェルシュテリア。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd066', species: 'dog', name: 'チワワ(スムース)', rarity: 'rare', nature: 'げんきいっぱい', tier: 'premium',
      desc: 'いろんな表情を見せるチワワ(スムース)。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd067', species: 'dog', name: 'チワワ(ロング)', rarity: 'rare', nature: 'のんびりや', tier: 'premium',
      desc: 'いろんな表情を見せるチワワ(ロング)。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd068', species: 'dog', name: 'イタリアングレーハウンド', rarity: 'epic', nature: 'ぼうけんずき', tier: 'premium',
      desc: 'いろんな表情を見せるイタリアングレーハウンド。',
      art: { base: 'dog', ear: 'flop', color: '#8a9aa5', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd069', species: 'dog', name: 'ハバニーズ', rarity: 'common', nature: 'クール', tier: 'premium',
      desc: 'いろんな表情を見せるハバニーズ。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd070', species: 'dog', name: 'ボロニーズ', rarity: 'uncommon', nature: 'きまぐれ', tier: 'premium',
      desc: 'いろんな表情を見せるボロニーズ。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd071', species: 'dog', name: 'ローシェン', rarity: 'rare', nature: 'きれいずき', tier: 'premium',
      desc: 'いろんな表情を見せるローシェン。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd072', species: 'dog', name: 'グリフォンブリュッセル', rarity: 'legendary', nature: 'あまえんぼう', tier: 'premium',
      desc: 'いろんな表情を見せるグリフォンブリュッセル。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd073', species: 'dog', name: 'キングチャールズスパニエル', rarity: 'common', nature: 'おしゃべり', tier: 'premium',
      desc: 'いろんな表情を見せるキングチャールズスパニエル。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd074', species: 'dog', name: 'チャイニーズクレステッド', rarity: 'common', nature: 'おっとり', tier: 'premium',
      desc: 'いろんな表情を見せるチャイニーズクレステッド。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd075', species: 'dog', name: 'ジャパニーズスピッツ(トイ)', rarity: 'uncommon', nature: 'やさしい', tier: 'premium',
      desc: 'いろんな表情を見せるジャパニーズスピッツ(トイ)。',
      art: { base: 'dog', ear: 'prick', color: '#fbf6ee', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: true }
    },
    {
      id: 'pd076', species: 'dog', name: 'スタンダードプードル', rarity: 'uncommon', nature: 'いちず', tier: 'premium',
      desc: 'いろんな表情を見せるスタンダードプードル。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'tan', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd077', species: 'dog', name: 'ミディアムプードル', rarity: 'uncommon', nature: 'ひとなつっこい', tier: 'premium',
      desc: 'いろんな表情を見せるミディアムプードル。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd078', species: 'dog', name: 'ゴールデンドゥードル', rarity: 'rare', nature: 'がんばりや', tier: 'premium',
      desc: 'いろんな表情を見せるゴールデンドゥードル。',
      art: { base: 'dog', ear: 'flop', color: '#e8c87a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd079', species: 'dog', name: 'ラブラドゥードル', rarity: 'rare', nature: 'おりこう', tier: 'premium',
      desc: 'いろんな表情を見せるラブラドゥードル。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd080', species: 'dog', name: 'コッカープー', rarity: 'epic', nature: 'こうきしん', tier: 'premium',
      desc: 'いろんな表情を見せるコッカープー。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd081', species: 'dog', name: 'マルプー', rarity: 'common', nature: 'げんきいっぱい', tier: 'premium',
      desc: 'いろんな表情を見せるマルプー。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd082', species: 'dog', name: 'ポメプー', rarity: 'uncommon', nature: 'のんびりや', tier: 'premium',
      desc: 'いろんな表情を見せるポメプー。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: true }
    },
    {
      id: 'pd083', species: 'dog', name: 'チワプー', rarity: 'rare', nature: 'ぼうけんずき', tier: 'premium',
      desc: 'いろんな表情を見せるチワプー。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd084', species: 'dog', name: 'ポンスキー', rarity: 'legendary', nature: 'クール', tier: 'premium',
      desc: 'いろんな表情を見せるポンスキー。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd085', species: 'dog', name: '柴プー', rarity: 'common', nature: 'きまぐれ', tier: 'premium',
      desc: 'いろんな表情を見せる柴プー。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd086', species: 'dog', name: 'ペキニーズ', rarity: 'common', nature: 'きれいずき', tier: 'premium',
      desc: 'いろんな表情を見せるペキニーズ。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd087', species: 'dog', name: 'プチブラバンソン', rarity: 'uncommon', nature: 'あまえんぼう', tier: 'premium',
      desc: 'いろんな表情を見せるプチブラバンソン。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd088', species: 'dog', name: 'コトンドテュレアール', rarity: 'uncommon', nature: 'おしゃべり', tier: 'premium',
      desc: 'いろんな表情を見せるコトンドテュレアール。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd089', species: 'dog', name: 'ラブラドール(イエロー)', rarity: 'uncommon', nature: 'おっとり', tier: 'premium',
      desc: 'いろんな表情を見せるラブラドール(イエロー)。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd090', species: 'dog', name: '黒ラブ', rarity: 'rare', nature: 'やさしい', tier: 'premium',
      desc: 'いろんな表情を見せる黒ラブ。',
      art: { base: 'dog', ear: 'flop', color: '#2c2622', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd091', species: 'dog', name: 'チョコラブ', rarity: 'rare', nature: 'いちず', tier: 'premium',
      desc: 'いろんな表情を見せるチョコラブ。',
      art: { base: 'dog', ear: 'round', color: '#5a4a3a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd092', species: 'dog', name: 'フラットコーテッドレトリバー', rarity: 'epic', nature: 'ひとなつっこい', tier: 'premium',
      desc: 'いろんな表情を見せるフラットコーテッドレトリバー。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd093', species: 'dog', name: 'カーリーコーテッドレトリバー', rarity: 'common', nature: 'がんばりや', tier: 'premium',
      desc: 'いろんな表情を見せるカーリーコーテッドレトリバー。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd094', species: 'dog', name: 'チェサピークベイレトリバー', rarity: 'uncommon', nature: 'おりこう', tier: 'premium',
      desc: 'いろんな表情を見せるチェサピークベイレトリバー。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd095', species: 'dog', name: 'ノヴァスコシアダックトーリング', rarity: 'rare', nature: 'こうきしん', tier: 'premium',
      desc: 'いろんな表情を見せるノヴァスコシアダックトーリング。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd096', species: 'dog', name: 'イングリッシュコッカースパニエル', rarity: 'legendary', nature: 'げんきいっぱい', tier: 'premium',
      desc: 'いろんな表情を見せるイングリッシュコッカースパニエル。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd097', species: 'dog', name: 'アメリカンコッカースパニエル', rarity: 'common', nature: 'のんびりや', tier: 'premium',
      desc: 'いろんな表情を見せるアメリカンコッカースパニエル。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd098', species: 'dog', name: 'イングリッシュスプリンガースパニエル', rarity: 'common', nature: 'ぼうけんずき', tier: 'premium',
      desc: 'いろんな表情を見せるイングリッシュスプリンガースパニエル。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd099', species: 'dog', name: 'ウェルシュスプリンガースパニエル', rarity: 'uncommon', nature: 'クール', tier: 'premium',
      desc: 'いろんな表情を見せるウェルシュスプリンガースパニエル。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd100', species: 'dog', name: 'クランバースパニエル', rarity: 'uncommon', nature: 'きまぐれ', tier: 'premium',
      desc: 'いろんな表情を見せるクランバースパニエル。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd101', species: 'dog', name: 'ブリタニースパニエル', rarity: 'uncommon', nature: 'きれいずき', tier: 'premium',
      desc: 'いろんな表情を見せるブリタニースパニエル。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd102', species: 'dog', name: 'ポインター', rarity: 'rare', nature: 'あまえんぼう', tier: 'premium',
      desc: 'いろんな表情を見せるポインター。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd103', species: 'dog', name: 'ジャーマンショートヘアードポインター', rarity: 'rare', nature: 'おしゃべり', tier: 'premium',
      desc: 'いろんな表情を見せるジャーマンショートヘアードポインター。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd104', species: 'dog', name: 'ジャーマンワイヤーヘアードポインター', rarity: 'epic', nature: 'おっとり', tier: 'premium',
      desc: 'いろんな表情を見せるジャーマンワイヤーヘアードポインター。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd105', species: 'dog', name: 'ワイマラナー', rarity: 'common', nature: 'やさしい', tier: 'premium',
      desc: 'いろんな表情を見せるワイマラナー。',
      art: { base: 'dog', ear: 'prick', color: '#8a9aa5', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd106', species: 'dog', name: 'ビズラ', rarity: 'uncommon', nature: 'いちず', tier: 'premium',
      desc: 'いろんな表情を見せるビズラ。',
      art: { base: 'dog', ear: 'flop', color: '#b5642f', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd107', species: 'dog', name: 'スピノーネイタリアーノ', rarity: 'rare', nature: 'ひとなつっこい', tier: 'premium',
      desc: 'いろんな表情を見せるスピノーネイタリアーノ。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd108', species: 'dog', name: 'イングリッシュセッター', rarity: 'legendary', nature: 'がんばりや', tier: 'premium',
      desc: 'いろんな表情を見せるイングリッシュセッター。',
      art: { base: 'dog', ear: 'flop', color: '#b5642f', color2: '#fbf2e6', pattern: 'tan', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd109', species: 'dog', name: 'ゴードンセッター', rarity: 'common', nature: 'おりこう', tier: 'premium',
      desc: 'いろんな表情を見せるゴードンセッター。',
      art: { base: 'dog', ear: 'flop', color: '#b5642f', color2: '#fbf2e6', pattern: 'tan', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd110', species: 'dog', name: 'アイリッシュセッター', rarity: 'common', nature: 'こうきしん', tier: 'premium',
      desc: 'いろんな表情を見せるアイリッシュセッター。',
      art: { base: 'dog', ear: 'flop', color: '#b5642f', color2: '#fbf2e6', pattern: 'tan', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd111', species: 'dog', name: 'ラゴットロマーニョロ', rarity: 'uncommon', nature: 'げんきいっぱい', tier: 'premium',
      desc: 'いろんな表情を見せるラゴットロマーニョロ。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd112', species: 'dog', name: 'ポーチュギーズウォータードッグ', rarity: 'uncommon', nature: 'のんびりや', tier: 'premium',
      desc: 'いろんな表情を見せるポーチュギーズウォータードッグ。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd113', species: 'dog', name: 'バルビー', rarity: 'uncommon', nature: 'ぼうけんずき', tier: 'premium',
      desc: 'いろんな表情を見せるバルビー。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd114', species: 'dog', name: 'コーイケルホンディエ', rarity: 'rare', nature: 'クール', tier: 'premium',
      desc: 'いろんな表情を見せるコーイケルホンディエ。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd115', species: 'dog', name: 'スパニッシュウォータードッグ', rarity: 'rare', nature: 'きまぐれ', tier: 'premium',
      desc: 'いろんな表情を見せるスパニッシュウォータードッグ。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd116', species: 'dog', name: 'アイリッシュウォータースパニエル', rarity: 'epic', nature: 'きれいずき', tier: 'premium',
      desc: 'いろんな表情を見せるアイリッシュウォータースパニエル。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd117', species: 'dog', name: 'フィールドスパニエル', rarity: 'common', nature: 'あまえんぼう', tier: 'premium',
      desc: 'いろんな表情を見せるフィールドスパニエル。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd118', species: 'dog', name: '狼犬(ウルフドッグ)', rarity: 'uncommon', nature: 'おしゃべり', tier: 'premium',
      desc: 'いろんな表情を見せる狼犬(ウルフドッグ)。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd119', species: 'dog', name: 'アラスカンマラミュート', rarity: 'rare', nature: 'おっとり', tier: 'premium',
      desc: 'いろんな表情を見せるアラスカンマラミュート。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd120', species: 'dog', name: 'アラスカンクリーカイ', rarity: 'legendary', nature: 'やさしい', tier: 'premium',
      desc: 'いろんな表情を見せるアラスカンクリーカイ。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd121', species: 'dog', name: 'シベリアンハスキー(レッド)', rarity: 'common', nature: 'いちず', tier: 'premium',
      desc: 'いろんな表情を見せるシベリアンハスキー(レッド)。',
      art: { base: 'dog', ear: 'prick', color: '#b5642f', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd122', species: 'dog', name: 'ノルウェジアンエルクハウンド', rarity: 'common', nature: 'ひとなつっこい', tier: 'premium',
      desc: 'いろんな表情を見せるノルウェジアンエルクハウンド。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: true }
    },
    {
      id: 'pd123', species: 'dog', name: 'フィニッシュスピッツ', rarity: 'uncommon', nature: 'がんばりや', tier: 'premium',
      desc: 'いろんな表情を見せるフィニッシュスピッツ。',
      art: { base: 'dog', ear: 'prick', color: '#fbf6ee', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: true }
    },
    {
      id: 'pd124', species: 'dog', name: 'グレーハウンド', rarity: 'uncommon', nature: 'おりこう', tier: 'premium',
      desc: 'いろんな表情を見せるグレーハウンド。',
      art: { base: 'dog', ear: 'flop', color: '#8a9aa5', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd125', species: 'dog', name: 'アフガンハウンド', rarity: 'uncommon', nature: 'こうきしん', tier: 'premium',
      desc: 'いろんな表情を見せるアフガンハウンド。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd126', species: 'dog', name: 'サルーキ', rarity: 'rare', nature: 'げんきいっぱい', tier: 'premium',
      desc: 'いろんな表情を見せるサルーキ。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd127', species: 'dog', name: 'ボルゾイ', rarity: 'rare', nature: 'のんびりや', tier: 'premium',
      desc: 'いろんな表情を見せるボルゾイ。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd128', species: 'dog', name: 'アイリッシュウルフハウンド', rarity: 'epic', nature: 'ぼうけんずき', tier: 'premium',
      desc: 'いろんな表情を見せるアイリッシュウルフハウンド。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd129', species: 'dog', name: 'スコティッシュディアハウンド', rarity: 'common', nature: 'クール', tier: 'premium',
      desc: 'いろんな表情を見せるスコティッシュディアハウンド。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd130', species: 'dog', name: 'バセンジー', rarity: 'uncommon', nature: 'きまぐれ', tier: 'premium',
      desc: 'いろんな表情を見せるバセンジー。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd131', species: 'dog', name: 'ファラオハウンド', rarity: 'rare', nature: 'きれいずき', tier: 'premium',
      desc: 'いろんな表情を見せるファラオハウンド。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd132', species: 'dog', name: 'イビザンハウンド', rarity: 'legendary', nature: 'あまえんぼう', tier: 'premium',
      desc: 'いろんな表情を見せるイビザンハウンド。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd133', species: 'dog', name: 'バセットハウンド', rarity: 'common', nature: 'おしゃべり', tier: 'premium',
      desc: 'いろんな表情を見せるバセットハウンド。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd134', species: 'dog', name: 'ブラッドハウンド', rarity: 'common', nature: 'おっとり', tier: 'premium',
      desc: 'いろんな表情を見せるブラッドハウンド。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd135', species: 'dog', name: 'ローデシアンリッジバック', rarity: 'uncommon', nature: 'やさしい', tier: 'premium',
      desc: 'いろんな表情を見せるローデシアンリッジバック。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd136', species: 'dog', name: 'プチバセットグリフォンバンデーン', rarity: 'uncommon', nature: 'いちず', tier: 'premium',
      desc: 'いろんな表情を見せるプチバセットグリフォンバンデーン。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd137', species: 'dog', name: 'オッターハウンド', rarity: 'uncommon', nature: 'ひとなつっこい', tier: 'premium',
      desc: 'いろんな表情を見せるオッターハウンド。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd138', species: 'dog', name: 'ダックス(ロング)', rarity: 'rare', nature: 'がんばりや', tier: 'premium',
      desc: 'いろんな表情を見せるダックス(ロング)。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd139', species: 'dog', name: 'ダックス(ワイヤー)', rarity: 'rare', nature: 'おりこう', tier: 'premium',
      desc: 'いろんな表情を見せるダックス(ワイヤー)。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd140', species: 'dog', name: 'アザワク', rarity: 'epic', nature: 'こうきしん', tier: 'premium',
      desc: 'いろんな表情を見せるアザワク。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd141', species: 'dog', name: 'スルーギ', rarity: 'common', nature: 'げんきいっぱい', tier: 'premium',
      desc: 'いろんな表情を見せるスルーギ。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd142', species: 'dog', name: 'ボクサー', rarity: 'uncommon', nature: 'のんびりや', tier: 'premium',
      desc: 'いろんな表情を見せるボクサー。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd143', species: 'dog', name: 'ロットワイラー', rarity: 'rare', nature: 'ぼうけんずき', tier: 'premium',
      desc: 'いろんな表情を見せるロットワイラー。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd144', species: 'dog', name: 'ニューファンドランド', rarity: 'legendary', nature: 'クール', tier: 'premium',
      desc: 'いろんな表情を見せるニューファンドランド。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd145', species: 'dog', name: 'ランドシーア', rarity: 'common', nature: 'きまぐれ', tier: 'premium',
      desc: 'いろんな表情を見せるランドシーア。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd146', species: 'dog', name: 'レオンベルガー', rarity: 'common', nature: 'きれいずき', tier: 'premium',
      desc: 'いろんな表情を見せるレオンベルガー。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: true }
    },
    {
      id: 'pd147', species: 'dog', name: 'マスティフ(イングリッシュ)', rarity: 'uncommon', nature: 'あまえんぼう', tier: 'premium',
      desc: 'いろんな表情を見せるマスティフ(イングリッシュ)。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd148', species: 'dog', name: 'ブルマスティフ', rarity: 'uncommon', nature: 'おしゃべり', tier: 'premium',
      desc: 'いろんな表情を見せるブルマスティフ。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd149', species: 'dog', name: 'ナポリタンマスティフ', rarity: 'uncommon', nature: 'おっとり', tier: 'premium',
      desc: 'いろんな表情を見せるナポリタンマスティフ。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'tan', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd150', species: 'dog', name: 'スパニッシュマスティフ', rarity: 'rare', nature: 'やさしい', tier: 'premium',
      desc: 'いろんな表情を見せるスパニッシュマスティフ。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd151', species: 'dog', name: 'ボルドーマスティフ', rarity: 'rare', nature: 'いちず', tier: 'premium',
      desc: 'いろんな表情を見せるボルドーマスティフ。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd152', species: 'dog', name: 'カネコルソ', rarity: 'epic', nature: 'ひとなつっこい', tier: 'premium',
      desc: 'いろんな表情を見せるカネコルソ。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd153', species: 'dog', name: 'プレサカナリオ', rarity: 'common', nature: 'がんばりや', tier: 'premium',
      desc: 'いろんな表情を見せるプレサカナリオ。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd154', species: 'dog', name: 'ドゴアルヘンティーノ', rarity: 'uncommon', nature: 'おりこう', tier: 'premium',
      desc: 'いろんな表情を見せるドゴアルヘンティーノ。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd155', species: 'dog', name: 'フィラブラジレイロ', rarity: 'rare', nature: 'こうきしん', tier: 'premium',
      desc: 'いろんな表情を見せるフィラブラジレイロ。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd156', species: 'dog', name: 'ボアボエル', rarity: 'legendary', nature: 'げんきいっぱい', tier: 'premium',
      desc: 'いろんな表情を見せるボアボエル。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd157', species: 'dog', name: 'トサ', rarity: 'common', nature: 'のんびりや', tier: 'premium',
      desc: 'いろんな表情を見せるトサ。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd158', species: 'dog', name: 'アメリカンブリー', rarity: 'common', nature: 'ぼうけんずき', tier: 'premium',
      desc: 'いろんな表情を見せるアメリカンブリー。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd159', species: 'dog', name: 'アメリカンブルドッグ', rarity: 'uncommon', nature: 'クール', tier: 'premium',
      desc: 'いろんな表情を見せるアメリカンブルドッグ。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd160', species: 'dog', name: 'ジャーマンピンシャー', rarity: 'uncommon', nature: 'きまぐれ', tier: 'premium',
      desc: 'いろんな表情を見せるジャーマンピンシャー。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd161', species: 'dog', name: 'ミニチュアピンシャー', rarity: 'uncommon', nature: 'きれいずき', tier: 'premium',
      desc: 'いろんな表情を見せるミニチュアピンシャー。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd162', species: 'dog', name: 'アーフェンピンシャー', rarity: 'rare', nature: 'あまえんぼう', tier: 'premium',
      desc: 'いろんな表情を見せるアーフェンピンシャー。',
      art: { base: 'dog', ear: 'flop', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd163', species: 'dog', name: 'ホヴァバルト', rarity: 'rare', nature: 'おしゃべり', tier: 'premium',
      desc: 'いろんな表情を見せるホヴァバルト。',
      art: { base: 'dog', ear: 'round', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pd164', species: 'dog', name: 'ブービエデフランダース', rarity: 'epic', nature: 'おっとり', tier: 'premium',
      desc: 'いろんな表情を見せるブービエデフランダース。',
      art: { base: 'dog', ear: 'bigprick', color: '#d8b88a', color2: '#fbf2e6', pattern: 'solid', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'pc001', species: 'cat', name: 'スコティッシュストレート', rarity: 'common', nature: 'いちず', tier: 'premium',
      desc: 'きまぐれでかわいいスコティッシュストレート。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc002', species: 'cat', name: 'マンチカン(長毛)', rarity: 'common', nature: 'ひとなつっこい', tier: 'premium',
      desc: 'きまぐれでかわいいマンチカン(長毛)。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: true }
    },
    {
      id: 'pc003', species: 'cat', name: 'ブリティッシュショートヘア', rarity: 'uncommon', nature: 'がんばりや', tier: 'premium',
      desc: 'きまぐれでかわいいブリティッシュショートヘア。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc004', species: 'cat', name: 'エキゾチックショートヘア', rarity: 'uncommon', nature: 'おりこう', tier: 'premium',
      desc: 'きまぐれでかわいいエキゾチックショートヘア。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc005', species: 'cat', name: 'ノルウェージャンフォレスト', rarity: 'uncommon', nature: 'こうきしん', tier: 'premium',
      desc: 'きまぐれでかわいいノルウェージャンフォレスト。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: true }
    },
    {
      id: 'pc006', species: 'cat', name: 'アメリカンショートヘア', rarity: 'rare', nature: 'げんきいっぱい', tier: 'premium',
      desc: 'きまぐれでかわいいアメリカンショートヘア。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc007', species: 'cat', name: 'ブリティッシュロングヘア', rarity: 'rare', nature: 'のんびりや', tier: 'premium',
      desc: 'きまぐれでかわいいブリティッシュロングヘア。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc008', species: 'cat', name: 'バーマン(聖バーマン)', rarity: 'epic', nature: 'ぼうけんずき', tier: 'premium',
      desc: 'きまぐれでかわいいバーマン(聖バーマン)。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'point', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc009', species: 'cat', name: 'ヒマラヤン', rarity: 'common', nature: 'クール', tier: 'premium',
      desc: 'きまぐれでかわいいヒマラヤン。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'point', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc010', species: 'cat', name: 'バリニーズ', rarity: 'uncommon', nature: 'きまぐれ', tier: 'premium',
      desc: 'きまぐれでかわいいバリニーズ。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc011', species: 'cat', name: 'ジャワニーズ', rarity: 'rare', nature: 'きれいずき', tier: 'premium',
      desc: 'きまぐれでかわいいジャワニーズ。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc012', species: 'cat', name: 'オリエンタルショートヘア', rarity: 'legendary', nature: 'あまえんぼう', tier: 'premium',
      desc: 'きまぐれでかわいいオリエンタルショートヘア。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc013', species: 'cat', name: 'オリエンタルロングヘア', rarity: 'common', nature: 'おしゃべり', tier: 'premium',
      desc: 'きまぐれでかわいいオリエンタルロングヘア。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc014', species: 'cat', name: 'シャルトリュー', rarity: 'common', nature: 'おっとり', tier: 'premium',
      desc: 'きまぐれでかわいいシャルトリュー。',
      art: { base: 'cat', ear: 'prick', color: '#8a9aa5', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc015', species: 'cat', name: 'ネベロング', rarity: 'uncommon', nature: 'やさしい', tier: 'premium',
      desc: 'きまぐれでかわいいネベロング。',
      art: { base: 'cat', ear: 'prick', color: '#8a9aa5', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc016', species: 'cat', name: 'コーニッシュレックス', rarity: 'uncommon', nature: 'いちず', tier: 'premium',
      desc: 'きまぐれでかわいいコーニッシュレックス。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc017', species: 'cat', name: 'ジャーマンレックス', rarity: 'uncommon', nature: 'ひとなつっこい', tier: 'premium',
      desc: 'きまぐれでかわいいジャーマンレックス。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc018', species: 'cat', name: 'ラパーマ', rarity: 'rare', nature: 'がんばりや', tier: 'premium',
      desc: 'きまぐれでかわいいラパーマ。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc019', species: 'cat', name: 'アメリカンワイヤーヘア', rarity: 'rare', nature: 'おりこう', tier: 'premium',
      desc: 'きまぐれでかわいいアメリカンワイヤーヘア。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc020', species: 'cat', name: 'アメリカンカール', rarity: 'epic', nature: 'こうきしん', tier: 'premium',
      desc: 'きまぐれでかわいいアメリカンカール。',
      art: { base: 'cat', ear: 'round', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc021', species: 'cat', name: 'ジャパニーズボブテイル', rarity: 'common', nature: 'げんきいっぱい', tier: 'premium',
      desc: 'きまぐれでかわいいジャパニーズボブテイル。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc022', species: 'cat', name: 'クリリアンボブテイル', rarity: 'uncommon', nature: 'のんびりや', tier: 'premium',
      desc: 'きまぐれでかわいいクリリアンボブテイル。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc023', species: 'cat', name: 'アメリカンボブテイル', rarity: 'rare', nature: 'ぼうけんずき', tier: 'premium',
      desc: 'きまぐれでかわいいアメリカンボブテイル。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc024', species: 'cat', name: 'ピクシーボブ', rarity: 'legendary', nature: 'クール', tier: 'premium',
      desc: 'きまぐれでかわいいピクシーボブ。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc025', species: 'cat', name: 'キムリック', rarity: 'common', nature: 'きまぐれ', tier: 'premium',
      desc: 'きまぐれでかわいいキムリック。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc026', species: 'cat', name: 'マンクス', rarity: 'common', nature: 'きれいずき', tier: 'premium',
      desc: 'きまぐれでかわいいマンクス。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc027', species: 'cat', name: 'トイガー', rarity: 'uncommon', nature: 'あまえんぼう', tier: 'premium',
      desc: 'きまぐれでかわいいトイガー。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc028', species: 'cat', name: 'サバンナ', rarity: 'uncommon', nature: 'おしゃべり', tier: 'premium',
      desc: 'きまぐれでかわいいサバンナ。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc029', species: 'cat', name: 'シャウジー', rarity: 'uncommon', nature: 'おっとり', tier: 'premium',
      desc: 'きまぐれでかわいいシャウジー。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc030', species: 'cat', name: 'セレンゲティ', rarity: 'rare', nature: 'やさしい', tier: 'premium',
      desc: 'きまぐれでかわいいセレンゲティ。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc031', species: 'cat', name: 'ターキッシュバン', rarity: 'rare', nature: 'いちず', tier: 'premium',
      desc: 'きまぐれでかわいいターキッシュバン。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc032', species: 'cat', name: 'ドンスコイ', rarity: 'epic', nature: 'ひとなつっこい', tier: 'premium',
      desc: 'きまぐれでかわいいドンスコイ。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc033', species: 'cat', name: 'ピーターボールド', rarity: 'common', nature: 'がんばりや', tier: 'premium',
      desc: 'きまぐれでかわいいピーターボールド。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc034', species: 'cat', name: 'ミヌエット(ナポレオン)', rarity: 'uncommon', nature: 'おりこう', tier: 'premium',
      desc: 'きまぐれでかわいいミヌエット(ナポレオン)。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc035', species: 'cat', name: 'キンカロー', rarity: 'rare', nature: 'こうきしん', tier: 'premium',
      desc: 'きまぐれでかわいいキンカロー。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc036', species: 'cat', name: 'ハイランドフォールド', rarity: 'legendary', nature: 'げんきいっぱい', tier: 'premium',
      desc: 'きまぐれでかわいいハイランドフォールド。',
      art: { base: 'cat', ear: 'fold', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc037', species: 'cat', name: 'ラムキン', rarity: 'common', nature: 'のんびりや', tier: 'premium',
      desc: 'きまぐれでかわいいラムキン。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc038', species: 'cat', name: 'バンビーノ', rarity: 'common', nature: 'ぼうけんずき', tier: 'premium',
      desc: 'きまぐれでかわいいバンビーノ。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc039', species: 'cat', name: 'メコンボブテイル', rarity: 'uncommon', nature: 'クール', tier: 'premium',
      desc: 'きまぐれでかわいいメコンボブテイル。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc040', species: 'cat', name: '三毛', rarity: 'uncommon', nature: 'きまぐれ', tier: 'premium',
      desc: 'きまぐれでかわいい三毛。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'calico', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc041', species: 'cat', name: 'キジ白', rarity: 'uncommon', nature: 'きれいずき', tier: 'premium',
      desc: 'きまぐれでかわいいキジ白。',
      art: { base: 'cat', ear: 'prick', color: '#fbf6ee', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc042', species: 'cat', name: '黒白(タキシード)', rarity: 'rare', nature: 'あまえんぼう', tier: 'premium',
      desc: 'きまぐれでかわいい黒白(タキシード)。',
      art: { base: 'cat', ear: 'prick', color: '#2c2622', color2: '#fbf2e6', pattern: 'tuxedo', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc043', species: 'cat', name: '三毛(長毛)', rarity: 'rare', nature: 'おしゃべり', tier: 'premium',
      desc: 'きまぐれでかわいい三毛(長毛)。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'calico', eye: '#9bd24a', fluffy: true }
    },
    {
      id: 'pc044', species: 'cat', name: 'キジトラ白', rarity: 'epic', nature: 'おっとり', tier: 'premium',
      desc: 'きまぐれでかわいいキジトラ白。',
      art: { base: 'cat', ear: 'prick', color: '#fbf6ee', color2: '#fbf2e6', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc045', species: 'cat', name: 'サビ猫(べっこう)', rarity: 'common', nature: 'やさしい', tier: 'premium',
      desc: 'きまぐれでかわいいサビ猫(べっこう)。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc046', species: 'cat', name: 'サビ白', rarity: 'uncommon', nature: 'いちず', tier: 'premium',
      desc: 'きまぐれでかわいいサビ白。',
      art: { base: 'cat', ear: 'prick', color: '#fbf6ee', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc047', species: 'cat', name: 'グレー(青)', rarity: 'rare', nature: 'ひとなつっこい', tier: 'premium',
      desc: 'きまぐれでかわいいグレー(青)。',
      art: { base: 'cat', ear: 'prick', color: '#8a9aa5', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc048', species: 'cat', name: 'グレー白', rarity: 'legendary', nature: 'がんばりや', tier: 'premium',
      desc: 'きまぐれでかわいいグレー白。',
      art: { base: 'cat', ear: 'prick', color: '#fbf6ee', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc049', species: 'cat', name: 'クリーム猫', rarity: 'common', nature: 'おりこう', tier: 'premium',
      desc: 'きまぐれでかわいいクリーム猫。',
      art: { base: 'cat', ear: 'prick', color: '#e8c87a', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc050', species: 'cat', name: 'クリーム白', rarity: 'common', nature: 'こうきしん', tier: 'premium',
      desc: 'きまぐれでかわいいクリーム白。',
      art: { base: 'cat', ear: 'prick', color: '#fbf6ee', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc051', species: 'cat', name: '縞三毛(パッチドタビー)', rarity: 'uncommon', nature: 'げんきいっぱい', tier: 'premium',
      desc: 'きまぐれでかわいい縞三毛(パッチドタビー)。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'calico', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc052', species: 'cat', name: '茶トラ白', rarity: 'uncommon', nature: 'のんびりや', tier: 'premium',
      desc: 'きまぐれでかわいい茶トラ白。',
      art: { base: 'cat', ear: 'prick', color: '#fbf6ee', color2: '#fbf2e6', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc053', species: 'cat', name: 'ポインテッド風', rarity: 'uncommon', nature: 'ぼうけんずき', tier: 'premium',
      desc: 'きまぐれでかわいいポインテッド風。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc054', species: 'cat', name: 'べっこう三毛', rarity: 'rare', nature: 'クール', tier: 'premium',
      desc: 'きまぐれでかわいいべっこう三毛。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'calico', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc055', species: 'cat', name: '白黒ブチ', rarity: 'rare', nature: 'きまぐれ', tier: 'premium',
      desc: 'きまぐれでかわいい白黒ブチ。',
      art: { base: 'cat', ear: 'prick', color: '#2c2622', color2: '#fbf2e6', pattern: 'tuxedo', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc056', species: 'cat', name: '黒長毛', rarity: 'epic', nature: 'きれいずき', tier: 'premium',
      desc: 'きまぐれでかわいい黒長毛。',
      art: { base: 'cat', ear: 'prick', color: '#2c2622', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: true }
    },
    {
      id: 'pc057', species: 'cat', name: '白長毛', rarity: 'common', nature: 'あまえんぼう', tier: 'premium',
      desc: 'きまぐれでかわいい白長毛。',
      art: { base: 'cat', ear: 'prick', color: '#fbf6ee', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: true }
    },
    {
      id: 'pc058', species: 'cat', name: 'キジ長毛', rarity: 'uncommon', nature: 'おしゃべり', tier: 'premium',
      desc: 'きまぐれでかわいいキジ長毛。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: true }
    },
    {
      id: 'pc059', species: 'cat', name: '茶トラ長毛', rarity: 'rare', nature: 'おっとり', tier: 'premium',
      desc: 'きまぐれでかわいい茶トラ長毛。',
      art: { base: 'cat', ear: 'prick', color: '#b5642f', color2: '#fbf2e6', pattern: 'tabby', eye: '#9bd24a', fluffy: true }
    },
    {
      id: 'pc060', species: 'cat', name: '尾曲がり猫', rarity: 'legendary', nature: 'やさしい', tier: 'premium',
      desc: 'きまぐれでかわいい尾曲がり猫。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc061', species: 'cat', name: '和猫ボブテイル', rarity: 'common', nature: 'いちず', tier: 'premium',
      desc: 'きまぐれでかわいい和猫ボブテイル。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc062', species: 'cat', name: '灰トラ', rarity: 'common', nature: 'ひとなつっこい', tier: 'premium',
      desc: 'きまぐれでかわいい灰トラ。',
      art: { base: 'cat', ear: 'prick', color: '#8a9aa5', color2: '#fbf2e6', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc063', species: 'cat', name: '銀トラ', rarity: 'uncommon', nature: 'がんばりや', tier: 'premium',
      desc: 'きまぐれでかわいい銀トラ。',
      art: { base: 'cat', ear: 'prick', color: '#b5642f', color2: '#fbf2e6', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc064', species: 'cat', name: '赤トラ濃', rarity: 'uncommon', nature: 'おりこう', tier: 'premium',
      desc: 'きまぐれでかわいい赤トラ濃。',
      art: { base: 'cat', ear: 'prick', color: '#b5642f', color2: '#fbf2e6', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc065', species: 'cat', name: 'キジ濃色', rarity: 'uncommon', nature: 'こうきしん', tier: 'premium',
      desc: 'きまぐれでかわいいキジ濃色。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc066', species: 'cat', name: '三毛濃色', rarity: 'rare', nature: 'げんきいっぱい', tier: 'premium',
      desc: 'きまぐれでかわいい三毛濃色。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'calico', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc067', species: 'cat', name: '白ソックス', rarity: 'rare', nature: 'のんびりや', tier: 'premium',
      desc: 'きまぐれでかわいい白ソックス。',
      art: { base: 'cat', ear: 'prick', color: '#fbf6ee', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc068', species: 'cat', name: '鼻ブチ', rarity: 'epic', nature: 'ぼうけんずき', tier: 'premium',
      desc: 'きまぐれでかわいい鼻ブチ。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'patch', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc069', species: 'cat', name: 'おでこハート柄', rarity: 'common', nature: 'クール', tier: 'premium',
      desc: 'きまぐれでかわいいおでこハート柄。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc070', species: 'cat', name: 'まんじゅう顔キジ', rarity: 'uncommon', nature: 'きまぐれ', tier: 'premium',
      desc: 'きまぐれでかわいいまんじゅう顔キジ。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc071', species: 'cat', name: '招き猫風(白×赤)', rarity: 'rare', nature: 'きれいずき', tier: 'premium',
      desc: 'きまぐれでかわいい招き猫風(白×赤)。',
      art: { base: 'cat', ear: 'prick', color: '#fbf6ee', color2: '#fbf2e6', pattern: 'patch', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc072', species: 'cat', name: '黒', rarity: 'legendary', nature: 'あまえんぼう', tier: 'premium',
      desc: 'きまぐれでかわいい黒。',
      art: { base: 'cat', ear: 'prick', color: '#2c2622', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc073', species: 'cat', name: '白', rarity: 'common', nature: 'おしゃべり', tier: 'premium',
      desc: 'きまぐれでかわいい白。',
      art: { base: 'cat', ear: 'prick', color: '#fbf6ee', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc074', species: 'cat', name: '青(グレー)', rarity: 'common', nature: 'おっとり', tier: 'premium',
      desc: 'きまぐれでかわいい青(グレー)。',
      art: { base: 'cat', ear: 'prick', color: '#8a9aa5', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc075', species: 'cat', name: 'クリーム', rarity: 'uncommon', nature: 'やさしい', tier: 'premium',
      desc: 'きまぐれでかわいいクリーム。',
      art: { base: 'cat', ear: 'prick', color: '#e8c87a', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc076', species: 'cat', name: 'レッド', rarity: 'uncommon', nature: 'いちず', tier: 'premium',
      desc: 'きまぐれでかわいいレッド。',
      art: { base: 'cat', ear: 'prick', color: '#b5642f', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc077', species: 'cat', name: 'シナモン', rarity: 'uncommon', nature: 'ひとなつっこい', tier: 'premium',
      desc: 'きまぐれでかわいいシナモン。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc078', species: 'cat', name: 'フォーン', rarity: 'rare', nature: 'がんばりや', tier: 'premium',
      desc: 'きまぐれでかわいいフォーン。',
      art: { base: 'cat', ear: 'prick', color: '#e8c87a', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc079', species: 'cat', name: 'チョコレート', rarity: 'rare', nature: 'おりこう', tier: 'premium',
      desc: 'きまぐれでかわいいチョコレート。',
      art: { base: 'cat', ear: 'prick', color: '#5a4a3a', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc080', species: 'cat', name: 'ライラック', rarity: 'epic', nature: 'こうきしん', tier: 'premium',
      desc: 'きまぐれでかわいいライラック。',
      art: { base: 'cat', ear: 'prick', color: '#b8a8c0', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc081', species: 'cat', name: 'シルバー', rarity: 'common', nature: 'げんきいっぱい', tier: 'premium',
      desc: 'きまぐれでかわいいシルバー。',
      art: { base: 'cat', ear: 'prick', color: '#8a9aa5', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc082', species: 'cat', name: 'マッカレル', rarity: 'uncommon', nature: 'のんびりや', tier: 'premium',
      desc: 'きまぐれでかわいいマッカレル。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc083', species: 'cat', name: 'クラシック(渦)', rarity: 'rare', nature: 'ぼうけんずき', tier: 'premium',
      desc: 'きまぐれでかわいいクラシック(渦)。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc084', species: 'cat', name: 'スポテッド', rarity: 'legendary', nature: 'クール', tier: 'premium',
      desc: 'きまぐれでかわいいスポテッド。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc085', species: 'cat', name: 'ティック', rarity: 'common', nature: 'きまぐれ', tier: 'premium',
      desc: 'きまぐれでかわいいティック。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc086', species: 'cat', name: 'パッチド', rarity: 'common', nature: 'きれいずき', tier: 'premium',
      desc: 'きまぐれでかわいいパッチド。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'patch', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc087', species: 'cat', name: 'シルバータビー', rarity: 'uncommon', nature: 'あまえんぼう', tier: 'premium',
      desc: 'きまぐれでかわいいシルバータビー。',
      art: { base: 'cat', ear: 'prick', color: '#8a9aa5', color2: '#fbf2e6', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc088', species: 'cat', name: 'ブラウンタビー', rarity: 'uncommon', nature: 'おしゃべり', tier: 'premium',
      desc: 'きまぐれでかわいいブラウンタビー。',
      art: { base: 'cat', ear: 'prick', color: '#5a4a3a', color2: '#fbf2e6', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc089', species: 'cat', name: 'レッドタビー', rarity: 'uncommon', nature: 'おっとり', tier: 'premium',
      desc: 'きまぐれでかわいいレッドタビー。',
      art: { base: 'cat', ear: 'prick', color: '#b5642f', color2: '#fbf2e6', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc090', species: 'cat', name: 'ブルータビー', rarity: 'rare', nature: 'やさしい', tier: 'premium',
      desc: 'きまぐれでかわいいブルータビー。',
      art: { base: 'cat', ear: 'prick', color: '#8a9aa5', color2: '#fbf2e6', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc091', species: 'cat', name: 'クリームタビー', rarity: 'rare', nature: 'いちず', tier: 'premium',
      desc: 'きまぐれでかわいいクリームタビー。',
      art: { base: 'cat', ear: 'prick', color: '#e8c87a', color2: '#fbf2e6', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc092', species: 'cat', name: 'チョコタビー', rarity: 'epic', nature: 'ひとなつっこい', tier: 'premium',
      desc: 'きまぐれでかわいいチョコタビー。',
      art: { base: 'cat', ear: 'prick', color: '#5a4a3a', color2: '#fbf2e6', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc093', species: 'cat', name: 'シナモンタビー', rarity: 'common', nature: 'がんばりや', tier: 'premium',
      desc: 'きまぐれでかわいいシナモンタビー。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc094', species: 'cat', name: 'タキシード', rarity: 'uncommon', nature: 'おりこう', tier: 'premium',
      desc: 'きまぐれでかわいいタキシード。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'tuxedo', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc095', species: 'cat', name: 'ヴァン', rarity: 'rare', nature: 'こうきしん', tier: 'premium',
      desc: 'きまぐれでかわいいヴァン。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'patch', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc096', species: 'cat', name: 'ハーレクイン', rarity: 'legendary', nature: 'げんきいっぱい', tier: 'premium',
      desc: 'きまぐれでかわいいハーレクイン。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc097', species: 'cat', name: 'モーガン(靴下)', rarity: 'common', nature: 'のんびりや', tier: 'premium',
      desc: 'きまぐれでかわいいモーガン(靴下)。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'patch', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc098', species: 'cat', name: 'マスク&マントル', rarity: 'common', nature: 'ぼうけんずき', tier: 'premium',
      desc: 'きまぐれでかわいいマスク&マントル。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc099', species: 'cat', name: 'キャップ&サドル', rarity: 'uncommon', nature: 'クール', tier: 'premium',
      desc: 'きまぐれでかわいいキャップ&サドル。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc100', species: 'cat', name: 'ミテッド', rarity: 'uncommon', nature: 'きまぐれ', tier: 'premium',
      desc: 'きまぐれでかわいいミテッド。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc101', species: 'cat', name: 'ロケット', rarity: 'uncommon', nature: 'きれいずき', tier: 'premium',
      desc: 'きまぐれでかわいいロケット。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc102', species: 'cat', name: 'ダイリュート三毛', rarity: 'rare', nature: 'あまえんぼう', tier: 'premium',
      desc: 'きまぐれでかわいいダイリュート三毛。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'calico', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc103', species: 'cat', name: '黒べっこう', rarity: 'rare', nature: 'おしゃべり', tier: 'premium',
      desc: 'きまぐれでかわいい黒べっこう。',
      art: { base: 'cat', ear: 'prick', color: '#2c2622', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc104', species: 'cat', name: 'ブルークリーム', rarity: 'epic', nature: 'おっとり', tier: 'premium',
      desc: 'きまぐれでかわいいブルークリーム。',
      art: { base: 'cat', ear: 'prick', color: '#8a9aa5', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc105', species: 'cat', name: 'チョコトーティ', rarity: 'common', nature: 'やさしい', tier: 'premium',
      desc: 'きまぐれでかわいいチョコトーティ。',
      art: { base: 'cat', ear: 'prick', color: '#5a4a3a', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc106', species: 'cat', name: 'ライラッククリーム', rarity: 'uncommon', nature: 'いちず', tier: 'premium',
      desc: 'きまぐれでかわいいライラッククリーム。',
      art: { base: 'cat', ear: 'prick', color: '#e8c87a', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc107', species: 'cat', name: 'パッチドタビー三毛', rarity: 'rare', nature: 'ひとなつっこい', tier: 'premium',
      desc: 'きまぐれでかわいいパッチドタビー三毛。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'calico', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc108', species: 'cat', name: 'トーティ&ホワイト', rarity: 'legendary', nature: 'がんばりや', tier: 'premium',
      desc: 'きまぐれでかわいいトーティ&ホワイト。',
      art: { base: 'cat', ear: 'prick', color: '#fbf6ee', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc109', species: 'cat', name: 'シール', rarity: 'common', nature: 'おりこう', tier: 'premium',
      desc: 'きまぐれでかわいいシール。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc110', species: 'cat', name: 'ブルー', rarity: 'common', nature: 'こうきしん', tier: 'premium',
      desc: 'きまぐれでかわいいブルー。',
      art: { base: 'cat', ear: 'prick', color: '#8a9aa5', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc111', species: 'cat', name: 'チョコ', rarity: 'uncommon', nature: 'げんきいっぱい', tier: 'premium',
      desc: 'きまぐれでかわいいチョコ。',
      art: { base: 'cat', ear: 'prick', color: '#5a4a3a', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc112', species: 'cat', name: 'レッド(フレーム)', rarity: 'uncommon', nature: 'のんびりや', tier: 'premium',
      desc: 'きまぐれでかわいいレッド(フレーム)。',
      art: { base: 'cat', ear: 'prick', color: '#b5642f', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc113', species: 'cat', name: 'シールタビー', rarity: 'uncommon', nature: 'ぼうけんずき', tier: 'premium',
      desc: 'きまぐれでかわいいシールタビー。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc114', species: 'cat', name: 'トーティ', rarity: 'rare', nature: 'クール', tier: 'premium',
      desc: 'きまぐれでかわいいトーティ。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc115', species: 'cat', name: 'リンクス(タビー)ポイント', rarity: 'rare', nature: 'きまぐれ', tier: 'premium',
      desc: 'きまぐれでかわいいリンクス(タビー)ポイント。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'tabby', eye: '#7ab3e0', fluffy: false }
    },
    {
      id: 'pc116', species: 'cat', name: '長毛', rarity: 'epic', nature: 'きれいずき', tier: 'premium',
      desc: 'きまぐれでかわいい長毛。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: true }
    },
    {
      id: 'pc117', species: 'cat', name: '短毛', rarity: 'common', nature: 'あまえんぼう', tier: 'premium',
      desc: 'きまぐれでかわいい短毛。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc118', species: 'cat', name: '半長毛', rarity: 'uncommon', nature: 'おしゃべり', tier: 'premium',
      desc: 'きまぐれでかわいい半長毛。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: true }
    },
    {
      id: 'pc119', species: 'cat', name: '巻き毛(レックス)', rarity: 'rare', nature: 'おっとり', tier: 'premium',
      desc: 'きまぐれでかわいい巻き毛(レックス)。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc120', species: 'cat', name: '無毛(ヘアレス)', rarity: 'legendary', nature: 'やさしい', tier: 'premium',
      desc: 'きまぐれでかわいい無毛(ヘアレス)。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc121', species: 'cat', name: 'ワイヤー', rarity: 'common', nature: 'いちず', tier: 'premium',
      desc: 'きまぐれでかわいいワイヤー。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc122', species: 'cat', name: 'ダブルコート', rarity: 'common', nature: 'ひとなつっこい', tier: 'premium',
      desc: 'きまぐれでかわいいダブルコート。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc123', species: 'cat', name: 'カーリー', rarity: 'uncommon', nature: 'がんばりや', tier: 'premium',
      desc: 'きまぐれでかわいいカーリー。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc124', species: 'cat', name: '金目', rarity: 'uncommon', nature: 'おりこう', tier: 'premium',
      desc: 'きまぐれでかわいい金目。',
      art: { base: 'cat', ear: 'prick', color: '#e8c87a', color2: '#fbf2e6', pattern: 'solid', eye: '#e8a83a', fluffy: false }
    },
    {
      id: 'pc125', species: 'cat', name: '銅目', rarity: 'uncommon', nature: 'こうきしん', tier: 'premium',
      desc: 'きまぐれでかわいい銅目。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#e8a83a', fluffy: false }
    },
    {
      id: 'pc126', species: 'cat', name: '緑目', rarity: 'rare', nature: 'げんきいっぱい', tier: 'premium',
      desc: 'きまぐれでかわいい緑目。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc127', species: 'cat', name: '青目', rarity: 'rare', nature: 'のんびりや', tier: 'premium',
      desc: 'きまぐれでかわいい青目。',
      art: { base: 'cat', ear: 'prick', color: '#8a9aa5', color2: '#fbf2e6', pattern: 'solid', eye: '#7ab3e0', fluffy: false }
    },
    {
      id: 'pc128', species: 'cat', name: 'ヘーゼル', rarity: 'epic', nature: 'ぼうけんずき', tier: 'premium',
      desc: 'きまぐれでかわいいヘーゼル。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc129', species: 'cat', name: 'オッドアイ(金銀)', rarity: 'common', nature: 'クール', tier: 'premium',
      desc: 'きまぐれでかわいいオッドアイ(金銀)。',
      art: { base: 'cat', ear: 'prick', color: '#e8c87a', color2: '#fbf2e6', pattern: 'solid', eye: '#e8a83a', fluffy: false }
    },
    {
      id: 'pc130', species: 'cat', name: 'アクア', rarity: 'uncommon', nature: 'きまぐれ', tier: 'premium',
      desc: 'きまぐれでかわいいアクア。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc131', species: 'cat', name: '折れ耳', rarity: 'rare', nature: 'きれいずき', tier: 'premium',
      desc: 'きまぐれでかわいい折れ耳。',
      art: { base: 'cat', ear: 'fold', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc132', species: 'cat', name: 'カール耳', rarity: 'legendary', nature: 'あまえんぼう', tier: 'premium',
      desc: 'きまぐれでかわいいカール耳。',
      art: { base: 'cat', ear: 'round', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc133', species: 'cat', name: '立ち耳', rarity: 'common', nature: 'おしゃべり', tier: 'premium',
      desc: 'きまぐれでかわいい立ち耳。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc134', species: 'cat', name: '短尾(ボブ)', rarity: 'common', nature: 'おっとり', tier: 'premium',
      desc: 'きまぐれでかわいい短尾(ボブ)。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc135', species: 'cat', name: '尾曲がり', rarity: 'uncommon', nature: 'やさしい', tier: 'premium',
      desc: 'きまぐれでかわいい尾曲がり。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc136', species: 'cat', name: '長尾ふさふさ', rarity: 'uncommon', nature: 'いちず', tier: 'premium',
      desc: 'きまぐれでかわいい長尾ふさふさ。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: true }
    },
    {
      id: 'pc137', species: 'cat', name: 'リンクスティップ(房毛)', rarity: 'uncommon', nature: 'ひとなつっこい', tier: 'premium',
      desc: 'きまぐれでかわいいリンクスティップ(房毛)。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc138', species: 'cat', name: 'ポリダクティル(多指)', rarity: 'rare', nature: 'がんばりや', tier: 'premium',
      desc: 'きまぐれでかわいいポリダクティル(多指)。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc139', species: 'cat', name: '黒×白ブチ', rarity: 'rare', nature: 'おりこう', tier: 'premium',
      desc: 'きまぐれでかわいい黒×白ブチ。',
      art: { base: 'cat', ear: 'prick', color: '#2c2622', color2: '#fbf2e6', pattern: 'patch', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc140', species: 'cat', name: 'グレー×白', rarity: 'epic', nature: 'こうきしん', tier: 'premium',
      desc: 'きまぐれでかわいいグレー×白。',
      art: { base: 'cat', ear: 'prick', color: '#fbf6ee', color2: '#fbf2e6', pattern: 'patch', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc141', species: 'cat', name: '茶×白', rarity: 'common', nature: 'げんきいっぱい', tier: 'premium',
      desc: 'きまぐれでかわいい茶×白。',
      art: { base: 'cat', ear: 'prick', color: '#fbf6ee', color2: '#fbf2e6', pattern: 'patch', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc142', species: 'cat', name: 'キジ×白', rarity: 'uncommon', nature: 'のんびりや', tier: 'premium',
      desc: 'きまぐれでかわいいキジ×白。',
      art: { base: 'cat', ear: 'prick', color: '#fbf6ee', color2: '#fbf2e6', pattern: 'patch', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc143', species: 'cat', name: '三毛×長毛', rarity: 'rare', nature: 'ぼうけんずき', tier: 'premium',
      desc: 'きまぐれでかわいい三毛×長毛。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'calico', eye: '#9bd24a', fluffy: true }
    },
    {
      id: 'pc144', species: 'cat', name: 'シャム×アメショ風', rarity: 'legendary', nature: 'クール', tier: 'premium',
      desc: 'きまぐれでかわいいシャム×アメショ風。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'point', eye: '#7ab3e0', fluffy: false }
    },
    {
      id: 'pc145', species: 'cat', name: 'ベンガル風スポット', rarity: 'common', nature: 'きまぐれ', tier: 'premium',
      desc: 'きまぐれでかわいいベンガル風スポット。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'spot', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc146', species: 'cat', name: 'トラ柄濃色', rarity: 'common', nature: 'きれいずき', tier: 'premium',
      desc: 'きまぐれでかわいいトラ柄濃色。',
      art: { base: 'cat', ear: 'prick', color: '#b5642f', color2: '#fbf2e6', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc147', species: 'cat', name: '雪柄(ホワイトミテッド)', rarity: 'uncommon', nature: 'あまえんぼう', tier: 'premium',
      desc: 'きまぐれでかわいい雪柄(ホワイトミテッド)。',
      art: { base: 'cat', ear: 'prick', color: '#fbf6ee', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc148', species: 'cat', name: 'タキシード長毛', rarity: 'uncommon', nature: 'おしゃべり', tier: 'premium',
      desc: 'きまぐれでかわいいタキシード長毛。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'tuxedo', eye: '#9bd24a', fluffy: true }
    },
    {
      id: 'pc149', species: 'cat', name: 'ハチワレ金目', rarity: 'uncommon', nature: 'おっとり', tier: 'premium',
      desc: 'きまぐれでかわいいハチワレ金目。',
      art: { base: 'cat', ear: 'prick', color: '#e8c87a', color2: '#fbf2e6', pattern: 'solid', eye: '#e8a83a', fluffy: false }
    },
    {
      id: 'pc150', species: 'cat', name: 'まる顔グレー', rarity: 'rare', nature: 'やさしい', tier: 'premium',
      desc: 'きまぐれでかわいいまる顔グレー。',
      art: { base: 'cat', ear: 'prick', color: '#8a9aa5', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc151', species: 'cat', name: 'ぽっちゃり茶トラ', rarity: 'rare', nature: 'いちず', tier: 'premium',
      desc: 'きまぐれでかわいいぽっちゃり茶トラ。',
      art: { base: 'cat', ear: 'prick', color: '#b5642f', color2: '#fbf2e6', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc152', species: 'cat', name: '子猫(キトゥン)柄', rarity: 'epic', nature: 'ひとなつっこい', tier: 'premium',
      desc: 'きまぐれでかわいい子猫(キトゥン)柄。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc153', species: 'cat', name: 'シニア貫禄柄', rarity: 'common', nature: 'がんばりや', tier: 'premium',
      desc: 'きまぐれでかわいいシニア貫禄柄。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc154', species: 'cat', name: 'ハート模様', rarity: 'uncommon', nature: 'おりこう', tier: 'premium',
      desc: 'きまぐれでかわいいハート模様。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc155', species: 'cat', name: '星模様', rarity: 'rare', nature: 'こうきしん', tier: 'premium',
      desc: 'きまぐれでかわいい星模様。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc156', species: 'cat', name: '靴下4本', rarity: 'legendary', nature: 'げんきいっぱい', tier: 'premium',
      desc: 'きまぐれでかわいい靴下4本。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'patch', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc157', species: 'cat', name: '鼻ぺた', rarity: 'common', nature: 'のんびりや', tier: 'premium',
      desc: 'きまぐれでかわいい鼻ぺた。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc158', species: 'cat', name: 'ヒゲ長', rarity: 'common', nature: 'ぼうけんずき', tier: 'premium',
      desc: 'きまぐれでかわいいヒゲ長。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc159', species: 'cat', name: 'あくび顔', rarity: 'uncommon', nature: 'クール', tier: 'premium',
      desc: 'きまぐれでかわいいあくび顔。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc160', species: 'cat', name: '香箱座り', rarity: 'uncommon', nature: 'きまぐれ', tier: 'premium',
      desc: 'きまぐれでかわいい香箱座り。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc161', species: 'cat', name: 'おすわり', rarity: 'uncommon', nature: 'きれいずき', tier: 'premium',
      desc: 'きまぐれでかわいいおすわり。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc162', species: 'cat', name: 'ごろん', rarity: 'rare', nature: 'あまえんぼう', tier: 'premium',
      desc: 'きまぐれでかわいいごろん。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc163', species: 'cat', name: '見上げ', rarity: 'rare', nature: 'おしゃべり', tier: 'premium',
      desc: 'きまぐれでかわいい見上げ。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'pc164', species: 'cat', name: '--', rarity: 'epic', nature: 'おっとり', tier: 'premium',
      desc: 'きまぐれでかわいい--。',
      art: { base: 'cat', ear: 'prick', color: '#e0b074', color2: '#fbf2e6', pattern: 'solid', eye: '#9bd24a', fluffy: false }
    }
  ];

  // レアリティ設定（抽選の重み・表示色・日本語ラベル）
  // 色は白文字チップが成立する暗色版（DESIGN.md §2 実測コントラスト準拠）
  var RARITY = {
    common:    { weight: 50, label: 'コモン',     color: '#6d747c', stars: 1 },
    uncommon:  { weight: 25, label: 'アンコモン', color: '#2e8757', stars: 2 },
    rare:      { weight: 14, label: 'レア',       color: '#2f6fc4', stars: 3 },
    epic:      { weight: 8,  label: 'エピック',   color: '#8a42c8', stars: 4 },
    legendary: { weight: 3,  label: 'レジェンド', color: '#a87613', stars: 5 }
  };

  // 性格タイプ（nature）。各品種に1つ。一言はホーム・図鑑詳細で使う
  var NATURES = {
    'いちず':         'きみのかえりを いつまでも まってる',
    'ひとなつっこい': 'だれとでも すぐ なかよし',
    'がんばりや':     'ちいさくても こころは おおきい',
    'おりこう':       'いちど おぼえたら わすれない',
    'こうきしん':     'きになるものは ぜんぶ しらべたい',
    'げんきいっぱい': 'じっとしてるのが いちばん にがて',
    'のんびりや':     'いそがない いそがない',
    'ぼうけんずき':   'まだみぬ せかいへ いきたいの',
    'クール':         'なでてもいいけど、すこしだけよ',
    'きまぐれ':       'きょうのきぶんは きょうきめる',
    'きれいずき':     'みだしなみは いつも かんぺき',
    'あまえんぼう':   'そばにいてくれるだけで うれしい',
    'おしゃべり':     'きいてきいて、きょうのこと',
    'おっとり':       'だっこされると とろけちゃう',
    'やさしい':       'ちいさい子には ゆずってあげるの'
  };

  var byId = {};
  BREEDS.forEach(function (b) { byId[b.id] = b; });

  // ===== 交配種（クロスブリード）: おみあいでのみ生まれる名前付き掛け合わせ。PLAN_v2 §9-B1 =====
  // parents=原種2品種id（順不同）。tier=段（1=F1=原種×原種）。premium=true は課金者のみ誕生。
  // art は手続き描画のプレースホルダ（実物スプライトは後で nanobanana 差し替え）。試作は第1段5種。
  var CROSS = [
    { id: 'chiwax',    name: 'チワックス',       species: 'dog', rarity: 'uncommon', tier: 1, parents: ['chihuahua', 'dachshund'], nature: 'げんきいっぱい', desc: 'チワワとダックスの にんきミックス', art: { base: 'dog', color: '#d8a86a', color2: '#fff3e0', pattern: 'tan',   ear: 'flop', eye: '#5a3b22', fluffy: false, tail: 'normal' } },
    { id: 'goldoodle', name: 'ゴールドゥードル', species: 'dog', rarity: 'rare',     tier: 1, parents: ['golden', 'poodle'],        nature: 'やさしい',     desc: 'もふもふで かしこい にんきもの',   art: { base: 'dog', color: '#e6c388', color2: '#fff7e8', pattern: 'solid', ear: 'flop', eye: '#6a4a2a', fluffy: true,  tail: 'curl'   } },
    { id: 'puggle',    name: 'パグル',           species: 'dog', rarity: 'uncommon', tier: 1, parents: ['beagle', 'pug'],            nature: 'のんびりや',   desc: 'パグとビーグルの ゆるかわ',         art: { base: 'dog', color: '#caa06a', color2: '#fff3df', pattern: 'patch', ear: 'flop', eye: '#3a2a1a', fluffy: false, tail: 'curl'   } },
    { id: 'scomunchi', name: 'スコマンチ',       species: 'cat', rarity: 'rare',     tier: 1, parents: ['munchkin', 'scottish'],     nature: 'あまえんぼう', desc: 'みじかい あしと おりみみ',          art: { base: 'cat', color: '#b9a98f', color2: '#f3ece0', pattern: 'tabby', ear: 'fold', eye: '#caa23a', fluffy: true,  tail: 'normal' } },
    { id: 'mofuking',  name: 'もふおう',         species: 'cat', rarity: 'epic',     tier: 1, parents: ['mainecoon', 'ragdoll'],     nature: 'おっとり', premium: true, desc: 'おおきくて おうじゃの ふうかく',    art: { base: 'cat', color: '#cdb89a', color2: '#f6efe2', pattern: 'point', ear: 'prick', eye: '#6fae6f', fluffy: true,  tail: 'normal' } }
  ];
  CROSS.forEach(function (c) { c.cross = true; byId[c.id] = c; }); // get()で解決できるように
  var crossByPair = {};
  CROSS.forEach(function (c) { crossByPair[c.parents.slice().sort().join('+')] = c; });

  function isFree(b) { return !b || b.tier !== 'premium'; }

  // 課金情報（ストア商品ID・表示価格）。実購入は端末側（Capacitor）で後付け。
  var PREMIUM = { productId: 'inuneko_premium_unlock', price: '¥500', priceJPY: 500 };

  global.Breeds = {
    ALL: BREEDS,
    RARITY: RARITY,
    NATURES: NATURES,
    PREMIUM: PREMIUM,
    isFree: isFree,
    isPremium: function (b) { return !isFree(b); },
    get: function (id) { return byId[id]; },
    // ===== 交配種 =====
    CROSS: CROSS,
    isCross: function (b) { return !!(b && b.cross); },
    /** 原種2品種idの掛け合わせレシピ（順不同）。無ければ null */
    crossOf: function (a, bb) { return crossByPair[[a, bb].sort().join('+')] || null; },
    ofSpecies: function (sp) { return BREEDS.filter(function (b) { return b.species === sp; }); },
    /** 抽選対象プール。premiumUnlocked=false なら無料種のみ */
    pool: function (premiumUnlocked) {
      return premiumUnlocked ? BREEDS : BREEDS.filter(isFree);
    },
    /** レアリティ重みに従って1匹抽選。luck>0 でレア寄りに補正。premiumUnlocked で対象拡張。 */
    roll: function (rnd, luck, premiumUnlocked, species, opts) {
      luck = luck || 0;
      opts = opts || {};
      var owned = opts.owned || null;   // すでに図鑑にいる品種は出にくくして「同じ子ばかり」を減らす
      var avoid = opts.avoid || null;   // 直前の子の品種は強めに回避（連続で同じを防ぐ）
      var src = this.pool(premiumUnlocked);
      if (species) src = src.filter(function (b) { return b.species === species; }); // 犬/猫の指定（おみあいは指定しない）
      var pool = src.map(function (b) {
        var w = RARITY[b.rarity].weight;
        // luck はレア度の高い品種の重みを引き上げる（stars が大きいほど効く）
        var boost = 1 + luck * (RARITY[b.rarity].stars - 1) * 0.5;
        if (owned && owned[b.id]) boost *= 0.22; // 収集済みは出現を抑え、未発見が出やすい＝コンプが進む
        if (avoid && b.id === avoid) boost *= 0.12; // 直前と同じ品種は更に抑える（体感の偏り対策）
        return { breed: b, w: w * boost };
      });
      var total = pool.reduce(function (s, p) { return s + p.w; }, 0);
      var t = rnd() * total;
      for (var i = 0; i < pool.length; i++) {
        t -= pool[i].w;
        if (t <= 0) return pool[i].breed;
      }
      return pool[pool.length - 1].breed;
    }
  };
})(typeof window !== 'undefined' ? window : this);
