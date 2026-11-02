// Explore Complete Setups, stage X0 cost spike (lane OX2, 2026-11-02). Measures, changes no app code, writes no file in the repo.
//   node scripts/explore-spike.mjs pool   out=pool.json     (pure: no browser) the candidate pool: size, build time, survivors under limit sets
//   node scripts/explore-spike.mjs gen    out=gen.json      (pure) cross-check: the REAL generator (suggestSetups) under the same limit sets: its pool size, wall time, kinds
//   node scripts/explore-spike.mjs gen    out=gen.json      (pure) cross-check: the REAL generator (suggestSetups) under the same limit sets: pool size, wall time, kinds
//   node scripts/explore-spike.mjs render out=render.json   (one headless browser, one page) 6-card batch + "Show more" batch: buildMs / shotMs
// Both through the machine-load rule:  powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/explore-spike.mjs ...
//
// The pool is APPROXIMATED here (lane OX3 is adding candidatePool / evaluateCandidate to src/demand/suggest.ts in parallel). A candidate = one buildable VD
// archetype (scene/archetypes.ts, recipeLook) in one catalogue tank, stocked with `stockingSuggestion` (ui/discovery/animals.ts: up to 3 kinds that suit each
// other at their group minimums), drawn by `recipeBase(a, tank, roster)` (scene/recipes.ts, the density trio; Balanced is the card), costed from the SCENE by
// `demandOf` (the way briefFeasibility.ts `consequence` costs any scene), gated by the generator's own two gates: the strict welfare rule (`summaryOf`: no Problem
// or Caution in the five stocking categories, suggest.ts `wordsOf`) and `compliance` on the firm limits. Differences from the real pool (see the report): no
// owned-gear credit, no finish ladder / strategies (one concept per archetype x tank), no sales tax, the stand is whatever `demandOf` prices.
//
// Options (key=value): tanks=3 (sizes per archetype)  only=id,id (archetypes)  out=file.json  (render:) gl=d3d11,d3d11,swiftshader (one fresh browser per entry)  batch=6  port=5631
import { spawn, execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { cpus, tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2), mode = argv[0];
// options as `--key value` or `key=value` (lowprio.ps1's PowerShell parameter binder swallows `--out`)
const opt = (k, d) => { const e = argv.find(x => x.startsWith(k + '=')); if (e) return e.slice(k.length + 1); const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const OUT = opt('out', `explore-spike-${mode}.json`), NTANKS = +opt('tanks', 3), BATCH = +opt('batch', 6), ONLY = opt('only')?.split(',');
const T0 = Date.now(), log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(0).padStart(4)} s]`, ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const NOW = Date.parse('2026-11-02T12:00:00Z');

// ---------- machine load, as in perf-baseline.mjs ----------
function cpuBusy(ms = 1000) {
  const snap = () => cpus().reduce((a, c) => { const t = c.times; a.idle += t.idle; a.all += t.user + t.nice + t.sys + t.idle + t.irq; return a; }, { idle: 0, all: 0 });
  const a = snap(), end = Date.now() + ms; while (Date.now() < end) { /* busy-wait: sync helper */ }
  const b = snap(); return Math.round(100 * (1 - (b.idle - a.idle) / (b.all - a.all)));
}
function machineLoad() {
  const sh = c => { try { return execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return ''; } };
  const tasks = sh('tasklist /fo csv /nh').split('\n').map(l => l.split('","')[0]?.replace(/^"/, '').toLowerCase()).filter(Boolean);
  const count = n => tasks.filter(t => t === n).length;
  return { at: new Date().toISOString(), cpuBusyPct: cpuBusy(), node: count('node.exe'), msedge: count('msedge.exe'), chrome: count('chrome.exe') };
}
const stat = a => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y), q = p => s[Math.min(s.length - 1, Math.floor(p * s.length))], sum = a.reduce((x, y) => x + y, 0);
  return { n: a.length, total: Math.round(sum), mean: Math.round(sum / a.length), median: Math.round(q(0.5)), p95: Math.round(q(0.95)), max: Math.round(s[s.length - 1]) };
};

const { createServer } = await import('vite');

// =====================================================================================================================
if (mode === 'pool') {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  const load = p => server.ssrLoadModule(p);
  try {
    const A = await load('/src/scene/archetypes.ts'), R = await load('/src/scene/recipes.ts'), AN = await load('/src/ui/discovery/animals.ts');
    const TF = await load('/src/scene/tankfit.ts'), TK = await load('/src/data/tanks.ts'), ENG = await load('/src/demand/engine.ts'), TY = await load('/src/demand/types.ts');
    const RG = await load('/src/demand/range.ts'), SS = await load('/src/ui/stockSummary.ts'), CO = await load('/src/scene/constraints.ts'), SP = await load('/src/scene/space.ts');
    const BU = await load('/src/scene/builds.ts'), TL = await load('/src/ui/discovery/tiles.ts');
    const P = TY.defaultProfile(), load0 = machineLoad();
    log('load at start', JSON.stringify(load0));

    const buildable = A.ARCHETYPES.filter(a => a.support !== 'coming-soon' && R.recipeLook(a) && (!ONLY || ONLY.includes(a.id)));
    const worldOf = a => a.env === 'aquarium' ? (a.water === 'saltwater' ? 'SW' : a.water === 'brackish' ? 'BK' : 'FW') : a.env === 'terrarium' ? 'TE' : 'PA';
    log(`buildable archetypes: ${buildable.length}`, JSON.stringify(Object.fromEntries(['FW', 'SW', 'BK', 'TE', 'PA'].map(w => [w, buildable.filter(a => worldOf(a) === w).length]))));

    // tank sizes per archetype: the smallest that meets the archetype's own minimum, then about 2x and 4x that (an aquarium: at least 29 and 55 gal, so a tiny-minimum
    // look is also seen in a normal tank), the nearest catalogue sizes, de-duplicated; `--tanks 2` keeps the first two.
    const sizesOf = a => {
      const land = a.env === 'terrarium', all = TF.catalogueSizes(land).map(c => c.m), min = R.minTank(a), g0 = min.ratedGal;
      const want = land ? [g0, g0 * 2, g0 * 4] : [g0, Math.max(g0 * 2, 29), Math.max(g0 * 4, 55)];
      const pick = g => all.find(m => m.ratedGal >= g) ?? all[all.length - 1];
      return [...new Map(want.map(pick).map(m => [m.id, m])).values()].slice(0, NTANKS);
    };

    const cands = [], tm = { roster: [], scene: [], sceneInHand: [], cost: [], gate: [] };
    let firstCall = true;
    const tPool0 = performance.now();
    for (const a of buildable) for (const tank of sizesOf(a)) {
      const c = { archetype: a.id, name: a.name, family: a.familyId, world: worldOf(a), tank: tank.name, gal: Math.round(tank.ratedGal) };
      // 1. the roster (what a card names): the archetype's stocking suggestion (3 kinds, then fewer while the strict welfare rule still words a Problem / Caution on the
      // generator's balanced build), else its focal animal; brackish has none (no brackish species flag). `floorUsd` = the cheapest build that meets the animals' needs, no finish.
      const words = cats => cats.some(x => x.level === 'problem' || x.level === 'caution');
      let t = performance.now(), roster = [], kinds = 0;
      if (a.water !== 'brackish') for (kinds = 3; kinds >= 1; kinds--) {
        const r = AN.stockingSuggestion(a, tank, kinds); if (!r.length) continue;
        if (!words(SS.summaryOf(BU.buildsFor(r, tank, NOW)[2].setup, 'in').cats)) { roster = r; break; }
      }
      if (!roster.length) { roster = R.focalAnimals(a, tank); kinds = roster.length ? 0 : -1; }
      c.rosterMs = performance.now() - t; c.roster = roster.map(r => `${r.n} ${r.species}`); c.kinds = kinds;
      if (roster.length) c.floorUsd = Math.min(...BU.distinctBuilds(BU.buildsFor(roster, tank, NOW)).filter(BU.meetsNeeds).map(b => b.setupUsd));
      // 2. the scene (the card's look at Balanced; recipeBase draws the whole density trio and searches composition seeds, so this is an upper bound for one density)
      t = performance.now();
      const base = R.recipeBase(a, tank, roster, NOW);
      c.sceneMs = performance.now() - t;
      if (!base) { c.fail = 'no recipeBase'; cands.push(c); continue; }
      const S = R.sceneAt(base, 'balanced');
      c.snapKB = JSON.stringify(S).length / 1024;
      // the cheaper scene path the discovery flow uses when animals are in hand (tiles.ts previewOf(a, tank, inHand): the roster's balanced build, the look laid over it, no seed search)
      if (roster.length) { const t1 = performance.now(); TL.previewOf(a, tank, BU.buildsFor(roster, tank, NOW)[2].setup); c.handMs = performance.now() - t1; }
      // 3. the figures, from the scene
      t = performance.now();
      const D = ENG.demandOf(S, P, { now: NOW }), tot = D.totals;
      const hiOf = (key, mean) => D.items.reduce((s, i) => s + (i[key] ? i[key].hi - RG.mean3(i[key]) : 0), 0) + mean;
      c.setup = tot.setupUsd; c.monthly = tot.upkeepUsdMo; c.min = tot.minPerWeek;
      c.setupHi = hiOf('setup', tot.setupUsd); c.monthlyHi = hiOf('upkeep', tot.upkeepUsdMo); c.minHi = hiOf('minutes', tot.minPerWeek);
      c.costMs = performance.now() - t;
      { const Do = ENG.demandOf(R.sceneAt(base, 'open'), P, { now: NOW }); c.setupOpen = Do.totals.setupUsd; c.setupOpenHi = Do.items.reduce((x, i) => x + (i.setup ? i.setup.hi - RG.mean3(i.setup) : 0), 0) + Do.totals.setupUsd; }
      // 4. the welfare gate
      t = performance.now();
      const cats = SS.summaryOf(S, 'in').cats;
      c.welfare = !cats.some(x => x.level === 'problem' || x.level === 'caution');
      c.unknownLines = cats.flatMap(x => x.items.filter(i => i.level === 'unknown')).length;
      c.gateMs = performance.now() - t;
      c.animals = S.fish.length; c.outer = tank.outer;       // mm L x D x H (footprint)
      c.cover = R.coverOf(S);
      if (firstCall) { c.cold = true; firstCall = false; }
      for (const [k, v] of [['roster', c.rosterMs], ['scene', c.sceneMs], ['sceneInHand', c.handMs], ['cost', c.costMs], ['gate', c.gateMs]]) if (!c.cold && v !== undefined) tm[k].push(v);
      cands.push(c);
    }
    const poolMs = performance.now() - tPool0;
    log(`pool built: ${cands.length} candidates in ${(poolMs / 1000).toFixed(1)} s`);

    // ---- limit sets: firm limits. Money / minutes on the mean ("mean") and on the high end of the range ("hi", the Q1 rule); space exact. ----
    const IN = 25.4, space = (w, d) => ({ w: w * IN, d: d * IN });
    const fits = (c, sp) => { const o = c.outer; return (o.L <= sp.w && o.D <= sp.d) || (o.L <= sp.d && o.D <= sp.w); };
    // `src` = which set-up figure the money limit reads: 'bal' the Balanced scene (the card as drawn), 'open' the Open-density scene, 'floor' the cheapest build with no finish
    const usd = (c, hi, src) => src === 'floor' ? c.floorUsd : src === 'open' ? (hi ? c.setupOpenHi : c.setupOpen) : (hi ? c.setupHi : c.setup);
    const SETS = {
      'none (no limits)': () => true,
      'firm $300 startup': (c, hi, src) => usd(c, hi, src) <= 300,
      'firm $600 startup': (c, hi, src) => usd(c, hi, src) <= 600,
      'firm 36 x 18 in space': c => fits(c, space(36, 18)),
      'firm 30 min/week care': (c, hi) => (hi ? c.minHi : c.min) <= 30,
      'firm $120/month': (c, hi) => (hi ? c.monthlyHi : c.monthly) <= 120,
      'tight: $300 + 30 min + 36 x 18 in': (c, hi, src) => usd(c, hi, src) <= 300 && (hi ? c.minHi : c.min) <= 30 && fits(c, space(36, 18)),
      'roomy: $600 + 60 min + 48 x 24 in': (c, hi, src) => usd(c, hi, src) <= 600 && (hi ? c.minHi : c.min) <= 60 && fits(c, space(48, 24)),
    };
    const WORLDS = ['FW', 'SW', 'BK', 'TE', 'PA'], ok = cands.filter(c => !c.fail);
    // a card needs animals (the spec: complete, stocked): a candidate with an empty roster is not a candidate (brackish today)
    const stocked = ok.filter(c => c.animals > 0), eligible = stocked.filter(c => c.welfare);
    const survivors = {};
    for (const [name, f] of Object.entries(SETS)) for (const [src, hi] of [['bal', false], ['bal', true], ['open', true], ['floor', false]]) {
      const key = `${name} [${src} ${hi ? 'hi' : 'mean'}]`, row = { all: { cands: 0, archetypes: new Set() } };
      for (const w of WORLDS) row[w] = { cands: 0, archetypes: new Set() };
      for (const c of eligible) if (f(c, hi, src)) { row.all.cands++; row.all.archetypes.add(c.archetype); row[c.world].cands++; row[c.world].archetypes.add(c.archetype); }
      survivors[key] = Object.fromEntries(Object.entries(row).map(([k, v]) => [k, { cands: v.cands, archetypes: v.archetypes.size }]));
      survivors[key].worlds = WORLDS.filter(w => row[w].cands > 0).length;
    }
    // budget curve (mean and hi)
    const curve = [100, 150, 200, 300, 400, 600, 1000, 1500, 3000].map(cap => ({ cap, mean: eligible.filter(c => c.setup <= cap).length, hi: eligible.filter(c => c.setupHi <= cap).length,
      archetypesHi: new Set(eligible.filter(c => c.setupHi <= cap).map(c => c.archetype)).size, worldsHi: WORLDS.filter(w => eligible.some(c => c.world === w && c.setupHi <= cap)).length,
      floor: eligible.filter(c => c.floorUsd <= cap).length, archetypesFloor: new Set(eligible.filter(c => c.floorUsd <= cap).map(c => c.archetype)).size, worldsFloor: WORLDS.filter(w => eligible.some(c => c.world === w && c.floorUsd <= cap)).length }));
    const byWorld = Object.fromEntries(WORLDS.map(w => {
      const all = cands.filter(c => c.world === w), st = all.filter(c => c.animals > 0), el = st.filter(c => c.welfare);
      return [w, { archetypes: new Set(all.map(c => c.archetype)).size, candidates: all.length, stocked: st.length, welfarePass: el.length, welfareFail: st.length - el.length, unstocked: all.length - st.length,
        setupMedian: stat(el.map(c => c.setup))?.median, setupP10: Math.round(el.map(c => c.setup).sort((a, b) => a - b)[Math.floor(el.length * 0.1)] ?? 0), setupMin: Math.round(Math.min(...el.map(c => c.setup))),
        minMedian: stat(el.map(c => c.min))?.median, minMin: Math.round(Math.min(...el.map(c => c.min))), monthlyMedian: stat(el.map(c => c.monthly))?.median }];
    }));

    const res = { when: new Date().toISOString(), now: new Date(NOW).toISOString(), buildable: buildable.length, tanksPerArchetype: NTANKS, load: { start: load0, end: machineLoad() },
      pool: { candidates: cands.length, stocked: stocked.length, welfareEligible: eligible.length, failures: cands.filter(c => c.fail).length, totalMs: Math.round(poolMs), coldCandidateMs: Math.round((cands.find(c => c.cold)?.sceneMs ?? 0) + (cands.find(c => c.cold)?.rosterMs ?? 0)) },
      timing: Object.fromEntries(Object.entries(tm).filter(([, v]) => v.length).map(([k, v]) => [k, stat(v)])), 
      sceneByWorld: Object.fromEntries(WORLDS.map(w => [w, stat(cands.filter(c => c.world === w && !c.cold && c.sceneMs).map(c => c.sceneMs))])),
      handByWorld: Object.fromEntries(WORLDS.map(w => [w, stat(cands.filter(c => c.world === w && !c.cold && c.handMs).map(c => c.handMs))])), snapKB: stat(cands.filter(c => c.snapKB).map(c => c.snapKB)),
      byWorld, survivors, curve, candidates: cands.map(c => ({ ...c, outer: undefined })) };
    writeFileSync(OUT, JSON.stringify(res, null, 1));
    log('wrote', OUT);
    console.log(JSON.stringify({ pool: res.pool, timing: res.timing }, null, 1));
  } finally { await server.close(); }
  process.exit(0);
}

// =====================================================================================================================
// GEN: the real generator as a cross-check on the approximated pool. `stats.pool` = concepts that passed every gate (archetype x tank x finish tier x look), after
// strategies and the finish ladder; the 23 demand concepts are its own registry (no paludarium, no brackish), so counts are NOT comparable one to one with the VD pool.
if (mode === 'gen') {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
  const load = p => server.ssrLoadModule(p);
  try {
    const SG = await load('/src/demand/suggest.ts'), TY = await load('/src/demand/types.ts');
    const P = TY.defaultProfile(), IN = 25.4, load0 = machineLoad();
    const cap = (value, on = true) => ({ on, value });
    const mk = (o = {}) => ({ constraints: { ...(o.usd ? { startupUsd: cap(o.usd) } : {}), ...(o.mo ? { monthlyUsd: cap(o.mo) } : {}), ...(o.min ? { minutesPerWeek: cap(o.min) } : {}), ...(o.sp ? { space: { on: true } } : {}) }, ...(o.sp ? { space: { w: o.sp[0] * IN, d: o.sp[1] * IN } } : {}) });
    const SETS = { 'none': mk(), 'firm $300 startup': mk({ usd: 300 }), 'firm $600 startup': mk({ usd: 600 }), 'firm 36 x 18 in space': mk({ sp: [36, 18] }), 'firm 30 min/week care': mk({ min: 30 }), 'firm $120/month': mk({ mo: 120 }),
      'tight: $300 + 30 min + 36 x 18 in': mk({ usd: 300, min: 30, sp: [36, 18] }), 'roomy: $600 + 60 min + 48 x 24 in': mk({ usd: 600, min: 60, sp: [48, 24] }) };
    const KINDS = ['freshwater', 'saltwater', 'terrarium', 'vivarium'], res = {};
    SG.suggestSetups(mk(), P, 'in', NOW);   // warm: module caches and the builds memo
    for (const [name, w] of Object.entries(SETS)) {
      const row = { name }; let t = performance.now();
      const all = SG.suggestSetups(w, P, 'in', NOW); row.ms = Math.round(performance.now() - t);
      row.pool = all.stats.pool; row.archetypes = all.qualified.length; row.kinds = all.kinds; row.shown = all.proposals.length; row.rejectedWelfare = all.stats.rejectedWelfare; row.rejectedConstraint = all.stats.rejectedConstraint;
      row.cheapest = all.cheapest ? Math.round(all.cheapest.totals.startupUsd) : null;
      row.perKind = Object.fromEntries(KINDS.map(k => { const r = SG.suggestSetups({ ...w, kinds: [k] }, P, 'in', NOW); return [k, { pool: r.stats.pool, archetypes: r.qualified.length }]; }));
      res[name] = row; log(name, JSON.stringify(row));
    }
    writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), load: { start: load0, end: machineLoad() }, res }, null, 1)); log('wrote', OUT);
  } finally { await server.close(); }
  process.exit(0);
}

// =====================================================================================================================
// RENDER: the dev server + one headless browser on one page. The picture path is the discovery flow's own: Previews (ui/discovery/tiles.ts) with the
// `shot` host callback of panels.ts (the scene put in the store for one draw, viewer.thumbnail(480), the tank put back).
if (mode === 'render') {
  // gl=d3d11,d3d11,swiftshader: one fresh browser (fresh profile = cold GPU shader cache) per entry, one after another, sharing one dev server. The dev server transforms each module on first
  // request, so the FIRST entry's cold numbers include that (a production build has none): a second d3d11 entry is the cold-GPU number without it.
  const GLS = opt('gl', 'd3d11,d3d11').split(','), PORT = +opt('port', 5631), SAVE = !!opt('save'), SETTLE = +opt('settle', 3000);   // save=dir: also write each card's picture there (to LOOK at them: a blank frame is 3 kB)
  const BROWSERS = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'];
  const exe = process.env.BROWSER_EXE ?? BROWSERS.find(existsSync);
  if (!exe) { console.error('No Edge or Chrome found; set BROWSER_EXE.'); process.exit(1); }
  const dev = await createServer({ root: process.cwd(), server: { port: PORT, strictPort: true }, logLevel: 'error' });
  await dev.listen();
  // the measuring page code: the discovery flow's own picture path = Previews (ui/discovery/tiles.ts) with the `shot` host callback of panels.ts (the scene put in the store for one draw,
  // viewer.thumbnail(480), the tank put back). The roster of every card is made BEFORE the timer (it belongs to the pool, measured by `pool`).
  const PAGE = `(async () => {
      const A = await import('/src/scene/archetypes.ts'), R = await import('/src/scene/recipes.ts'), AN = await import('/src/ui/discovery/animals.ts');
      const TF = await import('/src/scene/tankfit.ts'), TL = await import('/src/ui/discovery/tiles.ts'), BU = await import('/src/scene/builds.ts');
      const { store, viewer } = window.__gb, gl = viewer.renderer.getContext(), dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown';
      const shot = T => {
        const orig = structuredClone(store.tank), put = S => store.update(s => { Object.assign(s.tanks[s.active], structuredClone(S), { brief: orig.brief }); }, { history: false });
        try { put(T); return viewer.thumbnail(480); } finally { put(orig); }
      };
      // the app has drawn its own first frames before the first card (a thumbnail taken in the first moments of a GPU page can be a blank frame)
      for (let i = 0; i < 4; i++) await new Promise(r => requestAnimationFrame(() => r()));
      await new Promise(r => setTimeout(r, ${SETTLE}));
      const buildable = A.ARCHETYPES.filter(a => a.support !== 'coming-soon' && R.recipeLook(a) && a.water !== 'brackish');
      const tankOf = a => { const land = a.env === 'terrarium', all = TF.catalogueSizes(land).map(c => c.m), g = R.minTank(a).ratedGal, want = land ? g : Math.max(g, 29); return all.find(m => m.ratedGal >= want) ?? all[all.length - 1]; };
      const worldOf = a => a.env === 'aquarium' ? (a.water === 'saltwater' ? 'SW' : 'FW') : a.env === 'terrarium' ? 'TE' : 'PA';
      const want1 = ['FW', 'FW', 'SW', 'TE', 'PA', 'FW'], want2 = ['FW', 'SW', 'FW', 'TE', 'PA', 'FW'];
      const used = new Set(), famUsed = new Set(), pickFor = wants => wants.map(w => { const a = buildable.find(x => worldOf(x) === w && !used.has(x.id) && !famUsed.has(x.familyId)) ?? buildable.find(x => worldOf(x) === w && !used.has(x.id)); used.add(a.id); famUsed.add(a.familyId); return a; });
      const batches = [pickFor(want1.slice(0, ${BATCH})), pickFor(want2.slice(0, ${BATCH}))];
      const t0r = performance.now(), hands = new Map();
      for (const a of batches.flat()) { const tank = tankOf(a); let r = a.water === 'brackish' ? [] : AN.stockingSuggestion(a, tank); if (!r.length) r = R.focalAnimals(a, tank); hands.set(a.id, { tank, hand: r.length ? BU.buildsFor(r, tank)[2].setup : undefined }); }
      const rosterMs = Math.round(performance.now() - t0r);
      const pv = new TL.Previews(shot), batchesOut = [];
      for (let bi = 0; bi < batches.length; bi++) {
        const tB = performance.now(), cards = [];
        for (const a of batches[bi]) {
          const { tank, hand } = hands.get(a.id), t0 = performance.now(), r = pv.render(a, 2, tank, hand), wall = performance.now() - t0, lg = pv.log[pv.log.length - 1];
          cards.push({ id: a.id, world: worldOf(a), tank: tank.name, animals: hand?.fish.length ?? 0, ok: !!r, kB: r ? Math.round(r.url.length / 1024) : 0, ...(${SAVE} && r ? { url: r.url } : {}), wallMs: Math.round(wall), buildMs: lg?.buildMs, shotMs: lg?.shotMs });
        }
        await new Promise(r => requestAnimationFrame(() => r()));
        batchesOut.push({ batch: bi + 1, totalMs: Math.round(performance.now() - tB), cards });
      }
      // batch 1 again in a fresh Previews: scenes rebuilt and drawn with the shaders / textures warm (a second visit), then once more from the cache
      const tW = performance.now(), pv2 = new TL.Previews(shot), again = [];
      for (const a of batches[0]) { const { tank, hand } = hands.get(a.id), t0 = performance.now(); pv2.render(a, 2, tank, hand); const lg = pv2.log[pv2.log.length - 1]; again.push({ id: a.id, wallMs: Math.round(performance.now() - t0), buildMs: lg?.buildMs, shotMs: lg?.shotMs }); }
      const rebuiltMs = Math.round(performance.now() - tW), tC = performance.now();
      for (const a of batches[0]) { const { tank, hand } = hands.get(a.id); pv2.render(a, 2, tank, hand); }
      return { renderer, viewport: [innerWidth, innerHeight], canvas: [viewer.canvas.width, viewer.canvas.height], rosterMs, batches: batchesOut, warmRerender: { totalMs: rebuiltMs, cards: again }, cachedRepeatMs: Math.round(performance.now() - tC) };
    })()`;
  const runs = [];
  try {
    for (const GL of GLS) {
      const profile = mkdtempSync(join(tmpdir(), 'ox2-'));
      const proc = spawn(exe, ['--headless=new', `--use-angle=${GL}`, '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--no-first-run', '--no-default-browser-check',
        '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-extensions',
        '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
      try {
        const portFile = join(profile, 'DevToolsActivePort');
        for (let i = 0; i < 200 && !existsSync(portFile); i++) await sleep(100);
        const [port, path] = readFileSync(portFile, 'utf8').trim().split('\n');
        const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`);
        await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
        let id = 0; const pending = new Map();
        ws.onmessage = e => { const m = JSON.parse(e.data); const p = m.id && pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
        const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
        const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
        const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
        const s = (m, p) => send(m, p, sessionId);
        await s('Page.enable'); await s('Runtime.enable');
        await s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
        const ev = async (expression, timeout = 600_000) => {
          const r = await s('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout });
          if (r.exceptionDetails) throw new Error(`page: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
          return r.result.value;
        };
        const load0 = machineLoad(); log(`run ${runs.length + 1} (${GL}), load at start`, JSON.stringify(load0));
        await s('Page.navigate', { url: `http://localhost:${PORT}/` });
        for (let i = 0; i < 300; i++) { if (await ev('!!window.__gb && !!window.__gb.viewer').catch(() => false)) break; await sleep(200); }
        const out = await ev(PAGE);
        if (SAVE) for (const b of out.batches) for (const c of b.cards) { if (c.url) writeFileSync(join(opt('save'), `${runs.length + 1}-${GL}-b${b.batch}-${c.id}.jpg`), Buffer.from(c.url.split(',')[1], 'base64')); delete c.url; }
        runs.push({ gl: GL, load: { start: load0, end: machineLoad() }, ...out });
        log(`run ${runs.length} done: ${out.renderer}; batch 1 ${out.batches[0].totalMs} ms, batch 2 ${out.batches[1].totalMs} ms, warm re-render ${out.warmRerender.totalMs} ms`);
        try { await send('Browser.close'); } catch { /* gone */ }
      } finally { try { proc.kill(); } catch { /* gone */ } await sleep(800); try { rmSync(profile, { recursive: true, force: true }); } catch { /* locked */ } }
    }
    writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), browser: exe, runs }, null, 1)); log('wrote', OUT);
  } finally { try { await dev.close(); } catch { /* gone */ } }
  process.exit(0);
}
console.error('usage: node scripts/explore-spike.mjs pool|gen|render [out=file.json]'); process.exit(1);
