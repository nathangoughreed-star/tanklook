// Survey v4 answers in (research/calib/v4/survey-v4-design.md sections 4 and 7). Plain node, no dependencies, deterministic.
// Reads LLM answer files (one module each, the shape of the pack's JSON template; the reply may carry text or a ```json fence around
// the object) and HTML exports (survey-v4.html "Export answers"), checks every value against the design note's section 4 for the tank
// it answers, and merges one expert's files into research/calib/answers/v4-<expert>.json. A value that is not one the survey offers is
// set aside and listed, never coerced; a file from another build is refused (its answers are about other tanks).
// Run: node scripts/calib-parse-v4.mjs <file> [...] [--out <path>] [--check] [--strict]
//   --check: validate and print, write nothing; --strict: exit 1 when anything was set aside.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';

export const SCENARIOS_V4 = 'research/calib/v4/scenarios-v4.json';
export const loadV4 = (p = SCENARIOS_V4) => JSON.parse(readFileSync(p, 'utf8'));
/** The survey's build, as make-survey-v4.mjs computes it (FNV-1a over the tanks, stock, env, the counted species and ask). */
export function buildV4(J) {
  const s = JSON.stringify(J.scenarios.map(x => [x.id, x.tank, J.tanks[x.tank].in, x.env, x.stock, x.focal ?? null, x.mate ?? null, x.ask]));
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

export const VERDICTS = ['ideal', 'caution', 'problems', 'unworkable'];
export const CHANGES = ['nothing', 'fewer', 'bigger', 'drop', 'ratio', 'notroom', 'other'];
export const TOGETHER = ['yes', 'caution', 'no'];
export const REASONS = ['eat', 'nip', 'aggression', 'temperature', 'chemistry', 'habitat', 'food', 'disease', 'breeding', 'other'];
export const COUNT_STATUS = ['cant-say', 'no-valid-count'];
export const CONFIDENCE = ['low', 'medium', 'high'];
export const KINDS = ['keeper', 'professional', 'ai'];
const empty = v => v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length) || (v && typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
const isCount = v => Number.isInteger(v) && v >= 0;

/** The JSON object in a reply: the whole text, else a ```json fence, else the outermost braces. */
export function jsonOf(text) {
  try { return JSON.parse(text); } catch { /* not bare JSON */ }
  const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  if (fence) try { return JSON.parse(fence[1]); } catch { /* fall through */ }
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a >= 0 && b > a) return JSON.parse(text.slice(a, b + 1));
  throw new Error('no JSON object in the file');
}

/** One tank's answer checked against what that tank asks: `answer` holds the valid fields (empty template fields dropped), `aside` the
 *  rest, each with why. HTML exports flatten max.<sp> as max:<sp> internally; both shapes are read. */
