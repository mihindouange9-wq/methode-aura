/* ==========================================================================
   Expertises — section épinglée. Le défilement fait avancer l'index actif :
   le numéro roule, le titre actif s'allume et se décale, le panneau change,
   la lumière de fond change de teinte, le texte circulaire tourne.
   Desktop : survol = aperçu. Mobile : pas d'épinglage, liste + panneaux.
   ========================================================================== */
(function () {
  'use strict';
  var A = window.AURA;
  var gsap = A.gsap, ST = A.ST;
  var section = document.getElementById('expertises');
  var stage = document.getElementById('servicesStage');
  if (!section || !stage) return;
  var items = Array.prototype.slice.call(stage.querySelectorAll('.svc'));
  var panels = Array.prototype.slice.call(stage.querySelectorAll('.svc-panel'));
  var digit = document.getElementById('svcDigit');
  var bg = document.getElementById('servicesBg');
  var ring = stage.querySelector('.services-ring');
  var progress = document.getElementById('svcProgress');
  var N = items.length, active = 0, locked = false;

  function setActive(i, fromHover) {
    i = Math.max(0, Math.min(N - 1, i));
    if (i === active && !fromHover) return;
    active = i;
    items.forEach(function (el, k) { el.classList.toggle('is-active', k === i); el.classList.toggle('is-past', k < i); });
    panels.forEach(function (p, k) { p.classList.toggle('is-active', k === i); });
    stage.dataset.active = String(i);
    if (digit && !A.reduced) gsap.to(digit, { yPercent: -100 * i / N * (N / N), y: 0, duration: 0.9, ease: A.EASE });
    if (digit && A.reduced) digit.style.transform = 'translateY(' + (-100 * i / N) + '%)';
    if (bg) bg.style.setProperty('--k', String(i));
    if (progress) progress.style.setProperty('--p', ((i + 1) / N).toFixed(3));
  }
  // Le numéro : une bande de cinq chiffres, décalée d'un cinquième par index
  if (digit) { digit.style.display = 'block'; }
  setActive(0, true);

  /* Téléphone et tablette : une liste-accordéon. Chaque panneau est déplacé sous son titre,
     le toucher ouvre ou ferme, le premier est ouvert d'entrée, les lignes se révèlent au défilement. */
  function armAccordion() {
    stage.classList.add('is-accordion');
    panels.forEach(function (p, k) { if (items[k]) items[k].appendChild(p); });
    var open = 0;
    function setOpen(k) {
      open = k;
      items.forEach(function (el, i) { el.classList.toggle('is-active', i === k); el.classList.remove('is-past'); });
      panels.forEach(function (p, i) { p.classList.toggle('is-active', i === k); });
      stage.dataset.active = String(k < 0 ? 0 : k);
    }
    setOpen(0);
    items.forEach(function (el, k) {
      el.querySelector('a').addEventListener('click', function (e) {
        e.preventDefault();
        setOpen(open === k ? -1 : k);
        // Le titre ouvert reste visible sous la navigation
        if (open === k) {
          var r = el.getBoundingClientRect();
          if (r.top < 72) A.scrollTo(el, { offset: -84, duration: 0.9 });
        }
      });
    });
    if (!A.reduced) {
      gsap.fromTo(items, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: A.EASE, stagger: 0.08, scrollTrigger: { trigger: stage.querySelector('.services-list'), start: 'top 85%', once: true } });
      if (ring) gsap.to(ring, { rotate: 360, duration: 80, ease: 'none', repeat: -1 });
    }
  }

  A.armServices = function () {
    if (A.narrow) { armAccordion(); return; }
    if (A.reduced) {
      // Mouvement réduit sur grand écran : l'élément le plus proche du centre est actif
      items.forEach(function (el, k) {
        ST.create({ trigger: el, start: 'top 60%', end: 'bottom 60%', onToggle: function (self) { if (self.isActive) setActive(k); } });
      });
      return;
    }
    var dist = A.vh * 0.9 * N;
    ST.create({
      trigger: section, start: 'top top', end: '+=' + dist, pin: stage, pinSpacing: true, scrub: true,
      onUpdate: function (self) {
        if (locked) return;
        var p = self.progress;
        var i = Math.min(N - 1, Math.floor(p * N + 0.0001));
        setActive(i);
      }
    });
    if (ring) gsap.to(ring, { rotate: 360, duration: 60, ease: 'none', repeat: -1 });
    // Survol : aperçu, sans casser la progression
    items.forEach(function (el, k) {
      el.addEventListener('mouseenter', function () { locked = true; setActive(k, true); });
      el.addEventListener('mouseleave', function () { locked = false; });
      el.querySelector('a').addEventListener('click', function (e) { e.preventDefault(); });
    });
  };
})();
