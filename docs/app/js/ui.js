/**
 * UI：描画・イベント・メインループ
 * engine / art / breeds を束ねて画面に出す。Date.now() はこのUI層から注入する。
 */
(function () {
  'use strict';

  var STATS = [
    { key: 'hunger', ico: '🍚', name: 'おなか' },
    { key: 'sanpo',  ico: '🐾', name: 'さんぽ' },
    { key: 'mood',   ico: '😊', name: 'きげん' },
    { key: 'clean',  ico: '🛁', name: 'きれい' },
    { key: 'energy', ico: '⚡', name: 'げんき' }
  ];
  var CARE_BTNS = [
    { action: 'feed',  emo: '🍚', lbl: 'ごはん' },
    { action: 'play',  emo: '🎾', lbl: 'あそぶ' },
    { action: 'wash',  emo: '🛁', lbl: 'おそうじ' },
    { action: 'sleep', emo: '💤', lbl: 'ねんね' }
  ];
  var STAGE_LABEL = ['おくるみ', 'あかちゃん', 'こども', 'せいたい'];

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
    var warn = h < 50 ? 'ぐあいが わるそう…' : (sp <= 0 ? 'とおくへ いきたそうにしている…' : '');
    el.innerHTML = '<span class="life-label">いのち</span><span>' + hearts + '</span>' +
      (warn ? '<span class="life-warn">' + warn + '</span>' : '');
  }

  function renderGrow() {
    var p = Engine.getState().current;
    var stage = Engine.stageOf(p.xp);
    $('growStage').textContent = STAGE_LABEL[stage];
    var G = Engine.GROW;
    var pct;
    if (stage >= 3) { pct = 100; $('growPct').textContent = 'MAX'; }
    else {
      var lo = G[stage], hi = G[stage + 1];
      pct = Math.max(0, Math.min(100, (p.xp - lo) / (hi - lo) * 100));
      $('growPct').textContent = 'つぎまで ' + Math.ceil(hi - p.xp);
    }
    $('growFill').style.width = pct + '%';
  }

  function renderPetIfChanged() {
    var breed = Engine.breed();
    var stage = Engine.stage();
    var mood = petMood();
    var key = breed.id + '_' + stage + '_' + mood;
    $('petName').textContent = stage === 0 ? 'ねんねちゅう…' : breed.name;
    var R = Breeds.RARITY[breed.rarity];
    $('petSub').textContent = stage === 0 ? 'どんな子かは めがあいてからの おたのしみ' : (breed.species === 'dog' ? 'いぬ' : 'ねこ') + '・' + STAGE_LABEL[stage];
    $('petRarity').innerHTML = stage === 0 ? '' :
      '<span class="rarity-chip" style="background:' + R.color + '">' + star(R.stars) + ' ' + R.label + '</span>' +
      (breed.nature ? ' <span class="nature-chip">' + breed.nature + '</span>' : '');
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
    var prog = Engine.dexProgress();
    $('dexBtn').innerHTML = '📖 ずかん ' + prog.found + '/' + prog.total +
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
      '<h2 class="intro-title">スマホを はなれるほど、<br>いぬねこが 育つ。</h2>' +
      '<p class="intro-lead">スマホを 置いた時間が、この子の <b>ごはん</b> になる。</p>' +
      '<div class="intro-steps">' +
      '<div class="intro-step"><span class="ist-ico">🍖</span><span><b>ごはんさがし</b><br>スマホをふせると えさが たまる</span></div>' +
      '<div class="intro-step"><span class="ist-ico">🐾</span><span><b>おさんぽ</b><br>どくしょ・えいご・うんどうの あいだ となりに</span></div>' +
      '<div class="intro-step"><span class="ist-ico">📖</span><span><b>ずかんを あつめる</b><br>いぬねこ 30しゅるい〜（広告ゼロ・登録なし）</span></div>' +
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
    var html = '<h2>ようこそ！🐾</h2><p class="sub">ねんね中の あかちゃんが まってるよ。<br>どっちの子を おむかえする？</p>' +
      '<div class="care-grid" style="grid-template-columns:1fr 1fr;gap:14px">' +
      '<button class="care-btn" data-sp="dog" style="padding:14px 4px"><div id="bundleDog" style="width:96px;height:96px;margin:auto"></div><span class="lbl">いぬの あかちゃん</span></button>' +
      '<button class="care-btn" data-sp="cat" style="padding:14px 4px"><div id="bundleCat" style="width:96px;height:96px;margin:auto"></div><span class="lbl">ねこの あかちゃん</span></button>' +
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
        showToast('🧺 あかちゃんを おむかえした！');
      });
    });
  }

  // 巣立ち結果
  function showGraduate(res) {
    var b = res.breed, R = Breeds.RARITY[b.rarity];
    var html = '<div class="center pop">' +
      (res.isNew ? '<div class="badge-new" style="display:inline-block;margin-bottom:6px">ずかん NEW!</div>' : '') +
      '<div class="hatch-art">' + Art.slot(b.id) + '</div>' +
      '<div class="hatch-name">' + b.name + ' が巣立ったよ</div>' +
      '<div class="hatch-rare"><span class="rarity-chip" style="background:' + R.color + '">' + star(R.stars) + ' ' + R.label + '</span></div>' +
      '<div class="hatch-desc">' + b.desc + '</div>' +
      '<div class="mt12" style="font-weight:800;color:var(--coin-text)">＋' + res.reward + ' コイン' + (res.isNew ? '（はつ登録ボーナス込み）' : '') + '</div>' +
      '<button id="nextEgg" class="big-btn primary mt12" style="width:100%">つぎの子をおむかえ →</button>' +
      '</div>';
    var m = openModal(html, {
      onClose: function () { lastArtKey = ''; render(); maybeMilestone(res); }
    });
    Art.hydrate(m.root);
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
      '<h2>' + (comp ? 'ずかん コンプリート！' : 'ずかん ' + prog.found + 'しゅるい たっせい！') + '</h2>' +
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

    // プレミアム枠（未解放=CTA／解放後=コレクション）
    var premBlock;
    if (premium) {
      premBlock = '<div class="dex-section-title">⭐ プレミアム図鑑（' + prog.premiumFound + '/' + prog.premiumTotal + '）</div>' +
        '<div class="dex-grid">' + grid(premDogs.concat(premCats)) + '</div>';
    } else {
      premBlock = '<div class="prem-cta">' +
        '<div class="prem-cta-title">⭐ プレミアム図鑑</div>' +
        '<p class="prem-cta-sub">いまは メジャーな ' + prog.freeTotal + 'しゅるい。<br>' +
        Breeds.PREMIUM.price + 'で <b>すべての公式品種</b>（犬・猫を ぞくぞく追加）を あつめられるよ。</p>' +
        '<div class="dex-grid prem-peek">' + grid(premDogs.slice(0, 3).concat(premCats.slice(0, 3))) + '</div>' +
        '<button id="premBtn" class="big-btn primary" style="width:100%;margin-top:10px">' + Breeds.PREMIUM.price + 'で すべて解放</button>' +
        '<p class="muted" style="margin-top:8px;font-size:11px">買い切り・広告ゼロ。延命や復活の課金はありません。</p>' +
        '</div>';
    }

    var html = '<h2>📖 いぬねこ図鑑</h2>' +
      '<div class="dex-stats">' +
      '<span class="dex-pill">たっせい ' + pct + '%（' + prog.found + '/' + prog.total + '）</span>' +
      '<span class="dex-pill">🐶 ' + prog.dogFound + '/' + prog.dogTotal + '</span>' +
      '<span class="dex-pill">🐱 ' + prog.catFound + '/' + prog.catTotal + '</span>' +
      (premium ? '<span class="dex-pill" style="background:#fff0d6">⭐ プレミアム</span>' : '') +
      '</div>' +
      '<div class="grow-bar"><div class="grow-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="dex-section-title">🐶 いぬ</div><div class="dex-grid">' + grid(freeDogs) + '</div>' +
      '<div class="dex-section-title">🐱 ねこ</div><div class="dex-grid">' + grid(freeCats) + '</div>' +
      premBlock +
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
      '<p class="sub">「いぬねこ図鑑」 v2.0 — スマホをはなれて、そだてる いぬねこ</p>' +
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
      '<button id="resetBtn" class="big-btn ghost mt12" style="width:100%;color:var(--badge-new)">🗑 データをリセット</button>';
    var m = openModal(html);
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
    if (p.hunger < 25) msgs.push('おなかぺこぺこ…🍚');
    if (p.clean < 25) msgs.push('おふろにいれてあげて🛁');
    if (p.mood < 25) msgs.push('ちょっとさみしそう…😢');
    if (p.sanpo != null && p.sanpo < 25) msgs.push('そろそろ いっしょに「いいじかん」を すごしたいな🐾');
    if (p.health != null && p.health < 50) msgs.push('なんだか ぐあいが わるそう…💧');
    if (rep.autoFed > 0) msgs.push('るすのあいだに ごはんを ' + rep.autoFed + 'かい たべたよ🍚');
    if (rep.afterStage > rep.beforeStage) msgs.push('そのあいだに大きくなったよ！✨');
    var grewNote = rep.elapsedMs > rep.cappedMs ?
      '<p class="muted">※ 放置は24時間ぶんまで反映されます。</p>' : '';
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

  function openWalkPicker() {
    if (Engine.walk()) return;
    var btns = Engine.WALK_OPTIONS.map(function (min) {
      return '<button class="care-btn" data-min="' + min + '" style="padding:14px 4px">' +
        '<span class="emo">' + (min <= 30 ? '🐾' : min <= 60 ? '🌳' : '⛰') + '</span>' +
        '<span class="lbl">' + fmtMin(min) + '</span></button>';
    }).join('');
    var html = '<h2>🍖 ごはんさがしに でかける</h2>' +
      '<p class="sub">スマホをふせて、そのあいだは もどってこないでね。<br>' +
      'ぶじに帰ってこられたら <b>えさ</b> をもってかえるよ（30分=2・1時間=4・2時間=8）。<br>' +
      '<b>とちゅうでアプリをひらくと失敗</b>しちゃう…！</p>' +
      '<div class="care-grid" style="grid-template-columns:repeat(3,1fr);gap:12px">' + btns + '</div>' +
      '<p class="muted mt12">ながく でかけるほど ごほうびアップ。れんぞく成功でさらにアップ！<br>※はじめてから60秒いないなら、もどってもセーフだよ。</p>';
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
      '<h2 style="margin-top:6px">' + fmtMin(r.minutes) + ' スマホを はなれた</h2>' +
      '<p class="sub" style="margin-bottom:8px">れんぞく成功 <b>' + r.streak + '</b> 回め' + (r.isBest && r.streak > 1 ? '（じこしんきろく！）' : '') + '</p>' +
      '<div style="font-weight:800;color:var(--coin-text)">🍖 えさ ×' + r.foods + '　🪙 ＋' + r.coinGain + '　なかよし ＋' + r.xpGain + '</div>' +
      (r.stageAfter > r.stageBefore ? '<p style="font-weight:800;margin:8px 0 0">✨ おさんぽのあいだに大きくなった！</p>' : '') +
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
      '<h2>' + (gentle ? 'ごはんさがしを やめたよ' : 'あっ…！') + '</h2>' +
      '<p class="sub">' + (gentle ?
        'またこんど、いっしょにでかけようね。' :
        'とちゅうでスマホをひらいちゃった…。<br>ごはんは みつからなかった。ちょっとしょんぼりしてる…') + '</p>' +
      '<div style="font-size:56px;margin:4px">' + (gentle ? '🐾' : '💧') + '</div>' +
      '<p class="muted">れんぞく成功はリセット。つぎはきっとだいじょうぶ！</p>' +
      '<button id="walkNg" class="big-btn primary mt12" style="width:100%">うん…</button></div>';
    var m = openModal(html, { onClose: function () { lastArtKey = ''; render(); } });
    var ng = m.root.querySelector('#walkNg');
    if (ng) ng.addEventListener('click', m.close);
  }

  // ---------- さんぽ（学習・運動などの いい時間。失敗なし） ----------
  var TASK_EMO = { 'どくしょ': '📖', 'えいご': '🔤', 'うんどう': '💪', 'ジョグ': '🏃', 'しゅうちゅう': '🎯' };

  function openTaskPicker() {
    if (Engine.task()) return;
    if (Engine.walk()) return showToast('いまは ごはんさがしちゅうだよ');
    var kinds = Engine.TASK_KINDS.map(function (k) {
      return '<button class="care-btn task-kind" data-kind="' + k + '" style="padding:10px 2px">' +
        '<span class="emo">' + (TASK_EMO[k] || '🐾') + '</span><span class="lbl">' + k + '</span></button>';
    }).join('');
    var mins = Engine.TASK_OPTIONS.map(function (m2) {
      return '<button class="care-btn task-min" data-min="' + m2 + '" style="padding:10px 2px"><span class="lbl">' + m2 + 'ふん</span></button>';
    }).join('');
    var html = '<h2>🐾 おさんぽ（いいじかん）</h2>' +
      '<p class="sub">どくしょ・えいご・うんどうなど、じぶんできめた「いいじかん」のあいだ、' +
      'この子は となりを おさんぽしてる気分。<br>KindleやえいごアプリをつかってもOK。<b>失敗はないよ</b>。</p>' +
      '<div class="dex-section-title">なにをする？</div>' +
      '<div class="care-grid" style="grid-template-columns:repeat(5,1fr);gap:8px">' + kinds + '</div>' +
      '<div class="dex-section-title">どのくらい？</div>' +
      '<div class="care-grid" style="grid-template-columns:repeat(3,1fr);gap:8px">' + mins + '</div>' +
      '<button id="taskStart" class="big-btn primary mt12" style="width:100%" disabled>はじめる</button>';
    var m = openModal(html);
    var kind = null, min = null;
    function refresh() {
      m.root.querySelectorAll('.task-kind').forEach(function (b) { b.style.outline = b.getAttribute('data-kind') === kind ? '3px solid var(--accent-d)' : 'none'; });
      m.root.querySelectorAll('.task-min').forEach(function (b) { b.style.outline = parseInt(b.getAttribute('data-min'), 10) === min ? '3px solid var(--accent-d)' : 'none'; });
      m.root.querySelector('#taskStart').disabled = !(kind && min);
    }
    m.root.querySelectorAll('.task-kind').forEach(function (b) {
      b.addEventListener('click', function () { kind = b.getAttribute('data-kind'); refresh(); });
    });
    m.root.querySelectorAll('.task-min').forEach(function (b) {
      b.addEventListener('click', function () { min = parseInt(b.getAttribute('data-min'), 10); refresh(); });
    });
    m.root.querySelector('#taskStart').addEventListener('click', function () {
      var t = Engine.startTask(kind, min, now());
      if (!t) return;
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
    el.innerHTML = '<span>' + (TASK_EMO[t.kind] || '🐾') + ' ' + t.kind + 'で おさんぽちゅう… のこり ' + fmtMMSS(remain) + '</span>' +
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
    var days = info.days >= 1 ? ('あと約' + Math.floor(info.days) + '日ぶん') : 'もうすぐ なくなりそう…';
    var html = '<h2>🍚 ごはん</h2>' +
      '<p class="sub">えさは <b>スマホをはなれた時間</b> でたまるよ。<br>ストックがあるあいだは じどうで たべてくれる。</p>' +
      '<div class="center" style="font-size:34px;margin:4px">🍖 ×' + info.stock + '</div>' +
      '<p class="center muted">' + (info.stock > 0 ? days : 'えさがないよ。ごはんさがしに いこう') + '</p>' +
      '<button id="handFeed" class="big-btn primary mt12" style="width:100%"' + (info.stock < 1 ? ' disabled' : '') + '>🤲 てであげる（なかよしアップ）</button>' +
      '<button id="buyFood" class="big-btn ghost mt12" style="width:100%"' + (st.coin < Engine.FOOD_COST ? ' disabled' : '') + '>🪙 えさを かう（' + Engine.FOOD_COST + 'コイン）</button>' +
      '<p class="muted mt12">たくさん ほしいときは「🍖 ごはんさがし」（スマホをふせる）が いちばん。</p>';
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
        '<h2>' + b.name + 'は<br>たびに でました</h2>' +
        '<p class="sub">いっしょの「いいじかん」が たりなくて、<br>あたらしい かぞくを さがしに いったみたい。<br>どこかで げんきに しているよ。</p>' +
        '<div style="font-size:56px;margin:10px">🎒</div>' +
        '<button id="fwBtn" class="big-btn primary mt12" style="width:100%">あたらしい子を おむかえする</button>' +
        '</div>'
      : '<div class="center">' +
        '<h2>' + b.name + 'は<br>おほしさまに なりました</h2>' +
        '<p class="sub">ごはんが たりなかったみたい。<br>いっしょに すごした じかんは きえないよ。</p>' +
        '<div style="font-size:56px;margin:10px">🌟</div>' +
        '<button id="fwBtn" class="big-btn primary mt12" style="width:100%">あたらしい子を おむかえする</button>' +
        '</div>';
    var m = openModal(html, { closable: false });
    m.root.querySelector('#fwBtn').addEventListener('click', function () {
      Engine.farewell(now());
      farewellOpen = false;
      lastArtKey = '';
      m.close();
      render();
      showToast('🧺 ねんね中の あかちゃんが やってきた');
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
