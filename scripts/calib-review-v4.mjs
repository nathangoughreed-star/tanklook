// Survey v4 review (research/calib/v4/survey-v4-design.md section 6): the experts against what the app says today, per `tests` tag, not
// per tank. Plain node, no dependencies, deterministic. Reads research/calib/v4/scenarios-v4.json, its engine tables
// (research/calib/tables/v4.json, test/calibtablesv4.test.ts) and one or more v4 answer files (scripts/calib-parse-v4.mjs), and writes
// research/calib/review-v4-<expert>.md. Hand-written findings below "## Findings" survive a rerun; a hand-written review under the same
// name is never overwritten (the script writes .generated.md beside it), as calib-review.mjs does.
// Run: node scripts/calib-review-v4.mjs research/calib/answers/v4-<expert>.json [...] [--out <path>]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dimOf } from './calib-fit.mjs';
import { readOn } from './calib-review.mjs';
import { buildV4, loadV4, VERDICTS } from './calib-parse-v4.mjs';

export const TABLES_V4 = 'research/calib/tables/v4.json';
const median = xs => { const s = [...xs].sort((a, b) => a - b), k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };
const mode = xs => { const c = new Map(); for (const x of xs) c.set(x, (c.get(x) ?? 0) + 1); return [...c.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))[0]?.[0]; };
const gmean = xs => Math.exp(xs.reduce((a, x) => a + Math.log(x), 0) / xs.length);
const mv = m => `${m >= 1 ? '+' : ''}${Math.round((m - 1) * 100)} %`, pc = x => `${Math.round(x)} %`;
const vIx = v => VERDICTS.indexOf(v), vName = x => x == null ? '-' : Number.isInteger(x) ? VERDICTS[x] : `${VERDICTS[Math.floor(x)]}/${VERDICTS[Math.ceil(x)]}`;
/** Flagged when a tag's median count fix is more than this far from 1 (design section 6). */
export const FIX_FLAG = 1.15;

// ---------- the app's side, read from the tables ----------
/** The app's answer to "keep these together": no for a blocked pair, a temperature with no shared range (or outside it), a herp that must
 *  not share; caution for a concern or a narrow shared range; else yes. */
