/* ═══════════════════════════════════════════════════════════════
   LAB — the loud one.

   A hand-written WebGL fragment shader (no libraries), plus scroll
   and cursor choreography. Everything here is progressive: if WebGL
   is unavailable, the shader is skipped and a CSS gradient stands in.
   The content is plain DOM and never depends on any of it.
   ═══════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ───────────────────────────────────────────────────────────
     1 · THE SHADER
     Domain-warped fbm, coloured through a warm ramp, pushed
     around by the cursor. One fullscreen triangle, one pass.
     ─────────────────────────────────────────────────────────── */

  const VERT = `
    attribute vec2 a_pos;
    void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
  `;

  const FRAG = `
    precision highp float;

    uniform vec2  u_res;
    uniform float u_time;
    uniform vec2  u_mouse;
    uniform float u_scroll;

    float hash(vec2 p){
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);           // smoothstep
      return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                 mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
    }

    float fbm(vec2 p){
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 5; i++){
        v += a * noise(p);
        p = p * 2.02;
        a *= 0.5;
      }
      return v;
    }

    void main(){
      vec2 uv = gl_FragCoord.xy / u_res;
      vec2 p  = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;

      float t = u_time * 0.055 + u_scroll * 1.6;

      // domain warping — the thing that makes fbm look like smoke
      vec2 q = vec2(fbm(p * 1.6 + t), fbm(p * 1.6 + vec2(5.2, 1.3) - t));
      vec2 r = vec2(fbm(p * 1.6 + 2.0 * q + vec2(1.7, 9.2) + 0.15 * t),
                    fbm(p * 1.6 + 2.0 * q + vec2(8.3, 2.8) + 0.126 * t));
      float f = fbm(p * 1.6 + 2.2 * r);

      // the cursor pushes heat into the field
      vec2 m = (u_mouse - 0.5) * vec2(u_res.x / u_res.y, 1.0);
      float d = length(p - m);
      f += 0.30 * exp(-d * 2.6);

      vec3 ink   = vec3(0.043, 0.033, 0.028);
      vec3 clay  = vec3(0.702, 0.341, 0.173);
      vec3 amber = vec3(0.960, 0.639, 0.263);

      vec3 col = mix(ink, clay, smoothstep(0.18, 0.82, f));
      col = mix(col, amber, smoothstep(0.68, 1.05, f) * 0.75);

      // vignette, then grain so the gradient never bands
      col *= 1.0 - 0.55 * length(uv - 0.5);
      col += (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * 0.035;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function initShader() {
    const canvas = $('#gl');
    if (!canvas) return false;

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false })
            || canvas.getContext('experimental-webgl');
    if (!gl) return false;

    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn('[lab] shader failed:', gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[lab] link failed:', gl.getProgramInfoLog(prog));
      return false;
    }
    gl.useProgram(prog);

    // one oversized triangle covers the viewport with no seam
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes    = gl.getUniformLocation(prog, 'u_res');
    const uTime   = gl.getUniformLocation(prog, 'u_time');
    const uMouse  = gl.getUniformLocation(prog, 'u_mouse');
    const uScroll = gl.getUniformLocation(prog, 'u_scroll');

    // cap DPR — a full-screen fbm at 3x on a retina display is a heater
    const DPR = Math.min(devicePixelRatio || 1, 1.75);

    function resize() {
      const w = Math.floor(innerWidth * DPR);
      const h = Math.floor(innerHeight * DPR);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
    }
    resize();
    addEventListener('resize', resize, { passive: true });

    let mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5;
    addEventListener('pointermove', e => {
      tx = e.clientX / innerWidth;
      ty = 1 - e.clientY / innerHeight;   // GL origin is bottom-left
    }, { passive: true });

    let scroll = 0;
    addEventListener('scroll', () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      scroll = max > 0 ? scrollY / max : 0;
    }, { passive: true });

    const start = performance.now();
    let running = true;

    function frame(now) {
      if (!running) return;
      mx += (tx - mx) * 0.05;             // lag the cursor, it feels like fluid
      my += (ty - my) * 0.05;
      gl.uniform1f(uTime, still ? 0 : (now - start) / 1000);
      gl.uniform2f(uMouse, mx, my);
      gl.uniform1f(uScroll, scroll);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // don't burn a GPU on a tab nobody is looking at
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { running = false; }
      else if (!running)   { running = true; requestAnimationFrame(frame); }
    });

    document.body.classList.add('gl-on');
    return true;
  }

  if (!initShader()) document.body.classList.add('gl-off');

  /* ───────────────────────────────────────────────────────────
     2 · TEXT THAT ARRIVES
     ─────────────────────────────────────────────────────────── */

  const GLYPHS = '▚▞█▓▒░/\\<>*+=-_:.';

  function scramble(el, delay = 0) {
    const target = el.dataset.text || el.textContent;
    if (still) { el.textContent = target; return; }
    el.textContent = '';

    setTimeout(() => {
      let frame = 0;
      const total = target.length;
      const id = setInterval(() => {
        frame++;
        // settle one character every other frame, scramble the rest
        const settled = Math.floor(frame / 2);
        let out = '';
        for (let i = 0; i < total; i++) {
          if (target[i] === ' ') { out += ' '; continue; }
          out += i < settled ? target[i]
               : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        el.textContent = out;
        if (settled >= total) { el.textContent = target; clearInterval(id); }
      }, 34);
    }, delay);
  }

  $$('[data-scramble]').forEach((el, i) => scramble(el, 220 + i * 90));

  /* ───────────────────────────────────────────────────────────
     3 · SCROLL REVEALS
     ─────────────────────────────────────────────────────────── */

  const seen = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('is-in');
        seen.unobserve(en.target);
      }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 });

  $$('.rise').forEach(el => seen.observe(el));

  /* ───────────────────────────────────────────────────────────
     4 · CURSOR
     ─────────────────────────────────────────────────────────── */

  const cur = $('#cursor');
  if (cur && matchMedia('(hover: hover) and (pointer: fine)').matches && !still) {
    let cx = innerWidth / 2, cy = innerHeight / 2, x = cx, y = cy;
    addEventListener('pointermove', e => { cx = e.clientX; cy = e.clientY; }, { passive: true });
    (function loop() {
      x += (cx - x) * 0.18;
      y += (cy - y) * 0.18;
      cur.style.transform = `translate(${x}px, ${y}px)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener('pointerover', e => {
      cur.classList.toggle('is-live', !!e.target.closest('a, button'));
    });
    document.body.classList.add('has-cursor');
  }

  /* ───────────────────────────────────────────────────────────
     5 · HOUSEKEEPING
     ─────────────────────────────────────────────────────────── */

  $('#year').textContent = new Date().getFullYear();

  const todos = $$('[data-todo]').length;
  if (todos) {
    console.warn(`%c[lab] ${todos} unfilled placeholder${todos === 1 ? '' : 's'}.`,
                 'color:#f0a04b;font-weight:bold');
  }
})();
