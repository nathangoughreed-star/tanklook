// Batch review for the expert calibration (research/expert-calibration.md sections 9 and 10, Nathan 2026-10-23): one expert's answers
// to a round, tank by tank against the engine, then grouped by pattern (body class, zone, which dimension is tight, one species or a
// mix, tank size, school size) so broad changes can be read off. Survey 1 or 2 answers. Hand-written findings below "## Findings"
// survive a rerun.
// Run: node scripts/calib-review.mjs research/calib/round-N.json research/calib/answers/round-N-<expert>.json
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { answersFit, buildOf, dimOf, focalOf, loadTables, partsAt, withTables } from './calib-fit.mjs';

/** Engine reading of a table row on a dimension ('water', 'floor' or 'max'). */
export const readOn = (tbl, n, dim = 'max') => { const { W, F } = partsAt(tbl, n); return dim === 'water' ? W : dim === 'floor' ? F : Math.max(W, F); };
/** Survey-1 helper kept for callers: the larger dimension. */
export const readAt = (s, n) => readOn(s.table, n);
const bandOf = (p, ideal, limit) => p <= ideal ? 0 : p <= limit ? 1 : 2;
const BAND = ['green', 'amber', 'red'];
const pc = x => `${Math.round(x)} %`, mv = m => `${m >= 1 ? '+' : ''}${Math.round((m - 1) * 100)} %`;
const gmean = xs => Math.exp(xs.reduce((a, x) => a + Math.log(x), 0) / xs.length);
const median = xs => { const s = [...xs].sort((a, b) => a - b), k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };
const STATUS = { 'no-valid-count': 'no valid count', 'not-assessable': 'not assessable', 'cant-say': "can't say" };

/** Per tank: the engine as shown, the expert's bands, and what the engine reads (on the counted species' own dimension) at the expert's
 *  counts. `fix` is the multiplier the engine's reading would need to match the expert (geometric mean over the counts; below 1 = the
 *  engine reads high). Tanks the expert called too small for a species, or limited by habitat, get no fix. */
export function rowsOf(round, file) {
  const by = Object.fromEntries(file.answers.map(a => [a.id, a]));
  return round.scenarios.map(s => {
    const a = by[s.id] ?? {}, c = focalOf(a), shown = s.stock.find(x => x[0] === s.focal)[1], p = s.pct.space, d = dimOf(s, s.focal);
    const at = (tbl, n, dim) => n >= 1 && n < tbl.length ? readOn(tbl, n, dim) : null;
    const atIdeal = at(s.table, c.ideal, d), atLimit = at(s.table, c.limit, d), mate = a.mate && s.mateTable ? { ...a.mate, at: at(s.mateTable, a.mate.ideal, dimOf(s, a.mate.id)) } : null;
    const lim0 = a.review?.set && 'limits' in a.review.set ? a.review.set.limits : a.limits; // a reviewed exception (calib-fit.mjs rowsOf)
    const out = lim0 === 'not-room' || Object.values({ ...(a.bigEnough ?? {}), ...(a.review?.set?.bigEnough ?? {}) }).includes(false);
    const fixes = out ? [] : [atIdeal && round.ideal / atIdeal, atLimit && round.limit / atLimit, mate?.at && round.ideal / mate.at].filter(Boolean);
    return { s, a, c, mate, shown, p, dim: d, floorBound: s.pct.floor >= s.pct.water, engineBand: bandOf(p, round.ideal, round.limit), atIdeal, atLimit, out,
      fix: fixes.length ? gmean(fixes) : null, ratio: c.ideal >= 1 && c.limit >= 1 ? c.limit / c.ideal : null };
  });
}

/** Pattern groups: each a name and a key per tank (null = not in any group of that pattern). */
export const PATTERNS = [
  ['focal body class', r => r.s.cls[r.s.focal]],
  ['focal zone', r => r.s.zone?.[r.s.focal] ?? null],
  ['tight dimension (engine)', r => r.s.tight ?? (r.floorBound ? 'floor' : 'water')],
  ['one species or a mix', r => r.s.stock.length > 1 ? 'mix' : 'one species'],
  ['tank size', r => r.s.gal <= 20 ? '10-20 gal' : r.s.gal <= 40 ? '29-40 gal' : '55 gal and up'],
  ['focal count as shown', r => r.shown <= 10 ? '10 or fewer' : r.shown <= 30 ? '11-30' : 'over 30'],
];

