/* ==========================================================================
   Préchargeur — les quatre lignes se placent en quinconce, puis tout
   glisse : le hero prend la place.
   Version complète une fois par session (≈ 2 s), version courte ensuite.
   Émet A.emit('intro:done') pour lancer le hero.
   ========================================================================== */
(function () {
  'use strict';
  var A = window.AURA;
  var html = document.documentElement;
  var loader = document.getElementById('loader');
  var gsap = A.gsap;

  function finish() {
    html.classList.remove('is-loading');
    if (loader) loader.remove();
    A.emit('intro:done');
  }

  A.playIntro = function () {
    if (!loader || !gsap || A.reduced || !html.classList.contains('is-loading')) { finish(); return; }
    try { sessionStorage.setItem('aura-intro', '1'); } catch (e) {}
    var full = html.classList.contains('intro-full');
    var words = loader.querySelectorAll('.lw > i');
    var note = loader.querySelector('.loader-note > i');

    var tl = gsap.timeline({ defaults: { ease: A.EASE } });
    if (full) {
      tl.fromTo(words, { yPercent: 110 }, { yPercent: 0, duration: 1.2, stagger: 0.1 }, 0.2)
        .fromTo(note, { yPercent: 110 }, { yPercent: 0, duration: 1 }, 0.7)
        .add('out', 1.7)
        .to(words, { yPercent: -110, duration: 0.8, ease: 'power3.in', stagger: 0.05 }, 'out')
        .to(note, { yPercent: -110, duration: 0.6, ease: 'power3.in' }, 'out')
        .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'power4.inOut', onStart: function () { A.emit('intro:leaving'); } }, 'out+0.3')
        .add(finish);
    } else {
      // Version courte : le rideau se lève
      gsap.set([words, note], { opacity: 0 });
      tl.to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'power4.inOut', onStart: function () { A.emit('intro:leaving'); } }, 0.1)
        .add(finish);
    }
  };
})();
