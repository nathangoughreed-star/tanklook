// Moved numbers (S224, 2026-10-26): the engine readings a tank-library or engine change can move, to compare a branch with main.
//   node scripts/moved-numbers.mjs out.json [--now 2026-10-26]   dump, run once on main and once on the branch (same --now):
//     tankFor, its step-ups and the builds at 1/3/6/12/25/50 of every species; starters at the Full stop for every non-land style x
//     generic catalogue tank x seeds 1-3; the default sump of every catalogue tank; the example scenes' stocking, setup cost and tank row
//   node scripts/moved-numbers.mjs --diff main.json branch.json [out.txt]   every row that changed, before -> after, counted by section
import { readFileSync, writeFileSync } from 'node:fs';

const arg = process.argv.slice(2);
if (arg[0] === '--diff') {
  const [a, b] = [arg[1], arg[2]].map(p => JSON.parse(readFileSync(p, 'utf8')));
  const show = v => (v === undefined ? '(none)' : typeof v === 'string' ? v : JSON.stringify(v));
  const lines = [], counts = [];
  for (const sec of Object.keys(a)) {
    const keys = [...new Set([...Object.keys(a[sec]), ...Object.keys(b[sec] ?? {})])];
    const moved = keys.filter(k => show(a[sec][k]) !== show(b[sec]?.[k]));
    for (const k of moved) lines.push(`${sec} | ${k}\n    before: ${show(a[sec][k])}\n    after:  ${show(b[sec]?.[k])}`);
    counts.push(`${sec} ${moved.length} of ${keys.length}`);
  }
  const head = 'changed rows: ' + counts.join(', ');
  if (arg[3]) writeFileSync(arg[3], head + '\n\n' + lines.join('\n') + '\n');
  console.log(head);
  process.exit(0);
}

const day = arg.includes('--now') ? arg[arg.indexOf('--now') + 1] : new Date().toISOString().slice(0, 10);
const NOW = Date.parse(day + 'T12:00:00Z');
const { createServer } = await import('vite');
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const load = p => server.ssrLoadModule(p);
try {
  const [tf, bd, sp, tk, df, st, it, sg, sk, tc, ex, exs, va, dm] = await Promise.all(['/src/scene/tankfit.ts', '/src/scene/builds.ts', '/src/data/species.ts',
    '/src/data/tanks.ts', '/src/scene/defaults.ts', '/src/scene/starter.ts', '/src/scene/items.ts', '/src/scene/scapeground.ts', '/src/scene/stocking.ts',
    '/src/scene/tech.ts', '/src/examples/index.ts', '/src/examples/scenes.ts', '/src/scene/validate.ts', '/src/demand/index.ts'].map(load));
  Date.now = () => NOW; // sale windows (tankSaleFor, the demand model) read the clock
  const out = { tankFor: {}, steps: {}, builds: {}, starters: {}, sumps: {}, examples: {} };
  const r1 = x => (x == null ? null : Math.round(x * 10) / 10);
  for (const s of sp.SPECIES) for (const n of [1, 3, 6, 12, 25, 50]) {
    const a = [{ species: s.id, n }], key = `${s.id} x${n}`, f = tf.tankFor(a);
    if (!f) continue;
    out.tankFor[key] = { tank: f.tank.id, fails: f.fails.join(','), space: r1(f.spacePct), filt: r1(f.filtrationPct), min: r1(f.minPct) };
    out.steps[key] = tf.stepUps(a, f.tank).map(u => `${u.tank.id} +$${u.costDeltaUsd}`).join('; ');
    out.builds[key] = bd.buildsFor(a, f.tank, NOW).map(b => `${b.id} ${b.tank.id} $${b.setupUsd}/${b.listUsd} filt ${r1(b.filtrationPct)} space ${r1(b.spacePct)}`
      + `${b.tankDeal ? ` deal ${b.tankDeal.retailer} $${b.tankDeal.usd}` : ''}${b.bundle ? ` bundle ${b.bundle.retailer}` : ''}`).join(' | ');
  }
  const generic = tk.TANK_MODELS.filter(m => !m.terrarium && (m.shape ?? 'rect') === 'rect' && /^[\d.]+ (gal|ft)/.test(m.name)); // the engine's candidates
  for (const id of Object.keys(it.STYLES)) {
    if (it.isLandStyle(id)) continue;
    for (const m of generic) for (const seed of [1, 2, 3]) {
      const s = df.defaultSetup(); s.tank = { ...s.tank, ...tk.tankFromModel(m) }; s.water.on = true; s.water.salt = it.isReefy(id);
      s.layout = { id, seed, dens: { hard: 2, plant: 2, animal: 4 } }; s.fish = []; sg.styleGround(s);
      s.fish = st.starterAnimals(s, 1);
      const c = {}; for (const f of s.fish) c[f.species] = (c[f.species] ?? 0) + 1;
      out.starters[`${id} ${m.id} s${seed}`] = Object.keys(c).sort().map(k => `${c[k]} ${k}`).join(', ') + ` | ${r1(sk.stockingOf(s).percent)} %`;
    }
  }
  for (const m of tk.TANK_MODELS.filter(m => !m.terrarium)) {
    const s = df.defaultSetup(); s.tank = { ...s.tank, ...tk.tankFromModel(m) }; s.water.on = true;
    const z = tc.sumpDefault(s); out.sumps[m.id] = `${z.model} ${Math.round(z.L)}x${Math.round(z.D)}x${Math.round(z.H)}`;
  }
  for (const x of ex.EXAMPLES) va.parseScene(exs.SCENES[x.id]).scene.tanks.forEach((t, i) => {
    const r = sk.stockingOf(t), d = dm.demandOf(t, dm.defaultProfile(), { now: NOW });
    out.examples[`${x.id} #${i}`] = `${r1(r.percent)} % (space ${r1(r.spacePercent)}, filt ${r1(r.filtrationPercent)}) setup $${Math.round(d.totals.setupUsd)} | ${d.items.find(c => c.key === 'tank')?.label ?? ''}`;
  });
  writeFileSync(arg[0], JSON.stringify(out, null, 1));
  console.log(`${day}: ` + Object.entries(out).map(([k, v]) => `${k} ${Object.keys(v).length}`).join(', '));
} finally { await server.close(); }
