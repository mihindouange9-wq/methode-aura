/* ==========================================================================
   Expertises — section épinglée sur ordinateur : le défilement fait avancer
   l'index actif (titre allumé, panneau changé, barre de progression).
   Survol ou focus clavier = aperçu, sans casser la progression.
   Téléphone et tablette : pas d'épinglage, une liste-accordéon.
   Le mode suit la largeur en direct (rotation d'une tablette, fenêtre
   redimensionnée) : chaque mode se désarme proprement avant l'autre.
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
  var panelsWrap = document.getElementById('svcPanels');
  var progress = document.getElementById('svcProgress');
  var N = items.length, active = 0, locked = false;
  var mq = window.matchMedia('(max-width:900px)');
  var mode = null;

  panels.forEach(function (p, k) { if (!p.id) p.id = 'svcPanel' + (k + 1); });

  function setActive(i, fromHover) {
    i = Math.max(0, Math.min(N - 1, i));
    if (i === active && !fromHover) return;
    active = i;
    items.forEach(function (el, k) { el.classList.toggle('is-active', k === i); el.classList.toggle('is-past', k < i); });
    panels.forEach(function (p, k) { p.classList.toggle('is-active', k === i); });
    stage.dataset.active = String(i);
    if (progress) progress.style.setProperty('--p', ((i + 1) / N).toFixed(3));
  }
  setActive(0, true);

  /* ---------- Ordinateur : épinglage et défilement ---------- */
  var desk = { st: null, handlers: [] };
  function armDesktop() {
    locked = false;
    setActive(0, true);
    if (A.reduced) {
      // Mouvement réduit : l'élément le plus proche du centre est actif
      items.forEach(function (el, k) {
        desk.handlers.push({ st: ST.create({ trigger: el, start: 'top 60%', end: 'bottom 60%', onToggle: function (self) { if (self.isActive) setActive(k); } }) });
      });
    } else {
      desk.st = ST.create({
        trigger: section, start: 'top top', end: '+=' + (window.innerHeight * 0.9 * N), pin: stage, pinSpacing: true, scrub: true,
        onUpdate: function (self) {
          if (locked) return;
          setActive(Math.min(N - 1, Math.floor(self.progress * N + 0.0001)));
        }
      });
    }
    // Survol ou focus clavier : aperçu du panneau, sans casser la progression
    items.forEach(function (el, k) {
      var a = el.querySelector('a');
      var on = function () { locked = true; setActive(k, true); };
      var off = function () { locked = false; };
      var click = function (e) { e.preventDefault(); };
      el.addEventListener('mouseenter', on); el.addEventListener('mouseleave', off);
      a.addEventListener('focus', on); a.addEventListener('blur', off);
      a.addEventListener('click', click);
      a.setAttribute('aria-controls', panels[k].id);
      desk.handlers.push({ el: el, a: a, on: on, off: off, click: click });
    });
  }
  function disarmDesktop() {
    if (desk.st) { desk.st.kill(true); desk.st = null; }
    desk.handlers.forEach(function (h) {
      if (h.st) { h.st.kill(); return; }
      h.el.removeEventListener('mouseenter', h.on); h.el.removeEventListener('mouseleave', h.off);
      h.a.removeEventListener('focus', h.on); h.a.removeEventListener('blur', h.off);
      h.a.removeEventListener('click', h.click);
      h.a.removeAttribute('aria-controls');
    });
    desk.handlers = [];
    locked = false;
    gsap.set(stage, { clearProps: 'all' });
  }

  /* ---------- Téléphone et tablette : accordéon ---------- */
  var acc = { handlers: [], st: null, open: 0 };
  function setOpen(k) {
    acc.open = k;
    items.forEach(function (el, i) {
      el.classList.toggle('is-active', i === k); el.classList.remove('is-past');
      el.querySelector('a').setAttribute('aria-expanded', i === k ? 'true' : 'false');
    });
    panels.forEach(function (p, i) { p.classList.toggle('is-active', i === k); });
    stage.dataset.active = String(k < 0 ? 0 : k);
  }
  function armAccordion() {
    stage.classList.add('is-accordion');
    panels.forEach(function (p, k) { if (items[k]) items[k].appendChild(p); });
    items.forEach(function (el, k) {
      var a = el.querySelector('a');
      a.setAttribute('aria-controls', panels[k].id);
      var click = function (e) {
        e.preventDefault();
        setOpen(acc.open === k ? -1 : k);
        // Le titre ouvert reste visible sous la navigation
        if (acc.open === k) {
          var r = el.getBoundingClientRect();
          if (r.top < 72) A.scrollTo(el, { offset: -84, duration: 0.9 });
        }
      };
      a.addEventListener('click', click);
      acc.handlers.push({ a: a, click: click });
    });
    setOpen(0);
    if (!A.reduced) {
      acc.st = gsap.fromTo(items, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: A.EASE, stagger: 0.08, scrollTrigger: { trigger: stage.querySelector('.services-list'), start: 'top 85%', once: true } });
    }
  }
  function disarmAccordion() {
    if (acc.st) { if (acc.st.scrollTrigger) acc.st.scrollTrigger.kill(); acc.st.kill(); acc.st = null; }
    acc.handlers.forEach(function (h) { h.a.removeEventListener('click', h.click); h.a.removeAttribute('aria-expanded'); h.a.removeAttribute('aria-controls'); });
    acc.handlers = [];
    gsap.set(items, { clearProps: 'all' });
    if (panelsWrap) panels.forEach(function (p) { panelsWrap.appendChild(p); });
    stage.classList.remove('is-accordion');
  }

  /* ---------- Bascule selon la largeur ---------- */
  function apply() {
    var next = mq.matches ? 'accordion' : 'desktop';
    if (next === mode) return;
    if (mode === 'desktop') disarmDesktop();
    if (mode === 'accordion') disarmAccordion();
    mode = next;
    if (mode === 'accordion') armAccordion(); else armDesktop();
    ST.refresh();
  }

  A.armServices = function () {
    apply();
    var onChange = function () { apply(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else mq.addListener(onChange);
  };
})();