export function appTogether(t) {
  const a = t.app;
  if (a.compat?.level === 'high' || ['none', 'single'].includes(a.temp.shared) || a.temp.state === 'outside' || a.herp.some(h => h.level === 'warn' && /^not with/.test(h.text))) return 'no';
  if (a.compat?.level === 'concern' || a.temp.shared === 'narrow') return 'caution';
  return 'yes';
}
/** The survey's reason categories the app's own lines fall in (design section 5: the engine's gate kinds). */
export function appReasons(t) {
  const out = new Set(), a = t.app;
  for (const it of a.compat?.items ?? []) {
    if (/would eat|eats? /.test(it)) out.add('eat');
    if (/fins|nip|harass/.test(it)) out.add('nip');
    if (/aggressive|rival|territor|defends|bully/.test(it)) out.add('aggression');
    if (/water (chemistry|hardness)|salt/.test(it)) out.add('chemistry');
  }
  if (['none', 'single', 'narrow'].includes(a.temp.shared) || a.temp.state === 'outside') out.add('temperature');
  if (a.herp.some(h => h.level === 'warn' && /^not with/.test(h.text))) out.add('habitat');
  return [...out].sort();
}
const nameIn = (text, s, J) => s.stock.map(x => x.id).filter(id => text.includes(J.species[id]?.name ?? id));
/** The first change the app's own reading points to, from the parts that set its verdict (verdictOf's `by`), for one tank. */
export function appChange(t, s, J) {
  const a = t.app, by = a.by[0] ?? '';
  if (a.verdict === 'ideal' || !by) return { change: 'nothing', sp: [] };
  if (/^space/.test(by)) return { change: 'fewer', sp: [a.space.top].filter(Boolean) };
  if (/^crowd/.test(by)) return { change: 'fewer', sp: nameIn(by, s, J) };
  if (/^tankmin|^herp: .*: (floor|enclosure)/.test(by)) return { change: 'bigger', sp: [] };
  if (/^group too small|^sex mix/.test(by)) return { change: 'ratio', sp: [] };
  if (/^herp: .*: \d+ (males|females)/.test(by)) return { change: 'ratio', sp: [] };
  if (/^herp: .*: \d+ animals/.test(by)) return { change: 'fewer', sp: nameIn(by.split(':')[1], s, J) };
  if (/^compat|^temperature|^herp: .*: not with/.test(by)) return { change: 'drop', sp: nameIn([...(a.compat?.items ?? []), by].join(' '), s, J).slice(-1) };
  return { change: 'other', sp: [] };
}
/** Whether an expert's change agrees with the app's reading (any of its parts, not only the first). */
export function changeFits(c, sp, t, s, J) {
  const a = t.app, names = ids => ids.map(id => J.species[id]?.name ?? id);
  switch (c) {
    case 'nothing': return a.verdict === 'ideal';
    case 'fewer': return sp.some(id => id === a.space?.top || a.crowd.some(w => names([id]).some(n => w.includes(n))) || a.herp.some(h => /^\d+ animals/.test(h.text) && h.who === J.species[id]?.name));
    case 'bigger': return a.tankmin.some(m => m.level !== 'green') || a.herp.some(h => /^(floor|enclosure)/.test(h.text) && h.level !== 'info');
    case 'drop': return appTogether(t) !== 'yes' && (!sp.length || sp.some(id => [...(a.compat?.items ?? []), ...a.herp.map(h => `${h.who} ${h.text}`)].some(x => names([id]).some(n => x.includes(n))) || appReasons(t).includes('temperature')));
    case 'ratio': return a.groups.some(g => g.band === 'avoid' || /Your mix/.test(g.ratio ?? '')) || a.crowd.some(w => /males/.test(w)) || a.herp.some(h => /males|females/.test(h.text));
    default: return null; // notroom (food, maturity, habitat) and other: no app part to hold it against
  }
}
/** An offered count label ("7+", "16+", "3") as a number and whether it means "or more". */
const optVal = o => ({ v: parseFloat(o), plus: /\+$/.test(o) });
/** The offered option the app's figure falls in (no figure = no limit: the top option). */
export function optionOf(most, options) {
  if (most == null) return options.length - 1;
  let k = 0;
  options.forEach((o, i) => { if (optVal(o).v <= most) k = i; });
  return k;
}
/** The tank minimum at the four offered sizes: index of the smallest the app calls green (Recommended), 4 = none ("larger"). */
export const appSmallest = t => { const i = (t.minSizes ?? []).findIndex(z => z.level === 'green'); return i < 0 ? 4 : i; };
/** Red at the tank itself for the asked species: the app says it is not big enough. */
export function appBigEnough(t, s, J) {
  const sp = s.min.species, row = t.app.tankmin.find(m => m.id === sp);
  if (row) return row.level === 'red' ? 'no' : 'yes';
  return t.app.herp.some(h => h.who === J.species[sp]?.name && h.level === 'warn' && /^(floor|enclosure)/.test(h.text)) ? 'no' : 'yes';
}

// ---------- counts ----------
/** One count answer against the engine: the reading at it, the point fix (anchor / reading) and the least fix that makes it the
 *  engine's own nearest count (the geometric midpoints to the neighbouring counts bound it), so rounding a small count is no flag. */
export function countFix(tbl, n, anchor, dim) {
  if (!(n >= 1) || n >= tbl.length) return null;
  const at = k => readOn(tbl, k, dim), here = at(n);
  if (!(here > 0)) return null;
  // the count below: for n = 1, the tankmates alone (row 0), which bounds the move as well
  const lo = n + 1 < tbl.length ? anchor / Math.sqrt(here * at(n + 1)) : 0, prev = at(n - 1), hi = prev > 0 ? anchor / Math.sqrt(here * prev) : Infinity;
  return { at: here, fix: anchor / here, least: Math.min(Math.max(1, lo), hi) };
}

