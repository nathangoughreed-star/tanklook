// Lane HV unit 2: "a rule that rests only on our judgment never renders red". src/data/ruleStatus.json is the small, app-side copy of the provenance statuses of the
// fields that can raise a Problem (src/data/provenance.ts is audit-only and never reaches the bundle). This file regenerates it (GEN_RULE_STATUS=1), proves it is in step with
// the audit, sweeps the engine (no Problem line whose rule fields are judgment-only), and requires every red emitter in stockSummary.ts to be classified, so a new one
// fails until someone decides what source stands behind it.
import { describe, expect, it } from 'vitest';
import { walk } from '../scripts/source-audit';
import { ruleStatusOf, isJudgment, JUDGMENT } from '../src/data/ruleStatus';
import { SPECIES } from '../src/data/species';
import { stockSummary } from '../src/ui/stockSummary';
import { stockingMemo } from '../src/scene/stocking';
import { tileState } from '../src/ui/fullnessTile';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { inferTech } from '../src/scene/tech';
import type { TankSetup } from '../src/scene/types';
// @ts-expect-error node only (no node types in this project)
const { readFileSync, writeFileSync } = await import('node:fs');

const AIR_FIELD = 'air';
const FIELDS = ['temper', 'nip', 'slow', 'prey', 'solo', 'fam', 'ph', 'phOk', 'gh', 'ghOk', 'minL', 'minLengthMm', 'alone', 'guard'];
const RANK = ['cited', 'fitted', 'derived', 'researched', 'claimed', 'assumption', 'unsourced'];
/** the weakest status in a list (null = no rule = unsourced) */
const weakest = (xs: string[]) => xs.reduce((a, b) => RANK.indexOf(b) > RANK.indexOf(a) ? b : a);
function build(): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string[]>> = {};
  for (const v of walk()) {
    if (v.target === 'AIR') { const [aid] = v.path.split('.'); ((out[aid] ??= {})[AIR_FIELD] ??= []).push(v.status ?? 'unsourced'); continue; }
    if (v.target !== 'CARE' && v.target !== 'TANKMIN') continue;
    const [id, ...rest] = v.path.split('.');
    const field = v.target === 'TANKMIN' ? 'tankmin' : rest[0];
    if (v.target === 'CARE' && !FIELDS.includes(field)) continue;
    if (v.target === 'TANKMIN' && rest[0] !== 'red') continue;
    ((out[id] ??= {})[field] ??= []).push(v.status ?? 'unsourced');
  }
  return Object.fromEntries(Object.entries(out).map(([id, f]) => [id, Object.fromEntries(Object.entries(f).map(([k, xs]) => [k, weakest(xs)]))]));
}

describe('rule statuses behind a Problem', () => {
  const built = build();
  if ((globalThis as any).process?.env.GEN_RULE_STATUS) writeFileSync('src/data/ruleStatus.json', JSON.stringify(built) + '\n');
  it('src/data/ruleStatus.json is in step with the source audit (GEN_RULE_STATUS=1 npx vitest run test/hvNoRedAudit.test.ts rewrites it)', () => {
    expect(JSON.parse(readFileSync('src/data/ruleStatus.json', 'utf8'))).toEqual(built);
  });
  it('every species in it exists', () => {
    for (const id of Object.keys(built)) expect(SPECIES.some(s => s.id === id), id).toBe(true);
  });
});

const base = (): TankSetup => { const sc = parseScene(JSON.parse(SCENES[Object.keys(SCENES).find(k => { const t = parseScene(JSON.parse(SCENES[k])).scene; return t.tanks[t.active].water.on; })!])).scene; return sc.tanks[sc.active]; };
const tankOf = (ids: string[]): TankSetup => { const S = base(), f0 = S.fish[0]; return { ...S, tech: { rows: { ...inferTech(S).rows, heater: 'one', filter: 'hob' } }, fish: ids.flatMap((id, i) => [0, 1].map(j => ({ ...f0, species: id, id: 100 * i + j }))), tank: { ...S.tank, L: 3000, D: 1000, H: 800 } } as TankSetup; };

