/* Classes posées avant le premier rendu : pas de flash entre le préchargeur et le hero.
   Chargé de façon bloquante dans <head>, volontairement minuscule. */
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
})();
