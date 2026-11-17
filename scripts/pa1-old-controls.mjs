// PA1: old-UI control inventory. Reads index.html + src/ui/**; writes research/design/ui-parity-controls.csv
// For each id in index.html: tag, section, label, handler file:line, state keys written near handler, and
// "shell hits": how many of those keys / the id's label words appear in src/shell (rough coverage signal).
import fs from 'node:fs'; import path from 'node:path';
const root = process.cwd();
const html = fs.readFileSync('index.html', 'utf8');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const ui = walk('src/ui').filter(f => /\.tsx?$/.test(f)).map(f => ({ f: f.split(path.sep).join('/'), lines: fs.readFileSync(f, 'utf8').split('\n') }));
const shellText = walk('src/shell').filter(f => /\.tsx?$/.test(f)).map(f => fs.readFileSync(f, 'utf8')).join('\n');
const shellWords = new Set(shellText.match(/[A-Za-z_]\w{2,}/g));
const shellLow = shellText.toLowerCase();
// sections by position
const secRe = /<details class="(sec|tsub)"[^>]*data-(?:sec|sub)="([^"]+)"/g; const secs = []; let m;
while ((m = secRe.exec(html))) secs.push({ pos: m.index, name: m[2] });
const secAt = p => { let s = ''; for (const x of secs) if (x.pos < p) s = x.name; return s || 'header/toolbar'; };
const idRe = /<(\w+)([^>]*?)\sid="([^"]+)"([^>]*)>/g; const rows = [];
while ((m = idRe.exec(html))) {
  const [full, tag, a1, id, a2] = m; const attrs = a1 + ' ' + a2;
  const type = (attrs.match(/type="(\w+)"/) || [])[1] || '';
  const after = html.slice(m.index + full.length, m.index + full.length + 160);
  let label = (attrs.match(/(?:aria-label|title)="([^"]+)"/) || [])[1] || '';
  const inner = (after.match(/^([^<]{1,60})</) || [])[1]; if (inner && inner.trim()) label = inner.trim();
  if (!label) { const before = html.slice(Math.max(0, m.index - 220), m.index); const lb = [...before.matchAll(/>([^<>]{2,40})</g)].pop(); if (lb) label = lb[1].trim(); }
  // handler lookup
  const hits = []; const idq = new RegExp(`\$(?:<[^>]*>)?\(\s*['"]${id}['"]\s*\)|getElementById\(['"]${id}['"]\)`);
  for (const u of ui) u.lines.forEach((ln, i) => { if (idq.test(ln)) hits.push({ f: u.f, i, ln }); });
  const ev = hits.find(h => /\.(onclick|oninput|onchange|onpointerdown|onkeydown|addEventListener)|on\w+\s*=/.test(h.ln)) || hits[0];
  let keys = new Set();
  if (ev) { const u = ui.find(x => x.f === ev.f); const body = u.lines.slice(ev.i, ev.i + 5).join(' ');
    for (const k of body.matchAll(/\.(\w{3,})\s*=[^=>]/g)) keys.add(k[1]);
    for (const k of body.matchAll(/\b(set\w+|edit\w*|toggle\w+|apply\w+)\(/g)) keys.add(k[1]); }
  keys = [...keys].filter(k => !/^(onclick|oninput|onchange|onpointerdown|value|checked|textContent|innerHTML|hidden|disabled|style|className|title)$/.test(k));
  const found = keys.filter(k => shellWords.has(k));
  const labWords = label.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(w => w.length > 3);
  const labHit = labWords.length ? labWords.filter(w => shellLow.includes(w)).length / labWords.length : 0;
  rows.push({ id, tag, type, sec: secAt(m.index), label, handler: ev ? `${ev.f}:${ev.i + 1}` : '(none found)', keys: keys.join('|'), keysFound: found.join('|'), labelHit: labHit.toFixed(2), idInShell: shellWords.has(id) ? 1 : 0 });
}
const q = s => '"' + String(s).replace(/"/g, '""') + '"';
const cols = ['id', 'tag', 'type', 'sec', 'label', 'handler', 'keys', 'keysFound', 'labelHit', 'idInShell'];
fs.writeFileSync('research/design/ui-parity-controls.csv', [cols.join(','), ...rows.map(r => cols.map(c => q(r[c])).join(','))].join('\n'));
const s = {}; rows.forEach(r => s[r.sec] = (s[r.sec] || 0) + 1);
console.log('ids', rows.length, JSON.stringify(s));
