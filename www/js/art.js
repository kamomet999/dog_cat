/**
 * プロシージャルSVGアート生成
 * breeds.js の art パラメータから犬・猫を描き分ける。
 * clipPath/グラデの id を使わず、模様は本体内に収まる座標で配置（同一ページに多数描画してもid衝突しない）。
 */
(function (global) {
  'use strict';

  function darken(hex, amt) {
    var c = hex.replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    var r = Math.max(0, parseInt(c.substr(0, 2), 16) - amt);
    var g = Math.max(0, parseInt(c.substr(2, 2), 16) - amt);
    var b = Math.max(0, parseInt(c.substr(4, 2), 16) - amt);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  // ----- 目 -----
  function eye(x, y, mood, color, r) {
    if (mood === 'happy') {
      return '<path d="M' + (x - r) + ' ' + y + ' Q' + x + ' ' + (y - r * 1.3) + ' ' + (x + r) + ' ' + y +
        '" fill="none" stroke="#2a2018" stroke-width="3.2" stroke-linecap="round"/>';
    }
    if (mood === 'sad') {
      return '<circle cx="' + x + '" cy="' + (y + 1) + '" r="' + (r * 0.7) + '" fill="#2a2018"/>' +
        '<path d="M' + (x - r) + ' ' + (y - r * 0.9) + ' Q' + x + ' ' + (y - r * 1.6) + ' ' + (x + r) + ' ' + (y - r * 0.9) +
        '" fill="none" stroke="#2a2018" stroke-width="2.4" stroke-linecap="round"/>';
    }
    // normal
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + color + '"/>' +
      '<circle cx="' + x + '" cy="' + y + '" r="' + (r * 0.62) + '" fill="#241a12"/>' +
      '<circle cx="' + (x - r * 0.28) + '" cy="' + (y - r * 0.34) + '" r="' + (r * 0.26) + '" fill="#fff"/>';
  }

  // ----- 鼻と口 -----
  function dogNoseMouth(cx, y, mood) {
    var nose = '<ellipse cx="' + cx + '" cy="' + y + '" rx="6.5" ry="5" fill="#2a2018"/>';
    var m;
    if (mood === 'happy') {
      m = '<path d="M' + cx + ' ' + (y + 5) + ' Q' + (cx - 12) + ' ' + (y + 20) + ' ' + (cx - 14) + ' ' + (y + 8) +
        ' M' + cx + ' ' + (y + 5) + ' Q' + (cx + 12) + ' ' + (y + 20) + ' ' + (cx + 14) + ' ' + (y + 8) + '" fill="none" stroke="#2a2018" stroke-width="2.6" stroke-linecap="round"/>' +
        '<path d="M' + (cx - 9) + ' ' + (y + 12) + ' Q' + cx + ' ' + (y + 22) + ' ' + (cx + 9) + ' ' + (y + 12) + ' Z" fill="#ef8da0"/>';
    } else if (mood === 'sad') {
      m = '<path d="M' + (cx - 9) + ' ' + (y + 16) + ' Q' + cx + ' ' + (y + 9) + ' ' + (cx + 9) + ' ' + (y + 16) + '" fill="none" stroke="#2a2018" stroke-width="2.6" stroke-linecap="round"/>';
    } else {
      m = '<path d="M' + cx + ' ' + (y + 5) + ' L' + cx + ' ' + (y + 11) +
        ' M' + (cx - 9) + ' ' + (y + 14) + ' Q' + cx + ' ' + (y + 18) + ' ' + cx + ' ' + (y + 11) +
        ' M' + (cx + 9) + ' ' + (y + 14) + ' Q' + cx + ' ' + (y + 18) + ' ' + cx + ' ' + (y + 11) + '" fill="none" stroke="#2a2018" stroke-width="2.4" stroke-linecap="round"/>';
    }
    return nose + m;
  }

  function catNoseMouth(cx, y, mood) {
    var nose = '<path d="M' + (cx - 5) + ' ' + y + ' L' + (cx + 5) + ' ' + y + ' L' + cx + ' ' + (y + 5) + ' Z" fill="#ef8da0"/>';
    var m;
    if (mood === 'happy') {
      m = '<path d="M' + cx + ' ' + (y + 5) + ' Q' + (cx - 8) + ' ' + (y + 14) + ' ' + (cx - 12) + ' ' + (y + 7) +
        ' M' + cx + ' ' + (y + 5) + ' Q' + (cx + 8) + ' ' + (y + 14) + ' ' + (cx + 12) + ' ' + (y + 7) + '" fill="none" stroke="#2a2018" stroke-width="2.2" stroke-linecap="round"/>';
    } else if (mood === 'sad') {
      m = '<path d="M' + (cx - 8) + ' ' + (y + 13) + ' Q' + cx + ' ' + (y + 7) + ' ' + (cx + 8) + ' ' + (y + 13) + '" fill="none" stroke="#2a2018" stroke-width="2.2" stroke-linecap="round"/>';
    } else {
      m = '<path d="M' + cx + ' ' + (y + 5) + ' L' + cx + ' ' + (y + 9) +
        ' M' + (cx - 7) + ' ' + (y + 12) + ' Q' + cx + ' ' + (y + 15) + ' ' + cx + ' ' + (y + 9) +
        ' M' + (cx + 7) + ' ' + (y + 12) + ' Q' + cx + ' ' + (y + 15) + ' ' + cx + ' ' + (y + 9) + '" fill="none" stroke="#2a2018" stroke-width="2" stroke-linecap="round"/>';
    }
    // ひげ
    var w = '<g stroke="rgba(90,70,50,.5)" stroke-width="1.4" stroke-linecap="round">' +
      '<path d="M' + (cx - 8) + ' ' + (y + 2) + ' L' + (cx - 34) + ' ' + (y - 4) + '"/>' +
      '<path d="M' + (cx - 8) + ' ' + (y + 5) + ' L' + (cx - 34) + ' ' + (y + 6) + '"/>' +
      '<path d="M' + (cx + 8) + ' ' + (y + 2) + ' L' + (cx + 34) + ' ' + (y - 4) + '"/>' +
      '<path d="M' + (cx + 8) + ' ' + (y + 5) + ' L' + (cx + 34) + ' ' + (y + 6) + '"/></g>';
    return nose + m + w;
  }

  // ----- 耳 -----
  function dogEars(a) {
    var c = a.color, d = darken(c, 30);
    if (a.ear === 'flop') {
      return '<ellipse cx="58" cy="78" rx="16" ry="30" fill="' + d + '" transform="rotate(18 58 78)"/>' +
        '<ellipse cx="142" cy="78" rx="16" ry="30" fill="' + d + '" transform="rotate(-18 142 78)"/>';
    }
    if (a.ear === 'round') {
      return '<circle cx="62" cy="58" r="16" fill="' + c + '"/><circle cx="138" cy="58" r="16" fill="' + c + '"/>' +
        '<circle cx="62" cy="58" r="8" fill="' + darken(a.color2 === '#fbf2e6' ? '#e8b9a0' : '#e8b9a0', 0) + '"/>' +
        '<circle cx="138" cy="58" r="8" fill="#e8b9a0"/>';
    }
    // prick（立ち耳）
    return '<path d="M58 70 L48 30 L82 56 Z" fill="' + c + '"/>' +
      '<path d="M142 70 L152 30 L118 56 Z" fill="' + c + '"/>' +
      '<path d="M60 64 L54 42 L74 56 Z" fill="#f0c2a8"/>' +
      '<path d="M140 64 L146 42 L126 56 Z" fill="#f0c2a8"/>';
  }

  function catEars(a) {
    var c = a.color;
    if (a.ear === 'fold') {
      return '<path d="M62 62 Q52 44 70 46 Q78 56 74 66 Z" fill="' + c + '"/>' +
        '<path d="M138 62 Q148 44 130 46 Q122 56 126 66 Z" fill="' + c + '"/>';
    }
    return '<path d="M60 62 L50 26 L84 52 Z" fill="' + c + '"/>' +
      '<path d="M140 62 L150 26 L116 52 Z" fill="' + c + '"/>' +
      '<path d="M62 58 L57 38 L76 52 Z" fill="#f3b0c0"/>' +
      '<path d="M138 58 L143 38 L124 52 Z" fill="#f3b0c0"/>';
  }

  // ----- 模様（本体内に収まる座標で配置）-----
  function dogPattern(a) {
    var p = a.pattern, c2 = a.color2;
    if (p === 'tan') {
      // 眉＋胸＋足先のタン
      return '<g fill="' + c2 + '">' +
        '<ellipse cx="78" cy="72" rx="9" ry="6"/><ellipse cx="122" cy="72" rx="9" ry="6"/>' +
        '<ellipse cx="100" cy="170" rx="20" ry="14"/>' +
        '<circle cx="80" cy="186" r="7"/><circle cx="120" cy="186" r="7"/></g>';
    }
    if (p === 'patch') {
      return '<g fill="' + c2 + '">' +
        '<path d="M78 70 Q60 80 64 104 Q86 110 92 88 Q90 72 78 70 Z"/>' +
        '<ellipse cx="100" cy="178" rx="22" ry="12"/></g>';
    }
    if (p === 'spot') {
      var s = '<g fill="' + c2 + '">';
      var pts = [[80, 80], [120, 84], [78, 160], [122, 158], [100, 180], [64, 150], [136, 150], [100, 132]];
      pts.forEach(function (pt, i) { s += '<circle cx="' + pt[0] + '" cy="' + pt[1] + '" r="' + (i % 2 ? 7 : 9) + '"/>'; });
      return s + '</g>';
    }
    return '';
  }

  function catPattern(a) {
    var p = a.pattern, c2 = a.color2;
    if (p === 'tabby') {
      return '<g fill="none" stroke="' + c2 + '" stroke-width="4" stroke-linecap="round">' +
        '<path d="M92 56 L100 66 L108 56"/>' +            // 額のM
        '<path d="M86 78 L84 90 M100 80 L100 92 M114 78 L116 90"/>' +
        '<path d="M82 140 L80 162 M100 142 L100 168 M118 140 L120 162"/></g>';
    }
    if (p === 'calico') {
      return '<g fill="' + c2 + '">' +
        '<path d="M76 60 Q58 70 66 96 Q88 100 90 78 Q88 62 76 60 Z"/>' +
        '<ellipse cx="124" cy="150" rx="20" ry="22"/></g>' +
        '<g fill="#3a322c">' +
        '<path d="M124 60 Q142 66 138 92 Q118 96 114 76 Q116 62 124 60 Z"/>' +
        '<ellipse cx="74" cy="156" rx="16" ry="18"/></g>';
    }
    if (p === 'tuxedo') {
      // 胸〜口元、足先を白(color2)
      return '<g fill="' + c2 + '">' +
        '<path d="M100 96 Q84 120 90 168 Q100 176 110 168 Q116 120 100 96 Z"/>' +
        '<ellipse cx="100" cy="104" rx="20" ry="14"/>' +
        '<ellipse cx="78" cy="186" rx="8" ry="7"/><ellipse cx="122" cy="186" rx="8" ry="7"/></g>';
    }
    if (p === 'point') {
      // シャム：口元・足先・尻尾が濃い
      return '<g fill="' + c2 + '" opacity="0.92">' +
        '<ellipse cx="100" cy="104" rx="22" ry="16"/>' +
        '<circle cx="80" cy="186" r="8"/><circle cx="120" cy="186" r="8"/></g>';
    }
    if (p === 'spot') {
      // ベンガルのロゼット
      var s = '<g fill="' + c2 + '">';
      var pts = [[78, 78], [120, 80], [76, 150], [122, 150], [100, 134], [64, 130], [136, 130], [100, 166]];
      pts.forEach(function (pt) { s += '<circle cx="' + pt[0] + '" cy="' + pt[1] + '" r="6.5"/>'; });
      return s + '</g>';
    }
    return '';
  }

  // ----- 本体ビルド -----
  function buildDog(a, mood) {
    var c = a.color, body = c, belly = a.color2;
    var s = '';
    // 後ろ足/おしり
    s += '<ellipse cx="100" cy="158" rx="50" ry="42" fill="' + body + '"/>';
    // おなか明色
    s += '<ellipse cx="100" cy="168" rx="30" ry="26" fill="' + belly + '" opacity="' + (a.pattern === 'solid' ? 0.55 : 0.0) + '"/>';
    // 前足
    s += '<rect x="74" y="168" width="16" height="30" rx="8" fill="' + body + '"/>';
    s += '<rect x="110" y="168" width="16" height="30" rx="8" fill="' + body + '"/>';
    // しっぽ
    s += '<path d="M148 156 Q176 150 168 124 Q160 138 150 138 Z" fill="' + body + '"/>';
    // 耳（頭の後ろ）
    s += dogEars(a);
    // 頭
    s += '<circle cx="100" cy="92" r="48" fill="' + body + '"/>';
    // 口元
    s += '<ellipse cx="100" cy="108" rx="24" ry="18" fill="' + belly + '"/>';
    // 模様
    s += dogPattern(a);
    // 目
    s += eye(82, 88, mood, a.eye, 8) + eye(118, 88, mood, a.eye, 8);
    // 鼻口
    s += dogNoseMouth(100, 102, mood);
    // ほっぺ（常時うっすら=ベビースキーマ。喜ぶと濃くなる。しょんぼり時は消す）
    if (mood !== 'sad') {
      var bo = mood === 'happy' ? 0.6 : 0.38;
      s += '<circle cx="70" cy="108" r="7" fill="#ffb3a0" opacity="' + bo + '"/><circle cx="130" cy="108" r="7" fill="#ffb3a0" opacity="' + bo + '"/>';
    }
    return s;
  }

  function buildCat(a, mood) {
    var c = a.color, body = c, belly = a.color2;
    var s = '';
    // しっぽ（体の右からくるん）
    s += '<path d="M150 168 Q188 160 184 120 Q180 100 166 108 Q176 120 172 144 Q168 162 148 158 Z" fill="' + body + '"/>';
    // 体
    s += '<ellipse cx="100" cy="160" rx="46" ry="42" fill="' + body + '"/>';
    // 前足
    s += '<rect x="76" y="170" width="15" height="28" rx="7" fill="' + body + '"/>';
    s += '<rect x="109" y="170" width="15" height="28" rx="7" fill="' + body + '"/>';
    // 耳
    s += catEars(a);
    // 頭
    s += '<circle cx="100" cy="92" r="46" fill="' + body + '"/>';
    // 模様
    s += catPattern(a);
    // 口元うっすら
    s += '<ellipse cx="100" cy="106" rx="16" ry="11" fill="' + belly + '" opacity="' + (a.pattern === 'solid' ? 0.4 : 0.0) + '"/>';
    // 目（猫は縦長め＝rやや小、ハイライト大）
    s += eye(82, 90, mood, a.eye, 8.5) + eye(118, 90, mood, a.eye, 8.5);
    // 鼻口ひげ
    s += catNoseMouth(100, 102, mood);
    if (mood !== 'sad') {
      var bo = mood === 'happy' ? 0.55 : 0.35;
      s += '<circle cx="72" cy="106" r="6" fill="#ffb3a0" opacity="' + bo + '"/><circle cx="128" cy="106" r="6" fill="#ffb3a0" opacity="' + bo + '"/>';
    }
    return s;
  }

  function eggSVG(breed) {
    var c = breed ? breed.art.color : '#e8d5b0';
    var hint = breed ? breed.art.color2 : '#fff';
    return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="100" cy="170" rx="44" ry="10" fill="rgba(120,90,60,.12)"/>' +
      '<path d="M100 30 C60 30 50 96 50 122 C50 158 74 178 100 178 C126 178 150 158 150 122 C150 96 140 30 100 30 Z" fill="' + c + '"/>' +
      '<g fill="' + hint + '" opacity=".5">' +
      '<circle cx="80" cy="96" r="9"/><circle cx="118" cy="84" r="7"/><circle cx="112" cy="124" r="10"/><circle cx="78" cy="140" r="6"/></g>' +
      '<path d="M70 108 L88 100 L80 116 L98 110 L90 126" fill="none" stroke="rgba(60,40,20,.35)" stroke-width="3" stroke-linejoin="round"/>' +
      '</svg>';
  }

  /** stage: 0=卵,1=赤ちゃん,2=子,3=成体 / mood: happy|normal|sad */
  function petSVG(breed, stage, mood) {
    if (stage <= 0) return eggSVG(breed);
    mood = mood || 'normal';
    var a = breed.art;
    var inner = a.base === 'cat' ? buildCat(a, mood) : buildDog(a, mood);
    // 成長段階でスケール（赤ちゃんは小さくまんまる）
    var scale = stage === 1 ? 0.62 : stage === 2 ? 0.82 : 1;
    var ty = stage === 1 ? 30 : stage === 2 ? 14 : 0;
    var fluff = a.fluffy
      ? '<g transform="translate(100 ' + (118) + ') scale(' + scale + ') translate(-100 -118)" filter="">' +
        '<circle cx="100" cy="100" r="0" fill="none"/></g>' : '';
    return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="100" cy="192" rx="' + (50 * scale) + '" ry="9" fill="rgba(120,90,60,.14)"/>' +
      '<g transform="translate(100 ' + (110 + ty) + ') scale(' + scale + ') translate(-100 -110)">' +
      (a.fluffy ? fluffOutline(a) : '') + inner + '</g>' +
      fluff + '</svg>';
  }

  // ふわふわ品種の輪郭（本体の後ろに薄い毛）
  function fluffOutline(a) {
    var c = darken(a.color, -10);
    return '<g fill="' + a.color + '" opacity=".55">' +
      '<circle cx="100" cy="95" r="56"/><ellipse cx="100" cy="160" rx="56" ry="48"/></g>';
  }

  /** 図鑑サムネ（成体・笑顔・固定） */
  function thumbSVG(breed) {
    return petSVG(breed, 3, 'happy');
  }

  global.Art = { petSVG: petSVG, eggSVG: eggSVG, thumbSVG: thumbSVG };
})(typeof window !== 'undefined' ? window : this);
