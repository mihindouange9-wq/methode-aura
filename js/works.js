/* ==========================================================================
   Réalisations — le projecteur.
   Ordinateur : la scène est épinglée ; le défilement fait passer d'un projet au
   suivant. Dans le cadre, une toile WebGL fond le visuel courant dans le
   suivant (dissolution par bruit, déplacement, légère aberration chromatique),
   l'image se courbe avec la vitesse du défilement et ondule sous le pointeur ;
   le texte monte dans ses fenêtres. Sans WebGL : balayage et fondu en CSS.
   Téléphone et tablette : même scène, empilée (cadre puis texte), sans vidéo
   (l'affiche d'Imora Rituals sert de texture). Mouvement réduit : liste
   verticale, chaque projet révélé en entrant.
   Imora Rituals joue sa vidéo de navigation et ouvre l'étude de cas plein écran.
   ========================================================================== */
(function () {
  'use strict';
  var A = window.AURA;
  var gsap = A.gsap, ST = A.ST;
  var html = document.documentElement;
  var section = document.getElementById('realisations');
  var stage = document.getElementById('worksStage');
  var frame = document.getElementById('worksFrame');
  var list = document.getElementById('worksList');
  var counterNum = document.getElementById('worksNum');
  var counterLine = stage ? stage.querySelector('.wc-line') : null;
  var caseEl = document.getElementById('caseStudy');
  var closeBtn = document.getElementById('caseClose');
  var scroller = document.getElementById('caseScroll');
  var openLink = document.getElementById('workOpen');
  var caseVideo = document.getElementById('caseVideo');
  if (!section || !stage || !frame || !list) return;

  function play(v) { if (!v) return; var p; try { p = v.play(); } catch (e) { p = null; } if (p && p.catch) p.catch(function () {}); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function smooth(t) { t = A.clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  /* Chaque visuel existe en trois largeurs (800, 1600, 2560 px) : la scène charge la plus
     petite qui couvre la toile, pixel pour pixel. */
  function tiersOf(img) {
    var t = [], sm = img.getAttribute('data-sm'), full = img.getAttribute('data-full') || img.getAttribute('src'), hd = img.getAttribute('data-hd');
    if (sm) t.push({ w: 800, src: sm });
    if (full) t.push({ w: 1600, src: full });
    if (hd) t.push({ w: 2560, src: hd });
    return t;
  }
  var items = Array.prototype.slice.call(list.querySelectorAll('.work')).map(function (el) {
    var img = el.querySelector('.work-media img');
    var video = el.querySelector('.work-media video');
    return {
      el: el, link: el.querySelector('.work-link'), media: el.querySelector('.work-media'),
      inner: img || video, video: video,
      tiers: img ? tiersOf(img) : (video && video.getAttribute('poster') ? [{ w: 1600, src: video.getAttribute('poster') }] : []),
      titleI: el.querySelector('.work-title .line > i'),
      parts: el.querySelectorAll('.work-index, .work-meta, .work-desc, .work-cta')
    };
  });
  var N = items.length;
  if (!N) return;
  var mode = null;          // 'stage' (épinglé) ou 'list' (vertical, mouvement réduit)
  var cur = -1;             // projet dont le texte est affiché
  var inView = false;
  var STEP = 0.85, HOLD = 0.4; // hauteurs d'écran par transition, et pause sur le dernier projet

  /* ============================ Visuels ============================ */
  var sources = [], wanted = [], started = false;
  function density() { return Math.max(1, Math.min(window.devicePixelRatio || A.dpr || 1, 3)); }
  function need() { return renderer && renderer.width ? renderer.width() : Math.round(frame.getBoundingClientRect().width * density()); }
  function pick(it) {
    var n = need() * 0.98, t = it.tiers;
    for (var k = 0; k < t.length; k++) if (t[k].w >= n) return t[k];
    return t[t.length - 1];
  }
  /* Rappelée quand la toile grandit : une taille supérieure remplace alors la précédente,
     jamais l'inverse. Le décodage se fait hors du fil principal avant l'envoi à la carte. */
  function loadSources() {
    started = true;
    items.forEach(function (it, k) {
      if (!it.tiers.length) return;
      var t = pick(it);
      if (wanted[k] && wanted[k].w >= t.w) return;
      wanted[k] = t;
      var im = new Image(); im.decoding = 'async';
      var ready = function () { if (wanted[k] !== t) return; sources[k] = im; if (renderer && renderer.upload) renderer.upload(k, im); };
      im.onload = function () { if (im.decode) im.decode().then(ready, ready); else ready(); };
      im.onerror = function () {
        if (wanted[k] !== t || it.tiers.length < 2) return;
        it.tiers = it.tiers.filter(function (x) { return x !== t; }); wanted[k] = null; loadSources();
      };
      im.src = t.src;
    });
  }

  function glSupported() {
    if (A.reduced || /nogl/.test(location.search)) return false;
    try { var c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; }
  }

  /* Toile WebGL : carte de flux (pointeur) + fondu par bruit entre deux visuels */
  function makeGL() {
    var canvas = document.createElement('canvas'), gl;
    canvas.className = 'works-canvas';
    var opts = { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false }, gl2 = false;
    try { gl = canvas.getContext('webgl2', opts); gl2 = !!gl; if (!gl) gl = canvas.getContext('webgl', opts); } catch (e) { gl = null; }
    if (!gl) return null;
    var VS = 'attribute vec2 p;varying vec2 v;void main(){v=p*0.5+0.5;gl_Position=vec4(p,0.,1.);}';
    var FS_FLOW = [
      'precision highp float;varying vec2 v;',
      'uniform sampler2D uPrev;uniform vec2 uMouse,uVel;uniform float uAspect,uRadius,uDissipate,uStrength;',
      'void main(){',
      '  vec4 c=texture2D(uPrev,v);',
      // 128/255 code le zéro exact ; le retrait fixe garantit le retour au repos malgré l'arrondi sur 8 bits
      '  vec2 f=(c.rg-0.50196078)*2.0;',
      '  f=sign(f)*max(abs(f)*uDissipate-0.006,0.0);',
      '  vec2 d=v-uMouse;d.x*=uAspect;',
      '  float a=1.0-smoothstep(0.0,uRadius,length(d));',
      '  a=a*a*(3.0-2.0*a);',
      '  f+=uVel*a*uStrength;',
      '  f=clamp(f,-0.99,0.99);',
      '  gl_FragColor=vec4(f*0.5+0.50196078,0.0,1.0);',
      '}'
    ].join('\n');
    var FS_DRAW = [
      'precision highp float;varying vec2 v;',
      'uniform sampler2D uA,uB,uFlow;uniform vec2 uSA,uOA,uSB,uOB;uniform float uT,uVel,uTime,uFlowAmt;',
      'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}',
      'float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y);}',
      'float fbm(vec2 p){float s=0.0,a=0.5;for(int k=0;k<4;k++){s+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=0.5;}return s;}',
      'vec3 samp(sampler2D t,vec2 uv,vec2 ca){return vec3(texture2D(t,uv+ca).r,texture2D(t,uv).g,texture2D(t,uv-ca).b);}',
      'void main(){',
      '  vec2 uv=v;',
      // La vitesse du défilement courbe l'image : elle se resserre au centre et suit le mouvement
      '  float sx=sin(uv.x*3.14159265);',
      '  uv.y=(uv.y-0.5)*(1.0-abs(uVel)*0.16*sx)+0.5+uVel*0.035*sx;',
      // Le pointeur fait onduler la matière
      '  vec2 f=(texture2D(uFlow,v).rg-0.50196078)*2.0;',
      '  uv+=f*uFlowAmt;',
      // Dissolution : le visuel suivant s'infiltre depuis le haut, avec un bord organique
      '  float n=fbm(uv*vec2(3.0,2.2)+vec2(0.0,uTime*0.04));',
      '  float q=n*0.55+(1.0-uv.y)*0.45;',
      '  float edge=uT*1.5-0.25;',
      '  float m=smoothstep(q-0.2,q+0.2,edge);',
      '  float w=m*(1.0-m)*4.0;',
      '  float d=n-0.5;',
      '  vec2 uvA=uv+d*uT*0.22*vec2(0.6,1.0);',
      '  vec2 uvB=uv-d*(1.0-uT)*0.22*vec2(0.6,1.0);',
      '  uvA=(uvA-0.5)/(1.0+uT*0.1)+0.5;',
      '  uvB=(uvB-0.5)/(1.0+(1.0-uT)*0.1)+0.5;',
      '  vec2 ca=vec2(d*w*0.018,0.0)+f*0.012;',
      '  vec3 cA=samp(uA,uvA*uSA+uOA,ca);',
      '  vec3 cB=samp(uB,uvB*uSB+uOB,ca);',
      '  vec3 c=mix(cA,cB,m);',
      '  c*=1.0-w*0.16;',
      '  gl_FragColor=vec4(c,1.0);',
      '}'
    ].join('\n');
    function compile(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    function program(fs) { var p = gl.createProgram(); gl.attachShader(p, compile(gl.VERTEX_SHADER, VS)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }
    var progFlow, progDraw;
    try { progFlow = program(FS_FLOW); progDraw = program(FS_DRAW); } catch (e) { return null; }
    var quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    function attr(p) { var a = gl.getAttribLocation(p, 'p'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0); }
    var U = function (p, n) { return gl.getUniformLocation(p, n); };
    var uf = { prev: U(progFlow, 'uPrev'), mouse: U(progFlow, 'uMouse'), vel: U(progFlow, 'uVel'), aspect: U(progFlow, 'uAspect'), radius: U(progFlow, 'uRadius'), diss: U(progFlow, 'uDissipate'), str: U(progFlow, 'uStrength') };
    var ud = { a: U(progDraw, 'uA'), b: U(progDraw, 'uB'), flow: U(progDraw, 'uFlow'), sa: U(progDraw, 'uSA'), oa: U(progDraw, 'uOA'), sb: U(progDraw, 'uSB'), ob: U(progDraw, 'uOB'), t: U(progDraw, 'uT'), vel: U(progDraw, 'uVel'), time: U(progDraw, 'uTime'), flowAmt: U(progDraw, 'uFlowAmt') };
    function tex(w, h) {
      var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (w) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      return t;
    }
    var FW = 160, FH = 100;
    var flow = [tex(FW, FH), tex(FW, FH)], fbo = [gl.createFramebuffer(), gl.createFramebuffer()];
    for (var k = 0; k < 2; k++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[k]);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, flow[k], 0);
      gl.clearColor(128 / 255, 128 / 255, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    }
    var fi = 0;
    var blank = tex(); gl.bindTexture(gl.TEXTURE_2D, blank); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([17, 17, 20, 255]));
    var slots = items.map(function () { return { tex: null, w: 1, h: 1, ready: false, source: null }; });
    var W = 2, H = 2, time = 0;
    var dirty = true, idle = 0, flowLife = 0, lastI = -1, lastT = -1;
    var mouse = { x: 0.5, y: 0.5, vx: 0, vy: 0 };
    /* Netteté : un visuel plus grand que la toile est d'abord réduit à la taille exacte de
       celle-ci (réduction de qualité du navigateur, par moitiés au-delà de ×2), si bien qu'au
       repos un texel tombe sur un pixel d'écran, sans filtrage. Les mipmaps (WebGL2) ne
       servent plus qu'aux déformations des transitions et à la vidéo, plus large que le cadre. */
    function scaled(src, w, h) {
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      x.drawImage(src, 0, 0, w, h); return c;
    }
    function fitted(source, sw, sh, tw, th) {
      var cur = source, cw = sw, ch = sh, prev = null;
      while (cw > tw * 2) {
        cw = Math.ceil(cw / 2); ch = Math.ceil(ch / 2);
        var step = scaled(cur, cw, ch); if (prev) prev.width = prev.height = 0; prev = cur = step;
      }
      var out = scaled(cur, tw, th); if (prev) prev.width = prev.height = 0;
      return out;
    }
    function upload(k, source) {
      var s = slots[k]; if (!s.tex) s.tex = tex();
      var isVideo = !!source.videoWidth;
      var sw = source.videoWidth || source.naturalWidth || source.width || 1;
      var sh = source.videoHeight || source.naturalHeight || source.height || 1;
      var data = source, tw = sw, th = sh, tmp = null;
      if (!isVideo) {
        s.source = source;
        var sc = Math.max(W / sw, H / sh);
        if (sc < 0.985) {
          tw = Math.max(2, Math.round(sw * sc)); th = Math.max(2, Math.round(sh * sc));
          try { data = tmp = fitted(source, sw, sh, tw, th); } catch (e) { data = source; tw = sw; th = sh; tmp = null; }
        }
      }
      gl.bindTexture(gl.TEXTURE_2D, s.tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data); } catch (e) { return; }
      if (tmp) tmp.width = tmp.height = 0;
      if (gl2 && (!isVideo || sw > W * 1.2)) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
      else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      s.w = tw; s.h = th;
      s.ready = true; dirty = true;
    }
    function cover(s) { var ra = W / H, rt = s.w / s.h; return rt > ra ? [ra / rt, 1, (1 - ra / rt) / 2, 0] : [1, rt / ra, 0, (1 - rt / ra) / 2]; }
    return {
      canvas: canvas,
      width: function () { return W; },
      resize: function () {
        /* Densité réelle de l'écran (jusqu'à ×3), bornée par un budget de 4,1 Mpx, soit une
           toile de 2 560 × 1 600 : pleine densité sur téléphone, tablette, portable Retina et
           écran 4K. Rien n'est touché si la taille n'a pas changé ; sinon les visuels sont
           réajustés à la nouvelle toile. */
        var r = frame.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        var budget = Math.sqrt(4.1e6 / (r.width * r.height));
        var dpr = Math.max(1, Math.min(density(), budget));
        var w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
        if (w === W && h === H) return;
        W = w; H = h; canvas.width = W; canvas.height = H; dirty = true;
        slots.forEach(function (s, k) { if (s.source) upload(k, s.source); });
      },
      upload: upload,
      setPointer: function (x, y, vx, vy) { mouse.x = x; mouse.y = 1 - y; mouse.vx += vx; mouse.vy -= vy; flowLife = 150; },
      invalidate: function () { dirty = true; },
      draw: function (i, t, vel, dt) {
        time += dt;
        if (Math.abs(vel) < 0.0005) vel = 0;
        var v0 = items[0].video;
        var videoOn = i === 0 && !A.coarse && v0 && v0.readyState >= 2 && !v0.paused;
        /* Image au repos sur un projet (hors transition, dont le bord vit avec le temps) :
           rien ne bouge, on ne redessine pas (un rappel par seconde environ) */
        var still = (t <= 0 || t >= 1) && i === lastI && t === lastT && vel === 0;
        if (still && !dirty && !videoOn && !flowLife && ++idle < 60) return;
        idle = 0; dirty = false; lastI = i; lastT = t; if (flowLife) flowLife--;
        if (videoOn) upload(0, v0);
        // Carte de flux : le pointeur pousse la matière, qui se dissipe
        gl.bindBuffer(gl.ARRAY_BUFFER, quad);
        gl.useProgram(progFlow); attr(progFlow);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[1 - fi]); gl.viewport(0, 0, FW, FH);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, flow[fi]); gl.uniform1i(uf.prev, 0);
        gl.uniform2f(uf.mouse, mouse.x, mouse.y); gl.uniform2f(uf.vel, A.clamp(mouse.vx, -1, 1), A.clamp(mouse.vy, -1, 1));
        gl.uniform1f(uf.aspect, W / H); gl.uniform1f(uf.radius, 0.2); gl.uniform1f(uf.diss, 0.96); gl.uniform1f(uf.str, 1.0);
        gl.drawArrays(gl.TRIANGLES, 0, 3); fi = 1 - fi;
        mouse.vx *= 0.8; mouse.vy *= 0.8;
        // Image
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
        gl.useProgram(progDraw); attr(progDraw);
        var a = slots[i], b = slots[Math.min(N - 1, i + 1)];
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, a.ready ? a.tex : blank); gl.uniform1i(ud.a, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, b.ready ? b.tex : blank); gl.uniform1i(ud.b, 1);
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, flow[fi]); gl.uniform1i(ud.flow, 2);
        var ca = a.ready ? cover(a) : [1, 1, 0, 0], cb = b.ready ? cover(b) : [1, 1, 0, 0];
        gl.uniform2f(ud.sa, ca[0], ca[1]); gl.uniform2f(ud.oa, ca[2], ca[3]);
        gl.uniform2f(ud.sb, cb[0], cb[1]); gl.uniform2f(ud.ob, cb[2], cb[3]);
        gl.uniform1f(ud.t, t); gl.uniform1f(ud.vel, vel); gl.uniform1f(ud.time, time); gl.uniform1f(ud.flowAmt, 0.045);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      destroy: function () { canvas.remove(); try { var ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); } catch (e) {} }
    };
  }

  /* Repli sans WebGL : des calques en CSS, le suivant balaie le courant de haut en bas */
  function makeDOM() {
    var layers = items.map(function (it) { var d = document.createElement('div'); d.className = 'wl'; if (it.tiers.length) d.style.backgroundImage = 'url("' + pick(it).src + '")'; frame.appendChild(d); return d; });
    return {
      canvas: null, resize: function () {}, setPointer: function () {},
      draw: function (i, t) {
        for (var k = 0; k < layers.length; k++) {
          var s = layers[k].style;
          if (k === i) { s.opacity = '1'; s.clipPath = 'inset(0 0 0 0)'; s.transform = 'scale(' + (1 + t * 0.06).toFixed(4) + ')'; }
          else if (k === i + 1) { s.opacity = t > 0 ? '1' : '0'; s.clipPath = 'inset(0 0 ' + ((1 - t) * 100).toFixed(2) + '% 0)'; s.transform = 'scale(' + (1.08 - t * 0.08).toFixed(4) + ')'; }
          else s.opacity = '0';
        }
      },
      destroy: function () { layers.forEach(function (l) { l.remove(); }); }
    };
  }

  /* ============================ La scène ============================ */
  var renderer = null, pinST = null, viewST = null, revealST = null;
  var vel = 0, lastY = 0, pairI = 0, pairT = 0;

  function syncVideo() {
    var v = items[0].video; if (!v) return;
    var on = mode === 'stage' && inView && !A.coarse && (cur === 0 || (pairI === 0 && pairT < 1));
    if (on) play(v); else v.pause();
  }

  function swapText(k, dir) {
    var out = cur >= 0 ? items[cur] : null, inn = items[k];
    cur = k;
    items.forEach(function (it, j) {
      it.el.classList.toggle('is-current', j === k); it.el.classList.remove('is-leaving');
      if (it.link) it.link.setAttribute('tabindex', j === k ? '0' : '-1');
    });
    if (counterNum) counterNum.textContent = pad(k + 1);
    syncVideo();
    if (A.reduced) return;
    if (out && out !== inn) {
      out.el.classList.add('is-leaving');
      gsap.killTweensOf([out.titleI, out.parts]);
      gsap.to(out.titleI, { yPercent: -110 * dir, duration: 0.55, ease: 'power3.in', onComplete: function () { out.el.classList.remove('is-leaving'); } });
      gsap.to(out.parts, { y: -18 * dir, opacity: 0, duration: 0.45, ease: 'power2.in', stagger: 0.03 });
    }
    gsap.killTweensOf([inn.titleI, inn.parts]);
    gsap.fromTo(inn.titleI, { yPercent: 110 * dir }, { yPercent: 0, duration: 1.1, ease: A.EASE, delay: 0.2 });
    gsap.fromTo(inn.parts, { y: 26 * dir, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: A.EASE, stagger: 0.06, delay: 0.28 });
  }

  function setProgress(P) {
    var L = (N - 1) * STEP + HOLD;
    var f = A.clamp(P * L / STEP, 0, N - 1);
    var i = Math.max(0, Math.min(N - 2, Math.floor(f)));
    var local = f - i;
    pairI = i; pairT = N > 1 ? smooth((local - 0.12) / 0.76) : 0;
    var next = local < 0.5 ? i : i + 1;
    if (f >= N - 1) { pairT = 1; next = N - 1; }
    if (counterLine) counterLine.style.setProperty('--p', (N > 1 ? f / (N - 1) : 1).toFixed(4));
    if (next !== cur) swapText(next, cur < 0 || next > cur ? 1 : -1);
  }

  var lastP = null;
  function onMove(e) {
    if (!renderer) return;
    var r = frame.getBoundingClientRect(); if (!r.width || !r.height) return;
    var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height, now = performance.now();
    if (lastP) { var dt = Math.max(8, now - lastP.t) / 1000; renderer.setPointer(x, y, (x - lastP.x) / dt * 0.08, (y - lastP.y) / dt * 0.08); }
    else renderer.setPointer(x, y, 0, 0);
    lastP = { x: x, y: y, t: now };
  }
  function onLeave() { lastP = null; }
  function onFrameClick() { var l = cur >= 0 && items[cur].link; if (l) l.click(); }

  function armStage() {
    section.classList.add('is-stage');
    cur = -1; pairI = 0; pairT = 0; vel = 0; lastY = window.scrollY || 0;
    items.forEach(function (it) { it.el.classList.remove('is-current', 'is-leaving'); if (it.link) it.link.setAttribute('tabindex', '-1'); });
    renderer = glSupported() ? makeGL() : null;
    if (!renderer) renderer = makeDOM();
    if (renderer.canvas) frame.appendChild(renderer.canvas);
    renderer.resize();
    sources.forEach(function (s, k) { if (s && renderer.upload) renderer.upload(k, s); });
    renderer.draw(0, 0, 0, 0);
    pinST = ST.create({
      trigger: stage, start: 'top top',
      end: function () { return '+=' + Math.round(window.innerHeight * ((N - 1) * STEP + HOLD)); },
      pin: true, pinSpacing: true, scrub: true, invalidateOnRefresh: true,
      onUpdate: function (self) { setProgress(self.progress); },
      onRefresh: function () { if (renderer) { renderer.resize(); if (started) loadSources(); } }
    });
    viewST = ST.create({
      trigger: section, start: 'top bottom', end: 'bottom top',
      onToggle: function (self) { inView = self.isActive; if (inView && cur < 0) swapText(0, 1); if (renderer && renderer.invalidate) renderer.invalidate(); syncVideo(); }
    });
    if (!A.reduced) {
      gsap.set(frame, { clipPath: 'inset(10% 8% 10% 8%)' });
      revealST = ST.create({ trigger: stage, start: 'top 75%', once: true, onEnter: function () { gsap.to(frame, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: A.EASE }); } });
    }
    frame.addEventListener('mousemove', onMove, { passive: true });
    frame.addEventListener('mouseleave', onLeave);
    frame.addEventListener('click', onFrameClick);
  }
  function disarmStage() {
    [pinST, viewST, revealST].forEach(function (st) { if (st) st.kill(true); });
    pinST = viewST = revealST = null;
    frame.removeEventListener('mousemove', onMove); frame.removeEventListener('mouseleave', onLeave); frame.removeEventListener('click', onFrameClick);
    if (renderer) { renderer.destroy(); renderer = null; }
    inView = false; syncVideo();
    items.forEach(function (it) {
      it.el.classList.remove('is-current', 'is-leaving');
      if (it.link) it.link.removeAttribute('tabindex');
      gsap.killTweensOf([it.titleI, it.parts]); gsap.set([it.titleI, it.parts], { clearProps: 'all' });
    });
    gsap.set([frame, stage], { clearProps: 'all' });
    if (counterNum) counterNum.textContent = '01';
    section.classList.remove('is-stage');
    cur = -1;
  }

  /* ============================ La liste ============================ */
  var listSTs = [];
  function armList() {
    section.classList.add('is-list');
    items.forEach(function (it) {
      if (A.reduced || !it.media) return;
      gsap.set(it.media, { clipPath: 'inset(0% 0% 100% 0%)' });
      if (it.inner) gsap.set(it.inner, { scale: 1.18, transformOrigin: '50% 0%' });
      gsap.set(it.titleI, { yPercent: 110 }); gsap.set(it.parts, { y: 20, opacity: 0 });
      listSTs.push(ST.create({
        trigger: it.el, start: 'top 82%', once: true,
        onEnter: function () {
          var tl = gsap.timeline({ defaults: { ease: A.EASE } });
          tl.to(it.media, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3 }, 0);
          if (it.inner) tl.to(it.inner, { scale: 1, duration: 1.9 }, 0);
          tl.to(it.titleI, { yPercent: 0, duration: 1.1 }, 0.35)
            .to(it.parts, { y: 0, opacity: 1, duration: 1, stagger: 0.06 }, 0.45);
        }
      }));
    });
    var v = items[0].video;
    if (v) listSTs.push(ST.create({ trigger: items[0].el, start: 'top 90%', end: 'bottom 10%', onToggle: function (self) { if (self.isActive) play(v); else v.pause(); } }));
  }
  function disarmList() {
    listSTs.forEach(function (st) { st.kill(); }); listSTs = [];
    items.forEach(function (it) {
      var targets = [it.media, it.inner, it.titleI, it.parts].filter(Boolean);
      gsap.killTweensOf(targets); gsap.set(targets, { clearProps: 'all' });
    });
    section.classList.remove('is-list');
  }

  /* ============================ Bascule ============================ */
  function apply() {
    var next = A.reduced ? 'list' : 'stage';
    if (next === mode) return;
    if (mode === 'stage') disarmStage();
    if (mode === 'list') disarmList();
    mode = next;
    if (mode === 'stage') armStage(); else armList();
    ST.refresh();
  }
  A.armWorks = function () {
    ST.create({ trigger: section, start: 'top 150%', once: true, onEnter: loadSources });
    apply();
  };

  A.register({
    name: 'works',
    update: function (dt) {
      if (mode !== 'stage' || !renderer) return;
      var y = window.scrollY || 0;
      var dv = (y - lastY) / Math.max(dt, 1 / 240) / (A.vh * 3); lastY = y;
      vel = A.damp(vel, A.clamp(dv, -1, 1), 5, dt);
      if (!inView) return;
      renderer.draw(pairI, pairT, vel, dt);
    }
  });

  /* ============================ Étude de cas (Imora Rituals) ============================ */
  var opened = false, lastFocus = null, animating = false;
  function rect() {
    var el = mode === 'stage' ? frame : (items[0].media || items[0].el);
    var r = el.getBoundingClientRect();
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
    var parts = caseEl.querySelectorAll('.case-hero > *, .case-screen, .case-copy > *, .case-item, .case-foot > *');
    if (caseVideo && !caseVideo.dataset.liquid && A.liquidSupported && A.liquidSupported() && A.liquid) {
      caseVideo.dataset.liquid = '1';
      A.liquid(caseVideo.parentNode, caseVideo, { pointerTarget: caseEl, focal: [0.5, 0], dpr: 1.25, flowSize: 160, via2d: true, radius: 0.24, dissipate: 0.955, strength: 1.1, amount: 0.07, chroma: 0.016, ripple: 0.004 });
    }
    if (A.reduced) { caseEl.classList.add('is-open'); animating = false; caseEl.focus(); play(caseVideo); return; }
    gsap.set(caseEl, { clipPath: rect(), visibility: 'visible' });
    gsap.set(parts, { y: 40, opacity: 0 });
    caseEl.classList.add('is-open');
    play(caseVideo);
    var tl = gsap.timeline();
    tl.to(caseEl, { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 1.1, ease: 'power4.inOut', onComplete: function () { animating = false; caseEl.focus(); } }, 0)
      .to(parts, { y: 0, opacity: 1, duration: 1.2, ease: A.EASE, stagger: 0.05 }, 0.55);
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
  if (openLink) openLink.addEventListener('click', function (e) { e.preventDefault(); openCase(); });
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
