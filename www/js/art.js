/**
 * プロシージャルSVGアート生成
 * breeds.js の art パラメータから犬・猫を描き分ける。
 * clipPath/グラデの id を使わず、模様は本体内に収まる座標で配置（同一ページに多数描画してもid衝突しない）。
 */
(function (global) {
  'use strict';

  // ===== 画風ノブ（デフォルト=30ペルソナ評価4サイクルで確定した値。docs/ART_STYLE.md §4 が正）=====
  // 推移: B 26.6 → F 28.0 → H 28.9/35 → M 34.0/40（スタンプ基準E8追加。docs/art/eval-cycle1〜4.md）
  var STYLE = {
    outlineWidth: 3.2,                  // やわらか輪郭線（細線2.2は44pxで蒸発・サイクル2で棄却）
    outlineColor: 'rgba(74,52,30,.5)',  // 輪郭の色（茶系。黒は使わない）
    eyeStyle: 'softdot',                // 色付き点目（ゆるさ×品種の目色の両立。サイクル2採用）
    eyeScale: 1.05,                     // 目の大きさ倍率
    blushBoost: 0.1,                    // ほっぺ不透明度への加算
    blushShape: 'paw',                  // にくきゅう型ほっぺ＝ブランドのシグネチャー（サイクル3採用）
    body: 'mochi',                      // もちもちブロブ＝スタンプ文法（サイクル4採用。ゆらぎ輪郭mochiwobは44pxにじみで棄却）
    mouthStyle: 'soft',                 // ω口（猫）・へにゃ口（犬）＝スタンプ文法（サイクル4採用）
    renderer: 'pixelate',               // 'pixelate'=ベクター絵を粗グリッドに落とす（本体・必要最低限のドット感）/ 'vector' / 'pixel'(32pxスプライト・棄却済み)
    pixelGrid: 64                       // pixelate時のラスタライズ解像度（表示192px=3x整数倍）
  };
  function setStyle(s) { STYLE = Object.assign({}, STYLE, s || {}); }
  function olAttr() {
    return STYLE.outlineWidth > 0
      ? ' stroke="' + STYLE.outlineColor + '" stroke-width="' + STYLE.outlineWidth + '" stroke-linejoin="round"'
      : '';
  }

  // amt>0 で暗く、amt<0 で明るく（0-255にクランプ）
  function darken(hex, amt) {
    var c = hex.replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    var r = Math.min(255, Math.max(0, parseInt(c.substr(0, 2), 16) - amt));
    var g = Math.min(255, Math.max(0, parseInt(c.substr(2, 2), 16) - amt));
    var b = Math.min(255, Math.max(0, parseInt(c.substr(4, 2), 16) - amt));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  /** 体色が暗いか（黒猫・黒ラブ等）。暗色キャラは顔パーツを明るく補正して小サイズでも顔が読めるようにする */
  function isDark(hex) {
    var c = hex.replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    var r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) < 92;
  }
  var LIGHT_INK = '#f0e6d8'; // 暗色キャラ用の明るい描線（クリーム）

  // ----- もちもちブロブ体（CHARACTER_DESIGN.md §2.1）-----
  // 曲率リズム: 頭頂→こめかみ(締)→頬(張・最大幅=頭)→あご下で首のくびれ→胴(頭より一回り細い)→接地(潰)
  // 頭が最大幅・胴はその0.9倍＝「大きな頭＋ちゃんとした胴体」の子犬子猫比率。右側は1〜2単位の非対称
  function mochiPath() {
    return 'M100 40 ' +
      'C80 40 64 50 58 68 ' +      // 頭頂→こめかみ（締まる）
      'C50 82 44 92 44 106 ' +     // 頬の張り出し（最大幅・目より下）
      'C44 118 52 126 58 130 ' +   // あご下→首のくびれ（頭と胴の境）
      'C50 140 48 152 49 163 ' +   // 胴・おしり（頭より細い）
      'C50 176 62 182 100 182 ' +  // 接地（底辺は平らに潰れる）
      'C139 182 150.5 176 151.5 163 ' + // 右はわずかに非対称
      'C152.5 152 150.5 140 142.5 130 ' +
      'C148.5 126 156.5 118 156.5 107 ' +
      'C156 92 150 82 142.5 68 ' +
      'C136 50 120 40 100 40 Z';
  }

  /** もちもちボディ一式（ブロブ＋前足のまるいおてて）。tail/ears/faceは呼び出し側で重ねる */
  function mochiBody(a) {
    var s = '';
    s += '<path d="' + mochiPath() + '" fill="' + a.color + '"' + olAttr() + '/>';
    // おなか明色（solid のみ）
    s += '<ellipse cx="100" cy="158" rx="27" ry="22" fill="' + a.color2 + '" opacity="' + (a.pattern === 'solid' ? 0.5 : 0.0) + '"/>';
    return s;
  }

  /** 手足の色（暗色キャラは体と同化しないよう少し明るくする） */
  function limbFill(a) {
    return isDark(a.color) ? darken(a.color, -22) : a.color;
  }

  /** あんよ（脚）＋指のスジ（CHARACTER_DESIGN.md §2.1）。
      体に埋めず、接地線から手前にちょこんとはみ出させる */
  function mochiPaws(a) {
    var fill = limbFill(a);
    var ink = isDark(a.color) ? 'rgba(240,230,216,.6)' : 'rgba(60,42,26,.45)';
    function paw(cx) {
      return '<ellipse cx="' + cx + '" cy="178" rx="13.5" ry="10" fill="' + fill + '"' + olAttr() + '/>' +
        '<path d="M' + (cx - 4.5) + ' 171 L' + (cx - 4.5) + ' 181 M' + (cx + 4.5) + ' 171 L' + (cx + 4.5) + ' 181"' +
        ' stroke="' + ink + '" stroke-width="2.4" stroke-linecap="round" fill="none"/>';
    }
    return paw(77) + paw(123);
  }

  /** おてて（腕）= 擬人化の記号（CHARACTER_DESIGN.md §2.1 ポーズ体系）。
      体の脇から小さく斜め下に。短くて届かない腕＝庇護欲（DEEP_DIVE §7） */
  function mochiArms(a) {
    var fill = limbFill(a);
    return '<ellipse cx="42" cy="141" rx="7.5" ry="14.5" fill="' + fill + '"' + olAttr() + ' transform="rotate(24 42 141)"/>' +
      '<ellipse cx="158" cy="141" rx="7.5" ry="14.5" fill="' + fill + '"' + olAttr() + ' transform="rotate(-24 158 141)"/>';
  }

  // ----- ほっぺ -----
  // paw: 肉球のかたちのほっぺ（ブランドモチーフを頬に宿すシグネチャー要素）
  function blush(x, y, r, o) {
    if (STYLE.blushShape === 'paw') {
      return '<g fill="#ffb3a0" opacity="' + o + '">' +
        '<ellipse cx="' + x + '" cy="' + (y + r * 0.25) + '" rx="' + (r * 0.85) + '" ry="' + (r * 0.62) + '"/>' +
        '<circle cx="' + (x - r * 0.55) + '" cy="' + (y - r * 0.42) + '" r="' + (r * 0.3) + '"/>' +
        '<circle cx="' + x + '" cy="' + (y - r * 0.6) + '" r="' + (r * 0.32) + '"/>' +
        '<circle cx="' + (x + r * 0.55) + '" cy="' + (y - r * 0.42) + '" r="' + (r * 0.3) + '"/></g>';
    }
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#ffb3a0" opacity="' + o + '"/>';
  }

  // ----- 目 -----
  // rim=true（暗色キャラ）: 目のまわりに明るい縁取りを敷き、線目は明色で描く
  function eye(x, y, mood, color, r, rim) {
    r = r * STYLE.eyeScale;
    var ink = rim ? LIGHT_INK : '#2a2018';
    var backing = rim ? '<circle cx="' + x + '" cy="' + y + '" r="' + (r * 1.18) + '" fill="' + LIGHT_INK + '" opacity=".75"/>' : '';
    if (mood === 'happy') {
      return '<path d="M' + (x - r) + ' ' + y + ' Q' + x + ' ' + (y - r * 1.3) + ' ' + (x + r) + ' ' + y +
        '" fill="none" stroke="' + ink + '" stroke-width="3.2" stroke-linecap="round"/>';
    }
    if (mood === 'sad') {
      return backing + '<circle cx="' + x + '" cy="' + (y + 1) + '" r="' + (r * 0.7) + '" fill="#241a12"/>' +
        '<path d="M' + (x - r) + ' ' + (y - r * 0.9) + ' Q' + x + ' ' + (y - r * 1.6) + ' ' + (x + r) + ' ' + (y - r * 0.9) +
        '" fill="none" stroke="' + ink + '" stroke-width="2.4" stroke-linecap="round"/>';
    }
    if (STYLE.eyeStyle === 'dot') {
      // ゆる点目（虹彩なし・小さなハイライトのみ）
      return backing + '<circle cx="' + x + '" cy="' + y + '" r="' + (r * 0.72) + '" fill="#241a12"/>' +
        '<circle cx="' + (x - r * 0.22) + '" cy="' + (y - r * 0.26) + '" r="' + (r * 0.2) + '" fill="#fff" opacity=".9"/>';
    }
    if (STYLE.eyeStyle === 'softdot') {
      // 微笑みの目（CHARACTER_DESIGN.md §2.3）:
      // 虹彩は下をわずかに切った楕円(ry=0.80r/rx=0.85r)・瞳孔68%・視線は内へ1.2（「あなたを見てる」）
      // ハイライトは主1（光源=左上で全キャラ統一）＋副1のみ
      var inw = (x < 100 ? 1 : -1) * 1.2;
      return backing +
        '<ellipse cx="' + x + '" cy="' + y + '" rx="' + (r * 0.85) + '" ry="' + (r * 0.80) + '" fill="' + color + '"/>' +
        '<circle cx="' + (x + inw) + '" cy="' + (y + r * 0.04) + '" r="' + (r * 0.58) + '" fill="#241a12"/>' +
        '<circle cx="' + (x + inw - r * 0.2) + '" cy="' + (y - r * 0.22) + '" r="' + (r * 0.22) + '" fill="#fff"/>' +
        '<circle cx="' + (x + inw + r * 0.22) + '" cy="' + (y + r * 0.24) + '" r="' + (r * 0.1) + '" fill="#fff" opacity=".8"/>';
    }
    // sparkle（虹彩＋ハイライト）
    return backing + '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + color + '"/>' +
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
    } else if (STYLE.mouthStyle === 'soft') {
      // へにゃ口（くちを閉じたゆる笑い＝スタンプ文法）
      m = '<path d="M' + cx + ' ' + (y + 5) + ' L' + cx + ' ' + (y + 10) +
        ' M' + (cx - 9) + ' ' + (y + 13) + ' Q' + cx + ' ' + (y + 20) + ' ' + (cx + 9) + ' ' + (y + 13) +
        '" fill="none" stroke="#2a2018" stroke-width="2.4" stroke-linecap="round"/>';
    } else {
      m = '<path d="M' + cx + ' ' + (y + 5) + ' L' + cx + ' ' + (y + 11) +
        ' M' + (cx - 9) + ' ' + (y + 14) + ' Q' + cx + ' ' + (y + 18) + ' ' + cx + ' ' + (y + 11) +
        ' M' + (cx + 9) + ' ' + (y + 14) + ' Q' + cx + ' ' + (y + 18) + ' ' + cx + ' ' + (y + 11) + '" fill="none" stroke="#2a2018" stroke-width="2.4" stroke-linecap="round"/>';
    }
    return nose + m;
  }

  function catNoseMouth(cx, y, mood, dark) {
    var nose = '<path d="M' + (cx - 5) + ' ' + y + ' L' + (cx + 5) + ' ' + y + ' L' + cx + ' ' + (y + 5) + ' Z" fill="#ef8da0"/>';
    var m;
    if (mood === 'happy') {
      m = '<path d="M' + cx + ' ' + (y + 5) + ' Q' + (cx - 8) + ' ' + (y + 14) + ' ' + (cx - 12) + ' ' + (y + 7) +
        ' M' + cx + ' ' + (y + 5) + ' Q' + (cx + 8) + ' ' + (y + 14) + ' ' + (cx + 12) + ' ' + (y + 7) + '" fill="none" stroke="#2a2018" stroke-width="2.2" stroke-linecap="round"/>';
    } else if (mood === 'sad') {
      m = '<path d="M' + (cx - 8) + ' ' + (y + 13) + ' Q' + cx + ' ' + (y + 7) + ' ' + (cx + 8) + ' ' + (y + 13) + '" fill="none" stroke="#2a2018" stroke-width="2.2" stroke-linecap="round"/>';
    } else if (STYLE.mouthStyle === 'soft') {
      // ω口（ねこスタンプの定番）
      m = '<path d="M' + (cx - 12) + ' ' + (y + 8) + ' q6 7 12 0 q6 7 12 0' +
        '" fill="none" stroke="#2a2018" stroke-width="2.2" stroke-linecap="round"/>';
    } else {
      m = '<path d="M' + cx + ' ' + (y + 5) + ' L' + cx + ' ' + (y + 9) +
        ' M' + (cx - 7) + ' ' + (y + 12) + ' Q' + cx + ' ' + (y + 15) + ' ' + cx + ' ' + (y + 9) +
        ' M' + (cx + 7) + ' ' + (y + 12) + ' Q' + cx + ' ' + (y + 15) + ' ' + cx + ' ' + (y + 9) + '" fill="none" stroke="#2a2018" stroke-width="2" stroke-linecap="round"/>';
    }
    // ひげ
    var w = '<g stroke="' + (dark ? 'rgba(240,230,216,.65)' : 'rgba(90,70,50,.5)') + '" stroke-width="1.4" stroke-linecap="round">' +
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
      return '<ellipse cx="58" cy="78" rx="16" ry="30" fill="' + d + '"' + olAttr() + ' transform="rotate(18 58 78)"/>' +
        '<ellipse cx="142" cy="78" rx="16" ry="30" fill="' + d + '"' + olAttr() + ' transform="rotate(-18 142 78)"/>';
    }
    if (a.ear === 'round') {
      return '<circle cx="62" cy="58" r="16" fill="' + c + '"' + olAttr() + '/><circle cx="138" cy="58" r="16" fill="' + c + '"' + olAttr() + '/>' +
        '<circle cx="62" cy="58" r="8" fill="' + darken(a.color2 === '#fbf2e6' ? '#e8b9a0' : '#e8b9a0', 0) + '"/>' +
        '<circle cx="138" cy="58" r="8" fill="#e8b9a0"/>';
    }
    if (a.ear === 'bigprick') {
      // 大きな立ち耳（コーギー等。柴犬との描き分け用）
      return '<path d="M52 76 L38 18 L86 54 Z" fill="' + c + '"' + olAttr() + '/>' +
        '<path d="M148 76 L162 18 L114 54 Z" fill="' + c + '"' + olAttr() + '/>' +
        '<path d="M56 66 L46 32 L78 52 Z" fill="#f0c2a8"/>' +
        '<path d="M144 66 L154 32 L122 52 Z" fill="#f0c2a8"/>';
    }
    // prick（立ち耳）
    return '<path d="M58 70 L48 30 L82 56 Z" fill="' + c + '"' + olAttr() + '/>' +
      '<path d="M142 70 L152 30 L118 56 Z" fill="' + c + '"' + olAttr() + '/>' +
      '<path d="M60 64 L54 42 L74 56 Z" fill="#f0c2a8"/>' +
      '<path d="M140 64 L146 42 L126 56 Z" fill="#f0c2a8"/>';
  }

  function catEars(a) {
    var c = a.color;
    if (a.ear === 'fold') {
      return '<path d="M62 62 Q52 44 70 46 Q78 56 74 66 Z" fill="' + c + '"' + olAttr() + '/>' +
        '<path d="M138 62 Q148 44 130 46 Q122 56 126 66 Z" fill="' + c + '"' + olAttr() + '/>';
    }
    return '<path d="M60 62 L50 26 L84 52 Z" fill="' + c + '"' + olAttr() + '/>' +
      '<path d="M140 62 L150 26 L116 52 Z" fill="' + c + '"' + olAttr() + '/>' +
      '<path d="M62 58 L57 38 L76 52 Z" fill="#f3b0c0"/>' +
      '<path d="M138 58 L143 38 L124 52 Z" fill="#f3b0c0"/>';
  }

  // ----- 模様（本体内に収まる座標で配置）-----
  // mochi=true のとき足先マーク（くつした）は省略する（まるい前足の色で表現するため）
  function dogPattern(a, mochi) {
    var p = a.pattern, c2 = a.color2;
    if (p === 'tan') {
      // 眉＋胸＋足先のタン
      return '<g fill="' + c2 + '">' +
        '<ellipse cx="78" cy="72" rx="9" ry="6"/><ellipse cx="122" cy="72" rx="9" ry="6"/>' +
        '<ellipse cx="100" cy="170" rx="20" ry="14"/>' +
        (mochi ? '' : '<circle cx="80" cy="186" r="7"/><circle cx="120" cy="186" r="7"/>') + '</g>';
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

  function catPattern(a, mochi) {
    var p = a.pattern, c2 = a.color2;
    if (p === 'tabby') {
      // 縞は模様＝外輪郭(3.2)より細く（線階層 CHARACTER_DESIGN.md §2.4）
      return '<g fill="none" stroke="' + c2 + '" stroke-width="2.2" stroke-linecap="round">' +
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
        (mochi ? '' : '<ellipse cx="78" cy="186" rx="8" ry="7"/><ellipse cx="122" cy="186" rx="8" ry="7"/>') + '</g>';
    }
    if (p === 'point') {
      // シャム：口元・足先・尻尾が濃い
      return '<g fill="' + c2 + '" opacity="0.92">' +
        '<ellipse cx="100" cy="104" rx="22" ry="16"/>' +
        (mochi ? '' : '<circle cx="80" cy="186" r="8"/><circle cx="120" cy="186" r="8"/>') + '</g>';
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
    var mochi = STYLE.body !== 'snowman';
    var s = '';
    if (a.tail === 'curl') {
      // 巻き尾（柴犬の最強識別子 CHARACTER_DESIGN.md §2.7）: 背の右上から外へくるんとはみ出す渦
      s += '<circle cx="162" cy="112" r="12.5" fill="' + body + '"' + olAttr() + '/>' +
        '<circle cx="165" cy="109" r="5.5" fill="' + belly + '"/>';
    } else {
      // しっぽ
      s += '<path d="M148 156 Q176 150 168 124 Q160 138 150 138 Z" fill="' + body + '"' + olAttr() + '/>';
    }
    // 耳（体の後ろ）
    s += dogEars(a);
    if (mochi) {
      // もちもちブロブ（頭と体が一体）
      s += mochiBody(a);
    } else {
      // 後ろ足/おしり
      s += '<ellipse cx="100" cy="158" rx="50" ry="42" fill="' + body + '"' + olAttr() + '/>';
      // おなか明色
      s += '<ellipse cx="100" cy="168" rx="30" ry="26" fill="' + belly + '" opacity="' + (a.pattern === 'solid' ? 0.55 : 0.0) + '"/>';
      // 前足
      s += '<rect x="74" y="168" width="16" height="30" rx="8" fill="' + body + '"' + olAttr() + '/>';
      s += '<rect x="110" y="168" width="16" height="30" rx="8" fill="' + body + '"' + olAttr() + '/>';
      // 頭
      s += '<circle cx="100" cy="92" r="48" fill="' + body + '"' + olAttr() + '/>';
    }
    // 口元（暗色キャラは明るい口元に補正＝小サイズで顔が読めるように）
    var dark = isDark(c);
    s += '<ellipse cx="100" cy="108" rx="24" ry="18" fill="' + (isDark(belly) ? LIGHT_INK : belly) + '"/>';
    // 模様
    s += dogPattern(a, mochi);
    // 腕とあんよ（擬人化基本形）
    if (mochi) s += mochiArms(a) + mochiPaws(a);
    // 目
    s += eye(82, 88, mood, a.eye, 8, dark) + eye(118, 88, mood, a.eye, 8, dark);
    // 鼻口
    s += dogNoseMouth(100, 102, mood);
    // ほっぺ（常時うっすら=ベビースキーマ。喜ぶと濃くなる。しょんぼり時は消す）
    if (mood !== 'sad') {
      var bo = Math.min(0.85, (mood === 'happy' ? 0.6 : 0.38) + STYLE.blushBoost);
      s += blush(70, 108, 7, bo) + blush(130, 108, 7, bo);
    }
    return s;
  }

  function buildCat(a, mood) {
    var c = a.color, body = c, belly = a.color2;
    var mochi = STYLE.body !== 'snowman';
    var s = '';
    // しっぽ（体の右からくるん）
    s += '<path d="M150 168 Q188 160 184 120 Q180 100 166 108 Q176 120 172 144 Q168 162 148 158 Z" fill="' + body + '"' + olAttr() + '/>';
    // 耳（体の後ろ）
    s += catEars(a);
    if (mochi) {
      s += mochiBody(a);
    } else {
      // 体
      s += '<ellipse cx="100" cy="160" rx="46" ry="42" fill="' + body + '"' + olAttr() + '/>';
      // 前足
      s += '<rect x="76" y="170" width="15" height="28" rx="7" fill="' + body + '"' + olAttr() + '/>';
      s += '<rect x="109" y="170" width="15" height="28" rx="7" fill="' + body + '"' + olAttr() + '/>';
      // 頭
      s += '<circle cx="100" cy="92" r="46" fill="' + body + '"' + olAttr() + '/>';
    }
    // 模様
    s += catPattern(a, mochi);
    // 口元うっすら（暗色キャラは明るい口元に補正）
    var dark = isDark(c);
    s += '<ellipse cx="100" cy="106" rx="16" ry="11" fill="' + (dark ? LIGHT_INK : belly) + '" opacity="' + (dark ? 0.85 : (a.pattern === 'solid' ? 0.4 : 0.0)) + '"/>';
    // まるい前足（おてて）
    if (mochi) s += mochiPaws(a);
    // 目（猫は縦長め＝rやや小、ハイライト大）
    s += eye(82, 90, mood, a.eye, 8.5, dark) + eye(118, 90, mood, a.eye, 8.5, dark);
    // 鼻口ひげ（ひげは体色が暗ければ明るく）
    s += catNoseMouth(100, 102, mood, dark);
    if (mood !== 'sad') {
      var bo = Math.min(0.85, (mood === 'happy' ? 0.55 : 0.35) + STYLE.blushBoost);
      s += blush(72, 106, 6, bo) + blush(128, 106, 6, bo);
    }
    return s;
  }

  /** おくるみ（毛布にくるまってねんね中の赤ちゃん）。色は品種のヒントになる */
  function bundleSVG(breed) {
    var c = breed ? breed.art.color : '#e8d5b0';
    var hint = breed ? breed.art.color2 : '#fff';
    var dk = darken(c, 26);
    return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="100" cy="172" rx="48" ry="10" fill="rgba(120,90,60,.12)"/>' +
      // 毛布のかたまり（しずく型のおくるみ）
      '<path d="M100 44 C64 44 48 92 48 126 C48 160 70 176 100 176 C130 176 152 160 152 126 C152 92 136 44 100 44 Z" fill="' + c + '"/>' +
      // 毛布の巻きライン
      '<path d="M58 110 Q100 132 142 110 M64 84 Q100 104 136 84" fill="none" stroke="' + dk + '" stroke-width="4" stroke-linecap="round" opacity=".55"/>' +
      // 顔まわりの毛布のふち
      '<path d="M70 70 Q100 46 130 70 Q132 92 100 96 Q68 92 70 70 Z" fill="' + hint + '" opacity=".9"/>' +
      // ねんね中の顔（とじた目・ちいさな口・ほっぺ）
      '<path d="M84 74 Q89 79 94 74 M106 74 Q111 79 116 74" fill="none" stroke="#3a2c1c" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M96 84 Q100 87 104 84" fill="none" stroke="#3a2c1c" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle cx="80" cy="82" r="5" fill="#ffb3a0" opacity=".5"/><circle cx="120" cy="82" r="5" fill="#ffb3a0" opacity=".5"/>' +
      // zzz
      '<g fill="rgba(90,70,50,.55)" font-family="sans-serif" font-weight="bold">' +
      '<text x="142" y="58" font-size="18">z</text><text x="154" y="44" font-size="14">z</text><text x="163" y="33" font-size="11">z</text></g>' +
      '</svg>';
  }

  // ===== ドット絵レンダラ v3（プロシージャル・32px）=====
  // 32x32グリッドに楕円・三角を整数ラスタライズ。輪郭は隣接色を暗くした色相つき輪郭を自動生成。
  // vector版と同じ品種パラメータで描き分けるため、品種追加コストは増えない。
  function pixelSVG(breed, stage, mood) {
    var a = breed.art;
    var W = 32, Hh = 32;
    var g = [];
    for (var i = 0; i < Hh; i++) g.push(new Array(W).fill(null));

    function inb(x, y) { return x >= 0 && x < W && y >= 0 && y < Hh; }
    function px(x, y, col) { x = Math.round(x); y = Math.round(y); if (inb(x, y)) g[y][x] = col; }
    function ell(cx, cy, rx, ry, col) {
      for (var y = 0; y < Hh; y++) for (var x = 0; x < W; x++) {
        var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) g[y][x] = col;
      }
    }
    function tri(x1, y1, x2, y2, x3, y3, col) {
      function sgn(ax, ay, bx, by, px_, py_) { return (px_ - bx) * (ay - by) - (ax - bx) * (py_ - by); }
      for (var y = 0; y < Hh; y++) for (var x = 0; x < W; x++) {
        var cx2 = x + 0.5, cy2 = y + 0.5;
        var d1 = sgn(x1, y1, x2, y2, cx2, cy2), d2 = sgn(x2, y2, x3, y3, cx2, cy2), d3 = sgn(x3, y3, x1, y1, cx2, cy2);
        var neg = (d1 < 0) || (d2 < 0) || (d3 < 0), pos = (d1 > 0) || (d2 > 0) || (d3 > 0);
        if (!(neg && pos)) g[y][x] = col;
      }
    }

    var C = a.color, C2 = a.color2;
    var dark = isDark(C);
    function lum(hex) {
      var c = hex.replace('#', '');
      if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
      return 0.299 * parseInt(c.substr(0, 2), 16) + 0.587 * parseInt(c.substr(2, 2), 16) + 0.114 * parseInt(c.substr(4, 2), 16);
    }
    // 口元はじゅうぶん明るい C2 のみ流用。中間色（オレンジ等）はクリームに（豚鼻化を防ぐ）
    var MZ = lum(C2) >= 185 && !dark ? C2 : '#f0e6d8';
    var isCat = a.base === 'cat';

    // しっぽ（犬は低めのまるしっぽ＝羽に見せない）
    if (isCat) { ell(28.2, 18.6, 1.2, 4.6, C); ell(27.4, 12.9, 1.3, 1.1, C); }
    else ell(25.9, 21, 1.9, 1.5, C);
    // 耳（立ち耳系は頭の後ろ＝先に描く。垂れ耳は頭のあとに重ねる）
    var earCol = a.pattern === 'point' ? C2 : C;
    var inner = '#f3b0c0';
    if (a.ear === 'round') { ell(8.4, 5.6, 2.7, 2.7, C); ell(23.6, 5.6, 2.7, 2.7, C); ell(8.4, 5.9, 1.3, 1.3, '#e8b9a0'); ell(23.6, 5.9, 1.3, 1.3, '#e8b9a0'); }
    else if (a.ear === 'fold') { tri(9, 3.6, 12.6, 6.4, 7, 7, earCol); tri(23, 3.6, 19.4, 6.4, 25, 7, earCol); }
    else if (a.ear === 'bigprick') {
      tri(8, 0, 13.4, 7.6, 4.6, 7.6, earCol); tri(24, 0, 18.6, 7.6, 27.4, 7.6, earCol);
      tri(8.2, 2.4, 11, 6.8, 6.4, 6.8, inner); tri(23.8, 2.4, 25.6, 6.8, 21, 6.8, inner);
    } else if (a.ear === 'prick') {
      var ty = isCat ? 0.8 : 1.8;
      var hw = isCat ? 2.7 : 3.2;
      tri(9, ty, 9 + hw, 7.2, 9 - hw, 7.2, earCol); tri(23, ty, 23 + hw, 7.2, 23 - hw, 7.2, earCol);
      tri(9, ty + 1.8, 10.4, 6.6, 7.6, 6.6, inner); tri(23, ty + 1.8, 24.4, 6.6, 21.6, 6.6, inner);
    }
    // 体と頭（もちもち一体）
    ell(16, 21.2, 8.9, 7.7, C);
    ell(16, 11, 8.3, 7.3, C);
    // 垂れ耳（頭のふちから下がる大きめの耳）
    if (a.ear === 'flop') {
      ell(7.6, 9.4, 2.3, 4.2, darken(C, 32)); ell(24.4, 9.4, 2.3, 4.2, darken(C, 32));
      px(7.6, 5.8, darken(C, 32)); px(24.4, 5.8, darken(C, 32));
    }
    // 模様
    if (a.pattern === 'tan') { ell(11.5, 7.8, 1.4, 0.9, C2); ell(20.5, 7.8, 1.4, 0.9, C2); ell(16, 22.6, 3.9, 3, C2); }
    if (a.pattern === 'patch') { ell(11, 8.6, 3.2, 3.6, C2); ell(16, 23.2, 3.8, 2.6, C2); }
    if (a.pattern === 'spot') { [[10, 19], [21, 18.4], [13, 24], [19.6, 24], [16, 20.6], [8.6, 22]].forEach(function (p) { ell(p[0], p[1], 1.3, 1.2, C2); }); }
    if (a.pattern === 'tabby') {
      px(13, 4.8, C2); px(14, 4.2, C2); px(16, 4), C2; px(16, 4, C2); px(18, 4.2, C2); px(19, 4.8, C2); // 額のM
      [[9.2, 19], [9.4, 22], [22.8, 19], [22.6, 22], [16, 25.4]].forEach(function (p) { px(p[0], p[1], C2); px(p[0], p[1] + 1, C2); });
    }
    if (a.pattern === 'calico') { ell(10.6, 6.6, 2.9, 2.6, C2); ell(21.8, 6.2, 2.4, 2.2, '#3a322c'); ell(20, 22, 3.2, 2.9, C2); }
    if (a.pattern === 'tuxedo') { ell(16, 22, 4.4, 5.2, C2); }
    if (a.pattern === 'point') { ell(11.5, 27, 2.4, 1.9, C2); ell(20.5, 27, 2.4, 1.9, C2); }
    // 口元
    ell(16, 14.6, isCat ? 3.7 : 4.4, isCat ? 2.5 : 3.2, MZ);
    // 前足（おてて）＋指のスジ
    var pawCol = (a.pattern === 'tan' || a.pattern === 'tuxedo' || a.pattern === 'point') ? C2 : (dark ? darken(C, -26) : C);
    ell(11.5, 27.2, 2.4, 1.9, pawCol); ell(20.5, 27.2, 2.4, 1.9, pawCol);
    var toeInk = dark ? 'rgba(240,230,216,.5)' : 'rgba(60,42,26,.35)';
    px(11.5, 26.4, toeInk); px(11.5, 27.4, toeInk); px(20.5, 26.4, toeInk); px(20.5, 27.4, toeInk);
    // 顔（暗色キャラは目のまわりに明るい下地を敷く）
    var eyeInk = '#241a12';
    if (dark) { ell(11.5, 10.6, 2, 1.9, '#f0e6d8'); ell(20.5, 10.6, 2, 1.9, '#f0e6d8'); }
    if (mood === 'happy') {
      // にっこり閉じ目（^）
      [[10, 10.4], [11, 9.6], [12, 9.6], [13, 10.4], [19, 10.4], [20, 9.6], [21, 9.6], [22, 10.4]].forEach(function (p) { px(p[0], p[1], eyeInk); });
    } else if (mood === 'sad') {
      px(11.5, 10.8, eyeInk); px(20.5, 10.8, eyeInk);
      px(10.5, 9.4, eyeInk); px(11.5, 9, eyeInk); px(20.5, 9, eyeInk); px(21.5, 9.4, eyeInk);
    } else {
      // 2x3の瞳: 上下=焦げ茶・中段=目色・瞳内ハイライト（浮きハイライトはジト目に見えるため廃止）
      [[11, 9], [12, 9], [11, 11], [12, 11], [20, 9], [21, 9], [20, 11], [21, 11]].forEach(function (p) { px(p[0], p[1], eyeInk); });
      [[11, 10], [12, 10], [20, 10], [21, 10]].forEach(function (p) { px(p[0], p[1], a.eye); });
      px(11, 9, '#ffffff'); px(20, 9, '#ffffff');
    }
    // 鼻とω口/へにゃ口
    if (isCat) {
      px(15.5, 13.4, '#ef8da0'); px(16.5, 13.4, '#ef8da0');
      px(13.5, 15.4, eyeInk); px(14.5, 16.2, eyeInk); px(15.7, 15.4, eyeInk); px(16.3, 15.4, eyeInk); px(17.5, 16.2, eyeInk); px(18.5, 15.4, eyeInk); // ω
    } else {
      px(15.5, 13.2, eyeInk); px(16.5, 13.2, eyeInk); px(16, 14.2, eyeInk);
      px(14, 16, eyeInk); px(15, 16.8, eyeInk); px(16, 16.8, eyeInk); px(17, 16.8, eyeInk); px(18, 16, eyeInk); // へにゃ
    }
    if (mood === 'sad') { px(15, 16.8, null); px(16, 16, eyeInk); px(17, 16.8, null); }
    // にくきゅう風ほっぺ（2px＋上に1pxの指球）
    var blushCol = mood === 'sad' ? null : '#ffb3a0';
    if (blushCol) {
      px(8, 13.6, blushCol); px(9, 13.6, blushCol); px(8.5, 12.8, blushCol);
      px(23, 13.6, blushCol); px(24, 13.6, blushCol); px(23.5, 12.8, blushCol);
    }
    // シルエット輪郭の自動生成（隣接ピクセルの色を暗くした色相つき輪郭）
    var add = [];
    for (var y2 = 0; y2 < Hh; y2++) for (var x2 = 0; x2 < W; x2++) {
      if (g[y2][x2]) continue;
      var nb = null;
      if (inb(x2 + 1, y2) && g[y2][x2 + 1]) nb = g[y2][x2 + 1];
      else if (inb(x2 - 1, y2) && g[y2][x2 - 1]) nb = g[y2][x2 - 1];
      else if (inb(x2, y2 + 1) && g[y2 + 1][x2]) nb = g[y2 + 1][x2];
      else if (inb(x2, y2 - 1) && g[y2 - 1][x2]) nb = g[y2 - 1][x2];
      if (nb) add.push([x2, y2]);
    }
    var OUT = darken(C, 78);
    add.forEach(function (p) { g[p[1]][p[0]] = OUT; });

    var rects = '';
    for (var y3 = 0; y3 < Hh; y3++) for (var x3 = 0; x3 < W; x3++) {
      if (g[y3][x3]) rects += '<rect x="' + x3 + '" y="' + y3 + '" width="1" height="1" fill="' + g[y3][x3] + '"/>';
    }
    // 陰影（下部の落ち影）とハイライト（頭の左上）= 半透明オーバーレイで2トーン感を出す
    var shade = '';
    for (var ys = 24; ys < 30; ys++) for (var xs = 0; xs < W; xs++) {
      if (g[ys][xs] && g[ys][xs] !== OUT && xs > 8 && xs < 24) shade += '<rect x="' + xs + '" y="' + ys + '" width="1" height="1" fill="rgba(70,45,20,.10)"/>';
    }
    for (var yh = 5; yh < 9; yh++) for (var xh = 10; xh < 16; xh++) {
      if (g[yh][xh] && g[yh][xh] !== OUT) shade += '<rect x="' + xh + '" y="' + yh + '" width="1" height="1" fill="rgba(255,255,255,.14)"/>';
    }
    var sc = stage === 1 ? 0.62 : stage === 2 ? 0.82 : 1;
    return '<svg viewBox="0 0 ' + W + ' ' + Hh + '" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">' +
      '<g transform="translate(' + (W / 2) + ' ' + Hh + ') scale(' + sc + ') translate(' + (-W / 2) + ' ' + (-Hh) + ')">' + rects + shade + '</g></svg>';
  }

  /** おくるみのドット絵版（32px・本体レンダラと統一） */
  function pixelBundleSVG(breed) {
    var C = breed ? breed.art.color : '#e8d5b0';
    var hint = breed ? breed.art.color2 : '#fff3df';
    var W = 32, Hh = 32;
    var g = [];
    for (var i = 0; i < Hh; i++) g.push(new Array(W).fill(null));
    function inb(x, y) { return x >= 0 && x < W && y >= 0 && y < Hh; }
    function px(x, y, col) { x = Math.round(x); y = Math.round(y); if (inb(x, y)) g[y][x] = col; }
    function ell(cx, cy, rx, ry, col) {
      for (var y = 0; y < Hh; y++) for (var x = 0; x < W; x++) {
        var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) g[y][x] = col;
      }
    }
    // おくるみ本体（しずく型）
    ell(16, 18.5, 8.6, 10.4, C);
    ell(16, 11.5, 6.6, 5.4, C);
    // 毛布の巻きライン
    for (var lx = 9; lx <= 23; lx++) { var off = Math.abs(lx - 16) * 0.18; px(lx, 21.5 - off, darken(C, 28)); px(lx, 25 - off, darken(C, 22)); }
    // 顔まわりの明るいふち
    ell(16, 11, 5.2, 3.9, lumOf(hint) > 150 ? hint : '#f0e6d8');
    // ねんね顔（とじ目・ちいさな口・ほっぺ）
    var ink = '#3a2c1c';
    px(12.5, 10.5, ink); px(13.5, 11, ink); px(14.5, 10.5, ink);
    px(17.5, 10.5, ink); px(18.5, 11, ink); px(19.5, 10.5, ink);
    px(16, 13, ink);
    px(11, 12.4, '#ffb3a0'); px(21, 12.4, '#ffb3a0');
    // 輪郭
    var add = [];
    for (var y2 = 0; y2 < Hh; y2++) for (var x2 = 0; x2 < W; x2++) {
      if (g[y2][x2]) continue;
      if ((inb(x2 + 1, y2) && g[y2][x2 + 1]) || (inb(x2 - 1, y2) && g[y2][x2 - 1]) ||
          (inb(x2, y2 + 1) && g[y2 + 1][x2]) || (inb(x2, y2 - 1) && g[y2 - 1][x2])) add.push([x2, y2]);
    }
    var OUT = darken(C, 78);
    add.forEach(function (p) { g[p[1]][p[0]] = OUT; });
    var rects = '';
    for (var y3 = 0; y3 < Hh; y3++) for (var x3 = 0; x3 < W; x3++) {
      if (g[y3][x3]) rects += '<rect x="' + x3 + '" y="' + y3 + '" width="1" height="1" fill="' + g[y3][x3] + '"/>';
    }
    // zzz（ドット文字）
    var z = '<g fill="rgba(90,70,50,.6)">' +
      '<rect x="24" y="6" width="3" height="1"/><rect x="25" y="7" width="1" height="1"/><rect x="24" y="8" width="3" height="1"/>' +
      '<rect x="28" y="2" width="2" height="1"/><rect x="28" y="3" width="1" height="1"/><rect x="28" y="4" width="2" height="1"/></g>';
    return '<svg viewBox="0 0 ' + W + ' ' + Hh + '" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">' + rects + z + '</svg>';
  }
  function lumOf(hex) {
    var c = hex.replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    return 0.299 * parseInt(c.substr(0, 2), 16) + 0.587 * parseInt(c.substr(2, 2), 16) + 0.114 * parseInt(c.substr(4, 2), 16);
  }


  /** 4足歩行ポーズ（横向き・おさんぽ等「動物としてふるまう場面」用。CHARACTER_DESIGN.md §2.10） */
  function quadSVG(breed, mood, stage) {
    var a = breed.art, C = a.color, C2 = a.color2;
    var dark = isDark(C);
    var MZ = dark || isDark(C2) ? LIGHT_INK : C2;
    var isCat = a.base === 'cat';
    var legNear = (a.pattern === 'tuxedo' || a.pattern === 'point') ? C2 : limbFill(a);
    var legFar = darken(C, 20);
    var s = '';

    function leg(x, y, h, fill) {
      return '<rect x="' + x + '" y="' + y + '" width="13" height="' + h + '" rx="6.5" fill="' + fill + '"' + olAttr() + '/>';
    }

    // しっぽ（後方=左）
    if (a.tail === 'curl') {
      s += '<circle cx="50" cy="98" r="12" fill="' + C + '"' + olAttr() + '/>' +
        '<circle cx="53" cy="95" r="5" fill="' + C2 + '"/>';
    } else if (isCat) {
      s += '<path d="M56 122 Q38 100 48 74 Q56 64 61 72 Q50 90 66 114 Z" fill="' + (a.pattern === 'point' ? C2 : C) + '"' + olAttr() + '/>';
    } else {
      s += '<path d="M56 122 Q36 110 42 90 Q52 98 62 106 Z" fill="' + C + '"' + olAttr() + '/>';
    }
    // 奥側の脚2本（歩行の互い違い）
    s += leg(82, 148, 34, legFar) + leg(132, 144, 34, legFar);
    // 体（横長）
    s += '<ellipse cx="104" cy="128" rx="52" ry="31" fill="' + C + '"' + olAttr() + '/>';
    // 模様（横向き簡略版）
    if (a.pattern === 'solid') s += '<ellipse cx="100" cy="146" rx="30" ry="13" fill="' + C2 + '" opacity=".5"/>';
    if (a.pattern === 'tan') s += '<ellipse cx="128" cy="142" rx="16" ry="11" fill="' + C2 + '"/>';
    if (a.pattern === 'patch') s += '<ellipse cx="92" cy="116" rx="17" ry="13" fill="' + C2 + '"/>';
    if (a.pattern === 'spot') { [[80, 118], [108, 112], [94, 138], [124, 134]].forEach(function (p) { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="7" fill="' + C2 + '"/>'; }); }
    if (a.pattern === 'tabby') s += '<g fill="none" stroke="' + C2 + '" stroke-width="2.2" stroke-linecap="round"><path d="M82 104 L80 122 M100 100 L100 120 M118 102 L120 120"/></g>';
    if (a.pattern === 'calico') s += '<ellipse cx="88" cy="112" rx="15" ry="12" fill="' + C2 + '"/><ellipse cx="118" cy="136" rx="13" ry="11" fill="#3a322c"/>';
    if (a.pattern === 'tuxedo') s += '<ellipse cx="134" cy="142" rx="15" ry="13" fill="' + C2 + '"/>';
    // 手前側の脚2本（前脚は一歩前へ＝歩いている）
    s += leg(60, 152, 32, legNear) + leg(144, 148, 36, legNear);
    // 頭（進行方向=右）
    s += quadEars(a, isCat);
    s += '<circle cx="150" cy="90" r="34" fill="' + C + '"' + olAttr() + '/>';
    // 口元
    s += '<ellipse cx="168" cy="102" rx="13" ry="9.5" fill="' + MZ + '"/>';
    if (a.pattern === 'point') s += '<ellipse cx="168" cy="102" rx="13" ry="9.5" fill="' + C2 + '" opacity=".92"/>';
    if (a.pattern === 'tan') s += '<ellipse cx="142" cy="74" rx="7" ry="5" fill="' + C2 + '"/>';
    if (a.pattern === 'tabby') s += '<g fill="none" stroke="' + C2 + '" stroke-width="2.2" stroke-linecap="round"><path d="M140 60 L146 68 M152 58 L154 67"/></g>';
    // 顔（横向きは目1つ）
    s += eye(152, 88, mood, a.eye, 9.5, dark);
    s += '<ellipse cx="176" cy="98" rx="4" ry="3.2" fill="' + (isCat ? '#ef8da0' : '#241a12') + '"/>';
    s += '<path d="M166 108 q5 4 10 0" fill="none" stroke="' + (dark ? LIGHT_INK : '#2a2018') + '" stroke-width="2.2" stroke-linecap="round"/>';
    if (isCat) s += '<g stroke="' + (dark ? 'rgba(240,230,216,.65)' : 'rgba(90,70,50,.5)') + '" stroke-width="1.4" stroke-linecap="round"><path d="M160 100 L144 96 M160 104 L144 104"/></g>';
    if (mood !== 'sad') s += blush(142, 102, 8, 0.5);

    var sc = stage === 1 ? 0.62 : stage === 2 ? 0.82 : 1;
    return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="104" cy="190" rx="' + (62 * sc) + '" ry="8" fill="rgba(120,90,60,.14)"/>' +
      '<g transform="translate(104 184) scale(' + sc + ') translate(-104 -184)">' + s + '</g></svg>';
  }

  /** 横向きの耳（頭の後ろに先に描く） */
  function quadEars(a, isCat) {
    var c = a.pattern === 'point' ? a.color2 : a.color;
    if (a.ear === 'flop') {
      return '<ellipse cx="132" cy="74" rx="9" ry="17" fill="' + darken(a.color, 30) + '"' + olAttr() + ' transform="rotate(14 132 74)"/>' +
        '<ellipse cx="158" cy="70" rx="9" ry="17" fill="' + darken(a.color, 26) + '"' + olAttr() + ' transform="rotate(22 158 70)"/>';
    }
    if (a.ear === 'round') {
      return '<circle cx="132" cy="62" r="12" fill="' + c + '"' + olAttr() + '/><circle cx="160" cy="58" r="12" fill="' + c + '"' + olAttr() + '/>';
    }
    if (a.ear === 'fold') {
      return '<path d="M126 66 Q120 50 136 52 Q142 60 138 68 Z" fill="' + c + '"' + olAttr() + '/>' +
        '<path d="M154 60 Q150 44 166 48 Q170 56 164 64 Z" fill="' + c + '"' + olAttr() + '/>';
    }
    if (a.ear === 'bigprick') {
      return '<path d="M128 70 L118 28 L148 56 Z" fill="' + c + '"' + olAttr() + '/>' +
        '<path d="M156 64 L158 22 L182 52 Z" fill="' + c + '"' + olAttr() + '/>';
    }
    var ty = isCat ? 34 : 40;
    return '<path d="M130 68 L124 ' + ty + ' L150 58 Z" fill="' + c + '"' + olAttr() + '/>' +
      '<path d="M158 62 L162 ' + (ty - 4) + ' L182 56 Z" fill="' + c + '"' + olAttr() + '/>';
  }

  /** stage: 0=おくるみ(ねんね),1=赤ちゃん,2=子,3=成体 / mood: happy|normal|sad */
  function petSVG(breed, stage, mood, pose) {
    if (stage <= 0) return STYLE.renderer === 'pixel' ? pixelBundleSVG(breed) : bundleSVG(breed);
    // pixelate はベクターの絵をそのまま使う（ドット化は Art.mount のキャンバス側で行う）
    mood = mood || 'normal';
    if (pose === 'quad') return quadSVG(breed, mood, stage);
    if (STYLE.renderer === 'pixel') return pixelSVG(breed, stage, mood);
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

  /**
   * SVG文字列を要素にマウントする。
   * renderer='pixelate' のときはベクター絵を pixelGrid 解像度のキャンバスに描き、
   * image-rendering:pixelated で拡大する＝「ちゃんと描けた絵 × 必要最低限のドット感」。
   */
  function mount(el, svg, grid) {
    if (STYLE.renderer !== 'pixelate' || typeof document === 'undefined') { el.innerHTML = svg; return; }
    var g = grid || STYLE.pixelGrid;
    var cv = document.createElement('canvas');
    cv.width = g; cv.height = g;
    cv.style.cssText = 'width:100%;height:100%;image-rendering:pixelated;display:block;';
    var img = new Image();
    img.onload = function () {
      var ctx = cv.getContext('2d');
      ctx.imageSmoothingEnabled = true; // 縮小はなめらかに＝絵の質を保ったままドット化
      ctx.clearRect(0, 0, g, g);
      ctx.drawImage(img, 0, 0, g, g);
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(svg.replace('<svg ', '<svg width="200" height="200" '));
    el.innerHTML = '';
    el.appendChild(cv);
  }

  /** HTML文字列内の <span class="art-slot" data-pa="breedId"> に図鑑サムネを流し込む */
  function hydrate(root) {
    var slots = root.querySelectorAll('.art-slot');
    Array.prototype.forEach.call(slots, function (el) {
      var b = global.Breeds && Breeds.get(el.getAttribute('data-pa'));
      if (b) mount(el, petSVG(b, 3, 'happy'));
    });
  }
  /** サムネ用プレースホルダ（hydrate で実体化） */
  function slot(breedId) {
    return '<span class="art-slot" data-pa="' + breedId + '" style="display:block;width:100%;height:100%"></span>';
  }

  global.Art = { petSVG: petSVG, bundleSVG: bundleSVG, thumbSVG: thumbSVG, setStyle: setStyle, mount: mount, hydrate: hydrate, slot: slot };
})(typeof window !== 'undefined' ? window : this);
