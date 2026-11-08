/* ==========================================================================
   Pied de page — révélé par-dessous : les liens et le mot MÉTHODE AURA montent,
   le mot suit le défilement en parallaxe.
   ========================================================================== */
(function () {
  'use strict';
  var A = window.AURA;
  var gsap = A.gsap, ST = A.ST;
  var footer = document.getElementById('footer');

  A.armContact = function () {
    if (A.reduced) return;
    if (footer) {
      var word = footer.querySelector('.footer-word');
      var lines = footer.querySelectorAll('.fw-line > i');
      gsap.set(lines, { yPercent: 60, opacity: 0 });
      gsap.to(lines, { yPercent: 0, opacity: 1, duration: 1.6, ease: A.EASE, stagger: 0.12, scrollTrigger: { trigger: footer, start: 'top 70%', once: true } });
      gsap.fromTo(footer.querySelectorAll('.footer-links li'), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: A.EASE, stagger: 0.07, scrollTrigger: { trigger: footer, start: 'top 75%', once: true } });
      if (word) gsap.fromTo(word, { y: 60 }, { y: -20, ease: 'none', scrollTrigger: { trigger: footer, start: 'top bottom', end: 'bottom bottom', scrub: true } });
    }
  };
})();
