// PA1: fills the counts and the control table of research/design/ui-parity-audit.md from scripts/pa1-rows.txt (one-time; placeholders @@COUNTS@@ / @@TABLE@@)
import fs from 'node:fs';
const rows = fs.readFileSync('scripts/pa1-rows.txt', 'utf8').split('\n').filter(Boolean).map(l => l.split('|'));
const S = ['PRESENT', 'MOVED', 'CHANGED', 'MISSING', 'CUT']; const by = {}; const tot = Object.fromEntries(S.map(s => [s, 0]));
for (const r of rows) { if (r.length < 5 || !S.includes(r[3])) throw new Error('bad row ' + r.join('|')); (by[r[0]] ||= Object.fromEntries(S.map(s => [s, 0])))[r[3]]++; tot[r[3]]++; }
let c = Object.entries(by).map(([k, v]) => `| ${k} | ${S.map(s => v[s]).join(' | ')} |`).join('\n') + `\n| **Total (${rows.length} groups)** | ${S.map(s => '**' + tot[s] + '**').join(' | ')} |`;
let t = '| # | Section | Old control (ref) | Where in the shell | Status | Conf | Note |\n|---:|---|---|---|---|---|---|\n' + rows.map((r, i) => `| ${i + 1} | ${r[0]} | ${r[1]} | ${r[2]} | ${r[3]} | ${r[4]} | ${r[5] ?? ''} |`).join('\n');
let m = fs.readFileSync('research/design/ui-parity-audit.md', 'utf8').replace('@@COUNTS@@', c).replace('@@TABLE@@', t);
fs.writeFileSync('research/design/ui-parity-audit.md', m); console.log(JSON.stringify(tot), rows.length);
