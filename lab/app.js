/* ═══════════════════════════════════════════════════════════════
   LAB — deep space console.

   Hand-written WebGL: parallax starfield + domain-warped nebula,
   gravitationally lensed around the cursor, drifting with scroll.
   No libraries.

   Everything is progressive. If the context fails, a CSS field
   stands in. The content is plain DOM and never depends on any of it.
   ═══════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ───────────────────────────────────────────────────────────
     1 · THE FIELD
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
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }

    float fbm(vec2 p){
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 6; i++){
        v += a * noise(p);
        p *= 2.03;
        a *= 0.5;
      }
      return v;
    }

    // one sparse layer of stars. no branching — step() keeps it uniform.
    float starLayer(vec2 p, float density, float thresh, float t){
      vec2 g = p * density;
      vec2 i = floor(g), f = fract(g);
      float h = hash(i);
      float present = step(thresh, h);
      vec2  c = vec2(hash(i + 13.1), hash(i + 71.7));
      float d = length(f - c);
      float twinkle = 0.55 + 0.45 * sin(t * 2.1 + h * 60.0);
      return present * smoothstep(0.06, 0.0, d) * twinkle;
    }

    void main(){
      vec2 uv = gl_FragCoord.xy / u_res;
      vec2 p  = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;

      float t = u_time * 0.03;

      // gravitational lensing around the pointer
      vec2  m    = (u_mouse - 0.5) * vec2(u_res.x / u_res.y, 1.0);
      vec2  toM  = p - m;
      float r    = length(toM);
      float lens = 0.055 / (r * r + 0.055);
      p -= normalize(toM + 1e-6) * lens * 0.16;

      // drift forward as you scroll
      float depth = u_scroll * 2.4;

      // nebula — domain-warped fbm, two octabves of warp
      vec2 q = vec2(fbm(p * 1.1 + t), fbm(p * 1.1 + vec2(3.4, 1.2) - t));
      vec2 w = vec2(fbm(p * 1.1 + 1.8 * q + vec2(1.7, 9.2) + 0.11 * t),
                    fbm(p * 1.1 + 1.8 * q + vec2(8.3, 2.8) + 0.09 * t));
      float neb = fbm(p * 1.1 + 2.4 * w + vec2(0.0, depth * 0.35));

      vec3 void_     = vec3(0.010, 0.014, 0.038);
      vec3 violet   = vec3(0.290, 0.180, 0.640);
      vec3 cyan     = vec3(0.130, 0.600, 0.780);
      vec3 magenta  = vec3(0.720, 0.220, 0.520);

      vec3 col = void_;
      col = mix(col, violet,  smoothstep(0.30, 0.82, neb) * 1.00);
      col = mix(col, cyan,    smoothstep(0.52, 0.96, neb) * 0.70);
      col = mix(col, magenta, smoothstep(0.64, 1.00, neb) * 0.48);

      // three parallax star layers, nearest drifting fastest
      // densities are cells-per-unit; at ~3 units across the screen a density
      // of 16 is only ~48 cells wide, so these need to be high to read as sky
      float s = 0.0;
      s += starLayer(p + vec2(0.0, depth * 0.10), 16.0, 0.940, u_time) * 0.45;
      s += starLayer(p + vec2(0.0, depth * 0.28), 30.0, 0.965, u_time) * 0.75;
      s += starLayer(p + vec2(0.0, depth * 0.58), 52.0, 0.982, u_time) * 1.00;
      col += vec3(0.82, 0.88, 1.0) * s;

      // the pointer is a faint light source
      col += vec3(0.24, 0.52, 0.85) * exp(-r * 3.4) * 0.16;

      // vignette, then grain so the gradient never bands
      col *= 1.0 - 0.62 * length(uv - 0.5);
      col += (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * 0.028;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function initField() {
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
        console.warn('[lab] shader:', gl.getShaderInfoLog(sh));
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
      console.warn('[lab] link:', gl.getProgramInfoLog(prog));
      return false;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes    = gl.getUniformLocation(prog, 'u_res');
    const uTime   = gl.getUniformLocation(prog, 'u_time');
    const uMouse  = gl.getUniformLocation(prog, 'u_mouse');
    const uScroll = gl.getUniformLocation(prog, 'u_scroll');

    // a fullscreen 6-octave fbm at 3× is a laptop heater
    const DPR = Math.min(devicePixelRatio || 1, 1.6);

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
      mx += (tx - mx) * 0.045;
      my += (ty - my) * 0.045;
      gl.uniform1f(uTime, still ? 0 : (now - start) / 1000);
      gl.uniform2f(uMouse, mx, my);
      gl.uniform1f(uScroll, scroll);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) running = false;
      else if (!running) { running = true; requestAnimationFrame(frame); }
    });

    document.body.classList.add('gl-on');
    return true;
  }

  if (!initField()) document.body.classList.add('gl-off');

  /* ───────────────────────────────────────────────────────────
     2 · TELEMETRY
     Real values where real values exist. The clock is his actual
     local time; the coordinates are Ahmedabad.
     ─────────────────────────────────────────────────────────── */

  const clock = $('#clock');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false, timeZone: 'Asia/Kolkata'
    });
    const tick = () => clock.textContent = fmt.format(new Date());
    tick();
    setInterval(tick, 1000);
  }

  // uptime since the page opened — the one honestly synthetic readout
  const upEl = $('#uptime');
  if (upEl) {
    const t0 = Date.now();
    setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000);
      upEl.textContent =
        String((s / 60) | 0).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }, 1000);
  }

  const scrollOut = $('#scrollPct');
  if (scrollOut) {
    addEventListener('scroll', () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const pct = max > 0 ? Math.round((scrollY / max) * 100) : 0;
      scrollOut.textContent = String(pct).padStart(3, '0');
    }, { passive: true });
  }

  /* ───────────────────────────────────────────────────────────
     3 · TEXT THAT DECODES
     ─────────────────────────────────────────────────────────── */

  const GLYPHS = '▚▞█▓▒░/\\<>*+=-_:.01';

  function decode(el, delay = 0) {
    const target = el.dataset.text || el.textContent;
    if (still) { el.textContent = target; return; }
    el.textContent = '';

    setTimeout(() => {
      let frame = 0;
      const id = setInterval(() => {
        frame++;
        const settled = Math.floor(frame / 2);
        let out = '';
        for (let i = 0; i < target.length; i++) {
          if (target[i] === ' ') { out += ' '; continue; }
          out += i < settled ? target[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        el.textContent = out;
        if (settled >= target.length) { el.textContent = target; clearInterval(id); }
      }, 32);
    }, delay);
  }

  $$('[data-scramble]').forEach((el, i) => decode(el, 260 + i * 90));

  /* ───────────────────────────────────────────────────────────
     4 · SCROLL REVEALS
     ─────────────────────────────────────────────────────────── */

  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 });

  $$('.rise').forEach(el => io.observe(el));

  /* ───────────────────────────────────────────────────────────
     5 · RETICLE
     ─────────────────────────────────────────────────────────── */

  const cur = $('#reticle');
  if (cur && matchMedia('(hover: hover) and (pointer: fine)').matches && !still) {
    let cx = innerWidth / 2, cy = innerHeight / 2, x = cx, y = cy;
    addEventListener('pointermove', e => { cx = e.clientX; cy = e.clientY; }, { passive: true });
    (function loop() {
      x += (cx - x) * 0.2;
      y += (cy - y) * 0.2;
      cur.style.transform = `translate(${x}px, ${y}px)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener('pointerover', e => {
      cur.classList.toggle('is-locked', !!e.target.closest('a, button'));
    });
    document.body.classList.add('has-reticle');
  }

  /* ───────────────────────────────────────────────────────────
     6 · HOUSEKEEPING
     ─────────────────────────────────────────────────────────── */

  $('#year').textContent = new Date().getFullYear();

  const todos = $$('[data-todo]').length;
  if (todos) {
    console.warn(`%c[lab] ${todos} unfilled placeholder${todos === 1 ? '' : 's'}.`,
                 'color:#5ad4e6;font-weight:bold');
  }
})();