export function review(round, file) {
  const rows = rowsOf(round, file), used = rows.filter(r => r.s.role !== 'repeat'), v2 = file.survey === 2 || file.answers.some(a => a.focal);
  const name = id => round.scenarios.find(s => s.names?.[id])?.names[id] ?? id, B = v => v != null ? BAND[v] : '-';
  let md = `# Calibration review, round ${round.round}: ${file.expert}${file.expertKind ? ` (${file.expertKind === 'ai' ? 'an AI model' : file.expertKind})` : ''}\n\nAnswers ${file.made?.slice(0, 10) ?? ''}${file.picture ? ' (survey with pictures)' : ''}. Ideal = ${round.ideal} %, limit = ${round.limit} %. Counts are read on the dimension their species fills (floor for bottom dwellers, water for swimmers, the larger for fish that use both). "fix" is what the engine's reading would need to be multiplied by to match the answers: below 0 % the engine reads the tank too full, above it too empty.\n\n`;
  md += v2 ? `## Tank by tank\n\n| tank | gal | animals | engine water / floor | answer floor / water / overall | ideal count -> engine | limit count -> engine | tankmate ideal -> engine | fix |\n|---|---|---|---|---|---|---|---|---|\n`
    : `## Tank by tank\n\n| tank | gal | animals | engine | engine band | answer band | ideal count -> engine | limit count -> engine | fix |\n|---|---|---|---|---|---|---|---|---|\n`;
  for (const r of rows) {
    const st = r.s.stock.map(([id, n]) => `${n} ${name(id)}${id === r.s.focal ? '*' : id === r.s.mate ? '°' : ''}`).join(' + ');
    // ideal 0 on review (S214 f14: the tankmates alone already fill the ideal): shown, not fitted (a 0 count has no log reading)
    const cnt = (n, at, k, src = r.c) => n >= 1 ? `${n} -> ${pc(at)}` : k === 'ideal' && src === r.c && r.a.review?.ideal0 ? '0 (on review)' : STATUS[src.status?.[k]] ?? '-';
    const id = `${r.s.id}${r.s.role !== 'fresh' ? ` (${r.s.role}${r.s.of ? ' of ' + r.s.of : ''})` : ''}`, fx = r.out ? 'left out' : r.fix ? mv(r.fix) : '-';
    if (v2) md += `| ${id} | ${r.s.gal} | ${st} | ${pc(r.s.pct.water)} / ${pc(r.s.pct.floor)} | ${B(r.a.floor)} / ${B(r.a.water)} / ${B(r.a.overall)} | ${cnt(r.c.ideal, r.atIdeal, 'ideal')} | ${r.s.noLimit ? 'not asked' : cnt(r.c.limit, r.atLimit, 'limit')} | ${r.mate ? cnt(r.mate.ideal, r.mate.at, 'ideal', r.mate) : '-'} | ${fx} |\n`;
    else md += `| ${id} | ${r.s.gal} | ${st} | ${pc(r.p)}${r.floorBound ? ' floor' : ''} | ${BAND[r.engineBand]} | ${B(r.a.band)}${r.a.band != null && r.a.band !== r.engineBand ? (r.a.band < r.engineBand ? ' (engine fuller)' : ' (engine emptier)') : ''} | ${cnt(r.c.ideal, r.atIdeal, 'ideal')} | ${cnt(r.c.limit, r.atLimit, 'limit')} | ${fx} |\n`;
  }
  const withFix = used.filter(r => r.fix), all = withFix.map(r => r.fix);
  md += `\n\\* = the species the main count questions asked about; ° = the tankmate count.\n\n## Overall\n\n`;
  if (all.length) md += `${all.length} tanks with counts. Median fix ${mv(median(all))}; the engine reads ${all.filter(f => f < 0.9).length} of them more than 10 % too full, ${all.filter(f => f > 1.1).length} more than 10 % too empty.\n`;
  const bandsOf = (k, dim) => used.filter(r => r.a[k] != null && !r.out).map(r => [r.a[k], bandOf(dim === 'water' ? r.s.pct.water : dim === 'floor' ? r.s.pct.floor : r.p, round.ideal, round.limit)]);
  for (const [k, dim, label] of v2 ? [['floor', 'floor', 'Floor bands'], ['water', 'water', 'Water bands'], ['overall', 'max', 'Overall bands']] : [['band', 'max', 'Bands']]) {
    const b = bandsOf(k, dim);
    if (b.length) md += `${label}: ${b.filter(([x, e]) => x === e).length} of ${b.length} agree; the engine is a band fuller on ${b.filter(([x, e]) => x < e).length}, emptier on ${b.filter(([x, e]) => x > e).length}.\n`;
  }
  const ratios = used.filter(r => r.ratio && r.s.stock.length === 1 && !r.out), engR = [];
  for (const r of ratios) { const i = r.s.table.findIndex((_, n) => n > 0 && readOn(r.s.table, n, r.dim) >= round.ideal), l = r.s.table.findIndex((_, n) => n > 0 && readOn(r.s.table, n, r.dim) >= round.limit); if (i > 0 && l > 0) engR.push(l / i); }
  // one-species tanks only: in a mix the tankmates already take much of the room, so a small difference of opinion moves the count a lot
  if (ratios.length && engR.length) md += `Limit / ideal count, one-species tanks (${ratios.length}): yours median ${median(ratios.map(r => r.ratio)).toFixed(2)}, the engine's ${median(engR).toFixed(2)} (a higher ratio from you means later fish crowd the tank less than the engine's school curve says; noisy, read it over rounds).\n`;
  md += `\n## Patterns\n\nMedian fix per group (tanks with counts, repeats and left-out tanks excluded). Flagged: 3 or more tanks and a median more than 15 % off.\n\n| pattern | group | tanks | median fix | range | |\n|---|---|---|---|---|---|\n`;
  for (const [pat, key] of PATTERNS) {
    const g = new Map();
    for (const r of withFix) { const k = key(r); if (k != null) g.set(k, [...(g.get(k) ?? []), r.fix]); }
    for (const [k, fs] of [...g.entries()].sort()) { const m = median(fs); md += `| ${pat} | ${k} | ${fs.length} | ${mv(m)} | ${mv(Math.min(...fs))} to ${mv(Math.max(...fs))} | ${fs.length >= 3 && Math.abs(Math.log(m)) > Math.log(1.15) ? '**flag**' : ''} |\n`; }
  }
  if (v2) {
    const mr = used.filter(r => r.a.overall != null && r.a.floor != null && r.a.water != null);
    if (mr.length) { const off = mr.filter(r => r.a.overall !== Math.max(r.a.floor, r.a.water)); md += `\n## The max rule\n\nThe engine's overall is the larger of floor and water. Your overall matched your tighter dimension on ${mr.length - off.length} of ${mr.length} tanks.${off.length ? ' Not on: ' + off.map(r => `${r.s.id} (floor ${B(r.a.floor)}, water ${B(r.a.water)}, overall ${B(r.a.overall)})`).join(', ') + '.' : ''}\n`; }
    const lim = used.filter(r => r.a.limits);
    if (lim.length) {
      const eng = r => { const top = Object.entries(partsAt(r.s.table, r.shown).W ? r.s.table[r.shown].water : {}).sort((p, q) => q[1] - p[1])[0]?.[0]; return r.s.pct.floor >= r.s.pct.water ? r.s.stock.filter(([id]) => r.s.uses?.[id]?.floor >= 1).sort((p, q) => q[1] - p[1])[0]?.[0] ?? top : top; };
      md += `\n## What limits the room first\n\n${lim.filter(r => r.a.limits === 'not-room').length} tank(s) "not room" (left out of the room numbers). Of the rest, your limiting species matches the engine's biggest contributor on the binding dimension on ${lim.filter(r => r.a.limits !== 'not-room' && r.a.limits === eng(r)).length} of ${lim.filter(r => r.a.limits !== 'not-room').length}.\n`;
      for (const r of lim.filter(r => r.a.limits !== 'not-room' && r.a.limits !== eng(r))) md += `- ${r.s.id}: you ${name(r.a.limits)}, engine ${name(eng(r))}\n`;
    }
    const small = used.flatMap(r => Object.entries(r.a.bigEnough ?? {}).filter(([, v]) => v === false).map(([id]) => `${r.s.id} ${name(id)} in ${r.s.dimsIn.join(' x ')} in`));
    md += `\n## Big enough per species\n\nEvery tank passed the app's recommended minimum for each species. You called ${small.length ? 'these too small (each is a tank-minimum disagreement): ' + small.join('; ') : 'none too small'}.\n`;
    const pairs = rows.filter(r => r.s.role === 'pair' && r.s.of);
    if (pairs.length) {
      md += `\n## Pairs (same stock, another footprint)\n\n`;
      for (const b of pairs) { const a = rows.find(x => x.s.id === b.s.of); if (!a) continue; md += `- ${a.s.id} ${a.s.dimsIn.join('x')} vs ${b.s.id} ${b.s.dimsIn.join('x')} (${a.s.stock.map(([i, n]) => n + ' ' + name(i)).join(' + ')}): your ideal ${a.c.ideal ?? '-'} vs ${b.c.ideal ?? '-'}, limit ${a.c.limit ?? '-'} vs ${b.c.limit ?? '-'}; the engine's reading as shown ${pc(a.p)} vs ${pc(b.p)}\n`; }
    }
    const hist = (k, labels) => labels.map((l, i) => `${l} ${used.filter(r => r.a[k] === i).length}`).join(', ');
    md += `\n## About the answers\n\nConfidence: ${hist('confidence', ['low', 'medium', 'high'])}. In a bare tank: ${hist('bare', ['the same', 'a little lower', 'a lot lower'])} (survey 2.1; survey 2.0 asked about dense planting: ${hist('plants', ['the same', 'a little higher', 'a lot higher'])}).\n`;
  }
  const reps = rows.filter(r => r.s.role === 'repeat' && r.fix);
  if (reps.length) {
    md += `\n## Repeats (your own consistency)\n\n`;
    for (const r of reps) { const o = rows.find(x => x.s.id === r.s.of); md += `- ${r.s.id} = ${r.s.of}: fix ${mv(r.fix)} vs ${o?.fix ? mv(o.fix) : '-'}; counts ${r.c.ideal}/${r.c.limit} vs ${o?.c.ideal}/${o?.c.limit}\n`; }
  }
  const mix = rows.filter(r => r.s.kind !== 'single' && r.a.together);
  if (mix.length) {
    const want = { ok: 'yes', concern: 'caution', high: 'no' };
    md += `\n## Compatibility: gate vs you\n\n${mix.filter(r => want[r.s.gate] === r.a.together).length} of ${mix.length} agree.\n\n`;
    for (const r of mix.filter(r => want[r.s.gate] !== r.a.together)) md += `- ${r.s.id} (${r.s.stock.map(([id]) => name(id)).join(' + ')}): gate ${r.s.gate}${r.s.gateItems.length ? ` (${r.s.gateItems.join('; ')})` : ''}, you ${r.a.together}${r.a.note ? ' (see the note)' : ''}\n`;
  }
  const notes = rows.filter(r => r.a.note);
  if (notes.length) md += `\n## Notes (the expert's own words)\n\n${notes.map(r => `**${r.s.id}**: ${r.a.note.replace(/\n+/g, ' ')}`).join('\n\n')}\n`;
  return md;
}

