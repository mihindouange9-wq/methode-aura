/* ==========================================================================
   Réalisations — chaque projet est un visuel pleine largeur en format écran.
   Imora Rituals joue sa vidéo de navigation quand elle est à l'écran et
   ouvre l'étude de cas plein écran (clip-path depuis le rectangle du visuel).
   Les autres projets ouvrent leur site dans un nouvel onglet.
   ========================================================================== */
(function () {
  'use strict';
  var A = window.AURA;
  var gsap = A.gsap, ST = A.ST;
  var html = document.documentElement;
  var card = document.getElementById('workCard');
  var open = document.getElementById('workOpen');
  var caseEl = document.getElementById('caseStudy');
  var closeBtn = document.getElementById('caseClose');
  var scroller = document.getElementById('caseScroll');
  var media = card ? card.querySelector('.work-media') : null;
  var video = media ? media.querySelector('video') : null;
  var caseVideo = document.getElementById('caseVideo');
  function play(v) { if (!v) return; var p; try { p = v.play(); } catch (e) { p = null; } if (p && p.catch) p.catch(function () {}); }
  var opened = false, lastFocus = null, animating = false;

  /* ---- La vidéo d'Imora Rituals joue quand elle est visible, s'arrête quand elle sort ---- */
  A.armWorks = function () {
    if (!card || !video) return;
    ST.create({ trigger: card, start: 'top 90%', end: 'bottom 10%', onToggle: function (self) { if (self.isActive) play(video); else video.pause(); } });
    if (A.liquidSupported && A.liquidSupported() && A.liquid) {
      A.liquid(media, video, { pointerTarget: card, focal: [0.5, 0], dpr: 1.25, flowSize: 160, via2d: true, radius: 0.22, dissipate: 0.955, strength: 1.1, amount: 0.07, chroma: 0.016, ripple: 0.004 });
    }
  };

  /* ---- Étude de cas ---- */
  function rect() {
    var r = (media || card).getBoundingClientRect();
    return 'inset(' + Math.max(0, r.top) + 'px ' + Math.max(0, A.vw - r.right) + 'px ' + Math.max(0, A.vh - r.bottom) + 'px ' + Math.max(0, r.left) + 'px round 4px)';
  }
  function openCase() {
    if (opened || animating || !caseEl) return;
    opened = true; animating = true;
    lastFocus = document.activeElement;
    caseEl.setAttribute('aria-hidden', 'false');
    html.classList.add('case-open');
    A.lock(true);
    scroller.scrollTop = 0;
    var items = caseEl.querySelectorAll('.case-hero > *, .case-screen, .case-copy > *, .case-item, .case-foot > *');
    if (caseVideo && !caseVideo.dataset.liquid && A.liquidSupported && A.liquidSupported() && A.liquid) {
      caseVideo.dataset.liquid = '1';
      A.liquid(caseVideo.parentNode, caseVideo, { pointerTarget: caseEl, focal: [0.5, 0], dpr: 1.25, flowSize: 160, via2d: true, radius: 0.24, dissipate: 0.955, strength: 1.1, amount: 0.07, chroma: 0.016, ripple: 0.004 });
    }
    if (A.reduced) { caseEl.classList.add('is-open'); animating = false; caseEl.focus(); play(caseVideo); return; }
    gsap.set(caseEl, { clipPath: rect(), visibility: 'visible' });
    gsap.set(items, { y: 40, opacity: 0 });
    caseEl.classList.add('is-open');
    play(caseVideo);
    var tl = gsap.timeline();
    tl.to(caseEl, { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 1.1, ease: 'power4.inOut', onComplete: function () { animating = false; caseEl.focus(); } }, 0)
      .to(items, { y: 0, opacity: 1, duration: 1.2, ease: A.EASE, stagger: 0.05 }, 0.55);
  }
  function closeCase() {
    if (!opened || animating) return;
    animating = true;
    var done = function () {
      opened = false; animating = false;
      caseEl.classList.remove('is-open');
      if (caseVideo) caseVideo.pause();
      caseEl.setAttribute('aria-hidden', 'true');
      html.classList.remove('case-open');
      A.lock(false);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
    if (A.reduced) { done(); return; }
    gsap.killTweensOf(caseEl);
    gsap.to(caseEl, { clipPath: rect(), duration: 0.9, ease: 'power4.inOut', onComplete: function () { gsap.set(caseEl, { clearProps: 'clipPath,visibility' }); done(); } });
  }
  if (open) open.addEventListener('click', function (e) { e.preventDefault(); openCase(); });
  if (closeBtn) closeBtn.addEventListener('click', closeCase);
  var cta = document.getElementById('caseCta');
  if (cta) cta.addEventListener('click', function (e) { e.preventDefault(); closeCase(); setTimeout(function () { A.scrollTo(document.getElementById('contact')); }, 700); });
  document.addEventListener('keydown', function (e) {
    if (!opened) return;
    if (e.key === 'Escape') { e.preventDefault(); closeCase(); }
    else if (e.key === 'Tab') {
      var f = caseEl.querySelectorAll('button, a[href]');
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
})();
