import { readdirSync, readFileSync, statSync } from 'node:fs'; import { join, dirname, resolve, relative } from 'node:path';
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : []; });
const files = walk('src').map(f => f.split(String.fromCharCode(92)).join('/')); const set = new Set(files);
const edges = new Map(files.map(f => [f, []]));
for (const f of files) { const t = readFileSync(f, 'utf8'); for (const m of t.matchAll(/(?:from|import)\s*\(?\s*'(\.[^']+)'/g)) { let p = resolve(dirname(f), m[1]).split(String.fromCharCode(92)).join('/'); p = relative(process.cwd(), p).split(String.fromCharCode(92)).join('/'); for (const c of [p + '.ts', p + '/index.ts', p]) if (set.has(c)) { edges.get(f).push(c); break; } } }
const reach = (roots, skip = () => false) => { const seen = new Set(roots); const q = [...roots]; while (q.length) { const f = q.pop(); for (const g of edges.get(f) ?? []) if (!seen.has(g) && !skip(f, g)) { seen.add(g); q.push(g); } } return seen; };
const mode = process.argv[2];
// cut edges into the dormant Guided shell / A-B / coach: those are reachable only through unreachable entry points
const cut = new Set(['src/ui/welcome.ts', 'src/ui/ab/screen.ts', 'src/ui/coach/dom.ts', 'src/ui/stockPlan.ts']);
const live = mode === 'cut' ? reach(['src/main.ts'], (f, g) => cut.has(g)) : reach(['src/main.ts']);
const ui = files.filter(f => f.startsWith('src/ui/'));
if (mode === 'cut') { const dead = ui.filter(f => !live.has(f)); console.log('UI files not reachable with those 4 cut:', dead.length, 'lines', dead.reduce((n, f) => n + readFileSync(f, 'utf8').split('\n').length, 0)); console.log(dead.join('\n')); }
else { const dead = ui.filter(f => !live.has(f)); console.log('UI files unreachable from main.ts imports:', dead.length, dead.join(' ')); }
// who imports each ui file (importers outside own dir count)
if (mode === 'who') for (const f of ui) { const w = files.filter(g => edges.get(g).includes(f)); console.log(f, '<-', w.map(x => x.replace('src/', '')).join(', ')); }
