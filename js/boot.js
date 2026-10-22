/* ==========================================================================
   Démarrage — ordre : boucle et mesures, armement des modules, ScrollTrigger
   rafraîchi quand les polices et images arrivent, puis le préchargeur.
   ========================================================================== */
(function () {
  'use strict';
  var A = window.AURA;

  function arm() {
    ['armNav', 'armHero', 'armServices', 'armMethode', 'armWorks', 'armManifesto', 'armContact', 'armReveals', 'armParallax', 'armLight', 'armMarble'].forEach(function (k) {
      if (typeof A[k] === 'function') { try { A[k](); } catch (e) { /* un module en échec n'empêche pas les autres */ } }
    });
  }

  function boot() {
    A.start();
    if (!A.gsap) { document.documentElement.classList.remove('is-loading'); return; }
    arm();
    A.ST.refresh();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { A.ST.refresh(); });
    window.addEventListener('load', function () { A.ST.refresh(); setTimeout(function () { A.ST.refresh(); }, 800); });
    A.on('intro:done', function () { A.ST.refresh(); });
    // Images différées : on remesure quand elles arrivent
    var pending;
    document.querySelectorAll('img[loading="lazy"]').forEach(function (im) { im.addEventListener('load', function () { clearTimeout(pending); pending = setTimeout(function () { A.ST.refresh(); }, 120); }); });
    A.playIntro();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
