/* ═══════════════════════════════════════════════════════════════
   ORCHESTRATOR

   The scheduling is real: a dependency graph, topologically layered,
   executed with genuine parallelism and cancellable mid-flight.
   The *content* it assembles is hand-written and lives in #corpus —
   a portfolio that hallucinates about its author is a liability.
   ═══════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rand = (a, b) => a + Math.random() * (b - a);

  /* Abortable sleep. On cancel every pending sleep resolves immediately so the
     agent loops unwind and hit their `if (aborted) return` guards, instead of
     leaving orphaned promises that never settle. */
  const pending = new Set();
  const sleep = ms => new Promise(resolve => {
    const rec = { resolve };
    rec.t = setTimeout(() => { pending.delete(rec); resolve(); }, ms);
    pending.add(rec);
  });

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEED = reduceMotion ? 0.12 : 1;   // collapse the theatre if motion is unwelcome

  const el = {
    hero:      $('#hero'),
    run:       $('#run'),
    intake:    $('#intake'),
    input:     $('#intentInput'),
    chips:     $('#chips'),
    spec:      $('#specText'),
    timer:     $('#timer'),
    cancel:    $('#cancelBtn'),
    again:     $('#againBtn'),
    graphStage:$('#graphStage'),
    edges:     $('#graphEdges'),
    gateList:  $('#gateList'),
    agentList: $('#agentList'),
    tally:     $('#agentTally'),
    output:    $('#output'),
    pill:      $('#topStatus .pill'),
    meta:      $('#topMeta')
  };

  let running = false;
  let aborted = false;

  /* ─────────────────────────────────────────────────────────────
     THE PLANS
     Each agent declares its dependencies. The scheduler works out
     what can run at the same time — nothing here is sequenced by hand.
     ───────────────────────────────────────────────────────────── */

  const PLANS = {

    fit: {
      match: ['fit','lead','senior','hire','role','good','right','level','suitable'],
      label: 'Is he a fit for a lead frontend role?',
      spec:  'Assess fit for a senior or lead frontend role. Be honest about gaps.',
      agents: [
        { id:'ctx', name:'context-loader', short:'context', role:'work history, stack, artefacts', deps:[],
          ms:[520,780], logs:['reading profile.json','7 years · 3 employers','indexing 52 repos'] },
        { id:'ev', name:'evidence-miner', short:'evidence', role:'extract falsifiable claims', deps:['ctx'],
          ms:[900,1350], emit:'c-evidence', label:'EVIDENCE',
          logs:['scanning for numbers','5 claims found','4 need values · flagged','ranking by weight'] },
        { id:'risk', name:'risk-analyst', short:'risk', role:'argue the other side', deps:['ctx'],
          ms:[1000,1500], emit:'c-gaps', label:'RISK',
          logs:['inverting the brief','domain concentration: high','people-management: thin','drafting rebuttal'] },
        { id:'syn', name:'synthesiser', short:'synth', role:'weigh both, write the verdict', deps:['ev','risk'],
          ms:[820,1150], emit:'c-verdict', label:'VERDICT',
          logs:['merging 2 branches','weighting evidence over narrative','composing'] }
      ]
    },

    hardest: {
      match: ['hard','hardest','difficult','challenge','complex','proud','best','impressive'],
      label: "What's the hardest thing he's built?",
      spec:  'Surface the hardest engineering problem and how it was solved.',
      agents: [
        { id:'ctx', name:'context-loader', short:'context', role:'projects and incidents', deps:[],
          ms:[480,720], logs:['loading project index','ranking by difficulty','top result: operator dashboard'] },
        { id:'prob', name:'problem-framer', short:'problem', role:'state the actual difficulty', deps:['ctx'],
          ms:[880,1250], emit:'c-problem', label:'THE PROBLEM',
          logs:['isolating the constraint','real-time · multi-writer · physical','framing'] },
        { id:'app', name:'solution-tracer', short:'approach', role:'reconstruct the approach', deps:['prob'],
          ms:[900,1300], emit:'c-approach', label:'THE APPROACH',
          logs:['tracing architecture decisions','event projection over cache','component boundary rationale'] },
        { id:'out', name:'outcome-auditor', short:'outcome', role:'find what actually moved', deps:['prob'],
          ms:[1100,1550], emit:'c-outcome', label:'THE OUTCOME',
          logs:['searching for metrics','⚠ no values on record','emitting placeholder'] }
      ]
    },

    now: {
      match: ['now','current','building','working','today','gdk','agent','ai','lately','next'],
      label: 'What is he working on now?',
      spec:  'Describe current work without leaking anything that belongs to the employer.',
      agents: [
        { id:'ctx', name:'context-loader', short:'context', role:'current commitments', deps:[],
          ms:[480,700], logs:['reading active branches','domain: agentic delivery tooling'] },
        { id:'red', name:'disclosure-guard', short:'guard', role:'strip employer internals', deps:['ctx'],
          ms:[820,1200], label:'GUARD',
          logs:['classifying 14 details','12 internal · redacted','2 safe to describe','craft-level only'] },
        { id:'wr', name:'writer', short:'writer', role:'explain it to a hiring manager', deps:['red'],
          ms:[860,1200], emit:'c-now', label:'CURRENT WORK',
          logs:['dropping architecture detail','keeping the interesting part','composing'] }
      ]
    },

    resume: {
      match: ['resume','cv','résumé','quick','fast','facts','summary','contact','email','hire'],
      label: 'Just give me the résumé',
      spec:  'Skip the ceremony. Facts and a way to reach him.',
      agents: [
        { id:'f', name:'fetcher', short:'fetch', role:'pull the facts', deps:[],
          ms:[380,560], emit:'c-facts', label:'FACTS',
          logs:['profile.json','flattening'] },
        { id:'c', name:'contact-resolver', short:'contact', role:'verified channels only', deps:['f'],
          ms:[300,480], emit:'c-contact', label:'CONTACT',
          logs:['3 channels verified','email fastest'] }
      ]
    }
  };

  /* Free text gets routed to the closest plan by keyword overlap. */
  function route(text) {
    const words = text.toLowerCase().split(/[^a-z0-9é]+/).filter(Boolean);
    let best = null, bestScore = 0;
    for (const [key, plan] of Object.entries(PLANS)) {
      const score = words.reduce((n, w) =>
        n + (plan.match.some(m => m.startsWith(w) || w.startsWith(m)) ? 1 : 0), 0);
      if (score > bestScore) { bestScore = score; best = key; }
    }
    return { key: best ?? 'fit', matched: bestScore > 0 };
  }

  /* ─────────────────────────────────────────────────────────────
     GRAPH LAYOUT — layers derived from the dependency graph itself
     ───────────────────────────────────────────────────────────── */

  function layerOf(agent, byId, memo = {}) {
    if (memo[agent.id] != null) return memo[agent.id];
    const l = agent.deps.length
      ? 1 + Math.max(...agent.deps.map(d => layerOf(byId[d], byId, memo)))
      : 0;
    return memo[agent.id] = l;
  }

  /* The graph is kept as a model and laid out separately, because the panel's
     width is not reliably known at the moment a run starts — and because the
     window can be resized mid-run. A ResizeObserver drives every (re)layout. */
  let graph = null;   // { agents, layers, live:Set<edgeId> }

  function drawGraph(agents) {
    const byId = Object.fromEntries(agents.map(a => [a.id, a]));
    const memo = {};
    agents.forEach(a => a._layer = layerOf(a, byId, memo));

    const stage = el.graphStage;
    $$('.node', stage).forEach(n => n.remove());
    el.edges.innerHTML = '';

    agents.forEach(a => {
      const n = document.createElement('div');
      n.className = 'node';
      n.id = 'node-' + a.id;
      n.dataset.s = 'queued';
      n.innerHTML = `<i></i>${a.short || a.name}`;
      stage.appendChild(n);
    });

    graph = { agents, layers: Math.max(...agents.map(a => a._layer)) + 1, live: new Set() };
    layoutGraph();
  }

  function layoutGraph() {
    if (!graph) return;
    const stage = el.graphStage;
    const W = stage.clientWidth, H = stage.clientHeight;
    if (W < 120 || H < 80) return;   // not measurable yet — the observer will call back

    const pad = 34;
    const pos = {};

    for (let L = 0; L < graph.layers; L++) {
      const inLayer = graph.agents.filter(a => a._layer === L);
      inLayer.forEach((a, i) => {
        const x = pad + ((i + 1) / (inLayer.length + 1)) * (W - pad * 2);
        const y = pad + ((L + 0.5) / graph.layers) * (H - pad * 2);
        pos[a.id] = { x, y };
        const n = $('#node-' + a.id);
        if (n) { n.style.left = x + 'px'; n.style.top = y + 'px'; }
      });
    }

    // edges are rebuilt from scratch, then previously-lit ones are restored
    el.edges.innerHTML = '';
    graph.agents.forEach(a => a.deps.forEach(d => {
      const p = pos[d], c = pos[a.id];
      if (!p || !c) return;
      const id = `edge-${d}-${a.id}`;
      const mid = (p.y + c.y) / 2;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('id', id);
      path.setAttribute('d', `M${p.x},${p.y + 11} C${p.x},${mid} ${c.x},${mid} ${c.x},${c.y - 11}`);
      path.setAttribute('class', 'edge' + (graph.live.has(id) ? ' is-live' : ''));
      el.edges.appendChild(path);
      path.style.setProperty('--len', path.getTotalLength());
    }));
  }

  new ResizeObserver(layoutGraph).observe(el.graphStage);

  /* ─────────────────────────────────────────────────────────────
     AGENT CARDS
     ───────────────────────────────────────────────────────────── */

  function buildCard(a) {
    const c = document.createElement('div');
    c.className = 'agent';
    c.id = 'agent-' + a.id;
    c.dataset.s = 'queued';
    c.innerHTML =
      `<div class="agent__top">
         <span class="agent__dot"></span>
         <span class="agent__name">${a.name}</span>
         <span class="agent__role">${a.role}</span>
         <span class="agent__ms">queued</span>
       </div>
       <div class="agent__log"></div>`;
    return c;
  }

  const setNode = (id, s) => { const n = $('#node-' + id); if (n) n.dataset.s = s; };
  const setCard = (id, s) => { const c = $('#agent-' + id); if (c) c.dataset.s = s; };

  /* ─────────────────────────────────────────────────────────────
     OUTPUT — cloned from the plain corpus, never invented
     ───────────────────────────────────────────────────────────── */

  function emit(sectionId, label) {
    const src = $('#' + sectionId);
    if (!src) return;
    const block = document.createElement('div');
    block.className = 'block';
    block.innerHTML = `<div class="block__k">${label || 'OUTPUT'}</div>` + src.innerHTML;
    el.output.appendChild(block);
  }

  /* ─────────────────────────────────────────────────────────────
     THE SCHEDULER
     ───────────────────────────────────────────────────────────── */

  async function runAgent(a) {
    setNode(a.id, 'running');
    setCard(a.id, 'running');

    const card = $('#agent-' + a.id);
    const logBox = $('.agent__log', card);
    const msEl = $('.agent__ms', card);
    msEl.textContent = 'running';

    const dur = rand(a.ms[0], a.ms[1]) * SPEED;
    const gap = dur / (a.logs.length + 1);

    for (const line of a.logs) {
      await sleep(gap);
      if (aborted) return;
      const p = document.createElement('p');
      p.textContent = line;
      logBox.appendChild(p);
    }
    await sleep(gap);
    if (aborted) return;

    setNode(a.id, 'done');
    setCard(a.id, 'done');
    msEl.textContent = Math.round(dur) + 'ms';

    // light every edge feeding out of this node, and remember it across relayouts
    $$(`[id^="edge-${a.id}-"]`).forEach(e => {
      e.classList.add('is-live');
      graph?.live.add(e.id);
    });

    if (a.emit) emit(a.emit, a.label);
  }

  async function execute(plan) {
    const agents = plan.agents.map(a => ({ ...a }));
    const done = new Set();
    let completed = 0;

    el.agentList.innerHTML = '';
    el.output.innerHTML = '';
    agents.forEach(a => el.agentList.appendChild(buildCard(a)));
    drawGraph(agents);
    el.tally.textContent = `0/${agents.length}`;

    const inflight = new Map();

    while (done.size < agents.length && !aborted) {
      // everything whose dependencies are satisfied starts NOW, together
      const ready = agents.filter(a =>
        !inflight.has(a.id) && !done.has(a.id) && a.deps.every(d => done.has(d)));

      ready.forEach(a => {
        inflight.set(a.id, runAgent(a).then(() => {
          inflight.delete(a.id);
          done.add(a.id);
          el.tally.textContent = `${++completed}/${agents.length}`;
        }));
      });

      if (!inflight.size) break;              // nothing runnable — cycle or abort
      await Promise.race([...inflight.values()]);
    }
  }

  async function runGates() {
    for (const li of $$('#gateList li')) {
      await sleep(rand(240, 420) * SPEED);
      if (aborted) return;
      li.classList.add('is-pass');
    }
  }

  /* ─────────────────────────────────────────────────────────────
     LIFECYCLE
     ───────────────────────────────────────────────────────────── */

  function status(s, meta) {
    el.pill.dataset.status = s;
    el.pill.textContent = s.toUpperCase();
    if (meta != null) el.meta.textContent = meta;
  }

  function clearTimers() {
    pending.forEach(rec => { clearTimeout(rec.t); rec.resolve(); });
    pending.clear();
  }

  let rafId = 0;
  function startTimer() {
    const t0 = performance.now();
    const tick = () => {
      el.timer.textContent = ((performance.now() - t0) / 1000).toFixed(2) + 's';
      rafId = requestAnimationFrame(tick);
    };
    tick();
  }

  async function start(planKey, typedText) {
    if (running) return;
    running = true;
    aborted = false;
    clearTimers();

    const plan = PLANS[planKey];

    el.hero.classList.add('is-stowed');
    el.run.hidden = false;
    el.cancel.hidden = false;
    el.again.hidden = true;
    $$('#gateList li').forEach(li => li.classList.remove('is-pass'));

    el.spec.textContent = typedText || plan.spec;
    status('planning', 'decomposing intent');
    startTimer();

    await sleep(rand(400, 620) * SPEED);
    if (aborted) return finish('cancelled');

    status('running', `${plan.agents.length} agents · dependency-ordered`);
    await execute(plan);
    if (aborted) return finish('cancelled');

    status('running', 'verifying');
    await runGates();
    if (aborted) return finish('cancelled');

    finish('done');
  }

  function finish(how) {
    cancelAnimationFrame(rafId);
    clearTimers();
    running = false;
    el.cancel.hidden = true;
    el.again.hidden = false;

    if (how === 'cancelled') {
      status('cancelled', 'run halted · partial output retained');
    } else {
      status('done', 'all gates passed');
    }
  }

  /* ─────────────────────────────────────────────────────────────
     WIRING
     ───────────────────────────────────────────────────────────── */

  el.chips.addEventListener('click', e => {
    const b = e.target.closest('button[data-plan]');
    if (!b) return;
    start(b.dataset.plan, PLANS[b.dataset.plan].spec);
  });

  el.intake.addEventListener('submit', e => {
    e.preventDefault();
    const text = el.input.value.trim();
    if (!text) { el.input.focus(); return; }
    const { key, matched } = route(text);
    start(key, matched ? text : `${text}  —  routed to: ${PLANS[key].label}`);
  });

  el.cancel.addEventListener('click', () => {
    if (!running) return;
    aborted = true;
    clearTimers();
    $$('.agent[data-s="running"]').forEach(c => {
      c.dataset.s = 'queued';
      $('.agent__ms', c).textContent = 'cancelled';
    });
    $$('.node[data-s="running"]').forEach(n => n.dataset.s = 'queued');
    finish('cancelled');
  });

  el.again.addEventListener('click', () => {
    el.hero.classList.remove('is-stowed');
    el.run.hidden = true;
    el.input.value = '';
    status('idle', 'awaiting intent');
    el.timer.textContent = '0.00s';
    scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    setTimeout(() => el.input.focus(), 300);
  });

  // "/" focuses the intent box, the way a console should behave
  addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== el.input) {
      e.preventDefault();
      el.hero.classList.remove('is-stowed');
      el.input.focus();
    }
    if (e.key === 'Escape' && running) el.cancel.click();
  });

  /* Graph relayout on resize is handled by the ResizeObserver above. */
})();
