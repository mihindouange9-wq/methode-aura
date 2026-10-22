/* ==========================================================================
   Hero — les deux lignes géantes montent dans leur fenêtre. Au défilement,
   le titre s'éloigne (échelle, flou, opacité) et les couches suivent le
   pointeur à des profondeurs différentes.
   ========================================================================== */
(function () {
  'use strict';
  var A = window.AURA;
  var gsap = A.gsap;
  var hero = document.getElementById('top');
  var title = document.getElementById('heroTitle');
  if (!hero || !title) return;
  var lines = title.querySelectorAll('.ht-line > i');
  var intro = hero.querySelector('.hero-intro');
  var foot = hero.querySelector('.hero-foot');

  if (!A.reduced) {
    gsap.set(lines, { yPercent: 108 });
    gsap.set(foot, { opacity: 0, y: 12 });
  }

  function enter() {
    hero.classList.add('is-in');
    if (A.reduced) { A.playReveal(intro); return; }
    var tl = gsap.timeline({ defaults: { ease: A.EASE } });
    tl.to(lines, { yPercent: 0, duration: 1.6, stagger: 0.14 }, 0)
      .add(function () { A.playReveal(intro); }, 0.5)
      .to(foot, { opacity: 1, y: 0, duration: 1.2 }, 1.0);
  }
  A.on('intro:leaving', enter);

  A.armHero = function () {
    if (A.reduced) return;
    // Le titre s'éloigne pendant qu'on quitte le hero
    var inner = [title, intro];
    // Le flou n'est appliqué que sur ordinateur : sur écran tactile il coûte trop cher au rendu
    var away = { yPercent: -18, scale: 0.94, opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '78% top', scrub: 0.5 } };
    if (A.fine && !A.lowPower) away.filter = 'blur(8px)';
    gsap.to(title, away);
    gsap.to(intro, { y: -80, opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '60% top', scrub: 0.5 } });
    gsap.to(foot, { opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '30% top', scrub: true } });
    // Les couches suivent le pointeur (desktop)
    if (A.fine) {
      var qs = inner.map(function (el, i) {
        var d = [0.55, 0.3][i];
        return { x: gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3' }), y: gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3' }), d: d };
      });
      window.addEventListener('mousemove', function (e) {
        if (window.scrollY > A.vh) return;
        var nx = (e.clientX / A.vw) * 2 - 1, ny = (e.clientY / A.vh) * 2 - 1;
        qs.forEach(function (q) { q.x(nx * 26 * q.d); q.y(ny * 18 * q.d); });
      }, { passive: true });
    }
  };
})();