describe('no unsourced rule renders red', () => {
  const wet = SPECIES.filter(s => s.habitat !== 'land');
  it('over every pair of aquatic species: a Problem line never rests on judgment-only fields', () => {
    const bad: string[] = [], changed = new Map<string, { n: number; ex: string[] }>();
    for (let i = 0; i < wet.length; i++) for (let j = i + 1; j < wet.length; j++) {
      const S = tankOf([wet[i].id, wet[j].id]), r = stockingMemo(S), sm = stockSummary(S, r, tileState(S, r, 'in').mins, 'in');
      for (const c of sm.cats) for (const it of c.items) {
        if (it.basis && (it.capped || it.keptRed)) { // a line whose old severity was Problem and rests on judgment only
          const k = `${it.keptRed ? 'stays RED, tagged' : 'now AMBER (was red)'} | ${it.basis.fields.join('/')}`, e = changed.get(k) ?? { n: 0, ex: [] };
          e.n++; if (e.ex.length < 3) e.ex.push(`${wet[i].id}+${wet[j].id}: ${it.text}`); changed.set(k, e);
        }
        if (it.level !== 'problem') continue;
        if (it.keptRed) continue; // predation / aggression: red by decision, tagged "our judgment" (stockSummary KEEP_RED)
        const tag = `${wet[i].id}+${wet[j].id}: ${it.text}`;
        if (it.judgment || (it.basis && isJudgment(it.basis.ids, it.basis.fields))) bad.push(tag);
        // a pair line ("X with Y: ...") or a minimum must name the rule fields it rests on (physical facts excepted), or it could hide a judgment
        if (/ with .*: /.test(it.text) && !it.basis && !/enclosure|Fresh water and salt/.test(it.text)) bad.push('no basis: ' + tag);
        if (c.id === 'minimums' && !it.basis) bad.push('no basis: ' + tag);
      }
    }
    if ((globalThis as any).process?.env.GEN_RULE_STATUS) writeFileSync('research/hv-pair-severity.md', '# Pair rules whose severity rests on judgment only (generated by test/hvNoRedAudit.test.ts, GEN_RULE_STATUS=1)\n\nEvery pair of aquatic species in the catalogue in a big tank with heater and filter. A line is listed when the rule fields behind it are claimed / assumption / unsourced.\n\n' + [...changed].sort().map(([k, e]) => `## ${k}: ${e.n} pair lines\n` + e.ex.map(x => `- ${x}`).join('\n')).join('\n\n') + '\n');
    expect(bad.slice(0, 10), `${bad.length} judgment-only Problems`).toEqual([]);
  }, 600000);
  it('the app-side lookup treats claimed / assumption / unsourced as judgment and the rest as sourced', () => {
    expect([...JUDGMENT].sort()).toEqual(['assumption', 'claimed', 'unsourced']);
    expect(ruleStatusOf('oscar', ['prey'])).toBeDefined();
  });
});

describe('every red emitter in stockSummary.ts is classified', () => {
  // each add(..., 'problem', ...) site, by a stable fragment of its source line, with the reason a Problem there is allowed
  const SITES: Record<string, string> = {
    "add('minimums', w.level === 'over' ? 'problem'": 'tank minimum: capped by ruleStatus (tankmin) when the minimum rests on judgment',
    "add('environment', 'problem', `Fresh water and salt water": 'physical fact: fresh and salt water cannot share a tank',
    "w.concern ? 'caution' : 'problem'": 'pair rules: capped by ruleStatus for the fields the reason reads (prey, temper, nip, solo, fam, chemistry)',
    "else if (sh.state === 'none') add('environment', 'problem'": 'no shared temperature: the species ranges (CARE.temp) are researched, not judgment',
    "add('environment', 'problem', `Air temperature: no shared range": 'terrarium air: capped by ruleStatus (air) when the ranges rest on judgment',
    "tol ? 'caution' : 'problem'": 'terrarium humidity: capped by ruleStatus (air) when the ranges rest on judgment',
    "if (openTop) add('environment', 'problem'": 'NOT YET AUDITED: lid rule is husbandry consensus except the crayfish / crab lines (data/lidNeed.ts); unit-2 follow-up',
    "=== 'severe' ? 'problem'": 'grazer food check: the severe band is the sourced algae-need data',
    "if (wc === 'failure') add('environment', 'problem'": 'NOT YET AUDITED: nitrogen budget rests on MET_CLASS assumptions as well as fitted constants; unit-2 follow-up',
    "if (isOver(p)) add('fullness', 'problem'": 'room used past 100%: fitted to AqAdvisor, red only past the limit',
  };
  it('lists every site and nothing else', () => {
    const src: string = readFileSync('src/ui/stockSummary.ts', 'utf8');
    const lines = src.split('\n').filter(l => /'problem'/.test(l) && /\badd\(/.test(l) && !l.trim().startsWith('//') && !l.trim().startsWith('*'));
    const unclassified = lines.filter(l => !Object.keys(SITES).some(k => l.includes(k)));
    expect(unclassified.map(l => l.trim().slice(0, 140))).toEqual([]);
    for (const k of Object.keys(SITES)) expect(src.includes(k), `classified site missing from stockSummary.ts: ${k}`).toBe(true);
  });
});
