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
 */
(function (global) {
  'use strict';

  var BREEDS = [
    // ---------------- 犬 ----------------
    {
      id: 'shiba', species: 'dog', name: '柴犬', rarity: 'common',
      desc: 'くるんと巻いた尻尾。日本の代表犬。',
      art: { base: 'dog', ear: 'prick', color: '#d99a5c', color2: '#fbf2e6', pattern: 'tan', eye: '#3b2a1a', fluffy: false }
    },
    {
      id: 'golden', species: 'dog', name: 'ゴールデンレトリバー', rarity: 'common',
      desc: '人なつっこい黄金の毛なみ。',
      art: { base: 'dog', ear: 'flop', color: '#e3b76b', color2: '#f3dcab', pattern: 'solid', eye: '#3b2a1a', fluffy: true }
    },
    {
      id: 'chihuahua', species: 'dog', name: 'チワワ', rarity: 'common',
      desc: 'うるうるの瞳と大きな耳。世界最小級。',
      art: { base: 'dog', ear: 'prick', color: '#d8b88a', color2: '#f4e7d4', pattern: 'solid', eye: '#2a1d12', fluffy: false }
    },
    {
      id: 'poodle', species: 'dog', name: 'トイプードル', rarity: 'uncommon',
      desc: 'もこもこカール。お利口さん。',
      art: { base: 'dog', ear: 'flop', color: '#e8d5b0', color2: '#fff7ea', pattern: 'solid', eye: '#2a1d12', fluffy: true }
    },
    {
      id: 'dachshund', species: 'dog', name: 'ダックスフント', rarity: 'uncommon',
      desc: 'チョコレート色の胴長短足。',
      art: { base: 'dog', ear: 'flop', color: '#7a4a2b', color2: '#c98a4f', pattern: 'tan', eye: '#1f1209', fluffy: false }
    },
    {
      id: 'pomeranian', species: 'dog', name: 'ポメラニアン', rarity: 'uncommon',
      desc: 'まん丸ふわふわの小さな太陽。',
      art: { base: 'dog', ear: 'prick', color: '#e0a558', color2: '#f6dcab', pattern: 'solid', eye: '#2a1d12', fluffy: true }
    },
    {
      id: 'pug', species: 'dog', name: 'パグ', rarity: 'uncommon',
      desc: 'くしゃっと顔、黒いマスク。',
      art: { base: 'dog', ear: 'round', color: '#d9bf8f', color2: '#3a3330', pattern: 'patch', eye: '#1f1209', fluffy: false }
    },
    {
      id: 'corgi', species: 'dog', name: 'コーギー', rarity: 'rare',
      desc: '短い脚と大きなおしり。',
      art: { base: 'dog', ear: 'prick', color: '#e0913f', color2: '#fbf3e8', pattern: 'tan', eye: '#2a1d12', fluffy: false }
    },
    {
      id: 'husky', species: 'dog', name: 'ハスキー', rarity: 'rare',
      desc: '氷のような青い瞳の雪国犬。',
      art: { base: 'dog', ear: 'prick', color: '#6b7785', color2: '#f1f3f6', pattern: 'patch', eye: '#5fc8e8', fluffy: true }
    },
    {
      id: 'bulldog', species: 'dog', name: 'ブルドッグ', rarity: 'rare',
      desc: 'どっしり貫禄、しわが魅力。',
      art: { base: 'dog', ear: 'round', color: '#c9a36f', color2: '#f3e7d4', pattern: 'patch', eye: '#1f1209', fluffy: false }
    },
    {
      id: 'dalmatian', species: 'dog', name: 'ダルメシアン', rarity: 'epic',
      desc: '白地に黒い水玉のスター犬。',
      art: { base: 'dog', ear: 'flop', color: '#f3f0ea', color2: '#2c2c2c', pattern: 'spot', eye: '#2a1d12', fluffy: false }
    },
    {
      id: 'wolfdog', species: 'dog', name: 'ウルフドッグ', rarity: 'legendary',
      desc: '野生の血を引く誇り高き存在。ごく稀に現れる。',
      art: { base: 'dog', ear: 'prick', color: '#5b626b', color2: '#d7dade', pattern: 'patch', eye: '#e8c84a', fluffy: true }
    },

    // ---------------- 猫 ----------------
    {
      id: 'kijitora', species: 'cat', name: 'キジトラ', rarity: 'common',
      desc: '野生味のある茶縞。日本で一番多い柄。',
      art: { base: 'cat', ear: 'prick', color: '#9a7b4f', color2: '#5b452a', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'calico', species: 'cat', name: '三毛猫', rarity: 'common',
      desc: '白・茶・黒の三色。福を招くといわれる。',
      art: { base: 'cat', ear: 'prick', color: '#f2ede4', color2: '#e0944a', pattern: 'calico', eye: '#e0b24a', fluffy: false }
    },
    {
      id: 'black', species: 'cat', name: '黒猫', rarity: 'common',
      desc: '夜にとけこむ漆黒。金色の瞳が光る。',
      art: { base: 'cat', ear: 'prick', color: '#2e2e35', color2: '#444', pattern: 'solid', eye: '#e8c84a', fluffy: false }
    },
    {
      id: 'white', species: 'cat', name: '白猫', rarity: 'common',
      desc: '雪のように真っ白。青い瞳が涼やか。',
      art: { base: 'cat', ear: 'prick', color: '#f4f1eb', color2: '#e6e0d6', pattern: 'solid', eye: '#5fc8e8', fluffy: false }
    },
    {
      id: 'chatora', species: 'cat', name: '茶トラ', rarity: 'common',
      desc: 'おっとり甘えん坊のオレンジ縞。',
      art: { base: 'cat', ear: 'prick', color: '#e0944a', color2: '#b86a28', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'sabatora', species: 'cat', name: 'サバトラ', rarity: 'uncommon',
      desc: '銀灰色のクールな縞模様。',
      art: { base: 'cat', ear: 'prick', color: '#8c97a3', color2: '#525a63', pattern: 'tabby', eye: '#9bd24a', fluffy: false }
    },
    {
      id: 'hachiware', species: 'cat', name: 'ハチワレ', rarity: 'uncommon',
      desc: '額のV字と白い靴下がチャームポイント。',
      art: { base: 'cat', ear: 'prick', color: '#33333a', color2: '#f4f1eb', pattern: 'tuxedo', eye: '#e0b24a', fluffy: false }
    },
    {
      id: 'siamese', species: 'cat', name: 'シャム', rarity: 'rare',
      desc: '顔と手足だけ濃い、気品ある貴族猫。',
      art: { base: 'cat', ear: 'prick', color: '#ece0cc', color2: '#5a4636', pattern: 'point', eye: '#5fc8e8', fluffy: false }
    },
    {
      id: 'russianblue', species: 'cat', name: 'ロシアンブルー', rarity: 'rare',
      desc: '青みがかった銀の毛と翡翠の瞳。',
      art: { base: 'cat', ear: 'prick', color: '#7d8a99', color2: '#9aa6b3', pattern: 'solid', eye: '#7ad26a', fluffy: true }
    },
    {
      id: 'scottish', species: 'cat', name: 'スコティッシュフォールド', rarity: 'rare',
      desc: 'ぺたんと折れた耳がたまらない。',
      art: { base: 'cat', ear: 'fold', color: '#c9bca8', color2: '#9a8c78', pattern: 'tabby', eye: '#e0b24a', fluffy: true }
    },
    {
      id: 'mainecoon', species: 'cat', name: 'メインクーン', rarity: 'epic',
      desc: '森の妖精。長毛のやさしい大型猫。',
      art: { base: 'cat', ear: 'prick', color: '#8a6a45', color2: '#4a3826', pattern: 'tabby', eye: '#9bd24a', fluffy: true }
    },
    {
      id: 'bengal', species: 'cat', name: 'ベンガル', rarity: 'legendary',
      desc: '豹のようなロゼット柄。野性の宝石。',
      art: { base: 'cat', ear: 'prick', color: '#cf9a4f', color2: '#3a2c14', pattern: 'spot', eye: '#e8a83a', fluffy: false }
    }
  ];

  // レアリティ設定（抽選の重み・表示色・日本語ラベル）
  var RARITY = {
    common:    { weight: 50, label: 'コモン',     color: '#9aa0a6', stars: 1 },
    uncommon:  { weight: 25, label: 'アンコモン', color: '#3fa86b', stars: 2 },
    rare:      { weight: 14, label: 'レア',       color: '#3f7fd6', stars: 3 },
    epic:      { weight: 8,  label: 'エピック',   color: '#9a4fd6', stars: 4 },
    legendary: { weight: 3,  label: 'レジェンド', color: '#e0a93a', stars: 5 }
  };

  var byId = {};
  BREEDS.forEach(function (b) { byId[b.id] = b; });

  global.Breeds = {
    ALL: BREEDS,
    RARITY: RARITY,
    get: function (id) { return byId[id]; },
    ofSpecies: function (sp) { return BREEDS.filter(function (b) { return b.species === sp; }); },
    /** レアリティ重みに従って1匹抽選。luck>0 でレア寄りに補正。 */
    roll: function (rnd, luck) {
      luck = luck || 0;
      var pool = BREEDS.map(function (b) {
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
