/* ═══════════════════════════════════════════════════════════════
   SOURCE — the control rail, the inspector, and the chaos button

   No component re-renders when a token changes. The rail writes CSS
   custom properties on :root and the browser recomputes. Proving that
   is most of the point of the concept.
   ═══════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const body = document.body;

  /* ─────────────────────────────────────────────────────────────
     TOKENS
     ───────────────────────────────────────────────────────────── */

  const DEFAULTS = { '--hue': 250, '--radius': 10, '--density': 1, '--scale': 1, '--h-weight': 650 };
  const sliders = $$('input[type=range][data-token]');

  const fmt = (token, v) => {
    if (token === '--radius')   return v + 'px';
    if (token === '--hue')      return String(Math.round(v));
    if (token === '--h-weight') return String(Math.round(v));
    return Number(v).toFixed(2) + '×';
  };

  function apply(slider, value, { animate = false } = {}) {
    const token = slider.dataset.token;
    const unit  = slider.dataset.unit || '';
    slider.value = value;
    root.style.setProperty(token, value + unit);

    const out = $('#' + slider.id + 'Out');
    if (out) out.textContent = fmt(token, value);

    if (animate) slider.style.transition = 'none';
    refresh();
  }

  sliders.forEach(s => {
    s.addEventListener('input', () => apply(s, s.value));
  });

  /* live readout of what the rail is actually writing */
  function refresh() {
    let dirty = 0;
    const lines = sliders.map(s => {
      const t = s.dataset.token;
      const v = Number(s.value);
      if (Math.abs(v - DEFAULTS[t]) > 0.001) dirty++;
      return `<span class="k">${t}:</span> <span class="v">${s.value}${s.dataset.unit || ''}</span>;`;
    });
    lines.push(`<span class="k">--accent:</span> <span class="v">hsl(${Math.round($('#hue').value)} 78% 62%)</span>;`);
    $('#tokenOut').innerHTML = lines.join('\n');
    $('#dirtyCount').textContent = dirty === 0 ? 'default' : `${dirty} changed`;
    save();
  }

  /* ── theme ── */
  function setTheme(name) {
    root.dataset.theme = name;
    $$('[data-theme-set]').forEach(x => {
      const on = x.dataset.themeSet === name;
      x.classList.toggle('is-on', on);
      x.setAttribute('aria-pressed', String(on));
    });
    save();
  }
  $$('[data-theme-set]').forEach(b =>
    b.addEventListener('click', () => setTheme(b.dataset.themeSet)));

  /* ── hue swatches ── */
  const PRESETS = [250, 210, 160, 30, 350, 285];
  const sw = $('#swatches');
  PRESETS.forEach(h => {
    const b = document.createElement('button');
    b.style.background = `hsl(${h} 78% 62%)`;
    b.setAttribute('aria-label', `Accent hue ${h}`);
    b.addEventListener('click', () => apply($('#hue'), h));
    sw.appendChild(b);
  });

  /* ── chaos: prove the system holds when every token moves at once ── */
  const rand = (a, b) => a + Math.random() * (b - a);

  $('#chaosBtn').addEventListener('click', chaos);
  function chaos() {
    apply($('#hue'),     Math.round(rand(0, 360)));
    apply($('#radius'),  Math.round(rand(0, 26)));
    apply($('#density'), rand(0.75, 1.45).toFixed(2));
    apply($('#scale'),   rand(0.9, 1.25).toFixed(2));
    apply($('#weight'),  Math.round(rand(400, 800) / 10) * 10);
    if (Math.random() > 0.5) $$('[data-theme-set]')[Math.random() > 0.5 ? 0 : 1].click();
  }

  $('#resetBtn').addEventListener('click', () => {
    sliders.forEach(s => apply(s, DEFAULTS[s.dataset.token]));
    $$('[data-theme-set]')[0].click();
  });

  /* ─────────────────────────────────────────────────────────────
     INSPECTOR
     ───────────────────────────────────────────────────────────── */

  const SOURCES = {
    Masthead: `<Masthead
  variant="hero"
  status="open"
  name="Bhautik Bharadava"
  role="Senior Frontend Engineer"
  meta={['Ahmedabad, IN', 'UTC+5:30', 'Remote-ready']}
/>`,
    Callout: `<Callout tone="accent">
  <strong>This page is a design system.</strong>
  Every block is a component instance…
</Callout>`,
    SectionHeading: `<SectionHeading
  index="01"
  title="Experience"
/>`,
    RoleCard: `<RoleCard
  company="Genea"
  level="Senior Software Engineer II"
  domain="cloud-native access control"
  current
  metrics={[
    { value: '[XX]',  label: 'components in the design system' },
    { value: '[XX]',  label: 'product surfaces adopting it' },
    { value: '[XX]%', label: 'bundle size reduction' },
  ]}
/>`,
    FeatureBlock: `<FeatureBlock emphasis="high">
  <h3>Developer surfaces for agentic delivery</h3>
  <p>…</p>
</FeatureBlock>`,
    StackTable: `<StackTable
  rows={[
    ['Core',    'React · TypeScript · Redux · SCSS · Vite'],
    ['Server',  'Node · Laravel · REST · WebSockets'],
    ['Infra',   'Docker · AWS · CI/CD'],
    ['Systems', 'Design systems · component API design'],
    ['Agentic', 'Agent tooling · MCP · spec-driven dev'],
  ]}
/>`,
    ContactRow: `<ContactRow
  heading="Let's talk"
  channels={[
    { label: 'Email',    href: 'mailto:…' },
    { label: 'GitHub',   href: '…' },
    { label: 'LinkedIn', href: '…' },
    { label: 'CodePen',  href: '…' },
    { label: 'Twitter',  href: '…' },
    { label: 'Instagram',href: '…' },
  ]}
/>`,
    ProjectCard: `<ProjectCard
  slug="frontend-ownership"
  title="Owning a frontend platform"
  tag="Architecture"
  problem="Without a single owner, every team solves bundling, state and
           permissions slightly differently."
  approach="Be the decision-maker, not the reviewer. Set architecture, the
            Webpack strategy and the standards — then live in the code."
  result="Six years as the frontend authority on the product."
/>

// Sibling instances: slug="rbac" and slug="modernization".
// The modernization card's result is still null — the bundle numbers are the
// most persuasive line on the page and aren't filled in yet.`,
    PrincipleList: `<PrincipleList
  items={[
    { title: 'A design system is measured by adoption, not coverage.', body: '…' },
    { title: 'Performance is a design problem first.',                 body: '…' },
    { title: 'An interface should admit what it does not know.',       body: '…' },
    { title: 'Build for the engineers who come after you.',            body: '…' },
  ]}
/>`,
    LinkList: `<LinkList
  items={[
    { kind: 'GitHub',  title: '52 repositories', href: '…' },
    { kind: 'CodePen', title: 'Creative coding', href: '…' },
    { kind: 'Writing', title: null, href: null },   // ← still unfilled
  ]}
/>`,
    Availability: `<Availability
  status="open"
  remote
  rows={[
    ['Role',        'Senior or lead frontend, product-focused'],
    ['Arrangement', 'Remote · EU and US-morning overlap from IST'],
    ['Notice',      null],                          // ← still unfilled
    ['Interested in','Frontend that owns real complexity'],
  ]}
/>`
  };

  const insp      = $('#insp');
  const inspName  = $('#inspName');
  const inspProps = $('#inspProps');
  const drawer    = $('#drawer');

  const toggle = $('#inspect');
  toggle.addEventListener('change', () => {
    body.classList.toggle('inspecting', toggle.checked);
    if (!toggle.checked) insp.classList.remove('is-on');
  });

  document.addEventListener('pointermove', e => {
    if (!toggle.checked) return;
    const cmp = e.target.closest('.cmp');
    if (!cmp) { insp.classList.remove('is-on'); return; }

    inspName.textContent  = '<' + cmp.dataset.component + ' />';
    inspProps.textContent = cmp.dataset.props || '';
    insp.classList.add('is-on');

    // keep the label inside the viewport
    const w = insp.offsetWidth, h = insp.offsetHeight;
    let x = e.clientX + 14, y = e.clientY - h - 12;
    if (x + w > innerWidth - 10) x = innerWidth - w - 10;
    if (y < 8) y = e.clientY + 18;
    insp.style.left = x + 'px';
    insp.style.top  = y + 'px';
  });

  document.addEventListener('click', e => {
    if (!toggle.checked) return;
    const cmp = e.target.closest('.cmp');
    if (!cmp) return;
    if (e.target.closest('a')) return;      // let real links work
    e.preventDefault();
    openDrawer(cmp.dataset.component);
  });

  /* Single pass. Chained replaces would re-scan the markup of spans inserted by
     an earlier step — the attribute rule happily matches the `class=` inside
     `<span class="t">` and shreds the output. One alternation, one walk. */
  function highlight(src) {
    const escaped = src.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    return escaped.replace(
      /(&lt;\/?)([A-Z][\w]*)|([\w-]+)(?==)|('[^']*'|"[^"]*")/g,
      (m, open, tag, attr, str) => {
        if (tag)  return open + '<span class="t">' + tag + '</span>';
        if (attr) return '<span class="a">' + attr + '</span>';
        if (str)  return '<span class="s">' + str + '</span>';
        return m;
      }
    );
  }

  function openDrawer(name) {
    $('#drawerTitle').textContent = name + '.tsx';
    $('#drawerCode').innerHTML = highlight(SOURCES[name] || '// source unavailable');
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
  }
  function closeDrawer() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
  }
  $('#drawerClose').addEventListener('click', closeDrawer);

  /* ─────────────────────────────────────────────────────────────
     RAIL + KEYBOARD
     ───────────────────────────────────────────────────────────── */

  const mobile = () => matchMedia('(max-width:900px)').matches;

  $('#railToggle').addEventListener('click', () => {
    if (mobile()) body.classList.remove('rail-open');
    else body.classList.toggle('rail-collapsed');
  });

  // off-canvas trigger, only meaningful on narrow screens
  const fab = document.createElement('button');
  fab.className = 'btn fab';
  fab.textContent = 'Tokens';
  fab.style.cssText =
    'position:fixed;right:16px;bottom:16px;z-index:930;padding:12px 18px;display:none';
  fab.addEventListener('click', () => body.classList.toggle('rail-open'));
  document.body.appendChild(fab);

  const syncFab = () => { fab.style.display = mobile() ? 'block' : 'none'; };
  syncFab();
  addEventListener('resize', syncFab);

  addEventListener('keydown', e => {
    if (e.target.matches('input, textarea')) return;
    if (e.key === 'i') { toggle.checked = !toggle.checked; toggle.dispatchEvent(new Event('change')); }
    if (e.key === 'c') chaos();
    if (e.key === 'Escape') closeDrawer();
  });

  // the hint has done its job after the first interaction
  const hint = $('#hint');
  const dismissHint = () => hint.classList.add('is-gone');
  ['keydown', 'pointerdown'].forEach(ev =>
    addEventListener(ev, dismissHint, { once: true }));
  setTimeout(dismissHint, 9000);

  /* ─────────────────────────────────────────────────────────────
     PERSISTENCE + SHARING

     A shared link should show exactly what was shared, so the URL
     takes precedence over whatever this browser last remembered.
     ───────────────────────────────────────────────────────────── */

  const STORE = 'bb-portfolio-tokens';

  function currentState() {
    const s = { theme: root.dataset.theme };
    sliders.forEach(x => s[x.id] = x.value);
    return s;
  }

  let saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      // Storage throws in private mode and when site data is blocked.
      try { localStorage.setItem(STORE, JSON.stringify(currentState())); } catch (_) {}
    }, 200);
  }

  function restore() {
    let src = null;

    const shared = new URLSearchParams(location.search).get('t');
    if (shared) {
      const [theme, ...vals] = shared.split(',');
      src = { theme };
      sliders.forEach((x, i) => src[x.id] = vals[i]);
    } else {
      try { src = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (_) {}
    }
    if (!src) return;

    if (src.theme === 'light' || src.theme === 'dark') setTheme(src.theme);
    sliders.forEach(x => {
      const v = Number(src[x.id]);
      if (Number.isFinite(v) && v >= Number(x.min) && v <= Number(x.max)) apply(x, v);
    });
  }

  function shareUrl() {
    const s = currentState();
    const t = [s.theme, ...sliders.map(x => x.value)].join(',');
    return location.origin + location.pathname + '?t=' + encodeURIComponent(t);
  }

  /* ── toast ── */

  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2400);
  }

  async function copy(text, okMsg) {
    try {
      await navigator.clipboard.writeText(text);
      toast(okMsg);
    } catch (_) {
      toast('Copy blocked — select and copy manually');
    }
  }

  $('#shareBtn').addEventListener('click', () => copy(shareUrl(), 'Theme link copied'));

  // mailto still works normally; copying is a bonus for anyone whose
  // machine has no mail client wired up, which is most work laptops
  $$('[data-copy]').forEach(a => a.addEventListener('click', () => {
    copy(a.dataset.copy, 'Email address copied');
  }));

  $('#printBtn').addEventListener('click', () => print());
  $('#year').textContent = new Date().getFullYear();

  /* ─────────────────────────────────────────────────────────────
     PLACEHOLDER AUDIT
     Unfilled content is styled loudly and counted here, so it can't
     quietly ship. See CHECKLIST.md.
     ───────────────────────────────────────────────────────────── */

  const todos = $$('[data-todo]').length;
  if (todos) {
    console.warn(
      `%c[portfolio] ${todos} unfilled placeholder${todos === 1 ? '' : 's'} still on the page.`,
      'color:#f59e0b;font-weight:bold'
    );
    console.warn('Fill them in before launch — see CHECKLIST.md.');
  }

  restore();
  refresh();
})();
