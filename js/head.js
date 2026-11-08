/* Classes posées avant le premier rendu : pas de flash entre l'ouverture et le hero.
   Chargé de façon bloquante dans <head>, volontairement minuscule.
   L'ouverture (logo tracé puis rempli) est animée en CSS : elle démarre dès que la
   page et les styles sont là, sans attendre les scripts. Si ceux-ci n'arrivent jamais,
   l'ouverture est levée après dix secondes. */
(function () {
  var h = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seen = false;
  try { seen = sessionStorage.getItem('aura-intro') === '1'; } catch (e) {}
  if (/nointro/.test(location.search)) seen = true;
  if (/reduced/.test(location.search)) reduced = true;
  h.classList.add('js');
  h.classList.add(seen ? 'intro-short' : 'intro-full');
  if (!reduced) h.classList.add('is-loading');
  if (reduced) h.classList.add('reduced-motion');
  h.dataset.t0 = String(Math.round(performance.now()));
  setTimeout(function () {
    if (window.AURA && window.AURA.introStarted) return;
    h.classList.remove('is-loading');
    h.classList.add('intro-failed');
  }, 10000);
})();
