/* ═══════════════════════════════════════════════════════════════
   Three small things. Nothing here is required to read the page —
   if this file fails to load, the site is still complete.
   ═══════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ── 1 · local time, so a recruiter can see the overlap ──────── */

  const timeEl = $('#localTime');
  if (timeEl) {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'Asia/Kolkata'
    });
    const tick = () => timeEl.textContent = fmt.format(new Date());
    tick();
    setInterval(tick, 30000);
  }

  $('#year').textContent = new Date().getFullYear();
  $('#printBtn')?.addEventListener('click', () => print());

  /* ── 2 · the career rail ─────────────────────────────────────
     Ticks are positioned from where the roles actually sit in the
     document, so the rail is a map of this page rather than a
     decoration. Rebuilt on resize because those offsets move.
     ──────────────────────────────────────────────────────────── */

  const rail  = $('#rail');
  const fill  = $('#railFill');
  const ticks = $('#railTicks');
  const cards = $$('.role-card[data-year]');

  // matchMedia rather than innerWidth so it agrees with the stylesheet
  const wide = matchMedia('(min-width: 1041px)');

  let marks = [];

  function buildRail() {
    if (!ticks || !cards.length) return;
    ticks.innerHTML = '';
    marks = [];

    const docHeight = document.documentElement.scrollHeight - innerHeight;
    if (docHeight <= 0) return;

    // where each role sits as a fraction of total scrollable distance
    const raw = cards.map(card => {
      const top = card.getBoundingClientRect().top + scrollY;
      return Math.min(1, Math.max(0, (top - innerHeight * 0.35) / docHeight));
    });

    // The roles sit close together near the top of a long page, so raw
    // offsets bunch the labels into an illegible cluster. Push them apart
    // to a readable minimum while preserving order and rough position.
    const GAP = 0.11;
    const spread = raw.slice();
    for (let i = 1; i < spread.length; i++) {
      spread[i] = Math.max(spread[i], spread[i - 1] + GAP);
    }
    // if that overflowed the rail, pull the whole run back up
    const overflow = spread[spread.length - 1] - 1;
    if (overflow > 0) {
      for (let i = 0; i < spread.length; i++) spread[i] = Math.max(0, spread[i] - overflow);
    }

    cards.forEach((card, i) => {
      const el = document.createElement('div');
      el.className = 'rail__tick';
      el.style.top = (spread[i] * 100).toFixed(2) + '%';
      el.innerHTML = `<i></i><span>${card.dataset.year}</span>`;
      ticks.appendChild(el);
      marks.push({ el, card });
    });
  }

  let queued = false;

  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (!rail || !wide.matches) return;

      const docHeight = document.documentElement.scrollHeight - innerHeight;
      const progress = docHeight > 0 ? Math.min(1, scrollY / docHeight) : 0;
      fill.style.height = (progress * 100).toFixed(2) + '%';

      // the role nearest the middle of the viewport is the one you're reading
      const mid = innerHeight / 2;
      let best = null, bestDist = Infinity;
      marks.forEach(m => {
        const r = m.card.getBoundingClientRect();
        const dist = Math.abs(r.top + r.height / 2 - mid);
        if (dist < bestDist) { bestDist = dist; best = m; }
      });
      marks.forEach(m => m.el.classList.toggle('is-on', m === best && bestDist < innerHeight));
    });
  }

  if (rail && cards.length) {
    buildRail();
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });

    let resizeTimer;
    addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { buildRail(); onScroll(); }, 150);
    }, { passive: true });

    // web fonts land after first paint and shift every offset
    document.fonts?.ready.then(() => { buildRail(); onScroll(); });
  }

  /* ── 3 · placeholder audit ───────────────────────────────────
     Unfilled content is loud on screen and on paper; this makes it
     loud in the console too. See CHECKLIST.md.
     ──────────────────────────────────────────────────────────── */

  const todos = $$('[data-todo]').length;
  if (todos) {
    console.warn(
      `%c[site] ${todos} unfilled placeholder${todos === 1 ? '' : 's'} still on the page.`,
      'color:#b3572c;font-weight:bold'
    );
    console.warn('See CHECKLIST.md before launch.');
  }
})();