export function checkAnswer(s, a) {
  const ans = {}, aside = [], put = (k, v, why) => aside.push({ tank: s.id, field: k, value: v, why });
  const asks = new Set(s.ask), stock = s.stock.map(x => x.id);
  const flat = {};
  for (const [k, v] of Object.entries(a ?? {})) {
    const m = /^(max|maxMales):(.+)$/.exec(k);
    if (m) (flat[m[1]] = { ...(flat[m[1]] ?? {}) })[m[2]] = v; else if ((k === 'max' || k === 'maxMales') && v && typeof v === 'object' && !Array.isArray(v)) flat[k] = { ...(flat[k] ?? {}), ...v }; else flat[k] = v;
  }
  // verdict "skip" (the LLM pack) and skip: true (the HTML) are the same answer: nothing else is read
  if (flat.skip === true || flat.verdict === 'skip') {
    for (const [k, v] of Object.entries(flat)) if (!['skip', 'verdict', 'note', 'ms', 'confidence'].includes(k) && !empty(v)) put(k, v, 'the tank was skipped: no other answer is read');
    return { answer: { skip: true, ...(typeof flat.note === 'string' && flat.note ? { note: flat.note } : {}), ...(typeof flat.ms === 'number' ? { ms: flat.ms } : {}) }, aside };
  }
  if (flat.skip !== undefined && flat.skip !== false) put('skip', flat.skip, 'skip is true or absent');
  for (const [k, v] of Object.entries(flat)) {
    if (k === 'skip' || empty(v)) continue;
    const one = (list, need) => { if (need && !asks.has(need)) return put(k, v, `this tank does not ask ${need}`); if (list.includes(v)) ans[k] = v; else put(k, v, `not one of ${list.join(' | ')}`); };
    const some = (list, need, why) => {
      if (!asks.has(need)) return put(k, v, `this tank does not ask ${need}`);
      if (!Array.isArray(v)) return put(k, v, 'a list is expected');
      const ok = v.filter(x => list.includes(x)), bad = v.filter(x => !list.includes(x));
      if (ok.length) ans[k] = [...new Set(ok)];
      if (bad.length) put(k, bad, why);
    };
    switch (k) {
      case 'verdict': one(VERDICTS); break;
      case 'change': one(CHANGES, 'change'); break;
      case 'changeSp': some(stock, 'change', `not a species in this tank (${stock.join(', ')})`); break;
      case 'together': one(TOGETHER, 'compat'); break;
      case 'reasons': some(REASONS, 'compat', `not one of ${REASONS.join(' | ')}`); break;
      case 'problem': some(stock, 'compat', `not a species in this tank (${stock.join(', ')})`); break;
      case 'ideal': case 'limit':
        if (!asks.has('counts')) put(k, v, 'this tank does not ask counts');
        else if (isCount(v)) ans[k] = v; else put(k, v, 'a whole number, 0 or more, is expected (or countStatus)');
        break;
      case 'countStatus': one(COUNT_STATUS, 'counts'); break;
      // the second counted species (six tanks since build cba9d609): the same meaning as ideal / limit
      case 'mateIdeal': case 'mateLimit':
        if (!s.mate || !asks.has('counts')) put(k, v, 'this tank has no second counted species');
        else if (isCount(v)) ans[k] = v; else put(k, v, 'a whole number, 0 or more, is expected (or mateStatus)');
        break;
      case 'mateStatus': if (!s.mate) put(k, v, 'this tank has no second counted species'); else one(COUNT_STATUS, 'counts'); break;
      case 'bigEnough': one(['yes', 'no'], 'min'); break;
      case 'smallest': one([...(s.min?.sizes ?? []), 'larger'], 'min'); break;
      case 'max': case 'maxMales': {
        const offered = Object.fromEntries((s[k] ?? []).map(m => [m.species, m.options]));
        if (!asks.has(k)) { put(k, v, `this tank does not ask ${k}`); break; }
        if (!v || typeof v !== 'object' || Array.isArray(v)) { put(k, v, 'an object by species is expected'); break; }
        for (const [sp, x] of Object.entries(v)) {
          if (empty(x)) continue;
          if (!offered[sp]) put(`${k}.${sp}`, x, `${k} is asked of ${Object.keys(offered).join(', ')} only`);
          // an option is a label ("7+", "16+"); a bare number equal to a label is the same answer, any other number is not offered
          else if (offered[sp].includes(String(x))) (ans[k] = { ...(ans[k] ?? {}) })[sp] = String(x);
          else put(`${k}.${sp}`, x, `not one of ${offered[sp].join(' | ')}`);
        }
        break;
      }
      case 'confidence': one(CONFIDENCE); break;
      case 'note': if (typeof v === 'string') ans.note = v; else put(k, v, 'text is expected'); break;
      case 'ms': if (typeof v === 'number' && v >= 0) ans.ms = v; else put(k, v, 'milliseconds are expected'); break;
      default: put(k, v, 'not a v4 answer field');
    }
  }
  // a count status replaces both numbers: an answer with both is contradictory, so neither stands
  if (ans.countStatus && (ans.ideal !== undefined || ans.limit !== undefined)) {
    put('countStatus', ans.countStatus, `given together with counts (${ans.ideal ?? '-'} / ${ans.limit ?? '-'}): set aside with them`);
    for (const c of ['ideal', 'limit']) if (ans[c] !== undefined) { put(c, ans[c], 'given together with countStatus'); delete ans[c]; }
    delete ans.countStatus;
  }
  if (ans.mateStatus && (ans.mateIdeal !== undefined || ans.mateLimit !== undefined)) {
    put('mateStatus', ans.mateStatus, `given together with counts (${ans.mateIdeal ?? '-'} / ${ans.mateLimit ?? '-'}): set aside with them`);
    for (const c of ['mateIdeal', 'mateLimit']) if (ans[c] !== undefined) { put(c, ans[c], 'given together with mateStatus'); delete ans[c]; }
    delete ans.mateStatus;
  }
  if (ans.changeSp && !['fewer', 'drop'].includes(ans.change)) { put('changeSp', ans.changeSp, `only read with change fewer or drop (change is ${ans.change ?? 'not given'})`); delete ans.changeSp; }
  if (!ans.verdict) put('verdict', flat.verdict ?? null, 'no verdict: the tank counts as unanswered');
  return { answer: ans, aside };
}