// ---------- the review ----------
/** Everything the review shows, and the flags it raises (each { kind, key, dir, detail }). `files`: v4 answer files (one per expert). */
export function reviewV4(J, T, files) {
  const build = buildV4(J), flags = [], skipped = [];
  const use = files.filter(f => { if (f.survey !== 'v4' || f.build !== build) { skipped.push(`${f.expert}: build ${f.build}, not ${build}`); return false; } return true; });
  const experts = use.map(f => f.expert), by = Object.fromEntries(J.scenarios.map(s => [s.id, s]));
  const ans = id => use.map(f => ({ e: f.expert, a: f.answers?.[id] })).filter(x => x.a && !x.a.skip);
  const readable = J.scenarios.filter(s => T.tanks[s.id]?.readable);
  const unread = J.scenarios.filter(s => !T.tanks[s.id]?.readable).map(s => `${s.id} (${T.tanks[s.id]?.why ?? 'no reading'})`);
  const exp = s => { const v = ans(s.id).map(x => vIx(x.a.verdict)).filter(x => x >= 0); return v.length ? median(v) : null; };
  const appV = s => vIx(T.tanks[s.id].app.verdict);
  let md = `# Calibration review, survey v4: ${experts.join(', ') || 'no experts'}\n\nBuild ${build}. Engine readings: the current engine (research/calib/tables/v4.json, ${T.made}). ${use.length} expert${use.length === 1 ? '' : 's'} (${use.map(f => `${f.expert}${f.expertKind ? ` (${f.expertKind === 'ai' ? 'an AI model' : f.expertKind})` : ''}: modules ${(f.modules ?? []).join(', ')}`).join('; ')}). With more than one expert each tank reads their median. The app's overall verdict is src/calib/v4.ts verdictOf, from its parts (space band, tank minimum, fighting warnings, compatibility, temperature, herp checks, group bands); "milder" means the experts judge the tank less severely than the app.${unread.length ? ` Not readable by the engine: ${unread.join('; ')}.` : ''}${skipped.length ? ` Files left out: ${skipped.join('; ')}.` : ''}\n\n`;

  // 1. verdicts per tag
  const tags = [...new Set(readable.flatMap(s => s.tests))].sort();
  md += `## Verdict per tag\n\nFlagged: half or more of the tag's answered tanks a band off the app, all in the same direction.\n\n| tag | tanks | app | experts | agree | milder | harsher | |\n|---|---|---|---|---|---|---|---|\n`;
  for (const tag of tags) {
    const ss = readable.filter(s => s.tests.includes(tag)), rows = ss.map(s => ({ s, a: appV(s), e: exp(s) })), done = rows.filter(r => r.e != null);
    const milder = done.filter(r => r.e - r.a <= -1).length, harsher = done.filter(r => r.e - r.a >= 1).length, agree = done.length - milder - harsher;
    const flag = done.length && milder + harsher >= done.length / 2 && !(milder && harsher);
    if (flag) flags.push({ kind: 'verdict', key: tag, dir: milder ? 'milder' : 'harsher', detail: `${milder + harsher} of ${done.length} tanks` });
    md += `| ${tag} | ${ss.map(s => s.id).join(' ')} | ${rows.map(r => VERDICTS[r.a]).join(', ')} | ${rows.map(r => vName(r.e)).join(', ')} | ${agree} | ${milder} | ${harsher} | ${flag ? `**flag: experts ${milder ? 'milder' : 'harsher'}**` : ''} |\n`;
  }
  // the 4 x 4 agreement table per tag family
  md += `\n### Agreement by family (rows the app, columns the experts' median, tanks)\n\n`;
  for (const fam of [...new Set(tags.map(t => t.split('.')[0]))]) {
    const ss = readable.filter(s => s.tests.some(t => t.startsWith(fam + '.'))), m = VERDICTS.map(() => VERDICTS.map(() => 0));
    for (const s of ss) { const e = exp(s); if (e != null) m[appV(s)][Math.round(e)]++; }
    if (!m.flat().some(Boolean)) continue;
    md += `**${fam}** (${ss.length} tanks)\n\n| app \\ experts | ${VERDICTS.join(' | ')} |\n|---|---|---|---|---|\n${VERDICTS.map((v, i) => `| ${v} | ${m[i].join(' | ')} |`).join('\n')}\n\n`;
  }

  // 2. counts
  const countTanks = readable.filter(s => s.ask.includes('counts') && T.tanks[s.id].table);
  const fixOf = {};
  md += `## Count fix per tank\n\nEach count read on the dimension its species fills today (as calib-fit.mjs does). "fix" is the multiplier the engine's reading needs (below 0 % the engine reads the tank too full); "least" is the smallest move that makes the expert's count the engine's own nearest count, so a rounded small count is not a disagreement. A tank's fix pools its counted species and its second counted species (the bottom dweller of six tanks, the line below it, marked †). Fitted (calib-fit.mjs): the tanks with a space.* or golden.* tag.\n\n| tank | counted | shown -> engine | ideal -> engine | limit -> engine | fix | least | fitted |\n|---|---|---|---|---|---|---|---|\n`;
  for (const s of countTanks) {
    const t = T.tanks[s.id], per = [];
    // the counted species, then the second one: [species, its table, the answer keys, the status key]
    const who = [[s.focal, t.table, 'ideal', 'limit', 'countStatus'], ...(s.mate && t.mateTable ? [[s.mate, t.mateTable, 'mateIdeal', 'mateLimit', 'mateStatus']] : [])];
    const cells = who.map(() => ({ ideal: [], limit: [] }));
    for (const { a } of ans(s.id)) {
      if (a.change === 'notroom' || (s.min && a.bigEnough === 'no')) continue;
      const fx = [];
      who.forEach(([sp, tbl, ki, kl, ks], w) => {
        const d = dimOf({ uses: t.uses }, sp);
        for (const [k, key, anchor] of [['ideal', ki, J.ideal], ['limit', kl, J.limit]]) {
          const c = countFix(tbl, a[key], anchor, d);
          cells[w][k].push(a[key] === 0 ? '0' : c ? `${a[key]} -> ${pc(c.at)}` : a[ks] ? a[ks] : '-');
          if (c) fx.push(c);
        }
      });
      if (fx.length) per.push({ fix: gmean(fx.map(c => c.fix)), least: gmean(fx.map(c => c.least)) });
    }
    const f = per.length ? { fix: median(per.map(p => p.fix)), least: median(per.map(p => p.least)) } : null;
    if (f) fixOf[s.id] = f;
    who.forEach(([sp, tbl], w) => {
      const d = dimOf({ uses: t.uses }, sp), shown = s.stock.find(x => x.id === sp).n;
      md += `| ${w ? '' : s.id} | ${sp}${w ? ' †' : ''} (${d}) | ${shown} -> ${pc(readOn(tbl, shown, d))} | ${cells[w].ideal.join(', ') || '-'} | ${cells[w].limit.join(', ') || '-'} | ${!w && f ? mv(f.fix) : ''} | ${!w && f ? mv(f.least) : ''} | ${w ? '' : s.tests.some(x => /^(space|golden)\./.test(x)) ? 'yes' : 'no'} |\n`;
    });
  }
  md += `\n### Count fix per tag\n\nFlagged: the median least fix of the tag's count tanks more than ${Math.round((FIX_FLAG - 1) * 100)} % off.\n\n| tag | tanks | median fix | median least | |\n|---|---|---|---|---|\n`;
  for (const tag of tags) {
    const ss = countTanks.filter(s => s.tests.includes(tag) && fixOf[s.id]);
    if (!ss.length) continue;
    const m = median(ss.map(s => fixOf[s.id].fix)), l = median(ss.map(s => fixOf[s.id].least)), flag = Math.abs(Math.log(l)) > Math.log(FIX_FLAG);
    if (flag) flags.push({ kind: 'count', key: tag, dir: l < 1 ? 'engine too full' : 'engine too empty', detail: mv(l) });
    md += `| ${tag} | ${ss.map(s => s.id).join(' ')} | ${mv(m)} | ${mv(l)} | ${flag ? `**flag: engine reads ${l < 1 ? 'too full' : 'too empty'}**` : ''} |\n`;
  }

  // 3. the first change
  md += `\n## The first thing to change, against the app\n\nfewer X: the app's biggest contributor on its binding dimension, or a fighting warning on X; bigger: a tank-minimum or herp floor line; drop X: a compatibility, temperature or herp line naming X; ratio: a group band, sex mix or males line; nothing: the app's ideal. notroom (food, maturity, habitat) and other have no app part to hold against.\n\n| tank | app's reading | experts | fits the app | |\n|---|---|---|---|---|\n`;
  for (const s of readable.filter(s => s.ask.includes('change'))) {
    const t = T.tanks[s.id], as = ans(s.id).filter(x => x.a.change);
    if (!as.length) continue;
    const c = mode(as.map(x => x.a.change)), sp = [...new Set(as.filter(x => x.a.change === c).flatMap(x => x.a.changeSp ?? []))], fit = changeFits(c, sp, t, s, J), ac = appChange(t, s, J);
    if (fit === false) flags.push({ kind: 'change', key: s.id, dir: c, detail: `app: ${ac.change}${ac.sp.length ? ' ' + ac.sp.join(', ') : ''}` });
    md += `| ${s.id} | ${t.app.verdict}: ${t.app.by.join('; ') || '-'} | ${as.map(x => `${x.a.change}${x.a.changeSp?.length ? ' ' + x.a.changeSp.join(', ') : ''}`).join('; ')} | ${fit == null ? 'not checked' : fit ? 'yes' : 'no'} | ${fit === false ? '**flag**' : ''} |\n`;
  }

  // 4. compatibility
  md += `\n## Keep together, and why, against compatRisks\n\nThe app's answer: no for a blocked pair, no shared temperature, or a herp that must not share; caution for a concern or a narrow shared temperature. Reasons in the survey's categories (eat = prey, nip, aggression = temper / territory / guard, chemistry, temperature, habitat = herp mates); "disease" has no rule (a gap, design section 6.4).\n\n| tank | app | app's lines | experts | app reasons | expert reasons | |\n|---|---|---|---|---|---|---|\n`;
  const TOG = ['yes', 'caution', 'no'];
  for (const s of readable.filter(s => s.ask.includes('compat'))) {
    const t = T.tanks[s.id], as = ans(s.id).filter(x => x.a.together);
    if (!as.length) continue;
    const app = appTogether(t), e = median(as.map(x => TOG.indexOf(x.a.together))), ar = appReasons(t);
    const votes = new Map(); for (const x of as) for (const r of x.a.reasons ?? []) votes.set(r, (votes.get(r) ?? 0) + 1);
    const er = [...votes.entries()].filter(([, n]) => n >= as.length / 2).map(([r]) => r).sort(), extra = er.filter(r => !ar.includes(r));
    const off = Math.abs(e - TOG.indexOf(app)) >= 1;
    if (off) flags.push({ kind: 'compat', key: s.id, dir: e < TOG.indexOf(app) ? 'milder' : 'harsher', detail: `app ${app}, experts ${TOG[Math.round(e)]}` });
    if (e >= 1 && extra.length) flags.push({ kind: 'reasons', key: s.id, dir: 'expert-only', detail: extra.join(', ') });
    const lines = [...(t.app.compat?.items ?? []), ...(t.app.temp.shared !== 'broad' && t.app.temp.shared !== 'unknown' ? [`temperature ${t.app.temp.shared}`] : []), ...t.app.herp.filter(h => /^not with/.test(h.text)).map(h => `${h.who}: ${h.text.split('.')[0]}`)];
    md += `| ${s.id} | ${app} | ${lines.join('; ') || '-'} | ${as.map(x => x.a.together).join(', ')} | ${ar.join(', ') || '-'} | ${er.join(', ') || '-'} | ${[off && '**flag**', e >= 1 && extra.length && `**not in the app: ${extra.join(', ')}**`].filter(Boolean).join(' ')} |\n`;
  }

  // 5. minimums
  md += `\n## Big enough and smallest size, against tankmin red / green\n\nThe app's smallest is the first offered size it calls green (Recommended) for the species as stocked; "not big enough" is its red line at this tank (for a land animal, herpcheck's bare floor or height).\n\n| tank | species | app at the four sizes | app smallest | experts smallest | app big enough | experts | |\n|---|---|---|---|---|---|---|---|\n`;
  for (const s of readable.filter(s => s.ask.includes('min'))) {
    const t = T.tanks[s.id], as = ans(s.id), sizes = [...s.min.sizes, 'larger'], appS = appSmallest(t), appB = appBigEnough(t, s, J);
    const si = as.map(x => sizes.indexOf(x.a.smallest)).filter(i => i >= 0), be = as.map(x => x.a.bigEnough).filter(Boolean);
    if (!si.length && !be.length) continue;
    const eS = si.length ? median(si) : null, eB = be.length ? mode(be) : null, offS = eS != null && Math.abs(eS - appS) >= 1, offB = eB != null && eB !== appB;
    if (offS) flags.push({ kind: 'tankmin', key: `${s.id} ${s.min.species}`, dir: eS > appS ? 'experts want larger' : 'experts accept smaller', detail: `app ${sizes[appS]}, experts ${sizes[Math.round(eS)]}` });
    if (offB) flags.push({ kind: 'bigEnough', key: `${s.id} ${s.min.species}`, dir: eB, detail: `app ${appB}` });
    md += `| ${s.id} | ${s.min.species} | ${t.minSizes.map(z => z.level).join(', ')} | ${sizes[appS]} | ${eS != null ? sizes[Math.round(eS)] : '-'} | ${appB} | ${be.join(', ') || '-'} | ${[offS && '**flag**', offB && '**flag: big enough**'].filter(Boolean).join(' ')} |\n`;
  }

  // 6. maxima
  md += `\n## The most of a species, against groups.ts and herpstock.ts\n\nThe app's figure for this tank (groups.ts territory or max, one for a solo species; herpstock max and the floor per extra animal), placed among the offered counts.\n\n| tank | question | app figure | app option | experts | |\n|---|---|---|---|---|---|\n`;
  for (const s of readable) for (const k of ['max', 'maxMales']) for (const q of s[k] ?? []) {
    const t = T.tanks[s.id], m = t.app.most[q.species], fig = k === 'max' ? m?.most : m?.males, as = ans(s.id).map(x => x.a[k]?.[q.species]).filter(Boolean);
    if (!as.length) continue;
    const noRule = k === 'maxMales' && fig == null, appO = optionOf(fig, q.options), eO = median(as.map(o => q.options.indexOf(o)).filter(i => i >= 0)), off = !noRule && Math.abs(eO - appO) >= 1;
    if (off) flags.push({ kind: k, key: `${s.id} ${q.species}`, dir: eO > appO ? 'experts allow more' : 'experts allow fewer', detail: `app ${q.options[appO]}, experts ${q.options[Math.round(eO)]}` });
    md += `| ${s.id} | ${k} ${q.species}${q.label ? ` (${q.label})` : ''} | ${fig ?? 'no limit'} (${m?.from ?? '-'}) | ${noRule ? 'no males rule' : q.options[appO]} | ${as.join(', ')} | ${off ? '**flag**' : ''} |\n`;
  }

  // 7. about the answers
  md += `\n## About the answers\n\n| expert | module | answered | skipped | open | set aside |\n|---|---|---|---|---|---|\n`;
  for (const f of use) for (const m of f.modules ?? []) {
    const ids = J.scenarios.filter(s => s.module === m).map(s => s.id), a = ids.map(id => f.answers?.[id]).filter(Boolean);
    md += `| ${f.expert} | ${m} | ${a.filter(x => !x.skip).length} | ${a.filter(x => x.skip).length} | ${ids.length - a.length} | ${(f.setAside ?? []).filter(x => by[x.tank]?.module === m).length} |\n`;
  }
  const conf = use.flatMap(f => Object.values(f.answers ?? {}).map(a => a.confidence).filter(Boolean));
  md += `\nConfidence: ${['low', 'medium', 'high'].map(c => `${c} ${conf.filter(x => x === c).length}`).join(', ')}. A module a keeper mostly skips is outside their domain; one an LLM skips is a prompt problem (design section 5).\n`;
  const notes = use.flatMap(f => Object.entries(f.answers ?? {}).filter(([, a]) => a.note).map(([id, a]) => `**${id}** (${f.expert}): ${a.note.replace(/\n+/g, ' ')}`));
  if (notes.length) md += `\n## Notes (the experts' own words)\n\n${notes.join('\n\n')}\n`;
  md += `\n## Flags\n\n${flags.length ? flags.map(f => `- ${f.kind} ${f.key}: ${f.dir} (${f.detail})`).join('\n') : 'None: the answers agree with the app on every tag, count, change, pair, minimum and maximum asked.'}\n`;
  return { md, flags };
}

