// Batch review for the expert calibration (research/expert-calibration.md section 9, Nathan 2026-10-23): one expert's answers to a
// round, tank by tank against the engine, then grouped by pattern (body class, zone, floor or water, one species or a mix, tank size,
// school size) so broad changes can be read off. Hand-written findings below "## Findings" survive a rerun.
// Run: node scripts/calib-review.mjs research/calib/round-1.json research/calib/answers/round-1-<expert>.json
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

/** Engine space reading of tank s with n of its focal species (from the round's engine table). */
export const readAt = (s, n) => { const r = s.table[Math.max(0, Math.min(n, s.table.length - 1))]; return Math.max(Object.values(r.water).reduce((a, b) => a + b, 0), r.floor); };
const bandOf = (p, ideal, limit) => p <= ideal ? 0 : p <= limit ? 1 : 2;
const BAND = ['green', 'amber', 'red'];
const pc = x => `${Math.round(x)} %`, mv = m => `${m >= 1 ? '+' : ''}${Math.round((m - 1) * 100)} %`;
const gmean = xs => Math.exp(xs.reduce((a, x) => a + Math.log(x), 0) / xs.length);
const median = xs => { const s = [...xs].sort((a, b) => a - b), k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };

/** Per tank: the engine as shown, the expert's band, and what the engine reads at the expert's ideal and limit counts. `fix` is the
 *  multiplier the engine's reading would need to match the expert (geometric mean over the two counts; below 1 = the engine reads high). */
export function rowsOf(round, file) {
  const by = Object.fromEntries(file.answers.map(a => [a.id, a]));
  return round.scenarios.map(s => {
    const a = by[s.id] ?? {}, shown = s.stock.find(x => x[0] === s.focal)[1], p = s.pct.space;
    const atIdeal = a.ideal >= 1 && a.ideal < s.table.length ? readAt(s, a.ideal) : null, atLimit = a.limit >= 1 && a.limit < s.table.length ? readAt(s, a.limit) : null;
    const fixes = [atIdeal && round.ideal / atIdeal, atLimit && round.limit / atLimit].filter(Boolean);
    return { s, a, shown, p, floorBound: s.pct.floor >= s.pct.water, engineBand: bandOf(p, round.ideal, round.limit), atIdeal, atLimit, fix: fixes.length ? gmean(fixes) : null,
      ratio: a.ideal >= 1 && a.limit >= 1 ? a.limit / a.ideal : null };
  });
}

/** Pattern groups: each a name and a key per tank (null = not in any group of that pattern). */
export const PATTERNS = [
  ['focal body class', r => r.s.cls[r.s.focal]],
  ['focal zone', r => r.s.zone?.[r.s.focal] ?? null],
  ['what binds', r => r.floorBound ? 'floor' : 'water'],
  ['one species or a mix', r => r.s.stock.length > 1 ? 'mix' : 'one species'],
  ['tank size', r => r.s.gal <= 20 ? '10-20 gal' : r.s.gal <= 40 ? '29-40 gal' : '55 gal and up'],
  ['focal count as shown', r => r.shown <= 10 ? '10 or fewer' : r.shown <= 30 ? '11-30' : 'over 30'],
];

