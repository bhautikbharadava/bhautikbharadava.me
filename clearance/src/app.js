/* ═══════════════════════════════════════════════════════════════
   CLEARANCE — interaction layer
   Everything is local. Nothing is sent anywhere.
   ═══════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const body       = document.body;
  const reader     = $('#reader');
  const arcFill    = $('#arcFill');
  const ledText    = $('#ledText');
  const gatePrompt = $('#gatePrompt');
  const gateLog    = $('#gateLog');
  const liveLog    = $('#liveLog');
  const eventCount = $('#eventCount');
  const cursor     = $('#cursor');

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ARC_LEN = 2 * Math.PI * 52;   // circumference of the progress ring
  const HOLD_MS = reduceMotion ? 350 : 1100;

  const setState = s => body.dataset.state = s;
  const state    = () => body.dataset.state;

  /* ── time ────────────────────────────────────────────────────── */

  const stamp = () => {
    const d = new Date();
    return [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map(n => String(n).padStart(2, '0')).join(':');
  };

  const clock = $('#chromeClock');
  const tickClock = () => { if (clock) clock.textContent = stamp(); };
  tickClock();
  setInterval(tickClock, 1000);

  /* ── the live audit log ──────────────────────────────────────── */

  let events = 0;
  const MAX_ENTRIES = 60;

  function log(message, kind = '') {
    if (!liveLog) return;
    events++;
    eventCount.textContent = String(events).padStart(3, '0');

    const el = document.createElement('div');
    el.className = 'entry' + (kind ? ` entry--${kind}` : '');
    el.innerHTML =
      `<span class="entry__t">${stamp()}</span>` +
      `<span class="entry__m">${message}</span>`;
    liveLog.appendChild(el);

    while (liveLog.children.length > MAX_ENTRIES) liveLog.firstChild.remove();
    liveLog.scrollTop = liveLog.scrollHeight;
  }

  /* Boot log inside the gate — the lines that stream while you scan. */
  function gateLine(html, delay = 0) {
    if (!gateLog) return;
    const p = document.createElement('p');
    p.innerHTML = html;
    p.style.animationDelay = delay + 'ms';
    gateLog.appendChild(p);
    while (gateLog.children.length > 7) gateLog.firstChild.remove();
  }

  gateLine('reader bb-01 · online');
  gateLine('polling for carrier &hellip;');

  /* ── proximity: the reader notices you approaching ───────────── */

  let prox = 0, proxTarget = 0;

  function trackProximity(x, y) {
    if (!reader || state() !== 'locked') return;
    const r = reader.getBoundingClientRect();
    const dx = x - (r.left + r.width / 2);
    const dy = y - (r.top + r.height / 2);
    const dist = Math.hypot(dx, dy);
    // full strength within 90px, falls off to nothing by 420px
    proxTarget = Math.max(0, Math.min(1, 1 - (dist - 90) / 330));
  }

  /* ── the custom cursor ───────────────────────────────────────── */

  let cx = innerWidth / 2, cy = innerHeight / 2;   // actual pointer
  let vx = cx, vy = cy;                            // eased ring

  addEventListener('pointermove', e => {
    cx = e.clientX; cy = e.clientY;
    trackProximity(cx, cy);
  }, { passive: true });

  function frame() {
    // ease the cursor ring toward the pointer
    vx += (cx - vx) * 0.22;
    vy += (cy - vy) * 0.22;
    if (cursor) cursor.style.transform = `translate(${vx}px, ${vy}px)`;

    // ease proximity so the glow doesn't snap
    prox += (proxTarget - prox) * 0.12;
    if (reader) reader.style.setProperty('--prox', prox.toFixed(3));

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // cursor reacts to what's under it
  document.addEventListener('pointerover', e => {
    if (!cursor) return;
    const t = e.target.closest('a, button, .reader, .card');
    cursor.classList.toggle('is-active', !!t);
    cursor.classList.toggle('is-deny', !!e.target.closest('.is-locked'));
  });

  /* ── press and hold to badge in ──────────────────────────────── */

  let holding = false, holdStart = 0, holdRaf = 0, scanLines = 0;

  const SCAN_SCRIPT = [
    [0.05, 'carrier detected · 13.56 mhz'],
    [0.28, 'reading credential block &hellip;'],
    [0.52, 'wiegand 26 · facility 042'],
    [0.74, 'credential <b>0x8F2A11</b> · matched'],
    [0.92, 'schedule <b>ALWAYS</b> · no antipassback']
  ];

  function setArc(p) {
    if (arcFill) arcFill.style.strokeDashoffset = String(ARC_LEN * (1 - p));
  }

  function beginHold() {
    if (state() !== 'locked') return;
    holding = true;
    holdStart = performance.now();
    scanLines = 0;
    setState('scanning');
    ledText.textContent = 'READING';
    gatePrompt.style.opacity = '.4';
    log('CREDENTIAL PRESENTED · reader BB-01', 'warn');
    stepHold();
  }

  function stepHold() {
    if (!holding) return;
    const p = Math.min(1, (performance.now() - holdStart) / HOLD_MS);
    setArc(p);

    // stream the decode log in step with the arc
    while (scanLines < SCAN_SCRIPT.length && p >= SCAN_SCRIPT[scanLines][0]) {
      gateLine(SCAN_SCRIPT[scanLines][1]);
      scanLines++;
    }

    if (p >= 1) { grant(); return; }
    holdRaf = requestAnimationFrame(stepHold);
  }

  function endHold() {
    if (!holding || state() !== 'scanning') return;
    holding = false;
    cancelAnimationFrame(holdRaf);
    setArc(0);
    setState('locked');
    ledText.textContent = 'LOCKED';
    gatePrompt.style.opacity = '';
    gateLine('<s>read aborted · card removed</s>');
    log('READ ABORTED · credential withdrawn', 'deny');
  }

  function grant() {
    holding = false;
    cancelAnimationFrame(holdRaf);
    setArc(1);
    setState('granted');
    ledText.textContent = 'GRANTED';
    gateLine('<b>access granted</b> · strike release 6000ms');
    log('ACCESS GRANTED · D-01 Lobby', 'grant');

    // mag-lock releases, then the doors part
    setTimeout(() => {
      setState('opening');
      log('DOOR D-01 · OPEN', 'grant');
    }, reduceMotion ? 60 : 480);

    setTimeout(() => {
      setState('unlocked');
      $('#lobby')?.focus?.();
      log('SESSION ACTIVE · welcome, visitor');
      startAmbient();
    }, reduceMotion ? 160 : 1420);
  }

  if (reader) {
    reader.addEventListener('pointerdown', e => { e.preventDefault(); beginHold(); });
    addEventListener('pointerup', endHold);
    addEventListener('pointercancel', endHold);
    reader.addEventListener('pointerleave', endHold);

    // keyboard parity: hold Enter or Space
    reader.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); beginHold(); }
    });
    reader.addEventListener('keyup', e => {
      if (e.key === 'Enter' || e.key === ' ') endHold();
    });
  }

  /* Skip — for anyone who does not want to play. */
  $('#skipBtn')?.addEventListener('click', () => {
    log('DOOR HELD OPEN · visitor bypassed reader', 'warn');
    setState('opening');
    setTimeout(() => { setState('unlocked'); startAmbient(); }, reduceMotion ? 60 : 900);
  });

  /* ── scroll spy over the door directory ──────────────────────── */

  const links = $$('.directory__list a[href^="#"]');
  const panes = $$('.pane');
  const seen  = new Set();

  const spy = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const id = en.target.id;
      links.forEach(a => a.classList.toggle('is-current', a.getAttribute('href') === '#' + id));

      if (!seen.has(id) && state() === 'unlocked') {
        seen.add(id);
        const link = links.find(a => a.getAttribute('href') === '#' + id);
        const door = link?.dataset.door ?? '';
        const name = link?.firstChild?.textContent?.trim() ?? id;
        log(`DOOR ${door} · ${name.toUpperCase()} · GRANTED`, 'grant');
      }
    });
  }, { rootMargin: '-45% 0px -45% 0px' });

  panes.forEach(p => spy.observe(p));

  links.forEach(a => a.addEventListener('click', () => {
    const name = a.firstChild?.textContent?.trim() ?? '';
    log(`REQUEST · ${a.dataset.door} ${name.toUpperCase()}`);
  }));

  /* ── the restricted door ─────────────────────────────────────── */

  let denials = 0;
  const roof = $('#roofDoor');
  const flash = $('#deniedFlash');

  roof?.addEventListener('click', e => {
    e.preventDefault();
    denials++;

    if (denials < 3) {
      flash?.classList.add('is-on');
      setTimeout(() => flash?.classList.remove('is-on'), 180);
      roof.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' },
         { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }],
        { duration: 220, easing: 'ease-out' }
      );
      log(`ACCESS DENIED · D-06 ROOF · clearance L1 < L9 (attempt ${denials}/3)`, 'deny');
      ledText.textContent = 'DENIED';
      return;
    }

    if (denials === 3) {
      // Persistence is a virtue. Elevate.
      roof.parentElement.classList.add('is-open');
      $('#credLevel').textContent = 'ELEVATED · L9';
      $('#badgeChip').classList.add('is-elevated');
      log('CLEARANCE ELEVATED · L1 → L9 · reason: PERSISTENCE', 'warn');
      log('DOOR D-06 · ROOF · GRANTED', 'grant');

      const pane = document.createElement('section');
      pane.className = 'pane';
      pane.id = 'roof';
      pane.innerHTML = `
        <div class="pane__mark"><span>D-06</span> ROOF · ELEVATED</div>
        <h3 class="pane__title">You kept trying the locked door.</h3>
        <p class="pane__sub">Which is roughly how I approach most engineering problems, so:
        have the restricted section.</p>
        <div class="cards">
          <div class="card"><span class="card__k">OFF THE CLOCK</span><b>Creative coding</b>
            <p>Most of the interaction ideas here started as a CodePen at midnight.</p></div>
          <div class="card"><span class="card__k">CURRENTLY</span><b>Agentic tooling</b>
            <p>Building the developer surface for spec-driven, multi-agent delivery.</p></div>
          <div class="card"><span class="card__k">OPINION</span><b>Design systems are a product</b>
            <p>If nobody adopts it, it isn't a system — it's a folder of components.</p></div>
        </div>`;
      $('.content').appendChild(pane);
      spy.observe(pane);
      pane.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
      roof.setAttribute('href', '#roof');
    }
  });

  /* ── log rail collapse ───────────────────────────────────────── */

  $('#logToggle')?.addEventListener('click', () => {
    const collapsed = body.classList.toggle('log-collapsed');
    $('#logToggle').textContent = collapsed ? '+' : '—';
    $('#logToggle').setAttribute('aria-label', collapsed ? 'Expand log' : 'Collapse log');
  });

  /* ── ambient session telemetry ───────────────────────────────── */

  let ambient = null;

  function startAmbient() {
    if (ambient) return;

    // idle detection — the log notices when you stop moving
    let idleTimer, wasIdle = false;
    const resetIdle = () => {
      clearTimeout(idleTimer);
      if (wasIdle) { wasIdle = false; log('MOTION RESUMED · occupant active'); }
      idleTimer = setTimeout(() => {
        wasIdle = true;
        log('NO MOTION 45s · zone idle', 'warn');
      }, 45000);
    };
    ['pointermove', 'scroll', 'keydown'].forEach(ev =>
      addEventListener(ev, resetIdle, { passive: true }));
    resetIdle();

    // depth milestones
    const marks = [25, 50, 75, 100];
    const hit = new Set();
    addEventListener('scroll', () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const pct = max > 0 ? Math.round((scrollY / max) * 100) : 0;
      marks.forEach(m => {
        if (pct >= m && !hit.has(m)) { hit.add(m); log(`WALKTHROUGH ${m}% COMPLETE`); }
      });
    }, { passive: true });

    // leaving the tab
    document.addEventListener('visibilitychange', () => {
      log(document.hidden ? 'OCCUPANT LEFT ZONE · tab hidden' : 'OCCUPANT RETURNED',
          document.hidden ? 'warn' : 'grant');
    });

    // copying the email is a meaningful signal — surface it
    $$('a[href^="mailto:"]').forEach(a => a.addEventListener('click',
      () => log('CONTACT REQUESTED · front desk notified', 'grant')));

    ambient = true;
  }

  /* If someone deep-links past the gate, don't trap them behind it. */
  if (location.hash && location.hash !== '#') {
    setState('unlocked');
    startAmbient();
    log('DEEP LINK · gate bypassed', 'warn');
  }
})();
