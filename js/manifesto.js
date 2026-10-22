/* ==========================================================================
   Manifeste — la feuille Ivoire se déploie en entrant (clip-path), puis les
   lignes se révèlent une à une au rythme du défilement : chaque ligne monte
   dans sa fenêtre, son mot clé passe au violet, la ligne précédente s'estompe.
   ========================================================================== */
(function () {
  'use strict';
  var A = window.AURA;
  var gsap = A.gsap, ST = A.ST;
  var section = document.getElementById('manifeste');
  var sheet = document.getElementById('manifestoSheet');
  var root = document.getElementById('manifesto');
  if (!section || !root) return;
  var lines = Array.prototype.slice.call(root.querySelectorAll('.m-line'));

  A.armManifesto = function () {
    if (A.reduced) { lines.forEach(function (l) { l.classList.add('is-lit'); }); root.classList.add('is-done'); return; }
    // La feuille se déploie
    gsap.fromTo(sheet, { clipPath: 'inset(4% 3% 0% 3% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: section, start: 'top 95%', end: 'top 15%', scrub: 0.5 } });
    // Les lignes montent dans leur fenêtre, en cascade avec le défilement
    lines.forEach(function (line, i) {
      var inner = line.querySelector('i');
      gsap.set(inner, { yPercent: 130 }); // au-delà de la fenêtre (marge basse comprise) : rien ne dépasse avant la révélation
      ST.create({
        trigger: line, start: 'top 82%', once: true,
        onEnter: function () {
          gsap.to(inner, { yPercent: 0, duration: 1.3, ease: A.EASE });
          line.classList.add('is-lit');
          if (i === lines.length - 1) root.classList.add('is-done');
        }
      });
    });
    // Lecture : la ligne sous le milieu de l'écran est « courante », les autres respirent
    lines.forEach(function (line) {
      ST.create({ trigger: line, start: 'top 58%', end: 'bottom 38%', onToggle: function (self) { line.classList.toggle('is-current', self.isActive); } });
    });
  };
})();
