// PA1: group-level coverage. Each old-UI control group (scripts/pa1-groups.json) -> regex searched in src/shell.
// Writes research/design/ui-parity-coverage.json and prints the zero-hit groups.
import fs from 'node:fs'; import path from 'node:path';
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const files = walk('src/shell').filter(f => /\.(tsx?|css)$/.test(f)).map(f => ({ f: f.split(path.sep).join('/'), t: fs.readFileSync(f, 'utf8') }));
const G = JSON.parse(fs.readFileSync('scripts/pa1-groups.json', 'utf8'));
const out = G.map(g => { const re = new RegExp(g.re, 'i'); const hits = files.filter(x => re.test(x.t)).map(x => x.f); return { ...g, hits: hits.slice(0, 4), n: hits.length }; });
fs.writeFileSync('research/design/ui-parity-coverage.json', JSON.stringify(out, null, 1));
console.log('groups', out.length, 'zero-hit', out.filter(o => !o.n).length);
console.log(out.filter(o => !o.n).map(o => o.sec + ': ' + o.name).join('\n'));
console.log('--- weak (1 file) ---');
console.log(out.filter(o => o.n === 1).map(o => o.name + ' -> ' + o.hits[0].replace('src/shell/', '')).join('\n'));
