// Synthetic survey-v4 experts (the v4 counterpart of calib-synth.mjs): answer files made from the app's own readings, to prove the parser,
// the fit and the review. "agree" answers every tank as the app does (its verdict, its first change, its compatibility, the engine's own
// counts at 75 and 100 %, its smallest green size, its maxima); "shift" is the same expert whose counts put 30 % more load in the tank
// than the engine accepts (the engine reads every count tank too full) and who judges every pair one step milder than the app.
// Plain node, deterministic. Run: node scripts/calib-synth-v4.mjs  -> research/calib/answers-synth/v4-synth-{agree,shift}.json
import { readFileSync, writeFileSync } from 'node:fs';
import { dimOf } from './calib-fit.mjs';
import { readOn } from './calib-review.mjs';
import { buildV4, loadV4 } from './calib-parse-v4.mjs';
import { appBigEnough, appChange, appReasons, appSmallest, appTogether, optionOf, TABLES_V4 } from './calib-review-v4.mjs';

/** The count whose engine reading is nearest `target` (in log terms); 0 when the tankmates alone already read past it; null when the
 *  table never gets there on that dimension (B02: the clown loach is fitted on the floor, but the water passes 180 % first). */
function nearest(tbl, target, dim) {
  if (readOn(tbl, 0, dim) >= target) return 0;
  if (Math.max(...tbl.map((_, n) => readOn(tbl, n, dim))) < target / 1.05) return null;
  let best = 0, err = Infinity;
  for (let n = 1; n < tbl.length; n++) { const p = readOn(tbl, n, dim); if (!(p > 0)) continue; const e = Math.abs(Math.log(p / target)); if (e < err) { err = e; best = n; } }
  return best;
}

/** One synthetic expert. `load`: the counts' target reading is multiplied by it (1.3 = 30 % more fish than the engine accepts);
 *  `milder`: every "keep together" one step milder than the app. */
export function synthV4(J, T, { expert, load = 1, milder = false }) {
  const TOG = ['yes', 'caution', 'no'], answers = {};
  for (const s of J.scenarios) {
    const t = T.tanks[s.id];
    if (!t?.readable) { answers[s.id] = { skip: true, note: 'not readable by the engine' }; continue; }
    // a verdict the app reached on room alone follows the expert's own scale (the reading divided by `load`), so bands and counts agree
    const room = /^space/.test(t.app.by[0] ?? '') || (t.app.verdict === 'ideal' && t.app.space), pct = t.app.space ? t.app.space.pct / load : 0;
    const a = { verdict: room && load !== 1 ? (pct <= J.ideal ? 'ideal' : pct <= J.limit ? 'caution' : 'problems') : t.app.verdict, confidence: 'medium' };
    if (s.ask.includes('change')) { const c = appChange(t, s, J); a.change = c.change; if (['fewer', 'drop'].includes(c.change) && c.sp.length) a.changeSp = c.sp; }
    if (s.ask.includes('compat')) {
      const k = Math.max(0, TOG.indexOf(appTogether(t)) - (milder ? 1 : 0));
      a.together = TOG[k];
      if (k > 0) a.reasons = appReasons(t).length ? appReasons(t) : ['other'];
    }
    if (s.ask.includes('counts') && t.table) {
      const d = dimOf({ uses: t.uses }, s.focal);
      const i = nearest(t.table, J.ideal * load, d), l = nearest(t.table, J.limit * load, d);
      if (i != null) a.ideal = i;
      if (l != null) a.limit = l;
      if (i == null && l == null) a.countStatus = 'cant-say';
      if (s.mate && t.mateTable) { // the second counted species, on the dimension it fills
        const dm = dimOf({ uses: t.uses }, s.mate), mi = nearest(t.mateTable, J.ideal * load, dm), ml = nearest(t.mateTable, J.limit * load, dm);
        if (mi != null) a.mateIdeal = mi;
        if (ml != null) a.mateLimit = ml;
        if (mi == null && ml == null) a.mateStatus = 'cant-say';
      }
    }
    if (s.ask.includes('min')) { a.bigEnough = appBigEnough(t, s, J); a.smallest = [...s.min.sizes, 'larger'][appSmallest(t)]; }
    for (const k of ['max', 'maxMales']) if (s.ask.includes(k)) {
      a[k] = {};
      for (const q of s[k]) { const m = t.app.most[q.species], fig = k === 'max' ? m?.most : m?.males; a[k][q.species] = q.options[optionOf(fig, q.options)]; }
    }
    answers[s.id] = a;
  }
  return { survey: 'v4', build: buildV4(J), expert, expertKind: 'ai', modules: J.modules.map(m => m.id), made: T.made, source: 'calib-synth-v4.mjs', answers, open: [], setAside: [], carried: [] };
}

if (process.argv[1]?.endsWith('calib-synth-v4.mjs')) {
  const J = loadV4(), T = JSON.parse(readFileSync(TABLES_V4, 'utf8'));
  for (const [name, o] of [['agree', {}], ['shift', { load: 1.3, milder: true }]]) {
    const p = `research/calib/answers-synth/v4-synth-${name}.json`;
    writeFileSync(p, JSON.stringify(synthV4(J, T, { expert: `synth-${name}`, ...o }), null, 1) + '\n');
    console.log(`wrote ${p}`);
  }
}
