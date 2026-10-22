/* ==========================================================================
   Navigation — empilée à droite, lien actif en violet, se retire en descente
   rapide et revient en remontée. Menu mobile plein écran.
   ========================================================================== */
(function () {
  'use strict';
  var A = window.AURA;
  var gsap = A.gsap, ST = A.ST;
  var nav = document.getElementById('nav');
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('mobileMenu');
  var close = document.getElementById('mobileClose');
  var html = document.documentElement;
  if (!nav) return;
  var links = Array.prototype.slice.call(nav.querySelectorAll('[data-nav]'));

  A.armNav = function () {
    // Lien actif : la section qui occupe le milieu de l'écran
    links.forEach(function (a) {
      var el = document.getElementById(a.dataset.nav);
      if (!el) return;
      ST.create({ trigger: el, start: 'top 45%', end: 'bottom 45%', onToggle: function (self) { a.classList.toggle('is-active', self.isActive); } });
    });
    // Se retire en descente, revient en remontée
    var hidden = false;
    ST.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        var y = self.scroll();
        nav.classList.toggle('is-scrolled', y > 40);
        var down = self.direction === 1;
        if (y > 500 && down && !hidden && !html.classList.contains('menu-open')) { hidden = true; nav.classList.add('is-hidden'); }
        else if ((!down || y < 500) && hidden) { hidden = false; nav.classList.remove('is-hidden'); }
      }
    });
    // Entrée de la navigation après l'intro
    A.on('intro:done', function () {
      if (A.reduced) { nav.classList.add('is-in'); return; }
      nav.classList.add('is-in');
      gsap.fromTo(nav.querySelectorAll('.nav-logo, .nav-tag, .nav-list > a, .nav-toggle'), { y: -14, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: A.EASE, stagger: 0.06, delay: 0.2, clearProps: 'transform' });
    });
  };

  /* Menu mobile */
  function open() {
    menu.classList.add('is-open'); menu.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    html.classList.add('menu-open'); A.lock(true);
    setTimeout(function () { var f = menu.querySelector('a'); if (f) f.focus(); }, 400);
  }
  function shut() {
    menu.classList.remove('is-open'); menu.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    html.classList.remove('menu-open'); A.lock(false);
    toggle.focus();
  }
  if (toggle && menu) {
    toggle.addEventListener('click', open);
    close.addEventListener('click', shut);
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { shut(); toggle.blur(); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('is-open')) shut(); });
  }
})();
