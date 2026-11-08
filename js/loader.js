/* ==========================================================================
   Ouverture — le symbole MÉTHODE AURA se trace en lumière, se remplit, le
   mot-symbole monte dessous (tout cela en CSS, dès l'arrivée des styles),
   puis la caméra traverse le logo : il grandit vers le spectateur pendant
   que le noir se dissout sur le hero.
   La sortie attend la fin réelle de l'animation CSS du mot-symbole (API Web
   Animations), quel que soit le moment où les scripts sont arrivés.
   Version complète une fois par session, fondu court ensuite.
   Émet A.emit('intro:leaving') au départ de la sortie et A.emit('intro:done') à la fin.
   ========================================================================== */
(function () {
  'use strict';
  var A = window.AURA;
  var html = document.documentElement;
  var loader = document.getElementById('loader');
  var gsap = A.gsap;
  var HOLD = 2.8;   // durée totale de l'animation CSS (voir components.css), utilisée si l'API n'est pas disponible
  var PAUSE = 0.3;  // respiration sur le logo complet avant la sortie

  function finish() {
    html.classList.remove('is-loading');
    if (loader) loader.remove();
    A.emit('intro:done');
  }

  A.playIntro = function () {
    A.introStarted = true;
    if (!loader || !gsap || A.reduced || !html.classList.contains('is-loading')) { finish(); return; }
    try { sessionStorage.setItem('aura-intro', '1'); } catch (e) {}
    var full = html.classList.contains('intro-full');
    var ident = loader.querySelector('.ident');
    var glow = loader.querySelector('.ident-glow');
    var word = loader.querySelector('.iw-2 > i');

    function leave(wait) {
      var tl = gsap.timeline({ defaults: { ease: A.EASE } });
      tl.to(ident, { scale: 4.2, opacity: 0, duration: 1.15, ease: 'power3.in' }, wait)
        .to(glow, { opacity: 0, duration: 0.6, ease: 'power2.out' }, wait + 0.25)
        .to(loader, { opacity: 0, duration: 0.75, ease: 'power2.inOut', onStart: function () { A.emit('intro:leaving'); } }, wait + 0.5)
        .add(finish);
    }

    if (full && ident) {
      var anim = null;
      try {
        if (word && word.getAnimations) anim = word.getAnimations().filter(function (a) { return a.animationName === 'identRise'; })[0] || null;
      } catch (e) { anim = null; }
      if (anim && anim.finished) {
        var gone = false;
        var go = function () { if (gone) return; gone = true; leave(PAUSE); };
        anim.finished.then(go, go);
        setTimeout(go, (HOLD + 1.5) * 1000); // filet : l'animation ne se termine pas, on sort quand même
      } else {
        // Sans API : on estime le temps écoulé depuis la première passe de style
        var t0 = parseFloat(html.dataset.t0) || 0;
        var elapsed = Math.max(0, (performance.now() - t0) / 1000);
        leave(Math.max(0, Math.min(HOLD, HOLD - elapsed)) + PAUSE);
      }
    } else {
      if (ident) gsap.set(ident, { opacity: 0 });
      if (glow) gsap.set(glow, { opacity: 0 });
      var tl = gsap.timeline();
      tl.to(loader, { opacity: 0, duration: 0.6, ease: 'power2.inOut', onStart: function () { A.emit('intro:leaving'); } }, 0.05)
        .add(finish);
    }
  };
})();
