// PA1: state-field coverage. Every scene field path the OLD UI writes (s.a.b = ..., delete s.a.b, ??=) in src/ui (not dormant dirs),
// checked by LEAF-and-PATH name against src/shell + the scene/*Edit modules the shell calls. Writes research/design/ui-parity-fields.md
import fs from 'node:fs'; import path from 'node:path';
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const rd = f => fs.readFileSync(f, 'utf8');
const dormant = /src[\\/]ui[\\/](guided|discovery|explore|ab|coach)[\\/]/;
const old = walk('src/ui').filter(f => /\.ts$/.test(f) && !dormant.test(f));
// everything the shell can reach to write: shell + the pure edit modules (scene/*Edit*, scene/tankEdit etc.) + reused ui logic
const reach = [...walk('src/shell'), ...walk('src/scene').filter(f => /(Edit|edit|gearOwn|customTank|brief|stockEdit|itemEdit)/.test(path.basename(f)))].filter(f => /\.tsx?$/.test(f));
const reachText = reach.map(rd).join('\n');
const paths = {};
const re = /\b(?:delete\s+)?(?:s|S|t|tk|sc|scene|tank|setup|cur)\.((?:[a-zA-Z_]\w*(?:\?\.|\.|\[[^\]]+\]\.?))*[a-zA-Z_]\w*)\s*(?:=(?!=)|\?\?=|\|\|=|\+=|-=|;)/g;
for (const f of old) { const t = rd(f); let m; const wr = /(?:delete\s+)?\b(?:s|S|t|tk|sc|scene|tank|setup|cur)\.([A-Za-z_][\w.\[\]?]*)\s*(=(?!=)|\?\?=|\|\|=|\+=|-=)/g;
  while ((m = wr.exec(t))) { const p = m[1].replace(/\?\./g, '.').replace(/\[[^\]]*\]/g, '[]'); if (/^(length|value|checked|style|innerHTML|textContent|onclick|oninput|onchange|hidden|disabled|title|className|id|open)$/.test(p.split('.').pop())) continue; if (!/\./.test(p) && p.length < 3) continue; (paths[p] ||= new Set()).add(path.basename(f)); } }
const missing = [], found = [];
for (const [p, fs_] of Object.entries(paths)) { const leaf = p.split('.').pop().replace('[]', ''); const hit = new RegExp('\\b' + leaf + '\\b').test(reachText); (hit ? found : missing).push([p, [...fs_].slice(0, 2).join(',')]); }
let o = `# PA1: old-UI written scene fields not found by leaf name in the shell (machine output; leaf-name test, review by hand)\n\nPaths written by old UI: ${Object.keys(paths).length}; leaf found in shell: ${found.length}; leaf NOT found: ${missing.length}\n\n`;
o += missing.sort().map(([p, f]) => `- \`${p}\` (${f})`).join('\n') + '\n';
fs.writeFileSync('research/design/ui-parity-fields.md', o);
console.log(Object.keys(paths).length, found.length, missing.length);
