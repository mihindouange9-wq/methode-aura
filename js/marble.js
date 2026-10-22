/* ==========================================================================
   Le marbre — la vidéo jouée en boucle, au ralenti, en fond.

   Deux lecteurs identiques : quand le premier approche de sa fin, le second
   démarre depuis le début et se fond par-dessus (fondu enchaîné), puis les
   rôles s'inversent. La boucle est ainsi invisible : jamais de saut du sommet
   de la tête au socle. Vitesse réduite (RATE) pour un mouvement plus ample.
   Un léger parallaxe suit le pointeur et un zoom très doux accompagne le
   scroll. Si l'autoplay est refusé, la lecture démarre au premier geste.
   La version pilotée par le scroll (images reconstruites) est conservée dans
   ========================================================================== */
(function () {
  'use strict';
  var A = window.AURA;
  var wrap = document.getElementById('marble');
  var va = document.getElementById('marbleVideo');
  var vb = document.getElementById('marbleVideoB');
  if (!wrap || !va) return;

  var html = document.documentElement;
  var RATE = 0.6;    // vitesse de lecture du mp4 de repli (1 = normale)
  var baked = false;                      // vrai si le fichier joué est le WebM généré (ralenti et boucle déjà intégrés)
  var XFADE = 1.4;                        // durée du fondu à la boucle, en secondes de vidéo
  var players = [va, vb].filter(Boolean);
  var current = 0, fading = false, started = false, duration = 0;

  function fail() { html.classList.add('no-video'); wrap.classList.add('is-ready'); }

  /* Sources : le WebM 1080p (14 Mo, ralenti et boucle intégrés) sur ordinateur ; sur écran tactile
     ou étroit, le mp4 d'origine (3,6 Mo, 720p), joué au ralenti avec une boucle par fondu. */
  (function pickSources() {
    if (!va.dataset.mp4 && !va.dataset.webm) return;
    var light = A.coarse || A.narrow;
    function add(src, type) { var s = document.createElement('source'); s.src = src; s.type = type; va.appendChild(s); }
    if (!light && va.dataset.webm) add(va.dataset.webm, 'video/webm');
    if (va.dataset.mp4) add(va.dataset.mp4, 'video/mp4');
    va.load();
  })();

  players.forEach(function (v) {
    v.loop = false; v.muted = true; v.defaultMuted = true; v.playsInline = true;
    v.playbackRate = RATE; v.defaultPlaybackRate = RATE;
    v.addEventListener('error', fail, { once: true });
  });

  function tryPlay(v) {
    var p; try { p = v.play(); } catch (e) { p = null; }
    if (p && p.catch) p.catch(function () { /* autoplay refusé : on attend un geste */ });
  }
  function start() {
    if (started) return;
    started = true;
    duration = va.duration || 0;
    baked = /\.webm(\?|$)/i.test(va.currentSrc || '');
    if (baked) { va.loop = true; va.playbackRate = 1; va.defaultPlaybackRate = 1; }
    va.currentTime = 0; va.style.opacity = '1';
    if (vb) { vb.style.opacity = '0'; vb.pause(); }
    tryPlay(va);
    wrap.classList.add('is-ready');
    // Distorsion liquide au pointeur (desktop) : la vidéo devient une texture WebGL
    if (A.liquidSupported && A.liquidSupported() && A.liquid) {
      var liq = A.liquid(wrap, va, { guard: true, pointerTarget: window, focal: [0.5, 0.45], dpr: 1, flowSize: 192, radius: 0.13, dissipate: 0.968, strength: 0.85, amount: 0.05, chroma: 0.01, ripple: 0.0035,
        parallax: function () { return [-A.pointer.snx * 0.012, A.pointer.sny * 0.009]; },
        onReady: function () { wrap.classList.add('liquid-ready'); },
        onFail: function () { wrap.classList.remove('has-liquid', 'liquid-ready'); A.marbleLiquid = null; } });
      if (liq) { wrap.insertBefore(liq.canvas, wrap.querySelector('.marble-shade')); wrap.classList.add('has-liquid'); A.marbleLiquid = liq; }
    }
  }
  if (va.readyState >= 1) start(); else va.addEventListener('loadedmetadata', start, { once: true });
  setTimeout(function () { if (!started) { if (va.readyState >= 1) start(); else fail(); } }, 15000);

  // Autoplay refusé (rare avec muted) : premier geste
  var kick = function () { players.forEach(function (v) { if (v.paused && v.style.opacity !== '0') tryPlay(v); }); };
  ['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(function (ev) { window.addEventListener(ev, kick, { passive: true }); });

  // Boucle par fondu enchaîné entre les deux lecteurs
  var fadeT = 0;
  function tick(dt) {
    if (!started || baked) return;   // WebM généré : boucle native, rien à faire
    var cur = players[current];
    var d = cur.duration || duration; if (!d) return;
    if (!vb) { if (cur.ended) { cur.currentTime = 0; tryPlay(cur); } return; }
    var nxt = players[1 - current];
    var remaining = d - cur.currentTime;
    if (!fading && remaining <= XFADE + 0.05) {
      fading = true; fadeT = 0;
      try { nxt.currentTime = 0; } catch (e) {}
      nxt.playbackRate = RATE;
      tryPlay(nxt);
    }
    if (fading) {
      fadeT += dt * RATE;                     // en secondes de vidéo
      var k = A.clamp(fadeT / XFADE, 0, 1);
      var e = k * k * (3 - 2 * k);
      nxt.style.opacity = e.toFixed(3);
      cur.style.opacity = (1 - e).toFixed(3);
      if (k >= 1 || cur.ended || remaining <= 0.02) {
        cur.pause(); cur.style.opacity = '0'; nxt.style.opacity = '1';
        current = 1 - current; fading = false;
      }
    }
  }

  /* ---- Parallaxe et zoom (les deux lecteurs bougent ensemble) ---- */
  var px = 0, py = 0, zoom = 1;
  A.register({
    name: 'marble',
    update: function (dt) {
      tick(dt);
      if (!started || A.reduced) return;
      var p = A.scroll.progress;
      px = A.damp(px, A.pointer.snx * 10, 3, dt);
      py = A.damp(py, -A.pointer.sny * 8 + Math.sin(A.time * 0.25) * 3, 3, dt);
      zoom = A.damp(zoom, 1 + p * 0.06, 3, dt);
      var vx = px.toFixed(2) + 'px', vy = py.toFixed(2) + 'px', vs = zoom.toFixed(4);
      for (var i = 0; i < players.length; i++) {
        var s = players[i].style;
        s.setProperty('--vx', vx); s.setProperty('--vy', vy); s.setProperty('--vs', vs);
      }
    }
  });

  // Onglet masqué : pause, reprise au retour (économie, et pas de désynchronisation du fondu)
  document.addEventListener('visibilitychange', function () {
    if (!started) return;
    if (document.hidden) players.forEach(function (v) { v.pause(); });
    else { tryPlay(players[current]); if (fading) tryPlay(players[1 - current]); }
  });
})();
