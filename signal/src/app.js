/* ═══════════════════════════════════════════════════════════════
   SIGNAL — a lattice of spring-held points that reads cursor VELOCITY

   The distinction matters: position-reactive fields feel like a
   spotlight following the mouse. Velocity-reactive fields feel like
   a material. Move slowly and nothing happens; move fast and the
   lattice scatters, then settles.
   ═══════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─────────────────────────────────────────────────────────────
     THE FIELD
     ───────────────────────────────────────────────────────────── */

  const canvas = $('#field');
  const ctx = canvas.getContext('2d', { alpha: true });

  const SPACING  = 38;     // lattice pitch, css px
  const RADIUS   = 165;    // influence radius of the cursor
  const STIFF    = 0.055;  // spring constant pulling each point home
  const DAMP     = 0.86;   // velocity damping
  const PUSH     = 0.85;   // how hard cursor speed displaces a point
  const MAX_SPEED = 45;    // speed at which the effect saturates

  let points = [], W = 0, H = 0, dpr = 1;

  function build() {
    W = innerWidth;
    H = innerHeight;
    // A page can be laid out before it has a measurable viewport (background
    // tab, restored session). Bail and let the ResizeObserver call back.
    if (W < 2 || H < 2) return;

    dpr = Math.min(devicePixelRatio || 1, 2);

    canvas.width  = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    points = [];
    const cols = Math.ceil(W / SPACING) + 1;
    const rows = Math.ceil(H / SPACING) + 1;
    const offX = (W - (cols - 1) * SPACING) / 2;
    const offY = (H - (rows - 1) * SPACING) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hx = offX + c * SPACING;
        const hy = offY + r * SPACING;
        points.push({ hx, hy, x: hx, y: hy, vx: 0, vy: 0 });
      }
    }

    // Paint one frame synchronously. Without this the lattice is invisible
    // until the first animation frame, which never arrives if the page opens
    // in a background tab.
    step();
  }

  /* pointer state — we care about how fast, not where */
  let px = -9999, py = -9999, ppx = -9999, ppy = -9999;
  let speed = 0, smoothSpeed = 0;

  addEventListener('pointermove', e => {
    px = e.clientX; py = e.clientY;
  }, { passive: true });

  addEventListener('pointerleave', () => { px = py = -9999; });

  /* four alpha buckets, each filled as one path — keeps fillStyle
     changes at 4 per frame instead of one per point */
  const BUCKETS = 4;
  const paths = new Array(BUCKETS);

  /* One frame of physics + paint. Kept separate from the loop so it can be
     driven synchronously on build as well as from requestAnimationFrame. */
  function step() {
    // measure pointer velocity for this frame
    if (ppx > -9999 && px > -9999) {
      const inst = Math.hypot(px - ppx, py - ppy);
      speed = Math.min(inst, MAX_SPEED);
    } else {
      speed = 0;
    }
    ppx = px; ppy = py;
    smoothSpeed += (speed - smoothSpeed) * 0.18;

    const energy = smoothSpeed / MAX_SPEED;   // 0..1

    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < BUCKETS; i++) paths[i] = new Path2D();

    for (const p of points) {
      // displacement from the cursor, scaled by how fast it is moving
      if (px > -9999 && energy > 0.004) {
        const dx = p.x - px, dy = p.y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < RADIUS * RADIUS) {
          const d = Math.sqrt(d2) || 0.0001;
          const falloff = 1 - d / RADIUS;
          const f = falloff * falloff * energy * PUSH;
          p.vx += (dx / d) * f * 26;
          p.vy += (dy / d) * f * 26;
        }
      }

      // spring home, with damping
      p.vx = (p.vx + (p.hx - p.x) * STIFF) * DAMP;
      p.vy = (p.vy + (p.hy - p.y) * STIFF) * DAMP;
      p.x += p.vx;
      p.y += p.vy;

      // how far from home decides size, darkness and bucket
      const off = Math.min(Math.hypot(p.x - p.hx, p.y - p.hy) / 34, 1);
      const bucket = Math.min(BUCKETS - 1, (off * BUCKETS) | 0);
      const r = 0.9 + off * 1.9;

      const path = paths[bucket];
      path.moveTo(p.x + r, p.y);
      path.arc(p.x, p.y, r, 0, Math.PI * 2);
    }

    // calm points are barely-there ink; displaced ones warm toward vermilion
    const fills = [
      'rgba(20,18,16,.10)',
      'rgba(90,55,30,.22)',
      'rgba(160,60,20,.34)',
      'rgba(194,65,12,.50)'
    ];
    for (let i = 0; i < BUCKETS; i++) {
      ctx.fillStyle = fills[i];
      ctx.fill(paths[i]);
    }

    // HUD
    const pct = Math.round(energy * 100);
    if (hudBar) {
      hudBar.style.width = pct + '%';
      hudVal.textContent = String(pct).padStart(2, '0');
    }
  }

  function loop() {
    step();
    raf = requestAnimationFrame(loop);
  }

  const hudBar = $('#hudBar');
  const hudVal = $('#hudVal');
  let raf = 0;

  if (!reduceMotion) {
    build();                       // paints its own first frame
    raf = requestAnimationFrame(loop);

    // ResizeObserver rather than the resize event: it also fires when the
    // viewport becomes measurable for the first time.
    let rt;
    new ResizeObserver(() => {
      clearTimeout(rt);
      rt = setTimeout(build, 160);
    }).observe(document.documentElement);

    // stop the loop when the tab is hidden — no point burning cycles
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else if (!raf) { ppx = ppy = -9999; raf = requestAnimationFrame(loop); }
    });
  } else {
    canvas.remove();
  }

  /* ─────────────────────────────────────────────────────────────
     CURSOR + MAGNETISM
     ───────────────────────────────────────────────────────────── */

  const cursor = $('#cursor');
  let cx = innerWidth / 2, cy = innerHeight / 2, ex = cx, ey = cy;

  if (cursor && !reduceMotion && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    addEventListener('pointermove', e => { cx = e.clientX; cy = e.clientY; }, { passive: true });

    (function follow() {
      ex += (cx - ex) * 0.3;
      ey += (cy - ey) * 0.3;
      cursor.style.transform = `translate(${ex}px, ${ey}px)`;
      requestAnimationFrame(follow);
    })();

    document.addEventListener('pointerover', e => {
      cursor.classList.toggle('is-link', !!e.target.closest('a, button'));
    });

    // links lean toward the cursor when it gets close
    $$('[data-magnetic]').forEach(link => {
      link.addEventListener('pointermove', e => {
        const r = link.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        link.style.transform = `translate(${dx * 0.22}px, ${dy * 0.3}px)`;
      });
      link.addEventListener('pointerleave', () => {
        link.style.transition = 'transform .45s cubic-bezier(.22,1,.36,1)';
        link.style.transform = '';
        setTimeout(() => { link.style.transition = ''; }, 460);
      });
    });
  }

  /* ─────────────────────────────────────────────────────────────
     SCROLL
     ───────────────────────────────────────────────────────────── */

  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

  $$('.reveal').forEach(n => io.observe(n));

  const masthead = $('.masthead');
  addEventListener('scroll', () => {
    masthead.classList.toggle('is-stuck', scrollY > 12);
  }, { passive: true });
})();