export function review(round, file) {
  const rows = rowsOf(round, file), used = rows.filter(r => r.s.role !== 'repeat');
  const ex = file.expert, name = id => round.scenarios[0] && (round.scenarios.find(s => s.names?.[id])?.names[id] ?? id);
  let md = `# Calibration review, round ${round.round}: ${ex}\n\nAnswers ${file.made?.slice(0, 10) ?? ''}. Ideal = ${round.ideal} %, limit = ${round.limit} %. "fix" is what the engine's reading would need to be multiplied by to match the answer (geometric mean of ideal and limit counts): below 0 % the engine reads the tank too full, above it too empty.\n\n`;
  md += `## Tank by tank\n\n| tank | gal | animals | engine | engine band | answer band | engine at ideal count | engine at limit count | fix | note |\n|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const r of rows) {
    const st = r.s.stock.map(([id, n]) => `${n} ${name(id)}${id === r.s.focal ? '*' : ''}`).join(' + ');
    const ic = r.a.ideal >= 1 ? `${r.a.ideal} -> ${pc(r.atIdeal)}` : '-', lc = r.a.limit >= 1 ? `${r.a.limit} -> ${pc(r.atLimit)}` : '-';
    md += `| ${r.s.id}${r.s.role !== 'fresh' ? ` (${r.s.role}${r.s.of ? ' of ' + r.s.of : ''})` : ''} | ${r.s.gal} | ${st} | ${pc(r.p)}${r.floorBound ? ' floor' : ''} | ${BAND[r.engineBand]} | ${r.a.band != null ? BAND[r.a.band] : '-'}${r.a.band != null && r.a.band !== r.engineBand ? (r.a.band < r.engineBand ? ' (engine fuller)' : ' (engine emptier)') : ''} | ${ic} | ${lc} | ${r.fix ? mv(r.fix) : '-'} | ${(r.a.note ?? '').replace(/\|/g, '/').replace(/\n/g, ' ')} |\n`;
  }
  const withFix = used.filter(r => r.fix), all = withFix.map(r => r.fix);
  md += `\n\\* = the species the count questions asked about.\n\n## Overall\n\n`;
  if (all.length) md += `${all.length} tanks with counts. Median fix ${mv(median(all))}; the engine reads ${all.filter(f => f < 0.9).length} of them more than 10 % too full, ${all.filter(f => f > 1.1).length} more than 10 % too empty.\n`;
  const bands = used.filter(r => r.a.band != null);
  if (bands.length) md += `Bands: ${bands.filter(r => r.a.band === r.engineBand).length} of ${bands.length} agree; the engine is a band fuller on ${bands.filter(r => r.a.band < r.engineBand).length}, emptier on ${bands.filter(r => r.a.band > r.engineBand).length}.\n`;
  // one-species tanks only: in a mix the tankmates already take much of the room, so a small difference of opinion moves the count a lot
  const ratios = used.filter(r => r.ratio && r.s.stock.length === 1), engR = [];
  for (const r of ratios) { const i = r.s.table.findIndex((_, n) => n > 0 && readAt(r.s, n) >= round.ideal), l = r.s.table.findIndex((_, n) => n > 0 && readAt(r.s, n) >= round.limit); if (i > 0 && l > 0) engR.push(l / i); }
  if (ratios.length && engR.length) md += `Limit / ideal count, one-species tanks (${ratios.length}): yours median ${median(ratios.map(r => r.ratio)).toFixed(2)}, the engine's ${median(engR).toFixed(2)} (a higher ratio from you means later fish crowd the tank less than the engine's school curve says).\n`;
  md += `\n## Patterns\n\nMedian fix per group (tanks with counts, repeats left out). Flagged: 3 or more tanks and a median more than 15 % off.\n\n| pattern | group | tanks | median fix | range | |\n|---|---|---|---|---|---|\n`;
  for (const [pat, key] of PATTERNS) {
    const g = new Map();
    for (const r of withFix) { const k = key(r); if (k != null) g.set(k, [...(g.get(k) ?? []), r.fix]); }
    for (const [k, fs] of [...g.entries()].sort()) { const m = median(fs); md += `| ${pat} | ${k} | ${fs.length} | ${mv(m)} | ${mv(Math.min(...fs))} to ${mv(Math.max(...fs))} | ${fs.length >= 3 && Math.abs(Math.log(m)) > Math.log(1.15) ? '**flag**' : ''} |\n`; }
  }
  const reps = rows.filter(r => r.s.role === 'repeat' && r.fix);
  if (reps.length) {
    md += `\n## Repeats (your own consistency)\n\n`;
    for (const r of reps) { const o = rows.find(x => x.s.id === r.s.of); md += `- ${r.s.id} = ${r.s.of}: fix ${mv(r.fix)} vs ${o?.fix ? mv(o.fix) : '-'}; counts ${r.a.ideal}/${r.a.limit} vs ${o?.a.ideal}/${o?.a.limit}\n`; }
  }
  const mix = rows.filter(r => r.s.kind !== 'single' && r.a.together);
  if (mix.length) {
    const want = { ok: 'yes', concern: 'caution', high: 'no' };
    md += `\n## Compatibility: gate vs you\n\n${mix.filter(r => want[r.s.gate] === r.a.together).length} of ${mix.length} agree.\n\n`;
    for (const r of mix.filter(r => want[r.s.gate] !== r.a.together)) md += `- ${r.s.id} (${r.s.stock.map(([id]) => name(id)).join(' + ')}): gate ${r.s.gate}${r.s.gateItems.length ? ` (${r.s.gateItems.join('; ')})` : ''}, you ${r.a.together}${r.a.note ? `: "${r.a.note}"` : ''}\n`;
  }
  return md;
}

if (process.argv[1]?.endsWith('calib-review.mjs')) {
  const [roundPath, ansPath] = process.argv.slice(2);
  if (!roundPath || !ansPath) { console.error('usage: node scripts/calib-review.mjs research/calib/round-N.json answers.json'); process.exit(1); }
  const round = JSON.parse(readFileSync(roundPath, 'utf8')), file = JSON.parse(readFileSync(ansPath, 'utf8'));
  const out = roundPath.replace(/round-(\d+)\.json$/, `review-round-$1-${String(file.expert).replace(/[^A-Za-z0-9_-]+/g, '_')}.md`);
  const old = existsSync(out) ? readFileSync(out, 'utf8') : '';
  writeFileSync(out, review(round, file) + (old.includes('## Findings') ? '\n' + old.slice(old.indexOf('## Findings')) : '\n## Findings\n\n(hand-written: the patterns above, the broad changes they suggest, and what the next batch should test)\n'));
  console.log(`wrote ${out}`);
}
