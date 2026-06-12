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
    $('taskBtn').addEventListener('click', openTaskPicker);
    $('mateBtn').addEventListener('click', openMateMenu);
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
    var key = breed.id + '_' + stage + '_' + mood + (isMix ? '_m' : '');
    $('petName').textContent = stage === 0 ? 'ねんねちゅう…' : breed.name;
    var R = Breeds.RARITY[breed.rarity]; // ミックスは undefined
    $('petSub').textContent = stage === 0 ? 'どんな子かは 目が開いてからの お楽しみ' : (breed.species === 'dog' ? 'いぬ' : 'ねこ') + '・' + STAGE_LABEL[stage];
    var rareChip = isMix
      ? '<span class="rarity-chip mix-chip">💞 ミックス</span>'
      : (R ? '<span class="rarity-chip" style="background:' + R.color + '">' + star(R.stars) + ' ' + R.label + '</span>' : '');
    $('petRarity').innerHTML = stage === 0 ? '' :
      rareChip + (breed.nature ? ' <span class="nature-chip">' + breed.nature + '</span>' : '');
    if (key !== lastArtKey) {
      Art.mount($('petArt'), Art.petSVG(breed, stage, mood));
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
      act.innerHTML = '🎓 巣立ち';
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
    // 成体は「おみあい」できる（ともだちの子と特徴を継いだミックスを迎える）
    $('mateBtn').style.display = (stage >= 3) ? 'flex' : 'none';
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

  function onPet() {
    var r = Engine.pet(now());
    if (!r) return;
    happyUntil = now() + 1000;
    bump('wiggle');
    render();
    if (r.stageAfter > r.stageBefore) celebrateGrowth(r.stageAfter);
  }

  function onAct() {
    if (Engine.canGraduate()) {
      var res = Engine.graduate(now());
      if (res) showGraduate(res);
      return;
    }
    if (Engine.stage() === 0) {
      var rr = Engine.reroll(now());
      if (!rr) return;
      if (rr.error === 'no_coin') return showToast('コインがたりないよ');
      if (rr.error) return;
      lastArtKey = '';
      render();
      showToast('🧺 あたらしい子を おむかえ！');
    }
  }

  function bump(cls) {
    var a = $('petArt');
    a.classList.remove('bounce', 'wiggle');
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
      '<div class="intro-step"><span class="ist-ico">🍖</span><span><b>ごはん探し</b><br>スマホを伏せると エサが貯まる</span></div>' +
      '<div class="intro-step"><span class="ist-ico">🐾</span><span><b>お散歩</b><br>読書・英語・運動の間、となりに</span></div>' +
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
    { sel: '#petArt', title: 'いまは ねんね中', text: '撫でたり ごはんをあげると、<b>もうすぐ目を覚まして</b> どんな子か分かるよ。タップで撫でてみて。', place: 'below' },
    { sel: '#walkBtn', title: '① ごはん探し＝スマホを伏せる', text: '“スマホを伏せる” と、その時間が この子の <b>エサ</b> になるよ。これが一番大事！', place: 'above' },
    { sel: '#taskBtn', title: '② お散歩＝勉強・運動の時間', text: '読書・英語・運動の間、となりにいてくれる。ごはん探しとは別の “いい時間”。', place: 'above' },
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
      '<p class="sub">メジャーな子はそのまま。<br><b>すべての公式品種</b>を あつめられるようになります。</p>' +
      '<ul style="text-align:left;font-size:13px;line-height:1.9;margin:10px 2px">' +
      '<li>犬・猫の 公式品種を ぞくぞく追加</li>' +
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

  // ---------- おみあい（ブリード。コードのコピペで遺伝） ----------
  function openMateMenu() {
    if (!Engine.canMate()) return showToast('成体になってから おみあいできるよ');
    var html = '<div class="center">' +
      '<div style="font-size:44px">💞</div>' +
      '<h2>おみあい</h2>' +
      '<p class="sub">友達の子と「おみあい」すると、<br>二人の特徴を継いだ ミックスの子が やってくるよ。<br>（同じ動物どうし／コードを交換するだけ・通信なし）</p>' +
      '<button id="mateShow" class="big-btn primary mt12" style="width:100%">📤 自分のコードを見せる</button>' +
      '<button id="mateInput" class="big-btn ghost mt12" style="width:100%">📥 相手のコードを入れる</button>' +
      '<p class="muted mt12" style="font-size:11px">おみあいすると、今の子は巣立って図鑑に残ります。</p>' +
      '</div>';
    var m = openModal(html);
    m.root.querySelector('#mateShow').addEventListener('click', function () { m.close(); openMateShare(); });
    m.root.querySelector('#mateInput').addEventListener('click', function () { m.close(); openMateInput(); });
  }

  function openMateShare() {
    var code = Engine.mateCode();
    if (!code) return showToast('成体になってから おみあいできるよ');
    var b = Engine.breed();
    var html = '<div class="center">' +
      '<h2>📤 おみあいコード</h2>' +
      '<p class="sub">この <b>' + b.name + '</b> のコードを友達に送ってね。<br>相手が入れると ミックスの子が生まれるよ。</p>' +
      '<div class="mate-code" id="mateCode">' + code + '</div>' +
      '<button id="copyCode" class="big-btn primary mt12" style="width:100%">📋 コピーする</button>' +
      '<button id="shareCode" class="big-btn ghost mt12" style="width:100%">📨 送る（シェア）</button>' +
      '</div>';
    var m = openModal(html, { onClose: openMateMenu });
    m.root.querySelector('#copyCode').addEventListener('click', function () {
      copyText(code, function (ok) { showToast(ok ? '📋 コピーした！' : 'コピーできなかった…手で えらんでね'); });
    });
    m.root.querySelector('#shareCode').addEventListener('click', function () {
      var msg = 'うちの「' + b.name + '」と おみあいしない？🐾\nおみあいコード: ' + code + '\n#いぬねこ図鑑';
      if (navigator.share) navigator.share({ text: msg }).catch(function () {});
      else copyText(msg, function (ok) { showToast(ok ? '📋 さそい文を コピーした！' : 'コピーできなかった…'); });
    });
  }

  function openMateInput() {
    var html = '<div class="center">' +
      '<h2>📥 相手のコード</h2>' +
      '<p class="sub">友達から もらった おみあいコードを貼り付けてね。</p>' +
      '<input id="codeIn" class="mate-input" placeholder="INU-XXXX-XXXX-..." autocomplete="off" autocapitalize="characters" />' +
      '<div id="codePrev" class="mate-prev"></div>' +
      '<button id="doMate" class="big-btn primary mt12" style="width:100%" disabled>おみあいする</button>' +
      '</div>';
    var m = openModal(html, { onClose: openMateMenu });
    var input = m.root.querySelector('#codeIn');
    var prev = m.root.querySelector('#codePrev');
    var btn = m.root.querySelector('#doMate');
    var parsed = null;
    // クリップボードから自動読み取り（同意的に・失敗は無視）
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(function (t) {
        if (t && /^(INU|NEK)-/.test(t.trim()) && !input.value) { input.value = t.trim(); check(); }
      }).catch(function () {});
    }
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
        prev.innerHTML = '<span class="mate-bad">' + (g.species === 'dog' ? 'いぬ' : 'ねこ') + 'の子だね。同じ動物どうしだけ おみあいできるよ。</span>';
        return;
      }
      parsed = g; btn.disabled = false;
      prev.innerHTML = '<span class="mate-ok">✓ ' + g.name + '（' + (g.species === 'dog' ? 'いぬ' : 'ねこ') + '）と おみあいできるよ</span>';
    }
    input.addEventListener('input', check);
    btn.addEventListener('click', function () {
      if (!parsed) return;
      var r = Engine.breedWith(parsed, now(), Math.random);
      if (r.error) return showToast(r.error === 'species' ? '同じ動物どうしだけだよ' : 'おみあいできなかった…');
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
      (r.isMix ? 'せかいに ひとつだけの ミックス。' : 'おなじ品種どうしなので 純血の子だよ。') +
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
    var html = '<h2>⚙ せってい</h2>' +
      '<p class="sub">「いぬねこ図鑑」 β8（2026-06-12）— スマホを離れて、育てる いぬねこ</p>' +
      '<p class="muted">アプリを閉じているあいだも時間がすすみ、少しずつ成長します（最大24時間ぶんまで）。「おさんぽ」で計画的にスマホからはなれると、もっと早く育って ごほうびがもらえます。</p>' +
      '<hr class="soft">' +
      '<p class="muted">おさんぽ成功：<b>' + ws.success + '</b> 回（れんぞく最高 <b>' + ws.best + '</b>）／ デトックス合計：<b>' + Math.floor(ws.totalMin / 60) + '</b> 時間 ' + (ws.totalMin % 60) + ' 分</p>' +
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

  var FOOD_BY_MIN = { 30: 2, 60: 4, 120: 8 };
  function openWalkPicker() {
    if (Engine.walk()) return;
    var btns = Engine.WALK_OPTIONS.map(function (min) {
      return '<button class="care-btn" data-min="' + min + '" style="padding:14px 4px">' +
        '<span class="emo">' + (min <= 30 ? '🐾' : min <= 60 ? '🌳' : '⛰') + '</span>' +
        '<span class="lbl">' + fmtMin(min) + '</span>' +
        '<span class="cost" style="color:var(--accent-d)">🍖 ×' + (FOOD_BY_MIN[min] || 2) + '</span></button>';
    }).join('');
    var html = '<h2>🍖 ごはん探し</h2>' +
      '<p class="sub">スマホを伏せて お留守番。<br>その時間が、この子の <b>エサ</b> に変わるよ。</p>' +
      '<div class="care-grid" style="grid-template-columns:repeat(3,1fr);gap:12px">' + btns + '</div>' +
      '<p class="muted mt12" style="font-size:11px">途中でアプリを開くと失敗（最初の60秒はセーフ）。連続成功でご褒美アップ。</p>';
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
      ov.innerHTML = '<div class="walk-screen">' +
        '<div id="walkPet" class="walk-pet"></div>' +
        '<div class="walk-title">ごはんさがしちゅう…</div>' +
        '<div id="walkTimer" class="walk-timer"></div>' +
        '<p id="walkMsg" class="walk-msg"></p>' +
        '<button id="walkCancel" class="big-btn ghost" style="margin-top:18px">あきらめる</button>' +
        '</div>';
      // おさんぽ中は「動物としてふるまう場面」＝4足歩行ポーズで歩く
      Art.mount(ov.querySelector('#walkPet'), Art.petSVG(Engine.breed(), Engine.stage(), 'happy', 'quad'));
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
      'いまのうちにスマホをとじてね（あと' + Math.ceil(r.graceRemainMs / 1000) + '秒はセーフ）' :
      'スマホをふせて、まっててね';
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
      '<h2 style="margin-top:6px">' + fmtMin(r.minutes) + ' スマホを離れた</h2>' +
      '<p class="sub" style="margin-bottom:8px">連続成功 <b>' + r.streak + '</b> 回め' + (r.isBest && r.streak > 1 ? '（自己新記録！）' : '') + '</p>' +
      '<div style="font-weight:800;color:var(--coin-text)">🍖 エサ ×' + r.foods + '　🪙 ＋' + r.coinGain + '　なかよし ＋' + r.xpGain + '</div>' +
      (r.stageAfter > r.stageBefore ? '<p style="font-weight:800;margin:8px 0 0">✨ お散歩の間に大きくなった！</p>' : '') +
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
      '<h2>' + (gentle ? 'ごはん探しを やめたよ' : 'あっ…！') + '</h2>' +
      '<p class="sub">' + (gentle ?
        'また今度、いっしょに出かけようね。' :
        '途中でスマホを開いちゃった…。<br>ごはんは見つからなかった。ちょっとしょんぼりしてる…') + '</p>' +
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
    { kind: 'うんどう', emo: '🏃' }
  ];
  var TASK_EMO = { 'ほんよみ': '📖', 'えいご': '🔤', 'うんどう': '🏃', 'じぶんで': '✏️' };

  function openTaskPicker() {
    if (Engine.task()) return;
    if (Engine.walk()) return showToast('いまは ごはん探し中だよ');
    var kinds = TASK_PRESETS.map(function (k) {
      return '<button class="care-btn task-kind" data-kind="' + k.kind + '" style="padding:10px 2px">' +
        '<span class="emo">' + k.emo + '</span><span class="lbl">' + k.kind + '</span></button>';
    }).join('') +
      '<button class="care-btn task-kind" data-kind="__custom" style="padding:10px 2px">' +
      '<span class="emo">✏️</span><span class="lbl">じぶんで</span></button>';
    var mins = Engine.TASK_OPTIONS.map(function (m2) {
      return '<button class="care-btn task-min" data-min="' + m2 + '" style="padding:10px 2px"><span class="lbl">' + m2 + '分</span></button>';
    }).join('') +
      '<button class="care-btn task-min" data-min="__custom" style="padding:10px 2px"><span class="emo">✏️</span><span class="lbl">じぶんで</span></button>';
    var html = '<h2>🐾 お散歩（いい時間）</h2>' +
      '<p class="sub">本よみ・英語・運動など、自分で決めた「いい時間」の間、' +
      'この子は となりを散歩してる気分。<br>Kindleや英語アプリを使ってもOK。<b>失敗はないよ</b>。</p>' +
      '<p class="muted" style="font-size:11px;margin:-6px 0 10px">⏱ 時間を計るだけの <b>正直タイマー</b>。途中で何をしても自由。自分を信じて続けよう。</p>' +
      '<div class="dex-section-title">なにする？</div>' +
      '<div class="care-grid" style="grid-template-columns:repeat(4,1fr);gap:8px">' + kinds + '</div>' +
      '<input id="customKind" class="task-custom" maxlength="12" placeholder="じぶんの「いい時間」を入力（例：ピアノ）" style="display:none">' +
      '<div class="dex-section-title">どのくらい？</div>' +
      '<div class="care-grid" style="grid-template-columns:repeat(4,1fr);gap:8px">' + mins + '</div>' +
      '<input id="customMin" class="task-custom" type="number" min="' + Engine.TASK_MIN + '" max="' + Engine.TASK_MAX + '" placeholder="分（' + Engine.TASK_MIN + '〜' + Engine.TASK_MAX + '）" style="display:none">' +
      '<button id="taskStart" class="big-btn primary mt12" style="width:100%" disabled>はじめる</button>';
    var m = openModal(html);
    var kindSel = null, minSel = null;
    var ckInput = m.root.querySelector('#customKind');
    var cmInput = m.root.querySelector('#customMin');
    function effKind() { return kindSel === '__custom' ? (ckInput.value.trim() || 'じぶんで') : kindSel; }
    function effMin() {
      if (minSel === '__custom') { var v = parseInt(cmInput.value, 10); return (v >= Engine.TASK_MIN && v <= Engine.TASK_MAX) ? v : null; }
      return minSel;
    }
    function refresh() {
      m.root.querySelectorAll('.task-kind').forEach(function (b) { b.style.outline = b.getAttribute('data-kind') === kindSel ? '3px solid var(--accent-d)' : 'none'; });
      m.root.querySelectorAll('.task-min').forEach(function (b) { b.style.outline = b.getAttribute('data-min') === String(minSel) ? '3px solid var(--accent-d)' : 'none'; });
      ckInput.style.display = kindSel === '__custom' ? 'block' : 'none';
      cmInput.style.display = minSel === '__custom' ? 'block' : 'none';
      m.root.querySelector('#taskStart').disabled = !(kindSel && effMin());
    }
    m.root.querySelectorAll('.task-kind').forEach(function (b) {
      b.addEventListener('click', function () { kindSel = b.getAttribute('data-kind'); refresh(); if (kindSel === '__custom') ckInput.focus(); });
    });
    m.root.querySelectorAll('.task-min').forEach(function (b) {
      b.addEventListener('click', function () { var d = b.getAttribute('data-min'); minSel = d === '__custom' ? '__custom' : parseInt(d, 10); refresh(); if (minSel === '__custom') cmInput.focus(); });
    });
    ckInput.addEventListener('input', refresh);
    cmInput.addEventListener('input', refresh);
    m.root.querySelector('#taskStart').addEventListener('click', function () {
      var t = Engine.startTask(effKind(), effMin(), now());
      if (!t) return showToast('時間は ' + Engine.TASK_MIN + '〜' + Engine.TASK_MAX + '分で えらんでね');
      if (window.Native) Native.taskStarted(t);
      m.close();
      renderTaskRow();
      showToast('🐾 いってらっしゃい！');
    });
  }

  function renderTaskRow() {
    var el = $('taskRow');
    if (!el) return;
    var t = Engine.task();
    if (!t) { el.innerHTML = ''; el.style.display = 'none'; return; }
    var remain = Math.max(0, t.endsAt - now());
    el.style.display = 'flex';
    el.innerHTML = '<span>' + (TASK_EMO[t.kind] || '🐾') + ' ' + t.kind + 'で お散歩中… 残り ' + fmtMMSS(remain) + '</span>' +
      '<button id="taskCancel">やめる</button>';
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
    if (!t) { renderTaskRow(); return; }
    var r = Engine.checkTask(now());
    if (r && r.result === 'done') {
      if (window.Native) Native.taskEnded();
      renderTaskRow();
      happyUntil = now() + 1500;
      lastArtKey = '';
      render();
      showToast('🐾 おさんぽから かえってきた！えらい！（さんぽ +' + r.gain + '）');
    } else {
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
      '<p class="center muted">' + (info.stock > 0 ? days : 'エサがないよ。ごはん探しに行こう') + '</p>' +
      '<button id="handFeed" class="big-btn primary mt12" style="width:100%"' + (info.stock < 1 ? ' disabled' : '') + '>🤲 手であげる（なかよしアップ）</button>' +
      '<button id="buyFood" class="big-btn ghost mt12" style="width:100%"' + (st.coin < Engine.FOOD_COST ? ' disabled' : '') + '>🪙 エサを買う（' + Engine.FOOD_COST + 'コイン）</button>' +
      '<p class="muted mt12">たくさん欲しいときは「🍖 ごはん探し」（スマホを伏せる）が一番。</p>';
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
      Engine.farewell(now());
      farewellOpen = false;
      lastArtKey = '';
      m.close();
      render();
      showToast('🧺 ねんね中の赤ちゃんが やってきた');
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
        hunger: { id: 2001, title: 'えさが なくなりそう…🍚', body: 'スマホを おいて ごはんさがしに いこう' },
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
    setInterval(loop, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
