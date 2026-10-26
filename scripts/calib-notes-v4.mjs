// Survey v4 notes as the lens on their tank (Nathan 2026-10-26: "the notes contain quite a bit of golden knowledge. I want them to be
// read carefully and have all answers of a specific tank be read through the lens of the specific notes attached").
// How a note is read: research/calib/v4/note-reading.md. Plain node, no dependencies, deterministic.
//
// Every answer file with notes gets a readings file beside it (research/calib/answers/v4-<expert>.notes.json). A model reads each note
// with the tank, the expert's answers and the app's reading in front of it (the brief this script writes), and records per tank: a
// summary, every answered field's status (as-clicked / restated / conditional / aside, with the note's words and why), the condition the
// expert assumed when the app can model it (stock, temperature, lengths: the tank is then re-read on the engine under it), and the
// knowledge claims the note makes (the ledger). The fit and the review refuse an answer file whose notes are not all read, or whose
// readings were made on a note that has since changed; they read the answers only through the readings.
//
// Run: node scripts/calib-notes-v4.mjs brief research/calib/answers/v4-<expert>.json   (writes the brief and the readings skeleton)
//      node scripts/calib-notes-v4.mjs check research/calib/answers/v4-<expert>.json   (validates the readings, prints what is open)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { buildV4, checkAnswer, loadV4 } from './calib-parse-v4.mjs';

