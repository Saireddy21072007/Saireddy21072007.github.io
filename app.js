/* Portfolio interactions — plain JS, no dependencies. Every number below is
   copied from the linked repository (results files / READMEs). */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const USER = 'Saireddy21072007';
  const EMAIL = 'saireddyannem2007@gmail.com';
  const REPOS = ['interviewace-ai', 'disaster-risk-bayesian-network', 'cipl-eye-disease-diagnosis',
                 'uav-apriltag-landing-sim', 'greenscale-cloud', 'polylag'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const svgEl = (tag, attrs = {}, text) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (text != null) el.textContent = text;
    return el;
  };

  /* ---------------- chrome: theme, bar, nav, reveal, toast ---------------- */
  const toast = (msg) => {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 1800);
  };
  const setTheme = (t) => {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('theme', t); } catch (e) {}
  };
  const toggleTheme = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  $('#theme-toggle').addEventListener('click', toggleTheme);

  const copyEmail = async () => {
    try { await navigator.clipboard.writeText(EMAIL); toast('Email copied'); }
    catch (e) { location.href = 'mailto:' + EMAIL; }
  };
  $('#copy-email').addEventListener('click', copyEmail);

  const bar = $('.bar');
  addEventListener('scroll', () => bar.classList.toggle('scrolled', scrollY > 8), { passive: true });

  if (/Mac|iPhone|iPad/.test(navigator.platform)) $('#kbd-hint').textContent = '⌘ K';

  const navLinks = $$('.bar-nav a');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['work', 'now', 'path', 'stack', 'research', 'contact'].forEach((id) => { const s = document.getElementById(id); if (s) io.observe(s); });

  if (!reduced && 'IntersectionObserver' in window) {
    const rv = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); rv.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    $$('.case, .sec-head, .timeline li, .stack-col, .papers li, .stages li, .facts > div').forEach((el) => { el.classList.add('reveal'); rv.observe(el); });
  }

  /* ---------------- live GitHub status ---------------- */
  const ago = (iso) => {
    const s = (Date.now() - new Date(iso)) / 1000;
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago';
    return Math.round(s / 86400) + ' d ago';
  };
  async function liveStatus() {
    const el = $('#live-status');
    let data = store.get('gh-status');
    if (!data || Date.now() - data.t > 10 * 60 * 1000) {
      try {
        const runs = await Promise.all(REPOS.map((r) =>
          fetch(`https://api.github.com/repos/${USER}/${r}/actions/runs?per_page=5&branch=main`)
            .then((x) => x.ok ? x.json() : Promise.reject(x.status))
            .then((j) => {
              const run = (j.workflow_runs || []).find((w) => w.event === 'push' || w.event === 'pull_request') || (j.workflow_runs || [])[0];
              return { repo: r, conclusion: run ? run.conclusion || run.status : null, at: run ? run.updated_at : null };
            })));
        data = { t: Date.now(), runs };
        store.set('gh-status', data);
      } catch (e) { data = null; }
    }
    if (!data) {
      el.querySelector('.status-text').textContent = 'Live build status unavailable right now — see GitHub';
      return;
    }
    const pass = data.runs.filter((r) => r.conclusion === 'success').length;
    const latest = data.runs.map((r) => r.at).filter(Boolean).sort().pop();
    el.classList.toggle('ok', pass === data.runs.length);
    el.querySelector('.status-text').textContent =
      `Live from GitHub: ${pass}/${data.runs.length} builds passing` + (latest ? ` · last CI run ${ago(latest)}` : '');
    data.runs.forEach((r) => {
      const c = $(`.ci[data-repo="${r.repo}"]`);
      if (!c) return;
      c.classList.add(r.conclusion === 'success' ? 'ok' : 'bad');
      c.textContent = r.conclusion === 'success' ? 'CI passing' : (r.conclusion ? 'CI: ' + r.conclusion : '');
    });
  }
  liveStatus();

  /* ---------------- generic tablist helper ---------------- */
  function tabs(root, onSelect) {
    const btns = $$('button', root);
    const select = (b) => {
      btns.forEach((x) => x.setAttribute('aria-selected', x === b ? 'true' : 'false'));
      onSelect(b);
    };
    btns.forEach((b, i) => {
      b.addEventListener('click', () => select(b));
      b.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const n = btns[(i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length];
        n.focus(); select(n);
      });
    });
  }

  /* ---------------- 01 Bayesian network: missing sensors ---------------- */
  // artifacts/missing_sensor_study.csv — held-out ROC-AUC
  const MISS = ['0%', '20%', '40%', '60%'];
  const BN = {
    models: [
      { k: 'bn', name: 'Bayesian network' },
      { k: 'lr', name: 'Logistic regression' },
      { k: 'rf', name: 'Random forest' },
      { k: 'gb', name: 'Gradient boosting' },
    ],
    Flood:     { bn: [.8907, .8831, .8753, .8628], lr: [.9122, .8826, .8368, .7887], rf: [.9011, .8856, .8609, .8124], gb: [.9077, .8884, .8609, .7911] },
    Landslide: { bn: [.9118, .9064, .9037, .8956], lr: [.9180, .9062, .8921, .8736], rf: [.9142, .9012, .8845, .8448], gb: [.9199, .9020, .8891, .8596] },
    Cyclone:   { bn: [.9235, .9201, .8933, .8655], lr: [.9516, .9297, .8965, .8538], rf: [.9469, .9270, .8808, .8069], gb: [.9462, .9193, .8811, .8099] },
    Heatwave:  { bn: [.9292, .9335, .9272, .9279], lr: [.9870, .9185, .8485, .7752], rf: [.9830, .9546, .9256, .9063], gb: [.9858, .8720, .7726, .6667] },
  };
  let bnH = 'Flood', bnM = 0;
  function drawBN() {
    const host = $('#bn-chart'); host.textContent = '';
    const W = 560, rowH = 40, top = 8, left = 150, right = 70, chartW = W - left - right;
    const lo = .6, hi = 1.0, x = (v) => left + ((v - lo) / (hi - lo)) * chartW;
    const H = top + BN.models.length * rowH + 110;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    [.6, .7, .8, .9, 1].forEach((g) => {
      svg.append(svgEl('line', { x1: x(g), x2: x(g), y1: top - 4, y2: top + BN.models.length * rowH, class: 'grid' }));
      svg.append(svgEl('text', { x: x(g), y: top + BN.models.length * rowH + 16, 'text-anchor': 'middle' }, g.toFixed(1)));
    });
    const d = BN[bnH];
    const vals = BN.models.map((m) => d[m.k][bnM]);
    const best = Math.max(...vals);
    BN.models.forEach((m, i) => {
      const v = d[m.k][bnM], y = top + i * rowH;
      svg.append(svgEl('text', { x: left - 12, y: y + 20, 'text-anchor': 'end', class: 'lbl' }, m.name));
      const r = svgEl('rect', { x: left, y: y + 6, height: 22, rx: 4, width: 0, class: `bar ${m.k}${v === best ? '' : ' dim'}` });
      svg.append(r);
      requestAnimationFrame(() => r.setAttribute('width', Math.max(2, x(v) - left)));
      svg.append(svgEl('text', { x: x(v) + 8, y: y + 21, class: 'val' }, v.toFixed(3)));
    });
    // small multiples: trend across missing rates
    const sy = top + BN.models.length * rowH + 36, sh = 56, sx = (i) => left + (i / 3) * chartW;
    const all = BN.models.flatMap((m) => d[m.k]);
    const mn = Math.min(...all), mx = Math.max(...all);
    const yv = (v) => sy + sh - ((v - mn) / (mx - mn || 1)) * sh;
    svg.append(svgEl('text', { x: left - 12, y: sy + 10, 'text-anchor': 'end' }, 'trend'));
    MISS.forEach((t, i) => svg.append(svgEl('text', { x: sx(i), y: sy + sh + 18, 'text-anchor': 'middle' }, t)));
    svg.append(svgEl('line', { x1: sx(bnM), x2: sx(bnM), y1: sy - 4, y2: sy + sh + 4, class: 'grid', 'stroke-dasharray': '3 3' }));
    const colors = { bn: 'var(--c1)', lr: 'var(--c2)', rf: 'var(--c3)', gb: 'var(--c4)' };
    BN.models.forEach((m) => {
      const pts = d[m.k].map((v, i) => `${sx(i)},${yv(v)}`).join(' ');
      svg.append(svgEl('polyline', { points: pts, class: 'spark', stroke: colors[m.k], 'stroke-width': m.k === 'bn' ? 3 : 1.6, opacity: m.k === 'bn' ? 1 : .7 }));
      svg.append(svgEl('circle', { cx: sx(bnM), cy: yv(d[m.k][bnM]), r: m.k === 'bn' ? 4.5 : 3, fill: colors[m.k] }));
    });
    host.append(svg);
    const order = BN.models.map((m) => ({ m, v: d[m.k][bnM] })).sort((a, b) => b.v - a.v);
    const rank = order.findIndex((o) => o.m.k === 'bn') + 1;
    $('#bn-caption').textContent = rank === 1
      ? `${bnH}, ${MISS[bnM]} of readings missing: the Bayesian network is now the best model (AUC ${order[0].v.toFixed(3)}).`
      : `${bnH}, ${MISS[bnM]} missing: ${order[0].m.name.toLowerCase()} leads (${order[0].v.toFixed(3)}); the BN is #${rank}. Drag right to remove sensors.`;
  }
  tabs($('#bn-hazard'), (b) => { bnH = b.dataset.h; drawBN(); });
  $('#bn-miss').addEventListener('input', (e) => { bnM = +e.target.value; $('#bn-miss-out').textContent = MISS[bnM]; drawBN(); });
  drawBN();

  /* ---------------- 02 InterviewAce ---------------- */
  const IA_ALT = {
    resume: 'Resume analyzer: 98/100 ATS score with the rule behind every sub-score',
    report: 'Interview report: score per answer on five dimensions, with what to fix',
    dashboard: 'Dashboard: ATS score, interview average and weakest dimension',
    roadmap: 'Learning roadmap: gaps packed into the hours available each week',
  };
  tabs($('#ia-tabs'), (b) => {
    const img = $('#ia-img'), s = b.dataset.s;
    img.style.opacity = .2;
    const n = new Image(); n.src = `assets/${s}.webp`;
    n.onload = () => { img.src = n.src; img.alt = IA_ALT[s]; img.style.opacity = 1; };
  });
  ['report', 'dashboard', 'roadmap'].forEach((s) => { const i = new Image(); i.loading = 'lazy'; i.src = `assets/${s}.webp`; });
  const ATS = [
    ['Skill match', 40, 'do you have the skills the role asks for', 'var(--c1)'],
    ['Job description', 15, 'do you use the words in THIS posting', 'var(--c2)'],
    ['Parseability', 15, 'can software read the file at all', 'var(--c3)'],
    ['Impact', 15, 'do bullets show results, not duties', 'var(--c4)'],
    ['Fit', 15, 'experience and education against the level', 'var(--muted)'],
  ];
  const atsBar = $('.ats-bar');
  ATS.forEach(([name, w, why, c], i) => {
    const b = document.createElement('button');
    b.style.flex = w; b.style.background = c; b.textContent = w;
    b.setAttribute('aria-label', `${name}, ${w} points: ${why}`);
    const show = () => { $$('button', atsBar).forEach((x) => x.classList.remove('on')); b.classList.add('on'); $('#ats-note').textContent = `${name} · ${w} — ${why}`; };
    b.addEventListener('mouseenter', show); b.addEventListener('focus', show); b.addEventListener('click', show);
    if (i === 0) b.classList.add('on');
    atsBar.append(b);
  });

  /* ---------------- 03 UAV ablation ---------------- */
  // results/mujoco_summary.json → ablation.sweep (moving pad, 6 seeds)
  const ABL = [
    { name: "Base paper's fixed-gain PID", landed: 0, err: null },
    { name: '+ integral anti-windup', landed: 0, err: null },
    { name: '+ pad-velocity feed-forward', landed: 4, err: 9.0 },
    { name: '+ altitude gain scheduling', landed: 6, err: 6.5 },
  ];
  let ablK = 0;
  const steps = $('#abl-steps');
  ABL.forEach((s, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.innerHTML = `<span class="chk"></span><span>${s.name}</span><span class="res">${s.landed}/6</span>`;
    b.addEventListener('click', () => { ablK = i; drawAbl(); });
    li.append(b); steps.append(li);
  });
  function drawAbl() {
    $$('button', steps).forEach((b, i) => { b.classList.toggle('on', i <= ablK); b.setAttribute('aria-pressed', i <= ablK); });
    const s = ABL[ablK], seeds = $('#abl-seeds');
    seeds.textContent = '';
    for (let i = 0; i < 6; i++) {
      const d = document.createElement('span');
      d.className = 'seed ' + (i < s.landed ? 'ok' : 'fail');
      d.textContent = i < s.landed ? '✓' : '×';
      d.title = `seed ${i + 1}: ${i < s.landed ? 'landed' : 'aborted after 180 s'}`;
      seeds.append(d);
    }
    const b = document.createElement('b');
    b.textContent = s.landed ? `${s.landed}/6 landed · ${s.err.toFixed(1)} cm mean error` : '0/6 — the lag behind the pad never closes';
    seeds.append(b);
  }
  drawAbl();
  const vid = $('#uav video');
  if (vid) {
    if (reduced) vid.removeAttribute('autoplay');
    new IntersectionObserver(([e]) => { if (reduced) return; e.isIntersecting ? vid.play().catch(() => {}) : vid.pause(); }, { threshold: .25 }).observe(vid);
  }

  /* ---------------- 04 CIPL ---------------- */
  // paper table: ODIR-5K validation split
  const CIPL = [
    { id: 'C1', d: 'ResNet-101 · plain BCE', pre: true, auc: .7049, f1: .0000 },
    { id: 'C2', d: 'ResNet-101 · weighted loss', pre: true, auc: .7639, f1: .4883 },
    { id: 'C3', d: 'Custom CNN · prototypes', pre: false, auc: .7069, f1: .3703 },
    { id: 'C4', d: 'Custom CNN · + hard mask', pre: false, auc: .6022, f1: .2690 },
    { id: 'C5', d: 'Custom CNN · + soft/hard seg', pre: false, auc: .7031, f1: .3833 },
    { id: 'C6', d: 'ResNet-18 · CBAM + CAM', pre: true, auc: .8479, f1: .5446 },
    { id: 'C7', d: 'ResNet-18 · CBAM + regularised', pre: true, auc: .8501, f1: .5761 },
  ];
  let ciplM = 'auc';
  function drawCIPL() {
    const host = $('#cipl-chart'); host.textContent = '';
    const W = 560, rowH = 30, left = 230, right = 60, cw = W - left - right;
    const H = CIPL.length * rowH + 34;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}` });
    const max = ciplM === 'auc' ? 1 : .7, x = (v) => left + (v / max) * cw;
    CIPL.forEach((c, i) => {
      const y = i * rowH, v = c[ciplM];
      svg.append(svgEl('text', { x: 0, y: y + 18, class: 'val' }, c.id));
      svg.append(svgEl('text', { x: 30, y: y + 18, class: 'lbl' }, c.d));
      const r = svgEl('rect', { x: left, y: y + 6, height: 16, rx: 3, width: 0, class: 'bar ' + (c.pre ? 'lr' : 'bn') });
      svg.append(r); requestAnimationFrame(() => r.setAttribute('width', Math.max(2, x(v) - left)));
      svg.append(svgEl('text', { x: x(v) + 6, y: y + 18, class: 'val' }, v.toFixed(3)));
    });
    const ly = CIPL.length * rowH + 22;
    svg.append(svgEl('rect', { x: left, y: ly - 9, width: 10, height: 10, rx: 2, class: 'bar bn' }));
    svg.append(svgEl('text', { x: left + 16, y: ly }, 'trained from scratch'));
    svg.append(svgEl('rect', { x: left + 172, y: ly - 9, width: 10, height: 10, rx: 2, class: 'bar lr' }));
    svg.append(svgEl('text', { x: left + 188, y: ly }, 'ImageNet-pretrained'));
    host.append(svg);
  }
  tabs($('#cipl-metric'), (b) => { ciplM = b.dataset.m; drawCIPL(); });
  drawCIPL();

  /* ---------------- 05 GreenScale ---------------- */
  // README "Headline result": 400-job trace, seed 42
  const GS = {
    greenscale:  { label: 'GreenScale', co2: 18.38, cost: 374.29, delay: .42, saved: '72.5%',
                   v: 'Most of the carbon saving, almost none of the delay. This is the one you can actually ship.' },
    carbon_only: { label: 'Carbon only', co2: 17.33, cost: 375.40, delay: 2.41, saved: '74.0%',
                   v: '1.6 more points of CO₂ for 5.7× the average delay per job. Wins the table, loses the customer.' },
    cost_only:   { label: 'Cost only', co2: 41.98, cost: 323.82, delay: 0, saved: '37.1%',
                   v: 'Cheapest by far, and still cuts a third of the carbon — cheap regions are often clean ones.' },
    round_robin: { label: 'Round robin', co2: 45.21, cost: 364.80, delay: 0, saved: '32.2%',
                   v: 'Spreading load blindly helps a little, by accident.' },
    home_region: { label: 'Home region', co2: 66.69, cost: 382.95, delay: 0, saved: '—',
                   v: 'The baseline: nearest region, start now. What a small business gets when nobody schedules for it.' },
  };
  const gsSeg = $('#gs-policy');
  Object.entries(GS).forEach(([k, p], i) => {
    const b = document.createElement('button'); b.setAttribute('role', 'tab'); b.dataset.p = k; b.textContent = p.label;
    b.setAttribute('aria-selected', i === 0 ? 'true' : 'false'); gsSeg.append(b);
  });
  const gsHost = $('#gs-chart');
  const GS_ROWS = [
    ['kg CO₂', 'co2', 70, (v) => v.toFixed(2)],
    ['Cost (USD)', 'cost', 400, (v) => '$' + v.toFixed(0)],
    ['Avg delay', 'delay', 2.5, (v) => v.toFixed(2) + ' h'],
  ];
  gsHost.innerHTML = GS_ROWS.map(([k, key, max]) =>
    `<div class="gs-row"><span class="k">${k}</span><span class="track"><span class="fill" data-k="${key}"></span><span class="base" style="left:${(GS.home_region[key] / max) * 100}%" title="baseline"></span></span><span class="v" data-v="${key}"></span></div>`).join('') +
    '<p class="gs-verdict" id="gs-verdict"></p>';
  function drawGS(k) {
    const p = GS[k];
    GS_ROWS.forEach(([, key, max, fmt]) => {
      $(`.fill[data-k="${key}"]`, gsHost).style.width = Math.max(.5, (p[key] / max) * 100) + '%';
      $(`.v[data-v="${key}"]`, gsHost).textContent = fmt(p[key]);
    });
    $('#gs-verdict').textContent = (p.saved !== '—' ? `CO₂ saved vs baseline: ${p.saved}. ` : '') + p.v;
  }
  tabs(gsSeg, (b) => drawGS(b.dataset.p));
  drawGS('greenscale');

  /* ---------------- 06 polylag ---------------- */
  $('#pl-pipe').innerHTML = ['RSS feeds', 'rule match', 'not yet repriced?', 'risk gates', 'paper / live']
    .map((s) => `<span>${s}</span>`).join('<i>→</i>');
  const LAYERS = [
    ['L1', 'Per-trade gates', 'reject one order, keep running',
     'Size is the smallest of six limits (1% of equity, a $10 hard cap, per-market cap, 10% gross exposure, cash, 25% of visible depth). Orders are refused if the book is >1.5 s old, the headline >90 s old, or the websocket is down.'],
    ['L2', 'Daily halt', 'stops new entries until the next UTC day',
     'Triggered at a 2% loss of the day\'s opening equity. Open positions are still managed and exited — only new entries stop.'],
    ['L3', 'Kill switch', 'permanent, requires a human',
     'Latches on 6% drawdown from peak, an equity floor, or any unknown fill state. Everything is flattened and a KILL file is written; restarting does not clear it. Peak equity is persisted, so a restart never hands you a fresh drawdown allowance.'],
  ];
  const lay = $('#pl-layers');
  LAYERS.forEach(([id, t, s, note], i) => {
    const b = document.createElement('button');
    b.innerHTML = `<b>${id}</b><span>${t}</span><small>${s}</small>`;
    b.addEventListener('click', () => { $$('button', lay).forEach((x) => x.classList.toggle('on', x === b)); $('#pl-note').textContent = note; });
    if (i === 0) { b.classList.add('on'); $('#pl-note').textContent = note; }
    lay.append(b);
  });

  /* ---------------- stack ---------------- */
  const STACK = {
    'Languages': { Python: 'every project', TypeScript: 'InterviewAce, OpportunityOS', SQL: 'InterviewAce, DBMS portal', MATLAB: 'drone sim, matrix completion' },
    'ML / DL': { PyTorch: 'eye-disease diagnosis', 'scikit-learn': 'disaster BN baselines, GreenScale', 'TensorFlow / Keras': 'image forgery paper', pgmpy: 'disaster-risk BN', OpenCV: 'drone landing' },
    'AI systems': { 'LLM APIs': 'VoxAgent, InterviewAce', 'Speech-to-text / TTS': 'VoxAgent, InterviewAce', Twilio: 'VoxAgent phone calls', 'Provider-agnostic LLM layer': 'VoxAgent, InterviewAce, InternPilot' },
    'Backend & web': { FastAPI: 'InterviewAce, disaster BN, InternPilot', Flask: 'GreenScale', React: 'InterviewAce, InternPilot', 'Next.js + Prisma': 'OpportunityOS', SQLAlchemy: 'InterviewAce', PostgreSQL: 'OpportunityOS' },
    'Tooling': { 'GitHub Actions': 'CI on all six public repos', pytest: '318 public tests', Docker: 'GreenScale, OpportunityOS', MuJoCo: 'drone landing', Kaggle: 'eye-disease training' },
  };
  $('#stack-grid').innerHTML = Object.entries(STACK).map(([g, items]) =>
    `<div class="stack-col"><h4>${g}</h4><div class="chips">${Object.entries(items).map(([n, u]) =>
      `<span class="chip" tabindex="0">${n}<span class="used">used in: ${u}</span></span>`).join('')}</div></div>`).join('');

  /* ---------------- command palette ---------------- */
  const go = (id) => () => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); };
  const open = (u) => () => window.open(u, '_blank', 'noopener');
  const CMDS = [
    ['Disaster-risk Bayesian network', 'project', go('bn')],
    ['InterviewAce AI', 'project', go('interviewace')],
    ['Drone landing on moving pads', 'project', go('uav')],
    ['Eye-disease diagnosis (CIPL)', 'project', go('cipl')],
    ['GreenScale Cloud', 'project', go('greenscale')],
    ['polylag', 'project', go('polylag')],
    ['VoxAgent — now building', 'section', go('now')],
    ['Path', 'section', go('path')],
    ['Stack', 'section', go('stack')],
    ['Research papers', 'section', go('research')],
    ['Contact', 'section', go('contact')],
    ['Toggle dark mode', 'action', toggleTheme],
    ['Copy email address', 'action', copyEmail],
    ['Open GitHub profile', 'link', open(`https://github.com/${USER}`)],
    ...REPOS.map((r) => [`Open repo: ${r}`, 'link', open(`https://github.com/${USER}/${r}`)]),
  ];
  const pal = $('#palette'), palIn = $('#pal-in'), palList = $('#pal-list');
  let palSel = 0, palItems = [];
  const fuzzy = (q, s) => { q = q.toLowerCase(); s = s.toLowerCase(); let i = 0; for (const c of s) if (c === q[i]) i++; return i === q.length; };
  function renderPal() {
    const q = palIn.value.trim();
    palItems = CMDS.filter(([n, t]) => !q || fuzzy(q, n + ' ' + t));
    palSel = Math.min(palSel, Math.max(0, palItems.length - 1));
    palList.innerHTML = palItems.map(([n, t], i) => `<li role="option" data-i="${i}" class="${i === palSel ? 'sel' : ''}" aria-selected="${i === palSel}">${n}<small>${t}</small></li>`).join('')
      || '<li>No match</li>';
  }
  const openPal = () => { pal.hidden = false; palIn.value = ''; palSel = 0; renderPal(); palIn.focus(); };
  const closePal = () => { pal.hidden = true; };
  const runPal = (i) => { const c = palItems[i]; if (!c) return; closePal(); c[2](); };
  $('#open-palette').addEventListener('click', openPal);
  palIn.addEventListener('input', () => { palSel = 0; renderPal(); });
  palList.addEventListener('click', (e) => { const li = e.target.closest('li[data-i]'); if (li) runPal(+li.dataset.i); });
  pal.addEventListener('click', (e) => { if (e.target === pal) closePal(); });
  palIn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { palSel = (palSel + 1) % palItems.length; renderPal(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { palSel = (palSel - 1 + palItems.length) % palItems.length; renderPal(); e.preventDefault(); }
    else if (e.key === 'Enter') runPal(palSel);
  });
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.hidden ? openPal() : closePal(); }
    else if (e.key === 'Escape' && !pal.hidden) closePal();
    else if (e.key === '/' && pal.hidden && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); openPal(); }
  });

  /* ---------------- terminal ---------------- */
  const out = $('#term-out'), tin = $('#term-in'), tbody = $('#term-body');
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const print = (html, cls = '') => { const d = document.createElement('div'); d.className = 'line ' + cls; d.innerHTML = html; out.append(d); tbody.scrollTop = tbody.scrollHeight; };
  const PROJ = {
    bn: ['disaster-risk-bayesian-network', '18-node BN, live weather feeds, beats ML baselines once ~25% of sensors drop out'],
    interviewace: ['interviewace-ai', 'ATS scoring + voice mock interviews + study plan, works fully offline'],
    uav: ['uav-apriltag-landing-sim', 'MuJoCo drone lands on moving pads via onboard AprilTag vision, 40/40'],
    cipl: ['cipl-eye-disease-diagnosis', 'interpretable 8-disease fundus diagnosis with localisation maps'],
    greenscale: ['greenscale-cloud', 'carbon-aware scheduler + signed Merkle ledger, -72% CO2 in simulation'],
    polylag: ['polylag', 'measures news-to-market lag, paper mode, 3-layer risk manager'],
  };
  const T = {
    help: () => print([
      '<span class="hl">commands</span>',
      '  whoami        who is this',
      '  ls            list projects',
      '  open &lt;name&gt;   jump to a project (e.g. open bn)',
      '  now           what I\'m building',
      '  stack         tools I\'ve shipped with',
      '  papers        research',
      '  status        live CI status from GitHub',
      '  contact       how to reach me',
      '  theme         toggle dark mode',
      '  clear         clear the screen',
    ].join('\n')),
    whoami: () => print('Sai Reddy Annem — AI/ML engineering student, Amrita Vishwa Vidyapeetham (2028).\nI like models that survive contact with messy, real data.'),
    ls: () => print(Object.entries(PROJ).map(([k, [, d]]) => `<span class="hl">${k.padEnd(13)}</span>${esc(d)}`).join('\n')),
    open: (a) => {
      const k = (a[0] || '').toLowerCase();
      if (!PROJ[k]) return print(`usage: open &lt;${Object.keys(PROJ).join('|')}&gt;`, 'dim');
      print(`→ scrolling to ${k} · <a href="https://github.com/${USER}/${PROJ[k][0]}" target="_blank" rel="noopener">repo</a>`);
      go(k)();
    },
    now: () => print('VoxAgent — multilingual AI phone receptionist for Indian clinics & salons.\nEnglish, Telugu, Hindi · books appointments · real calls via Twilio. (private)'),
    stack: () => print(Object.entries(STACK).map(([g, i]) => `<span class="hl">${g}</span>: ${Object.keys(i).join(', ')}`).join('\n')),
    papers: () => print('IEEE ESCI 2026 — Q-learning for 4x4 Tic-Tac-Toe (co-author)\n  <a href="https://doi.org/10.1109/ESCI68015.2026.11493322" target="_blank" rel="noopener">doi:10.1109/ESCI68015.2026.11493322</a>\nIEEE Access — hybrid CNN-ViT image forgery detection (co-author, under review)'),
    status: () => {
      const d = store.get('gh-status');
      if (!d) return print('no data yet — GitHub API may be rate-limited', 'dim');
      print(d.runs.map((r) => `${r.conclusion === 'success' ? '<span class="hl">✓</span>' : '✗'} ${r.repo}`).join('\n'));
    },
    contact: () => print(`<a href="mailto:${EMAIL}">${EMAIL}</a> · <a href="https://github.com/${USER}" target="_blank" rel="noopener">github.com/${USER}</a>`),
    theme: () => { toggleTheme(); print('theme: ' + document.documentElement.dataset.theme, 'dim'); },
    clear: () => { out.textContent = ''; },
    sudo: () => print('nice try.', 'dim'),
    hire: () => T.contact(),
  };
  const hist = []; let hi = 0;
  $('#term-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = tin.value.trim(); tin.value = '';
    if (!raw) return;
    hist.push(raw); hi = hist.length;
    print(`<span class="cmd">$</span> ${esc(raw)}`);
    const [c, ...a] = raw.split(/\s+/);
    (T[c.toLowerCase()] || (() => print(`command not found: ${esc(c)} — try <span class="hl">help</span>`, 'dim')))(a);
  });
  tin.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && hi > 0) { tin.value = hist[--hi]; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { hi = Math.min(hist.length, hi + 1); tin.value = hist[hi] || ''; e.preventDefault(); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      const v = tin.value.toLowerCase(), m = Object.keys(T).filter((k) => k.startsWith(v));
      if (m.length === 1) tin.value = m[0] + ' ';
    }
  });
  tbody.addEventListener('click', () => { if (!getSelection().toString()) tin.focus({ preventScroll: true }); });

  // boot sequence
  const boot = [
    () => print('<span class="dim">portfolio v1 · plain JS, no framework</span>'),
    () => print('<span class="cmd">$</span> whoami'),
    () => T.whoami(),
    () => print('<span class="cmd">$</span> ls'),
    () => T.ls(),
    () => print('\nType <span class="hl">help</span> for more, or <span class="hl">open bn</span> to jump to a project.', 'dim'),
  ];
  if (reduced) boot.forEach((f) => f());
  else boot.forEach((f, i) => setTimeout(f, 300 + i * 380));
})();
