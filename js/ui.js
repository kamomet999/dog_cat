/**
 * UI：描画・イベント・メインループ
 * engine / art / breeds を束ねて画面に出す。Date.now() はこのUI層から注入する。
 */
(function () {
  'use strict';

  var STATS = [
    { key: 'hunger', ico: '🍚', name: 'おなか' },
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
  var STAGE_LABEL = ['たまご', 'あかちゃん', 'こども', 'せいたい'];

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
      var v = Math.round(p[s.key]);
      $('val_' + s.key).textContent = v;
      var bar = $('bar_' + s.key);
      bar.style.width = v + '%';
      bar.style.background = barColor(v);
    });
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
    $('petName').textContent = stage === 0 ? 'たまご' : breed.name;
    var R = Breeds.RARITY[breed.rarity];
    $('petSub').textContent = stage === 0 ? 'なにがうまれるかな…' : (breed.species === 'dog' ? 'いぬ' : 'ねこ') + '・' + STAGE_LABEL[stage];
    $('petRarity').innerHTML = stage === 0 ? '' :
      '<span class="rarity-chip" style="background:' + R.color + '">' + star(R.stars) + ' ' + R.label + '</span>';
    if (key !== lastArtKey) {
      $('petArt').innerHTML = Art.petSVG(breed, stage, mood);
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
      act.innerHTML = '🔄 ひきなおす(' + Engine.REROLL_COST + ')';
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
      showToast('🥚 あたらしいたまご！');
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
    if (stage === 1) showToast('🐣 たまごがかえった！');
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
    function close() { bg.classList.remove('show'); setTimeout(function () { root.innerHTML = ''; if (opts.onClose) opts.onClose(); }, 200); }
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (opts.closable !== false) bg.addEventListener('click', function (e) { if (e.target === bg) close(); });
    return { root: root, close: close };
  }

  // 種選択（初回・閉じられない）
  function openSpeciesPicker() {
    var dogEgg = Art.eggSVG({ art: { color: '#e3b76b', color2: '#fff3df' } });
    var catEgg = Art.eggSVG({ art: { color: '#9a7b4f', color2: '#e9ddc7' } });
    var html = '<h2>ようこそ！🐾</h2><p class="sub">どっちのたまごからはじめる？<br>そだてて図鑑をうめていこう。</p>' +
      '<div class="care-grid" style="grid-template-columns:1fr 1fr;gap:14px">' +
      '<button class="care-btn" data-sp="dog" style="padding:14px 4px"><div style="width:90px;height:90px;margin:auto">' + dogEgg + '</div><span class="lbl">いぬのたまご</span></button>' +
      '<button class="care-btn" data-sp="cat" style="padding:14px 4px"><div style="width:90px;height:90px;margin:auto">' + catEgg + '</div><span class="lbl">ねこのたまご</span></button>' +
      '</div>';
    var m = openModal(html, { closable: false });
    Array.prototype.forEach.call(m.root.querySelectorAll('[data-sp]'), function (btn) {
      btn.addEventListener('click', function () {
        Engine.newGame(btn.getAttribute('data-sp'), now());
        lastArtKey = '';
        m.close();
        render();
        showToast('🥚 たまごをおむかえした！');
      });
    });
  }

  // 巣立ち結果
  function showGraduate(res) {
    var b = res.breed, R = Breeds.RARITY[b.rarity];
    var html = '<div class="center pop">' +
      (res.isNew ? '<div class="badge-new" style="display:inline-block;margin-bottom:6px">ずかん NEW!</div>' : '') +
      '<div class="hatch-art">' + Art.thumbSVG(b) + '</div>' +
      '<div class="hatch-name">' + b.name + ' が巣立ったよ</div>' +
      '<div class="hatch-rare"><span class="rarity-chip" style="background:' + R.color + '">' + star(R.stars) + ' ' + R.label + '</span></div>' +
      '<div class="hatch-desc">' + b.desc + '</div>' +
      '<div class="mt12" style="font-weight:800;color:var(--coin)">＋' + res.reward + ' コイン' + (res.isNew ? '（はつ登録ボーナス込み）' : '') + '</div>' +
      '<button id="nextEgg" class="big-btn primary mt12" style="width:100%">つぎの子をおむかえ →</button>' +
      '</div>';
    var m = openModal(html, {
      onClose: function () { lastArtKey = ''; render(); }
    });
    var nb = m.root.querySelector('#nextEgg');
    if (nb) nb.addEventListener('click', m.close);
  }

  // 図鑑
  function openDex() {
    var prog = Engine.dexProgress();
    var st = Engine.getState();
    function grid(species) {
      return Breeds.ofSpecies(species).map(function (b) {
        var d = st.dex[b.id];
        if (d) {
          var R = Breeds.RARITY[b.rarity];
          return '<div class="dex-cell found">' +
            (d.unseen ? '<span class="new-dot">NEW</span>' : '') +
            '<div class="thumb">' + Art.thumbSVG(b) + '</div>' +
            '<div class="dn">' + b.name + '</div>' +
            '<div class="stars" style="color:' + R.color + '">' + star(R.stars) + '</div></div>';
        }
        return '<div class="dex-cell locked">' +
          '<div class="thumb" style="display:flex;align-items:center;justify-content:center;font-size:34px">❓</div>' +
          '<div class="dn">？？？</div><div class="stars">&nbsp;</div></div>';
      }).join('');
    }
    var html = '<h2>📖 いぬねこ図鑑</h2>' +
      '<div class="dex-stats">' +
      '<span class="dex-pill">ぜんぶ ' + prog.found + ' / ' + prog.total + '</span>' +
      '<span class="dex-pill">🐶 ' + prog.dogFound + '/' + prog.dogTotal + '</span>' +
      '<span class="dex-pill">🐱 ' + prog.catFound + '/' + prog.catTotal + '</span>' +
      '</div>' +
      '<div class="dex-section-title">🐶 いぬ</div><div class="dex-grid">' + grid('dog') + '</div>' +
      '<div class="dex-section-title">🐱 ねこ</div><div class="dex-grid">' + grid('cat') + '</div>';
    openModal(html, {
      onClose: function () {
        // 見たのでNEWを消す
        Object.keys(st.dex).forEach(function (id) { if (st.dex[id].unseen) Engine.markSeen(id); });
        renderFoot();
      }
    });
  }

  // 設定
  function openSettings() {
    var st = Engine.getState();
    var html = '<h2>⚙ せってい</h2>' +
      '<p class="sub">「いぬねこ図鑑」 v1.0 — 放置でそだてるたまごっち</p>' +
      '<p class="muted">アプリを閉じているあいだも時間がすすみ、コインがたまって少しずつ成長します（最大24時間ぶんまで）。世話をするほど早く育ち、機嫌もよくなります。</p>' +
      '<hr class="soft">' +
      '<p class="muted">これまで巣立たせた数：<b>' + st.graduates + '</b> ／ 図鑑：<b>' + Engine.dexProgress().found + '</b> 種</p>' +
      '<button id="resetBtn" class="big-btn ghost mt12" style="width:100%;color:var(--bad)">🗑 データをリセット</button>';
    var m = openModal(html);
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
    if (rep.afterStage > rep.beforeStage) msgs.push('そのあいだに大きくなったよ！✨');
    var grewNote = rep.elapsedMs > rep.cappedMs ?
      '<p class="muted">※ 放置は24時間ぶんまで反映されます。</p>' : '';
    var html = '<div class="center"><h2>おかえりなさい！🐾</h2>' +
      '<p class="sub">' + fmtDur(rep.elapsedMs) + 'ぶり</p>' +
      '<div style="font-size:60px;margin:6px">' + (Engine.stage() === 0 ? '🥚' : '🐾') + '</div>' +
      '<div style="font-weight:800;color:var(--coin);font-size:18px">＋' + rep.coinGain + ' コイン</div>' +
      (msgs.length ? '<p class="mt12">' + msgs.join('<br>') + '</p>' : '<p class="mt12 muted">みんな元気にまってたよ</p>') +
      grewNote +
      '<button id="okBtn" class="big-btn primary mt12" style="width:100%">ただいま！</button></div>';
    var m = openModal(html);
    var ok = m.root.querySelector('#okBtn');
    if (ok) ok.addEventListener('click', m.close);
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
    render();
    if (post > pre) celebrateGrowth(post);
  }

  // ---------- 起動 ----------
  function start() {
    buildSkeleton();
    var s = Engine.init();
    if (!s || !s.current) {
      openSpeciesPicker();
    } else {
      var rep = Engine.applyOffline(now());
      render();
      showReturn(rep);
    }
    setInterval(loop, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