export const STATUS = ['as-clicked', 'restated', 'conditional', 'aside'];
/** FNV-1a over the note's text: a reading belongs to the exact note it read. */
export function noteHash(note) {
  let h = 0x811c9dc5;
  for (let i = 0; i < note.length; i++) { h ^= note.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
export const notesPath = answerPath => answerPath.replace(/\.json$/, '.notes.json');
export const briefPath = answerPath => answerPath.replace(/\.json$/, '.notes-brief.md');
/** The tank id a note's condition is read under (src/calib/v4.ts condKey). */
export const condKey = (tank, expert) => `${tank}@${String(expert).replace(/[^A-Za-z0-9_-]+/g, '_')}`;
const hasNote = a => typeof a?.note === 'string' && a.note.trim() !== '';
const squash = t => String(t).toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
/** A quote stands only when it is the note's own words. */
export const quoteIn = (quote, note) => typeof quote === 'string' && quote.trim() !== '' && squash(note).includes(squash(quote));
/** A condition the app can model: a stock, a temperature or lengths. A condition in words only cannot be re-read. */
export const modelled = c => !!c && (Array.isArray(c.stock) || typeof c.tempC === 'number' || (c.tl && typeof c.tl === 'object'));

/** The answered fields of one answer, as the readings name them: max and maxMales per species (max.<sp>). */
export function fieldsOf(a) {
  const out = [];
  for (const [k, v] of Object.entries(a ?? {})) {
    if (['note', 'ms', 'skip'].includes(k) || v === undefined) continue;
    if ((k === 'max' || k === 'maxMales') && v && typeof v === 'object') for (const sp of Object.keys(v)) out.push(`${k}.${sp}`);
    else out.push(k);
  }
  return out;
}
const getField = (a, f) => { const [k, sp] = f.split('.'); return sp ? a[k]?.[sp] : a[k]; };
function setField(a, f, v) {
  const [k, sp] = f.split('.');
  if (!sp) { if (v === undefined) delete a[k]; else a[k] = v; return; }
  const o = { ...(a[k] ?? {}) };
  if (v === undefined) delete o[sp]; else o[sp] = v;
  if (Object.keys(o).length) a[k] = o; else delete a[k];
}

/** The skeleton a reader fills: every noted tank, every answered field with no status yet. Readings already made on the same note stay. */
export function skeleton(file, old = null) {
  const tanks = {};
  for (const [id, a] of Object.entries(file.answers ?? {})) {
    if (!hasNote(a)) continue;
    const h = noteHash(a.note), was = old?.tanks?.[id];
    if (was && was.hash === h) { tanks[id] = was; continue; }
    tanks[id] = { note: a.note, hash: h, ...(was ? { stale: `the note changed since it was read (was ${was.hash})`, was } : {}),
      summary: null, fields: Object.fromEntries(fieldsOf(a).map(f => [f, { status: null }])), condition: null, claims: [] };
  }
  return { survey: 'v4', build: file.build, expert: file.expert, readBy: old?.readBy ?? null, read: old?.read ?? null,
    how: 'research/calib/v4/note-reading.md', tanks };
}

/** Everything wrong with a readings file against its answer file: unread or stale notes, fields without a status, quotes that are not
 *  the note's words, restated values the survey does not offer, conditional fields without a condition the app can model. */
export function checkNotes(J, file, R) {
  const by = Object.fromEntries(J.scenarios.map(s => [s.id, s])), problems = [], open = [];
  const noted = Object.entries(file.answers ?? {}).filter(([, a]) => hasNote(a));
  if (!noted.length) return { problems, open, noted: 0 };
  if (!R) return { problems: [`no readings file: ${noted.length} note(s) unread (node scripts/calib-notes-v4.mjs brief <answers>)`], open: noted.map(([id]) => id), noted: noted.length };
  if (R.build !== file.build) problems.push(`readings are for build ${R.build}, the answers ${file.build}`);
  if (R.expert !== file.expert) problems.push(`readings are for ${R.expert}, the answers ${file.expert}`);
  if (!R.readBy) problems.push('readBy is empty: name the model (or person) that read the notes');
  for (const [id, a] of noted) {
    const r = R.tanks?.[id], s = by[id], p = m => problems.push(`${id}: ${m}`);
    if (!r) { open.push(id); p('note not read'); continue; }
    if (r.hash !== noteHash(a.note)) { open.push(id); p('the note changed since it was read'); continue; }
    if (r.stale) { open.push(id); p(r.stale); continue; }
    if (typeof r.summary !== 'string' || !r.summary.trim()) { open.push(id); p('no summary of what the note says'); }
    const want = fieldsOf(a), got = Object.keys(r.fields ?? {});
    for (const f of want) if (!r.fields?.[f]?.status) { if (!open.includes(id)) open.push(id); p(`${f}: no status`); }
    for (const f of got) if (!want.includes(f) && r.fields[f]?.status !== 'restated') p(`${f}: not an answered field (only "restated" may add one)`);
    for (const [f, x] of Object.entries(r.fields ?? {})) {
      if (!x?.status) continue;
      if (!STATUS.includes(x.status)) { p(`${f}: status ${JSON.stringify(x.status)} is not one of ${STATUS.join(' | ')}`); continue; }
      if (x.status !== 'as-clicked') {
        if (!quoteIn(x.quote, a.note)) p(`${f}: ${x.status} needs the note's own words in "quote"`);
        if (typeof x.why !== 'string' || !x.why.trim()) p(`${f}: ${x.status} needs a why`);
      }
      if (x.status === 'conditional' && !modelled(r.condition)) p(`${f}: conditional, but the tank has no condition the app can model (stock, tempC or tl); set it aside instead`);
    }
    // a restated value must be one the survey offers for this tank: the answer with it must pass the parser untouched
    const re = Object.entries(r.fields ?? {}).filter(([, x]) => x?.status === 'restated');
    if (re.length && s) {
      const b = structuredClone(a);
      for (const [f, x] of re) setField(b, f, x.value === null ? undefined : x.value);
      for (const x of checkAnswer(s, b).aside) if (re.some(([f]) => f === x.field || f.split('.')[0] === x.field.split('.')[0])) p(`${x.field}: restated value ${JSON.stringify(x.value)} is not a valid answer (${x.why})`);
    }
    if (r.condition) {
      const c = r.condition;
      if (typeof c.text !== 'string' || !c.text.trim()) p('condition needs a text');
      if (!quoteIn(c.quote, a.note)) p('condition needs the note\'s own words in "quote"');
      if (c.stock && (!Array.isArray(c.stock) || c.stock.some(x => !x || typeof x.id !== 'string' || !(x.n >= 0)))) p('condition.stock: a list of { id, n, sex?, note? }');
      if (c.stock && s?.focal && !c.stock.some(x => x.id === s.focal) && want.some(f => /^(ideal|limit|countStatus)$/.test(f) && r.fields[f]?.status === 'conditional')) p('condition.stock drops the counted species: its counts cannot be read under it');
      if (c.tl && Object.values(c.tl).some(v => !(v > 0))) p('condition.tl: lengths in mm, above 0');
    }
    for (const [i, c] of (r.claims ?? []).entries()) {
      if (typeof c.claim !== 'string' || !c.claim.trim()) p(`claim ${i + 1}: no claim`);
      if (typeof c.rule !== 'string' || !c.rule.trim()) p(`claim ${i + 1}: no rule key (a tests tag or a new key such as compat.nerite-ph)`);
      if (!quoteIn(c.quote, a.note)) p(`claim ${i + 1}: needs the note's own words in "quote"`);
      if (!Array.isArray(c.species)) p(`claim ${i + 1}: species is a list (empty for a rule about no one species)`);
    }
  }
  return { problems, open, noted: noted.length };
}

/** The answer file read through its notes: aside fields removed, restated fields replaced, conditional fields moved to the tank as the
 *  note says the expert read it (`cond`, keyed A04@expert), every change in `readings` with the note's words. Throws when a note is open. */
export function applyNotes(J, file, R) {
  const chk = checkNotes(J, file, R);
  if (chk.problems.length) throw new Error(`${file.expert}: the notes are not all read (${chk.noted} noted tanks): ${chk.problems.slice(0, 12).join('; ')}${chk.problems.length > 12 ? `; and ${chk.problems.length - 12} more` : ''}. See research/calib/v4/note-reading.md`);
  const answers = {}, cond = {}, readings = [];
  for (const [id, a0] of Object.entries(file.answers ?? {})) {
    const r = hasNote(a0) ? R.tanks[id] : null;
    if (!r) { answers[id] = a0; continue; }
    const a = structuredClone(a0), c = {};
    for (const [f, x] of Object.entries(r.fields ?? {})) {
      const from = getField(a0, f);
      if (x.status === 'as-clicked') continue;
      if (x.status === 'restated') setField(a, f, x.value === null ? undefined : x.value);
      if (x.status === 'aside' || x.status === 'conditional') setField(a, f, undefined);
      if (x.status === 'conditional') setField(c, f, from);
      readings.push({ tank: id, field: f, status: x.status, from: from ?? null, to: x.status === 'restated' ? x.value ?? null : null, why: x.why, quote: x.quote });
    }
    a.read = { summary: r.summary, claims: (r.claims ?? []).length, ...(r.condition ? { condition: r.condition.text } : {}) };
    answers[id] = a;
    if (Object.keys(c).length) {
      // the confidence and the note travel with the conditional answer (it is the same expert's judgement, on another tank)
      if (a0.confidence && !c.confidence) c.confidence = a.confidence ?? a0.confidence;
      cond[condKey(id, file.expert)] = { tank: id, condition: r.condition, answer: { ...c, note: a0.note } };
    }
  }
  const claims = Object.entries(R?.tanks ?? {}).flatMap(([id, r]) => (r.claims ?? []).map(c => ({ tank: id, expert: file.expert, expertKind: file.expertKind ?? null, confidence: file.answers?.[id]?.confidence ?? null, ...c })));
  return { ...file, answers, cond, readings, claims, notesRead: { by: R?.readBy ?? null, at: R?.read ?? null, tanks: chk.noted } };
}

/** An answer file and its readings file, applied; an answer file without notes needs none. */
export function loadRead(J, answerPathOrDoc, readingsDoc) {
  const file = typeof answerPathOrDoc === 'string' ? JSON.parse(readFileSync(answerPathOrDoc, 'utf8')) : answerPathOrDoc;
  const R = readingsDoc !== undefined ? readingsDoc : typeof answerPathOrDoc === 'string' && existsSync(notesPath(answerPathOrDoc)) ? JSON.parse(readFileSync(notesPath(answerPathOrDoc), 'utf8')) : null;
  return applyNotes(J, file, R);
}

/** The ledger: claims grouped by rule key. A rule is raised when two or more experts make it, or one person (keeper or professional,
 *  not an AI model) makes it firmly with high confidence. A raised rule is a proposal on its own, whether or not a tag was flagged. */
export function ledger(files) {
  const by = new Map();
  for (const f of files) for (const c of f.claims ?? []) { const k = c.rule.trim(); if (!by.has(k)) by.set(k, []); by.get(k).push(c); }
  return [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([rule, cs]) => {
    const experts = [...new Set(cs.map(c => c.expert))], person = cs.some(c => c.expertKind && c.expertKind !== 'ai' && c.firm && c.confidence === 'high');
    return { rule, claims: cs, experts, raised: experts.length >= 2 || person, why: experts.length >= 2 ? `${experts.length} experts` : person ? 'one person, firm, high confidence' : '' };
  });
}

// ---------- the brief a reader works from ----------
const nameOf = (J, id) => J.species[id]?.name ?? id;
const sexText = x => Array.isArray(x.sex) ? ` (${x.sex[0]} male${x.sex[0] === 1 ? '' : 's'}, ${x.sex[1]} female${x.sex[1] === 1 ? '' : 's'})` : x.sex === 'm' ? ' (male)' : x.sex === 'f' ? ' (female)' : '';
/** One tank as the expert saw it, their answers, the app's reading today, and the note: what a reader needs to read the note well. */
export function briefTank(J, T, s, a, expert) {
  const t = T?.tanks?.[s.id], tk = J.tanks[s.tank], app = t?.app;
  const stock = s.stock.map(x => `${x.n} ${nameOf(J, x.id)}${sexText(x)}${x.note ? ` [${x.note}]` : ''}${x.id === s.focal ? ' (counted)' : x.id === s.mate ? ' (counted, bottom)' : ''}, ${J.species[x.id]?.tl ?? '?'} mm`).join('; ');
  const ask = [s.min && `big enough / smallest for ${nameOf(J, s.min.species)}: ${s.min.sizes.join(' | ')}`, ...(s.max ?? []).map(q => `most ${nameOf(J, q.species)}: ${q.options.join(' | ')}`), ...(s.maxMales ?? []).map(q => `most male ${nameOf(J, q.species)}: ${q.options.join(' | ')}`)].filter(Boolean);
  let md = `## ${s.id} (${expert})\n\n**Tank:** ${tk.name}, ${tk.in.join(' x ')} in, ${s.env.water}${s.env.tempC != null ? `, ${s.env.tempC} °C` : ''}${s.env.note ? `, ${s.env.note}` : ''}. **Stock:** ${stock}.\n\n**Asked:** ${s.ask.join(', ')}${ask.length ? `; ${ask.join('; ')}` : ''}. **Tests:** ${s.tests.join(', ')}.\n\n`;
  if (app) md += `**The app today:** ${app.verdict}${app.by?.length ? ` (${app.by.join('; ')})` : ''}${app.rest ? `; the rest ${app.rest.verdict}${app.rest.by.length ? ` (${app.rest.by.join('; ')})` : ''}` : ''}${app.space ? `; space ${Math.round(app.space.pct)} % (water ${Math.round(app.space.water)}, floor ${Math.round(app.space.floor)})` : ''}${app.compat ? `; compat ${app.compat.level}: ${app.compat.items.join(' / ')}` : ''}.${t.unmodelled?.length ? ` Not modelled: ${t.unmodelled.join('; ')}.` : ''}\n\n`;
  const shown = Object.fromEntries(Object.entries(a).filter(([k]) => !['note', 'ms'].includes(k)));
  md += `**Answers:** \`${JSON.stringify(shown)}\`\n\n**Note:**\n\n> ${a.note.trim().replace(/\n+/g, '\n>\n> ')}\n\n`;
  return md;
}
export function brief(J, T, file) {
  const by = Object.fromEntries(J.scenarios.map(s => [s.id, s])), ids = Object.keys(file.answers ?? {}).filter(id => hasNote(file.answers[id]) && by[id]).sort();
  return `# Notes to read: ${file.expert} (${file.expertKind ?? 'kind not given'}), build ${file.build}\n\n${ids.length} tanks with a note. Read each one as research/calib/v4/note-reading.md says, and fill its entry in ${'`'}v4-<expert>.notes.json${'`'} beside the answers.\n\n` + ids.map(id => briefTank(J, T, by[id], file.answers[id], file.expert)).join('');
}

if (process.argv[1]?.endsWith('calib-notes-v4.mjs')) {
  const [cmd, path] = process.argv.slice(2);
  if (!['brief', 'check'].includes(cmd) || !path) { console.error('usage: node scripts/calib-notes-v4.mjs brief|check research/calib/answers/v4-<expert>.json'); process.exit(1); }
  const J = loadV4(), file = JSON.parse(readFileSync(path, 'utf8'));
  if (file.build !== buildV4(J)) { console.error(`${path}: build ${file.build}, the survey is ${buildV4(J)}`); process.exit(1); }
  const np = notesPath(path), old = existsSync(np) ? JSON.parse(readFileSync(np, 'utf8')) : null;
  if (cmd === 'brief') {
    const T = existsSync('research/calib/tables/v4.json') ? JSON.parse(readFileSync('research/calib/tables/v4.json', 'utf8')) : null;
    const sk = skeleton(file, old);
    writeFileSync(np, JSON.stringify(sk, null, 1) + '\n');
    writeFileSync(briefPath(path), brief(J, T, file));
    const todo = Object.values(sk.tanks).filter(r => !r.summary || r.stale).length;
    console.log(`wrote ${briefPath(path)} and ${np}: ${Object.keys(sk.tanks).length} noted tanks, ${todo} to read`);
  } else {
    const c = checkNotes(J, file, old);
    console.log(`${file.expert}: ${c.noted} noted tanks, ${c.open.length} open${c.open.length ? ' (' + c.open.join(', ') + ')' : ''}, ${c.problems.length} problem(s)`);
    for (const p of c.problems) console.log('  ' + p);
    if (c.problems.length) process.exit(1);
  }
}