/** The review file for these experts; an existing review's hand-written Findings are kept. */
export function writeReview(out, md) {
  let old = existsSync(out) ? readFileSync(out, 'utf8') : '';
  if (old && !old.startsWith('# Calibration review, survey v4')) { out = out.replace(/\.md$/, '.generated.md'); old = existsSync(out) ? readFileSync(out, 'utf8') : ''; console.warn(`kept the hand-written review; writing ${out}`); }
  writeFileSync(out, md + (old.includes('## Findings') ? '\n' + old.slice(old.indexOf('## Findings')) : '\n## Findings\n\n(hand-written: the flagged tags, the change each suggests, and what round B should ask)\n'));
  return out;
}

if (process.argv[1]?.endsWith('calib-review-v4.mjs')) {
  const args = process.argv.slice(2), outAt = args.indexOf('--out'), paths = args.filter((a, i) => !a.startsWith('--') && !(outAt >= 0 && i === outAt + 1));
  if (!paths.length) { console.error('usage: node scripts/calib-review-v4.mjs research/calib/answers/v4-<expert>.json [...] [--out <path>]'); process.exit(1); }
  if (!existsSync(TABLES_V4)) { console.error(`no ${TABLES_V4}: GEN_RETABLE_V4=1 npx vitest run test/calibtablesv4.test.ts`); process.exit(1); }
  const J = loadV4(), T = JSON.parse(readFileSync(TABLES_V4, 'utf8')), files = paths.map(p => JSON.parse(readFileSync(p, 'utf8')));
  if (T.build !== buildV4(J)) { console.error(`${TABLES_V4} is build ${T.build}, the scenarios ${buildV4(J)}: rerun GEN_RETABLE_V4=1 npx vitest run test/calibtablesv4.test.ts`); process.exit(1); }
  const bad = files.filter(f => f.survey !== 'v4' || f.build !== T.build);
  if (bad.length) { console.error(`not answers to build ${T.build}: ${bad.map(f => `${f.expert} (${f.survey}, build ${f.build})`).join(', ')}`); process.exit(1); }
  const { md, flags } = reviewV4(J, T, files);
  const out = writeReview(outAt >= 0 ? args[outAt + 1] : `research/calib/review-v4-${files.map(f => String(f.expert).replace(/[^A-Za-z0-9_-]+/g, '_')).join('+')}.md`, md);
  console.log(`wrote ${out}: ${flags.length} flag(s)${flags.length ? ': ' + [...new Set(flags.map(f => f.kind))].map(k => `${k} ${flags.filter(f => f.kind === k).length}`).join(', ') : ''}`);
}
