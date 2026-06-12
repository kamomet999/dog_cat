/**
 * UI：描画・イベント・メインループ
 * engine / art / breeds を束ねて画面に出す。Date.now() はこのUI層から注入する。
 */
(function () {
  'use strict';

  var STATS = [
    { key: 'hunger', ico: '🍚', name: 'おなか' },
    { key: 'detox',  ico: '🐾', name: 'おさんぽ' },
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
    el.innerHTML = '<span class="life-label">いのち</span><span>' + hearts + '</span>' +
      (h < 50 ? '<span class="life-warn">ぐあいが わるそう…</span>' : '');
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
      '<div class="mt12" style="font-weight:800;color:var(--coin)">＋' + res.reward + ' コイン' + (res.isNew ? '（はつ登録ボーナス込み）' : '') + '</div>' +
      '<button id="nextEgg" class="big-btn primary mt12" style="width:100%">つぎの子をおむかえ →</button>' +
      '</div>';
    var m = openModal(html, {
      onClose: function () { lastArtKey = ''; render(); }
    });
    Art.hydrate(m.root);
    var nb = m.root.querySelector('#nextEgg');
    if (nb) nb.addEventListener('click', m.close);
  }

  // 図鑑
  function openDex() {
    var prog = Engine.dexProgress();
    var st = Engine.getState();
    var pct = Math.floor(prog.found / prog.total * 100);
    function grid(species) {
      return Breeds.ofSpecies(species).map(function (b) {
        var d = st.dex[b.id];
        if (d) {
          var R = Breeds.RARITY[b.rarity];
          return '<button class="dex-cell found" data-dex="' + b.id + '">' +
            (d.unseen ? '<span class="new-dot">NEW</span>' : '') +
            (d.count > 1 ? '<span class="count-dot">×' + d.count + '</span>' : '') +
            '<div class="thumb">' + Art.slot(b.id) + '</div>' +
            '<div class="dn">' + b.name + '</div>' +
            '<div class="stars" style="color:' + R.color + '">' + star(R.stars) + '</div></button>';
        }
        // 未発見はシルエットで「いる気配」だけ見せる
        return '<div class="dex-cell locked">' +
          '<div class="thumb silhouette">' + Art.slot(b.id) + '</div>' +
          '<div class="dn">？？？</div><div class="stars">&nbsp;</div></div>';
      }).join('');
    }
    var html = '<h2>📖 いぬねこ図鑑</h2>' +
      '<div class="dex-stats">' +
      '<span class="dex-pill">たっせい ' + pct + '%（' + prog.found + '/' + prog.total + '）</span>' +
      '<span class="dex-pill">🐶 ' + prog.dogFound + '/' + prog.dogTotal + '</span>' +
      '<span class="dex-pill">🐱 ' + prog.catFound + '/' + prog.catTotal + '</span>' +
      '</div>' +
      '<div class="grow-bar"><div class="grow-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="dex-section-title">🐶 いぬ</div><div class="dex-grid">' + grid('dog') + '</div>' +
      '<div class="dex-section-title">🐱 ねこ</div><div class="dex-grid">' + grid('cat') + '</div>';
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
      ((st.deaths || 0) > 0 ? ' ／ おほしさまになった子：<b>' + st.deaths + '</b>' : '') + '</p>' +
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
    if (p.detox != null && p.detox < 25) msgs.push('スマホをおいて おさんぽに いきたいな🐾');
    if (p.health != null && p.health < 50) msgs.push('なんだか ぐあいが わるそう…💧');
    if (rep.afterStage > rep.beforeStage) msgs.push('そのあいだに大きくなったよ！✨');
    var grewNote = rep.elapsedMs > rep.cappedMs ?
      '<p class="muted">※ 放置は24時間ぶんまで反映されます。</p>' : '';
    var html = '<div class="center"><h2>おかえりなさい！🐾</h2>' +
      '<p class="sub">' + fmtDur(rep.elapsedMs) + 'ぶり</p>' +
      '<div style="font-size:60px;margin:6px">' + (Engine.stage() === 0 ? '💤' : '🐾') + '</div>' +
      '<div style="font-weight:800;color:var(--coin);font-size:18px">＋' + rep.coinGain + ' コイン</div>' +
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
    var html = '<h2>🐾 おさんぽにでかける</h2>' +
      '<p class="sub">スマホをとじて、そのあいだは もどってこないでね。<br>' +
      'ぶじに帰ってこられたら ぐんと育って、ごほうびがもらえるよ。<br>' +
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
        '<div class="walk-title">おさんぽちゅう…</div>' +
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

  function showWalkSuccess(r) {
    happyUntil = now() + 2000;
    var html = '<div class="center pop">' +
      '<h2>🎉 おさんぽ せいこう！</h2>' +
      '<p class="sub">' + fmtMin(r.minutes) + ' スマホからはなれられたよ。えらい！</p>' +
      '<div style="font-size:56px;margin:4px">🐾</div>' +
      '<div style="font-weight:800;color:var(--coin);font-size:18px">＋' + r.coinGain + ' コイン</div>' +
      '<div style="font-weight:800;color:var(--accent-d)">なかよし ＋' + r.xpGain + '</div>' +
      '<p class="mt12">れんぞく成功 <b>' + r.streak + '</b> 回め' + (r.isBest && r.streak > 1 ? '（じこしんきろく！）' : '') + '</p>' +
      (r.stageAfter > r.stageBefore ? '<p style="font-weight:800">✨ おさんぽのあいだに大きくなった！</p>' : '') +
      '<button id="walkOk" class="big-btn primary mt12" style="width:100%">ただいま！</button></div>';
    var m = openModal(html, { onClose: function () { lastArtKey = ''; render(); } });
    var ok = m.root.querySelector('#walkOk');
    if (ok) ok.addEventListener('click', m.close);
  }

  function showWalkFail(r) {
    var gentle = r.reason === 'cancel';
    var html = '<div class="center">' +
      '<h2>' + (gentle ? 'おさんぽをやめたよ' : 'あっ…！') + '</h2>' +
      '<p class="sub">' + (gentle ?
        'またこんど、いっしょにでかけようね。' :
        'とちゅうでスマホをひらいちゃった…。<br>おさんぽは失敗。ちょっとしょんぼりしてる…') + '</p>' +
      '<div style="font-size:56px;margin:4px">' + (gentle ? '🐾' : '💧') + '</div>' +
      '<p class="muted">れんぞく成功はリセット。つぎはきっとだいじょうぶ！</p>' +
      '<button id="walkNg" class="big-btn primary mt12" style="width:100%">うん…</button></div>';
    var m = openModal(html, { onClose: function () { lastArtKey = ''; render(); } });
    var ng = m.root.querySelector('#walkNg');
    if (ng) ng.addEventListener('click', m.close);
  }

  // ---------- おわかれ ----------
  var farewellOpen = false;
  function showFarewell() {
    if (farewellOpen) return;
    farewellOpen = true;
    hideWalkOverlay();
    var b = Engine.breed();
    var html = '<div class="center">' +
      '<h2>' + b.name + 'は<br>おほしさまに なりました</h2>' +
      '<p class="sub">ごはんと おさんぽが たりなかったみたい。<br>いっしょに すごした じかんは きえないよ。</p>' +
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
    if (Engine.isDead()) { render(); showFarewell(); return; }
    syncWalk();
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
      if ((rep && rep.died) || Engine.isDead()) {
        showFarewell();
      } else {
        // おさんぽの結果（成功/失敗/継続）があればそちらを優先表示
        var wr = syncWalk();
        if (!wr) showReturn(rep);
      }
    }
    function onResume() {
      var rep = Engine.applyOffline(now());
      if (rep && rep.died) { render(); showFarewell(); return; }
      syncWalk();
      render();
    }
    // バックグラウンドへ行く瞬間に「危険の予告」をローカル通知でスケジュール（GAME_DESIGN.md §4）
    function onPause() {
      if (!window.Native) return;
      var MSG = {
        hunger: { id: 2001, title: 'おなか ぺこぺこだよ…🍚', body: 'ごはんを わすれないでね' },
        detox:  { id: 2002, title: 'そろそろ おさんぽに いきたいな🐾', body: 'スマホを おいて いっしょに でかけよう' },
        health: { id: 2003, title: 'ぐあいが わるいみたい…💧', body: 'ごはんと おさんぽを おねがい' }
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
