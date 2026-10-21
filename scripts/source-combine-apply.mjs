// Lane CB (2026-10-21): apply the approved rows of research/sourcing/combined.md (scripts/source-combine.mjs, its proposal in
// research/sourcing/combine/approved-2026-10-21.json, frozen from proposal.json). Nathan 2026-10-21: "apply all except the 11" = every change except the rows whose field an
// earlier decision kept (verdict 'kept' in a batch: those stay, labelled as before); the gallon-derived red lines stay (the proposal
// already keeps them). Each value is edited where it lives:
//   care / minL / temper, and temp / tol without a WATER row   src/data/care.ts  A(care, minL, temper, temp, { tol })
//   temp / tol                                                   src/data/climatedata.ts  WATER ok / tol
//   ph, group                                                    src/data/waterchem.ts  CHEM ph, GROUP
//   max                                                          src/data/groups.ts  GROUPS max
//   air.rh / air.warm                                            src/data/climate.ts  AIR rh / warm
//   tl / female.tl                                               src/data/species.json
//   tank-minimum vol / red / green                               research/sourcing/combine/tankmin-overlay.json, read by scripts/tank-min-data.mjs
// and recorded in research/sourcing/combined.json (a sourcing batch, verdict 'combined', every page that voted), which
// src/data/provenance.ts turns into derived (2+ sites) or researched (one site) rules.
// Usage: node scripts/source-combine.mjs && node scripts/source-combine-apply.mjs && node scripts/tank-min-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';

// the proposal as Nathan approved it (frozen; a rerun of source-combine.mjs rewrites proposal.json against the applied values)
const P = JSON.parse(readFileSync('research/sourcing/combine/approved-2026-10-21.json', 'utf8'));
const DIR = 'research/sourcing';
// fields an earlier decision kept (Nathan: keep those 11)
const kept = new Set();
for (const f of ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'R1', 'R2', 'R3', 'R4', 'pilot-01']) {
  const b = JSON.parse(readFileSync(`${DIR}/${f}.json`, 'utf8'));
  for (const [id, sp] of Object.entries(b.species)) for (const [k, v] of Object.entries(sp.fields)) if (v.verdict === 'kept') kept.add(`${id}|${k === 'minL' ? 'minL (floor, L)' : k}`);
}
// kept after the table was approved (Nathan 2026-10-21, when the tests showed what they move): our value stays, labelled an assumption
const NATHAN_KEEP = {
  'kuhli|tl': 'kept (Nathan 2026-10-21): FishBase states a 12 cm maximum, one site; at 10 cm 13 kuhlis fit a 20 gal long (S188 acceptance), at 12 cm only 10',
  'oscar|tl': 'kept (Nathan 2026-10-21): FishBase 45.7 cm is a record size and outvoted Fishkeeping World 12 in (30 cm), the size kept oscars reach; two sites split',
};
// (their batch's own adopted rule cites them again; no new entry)
const ADOPTED = 'adopted';
// values Nathan had ADOPTED earlier (decisions.md S168 / SQ batch 1) that the table did not flag: his decision stands (Nathan 2026-10-21)
for (const k of ['cardinal|ph', 'hatchet|ph', 'yellowlab|temper', 'adf|tl', 'ocellaris|tl', 'chili|minL (floor, L)', 'molly|minL (floor, L)', 'treefrog|minL (floor, L)',
  'firetoad|minL (floor, L)', 'axolotl|minL (floor, L)', 'bristlenose|minL (floor, L)', 'sixline|minL (floor, L)'])
  NATHAN_KEEP[k] = ADOPTED + ' (Nathan 2026-10-21): his earlier adopted decision (research/sourcing/decisions.md) stands over the combination';
