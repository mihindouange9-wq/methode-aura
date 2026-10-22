/* ==========================================================================
   AURA app — le socle de l'expérience.
   Lenis (défilement à inertie) + GSAP ScrollTrigger, helpers de découpe
   typographique, révélations génériques (data-anim), parallaxe (data-parallax),
   bascule clair/sombre de la trame, marbre qui s'éloigne puis revient.
   Le reste des modules s'appuie sur A.gsap / A.ST / A.lenis / A.split.
   ========================================================================== */
(function () {
  'use strict';
  var A = window.AURA;
  var html = document.documentElement;
  var gsap = window.gsap, ST = window.ScrollTrigger;
  if (!gsap || !ST) { html.classList.remove('is-loading'); return; }
  gsap.registerPlugin(ST);
  A.gsap = gsap; A.ST = ST;
  A.EASE = 'expo.out';
  A.EASE_IO = 'power3.inOut';

  /* ---- Lenis : défilement lissé (desktop), natif sur tactile ---- */
  var lenis = null;
  if (window.Lenis && !A.reduced) {
    lenis = new window.Lenis({ lerp: A.fine ? 0.085 : 0.12, wheelMultiplier: 1, smoothWheel: true, syncTouch: false });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  A.lenis = lenis;
  A.scrollTo = function (target, opts) {
    opts = opts || {};
    if (lenis) lenis.scrollTo(target, { offset: opts.offset || 0, duration: opts.duration || 1.4, easing: function (t) { return 1 - Math.pow(1 - t, 4); }, lock: false });
    else {
      var y = typeof target === 'number' ? target : (target.getBoundingClientRect().top + window.scrollY + (opts.offset || 0));
      window.scrollTo({ top: y, behavior: A.reduced ? 'auto' : 'smooth' });
    }
  };
  A.lock = function (on) { if (lenis) { on ? lenis.stop() : lenis.start(); } html.classList.toggle('is-locked', !!on); };

  /* Ancres : tous les liens internes passent par le défilement lissé */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    if (a.hasAttribute('data-no-scroll')) return;
    e.preventDefault();
    A.scrollTo(el, { offset: 0 });
  });

  /* ---- Découpe typographique : mots ou lignes dans des fenêtres masquées ---- */
  // Découpe un élément en mots : <span class="w"><i>mot</i></span>. Conserve les <em>/<strong> (classe reportée).
  A.splitWords = function (el) {
    if (el.dataset.splitDone) return el.querySelectorAll('.w > i');
    var frag = document.createDocumentFragment();
    function walk(node, parent, extra) {
      Array.prototype.forEach.call(node.childNodes, function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/);
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { parent.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w' + (extra ? ' ' + extra : '');
            var i = document.createElement('i'); i.textContent = p; w.appendChild(i);
            parent.appendChild(w);
          });
        } else if (n.nodeType === 1) {
          if (n.tagName === 'BR') { parent.appendChild(document.createElement('br')); return; }
          var cls = (extra ? extra + ' ' : '') + (n.tagName === 'EM' || n.tagName === 'STRONG' ? 'w-em' : '');
          walk(n, parent, cls.trim());
        }
      });
    }
    walk(el, frag, '');
    el.textContent = '';
    el.appendChild(frag);
    el.dataset.splitDone = '1';
    return el.querySelectorAll('.w > i');
  };

  /* ---- Révélations : un seul geste, sobre ----
     Tout élément [data-anim] monte légèrement et apparaît quand il entre
     dans l'écran. data-anim-delay (secondes), data-anim-start (ScrollTrigger start) */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('[data-anim]'));
  var revealed = new Set();
  function prepare(el) {
    if (A.reduced) { el.classList.add('is-in'); return; }
    gsap.set(el, { y: 24, opacity: 0 });
    el.classList.add('is-ready');
  }
  function play(el) {
    if (revealed.has(el)) return; revealed.add(el);
    var delay = parseFloat(el.dataset.animDelay) || 0;
    el.classList.add('is-in');
    if (A.reduced) return;
    gsap.to(el, { y: 0, opacity: 1, duration: 1, ease: A.EASE, delay: delay, overwrite: true });
  }
  A.playReveal = play;
  revealEls.forEach(prepare);
  A.armReveals = function () {
    revealEls.forEach(function (el) {
      if (el.closest('.hero') || el.closest('.case')) return; // le hero et l'étude de cas sont pilotés par leurs modules
      ST.create({ trigger: el, start: el.dataset.animStart || 'top 88%', once: true, onEnter: function () { play(el); } });
    });
  };

  /* ---- Parallaxe : data-parallax="0.2" déplace l'élément de 20 % de la hauteur d'écran sur sa traversée ---- */
  A.armParallax = function () {
    if (A.reduced) return;
    document.querySelectorAll('[data-parallax]').forEach(function (el) {
      var k = parseFloat(el.dataset.parallax) || 0.15;
      if (A.narrow) k *= 0.5;
      gsap.fromTo(el, { y: -k * A.vh * 0.5 }, { y: k * A.vh * 0.5, ease: 'none', scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  };

  /* ---- Feuilles claires : la trame et le curseur s'assombrissent ---- */
  A.armLight = function () {
    document.querySelectorAll('.s-light').forEach(function (s) {
      ST.create({ trigger: s, start: 'top 60px', end: 'bottom 60px', onToggle: function (self) { html.classList.toggle('on-light', self.isActive); } });
    });
  };

  /* ---- Le marbre : pleine présence sur le hero, s'éloigne dans le contenu, revient au pied de page ---- */
  A.armMarble = function () {
    var marble = document.getElementById('marble');
    var hero = document.getElementById('top');
    var footer = document.getElementById('footer');
    if (!marble || !hero) return;
    var video = marble.querySelector('.marble-video');
    marble.style.setProperty('--dim', '0');
    // Une seule source de vérité : le voile dépend de la position dans le hero (0 → 1) et de l'arrivée du pied de page (1 → 0.15)
    var last = -1;
    function update() {
      var y = window.scrollY || 0, vh = window.innerHeight;
      var heroH = hero.offsetHeight || vh;
      var p1 = Math.max(0, Math.min(1, y / (heroH * 0.6)));
      var dim = p1;
      if (footer) {
        var ft = footer.getBoundingClientRect().top + y;
        var p2 = Math.max(0, Math.min(1, (y + vh - ft) / (vh * 0.7)));
        dim = p1 * (1 - 0.85 * p2);
      }
      if (Math.abs(dim - last) > 0.002) { last = dim; marble.style.setProperty('--dim', dim.toFixed(3)); }
    }
    ST.create({ start: 0, end: 'max', onUpdate: update, onRefresh: update });
    update();
    if (video && !A.reduced) {
      gsap.fromTo(video, { '--vs': 1 }, { '--vs': 1.08, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 } });
    }
  };


  /* ---- Mesures ---- */
  A.refresh = function () { A.measure(); ST.refresh(); };
  var rT;
  window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(function () { A.narrow = window.innerWidth < 900; ST.refresh(); }, 160); });
})();
