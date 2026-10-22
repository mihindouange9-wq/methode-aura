/* ==========================================================================
   Contact et pied de page — l'anneau s'incline vers le pointeur ; le pied de
   page est révélé par-dessous et le mot MÉTHODE AURA monte en parallaxe.
   ========================================================================== */
(function () {
  'use strict';
  var A = window.AURA;
  var gsap = A.gsap, ST = A.ST;
  var section = document.getElementById('contact');
  var ring = document.getElementById('ctaRing');
  var footer = document.getElementById('footer');

  A.armContact = function () {
    if (A.reduced) return;
    if (section && ring) {
      gsap.fromTo(ring, { opacity: 0, y: 120 }, { opacity: 1, y: 0, ease: 'none', scrollTrigger: { trigger: section, start: 'top 90%', end: 'top 20%', scrub: 0.5 } });
      gsap.to(ring, { '--rz': '360deg', duration: 90, ease: 'none', repeat: -1 });
      if (A.fine) {
        var rx = gsap.quickTo(ring, '--rx', { duration: 1.4, ease: 'power3' }), ry = gsap.quickTo(ring, '--ry', { duration: 1.4, ease: 'power3' });
        var ox = gsap.quickTo(ring, '--ox', { duration: 1.4, ease: 'power3' }), oy = gsap.quickTo(ring, '--oy', { duration: 1.4, ease: 'power3' });
        section.addEventListener('mousemove', function (e) {
          var nx = (e.clientX / A.vw) * 2 - 1, ny = (e.clientY / A.vh) * 2 - 1;
          rx(62 - ny * 12); ry(nx * 16); ox(nx * 26); oy(ny * 22);
        });
      }
    }
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