// tank sizes keep the MX rule (Nathan 2026-10-21: red = the lowest well-supported figure, never averaged; the advisory volume = the lowest
// well-supported gallon figure): the combination does not move tankmin red lines or vol. A new green line (MX: the strictest credible) stays.
const MX = r => r.target === 'tankmin.vol' || r.target?.startsWith('tankmin.red.');
const rows = P.rows.filter(r => r.change && !r.fromGallons && !r.tie && r.combined != null && !kept.has(`${r.id}|${r.field}`) && !NATHAN_KEEP[`${r.id}|${r.field}`] && !MX(r));
const keptLater = P.rows.filter(r => r.change && NATHAN_KEEP[`${r.id}|${r.field}`]);
// a kept value that the first apply had already moved is written back (its row edits the data to `ours`)
const revert = keptLater.filter(r => r.ours != null).map(r => ({ ...r, combined: r.ours, revert: true }));
// one page's figure picked over the weighted median (Nathan 2026-10-21): the median landed on a record size
const NATHAN_PICK = {
  'axolotl|tl': { host: 'reptilecentre.com', v: 300, why: "Nathan 2026-10-21: Reptile Centre's 'up to 30 cm', not Modest Fish's 8-16 in upper end (a record size, like the oscar)" },
};
for (const r of rows) { const k = NATHAN_PICK[`${r.id}|${r.field}`]; if (k) { r.combined = k.v; r.sites = r.sites.filter(s => s.host === k.host); r.n = 1; r.pick = k.why; } }
const skipped = P.rows.filter(r => r.change && kept.has(`${r.id}|${r.field}`));