if (process.argv[1]?.endsWith('calib-review.mjs')) {
  const [roundPath, ansPath] = process.argv.slice(2);
  if (!roundPath || !ansPath) { console.error('usage: node scripts/calib-review.mjs research/calib/round-N.json answers.json'); process.exit(1); }
  // the engine's readings come from the round's tables file (the frozen tanks re-read on the current engine) when there is one
  const made = JSON.parse(readFileSync(roundPath, 'utf8')), T = loadTables(roundPath), round = T ? withTables(made, T) : made, file = JSON.parse(readFileSync(ansPath, 'utf8'));
  // the answers must be about these tanks (calib-fit.mjs answersFit): a round redrawn under the same ids would review the wrong tanks
  if (!answersFit(made, file)) { console.error(`${ansPath} does not answer the tanks in ${roundPath} (build ${buildOf(made)}${file.build ? ', the file says ' + file.build : ''}): another build of that round?`); process.exit(1); }
  let out = roundPath.replace(/round-(\d+[a-z]?)\.json$/, `review-round-$1-${String(file.expert).replace(/[^A-Za-z0-9_-]+/g, '_')}.md`);
  let old = existsSync(out) ? readFileSync(out, 'utf8') : '';
  // a hand-written review under this name (not made by this script) is never overwritten: write beside it (S214's round-2 review was lost once)
  if (old && !old.startsWith('# Calibration review')) { out = out.replace(/\.md$/, '.generated.md'); old = existsSync(out) ? readFileSync(out, 'utf8') : ''; console.warn(`kept the hand-written review; writing ${out}`); }
  const body = review(round, file).replace('\n\nAnswers ', `\n\nEngine readings: ${T ? `the current engine (research/calib/tables, ${T.made})` : 'as the round was made'}. Answers `);
  writeFileSync(out, body +(old.includes('## Findings') ? '\n' + old.slice(old.indexOf('## Findings')) : '\n## Findings\n\n(hand-written: the patterns above, the broad changes they suggest, and what the next batch should test)\n'));
  console.log(`wrote ${out}`);
}
