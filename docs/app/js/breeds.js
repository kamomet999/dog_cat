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
    ofSpecies: function (sp) { return BREEDS.filter(function (b) { return b.species === sp; }); },
    /** 抽選対象プール。premiumUnlocked=false なら無料種のみ */
    pool: function (premiumUnlocked) {
      return premiumUnlocked ? BREEDS : BREEDS.filter(isFree);
    },
    /** レアリティ重みに従って1匹抽選。luck>0 でレア寄りに補正。premiumUnlocked で対象拡張。 */
    roll: function (rnd, luck, premiumUnlocked) {
      luck = luck || 0;
      var src = this.pool(premiumUnlocked);
      var pool = src.map(function (b) {
        var w = RARITY[b.rarity].weight;
        // luck はレア度の高い品種の重みを引き上げる（stars が大きいほど効く）
        var boost = 1 + luck * (RARITY[b.rarity].stars - 1) * 0.5;
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