/** One answer file (an LLM module or an HTML export) against the scenarios: what it answers, what was set aside, what it left open. */
export function checkFile(J, doc, name = 'file') {
  const build = buildV4(J), problems = [];
  if (doc.survey !== 'v4') problems.push(`survey is ${JSON.stringify(doc.survey)}, not "v4"`);
  if (doc.build !== build) problems.push(`build ${doc.build ?? 'missing'}: this survey is build ${build}; its answers are about other tanks`);
  if (!doc.answers || typeof doc.answers !== 'object' || Array.isArray(doc.answers)) problems.push('no answers object keyed by tank id');
  if (problems.length) return { name, ok: false, problems };
  const by = Object.fromEntries(J.scenarios.map(s => [s.id, s]));
  const mods = doc.module ? [doc.module] : doc.modules?.length ? doc.modules : [...new Set(Object.keys(doc.answers).map(id => by[id]?.module).filter(Boolean))].sort();
  const answers = {}, aside = [], extra = [];
  if (typeof doc.expert !== 'string' || !doc.expert || doc.expert === '<name>') aside.push({ tank: '-', field: 'expert', value: doc.expert ?? null, why: 'no expert name' });
  if (doc.expertKind != null && !KINDS.includes(doc.expertKind)) aside.push({ tank: '-', field: 'expertKind', value: doc.expertKind, why: `not one of ${KINDS.join(' | ')}` });
  for (const [id, a] of Object.entries(doc.answers)) {
    const s = by[id];
    if (!s) { extra.push(id); aside.push({ tank: id, field: '*', value: a, why: 'no such tank in this build' }); continue; }
    if (doc.module && s.module !== doc.module) aside.push({ tank: id, field: '*', value: null, why: `tank of module ${s.module}, file says module ${doc.module} (read anyway)` });
    const r = checkAnswer(s, a);
    aside.push(...r.aside);
    if (r.answer.verdict || r.answer.skip) answers[id] = r.answer;
  }
  const open = J.scenarios.filter(s => mods.includes(s.module) && !answers[s.id]).map(s => s.id);
  return { name, ok: true, build, expert: doc.expert, expertKind: doc.expertKind ?? null, modules: mods, made: doc.made ?? null, source: doc.source ?? (doc.module ? `survey-v4-llm-${doc.module}.md` : null), answers, aside, open, carried: doc.carried ?? [] };
}

/** One expert's checked files as one answer file. Two files answering the same tank: the first stands, the second is set aside. Files of
 *  different experts are refused (each expert has their own bias in the fit; two runs of one model are one expert). */
export function merge(checked) {
  const ok = checked.filter(c => c.ok), experts = [...new Set(ok.map(c => c.expert))];
  if (!ok.length) throw new Error('no valid file');
  if (experts.length > 1) throw new Error(`files of different experts (${experts.join(', ')}): merge one expert at a time`);
  const answers = {}, aside = [], kinds = [...new Set(ok.map(c => c.expertKind).filter(Boolean))];
  for (const c of ok) {
    for (const x of c.aside) aside.push({ file: c.name, ...x });
    for (const [id, a] of Object.entries(c.answers)) {
      if (answers[id]) { aside.push({ file: c.name, tank: id, field: '*', value: a, why: 'answered again in another file: the first answer stands' }); continue; }
      answers[id] = a;
    }
  }
  const modules = [...new Set(ok.flatMap(c => c.modules))].sort(), open = [...new Set(ok.flatMap(c => c.open))].filter(id => !answers[id]).sort();
  const made = ok.map(c => c.made).filter(Boolean).sort().pop() ?? null;
  return { survey: 'v4', build: ok[0].build, expert: experts[0], expertKind: kinds.length === 1 ? kinds[0] : kinds.length ? kinds.join('+') : null, modules, made,
    sources: ok.map(c => c.name), answers, open, setAside: aside, carried: ok.flatMap(c => c.carried) };
}

export const answerPath = expert => `research/calib/answers/v4-${String(expert).replace(/[^A-Za-z0-9_-]+/g, '_')}.json`;

if (process.argv[1]?.endsWith('calib-parse-v4.mjs')) {
  const args = process.argv.slice(2), flag = f => args.includes(f), outAt = args.indexOf('--out');
  const files = args.filter((a, i) => !a.startsWith('--') && !(outAt >= 0 && i === outAt + 1));
  if (!files.length) { console.error('usage: node scripts/calib-parse-v4.mjs <answer file> [...] [--out <path>] [--check] [--strict]'); process.exit(1); }
  const J = loadV4();
  const checked = files.map(p => { if (!existsSync(p)) return { name: basename(p), ok: false, problems: ['no such file'] };
    try { return checkFile(J, jsonOf(readFileSync(p, 'utf8')), basename(p)); } catch (e) { return { name: basename(p), ok: false, problems: [String(e.message ?? e)] }; } });
  for (const c of checked) {
    if (!c.ok) { console.log(`${c.name}: refused: ${c.problems.join('; ')}`); continue; }
    const skips = Object.values(c.answers).filter(a => a.skip).length;
    console.log(`${c.name}: ${c.expert} (${c.expertKind ?? 'kind not given'}), module${c.modules.length > 1 ? 's' : ''} ${c.modules.join(', ')}: ${Object.keys(c.answers).length} tanks answered (${skips} skipped), ${c.open.length} open${c.open.length ? ' (' + c.open.join(', ') + ')' : ''}, ${c.aside.length} value(s) set aside`);
    for (const x of c.aside) console.log(`  set aside ${x.tank} ${x.field}: ${JSON.stringify(x.value)} (${x.why})`);
  }
  if (checked.some(c => !c.ok)) process.exit(1);
  const m = merge(checked), out = outAt >= 0 ? args[outAt + 1] : answerPath(m.expert);
  if (!flag('--check')) { writeFileSync(out, JSON.stringify(m, null, 1) + '\n'); console.log(`wrote ${out}: ${Object.keys(m.answers).length} tanks, modules ${m.modules.join(', ')}, ${m.setAside.length} set aside`); }
  if (flag('--strict') && m.setAside.length) process.exit(1);
}
