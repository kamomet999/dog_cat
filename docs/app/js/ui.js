/**
 * UI：描画・イベント・メインループ
 * engine / art / breeds を束ねて画面に出す。Date.now() はこのUI層から注入する。
 */
(function () {
  'use strict';

  var STATS = [
    { key: 'hunger', ico: '🍚', name: 'お腹' },
    { key: 'sanpo',  ico: '🐾', name: '散歩' },
    { key: 'clean',  ico: '🛁', name: 'きれい' }
  ];
  var CARE_BTNS = [
    { action: 'feed',  emo: '🍚', lbl: 'ごはん' },
    { action: 'wash',  emo: '🛁', lbl: 'お掃除' }
  ];
  var STAGE_LABEL = ['おくるみ', '赤ちゃん', '子ども', '成体'];

  var happyUntil = 0;
  var lastArtKey = '';

  function $(id) { return document.getElementById(id); }
  function now() { return Date.now(); }

  function barColor(v) { return v >= 50 ? 'var(--good)' : v >= 25 ? 'var(--warn)' : 'var(--bad)'; }

  function fmtDur(ms) {
    var m = Math.floor(ms / 60000);
    if (m < 1) return 'ほんのちょっと';
    var h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (d > 0) return d + '日' + (h % 24) + '時間';
    if (h > 0) return h + '時間' + (m % 60) + '分';
    return m + '分';
  }

  function petMood() {
    if (now() < happyUntil) return 'happy';
    var st = Engine.getState();
    if (!st || !st.current) return 'normal';
    if (st.current.health != null && st.current.health < 40) return 'sad'; // 衰弱
    var a = Engine.avgStatus(st.current);
    if (a < 32) return 'sad';
    if (a >= 70) return 'happy';
    return 'normal';
  }

  // ---------- 静的スケルトン ----------
  function buildSkeleton() {
    var stats = $('stats');
    stats.innerHTML = STATS.map(function (s) {
      return '<div class="stat-row">' +
        '<div class="stat-ico">' + s.ico + '</div>' +
        '<div class="stat-meta"><div class="name"><span>' + s.name + '</span><span id="val_' + s.key + '"></span></div>' +
        '<div class="bar"><span id="bar_' + s.key + '"></span></div></div></div>';
    }).join('');

    var care = $('care');
    care.style.gridTemplateColumns = 'repeat(' + CARE_BTNS.length + ',1fr)';
    care.innerHTML = CARE_BTNS.map(function (b) {
      return '<button class="care-btn" data-act="' + b.action + '">' +
        '<span class="emo">' + b.emo + '</span><span class="lbl">' + b.lbl + '</span></button>';
    }).join('');
    Array.prototype.forEach.call(care.querySelectorAll('.care-btn'), function (btn) {
      btn.addEventListener('click', function () { onCare(btn.getAttribute('data-act')); });
    });

    $('petArt').addEventListener('click', onPet);
    $('dexBtn').addEventListener('click', openDex);
    $('actBtn').addEventListener('click', onAct);
    $('walkBtn').addEventListener('click', openWalkPicker);
    $('taskBtn').addEventListener('click', openSanpo);
    $('roomBtn').addEventListener('click', openRoomModal);
    $('wearBtn').addEventListener('click', openWardrobe);
    $('settingsBtn').addEventListener('click', openSettings);
  }

  // ---------- 描画 ----------
  function render() {
    var st = Engine.getState();
    if (!st || !st.current) return;
    renderCoin();
    renderStats();
    renderGrow();
    renderFoot();
    renderPetIfChanged();
    renderRoom();
    renderWear();
    renderMark();
  }

  function renderCoin() { $('coin').textContent = Math.floor(Engine.getState().coin); }

  function renderStats() {
    var p = Engine.getState().current;
    STATS.forEach(function (s) {
      var v = Math.round(p[s.key] == null ? 100 : p[s.key]);
      $('val_' + s.key).textContent = v;
      var bar = $('bar_' + s.key);
      bar.style.width = v + '%';
      bar.style.background = barColor(v);
    });
    renderLife(p);
  }

  // いのち（5ハート・health/20）。stage0のおくるみは保護中なので表示しない
  function renderLife(p) {
    var el = $('lifeRow');
    if (!el) return;
    if (Engine.stage() === 0) { el.innerHTML = ''; return; }
    var h = p.health == null ? 100 : p.health;
    var full = Math.max(0, Math.min(5, Math.ceil(h / 20)));
    var hearts = '';
    for (var i = 0; i < 5; i++) hearts += i < full ? '❤️' : '🤍';
    var sp = p.sanpo == null ? 100 : p.sanpo;
    var warn = h < 50 ? '具合が悪そう…' : (sp <= 0 ? '遠くへ行きたそうにしている…' : '');
    el.innerHTML = '<span class="life-label">いのち</span><span>' + hearts + '</span>' +
      (warn ? '<span class="life-warn">' + warn + '</span>' : '');
  }

  function renderGrow() {
    var p = Engine.getState().current;
    var stage = Engine.stageOf(p.xp);
    // stage0（おくるみ）は「めざめまで」と表示して、いつ姿が見えるかの目安にする（ペルソナP1/P3）
    $('growStage').textContent = stage === 0 ? 'めざめまで' : STAGE_LABEL[stage];
    var G = Engine.GROW;
    var pct;
    if (stage >= 3) { pct = 100; $('growPct').textContent = 'MAX'; }
    else {
      var lo = G[stage], hi = G[stage + 1];
      pct = Math.max(0, Math.min(100, (p.xp - lo) / (hi - lo) * 100));
      $('growPct').textContent = stage === 0 ? 'もうすぐ めをさます' : 'つぎまで ' + Math.ceil(hi - p.xp);
    }
    $('growFill').style.width = pct + '%';
  }

  function renderPetIfChanged() {
    var breed = Engine.breed();
    var stage = Engine.stage();
    var mood = petMood();
    var isMix = !!breed.mix;
    var walking = !!Engine.task() && stage >= 1; // さんぽ課題中は四足の歩き姿
    var eyeStyle = Engine.eyeStyleOf();
    // 目なしベース(<id>_noeye)があれば、目スタイルを後乗せ（ホームのみ。図鑑等は従来の目付きスプライト）
    var useNoEye = !walking && !isMix && stage >= 1 && breed.id && Art.hasSprite(breed.id + '_noeye');
    var key = breed.id + '_' + stage + '_' + mood + (isMix ? '_m' : '') + (walking ? '_w' : '') + (useNoEye ? '_e' + eyeStyle : '');
    $('petName').textContent = stage === 0 ? 'ねんねちゅう…' : breed.name;
    var R = Breeds.RARITY[breed.rarity]; // ミックスは undefined
    $('petSub').textContent = stage === 0 ? 'どんな子かは 目が開いてからの お楽しみ' : (breed.species === 'dog' ? 'いぬ' : 'ねこ') + '・' + STAGE_LABEL[stage];
    var rareChip = isMix
      ? '<span class="rarity-chip mix-chip">💞 ミックス</span>'
      : (R ? '<span class="rarity-chip" style="background:' + R.color + '">' + star(R.stars) + ' ' + R.label + '</span>' : '');
    var mk = stage === 0 ? 'none' : ((Engine.getState().current || {}).mark || 'none');
    var markChip = (mk !== 'none' && MARK_SYM[mk]) ? ' <span class="mark-chip">' + MARK_SYM[mk] + ' ' + (Engine.MARK_RARITY[mk] || '') + '</span>' : '';
    $('petRarity').innerHTML = stage === 0 ? '' :
      rareChip + (breed.nature ? ' <span class="nature-chip">' + breed.nature + '</span>' : '') + markChip;
    if (key !== lastArtKey) {
      if (useNoEye) {
        $('petArt').innerHTML = Art.spriteImg(breed.id + '_noeye') + '<div class="pet-eyes">' + Art.eyeLayerSVG(eyeStyle) + '</div>';
      } else {
        Art.mount($('petArt'), Art.petSVG(breed, stage, mood, walking ? 'quad' : null));
      }
      lastArtKey = key;
    }
  }

  function star(n) { return new Array(n + 1).join('★'); }

  function renderFoot() {
    var st = Engine.getState();
    var stage = Engine.stage();
    var act = $('actBtn');
    act.disabled = false;
    if (Engine.canGraduate()) {
      act.className = 'big-btn primary';
      act.innerHTML = '🌱 おとなに なった！';
    } else if (stage === 0) {
      act.className = 'big-btn ghost';
      var afford = st.coin >= Engine.REROLL_COST;
      act.innerHTML = '🧺 べつの子にあう(' + Engine.REROLL_COST + ')';
      act.disabled = !afford;
    } else {
      act.className = 'big-btn ghost';
      act.innerHTML = '🍼 そだてちゅう';
      act.disabled = true;
    }
    var prog = Engine.dexProgress();
    $('dexBtn').innerHTML = '📖 図鑑 ' + prog.found + '/' + prog.total +
      (prog.newCount > 0 ? ' <span class="badge-new">NEW</span>' : '');
  }

  // ---------- 操作 ----------
  function onCare(action) {
    if (action === 'feed') return openFoodModal();
    var r = Engine.care(action, now());
    if (!r) return;
    happyUntil = now() + 1200;
    bump('bounce');
    render();
    if (r.stageAfter > r.stageBefore) celebrateGrowth(r.stageAfter);
  }

  // 新しい子をおむかえするとき、犬か猫を選ぶ（おみあいは親から継ぐので選べない）
  function chooseSpecies(onPick) {
    var html = '<h2>どっちの子を おむかえ？🐾</h2>' +
      '<p class="sub">いぬ か ねこ を えらんでね。<br>（おみあいの子は 親から うけつぎます）</p>' +
      '<div class="care-grid" style="grid-template-columns:1fr 1fr;gap:14px">' +
      '<button class="care-btn" data-sp="dog" style="padding:20px 4px"><span class="emo" style="font-size:34px">🐶</span><span class="lbl">いぬ</span></button>' +
      '<button class="care-btn" data-sp="cat" style="padding:20px 4px"><span class="emo" style="font-size:34px">🐱</span><span class="lbl">ねこ</span></button>' +
      '</div>';
    var m = openModal(html, { closable: false });
    Array.prototype.forEach.call(m.root.querySelectorAll('[data-sp]'), function (btn) {
      btn.addEventListener('click', function () { var sp = btn.getAttribute('data-sp'); m.close(); onPick(sp); });
    });
  }

  // 性格（nature）ごとの タップ反応（しぐさ＋絵文字）。breeds.js の NATURES と対応。
  var NATURE_REACT = {
    'いちず':         { anim: 'bounce', emo: '❤️' },
    'ひとなつっこい': { anim: 'hop',    emo: '🤝' },
    'がんばりや':     { anim: 'shake',  emo: '🔥' },
    'おりこう':       { anim: 'spin',   emo: '✨' },
    'こうきしん':     { anim: 'wiggle', emo: '❓' },
    'げんきいっぱい': { anim: 'hop',    emo: '⚡' },
    'のんびりや':     { anim: 'wiggle', emo: '🍃' },
    'ぼうけんずき':   { anim: 'spin',   emo: '🧭' },
    'クール':         { anim: 'shake',  emo: '😎' },
    'きまぐれ':       { anim: 'pop',    emo: '🎲' },
    'きれいずき':     { anim: 'wiggle', emo: '🌸' },
    'あまえんぼう':   { anim: 'bounce', emo: '🥰' },
    'おしゃべり':     { anim: 'wiggle', emo: '💬' },
    'おっとり':       { anim: 'bounce', emo: '🌼' },
    'やさしい':       { anim: 'bounce', emo: '💗' }
  };

  // タップは成長させず、犬・猫らしいしぐさ＋ほほ笑みの演出だけ（発案者FB）
  var REACT_DOG = [
    { anim: 'hop', emo: '🐾' }, { anim: 'wiggle', emo: '🎵' },
    { anim: 'spin', emo: '❤️' }, { anim: 'bounce', emo: '✨' }, { anim: 'shake', emo: '🐶' }
  ];
  var REACT_CAT = [
    { anim: 'wiggle', emo: '🐾' }, { anim: 'hop', emo: '🎵' },
    { anim: 'pop', emo: '❤️' }, { anim: 'spin', emo: '✨' }, { anim: 'shake', emo: '🐱' }
  ];
  var reactIdx = 0;
  function onPet() {
    var r = Engine.pet();
    if (!r) return;
    if (r.asleep) { happyUntil = now() + 700; bump('wiggle'); floatReact('💤'); render(); return; }
    // 性格でリアクションが変わる。性格が無い/未定義なら従来の犬猫しぐさにフォールバック
    var b = Engine.breed();
    var pick = (b && NATURE_REACT[b.nature]) || (function () { var l = r.species === 'cat' ? REACT_CAT : REACT_DOG; return l[reactIdx++ % l.length]; })();
    happyUntil = now() + 1100; // ほほ笑み（happy顔）
    bump(pick.anim);
    floatReact(pick.emo);
    render();
  }
  // ペットの上に ふわっと出る リアクション絵文字
  function floatReact(emo) {
    var scene = $('scene');
    if (!scene) return;
    var s = document.createElement('span');
    s.className = 'react-pop';
    s.textContent = emo;
    scene.appendChild(s);
    setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 900);
  }

  function onAct() {
    if (Engine.canGraduate()) {
      openGrownChoice(); // おとな → 「子供を産ませる」か「新しい子をもらう」を選ぶ
      return;
    }
    if (Engine.stage() === 0) {
      if ((Engine.getState().coin || 0) < Engine.REROLL_COST) return showToast('コインがたりないよ');
      chooseSpecies(function (sp) {
        var rr = Engine.reroll(now(), Math.random, sp);
        if (!rr || rr.error) return showToast(rr && rr.error === 'no_coin' ? 'コインがたりないよ' : '');
        lastArtKey = '';
        render();
        showToast('🧺 あたらしい子を おむかえ！');
      });
    }
  }

  // おとなになった子: たまごっち風に「産ませる/もらう」を選ぶ
  function openGrownChoice() {
    var b = Engine.breed();
    var html = '<div class="center">' +
      '<div style="font-size:44px">🌱</div>' +
      '<h2>' + b.name + ' は<br>おとなに なった！</h2>' +
      '<p class="sub">どうする？</p>' +
      '<button id="gcMate" class="big-btn primary mt12" style="width:100%">💞 子供を産ませる（おみあい）</button>' +
      '<p class="muted" style="font-size:11px;margin:6px 0 12px">友達とコード交換。色・目・模様・種類を 親から受け継いだ子が生まれる。</p>' +
      '<button id="gcGrad" class="big-btn ghost" style="width:100%">🎓 新しい子をもらう（巣立ち）</button>' +
      '<p class="muted" style="font-size:11px;margin-top:6px">この子は図鑑に登録。あたらしい子を おむかえ。</p>' +
      '</div>';
    var m = openModal(html);
    m.root.querySelector('#gcMate').addEventListener('click', function () { m.close(); openMateMenu(); });
    m.root.querySelector('#gcGrad').addEventListener('click', function () {
      m.close();
      chooseSpecies(function (sp) {
        var res = Engine.graduate(now(), Math.random, sp);
        if (res) showGraduate(res);
      });
    });
  }

  var BUMP_CLASSES = ['bounce', 'wiggle', 'hop', 'spin', 'shake', 'pop'];
  function bump(cls) {
    var a = $('petArt');
    a.classList.remove.apply(a.classList, BUMP_CLASSES);
    void a.offsetWidth; // reflow でアニメ再生
    a.classList.add(cls);
  }

  function celebrateGrowth(stage) {
    lastArtKey = '';
    bump('bounce');
    if (stage === 1) showToast('😊 めがあいた！はじめまして');
    else if (stage === 3) showToast('✨ せいたいに！巣立ちできるよ');
    else showToast('✨ おおきくなった！');
  }

  // ---------- モーダル ----------
  function openModal(html, opts) {
    opts = opts || {};
    var root = $('modalRoot');
    root.innerHTML = '<div class="modal-bg"><div class="modal">' +
      (opts.closable === false ? '' : '<button class="modal-close" aria-label="close">×</button>') +
      html + '</div></div>';
    var bg = root.querySelector('.modal-bg');
    requestAnimationFrame(function () { bg.classList.add('show'); });
    var closeBtn = root.querySelector('.modal-close');
    function close() {
      bg.classList.remove('show');
      setTimeout(function () {
        // すでに次のモーダルが開いていたら消さない（200ms以内の連続オープン対策）
        if (bg.parentNode === root) root.innerHTML = '';
        if (opts.onClose) opts.onClose();
      }, 200);
    }
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (opts.closable !== false) bg.addEventListener('click', function (e) { if (e.target === bg) close(); });
    return { root: root, close: close };
  }

  // 初回の説明（1画面で「なに・どうする・あつめる」が伝わる＝ストア1枚目も兼ねる）
  function openIntro() {
    var html = '<div class="intro">' +
      '<div class="intro-hero"><div id="introPet"></div></div>' +
      '<h2 class="intro-title">スマホを離れるほど、<br>いぬねこが育つ。</h2>' +
      '<p class="intro-lead">スマホを置いた時間が、この子の <b>ごはん</b> になる。</p>' +
      '<div class="intro-steps">' +
      '<div class="intro-step"><span class="ist-ico">🐾</span><span><b>おすわり</b><br>スマホを置くと エサが貯まる</span></div>' +
      '<div class="intro-step"><span class="ist-ico">🐾</span><span><b>お散歩</b><br>読書・英語・運動・ダイエットの間、となりに</span></div>' +
      '<div class="intro-step"><span class="ist-ico">📖</span><span><b>図鑑を集める</b><br>犬・猫それぞれ30種〜（広告ゼロ・登録なし）</span></div>' +
      '</div>' +
      '<button id="introGo" class="big-btn primary" style="width:100%">はじめる</button>' +
      '</div>';
    var m = openModal(html, { closable: false });
    Art.mount(m.root.querySelector('#introPet'), Art.petSVG(Breeds.get('shiba'), 2, 'happy'));
    m.root.querySelector('#introGo').addEventListener('click', function () {
      m.close();
      openSpeciesPicker();
    });
  }

  // 種選択（初回・閉じられない）
  function openSpeciesPicker() {
    var html = '<h2>ようこそ！🐾</h2><p class="sub">ねんね中の赤ちゃんが待ってるよ。<br>どっちの子を迎える？</p>' +
      '<div class="care-grid" style="grid-template-columns:1fr 1fr;gap:14px">' +
      '<button class="care-btn" data-sp="dog" style="padding:14px 4px"><div id="bundleDog" style="width:96px;height:96px;margin:auto"></div><span class="lbl">いぬの赤ちゃん</span></button>' +
      '<button class="care-btn" data-sp="cat" style="padding:14px 4px"><div id="bundleCat" style="width:96px;height:96px;margin:auto"></div><span class="lbl">ねこの赤ちゃん</span></button>' +
      '</div>';
    var m = openModal(html, { closable: false });
    Art.mount(m.root.querySelector('#bundleDog'), Art.bundleSVG({ art: { color: '#e3b76b', color2: '#fff3df' } }));
    Art.mount(m.root.querySelector('#bundleCat'), Art.bundleSVG({ art: { color: '#9a7b4f', color2: '#e9ddc7' } }));
    Array.prototype.forEach.call(m.root.querySelectorAll('[data-sp]'), function (btn) {
      btn.addEventListener('click', function () {
        Engine.newGame(btn.getAttribute('data-sp'), now());
        lastArtKey = '';
        m.close();
        render();
        // 初回はチュートリアルが説明するのでトーストは出さない（吹き出しとの重なり防止）
        if (!tutorialDone()) setTimeout(function () { startTutorial(); }, 450);
        else showToast('🧺 あかちゃんを おむかえした！');
      });
    });
  }

  // ---------- 操作チュートリアル（コーチマーク。初回だけ・スキップ可） ----------
  var TUT_KEY = 'inuneko_tutorial_done_v1';
  function tutorialDone() { try { return localStorage.getItem(TUT_KEY) === '1'; } catch (e) { return false; } }
  function markTutorialDone() { try { localStorage.setItem(TUT_KEY, '1'); } catch (e) {} }

  var TUT_STEPS = [
    { sel: '#petArt', title: 'いまは ねんね中', text: 'タップすると <b>いろんなしぐさ</b> で よろこぶよ（成長はしない）。<br>ごはんや時間で、もうすぐ目を覚ます。', place: 'below' },
    { sel: '#walkBtn', title: '① おすわり＝スマホを置く', text: '“スマホを置く” と この子は おすわりして待つよ。その時間が <b>エサ</b> になる（長いほど たくさん）。これが一番大事！', place: 'above' },
    { sel: '#taskBtn', title: '② お散歩＝勉強・運動の時間', text: '読書・英語・運動・ダイエットの間、となりにいてくれる。<b>取り組むと エサも少しもらえる</b>“いい時間”。', place: 'above' },
    { sel: '#stats', title: 'お腹・機嫌・いのち', text: 'ごはんは ストックから <span class="calm">自動で</span> 食べるよ。毎日ひらかなくても、<span class="calm">忘れても責めないよ</span>。', place: 'below' },
    { sel: '#dexBtn', title: '③ 図鑑を集める', text: '育てた子は ここに登録。犬・猫それぞれ30種〜、友達と「おみあい」もできるよ！', place: 'above' }
  ];

  function startTutorial(force) {
    if (!force && tutorialDone()) return;
    var t = $('toast'); if (t) t.classList.remove('show'); // 吹き出しと重ならないようトーストを消す
    var root = $('modalRoot');
    var i = 0;
    function render1() {
      var step = TUT_STEPS[i];
      var el = $(step.sel.slice(1));
      if (!el) { i++; if (i < TUT_STEPS.length) return render1(); return finish(); }
      var r = el.getBoundingClientRect();
      var pad = 8;
      var hole = { left: r.left - pad, top: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 };
      var vh = window.innerHeight;
      var holeCenter = hole.top + hole.h / 2;
      // 対象が画面の上半分なら吹き出しは下、下半分なら上に置く＝常に画面内＆対象と重ならない。
      // 端に貼り付けると枠外に出てタップできないので、24pxの安全マージンで固定配置する。
      var tipPos = (holeCenter < vh / 2) ? 'bottom:24px;' : 'top:24px;';
      root.innerHTML =
        '<div class="tut-mask">' +
        '<div class="tut-hole" style="left:' + hole.left + 'px;top:' + hole.top + 'px;width:' + hole.w + 'px;height:' + hole.h + 'px"></div>' +
        '<div class="tut-tip" style="' + tipPos + '">' +
        '<div class="tut-title">' + step.title + '</div>' +
        '<p class="tut-text">' + step.text + '</p>' +
        '<div class="tut-foot"><span class="tut-dots">' + dots(i) + '</span>' +
        '<span><button class="tut-skip" id="tutSkip">スキップ</button>' +
        '<button class="tut-next" id="tutNext">' + (i === TUT_STEPS.length - 1 ? 'あそぶ！' : 'つぎへ') + '</button></span></div>' +
        '</div></div>';
      root.querySelector('#tutNext').addEventListener('click', function () { i++; (i < TUT_STEPS.length) ? render1() : finish(); });
      root.querySelector('#tutSkip').addEventListener('click', finish);
    }
    function dots(active) {
      var s = '';
      for (var k = 0; k < TUT_STEPS.length; k++) s += '<i class="tut-dot' + (k === active ? ' on' : '') + '"></i>';
      return s;
    }
    function finish() { markTutorialDone(); root.innerHTML = ''; }
    render1();
  }

  // 巣立ち結果
  function showGraduate(res) {
    var b = res.breed, isMix = !!b.mix, R = Breeds.RARITY[b.rarity];
    var rareChip = isMix ? '<span class="rarity-chip mix-chip">💞 ミックス</span>'
      : (R ? '<span class="rarity-chip" style="background:' + R.color + '">' + star(R.stars) + ' ' + R.label + '</span>' : '');
    var html = '<div class="center pop">' +
      (res.isNew ? '<div class="badge-new" style="display:inline-block;margin-bottom:6px">ずかん NEW!</div>' : '') +
      '<div class="hatch-art">' + (isMix ? '<div id="gradArt" style="width:100%;height:100%"></div>' : Art.slot(b.id)) + '</div>' +
      '<div class="hatch-name">' + b.name + ' が巣立ったよ</div>' +
      '<div class="hatch-rare">' + rareChip + '</div>' +
      '<div class="hatch-desc">' + (b.desc || '') + '</div>' +
      '<div class="mt12" style="font-weight:800;color:var(--coin-text)">＋' + res.reward + ' コイン' + (res.isNew ? '（はつ登録ボーナス込み）' : '') + '</div>' +
      '<button id="nextEgg" class="big-btn primary mt12" style="width:100%">つぎの子をおむかえ →</button>' +
      '</div>';
    var m = openModal(html, {
      onClose: function () { lastArtKey = ''; render(); maybeMilestone(res); }
    });
    if (isMix) Art.mount(m.root.querySelector('#gradArt'), Art.petSVG(b, 3, 'happy'));
    else Art.hydrate(m.root);
    var nb = m.root.querySelector('#nextEgg');
    if (nb) nb.addEventListener('click', m.close);
  }

  // 図鑑の節目（10種・20種・30種）。新登録で到達した瞬間だけ出る（DESIGN.md §10.5）
  function maybeMilestone(res) {
    if (!res || !res.isNew) return;
    var prog = Engine.dexProgress();
    if (prog.found !== 10 && prog.found !== 20 && prog.found !== prog.total) return;
    var comp = prog.found === prog.total;
    var html = '<div class="center pop">' +
      '<div style="font-size:56px;margin:6px">' + (comp ? '👑' : '🎉') + '</div>' +
      '<h2>' + (comp ? '図鑑 コンプリート！' : '図鑑 ' + prog.found + '種類 達成！') + '</h2>' +
      '<p class="sub">' + (comp ?
        prog.total + 'しゅるい ぜんぶの子に あえたよ。<br>ここまで いっしょに すごしてくれて ありがとう。' :
        'いま ' + prog.found + '/' + prog.total + '。このちょうしで ぜんいんに あいにいこう') + '</p>' +
      '<button id="msOk" class="big-btn primary mt12" style="width:100%">やったね！</button>' +
      '<div class="watermark">いぬねこ図鑑 🐾</div></div>';
    var m = openModal(html);
    var ok = m.root.querySelector('#msOk');
    if (ok) ok.addEventListener('click', m.close);
  }

  // 図鑑
  function openDex() {
    var prog = Engine.dexProgress();
    var st = Engine.getState();
    var premium = Engine.isPremium();
    var pct = Math.floor(prog.found / prog.total * 100);
    function cellFound(b, d) {
      var R = Breeds.RARITY[b.rarity];
      return '<button class="dex-cell found" data-dex="' + b.id + '">' +
        (d.unseen ? '<span class="new-dot">NEW</span>' : '') +
        (d.count > 1 ? '<span class="count-dot">×' + d.count + '</span>' : '') +
        '<div class="thumb">' + Art.slot(b.id) + '</div>' +
        '<div class="dn">' + b.name + '</div>' +
        '<div class="stars" style="color:' + R.color + '">' + star(R.stars) + '</div></button>';
    }
    function cellLocked(b, isPrem) {
      // 未発見はシルエットで「いる気配」だけ見せる。未解放プレミアムは鍵つき。
      return '<div class="dex-cell locked' + (isPrem ? ' premium' : '') + '">' +
        (isPrem ? '<span class="prem-lock">🔒</span>' : '') +
        '<div class="thumb silhouette">' + Art.slot(b.id) + '</div>' +
        '<div class="dn">' + (isPrem ? 'プレミアム' : '？？？') + '</div><div class="stars">&nbsp;</div></div>';
    }
    function grid(breeds) {
      return breeds.map(function (b) {
        var d = st.dex[b.id];
        if (d) return cellFound(b, d);
        return cellLocked(b, Breeds.isPremium(b) && !premium);
      }).join('');
    }
    var freeDogs = Breeds.ofSpecies('dog').filter(Breeds.isFree);
    var freeCats = Breeds.ofSpecies('cat').filter(Breeds.isFree);
    var premDogs = Breeds.ofSpecies('dog').filter(Breeds.isPremium);
    var premCats = Breeds.ofSpecies('cat').filter(Breeds.isPremium);

    // プレミアム枠（未解放=CTA／解放後=コレクション）。
    // 初日からの課金圧を避けるため、CTAは3種あつめてから出す（ペルソナP1/P2/P3指摘）。
    var premBlock = '';
    if (premium) {
      premBlock = '<div class="dex-section-title">⭐ プレミアム図鑑（' + prog.premiumFound + '/' + prog.premiumTotal + '）</div>' +
        '<div class="dex-grid">' + grid(premDogs.concat(premCats)) + '</div>';
    } else if (prog.found >= 3) {
      premBlock = '<div class="prem-cta">' +
        '<div class="prem-cta-title">⭐ もっと あつめたい人へ</div>' +
        '<p class="prem-cta-sub"><b>広告ゼロ・買い切り。延命や復活の課金はナシ。</b><br>' +
        Breeds.PREMIUM.price + 'で <b>すべての公式品種</b>（犬・猫を ぞくぞく追加）を解放できるよ。<br>' +
        'メジャーな ' + prog.freeTotal + 'しゅるいは ずっと むりょう。</p>' +
        '<div class="dex-grid prem-peek">' + grid(premDogs.slice(0, 3).concat(premCats.slice(0, 3))) + '</div>' +
        '<button id="premBtn" class="big-btn primary" style="width:100%;margin-top:10px">' + Breeds.PREMIUM.price + 'で すべて解放</button>' +
        '</div>';
    }

    // 💞 アルバム（おみあいで生まれたミックス。30種図鑑とは別・BREEDING_SPEC §4）
    var album = Engine.album();
    var albumBlock = '';
    if (album.length) {
      var cells = album.map(function (e, i) {
        var label = (e.parents ? e.parents[0] + '×' + e.parents[1] : 'ミックス');
        return '<div class="dex-cell found"><div class="thumb" id="al' + i + '"></div>' +
          '<div class="dn" style="font-size:10px">' + label + '</div>' +
          '<div class="stars">' + (e.nature || '') + '</div></div>';
      }).join('');
      albumBlock = '<div class="dex-section-title">💞 おみあいアルバム（' + album.length + '）</div>' +
        '<div class="dex-grid">' + cells + '</div>';
    }

    var html = '<h2>📖 いぬねこ図鑑</h2>' +
      '<div class="dex-stats">' +
      '<span class="dex-pill">達成 ' + pct + '%（' + prog.found + '/' + prog.total + '）</span>' +
      '<span class="dex-pill">🐶 ' + prog.dogFound + '/' + prog.dogTotal + '</span>' +
      '<span class="dex-pill">🐱 ' + prog.catFound + '/' + prog.catTotal + '</span>' +
      (premium ? '<span class="dex-pill" style="background:#fff0d6">⭐ プレミアム</span>' : '') +
      '</div>' +
      '<div class="grow-bar"><div class="grow-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="dex-section-title">🐶 いぬ</div><div class="dex-grid">' + grid(freeDogs) + '</div>' +
      '<div class="dex-section-title">🐱 ねこ</div><div class="dex-grid">' + grid(freeCats) + '</div>' +
      premBlock +
      albumBlock +
      // 差別化の旗（広告ゼロは不変。アプリ内でこの1箇所のみ・DESIGN.md §5）
      '<p class="dex-flag">基本むりょうで あそべる。こうこくも、ないよ</p>';
    var m = openModal(html, {
      onClose: function () {
        // 見たのでNEWを消す
        Object.keys(st.dex).forEach(function (id) { if (st.dex[id].unseen) Engine.markSeen(id); });
        renderFoot();
      }
    });
    Art.hydrate(m.root);
    // アルバムのミックスは合成品種なので直接マウント（slot/hydrateは品種IDのみ対応）
    album.forEach(function (e, i) {
      var el = m.root.querySelector('#al' + i);
      if (el) Art.mount(el, Art.petSVG({ id: 'al' + i, mix: true, species: e.species, name: 'ミックス', rarity: 'mix', nature: e.nature, art: e.art }, 2, 'normal'));
    });
    Array.prototype.forEach.call(m.root.querySelectorAll('[data-dex]'), function (cell) {
      cell.addEventListener('click', function () { openDexDetail(cell.getAttribute('data-dex')); });
    });
    var pb = m.root.querySelector('#premBtn');
    if (pb) pb.addEventListener('click', function () { m.close(); openPremiumModal(); });
  }

  // 課金（プレミアム解放）モーダル。MVP/web では即解放（端末では¥500のストア購入に差し替え）
  function openPremiumModal() {
    var P = Breeds.PREMIUM;
    var html = '<div class="center">' +
      '<div style="font-size:46px">⭐</div>' +
      '<h2>プレミアム図鑑</h2>' +
      '<p class="sub">メジャーな子はそのまま。<br>買い切り1回で <b>2つ</b> 開放されます。</p>' +
      '<ul style="text-align:left;font-size:13px;line-height:1.9;margin:10px 2px">' +
      '<li>🐾 キャラが <b>60種 → 400種</b>（犬200・猫200）</li>' +
      '<li>🛋️ 模様替えが <b>10種 → 50種</b></li>' +
      '<li>買い切り（' + P.price + '）・追加課金なし</li>' +
      '<li>広告ゼロ・延命や復活の課金は なし</li>' +
      '</ul>' +
      '<button id="buyPrem" class="big-btn primary mt12" style="width:100%">' + P.price + 'で 解放する</button>' +
      '<button id="restorePrem" class="big-btn ghost mt12" style="width:100%">購入を ふくげん</button>' +
      '<p class="muted mt12" style="font-size:11px">※このMVPでは すぐ解放されます（実機では ' + P.price + 'のストア購入になります）</p>' +
      '</div>';
    var m = openModal(html);
    function doUnlock(msg) {
      Engine.unlockPremium(now());
      m.close();
      render();
      showToast(msg);
    }
    var bp = m.root.querySelector('#buyPrem');
    if (bp) bp.addEventListener('click', function () { doUnlock('⭐ プレミアム図鑑を 解放した！'); });
    var rp = m.root.querySelector('#restorePrem');
    if (rp) rp.addEventListener('click', function () { doUnlock('購入を ふくげんしました'); });
  }

  // ---------- 部屋の模様替え（はめ込み式。無料10種→¥500で50種） ----------
  var ROOM_BG = {
    cream: 'linear-gradient(160deg,#fdf6ec,#f3e8d6)', sky: 'linear-gradient(160deg,#dcefff,#eaf6ff)',
    pink: 'linear-gradient(160deg,#ffe3ec,#ffeef4)', mint: 'linear-gradient(160deg,#dcf3e8,#eafaf2)',
    night: 'linear-gradient(160deg,#3a4668,#566188)', sunset: 'linear-gradient(160deg,#ffd9a8,#ffc1a8)',
    lavender: 'linear-gradient(160deg,#e6ddf6,#f1ebfa)', forest: 'linear-gradient(160deg,#cfe6c9,#e3f1dd)',
    sakura: 'linear-gradient(160deg,#ffe0e6,#fff0dd)', ocean: 'linear-gradient(160deg,#bfe6e0,#daf2ee)'
  };
  // スロット定義（決まった位置）。bgは背景・他は飾り（null=なし）
  var ROOM_SLOTS = [
    { slot: 'bg', label: '背景' }, { slot: 'wall', label: 'かべ' },
    { slot: 'left', label: 'ひだり' }, { slot: 'right', label: 'みぎ' }, { slot: 'floor', label: 'ゆか' }
  ];
  // カタログ: 各スロット10種（先頭2つが無料、残り8つがプレミアム）＝無料10/全50
  var ROOM_ITEMS = [
    // bg
    { id: 'bg_cream', slot: 'bg', label: 'クリーム' }, { id: 'bg_sky', slot: 'bg', label: 'そら' },
    { id: 'bg_pink', slot: 'bg', label: 'ピンク', p: 1 }, { id: 'bg_mint', slot: 'bg', label: 'ミント', p: 1 },
    { id: 'bg_night', slot: 'bg', label: 'よぞら', p: 1 }, { id: 'bg_sunset', slot: 'bg', label: 'ゆうやけ', p: 1 },
    { id: 'bg_lavender', slot: 'bg', label: 'ラベンダー', p: 1 }, { id: 'bg_forest', slot: 'bg', label: 'もり', p: 1 },
    { id: 'bg_sakura', slot: 'bg', label: 'さくら', p: 1 }, { id: 'bg_ocean', slot: 'bg', label: 'うみ', p: 1 },
    // wall
    { id: 'w_pic', slot: 'wall', label: 'え', e: '🖼️' }, { id: 'w_window', slot: 'wall', label: 'まど', e: '🪟' },
    { id: 'w_clock', slot: 'wall', label: 'とけい', e: '🕰️', p: 1 }, { id: 'w_rainbow', slot: 'wall', label: 'にじ', e: '🌈', p: 1 },
    { id: 'w_koi', slot: 'wall', label: 'こいのぼり', e: '🎏', p: 1 }, { id: 'w_furin', slot: 'wall', label: 'ふうりん', e: '🎐', p: 1 },
    { id: 'w_mirror', slot: 'wall', label: 'かがみ', e: '🪞', p: 1 }, { id: 'w_cal', slot: 'wall', label: 'カレンダー', e: '🗓️', p: 1 },
    { id: 'w_ribbon', slot: 'wall', label: 'リボン', e: '🎀', p: 1 }, { id: 'w_moon', slot: 'wall', label: 'おつきみ', e: '🎑', p: 1 },
    // left
    { id: 'l_plant', slot: 'left', label: 'かんよう', e: '🪴' }, { id: 'l_cactus', slot: 'left', label: 'サボテン', e: '🌵' },
    { id: 'l_sun', slot: 'left', label: 'ひまわり', e: '🌻', p: 1 }, { id: 'l_tulip', slot: 'left', label: 'チューリップ', e: '🌷', p: 1 },
    { id: 'l_bamboo', slot: 'left', label: 'たけ', e: '🎍', p: 1 }, { id: 'l_lotus', slot: 'left', label: 'はす', e: '🪷', p: 1 },
    { id: 'l_maple', slot: 'left', label: 'もみじ', e: '🍁', p: 1 }, { id: 'l_palm', slot: 'left', label: 'やし', e: '🌴', p: 1 },
    { id: 'l_mush', slot: 'left', label: 'きのこ', e: '🍄', p: 1 }, { id: 'l_rose', slot: 'left', label: 'ばら', e: '🌹', p: 1 },
    // right
    { id: 'r_bear', slot: 'right', label: 'くま', e: '🧸' }, { id: 'r_ball', slot: 'right', label: 'ボール', e: '⚽' },
    { id: 'r_chair', slot: 'right', label: 'いす', e: '🪑', p: 1 }, { id: 'r_sofa', slot: 'right', label: 'ソファ', e: '🛋️', p: 1 },
    { id: 'r_guitar', slot: 'right', label: 'ギター', e: '🎸', p: 1 }, { id: 'r_kendama', slot: 'right', label: 'けんだま', e: '🪀', p: 1 },
    { id: 'r_yarn', slot: 'right', label: 'けいと', e: '🧶', p: 1 }, { id: 'r_doll', slot: 'right', label: 'にんぎょう', e: '🪆', p: 1 },
    { id: 'r_game', slot: 'right', label: 'ゲーム', e: '🎮', p: 1 }, { id: 'r_puzzle', slot: 'right', label: 'パズル', e: '🧩', p: 1 },
    // floor
    { id: 'f_bed', slot: 'floor', label: 'ベッド', e: '🛏️' }, { id: 'f_basket', slot: 'floor', label: 'かご', e: '🧺' },
    { id: 'f_rice', slot: 'floor', label: 'ごはん', e: '🍙', p: 1 }, { id: 'f_bone', slot: 'floor', label: 'ほね', e: '🦴', p: 1 },
    { id: 'f_bath', slot: 'floor', label: 'おふろ', e: '🛁', p: 1 }, { id: 'f_rugR', slot: 'floor', label: 'あかいラグ', e: '🟥', p: 1 },
    { id: 'f_rugG', slot: 'floor', label: 'みどりラグ', e: '🟩', p: 1 }, { id: 'f_rugB', slot: 'floor', label: 'あおいラグ', e: '🟦', p: 1 },
    { id: 'f_zabu', slot: 'floor', label: 'ざぶとん', e: '🟫', p: 1 }, { id: 'f_grass', slot: 'floor', label: 'くさ', e: '🌿', p: 1 }
  ];
  var roomById = {};
  ROOM_ITEMS.forEach(function (it) { roomById[it.id] = it; });
  function roomFreeCount() { return ROOM_ITEMS.filter(function (i) { return !i.p; }).length; }

  // 部屋をシーンに反映（home の render から呼ぶ）
  function renderRoom() {
    var room = Engine.getRoom();
    var scene = $('scene');
    if (scene) scene.style.background = ROOM_BG[room.bg] || ROOM_BG.cream;
    ['wall', 'left', 'right', 'floor'].forEach(function (slot) {
      var el = $('rs' + slot.charAt(0).toUpperCase() + slot.slice(1));
      if (!el) return;
      var it = room[slot] && roomById[room[slot]];
      el.textContent = it ? (it.e || '') : '';
    });
  }

  // ===== きせかえ（ペットのアクセサリ。おさんぽ報酬で集める。Engine.WEAR_IDS と対応） =====
  var WEAR = {
    ribbon:  { label: 'リボン',       e: '🎀', pos: 'head' },
    straw:   { label: 'むぎわら',     e: '👒', pos: 'head' },
    cap:     { label: 'キャップ',     e: '🧢', pos: 'head' },
    crown:   { label: 'おうかん',     e: '👑', pos: 'head' },
    flower:  { label: 'おはな',       e: '🌸', pos: 'head' },
    glasses: { label: 'サングラス',   e: '🕶️', pos: 'face' },
    scarf:   { label: 'マフラー',     e: '🧣', pos: 'neck' },
    bowtie:  { label: 'シルクハット', e: '🎩', pos: 'head' },
    tiara:   { label: 'ティアラ',     e: '💎', pos: 'head' },
    star:    { label: 'ほし',         e: '⭐', pos: 'head' },
    bandana: { label: 'すず',         e: '🔔', pos: 'neck' },
    mush:    { label: 'きのこ',       e: '🍄', pos: 'head' }
  };
  // 装備中のアクセサリをペットの上に重ねる（home stage）
  function renderWear() {
    var el = $('petWear'); if (!el) return;
    var eq = Engine.wardrobe().equipped;
    var it = eq && WEAR[eq];
    if (!it || Engine.stage() === 0) { el.style.display = 'none'; el.textContent = ''; return; }
    el.textContent = it.e;
    el.style.top = (it.pos === 'face' ? 32 : it.pos === 'neck' ? 54 : 6) + '%';
    el.style.display = 'block';
  }
  // 体の記号模様（Engine.MARK_IDS と対応）。ホームでペットの体に重ねて表示。
  var MARK_SYM = { circle: '●', triangle: '▲', heart: '♥', star: '★', dbl: '◎', diamond: '◆' };
  function renderMark() {
    var el = $('petMark'); if (!el) return;
    var p = Engine.getState().current;
    var mk = p && p.mark;
    if (!mk || mk === 'none' || Engine.stage() === 0 || !MARK_SYM[mk]) { el.style.display = 'none'; el.textContent = ''; return; }
    el.textContent = MARK_SYM[mk];
    el.style.display = 'block';
  }

  // おさんぽ報酬で着せ替えを入手したときのアナウンス＋「着せる？」確認
  function showWearDrop(id) {
    var it = WEAR[id]; if (!it) return;
    var html = '<div class="center pop">' +
      '<p class="sub" style="margin-bottom:2px">🎁 おさんぽの ごほうび</p>' +
      '<div style="font-size:64px;line-height:1.1;margin:4px">' + it.e + '</div>' +
      '<h2>きせかえ「' + it.label + '」を ひろった！</h2>' +
      '<p class="sub">いま 着せてみる？（あとでも 👕 から着られるよ）</p>' +
      '<button id="wdWear" class="big-btn primary mt12" style="width:100%">👕 着せる</button>' +
      '<button id="wdLater" class="big-btn ghost mt12" style="width:100%">あとで</button>' +
      '<div class="watermark">いぬねこ図鑑 🐾</div></div>';
    var m = openModal(html);
    m.root.querySelector('#wdWear').addEventListener('click', function () {
      Engine.equipWear(id, now());
      lastArtKey = ''; render();
      m.close();
      showToast('かわいい！👕 ' + it.label + 'を 着たよ');
    });
    m.root.querySelector('#wdLater').addEventListener('click', m.close);
  }

  function openWardrobe() {
    var ids = Engine.WEAR_IDS;
    var ward = Engine.wardrobe(), owned = ward.owned || {};
    var have = ids.filter(function (id) { return owned[id]; }).length;
    var cells = ids.map(function (id) {
      var it = WEAR[id], got = !!owned[id], on = ward.equipped === id;
      return '<button class="wear-cell' + (on ? ' on' : '') + (got ? '' : ' locked') + '" data-wear="' + id + '"' + (got ? '' : ' disabled') + '>' +
        '<span class="wear-emo">' + (got ? it.e : '❔') + '</span><span class="wear-lbl">' + (got ? it.label : '？？？') + '</span></button>';
    }).join('');
    var html = '<h2>👕 きせかえ</h2>' +
      '<p class="sub">おさんぽの ごほうびで あつまるよ（<b>' + have + '</b>/' + ids.length + '）。<br>タップで きせかえ・もういちどで ぬぐ。</p>' +
      '<div class="wear-grid">' + cells + '</div>' +
      (ward.equipped ? '<button id="wearOff" class="big-btn ghost mt12" style="width:100%">ぜんぶ ぬぐ</button>' : '');
    var m = openModal(html);
    m.root.querySelectorAll('[data-wear]').forEach(function (b) {
      if (b.disabled) return;
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-wear');
        Engine.equipWear(Engine.wardrobe().equipped === id ? null : id, now());
        lastArtKey = ''; render(); m.close(); openWardrobe();
      });
    });
    var off = m.root.querySelector('#wearOff');
    if (off) off.addEventListener('click', function () { Engine.equipWear(null, now()); lastArtKey = ''; render(); m.close(); openWardrobe(); });
  }

  function openRoomModal() {
    var premium = Engine.isPremium();
    var room = Engine.getRoom();
    function itemCell(it) {
      var locked = it.p && !premium;
      var equipped = room[it.slot] === it.id;
      var inner = it.slot === 'bg'
        ? '<span class="room-swatch" style="background:' + (ROOM_BG[it.id] || '') + '"></span>'
        : '<span class="room-emo">' + (it.e || '') + '</span>';
      return '<button class="room-cell' + (equipped ? ' on' : '') + (locked ? ' locked' : '') + '" ' +
        'data-item="' + it.id + '" data-slot="' + it.slot + '"' + (locked ? ' data-locked="1"' : '') + '>' +
        (locked ? '<span class="room-lock">🔒</span>' : '') + inner +
        '<span class="room-name">' + it.label + '</span></button>';
    }
    var sections = ROOM_SLOTS.map(function (s) {
      var items = ROOM_ITEMS.filter(function (i) { return i.slot === s.slot; });
      var none = s.slot === 'bg' ? '' :
        '<button class="room-cell' + (!room[s.slot] ? ' on' : '') + '" data-item="" data-slot="' + s.slot + '">' +
        '<span class="room-emo">∅</span><span class="room-name">なし</span></button>';
      return '<div class="dex-section-title">' + s.label + '</div>' +
        '<div class="room-grid">' + none + items.map(itemCell).join('') + '</div>';
    }).join('');
    var html = '<h2>🛋️ もようがえ</h2>' +
      '<p class="sub">決まった場所に 飾りを はめ込もう。' + (premium ? '' : '無料は ' + roomFreeCount() + '種、<b>¥500で50種</b>に増えるよ。') + '</p>' +
      sections +
      (premium ? '' : '<button id="roomPrem" class="big-btn primary mt12" style="width:100%">⭐ ¥500で 50種＋全キャラ解放</button>');
    var m = openModal(html);
    Array.prototype.forEach.call(m.root.querySelectorAll('.room-cell'), function (cell) {
      cell.addEventListener('click', function () {
        if (cell.getAttribute('data-locked')) { m.close(); return openPremiumModal(); }
        Engine.equipRoom(cell.getAttribute('data-slot'), cell.getAttribute('data-item') || null, now());
        renderRoom();
        // 選択状態を更新（同スロットのonを付け替え）
        var slot = cell.getAttribute('data-slot');
        Array.prototype.forEach.call(m.root.querySelectorAll('.room-cell[data-slot="' + slot + '"]'), function (c) { c.classList.remove('on'); });
        cell.classList.add('on');
      });
    });
    var rp = m.root.querySelector('#roomPrem');
    if (rp) rp.addEventListener('click', function () { m.close(); openPremiumModal(); });
  }

  // ---------- おみあい（ブリード。コードのコピペで遺伝） ----------
  function openMateMenu() {
    if (!Engine.canMate()) return showToast('成体になってから おみあいできるよ');
    var html = '<div class="center">' +
      '<div style="font-size:44px">💞</div>' +
      '<h2>おみあい</h2>' +
      '<p class="sub">友達の子と「おみあい」すると、<br>二人の特徴を継いだ ミックスの子が やってくるよ。<br><b>🐶いぬ×いぬ・🐱ねこ×ねこ だけ</b>（いぬ×ねこは できません）。<br>コードを交換するだけ・通信なし。</p>' +
      '<button id="mateShow" class="big-btn primary mt12" style="width:100%">📤 自分のコードを見せる</button>' +
      '<button id="mateInput" class="big-btn ghost mt12" style="width:100%">📥 相手のコードを入れる</button>' +
      '<p class="muted mt12" style="font-size:11px">おみあいすると、今の子は巣立って図鑑に残ります。</p>' +
      '</div>';
    var m = openModal(html);
    m.root.querySelector('#mateShow').addEventListener('click', function () { m.close(); openMateShare(); });
    m.root.querySelector('#mateInput').addEventListener('click', function () { m.close(); openMateInput(); });
  }

  var PUBLIC_URL = 'https://kamomet999.github.io/dog_cat/app/';
  function appUrl() {
    return (location.protocol === 'http:' || location.protocol === 'https:')
      ? (location.origin + location.pathname).replace(/index\.html$/, '')
      : PUBLIC_URL;
  }
  function inviteText(code, b) {
    return 'うちの「' + b.name + '」と おみあいしない？🐾\n' +
      'リンクから あそべるよ → ' + appUrl() + '?mate=' + code + '\n' +
      '（アプリに直接いれるとき: ' + code + '）\n#いぬねこ図鑑';
  }
  // 画像（ペット）＋文字＋リンクで共有。対応端末は画像付き、無理ならテキスト、最後はコピー。
  function shareInvite(code, b) {
    var text = inviteText(code, b);
    function fallback() { copyText(text, function (ok) { showToast(ok ? '📋 さそい文（リンク付き）を コピーした！' : 'コピーできなかった…'); }); }
    (async function () {
      try {
        if (navigator.canShare && b.id && Art.hasSprite && Art.hasSprite(b.id)) {
          var resp = await fetch('assets/sprites/' + b.id + '.png');
          if (resp.ok) {
            var file = new File([await resp.blob()], b.id + '.png', { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: text }); return; }
          }
        }
        if (navigator.share) { await navigator.share({ text: text }); return; }
        fallback();
      } catch (e) { if (!(e && e.name === 'AbortError')) fallback(); }
    })();
  }

  function openMateShare() {
    var code = Engine.mateCode();
    if (!code) return showToast('成体になってから おみあいできるよ');
    var b = Engine.breed();
    var html = '<div class="center">' +
      '<h2>📤 おみあいに さそう</h2>' +
      '<p class="sub">この <b>' + b.name + '</b> の おさそいを 友達に送ろう。<br><b>画像＋リンク</b>で送れて、相手は <b>リンクを開くだけ</b>。</p>' +
      '<div class="mate-code" id="mateCode">' + code + '</div>' +
      '<button id="shareCode" class="big-btn primary mt12" style="width:100%">📨 画像＋リンクで 送る</button>' +
      '<button id="copyCode" class="big-btn ghost mt12" style="width:100%">📋 さそい文を コピー</button>' +
      '</div>';
    var m = openModal(html, { onClose: openMateMenu });
    m.root.querySelector('#shareCode').addEventListener('click', function () { shareInvite(code, b); });
    m.root.querySelector('#copyCode').addEventListener('click', function () {
      copyText(inviteText(code, b), function (ok) { showToast(ok ? '📋 さそい文（リンク付き）を コピー！' : 'コピーできなかった…手で えらんでね'); });
    });
  }

  function openMateInput(prefill) {
    var html = '<div class="center">' +
      '<h2>📥 相手のコード</h2>' +
      '<p class="sub">もらった メッセージを <b>そのまま貼り付け</b>てOK。<br>コードだけ 自動で よみとるよ。</p>' +
      '<p class="muted" style="font-size:11px;margin:-4px 0 8px">※ <b>🐶いぬ×いぬ・🐱ねこ×ねこ だけ</b>。いぬ×ねこは おみあいできません。</p>' +
      '<button id="codePaste" class="big-btn primary" style="width:100%">📋 貼り付ける</button>' +
      '<input id="codeIn" class="mate-input" placeholder="ここに貼り付け（INU- / NEK- …）" autocomplete="off" autocapitalize="characters" />' +
      '<div id="codePrev" class="mate-prev"></div>' +
      '<button id="doMate" class="big-btn primary mt12" style="width:100%" disabled>おみあいする</button>' +
      '</div>';
    var m = openModal(html, { onClose: openMateMenu });
    var input = m.root.querySelector('#codeIn');
    var prev = m.root.querySelector('#codePrev');
    var btn = m.root.querySelector('#doMate');
    var parsed = null;
    function readClip(manual) {
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(function (t) {
          if (t && (manual || (/(INU|NEK)-/i.test(t) && !input.value))) { input.value = t.trim(); check(); }
          if (manual && !t) showToast('クリップボードが からっぽみたい');
        }).catch(function () { if (manual) { input.focus(); showToast('入力欄を 長押しして 貼り付けてね'); } });
      } else if (manual) { input.focus(); showToast('入力欄を 長押しして 貼り付けてね'); }
    }
    m.root.querySelector('#codePaste').addEventListener('click', function () { readClip(true); });
    function check() {
      var g = Engine.decodeMate(input.value);
      var mine = Engine.breed();
      if (g.error) {
        parsed = null; btn.disabled = true;
        prev.innerHTML = input.value.length > 3 ? '<span class="mate-bad">コードが ただしくないみたい…</span>' : '';
        return;
      }
      if (mine && g.species !== mine.species) {
        parsed = null; btn.disabled = true;
        prev.innerHTML = '<span class="mate-bad">いぬ と ねこ は おみあいできません。<br>同じ動物どうし（いぬ×いぬ・ねこ×ねこ）で おみあいしてね。</span>';
        return;
      }
      parsed = g; btn.disabled = false;
      prev.innerHTML = '<span class="mate-ok">✓ ' + g.name + '（' + (g.species === 'dog' ? 'いぬ' : 'ねこ') + '）と おみあいできるよ</span>';
    }
    input.addEventListener('input', check);
    if (prefill) { input.value = prefill; check(); } // リンク経由（?mate=）は自動で取り込み
    else readClip(false);                            // 開いた瞬間にコピー済みなら自動取り込み
    btn.addEventListener('click', function () {
      if (!parsed) return;
      var r = Engine.breedWith(parsed, now(), Math.random);
      if (r.error) return showToast(r.error === 'species' ? 'いぬ と ねこ は おみあいできません' : 'おみあいできなかった…');
      m.close();
      lastArtKey = '';
      render();
      showMateResult(r);
    });
  }

  function showMateResult(r) {
    happyUntil = now() + 2000;
    var b = Engine.breed(); // 生まれたおくるみ
    var title = r.isMix ? 'ミックスの子が やってきた！' : (b.name + 'の あかちゃん！');
    var html = '<div class="center pop">' +
      '<div id="mrArt" class="hatch-art"></div>' +
      '<h2>' + title + '</h2>' +
      '<p class="sub">' + r.parents[0] + ' と ' + r.parents[1] + ' の子。<br>' +
      (r.isMix ? '色・目・模様を 親から 受け継いだ、せかいに ひとつだけの ミックス。'
               : '<b>' + r.inheritedBreed + '</b> の種類を 受け継いだよ！') +
      (r.mutated ? '<br>✨ めずらしい とくちょうが あらわれた！' : '') + '</p>' +
      (r.reward > 0 ? '<div style="font-weight:800;color:var(--coin-text)">巣立ちボーナス ＋' + r.reward + ' コイン' + (r.isNew ? '（図鑑はつ登録）' : '') + '</div>' : '') +
      '<button id="mrOk" class="big-btn primary mt12" style="width:100%">おむかえする →</button>' +
      '<div class="watermark">いぬねこ図鑑 🐾</div></div>';
    var m = openModal(html, { onClose: function () { lastArtKey = ''; render(); } });
    Art.mount(m.root.querySelector('#mrArt'), Art.petSVG(b, 0, 'happy')); // おくるみ姿
    m.root.querySelector('#mrOk').addEventListener('click', m.close);
  }

  function copyText(text, cb) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { cb(true); }, function () { cb(false); });
    } else { cb(false); }
  }

  // 図鑑の詳細ページ（閉じると図鑑にもどる）
  function openDexDetail(breedId) {
    var b = Breeds.get(breedId);
    var st = Engine.getState();
    var d = st.dex[breedId];
    if (!b || !d) return;
    var R = Breeds.RARITY[b.rarity];
    var first = new Date(d.firstAt);
    var firstStr = first.getFullYear() + '/' + (first.getMonth() + 1) + '/' + first.getDate();
    var html = '<div class="center">' +
      '<div class="hatch-art">' + Art.slot(b.id) + '</div>' +
      '<div class="hatch-name">' + b.name + '</div>' +
      '<div class="hatch-rare"><span class="rarity-chip" style="background:' + R.color + '">' + star(R.stars) + ' ' + R.label + '</span>' +
      ' <span class="dex-pill">' + (b.species === 'dog' ? '🐶 いぬ' : '🐱 ねこ') + '</span></div>' +
      '<div class="hatch-desc mt12">' + b.desc + '</div>' +
      (b.nature ? '<div class="mt12"><span class="nature-chip">せいかく：' + b.nature + '</span>' +
        '<div class="hatch-desc" style="margin-top:6px">「' + (Breeds.NATURES[b.nature] || '') + '」</div></div>' : '') +
      '<hr class="soft">' +
      '<p class="muted">そだてた数：<b>' + d.count + '</b>ひき' + (d.count >= 3 ? ' 🏆' : '') +
      '<br>はじめて出会った日：<b>' + firstStr + '</b></p>' +
      '</div>';
    Engine.markSeen(breedId);
    var dm = openModal(html, { onClose: openDex });
    Art.hydrate(dm.root);
  }

  // 設定
  function openSettings() {
    var st = Engine.getState();
    var ws = st.walkStats || { success: 0, fail: 0, streak: 0, best: 0, totalMin: 0 };
    var ts = st.taskStats || { success: 0, days: 0, bestDays: 0, totalMin: 0, byKind: {} };
    var byKind = ts.byKind || {};
    var byKindStr = Object.keys(byKind).length
      ? '<br><span style="font-size:11px">' + Object.keys(byKind).map(function (k) { return (TASK_EMO[k] || '🐾') + k + ' ' + Math.floor(byKind[k] / 60) + 'h' + (byKind[k] % 60) + 'm'; }).join('　') + '</span>'
      : '';
    var html = '<h2>⚙ せってい</h2>' +
      '<p class="sub">「いぬねこ図鑑」 β10（2026-06-13）— スマホを離れて、育てる いぬねこ</p>' +
      '<p class="muted">アプリを閉じているあいだも時間がすすみ、少しずつ成長します（最大24時間ぶんまで）。「おすわり」で計画的にスマホから離れると、もっと早く育って ごほうびがもらえます。</p>' +
      '<hr class="soft">' +
      '<div class="dex-section-title">🐾 おすわり</div>' +
      '<p class="muted">成功：<b>' + ws.success + '</b> 回（れんぞく最高 <b>' + ws.best + '</b>）／ ロック合計：<b>' + Math.floor(ws.totalMin / 60) + '</b> 時間 ' + (ws.totalMin % 60) + ' 分</p>' +
      '<div class="dex-section-title">🐾 おさんぽ ダッシュボード</div>' +
      '<p class="muted">継続 <b>' + ts.days + '</b> 日（最高 <b>' + ts.bestDays + '</b>）／ 合計 <b>' + Math.floor(ts.totalMin / 60) + '</b> 時間 ' + (ts.totalMin % 60) + ' 分 ／ スコア <b>' + Engine.taskScore() + '</b>' + byKindStr + '</p>' +
      '<button id="allowSet" class="big-btn ghost mt12" style="width:100%">📱 おすわり中に使ってOKなアプリ</button>' +
      '<button id="remindSet" class="big-btn ghost mt12" style="width:100%">⏰ さんぽリマインド時刻</button>' +
      '<p class="muted">これまで巣立たせた数：<b>' + st.graduates + '</b> ／ 図鑑：<b>' + Engine.dexProgress().found + '</b> 種' +
      ((st.deaths || 0) > 0 ? ' ／ おほしさまになった子：<b>' + st.deaths + '</b>' : '') +
      ((st.runaways || 0) > 0 ? ' ／ たびに でた子：<b>' + st.runaways + '</b>' : '') + '</p>' +
      '<hr class="soft">' +
      (Engine.isPremium()
        ? '<p class="muted">⭐ プレミアム図鑑：<b>解放ずみ</b>（ぜんぶの公式品種が あつまります）</p>'
        : '<button id="premSet" class="big-btn primary" style="width:100%">⭐ プレミアム図鑑を 解放（' + Breeds.PREMIUM.price + '）</button>') +
      '<button id="tutAgain" class="big-btn ghost mt12" style="width:100%">📖 あそびかたを もういちど みる</button>' +
      '<button id="resetBtn" class="big-btn ghost mt12" style="width:100%;color:var(--badge-new)">🗑 データをリセット</button>';
    var m = openModal(html);
    var as = m.root.querySelector('#allowSet');
    if (as) as.addEventListener('click', function () { m.close(); openAllowApps(); });
    var rs2 = m.root.querySelector('#remindSet');
    if (rs2) rs2.addEventListener('click', function () { m.close(); openReminders(); });
    var ta = m.root.querySelector('#tutAgain');
    if (ta) ta.addEventListener('click', function () { m.close(); setTimeout(function () { startTutorial(true); }, 250); });
    var ps = m.root.querySelector('#premSet');
    if (ps) ps.addEventListener('click', function () { m.close(); openPremiumModal(); });
    var rb = m.root.querySelector('#resetBtn');
    if (rb) rb.addEventListener('click', function () {
      rb.textContent = 'ほんとうに消す？（もう一度タップ）';
      rb.onclick = function () {
        Engine.reset(now());
        m.close();
        lastArtKey = '';
        openSpeciesPicker();
        showToast('データをリセットしました');
      };
    });
  }

  // ロック中に使ってOKなアプリの編集（v1=目安リスト・ロック画面に表示）
  var ALLOW_SUGGEST = ['Kindle', '読書', 'Duolingo', 'えいご', 'うんどう', 'でんわ', 'メモ', 'おんがく'];
  function openAllowApps() {
    var cur = Engine.allowApps().map(function (a) { return a.name; });
    function chipRow() {
      var chosen = cur.length
        ? cur.map(function (n) { return '<button class="allow-chip on" data-rm="' + escapeHtml(n) + '">' + escapeHtml(n) + ' ✕</button>'; }).join('')
        : '<span class="muted">まだ ありません</span>';
      var sugg = ALLOW_SUGGEST.filter(function (n) { return cur.indexOf(n) < 0; })
        .map(function (n) { return '<button class="allow-chip" data-add="' + escapeHtml(n) + '">＋' + escapeHtml(n) + '</button>'; }).join('');
      return '<div class="allow-row">' + chosen + '</div>' +
        '<div class="dex-section-title">候補から追加</div><div class="allow-row">' + sugg + '</div>';
    }
    var html = '<h2>📱 使ってOKなアプリ</h2>' +
      '<p class="sub">おすわり中に 使ってもいいアプリ。<br>おすわり画面に表示されます（読書・勉強など）。</p>' +
      '<div id="allowBox">' + chipRow() + '</div>' +
      '<input id="allowInput" class="task-custom" maxlength="24" placeholder="じぶんで追加（例：図書館アプリ）">' +
      '<button id="allowAddBtn" class="big-btn ghost mt12" style="width:100%">＋ 追加</button>' +
      '<p class="muted mt12" style="font-size:11px">v1は「目安リスト」。アプリの自動ブロックは今後（OS制約）。</p>';
    var m = openModal(html);
    function save() { Engine.setAllowApps(cur, now()); }
    function bind() {
      m.root.querySelectorAll('[data-add]').forEach(function (b) { b.onclick = function () { cur.push(b.getAttribute('data-add')); rerender(); }; });
      m.root.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () { var n = b.getAttribute('data-rm'); cur = cur.filter(function (x) { return x !== n; }); rerender(); }; });
    }
    function rerender() { m.root.querySelector('#allowBox').innerHTML = chipRow(); bind(); save(); }
    bind();
    m.root.querySelector('#allowAddBtn').addEventListener('click', function () {
      var inp = m.root.querySelector('#allowInput');
      var v = inp.value.trim();
      if (v && cur.indexOf(v) < 0) { cur.push(v); inp.value = ''; rerender(); }
    });
  }

  // 時間指定リマインド（毎日「さんぽしないの？」）の編集
  function openReminders() {
    var rem = Engine.reminders();
    var times = rem.times.slice();
    function timesRow() {
      return times.length
        ? times.map(function (t) { return '<button class="allow-chip on" data-rmt="' + t + '">' + t + ' ✕</button>'; }).join('')
        : '<span class="muted">時刻 未設定</span>';
    }
    var html = '<h2>⏰ さんぽリマインド</h2>' +
      '<p class="sub">毎日その時刻に「さんぽしないの？🐾」とお知らせします。</p>' +
      '<label class="rem-toggle"><input type="checkbox" id="remOn"' + (rem.enabled ? ' checked' : '') + '> オンにする</label>' +
      '<div class="dex-section-title">時刻</div>' +
      '<div id="remTimes" class="allow-row">' + timesRow() + '</div>' +
      '<input id="remTime" class="task-custom" type="time" value="21:00">' +
      '<button id="remAdd" class="big-btn ghost mt12" style="width:100%">＋ 時刻を追加</button>' +
      '<button id="remSave" class="big-btn primary mt12" style="width:100%">保存</button>';
    var m = openModal(html);
    function bind() {
      m.root.querySelectorAll('[data-rmt]').forEach(function (b) { b.onclick = function () { var t = b.getAttribute('data-rmt'); times = times.filter(function (x) { return x !== t; }); rerender(); }; });
    }
    function rerender() { m.root.querySelector('#remTimes').innerHTML = timesRow(); bind(); }
    bind();
    m.root.querySelector('#remAdd').addEventListener('click', function () {
      var v = m.root.querySelector('#remTime').value;
      if (/^\d{1,2}:\d{2}$/.test(v) && times.indexOf(v) < 0) { times.push(v); times.sort(); rerender(); }
    });
    m.root.querySelector('#remSave').addEventListener('click', function () {
      var saved = Engine.setReminders({ enabled: m.root.querySelector('#remOn').checked, times: times }, now());
      if (window.Native) Native.scheduleReminders(saved);
      m.close();
      showToast('⏰ リマインドを 保存したよ');
    });
  }

  // 復帰レポート
  function showReturn(rep) {
    if (!rep || rep.elapsedMs < 60000) return;
    var p = Engine.getState().current;
    var msgs = [];
    if (p.hunger < 25) msgs.push('お腹ぺこぺこ…🍚');
    if (p.clean < 25) msgs.push('お風呂に入れてあげて🛁');
    if (p.sanpo != null && p.sanpo < 25) msgs.push('そろそろ いっしょに「いい時間」を過ごしたいな🐾');
    if (p.health != null && p.health < 50) msgs.push('なんだか具合が悪そう…💧');
    if (rep.autoFed > 0) msgs.push('留守の間に ごはんを ' + rep.autoFed + '回 食べたよ🍚');
    if (rep.afterStage > rep.beforeStage) msgs.push('その間に大きくなったよ！✨');
    var grewNote = rep.elapsedMs > rep.cappedMs ?
      '<p class="muted">※ 放置は24時間分まで反映されます。</p>' : '';
    var html = '<div class="center"><h2>おかえりなさい！🐾</h2>' +
      '<p class="sub">' + fmtDur(rep.elapsedMs) + 'ぶり</p>' +
      '<div style="font-size:60px;margin:6px">' + (Engine.stage() === 0 ? '💤' : '🐾') + '</div>' +
      '<div style="font-weight:800;color:var(--coin-text);font-size:18px">＋' + rep.coinGain + ' コイン</div>' +
      (msgs.length ? '<p class="mt12">' + msgs.join('<br>') + '</p>' : '<p class="mt12 muted">みんな元気にまってたよ</p>') +
      grewNote +
      '<button id="okBtn" class="big-btn primary mt12" style="width:100%">ただいま！</button></div>';
    var m = openModal(html);
    var ok = m.root.querySelector('#okBtn');
    if (ok) ok.addEventListener('click', m.close);
  }

  // ---------- おさんぽ（Forest型セッション） ----------
  function fmtMMSS(ms) {
    var t = Math.max(0, Math.ceil(ms / 1000));
    var m = Math.floor(t / 60), s = t % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function fmtMin(min) { return min >= 60 ? (min / 60) + 'じかん' : min + 'ぷん'; }

  var FOOD_BY_MIN = { 30: 2, 60: 4, 120: 8, 180: 12 };
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // 集中ロック中に表示する「使ってOKなアプリ」チップ（URLがあればタップで起動）
  function allowChipsHtml() {
    var apps = Engine.allowApps();
    if (!apps.length) return '';
    var chips = apps.map(function (a) {
      var tag = a.url ? 'button' : 'span';
      return '<' + tag + ' class="allow-chip"' + (a.url ? ' data-url="' + escapeHtml(a.url) + '"' : '') + '>' + escapeHtml(a.name) + '</' + tag + '>';
    }).join('');
    return '<div class="allow-row" style="margin-top:10px">つかってOK：' + chips + '</div>';
  }
  function openWalkPicker() {
    if (Engine.walk()) return;
    var btns = Engine.WALK_OPTIONS.map(function (min) {
      return '<button class="care-btn" data-min="' + min + '" style="padding:14px 4px">' +
        '<span class="emo">' + (min <= 30 ? '🐾' : min <= 60 ? '🌳' : min <= 120 ? '⛰' : '🌙') + '</span>' +
        '<span class="lbl">' + fmtMin(min) + '</span>' +
        '<span class="cost" style="color:var(--accent-d)">🍖 ×' + (FOOD_BY_MIN[min] || 2) + '</span></button>';
    }).join('');
    var html = '<h2>🐾 おすわり</h2>' +
      '<p class="sub">スマホを置いて、この子に おすわりして待っててもらおう。<br>その時間が、まるごと <b>エサ</b> に変わるよ（長いほど たくさん）。</p>' +
      '<div class="care-grid" style="grid-template-columns:repeat(2,1fr);gap:12px">' + btns + '</div>' +
      '<p class="muted mt12" style="font-size:11px">満了前にアプリへ戻ると中断（最初の60秒はセーフ）。連続成功でご褒美アップ。</p>';
    var m = openModal(html);
    Array.prototype.forEach.call(m.root.querySelectorAll('[data-min]'), function (btn) {
      btn.addEventListener('click', function () {
        var min = parseInt(btn.getAttribute('data-min'), 10);
        var w = Engine.startWalk(min, now());
        if (w && window.Native) Native.walkStarted(w);
        m.close();
        syncWalk();
      });
    });
  }

  function renderWalkOverlay(r) {
    var ov = $('walkOverlay');
    if (!ov.firstChild) {
      var foods = FOOD_BY_MIN[r.minutes] || 2;
      ov.innerHTML = '<div class="walk-screen">' +
        '<div id="walkPet" class="walk-pet"></div>' +
        '<div class="walk-title">おすわりちゅう…</div>' +
        '<div id="walkTimer" class="walk-timer"></div>' +
        '<p class="walk-msg" style="margin:2px 0">成功で 🍖 ×' + foods + '</p>' +
        '<p id="walkMsg" class="walk-msg"></p>' +
        allowChipsHtml() +
        '<button id="walkCancel" class="big-btn ghost" style="margin-top:18px">あきらめる</button>' +
        '</div>';
      // おすわり中は専用の座りポーズ（_sit があれば、無ければ正面スプライト）
      Art.mount(ov.querySelector('#walkPet'), Art.petSVG(Engine.breed(), Engine.stage(), 'happy', 'sit'));
      Array.prototype.forEach.call(ov.querySelectorAll('.allow-chip[data-url]'), function (c) {
        c.addEventListener('click', function () { if (window.Native) Native.openApp(c.getAttribute('data-url')); });
      });
      ov.querySelector('#walkCancel').addEventListener('click', function () {
        var res = Engine.cancelWalk(now());
        if (window.Native) Native.walkEnded();
        hideWalkOverlay();
        lastArtKey = '';
        render();
        if (res) showWalkFail(res);
      });
    }
    ov.querySelector('#walkTimer').textContent = fmtMMSS(r.remainMs);
    ov.querySelector('#walkMsg').innerHTML = r.inGrace ?
      'いまのうちにスマホを置いてね（あと' + Math.ceil(r.graceRemainMs / 1000) + '秒はセーフ）' :
      'スマホを置いて、まっててね';
    ov.style.display = 'block';
  }

  function hideWalkOverlay() {
    var ov = $('walkOverlay');
    ov.innerHTML = '';
    ov.style.display = 'none';
  }

  /** おさんぽ状態を判定して画面に反映。起動時・復帰時・毎秒ループから呼ぶ */
  function syncWalk() {
    if (!Engine.walk()) { hideWalkOverlay(); return null; }
    var visible = document.visibilityState !== 'hidden';
    var r = Engine.checkWalk(now(), visible);
    if (!r) { hideWalkOverlay(); return null; }
    if (r.result === 'ongoing') { renderWalkOverlay(r); return r; }
    if (window.Native) Native.walkEnded(); // 失敗時の予約通知を破棄（成功後のcancelは無害）
    hideWalkOverlay();
    lastArtKey = '';
    render();
    if (r.result === 'success') { if (window.Native) Native.buzz(); showWalkSuccess(r); }
    else showWalkFail(r);
    return r;
  }

  // 「自慢の1枚」フォーマット（DESIGN.md §10.5）: ①ペット絵（大）②品種名 ③◯時間はなれた ④れんぞく ⑤ウォーターマーク
  function showWalkSuccess(r) {
    happyUntil = now() + 2000;
    var b = Engine.breed();
    var html = '<div class="center pop">' +
      '<div id="wsArt" class="hatch-art"></div>' +
      '<div class="hatch-name">' + b.name + '</div>' +
      '<h2 style="margin-top:6px">' + fmtMin(r.minutes) + ' スマホを置けた</h2>' +
      '<p class="sub" style="margin-bottom:8px">連続成功 <b>' + r.streak + '</b> 回め' + (r.isBest && r.streak > 1 ? '（自己新記録！）' : '') + '</p>' +
      '<div style="font-weight:800;color:var(--coin-text)">🍖 エサ ×' + r.foods + '　🪙 ＋' + r.coinGain + '　なかよし ＋' + r.xpGain + '</div>' +
      (r.stageAfter > r.stageBefore ? '<p style="font-weight:800;margin:8px 0 0">✨ おすわりの間に大きくなった！</p>' : '') +
      '<button id="walkOk" class="big-btn primary mt12" style="width:100%">ただいま！</button>' +
      '<div class="watermark">いぬねこ図鑑 🐾</div></div>';
    var m = openModal(html, { onClose: function () { lastArtKey = ''; render(); } });
    Art.mount(m.root.querySelector('#wsArt'), Art.petSVG(b, Engine.stage(), 'happy'));
    var ok = m.root.querySelector('#walkOk');
    if (ok) ok.addEventListener('click', m.close);
  }

  function showWalkFail(r) {
    var gentle = r.reason === 'cancel';
    var html = '<div class="center">' +
      '<h2>' + (gentle ? 'おすわりを やめたよ' : 'あっ…！') + '</h2>' +
      '<p class="sub">' + (gentle ?
        'また今度、いっしょに がんばろうね。' :
        '途中でスマホを開いちゃった…。<br>エサは持ち帰れなかった。ちょっとしょんぼりしてる…') + '</p>' +
      '<div style="font-size:56px;margin:4px">' + (gentle ? '🐾' : '💧') + '</div>' +
      '<p class="muted">連続成功はリセット。次はきっと大丈夫！</p>' +
      '<button id="walkNg" class="big-btn primary mt12" style="width:100%">うん…</button></div>';
    var m = openModal(html, { onClose: function () { lastArtKey = ''; render(); } });
    var ng = m.root.querySelector('#walkNg');
    if (ng) ng.addEventListener('click', m.close);
  }

  // ---------- お散歩（いい時間。失敗なし。内容・時間はカスタム可） ----------
  // かわいい言い換え（自己鍛錬っぽさを消す）＋「じぶんで」自由入力
  var TASK_PRESETS = [
    { kind: 'ほんよみ', emo: '📖' },
    { kind: 'えいご',   emo: '🔤' },
    { kind: 'うんどう', emo: '🏃' },
    { kind: 'ダイエット', emo: '🥗' }
  ];
  var TASK_EMO = { 'ほんよみ': '📖', 'えいご': '🔤', 'うんどう': '🏃', 'ダイエット': '🥗', 'じぶんで': '✏️' };

  // おさんぽの「場所」（景色）。背景はCSSグラデ＋絵文字（あとで本格背景画像に差し替え可）。
  var PLACES = [
    { id: 'park',     name: 'こうえん', emo: '🌳', grad: 'linear-gradient(170deg,#9ad98f,#5ba86a 72%)', bg: 'assets/places/park.jpg' },
    { id: 'river',    name: 'かわ',     emo: '🏞️', grad: 'linear-gradient(170deg,#9bd9ec,#5aa9c9 72%)', bg: 'assets/places/river.jpg' },
    { id: 'town',     name: 'まち',     emo: '🏙️', grad: 'linear-gradient(170deg,#ffdca8,#f0a96b 72%)', bg: 'assets/places/town.jpg' },
    { id: 'mountain', name: 'やま',     emo: '⛰️', grad: 'linear-gradient(170deg,#bcdfa6,#6f9e6a 72%)', bg: 'assets/places/mountain.jpg' },
    { id: 'beach',    name: 'うみ',     emo: '🏖️', grad: 'linear-gradient(170deg,#c2f1ed,#5fc4c0 72%)', bg: 'assets/places/beach.jpg' },
    { id: 'night',    name: 'よみち',   emo: '🌙', grad: 'linear-gradient(170deg,#515d88,#2b3350 72%)', bg: 'assets/places/night.jpg' }
  ];
  function placeBgCss(p) { return "url('" + p.bg + "') center/cover no-repeat, " + p.grad; }
  function placeOf(id) { for (var i = 0; i < PLACES.length; i++) if (PLACES[i].id === id) return PLACES[i]; return PLACES[0]; }

  // 🐾 おさんぽ：全画面。散歩中なら景色画面、未開始なら設定（場所→なにする→どのくらい）。
  function openSanpo() {
    if (Engine.walk()) return showToast('いまは おすわり中だよ');
    if (Engine.task()) { renderSanpoScene(); return; }
    renderSanpoSetup();
  }
  function hideSanpoOverlay() { var ov = $('sanpoOverlay'); ov.innerHTML = ''; ov.style.display = 'none'; }

  function renderSanpoSetup() {
    var ov = $('sanpoOverlay');
    var places = PLACES.map(function (p) {
      return '<button class="place-cell" data-place="' + p.id + '" style="background:' + placeBgCss(p) + '">' +
        '<span class="place-name">' + p.emo + ' ' + p.name + '</span></button>';
    }).join('');
    var kinds = TASK_PRESETS.map(function (k) {
      return '<button class="care-btn task-kind" data-kind="' + k.kind + '" style="padding:10px 2px">' +
        '<span class="emo">' + k.emo + '</span><span class="lbl">' + k.kind + '</span></button>';
    }).join('') +
      '<button class="care-btn task-kind" data-kind="__custom" style="padding:10px 2px"><span class="emo">✏️</span><span class="lbl">じぶんで</span></button>';
    var mins = Engine.TASK_OPTIONS.map(function (m2) {
      return '<button class="care-btn task-min" data-min="' + m2 + '" style="padding:10px 2px"><span class="lbl">' + m2 + '分</span></button>';
    }).join('') +
      '<button class="care-btn task-min" data-min="__custom" style="padding:10px 2px"><span class="emo">✏️</span><span class="lbl">じぶんで</span></button>';
    ov.innerHTML = '<div class="sanpo-setup">' +
      '<button id="sanpoClose" class="sheet-x" aria-label="とじる">✕</button>' +
      '<h2 style="margin:2px 0">🐾 おさんぽ</h2>' +
      '<p class="muted" style="font-size:12px;margin:0 0 8px">スマホを置いて、すきな いいことを。<br>Kindleや勉強・運動の間、この子と さんぽ気分。<b>失敗はないよ</b>。</p>' +
      '<div class="dex-section-title">どこへ いく？</div>' +
      '<div class="place-grid">' + places + '</div>' +
      '<div class="dex-section-title">なにする？</div>' +
      '<div class="care-grid" style="grid-template-columns:repeat(4,1fr);gap:8px">' + kinds + '</div>' +
      '<input id="customKind" class="task-custom" maxlength="12" placeholder="じぶんの「いい時間」（例：ピアノ）" style="display:none">' +
      '<div class="dex-section-title">どのくらい？</div>' +
      '<div class="care-grid" style="grid-template-columns:repeat(4,1fr);gap:8px">' + mins + '</div>' +
      '<input id="customMin" class="task-custom" type="number" min="' + Engine.TASK_MIN + '" max="' + Engine.TASK_MAX + '" placeholder="分（' + Engine.TASK_MIN + '〜' + Engine.TASK_MAX + '）" style="display:none">' +
      '<button id="sanpoStart" class="big-btn primary mt12" style="width:100%" disabled>はじめる</button>' +
      '</div>';
    ov.style.display = 'block';

    var placeSel = null, kindSel = null, minSel = null;
    var ckInput = ov.querySelector('#customKind');
    var cmInput = ov.querySelector('#customMin');
    function effKind() { return kindSel === '__custom' ? (ckInput.value.trim() || 'じぶんで') : kindSel; }
    function effMin() {
      if (minSel === '__custom') { var v = parseInt(cmInput.value, 10); return (v >= Engine.TASK_MIN && v <= Engine.TASK_MAX) ? v : null; }
      return minSel;
    }
    function refresh() {
      ov.querySelectorAll('.place-cell').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-place') === placeSel); });
      ov.querySelectorAll('.task-kind').forEach(function (b) { b.style.outline = b.getAttribute('data-kind') === kindSel ? '3px solid var(--accent-d)' : 'none'; });
      ov.querySelectorAll('.task-min').forEach(function (b) { b.style.outline = b.getAttribute('data-min') === String(minSel) ? '3px solid var(--accent-d)' : 'none'; });
      ckInput.style.display = kindSel === '__custom' ? 'block' : 'none';
      cmInput.style.display = minSel === '__custom' ? 'block' : 'none';
      ov.querySelector('#sanpoStart').disabled = !(placeSel && kindSel && effMin());
    }
    ov.querySelectorAll('.place-cell').forEach(function (b) { b.addEventListener('click', function () { placeSel = b.getAttribute('data-place'); refresh(); }); });
    ov.querySelectorAll('.task-kind').forEach(function (b) { b.addEventListener('click', function () { kindSel = b.getAttribute('data-kind'); refresh(); if (kindSel === '__custom') ckInput.focus(); }); });
    ov.querySelectorAll('.task-min').forEach(function (b) { b.addEventListener('click', function () { var d = b.getAttribute('data-min'); minSel = d === '__custom' ? '__custom' : parseInt(d, 10); refresh(); if (minSel === '__custom') cmInput.focus(); }); });
    ckInput.addEventListener('input', refresh);
    cmInput.addEventListener('input', refresh);
    ov.querySelector('#sanpoClose').addEventListener('click', hideSanpoOverlay);
    ov.querySelector('#sanpoStart').addEventListener('click', function () {
      var t = Engine.startTask(effKind(), effMin(), now(), placeSel);
      if (!t) return showToast('時間は ' + Engine.TASK_MIN + '〜' + Engine.TASK_MAX + '分で えらんでね');
      if (window.Native) Native.taskStarted(t);
      renderSanpoScene();
      renderTaskRow();
      lastArtKey = ''; render();
    });
  }

  function renderSanpoScene() {
    var ov = $('sanpoOverlay');
    var t = Engine.task();
    if (!t) { hideSanpoOverlay(); return; }
    var p = placeOf(t.place);
    var remain = Math.max(0, t.endsAt - now());
    ov.innerHTML = '<div class="sanpo-screen" style="background:' + placeBgCss(p) + '">' +
      '<button id="sanpoBack" class="sheet-x" aria-label="ホームへ">✕</button>' +
      '<div class="sanpo-top"><span class="place-pill">' + p.emo + ' ' + p.name + '</span>' +
      '<span class="place-pill">' + (TASK_EMO[t.kind] || '🐾') + ' ' + t.kind + '</span></div>' +
      '<div id="sanpoPet" class="sanpo-scene-pet"></div>' +
      '<div class="sanpo-card">' +
      '<div id="sanpoTimer" class="walk-timer" style="color:var(--ink)">' + fmtMMSS(remain) + '</div>' +
      '<p class="muted" style="margin:0 0 12px">スマホを置いて、すきな いいことを。<br>もどってきたら ごほうび（さんぽ＋エサ）。</p>' +
      '<button id="sanpoCancel" class="big-btn ghost" style="width:100%">やめる</button>' +
      '</div></div>';
    ov.style.display = 'block';
    Art.mount(ov.querySelector('#sanpoPet'), Art.petSVG(Engine.breed(), Engine.stage(), 'happy', 'quad'));
    ov.querySelector('#sanpoBack').addEventListener('click', hideSanpoOverlay); // タスクは継続（ホームへ戻るだけ）
    ov.querySelector('#sanpoCancel').addEventListener('click', function () {
      Engine.cancelTask(now());
      if (window.Native) Native.taskEnded();
      hideSanpoOverlay();
      renderTaskRow();
      lastArtKey = ''; render();
      showToast('また こんど いこうね');
    });
  }

  function renderTaskRow() {
    var el = $('taskRow');
    if (!el) return;
    var t = Engine.task();
    if (!t) { el.innerHTML = ''; el.style.display = 'none'; return; }
    var remain = Math.max(0, t.endsAt - now());
    el.style.display = 'flex';
    var pl = placeOf(t.place);
    el.innerHTML = '<span id="taskOpen">' + pl.emo + ' ' + (TASK_EMO[t.kind] || '🐾') + ' ' + t.kind + 'で おさんぽ中… 残り ' + fmtMMSS(remain) + '</span>' +
      '<button id="taskCancel">やめる</button>';
    var op = el.querySelector('#taskOpen');
    if (op) op.addEventListener('click', renderSanpoScene);
    var c = el.querySelector('#taskCancel');
    if (c) c.addEventListener('click', function () {
      Engine.cancelTask(now());
      if (window.Native) Native.taskEnded();
      renderTaskRow();
      showToast('また こんど いこうね');
    });
  }

  function syncTask() {
    var t = Engine.task();
    var ov = $('sanpoOverlay');
    var sceneOpen = ov.style.display === 'block' && !!ov.querySelector('#sanpoTimer');
    if (!t) { if (sceneOpen) hideSanpoOverlay(); renderTaskRow(); return; }
    var r = Engine.checkTask(now());
    if (r && r.result === 'done') {
      if (window.Native) Native.taskEnded();
      if (sceneOpen) hideSanpoOverlay();
      renderTaskRow();
      happyUntil = now() + 1500;
      lastArtKey = '';
      render();
      showToast('🐾 おさんぽ おわり！えらい！（さんぽ +' + r.gain + ' / 🍖 +' + r.foods + '）');
      if (r.wear && WEAR[r.wear]) setTimeout(function () { showWearDrop(r.wear); }, 700); // 入手アナウンス＋着せる確認
    } else {
      if (sceneOpen) { var tm = ov.querySelector('#sanpoTimer'); if (tm) tm.textContent = fmtMMSS(Math.max(0, t.endsAt - now())); }
      renderTaskRow();
    }
  }

  // ---------- えさ（ごはん） ----------
  function openFoodModal() {
    var info = Engine.foodInfo();
    var st = Engine.getState();
    var days = info.days >= 1 ? ('あと約' + Math.floor(info.days) + '日分') : 'もうすぐ なくなりそう…';
    var html = '<h2>🍚 ごはん</h2>' +
      '<p class="sub">エサは <b>スマホを離れた時間</b> で貯まるよ。<br>ストックがある間は 自動で食べてくれる。</p>' +
      '<div class="center" style="font-size:34px;margin:4px">🍖 ×' + info.stock + '</div>' +
      '<p class="center muted">' + (info.stock > 0 ? days : 'エサがないよ。おすわりさせよう') + '</p>' +
      '<button id="handFeed" class="big-btn primary mt12" style="width:100%"' + (info.stock < 1 ? ' disabled' : '') + '>🤲 手であげる（なかよしアップ）</button>' +
      '<button id="buyFood" class="big-btn ghost mt12" style="width:100%"' + (st.coin < Engine.FOOD_COST ? ' disabled' : '') + '>🪙 エサを買う（' + Engine.FOOD_COST + 'コイン）</button>' +
      '<p class="muted mt12">たくさん欲しいときは「🐾 おすわり」（スマホを置く）が一番。</p>';
    var m = openModal(html);
    var hf = m.root.querySelector('#handFeed');
    if (hf) hf.addEventListener('click', function () {
      var r = Engine.feed(now());
      if (!r || r.error) return showToast('えさが ないよ…');
      m.close();
      happyUntil = now() + 1200;
      bump('bounce');
      render();
      showToast('🍚 もぐもぐ…おいしいね');
      if (r.stageAfter > r.stageBefore) celebrateGrowth(r.stageAfter);
    });
    var bf = m.root.querySelector('#buyFood');
    if (bf) bf.addEventListener('click', function () {
      var r = Engine.buyFood(now());
      if (!r || r.error) return showToast('コインが たりないよ');
      m.close();
      render();
      showToast('🍖 えさを かった！');
    });
  }

  // ---------- おわかれ ----------
  var farewellOpen = false;
  function showFarewell() {
    if (farewellOpen) return;
    farewellOpen = true;
    hideWalkOverlay();
    renderTaskRow();
    var b = Engine.breed();
    var away = Engine.isAway();
    var html = away
      ? '<div class="center">' +
        '<h2>' + b.name + 'は<br>旅に出ました</h2>' +
        '<p class="sub">いっしょの「いい時間」が足りなくて、<br>新しい家族を探しに行ったみたい。<br>どこかで元気にしているよ。</p>' +
        '<div style="font-size:56px;margin:10px">🎒</div>' +
        '<button id="fwBtn" class="big-btn primary mt12" style="width:100%">新しい子を迎える</button>' +
        '</div>'
      : '<div class="center">' +
        '<h2>' + b.name + 'は<br>おほしさまに なりました</h2>' +
        '<p class="sub">ごはんが足りなかったみたい。<br>いっしょに過ごした時間は消えないよ。</p>' +
        '<div style="font-size:56px;margin:10px">🌟</div>' +
        '<button id="fwBtn" class="big-btn primary mt12" style="width:100%">新しい子を迎える</button>' +
        '</div>';
    var m = openModal(html, { closable: false });
    m.root.querySelector('#fwBtn').addEventListener('click', function () {
      m.close();
      chooseSpecies(function (sp) {
        Engine.farewell(now(), Math.random, sp);
        farewellOpen = false;
        lastArtKey = '';
        render();
        showToast('🧺 ねんね中の赤ちゃんが やってきた');
      });
    });
  }

  // ---------- トースト ----------
  var toastTimer = null;
  function showToast(msg, ms) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms || 1800);
  }

  // ---------- メインループ ----------
  function loop() {
    var st = Engine.getState();
    if (!st || !st.current) return;
    var pre = Engine.stage();
    Engine.tick(now());
    var post = Engine.stage();
    if (Engine.isGone()) { render(); showFarewell(); return; }
    syncWalk();
    syncTask();
    render();
    if (post > pre) celebrateGrowth(post);
  }

  // ---------- 起動 ----------
  function start() {
    buildSkeleton();
    var s = Engine.init();
    if (!s || !s.current) {
      openIntro();
    } else {
      var rep = Engine.applyOffline(now());
      render();
      if ((rep && (rep.died || rep.ranAway)) || Engine.isGone()) {
        showFarewell();
      } else {
        syncTask();
        // おさんぽの結果（成功/失敗/継続）があればそちらを優先表示
        var wr = syncWalk();
        if (!wr) showReturn(rep);
      }
    }
    // 招待リンク（?mate=CODE）で開かれたら、貼り付け不要で おみあい入力を自動で開く
    try {
      var mateLink = new URLSearchParams(location.search).get('mate');
      if (mateLink) {
        if (history.replaceState) history.replaceState(null, '', location.pathname); // 再読込での再オープン防止
        var st0 = Engine.getState();
        if (st0 && st0.current) setTimeout(function () {
          if (Engine.canMate()) openMateInput(mateLink);
          else showToast('おさそいを受け取ったよ！自分の子が 成体になったら おみあいできるよ');
        }, 500);
      }
    } catch (e) { /* URL解析失敗は無視 */ }
    function onResume() {
      var rep = Engine.applyOffline(now());
      if ((rep && (rep.died || rep.ranAway)) || Engine.isGone()) { render(); showFarewell(); return; }
      syncWalk();
      syncTask();
      render();
    }
    // バックグラウンドへ行く瞬間に「危険の予告」をローカル通知でスケジュール（GAME_DESIGN.md §4）
    function onPause() {
      if (!window.Native) return;
      var MSG = {
        hunger: { id: 2001, title: 'えさが なくなりそう…🍚', body: 'スマホを おいて おすわりさせよう' },
        sanpo:  { id: 2002, title: 'いっしょの じかんが ほしいな🐾', body: 'どくしょや うんどうの あいだ、となりに いさせて。とおくへ いっちゃう まえに' },
        health: { id: 2003, title: 'ぐあいが わるいみたい…💧', body: 'えさを わすれないで。おねがい' }
      };
      var plan = Engine.dangerForecast(now()).map(function (e) {
        var m = MSG[e.type];
        return { id: m.id, title: m.title, body: m.body, at: e.at };
      });
      Native.schedulePlan(plan);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') onResume();
      else onPause();
    });
    if (window.Native) Native.init(onResume, onPause); // ネイティブアプリの復帰/退避検知
    if (window.Native) Native.scheduleReminders(Engine.reminders()); // 起動時に時間指定リマインドを張り直す
    setInterval(loop, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
