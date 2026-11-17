// PA1: engine symbols the OLD UI (src/ui, excluding dormant dirs) imports from scene/demand/data/render/interact,
// that nothing in src/shell (or src/shell-imported src/ui modules) references by name. Writes research/design/ui-parity-engine.md
import fs from 'node:fs'; import path from 'node:path';
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const rd = f => fs.readFileSync(f, 'utf8');
const shellFiles = walk('src/shell').filter(f => /\.tsx?$/.test(f));
// old-UI modules the shell reuses (imports from ../ui/x)
const reused = new Set();
for (const f of shellFiles) for (const m of rd(f).matchAll(/from '\.\.\/ui\/([^']+)'/g)) reused.add(m[1]);
const shellText = shellFiles.map(rd).join('\n') + '\n' + [...reused].map(m => { const p = ['src/ui/' + m + '.ts', 'src/ui/' + m + '/index.ts'].find(fs.existsSync); return p ? rd(p) : ''; }).join('\n');
const words = new Set(shellText.match(/[A-Za-z_$][\w$]*/g));
const dormant = /src\/ui\/(guided|discovery|explore|ab|coach)\//;
const oldFiles = walk('src/ui').filter(f => /\.ts$/.test(f)).map(f => f.split(path.sep).join('/'));
const res = {};
for (const f of oldFiles) {
  const t = rd(f);
  for (const m of t.matchAll(/import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+'(\.\.?\/[^']*(?:scene|demand|data|render|interact)[^']*)'/g)) {
    for (const raw of m[1].split(',')) { const n = raw.trim().split(/\s+as\s+/)[0].replace(/^type\s+/, ''); if (!n) continue;
      if (!words.has(n)) ((res[m[2].replace(/^(\.\.\/)+/, '')] ||= {})[n] ||= new Set()).add(path.basename(f)); }
  }
}
let o = '# PA1: engine symbols used by the old UI but not referenced by name in the shell (machine output; review by hand)\n\n';
let total = 0;
for (const mod of Object.keys(res).sort()) { const names = Object.keys(res[mod]); total += names.length; o += `- **${mod}** (${names.length}): ` + names.map(n => `${n} [${[...res[mod][n]].slice(0, 2).join(',')}]`).join('; ') + '\n'; }
o += `\nTotal unreferenced symbols: ${total}. Reused old-UI modules in shell: ${[...reused].sort().join(', ')}\n`;
fs.writeFileSync('research/design/ui-parity-engine.md', o);
console.log('modules', Object.keys(res).length, 'symbols', total, 'reused', reused.size);
