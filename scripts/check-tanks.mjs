// Check the tank catalog (src/data/tanks.json): rated gallons vs computed volume, outer -> interior -> outer round trip, unique ids,
// band vs gallons. Run: node scripts/check-tanks.mjs [--fix]   (--fix writes the derived outer L / D of pie, hexagon and round tanks,
// whose other outer extent follows from the one given)
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const tk = await server.ssrLoadModule('/src/data/tanks.ts'), ck = await server.ssrLoadModule('/src/data/tankcheck.ts');
  if (process.argv.includes('--fix')) {
    const path = new URL('../src/data/tanks.json', import.meta.url), j = JSON.parse(readFileSync(path, 'utf8'));
    for (const m of j.tanks) {
      if (!['pie', 'poly', 'round'].includes(m.shape)) continue;
      const T = tk.tankFromModel(m), o = tk.outerOf(T, m.glassMm);
      if (m.shape === 'pie') m.outer.L = +o.L.toFixed(1); else m.outer.D = +o.D.toFixed(1);
      if (m.shape === 'round') m.outer.D = m.outer.L;
    }
    writeFileSync(path, JSON.stringify(j, null, 1) + '\n');
    console.log('derived outer extents written');
  }
  const { reports, global } = ck.checkAll();
  let bad = global.length;
  for (const g of global) console.log('FAIL', g);
  for (const r of reports) {
    const tag = r.problems.length ? 'FAIL' : 'ok  ';
    console.log(`${tag} ${r.id.padEnd(12)} rated ${String(r.rated).padStart(6)}  computed ${r.gal.toFixed(1).padStart(6)}  ${((r.ratio - 1) * 100).toFixed(1).padStart(6)} %`, r.problems.join('; '));
    if (r.problems.length) bad++;
  }
  console.log(`${reports.length} tanks, ${bad} problem(s)`);
  process.exitCode = bad ? 1 : 0;
} finally { await server.close(); }
