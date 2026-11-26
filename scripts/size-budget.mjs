// Size budget for the cold-load path (lane FD, 2026-11-25; Fable answer 4 step 5). Run by `npm run build` after vite build.
// Fails when (1) JS + CSS the first tank needs, gzip, exceeds BUDGET_KB: the entry script, every modulepreload and stylesheet in
// dist/index.html, plus the shell chunk (boot-*.js, loaded by main.ts's dynamic import); or (2) src/main.ts gains a top-level await
// (the build-B fish art used to be awaited there before the shell appeared). Prints the table every build.
// `node scripts/size-budget.mjs [dist] [--max 800]`
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const args = process.argv.slice(2), dist = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--max') ?? 'dist';
const BUDGET_KB = +(args[args.indexOf('--max') + 1] || 0) || 1350;
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const files = new Map();
for (const m of html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+\.(?:js|css))"/g)) files.set(m[1], 'index.html');
for (const f of readdirSync(join(dist, 'assets'))) if (/^boot-.*\.js$/.test(f)) files.set('assets/' + f, 'shell (dynamic)');
// follow static imports (import{..}from"./x.js", import"./x.js") from the entry and the shell chunk: those load before the first tank
const stat = new Set(files.keys()), queue = [...files.keys()].filter(f => f.endsWith('.js'));
while (queue.length) {
  const f = queue.pop(), src = readFileSync(join(dist, f), 'utf8');
  for (const m of src.matchAll(/(?:from|import)\s*"\.\/([^"]+\.js)"/g)) { const g = 'assets/' + m[1]; if (!stat.has(g) && existsSync(join(dist, g))) { stat.add(g); files.set(g, 'static import'); queue.push(g); } }
}
let total = 0; const rows = [];
for (const [f, why] of files) {
  const kb = gzipSync(readFileSync(join(dist, f))).length / 1024; total += kb; rows.push([f.replace('assets/', ''), why, kb]);
}
rows.sort((a, b) => b[2] - a[2]);
console.log('cold-load JS + CSS, gzip (largest 8 of ' + rows.length + '):');
for (const [f, why, kb] of rows.slice(0, +(process.env.ROWS||8))) console.log(`  ${kb.toFixed(0).padStart(5)} KB  ${f}  (${why})`);
console.log(`  ${total.toFixed(0).padStart(5)} KB  TOTAL before the first tank (budget ${BUDGET_KB} KB)`);
let bad = 0;
if (total > BUDGET_KB) { console.error(`size-budget: FAIL, ${total.toFixed(0)} KB > ${BUDGET_KB} KB. Split the new code behind a dynamic import() or raise the budget on purpose (scripts/size-budget.mjs).`); bad = 1; }
// no top-level await in main.ts: a line outside any block that awaits (comments stripped)
const main = existsSync('src/main.ts') ? readFileSync('src/main.ts', 'utf8').split(/\r?\n/) : [];
let depth = 0;
for (const [i, raw] of main.entries()) {
  const l = raw.replace(/\/\/.*$/, '').replace(/'[^']*'|"[^"]*"|`[^`]*`/g, '""');
  if (depth === 0 && /\bawait\b/.test(l)) { console.error(`size-budget: FAIL, top-level await at src/main.ts:${i + 1} (the shell would wait on it)`); bad = 1; }
  for (const c of l) { if (c === '{' || c === '(' || c === '[') depth++; else if (c === '}' || c === ')' || c === ']') depth--; }
}
process.exit(bad);
