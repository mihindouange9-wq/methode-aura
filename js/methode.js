/* ==========================================================================
   La méthode — une liste éditoriale verticale, à toutes les largeurs : le
   temps qui passe sous le milieu de l'écran s'allume, les autres respirent.
   ========================================================================== */
(function () {
  'use strict';
  var A = window.AURA;
  var gsap = A.gsap, ST = A.ST;
  var track = document.getElementById('methodeTrack');
  if (!track) return;
  var steps = Array.prototype.slice.call(track.querySelectorAll('.step'));

  function setActive(i) {
    steps.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
  }
  setActive(0);

  A.armMethode = function () {
    steps.forEach(function (s, k) {
      ST.create({ trigger: s, start: 'top 62%', end: 'bottom 62%', onToggle: function (self) { if (self.isActive) setActive(k); } });
      if (!A.reduced) gsap.fromTo(s, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: A.EASE, scrollTrigger: { trigger: s, start: 'top 90%', once: true } });
    });
  };
})();
