/* ==========================================================================
   Liquide — distorsion WebGL au pointeur (« l'eau qui bouge »).
   Une carte de flux (ping-pong) accumule la vitesse du pointeur avec une
   brosse douce et se dissipe ; l'image (vidéo ou photo) est échantillonnée
   avec un décalage d'UV donné par ce flux, plus une légère aberration
   chromatique. Sans WebGL, sans pointeur fin ou en mouvement réduit : la
   vidéo s'affiche telle quelle.

   A.liquid(container, media, options) → { destroy, setDim }
   ========================================================================== */
(function () {
  'use strict';
  var A = window.AURA;

  var VS = 'attribute vec2 p;varying vec2 v;void main(){v=p*0.5+0.5;gl_Position=vec4(p,0.,1.);}';
  // Carte de flux : décroissance + brosse (direction = vitesse du pointeur)
  var FS_FLOW = [
    'precision highp float;varying vec2 v;',
    'uniform sampler2D uPrev;uniform vec2 uMouse,uVel;uniform float uAspect,uRadius,uDissipate,uStrength;',
    'void main(){',
    '  vec4 c=texture2D(uPrev,v);',
    '  vec2 f=(c.rg-0.5)*2.0*uDissipate;',
    '  vec2 d=v-uMouse;d.x*=uAspect;',
    '  float a=1.0-smoothstep(0.0,uRadius,length(d));',
    '  a=a*a*(3.0-2.0*a);',
    '  f+=uVel*a*uStrength;',
    '  f=clamp(f,-1.0,1.0);',
    '  gl_FragColor=vec4(f*0.5+0.5,0.0,1.0);',
    '}'
  ].join('\n');
  // Rendu : échantillonnage déplacé + aberration chromatique légère
  var FS_DRAW = [
    'precision highp float;varying vec2 v;',
    'uniform sampler2D uTex,uFlow;uniform vec2 uScale,uOffset;uniform float uAmount,uChroma,uTime,uRipple;',
    'void main(){',
    '  vec2 f=(texture2D(uFlow,v).rg-0.5)*2.0;',
    '  vec2 uv=v*uScale+uOffset;',
    '  float m=length(f);',
    '  uv+=f*uAmount;',
    '  uv+=vec2(sin(uv.y*22.0+uTime*0.9),cos(uv.x*18.0+uTime*0.7))*uRipple*m;',
    '  vec2 ca=f*uChroma;',
    '  float r=texture2D(uTex,uv+ca).r;',
    '  float g=texture2D(uTex,uv).g;',
    '  float b=texture2D(uTex,uv-ca).b;',
    '  gl_FragColor=vec4(r,g,b,1.0);',
    '}'
  ].join('\n');

  function compile(gl, type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  function program(gl, fs) { var p = gl.createProgram(); gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; }
  function tex(gl, w, h) {
    var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (w) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return t;
  }

  A.liquidSupported = function () {
    if (A.reduced || !A.fine || A.lowPower) return false;
    if (/noliquid/.test(location.search)) return false;
    try { var c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (e) { return false; }
  };

  A.liquid = function (container, media, o) {
    o = o || {};
    var gl, canvas = document.createElement('canvas');
    canvas.className = 'liquid-canvas' + (o.className ? ' ' + o.className : '');
    try { gl = canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false }); } catch (e) { gl = null; }
    if (!gl) return null;
    container.appendChild(canvas);

    var progFlow = program(gl, FS_FLOW), progDraw = program(gl, FS_DRAW);
    var quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    function attr(p) { var a = gl.getAttribLocation(p, 'p'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0); }
    var U = function (p, n) { return gl.getUniformLocation(p, n); };
    var uf = { prev: U(progFlow, 'uPrev'), mouse: U(progFlow, 'uMouse'), vel: U(progFlow, 'uVel'), aspect: U(progFlow, 'uAspect'), radius: U(progFlow, 'uRadius'), diss: U(progFlow, 'uDissipate'), str: U(progFlow, 'uStrength') };
    var ud = { tex: U(progDraw, 'uTex'), flow: U(progDraw, 'uFlow'), scale: U(progDraw, 'uScale'), offset: U(progDraw, 'uOffset'), amount: U(progDraw, 'uAmount'), chroma: U(progDraw, 'uChroma'), time: U(progDraw, 'uTime'), ripple: U(progDraw, 'uRipple') };

    // Carte de flux en basse résolution : douce et peu coûteuse
    var FW = o.flowSize || 192, FH = Math.round(FW * 0.66);
    var flowA = tex(gl, FW, FH), flowB = tex(gl, FW, FH);
    var fbA = gl.createFramebuffer(), fbB = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbA); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, flowA, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbB); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, flowB, 0);
    // Flux neutre au départ (0.5 = vitesse nulle)
    gl.clearColor(0.5, 0.5, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbA); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    var mediaTex = tex(gl);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // les images et vidéos arrivent origine en haut : on les retourne
    gl.bindTexture(gl.TEXTURE_2D, mediaTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([11, 11, 13, 255]));

    var W = 1, H = 1, dpr = Math.min(o.dpr || 1.5, window.devicePixelRatio || 1);
    var mouse = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, vx: 0, vy: 0, inside: false, last: 0 };
    var focal = o.focal || [0.5, 0.5];
    var params = { radius: o.radius || 0.16, dissipate: o.dissipate || 0.965, strength: o.strength || 0.9, amount: o.amount || 0.06, chroma: o.chroma || 0.012, ripple: o.ripple || 0.004 };
    var alive = true, ping = true, mediaReady = false, lastUpload = -1, mid = null, midCtx = null, checks = 0, self = null;
    // Envoi d'une image vers la texture. En fichier local (file://), le navigateur refuse de lire les pixels
    // de la vidéo : on abandonne proprement l'effet et on laisse la vidéo telle quelle.
    function up(src) { try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); return true; } catch (e) { return false; } }
    function abandon() { if (self) self.destroy(); if (o.onFail) o.onFail(); }

    function resize() {
      var r = container.getBoundingClientRect();
      W = Math.max(2, Math.round(r.width * dpr)); H = Math.max(2, Math.round(r.height * dpr));
      canvas.width = W; canvas.height = H;
    }
    resize();
    window.addEventListener('resize', resize);

    // Pointeur : sur la fenêtre (fond) ou sur le conteneur
    var target = o.pointerTarget || container;
    function onMove(e) {
      var r = container.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height;
      var now = performance.now(), dt = Math.max(8, now - mouse.last); mouse.last = now;
      if (mouse.inside) { mouse.vx = (x - mouse.x) * (16 / dt); mouse.vy = (y - mouse.y) * (16 / dt); }
      mouse.x = x; mouse.y = y; mouse.inside = true;
    }
    function onLeave() { mouse.inside = false; mouse.vx = mouse.vy = 0; }
    target.addEventListener('mousemove', onMove, { passive: true });
    target.addEventListener('mouseleave', onLeave, { passive: true });

    function coverUV() {
      var mw = media.videoWidth || media.naturalWidth || 16, mh = media.videoHeight || media.naturalHeight || 9;
      var ca = W / H, ma = mw / mh, sx = 1, sy = 1;
      if (ca > ma) sy = ma / ca; else sx = ca / ma;
      return [sx, sy, (1 - sx) * focal[0], (1 - sy) * focal[1]];
    }

    function frame() {
      if (!alive) return;
      // Texture : vidéo (chaque frame) ou image (une fois)
      var isVideo = media.tagName === 'VIDEO';
      var ready = isVideo ? media.readyState >= 2 : (media.complete && media.naturalWidth > 0);
      if (ready) {
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, mediaTex);
        if (isVideo) {
          var ct = media.currentTime;
          if (ct !== lastUpload) {
            if (o.via2d) {
              // Certaines vidéos (WebM enregistrées) arrivent mal dimensionnées en texture directe : on passe par une toile 2D
              if (!mid) { mid = document.createElement('canvas'); midCtx = mid.getContext('2d'); }
              if (mid.width !== media.videoWidth || mid.height !== media.videoHeight) { mid.width = media.videoWidth; mid.height = media.videoHeight; }
              midCtx.drawImage(media, 0, 0, mid.width, mid.height);
              if (!up(mid)) return abandon();
            } else {
              if (!up(media)) return abandon();
            }
            lastUpload = ct; if (!mediaReady) { mediaReady = true; canvas.classList.add('is-ready'); if (o.onReady) o.onReady(); }
          }
        }
        else if (!mediaReady) { if (!up(media)) return abandon(); mediaReady = true; canvas.classList.add('is-ready'); if (o.onReady) o.onReady(); }
      }
      // 1. flux
      gl.useProgram(progFlow); attr(progFlow);
      gl.viewport(0, 0, FW, FH);
      gl.bindFramebuffer(gl.FRAMEBUFFER, ping ? fbB : fbA);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, ping ? flowA : flowB); gl.uniform1i(uf.prev, 1);
      gl.uniform2f(uf.mouse, mouse.x, mouse.y);
      var vmax = 0.08; var vx = Math.max(-vmax, Math.min(vmax, mouse.vx)), vy = Math.max(-vmax, Math.min(vmax, mouse.vy));
      gl.uniform2f(uf.vel, mouse.inside ? vx * 10 : 0, mouse.inside ? vy * 10 : 0);
      gl.uniform1f(uf.aspect, W / H); gl.uniform1f(uf.radius, params.radius); gl.uniform1f(uf.diss, params.dissipate); gl.uniform1f(uf.str, params.strength);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      mouse.vx *= 0.6; mouse.vy *= 0.6;
      // 2. rendu
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      gl.useProgram(progDraw); attr(progDraw);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, mediaTex); gl.uniform1i(ud.tex, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, ping ? flowB : flowA); gl.uniform1i(ud.flow, 1);
      var c = coverUV();
      gl.uniform2f(ud.scale, c[0], c[1]); gl.uniform2f(ud.offset, c[2] + (o.parallax ? o.parallax() [0] : 0), c[3] + (o.parallax ? o.parallax()[1] : 0));
      gl.uniform1f(ud.amount, params.amount); gl.uniform1f(ud.chroma, params.chroma); gl.uniform1f(ud.ripple, params.ripple);
      gl.uniform1f(ud.time, performance.now() / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      ping = !ping;
      // Garde-fou : quelques images après la première texture, on lit un pixel ; noir absolu = pilote en échec → repli vidéo
      if (o.guard && mediaReady && checks < 6) {
        checks++;
        if (checks >= 3) {
          var sum = 0, px = new Uint8Array(4), fail = false;
          for (var sy2 = 1; sy2 <= 3 && !fail; sy2++) for (var sx2 = 1; sx2 <= 3; sx2++) {
            try { gl.readPixels(Math.floor(W * sx2 / 4), Math.floor(H * sy2 / 4), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } catch (e) { fail = true; break; }
            sum += px[0] + px[1] + px[2];
          }
          if (fail || sum > 0) checks = 99; // rendu vivant (ou lecture impossible) : on ne teste plus
          else if (checks === 5) { self.destroy(); if (o.onFail) o.onFail(); }
        }
      }
    }
    var slowCount = 0, lastT = 0;
    var ticker = function () {
      var t = performance.now();
      frame();
      var dtMs = performance.now() - t;
      if (o.guard && lastT) { if (dtMs > 14) slowCount++; else slowCount = Math.max(0, slowCount - 1); if (slowCount > 90) { self.destroy(); if (o.onFail) o.onFail(); return; } }
      lastT = t;
    };
    if (A.gsap) A.gsap.ticker.add(ticker); else (function loop() { if (!alive) return; frame(); requestAnimationFrame(loop); })();

    self = {
      canvas: canvas,
      size: function () { return { W: W, H: H, FW: FW, FH: FH }; },
      set: function (k, v) { params[k] = v; },
      destroy: function () { alive = false; if (A.gsap) A.gsap.ticker.remove(ticker); window.removeEventListener('resize', resize); target.removeEventListener('mousemove', onMove); target.removeEventListener('mouseleave', onLeave); canvas.remove(); }
    };
    return self;
  };
})();
