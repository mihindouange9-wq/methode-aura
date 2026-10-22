/* ==========================================================================
   AURA core — une seule boucle rAF, un seul état pointeur / scroll.
   Tous les modules s'y branchent : aucun listener scroll ne fait de layout,
   les positions sont mesurées au resize et interpolées à chaque frame.
   ========================================================================== */
(function () {
  'use strict';

  var html = document.documentElement;
  var reduced = html.classList.contains('reduced-motion');
  var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var coarse = window.matchMedia('(pointer:coarse)').matches;
  var narrow = window.innerWidth < 900;
  var dpr = window.devicePixelRatio || 1;
  var lowPower = coarse || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4);

  var A = window.AURA = {
    reduced: reduced,
    fine: fine,
    coarse: coarse,
    narrow: narrow,
    lowPower: !!lowPower,
    dpr: dpr,
    vw: window.innerWidth,
    vh: window.innerHeight,
    events: {},
    modules: [],
    // Pointeur : cible brute (px, écran) et version lissée. Normalisé -1..1 (nx, ny).
    pointer: { x: window.innerWidth / 2, y: window.innerHeight / 2, sx: window.innerWidth / 2, sy: window.innerHeight / 2, nx: 0, ny: 0, snx: 0, sny: 0, active: false, down: false },
    // Scroll : brut et lissé, direction, progression globale.
    scroll: { y: window.scrollY || 0, sy: window.scrollY || 0, dir: 1, progress: 0, max: 1 },
    // Gyroscope (mobile) : inclinaison normalisée -1..1
    tilt: { x: 0, y: 0, active: false },
    time: 0
  };

  /* ---- Utils ---- */
  A.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  A.lerp = function (a, b, t) { return a + (b - a) * t; };
  A.map = function (v, a, b, c, d) { return c + (d - c) * A.clamp((v - a) / (b - a), 0, 1); };
  A.ease = {
    outCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
    outExpo: function (t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); },
    inOut: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  };
  // Lissage indépendant du framerate
  A.damp = function (a, b, lambda, dt) { return A.lerp(a, b, 1 - Math.exp(-lambda * dt)); };

  /* Ressort amorti : retour élastique très doux (boutons, curseur aimanté, cartes) */
  A.Spring = function (opts) {
    opts = opts || {};
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.tx = 0; this.ty = 0;
    this.stiffness = opts.stiffness || 120;
    this.damping = opts.damping || 16;
  };
  A.Spring.prototype.set = function (x, y) { this.tx = x; this.ty = y; };
  A.Spring.prototype.update = function (dt) {
    dt = Math.min(dt, 1 / 30);
    var ax = (this.tx - this.x) * this.stiffness - this.vx * this.damping;
    var ay = (this.ty - this.y) * this.stiffness - this.vy * this.damping;
    this.vx += ax * dt; this.vy += ay * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    return Math.abs(this.x - this.tx) > 0.01 || Math.abs(this.y - this.ty) > 0.01 || Math.abs(this.vx) > 0.01 || Math.abs(this.vy) > 0.01;
  };

  /* ---- Bus d'événements ---- */
  A.on = function (name, fn) { (A.events[name] = A.events[name] || []).push(fn); };
  A.emit = function (name, data) {
    var list = A.events[name]; if (!list) return;
    for (var i = 0; i < list.length; i++) list[i](data);
  };

  /* ---- Split de texte en mots (titres, manifeste) ---- */
  A.splitWords = function (el, cls, inner) {
    if (el.dataset.splitDone) return el.querySelectorAll('.' + cls);
    var nodes = Array.prototype.slice.call(el.childNodes);
    var idx = 0;
    el.textContent = '';
    nodes.forEach(function (node) {
      if (node.nodeType === 3) {
        wrapText(node.textContent, el);
      } else if (node.nodeType === 1) {
        var clone = node.cloneNode(false);
        wrapText(node.textContent, clone);
        el.appendChild(clone);
      }
    });
    function wrapText(text, parent) {
      var words = text.split(/(\s+)/);
      words.forEach(function (w) {
        if (!w) return;
        if (/^\s+$/.test(w)) { parent.appendChild(document.createTextNode(' ')); return; }
        var outer = document.createElement('span');
        outer.className = cls;
        outer.style.setProperty('--i', idx++);
        if (inner) {
          var s = document.createElement('span');
          s.textContent = w;
          outer.appendChild(s);
        } else {
          outer.textContent = w;
        }
        parent.appendChild(outer);
      });
    }
    el.dataset.splitDone = '1';
    return el.querySelectorAll('.' + cls);
  };

  /* ---- Mesures (au resize seulement) ---- */
  A.measure = function () {
    A.vw = window.innerWidth; A.vh = window.innerHeight;
    A.narrow = A.vw < 900;
    var doc = document.documentElement;
    A.scroll.max = Math.max(1, doc.scrollHeight - A.vh);
    A.emit('measure');
  };

  /* ---- Entrées ---- */
  function onPointer(x, y) {
    var p = A.pointer;
    p.x = x; p.y = y;
    p.nx = (x / A.vw) * 2 - 1;
    p.ny = -((y / A.vh) * 2 - 1);
    p.active = true;
  }
  window.addEventListener('mousemove', function (e) { onPointer(e.clientX, e.clientY); }, { passive: true });
  window.addEventListener('touchmove', function (e) { var t = e.touches[0]; if (t) onPointer(t.clientX, t.clientY); }, { passive: true });
  window.addEventListener('touchstart', function (e) { var t = e.touches[0]; if (t) onPointer(t.clientX, t.clientY); }, { passive: true });
  window.addEventListener('mousedown', function () { A.pointer.down = true; });
  window.addEventListener('mouseup', function () { A.pointer.down = false; });
  document.addEventListener('mouseleave', function () { A.pointer.active = false; });

  window.addEventListener('scroll', function () {
    var y = window.scrollY || 0;
    A.scroll.dir = y > A.scroll.y ? 1 : y < A.scroll.y ? -1 : A.scroll.dir;
    A.scroll.y = y;
  }, { passive: true });

  var rT;
  window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(A.measure, 120); });
  if ('ResizeObserver' in window) {
    new ResizeObserver(function () { clearTimeout(rT); rT = setTimeout(A.measure, 120); }).observe(document.body);
  }

  /* Gyroscope : uniquement sur écran tactile, et seulement si le navigateur l'autorise */
  if (coarse && window.DeviceOrientationEvent && !reduced) {
    var attach = function () {
      window.addEventListener('deviceorientation', function (e) {
        if (e.gamma == null || e.beta == null) return;
        A.tilt.x = A.clamp(e.gamma / 30, -1, 1);
        A.tilt.y = A.clamp((e.beta - 45) / 30, -1, 1);
        A.tilt.active = true;
      }, { passive: true });
    };
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      var ask = function () {
        DeviceOrientationEvent.requestPermission().then(function (s) { if (s === 'granted') attach(); }).catch(function () {});
        window.removeEventListener('touchend', ask);
      };
      window.addEventListener('touchend', ask, { passive: true });
    } else {
      attach();
    }
  }

  /* ---- Boucle ---- */
  var last = performance.now();
  var hidden = false;
  document.addEventListener('visibilitychange', function () { hidden = document.hidden; if (!hidden) { last = performance.now(); requestAnimationFrame(tick); } });

  function tick(now) {
    if (hidden) return;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    A.time += dt;

    var p = A.pointer, s = A.scroll;
    // Le pointeur est suivi avec un léger retard : le site respire, il ne saute pas.
    p.sx = A.damp(p.sx, p.x, 9, dt);
    p.sy = A.damp(p.sy, p.y, 9, dt);
    // Sur mobile sans souris, le gyroscope remplace le pointeur.
    var tnx = p.active ? p.nx : (A.tilt.active ? A.tilt.x : 0);
    var tny = p.active ? p.ny : (A.tilt.active ? -A.tilt.y : 0);
    p.snx = A.damp(p.snx, tnx, 4, dt);
    p.sny = A.damp(p.sny, tny, 4, dt);

    s.sy = A.damp(s.sy, s.y, 10, dt);
    if (Math.abs(s.sy - s.y) < 0.05) s.sy = s.y;
    s.progress = A.clamp(s.y / s.max, 0, 1);

    for (var i = 0; i < A.modules.length; i++) {
      var m = A.modules[i];
      if (m.enabled !== false) m.update(dt, now);
    }
    requestAnimationFrame(tick);
  }

  A.register = function (mod) { A.modules.push(mod); return mod; };
  A.start = function () {
    A.measure();
    last = performance.now();
    requestAnimationFrame(tick);
  };
})();
