/* ==========================================================================
   Univers — la scène est épinglée ; le défilement fait passer d'un univers au
   suivant : le nom et sa phrase se brisent en éclats (triangles découpés par
   clip-path) qui s'envolent depuis le centre, pendant que les éclats du
   suivant convergent et se recomposent. Piloté par la position de défilement,
   donc réversible. Deux emplacements (courant, suivant) suffisent : leur texte
   change quand on franchit un univers.
   Mouvement réduit ou sans scripts : la liste verticale d'origine.
   ========================================================================== */
(function () {
  'use strict';
  var A = window.AURA;
  var gsap = A.gsap, ST = A.ST;
  var section = document.getElementById('univers');
  var stage = document.getElementById('universStage');
  var field = document.getElementById('universField');
  var list = section ? section.querySelector('.univers-list') : null;
  if (!section || !stage || !field || !list) return;

  var items = Array.prototype.slice.call(list.querySelectorAll('.uni')).map(function (li) {
    return { name: (li.querySelector('.uni-name') || li).textContent.trim(), tag: (li.querySelector('.uni-tag') || {}).textContent || '' };
  });
  var N = items.length;
  if (N < 2) return;
  var STEP = 0.8, HOLD = 0.35;
  function smooth(t) { t = A.clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  /* ---- Découpe : une grille de points légèrement déplacés, deux triangles par case ---- */
  function rnd(seed) { var x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
  function buildShards(cols, rows) {
    var pts = [];
    for (var r = 0; r <= rows; r++) {
      pts[r] = [];
      for (var c = 0; c <= cols; c++) {
        var x = c / cols * 100, y = r / rows * 100;
        if (c > 0 && c < cols) x += (rnd(r * 31 + c * 7) - 0.5) * (100 / cols) * 0.6;
        if (r > 0 && r < rows) y += (rnd(r * 17 + c * 13 + 5) - 0.5) * (100 / rows) * 0.6;
        pts[r][c] = [x, y];
      }
    }
    var shards = [];
    for (var rr = 0; rr < rows; rr++) {
      for (var cc = 0; cc < cols; cc++) {
        var p00 = pts[rr][cc], p10 = pts[rr][cc + 1], p01 = pts[rr + 1][cc], p11 = pts[rr + 1][cc + 1];
        var tris = ((rr + cc) % 2) ? [[p00, p10, p11], [p00, p11, p01]] : [[p00, p10, p01], [p10, p11, p01]];
        tris.forEach(function (tri, k) {
          var cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
          var seed = rr * 97 + cc * 13 + k * 5;
          var ang = Math.atan2(cy - 50, (cx - 50) * 0.6) + (rnd(seed) - 0.5) * 1.2;
          var dist = 0.55 + rnd(seed + 1) * 0.75;
          shards.push({
            poly: 'polygon(' + tri.map(function (p) { return p[0].toFixed(2) + '% ' + p[1].toFixed(2) + '%'; }).join(',') + ')',
            dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist * 0.8 - 0.12,
            rot: (rnd(seed + 2) - 0.5) * 70,
            delay: A.clamp(Math.hypot((cx - 50) / 50, (cy - 50) / 50) * 0.22 + rnd(seed + 3) * 0.1, 0, 0.3)
          });
        });
      }
    }
    return shards;
  }

  var slots = [], ghost = null, shardDefs = [], W = 1, H = 1, built = false;
  function makeInner(it) {
    var d = document.createElement('div'); d.className = 'uv-in';
    var n = document.createElement('span'); n.className = 'uv-name'; n.textContent = it.name;
    var t = document.createElement('span'); t.className = 'uv-tag'; t.textContent = it.tag;
    d.appendChild(n); d.appendChild(t);
    return d;
  }
  function build() {
    if (built) return; built = true;
    shardDefs = buildShards(A.narrow ? 4 : 6, A.narrow ? 4 : 3);
    // Fantôme : donne sa hauteur au champ (le plus long des univers)
    ghost = document.createElement('div'); ghost.className = 'uv-ghost';
    items.forEach(function (it) { var g = makeInner(it); g.className += ' uv-ghost-item'; ghost.appendChild(g); });
    field.appendChild(ghost);
    for (var s = 0; s < 2; s++) {
      var slot = document.createElement('div'); slot.className = 'uv-slot';
      var shards = shardDefs.map(function (def) {
        var sh = document.createElement('div'); sh.className = 'uv-shard'; sh.style.clipPath = def.poly;
        sh.appendChild(makeInner(items[0])); slot.appendChild(sh); return sh;
      });
      field.appendChild(slot);
      slots.push({ el: slot, shards: shards, item: -1, whole: null });
    }
  }
  function setSlot(s, k) {
    var slot = slots[s]; if (slot.item === k) return; slot.item = k;
    slot.shards.forEach(function (sh) {
      var inn = sh.firstChild; inn.firstChild.textContent = items[k].name; inn.lastChild.textContent = items[k].tag;
    });
  }
  function measure() { var r = field.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); }

  /* ---- Rendu : t = 0 → emplacement A entier, B dispersé ; t = 1 → A dispersé, B entier ---- */
  var lastKey = '';
  function place(slot, t, out) {
    var i, sh, def, k, tr, op;
    // Texte entier : une seule copie non découpée (pas de coutures entre les éclats), les autres éteintes
    var whole = out ? t <= 0 : t >= 1;
    if (whole !== slot.whole) {
      slot.whole = whole;
      for (i = 0; i < slot.shards.length; i++) {
        slot.shards[i].style.clipPath = whole ? (i === 0 ? 'none' : shardDefs[i].poly) : shardDefs[i].poly;
        slot.shards[i].style.visibility = whole && i > 0 ? 'hidden' : '';
      }
    }
    for (i = 0; i < slot.shards.length; i++) {
      sh = slot.shards[i]; def = shardDefs[i];
      // k : 0 = éclat en place, 1 = éclat parti. Le courant part du centre vers les bords (délai croissant),
      // le suivant converge dans le même ordre, un peu après, et est entier exactement à t = 1.
      k = out ? smooth((t - def.delay) / 0.6) : 1 - smooth((t - 0.1 - def.delay) / 0.6);
      if (k <= 0) { tr = 'none'; op = '1'; }
      else {
        tr = 'translate3d(' + (def.dx * k * W * 0.4).toFixed(1) + 'px,' + (def.dy * k * H * 1.1).toFixed(1) + 'px,0) rotate(' + (def.rot * k).toFixed(2) + 'deg) scale(' + (1 - 0.25 * k).toFixed(3) + ')';
        op = (1 - smooth(k * 1.15)).toFixed(3);
      }
      if (sh.style.transform !== tr) sh.style.transform = tr;
      if (sh.style.opacity !== op) sh.style.opacity = op;
    }
  }
  function render(pairI, t) {
    setSlot(0, pairI); setSlot(1, Math.min(N - 1, pairI + 1));
    var key = pairI + ':' + t.toFixed(3);
    if (key === lastKey) return; lastKey = key;
    place(slots[0], t, true);
    place(slots[1], t, false);
  }

  function setProgress(P) {
    var L = (N - 1) * STEP + HOLD;
    var f = A.clamp(P * L / STEP, 0, N - 1);
    var i = Math.max(0, Math.min(N - 2, Math.floor(f)));
    var local = f - i;
    var t = f >= N - 1 ? 1 : smooth((local - 0.1) / 0.8);
    render(i, t);
  }

  /* ---- Armement ---- */
  var pinST = null;
  A.armUnivers = function () {
    if (A.reduced) return;   // la liste d'origine, telle quelle
    build();
    section.classList.add('is-stage');
    measure();
    render(0, 0);
    pinST = ST.create({
      trigger: stage, start: 'top top',
      end: function () { return '+=' + Math.round(window.innerHeight * ((N - 1) * STEP + HOLD)); },
      pin: true, pinSpacing: true, scrub: true, invalidateOnRefresh: true,
      onUpdate: function (self) { setProgress(self.progress); },
      onRefresh: function () { measure(); lastKey = ''; setProgress(pinST ? pinST.progress : 0); }
    });
    // Entrée : le premier univers se recompose en arrivant à l'écran
    var intro = { t: 1 };
    ST.create({
      trigger: stage, start: 'top 70%', once: true,
      onEnter: function () {
        gsap.to(intro, { t: 0, duration: 1.6, ease: 'power3.out', onUpdate: function () { if (pinST && pinST.progress > 0) return; lastKey = ''; place(slots[0], intro.t, true); place(slots[1], 0, false); } });
      }
    });
    place(slots[0], 1, true);
  };
})();