const files = {}, read = f => (files[f] ??= readFileSync(f, 'utf8'));
const misses = [];
/** replace inside one `export const NAME` block, by a regex whose $1 is kept and the match after it replaced */
function edit(file, block, re, val, what) {
  const s = read(file), start = s.indexOf(`export const ${block}`), end = s.indexOf('\n};', start);
  if (start < 0) return misses.push(`${what}: no ${block} in ${file}`);
  const body = s.slice(start, end), m = body.match(re);
  if (!m) return misses.push(`${what}: not found in ${file} ${block}`);
  files[file] = s.slice(0, start) + body.replace(re, `$1${val}`) + s.slice(end);
  return true;
}
const arr = v => `[${v.join(', ')}]`;
const has = (file, block, id) => { const s = read(file), a = s.indexOf(`export const ${block}`); return new RegExp(`\\b${id}: `).test(s.slice(a, s.indexOf('\n};', a))); };
const overlay = {}, batch = {};
for (const r of [...rows, ...revert]) {
  const { id, field } = r, v = r.combined, what = `${id}.${field}`;
  const key = field.split(' (')[0];
  if (key === 'care') edit('src/data/care.ts', 'CARE', new RegExp(`(\\b${id}: A\\()\\d`), v, what);
  else if (key === 'minL') edit('src/data/care.ts', 'CARE', new RegExp(`(\\b${id}: A\\(\\d, )\\d+(?:\\.\\d+)?`), v, what);
  else if (key === 'temper') edit('src/data/care.ts', 'CARE', new RegExp(`(\\b${id}: A\\(\\d, \\d+(?:\\.\\d+)?, )\\d`), v, what);
  else if (key === 'temp') has('src/data/climatedata.ts', 'WATER', id) ? edit('src/data/climatedata.ts', 'WATER', new RegExp(`(\\b${id}: \\{ ok: )\\[[^\\]]*\\]`), arr(v), what)
    : edit('src/data/care.ts', 'CARE', new RegExp(`(\\b${id}: A\\(\\d, \\d+(?:\\.\\d+)?, \\d, )\\[[^\\]]*\\]`), arr(v), what);
  else if (key === 'tol') has('src/data/climatedata.ts', 'WATER', id) ? edit('src/data/climatedata.ts', 'WATER', new RegExp(`(\\b${id}: \\{[^\\n}]*?tol: )\\[[^\\]]*\\]`), arr(v), what)
    : edit('src/data/care.ts', 'CARE', new RegExp(`(\\b${id}: A\\([^)]*?tol: )\\[[^\\]]*\\]`), arr(v), what);
  else if (key === 'ph') edit('src/data/waterchem.ts', 'CHEM', new RegExp(`(\\b${id}: \\{ ph: )\\[[^\\]]*\\]`), arr(v), what);
  else if (key === 'group') edit('src/data/waterchem.ts', 'GROUP', new RegExp(`(\\b${id}: )\\d+`), v, what);
  else if (key === 'max') edit('src/data/groups.ts', 'GROUPS', new RegExp(`(\\b${id}: \\{[^\\n]*?\\bmax: )\\d+`), v, what);
  else if (key === 'air.rh' || key === 'air.warm') edit('src/data/climate.ts', 'AIR', new RegExp(`(\\b${id}: \\{[^\\n]*?\\b${key.slice(4)}: )\\[[^\\]]*\\]`), arr(v), what);
  else if (key === 'tl' || key === 'female.tl') {
    const s = read('src/data/species.json'), re = key === 'tl' ? new RegExp(`("id": "${id}",[^\\n]*?"tl": )\\d+`) : new RegExp(`("id": "${id}",[^\\n]*?"female": \\{[^}]*?"tl": )\\d+`);
    if (re.test(s)) files['src/data/species.json'] = s.replace(re, `$1${v}`); else misses.push(`${what}: not in species.json`);
  } else if (r.target?.startsWith('tankmin.')) {
    // tank-minimum lines: the value and the pages behind it (the median page's own url / statement; 2+ sites = combined)
    const [, line, m] = r.target.split('.'), page = [...r.sites].sort((a, b) => Math.abs(a.val - (line === 'vol' ? v * 3.785 : v)) - Math.abs(b.val - (line === 'vol' ? v * 3.785 : v)))[0];
    const o = (overlay[id] ??= {});
    const sites = r.sites.map(s => s.site).join(' + ');
    if (line === 'vol') o.vol = { gal: v, mark: r.n >= 2 ? 'combined' : 'sourced', site: sites, url: page.url, combined: r.sites.map(s => ({ site: s.site, url: s.url, gal: Math.round(s.val / 3.785 * 10) / 10, w: s.w })) };
    else (o[line] ??= { site: page.site, url: page.url, states: page.states, mark: 'sourced', from: 'combined', combined: r.sites.map(s => ({ site: s.site, url: s.url, mm: Math.round(s.val), w: s.w })) })[m] = v;
  } else { misses.push(`${what}: no target`); continue; }
  // the provenance batch: every page that voted (url, its statement, the checked quote)
  const fk = key === 'minL' ? 'minL' : key;
  if (!r.revert && !r.target?.startsWith('tankmin.')) (batch[id] ??= { fields: {} }).fields[fk] = { ours: v, verdict: 'combined', sources: r.sites.map(s => ({ url: s.url, site: s.site, states: s.states, weight: s.w, ...(s.generic ? { generic: true } : {}) })),
    decision: `lane CB 2026-10-21 (Nathan: apply the combined table): ${r.pick ?? (r.n >= 2 ? `weighted median of ${r.n} sites` : 'one site')}${r.ours != null ? `; was ${JSON.stringify(r.ours)}` : ''}` };
}
for (const r of keptLater.filter(r => !NATHAN_KEEP[`${r.id}|${r.field}`].startsWith(ADOPTED))) (batch[r.id] ??= { fields: {} }).fields[r.field] = { ours: r.ours, verdict: 'kept', sources: r.sites.map(s => ({ url: s.url, site: s.site, states: s.states, weight: s.w })),
  decision: NATHAN_KEEP[`${r.id}|${r.field}`] + `; the combination said ${r.combined}` };
for (const [f, s] of Object.entries(files)) writeFileSync(f, s);
writeFileSync(`${DIR}/combine/tankmin-overlay.json`, JSON.stringify({ generated: 'scripts/source-combine-apply.mjs', species: overlay }, null, 1) + '\n');
writeFileSync(`${DIR}/combined.json`, JSON.stringify({ batch: 'combined', agent_notes: 'Not a research batch: research/sourcing/combined.md (scripts/source-combine.mjs) combined the opened pages of the other batches; the quotes were checked there (exact / compact only). Applied by scripts/source-combine-apply.mjs, Nathan 2026-10-21.', species: batch }, null, 1) + '\n');
console.log(`applied ${rows.length - misses.length} of ${rows.length}; kept by an earlier decision ${skipped.length}: ${skipped.map(r => `${r.id} ${r.field.split(' (')[0]}`).join(', ')}`);
if (misses.length) console.log('MISSES:\n  ' + misses.join('\n  '));
