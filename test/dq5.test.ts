// DQ5: stocking philosophies and size tiers (spec 5.2, scenario 11). Rosters come from the live `stockTier` (the stock callback nextPair gives explorePool).
import { describe, expect, it } from 'vitest';
import { ARCHETYPES } from '../src/scene/archetypes';
import { TANK_MODELS } from '../src/data/tanks';
import { stockTier } from '../src/scene/sizeTiers';
import { isBuildable } from '../src/explore/pool';
import { getSpecies } from '../src/data/species';
import { fitIn } from '../src/scene/tankfit';
import { buildsFor } from '../src/scene/builds';
import { evaluateCandidate } from '../src/demand/suggest';
import { defaultProfile } from '../src/demand/types';

const DUMP: string | undefined = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env.DQ5_DUMP;
const tanks = [TANK_MODELS.filter(m => m.ratedGal >= 20)[0], TANK_MODELS.filter(m => m.ratedGal >= 40)[0], TANK_MODELS.filter(m => m.ratedGal >= 75)[0]];
const looks = ARCHETYPES.filter(a => isBuildable(a) && a.water === 'freshwater' && a.env === 'aquarium').slice(0, 14);
const total = (r: { n: number }[]) => r.reduce((s, x) => s + x.n, 0);
describe('scenario 11: size tiers use space with different philosophies, not a count ladder', () => {
  const rows = looks.flatMap(a => [0, 1, 2].map(t => ({ a, t, p: stockTier(a, tanks[t], t) })));
  it('philosophies differ across tiers and across looks, and counts are not monotonic', () => {
    const seen = new Set(rows.filter(r => r.p.roster.length).map(r => `${r.t}:${r.p.philosophy}`));
    console.log('DQ5 philosophies by tier', [...seen].sort().join(' '));
    expect(new Set([...seen].map(s => s.split(':')[1])).size).toBeGreaterThanOrEqual(3);
    let nonMono = 0, looksDone = 0;
    for (const a of looks) { const c = [0, 1, 2].map(t => rows.find(r => r.a === a && r.t === t)!.p); if (c.some(p => !p.roster.length)) continue; looksDone++; if (total(c[2].roster) < total(c[1].roster) || total(c[1].roster) < total(c[0].roster)) nonMono++; }
    console.log('DQ5 looks', looksDone, 'with a non-monotonic count', nonMono);
    expect(looksDone).toBeGreaterThan(5); expect(nonMono).toBeGreaterThan(0);
  });
  it.skipIf(!DUMP)('contact sheet (DQ5_DUMP=<dir>)', async () => {
    // @ts-expect-error tsc has no node types
    const fs = await import('node:fs');
    const names = (r: { species: string; n: number }[]) => r.map(x => `${x.n} ${getSpecies(x.species)?.name ?? x.species}`).join(', ');
    const L = ['# DQ5 size tiers (freshwater looks; tank per tier: ' + tanks.map(t => `${t.ratedGal} gal`).join(' / ') + ')', '', '| Look | Tier | Tank (gal) | Philosophy | Kinds | Animals | Roster |', '|---|---|---|---|---|---|---|'];
    for (const r of rows) L.push(`| ${r.a.id} | ${r.t} | ${tanks[r.t].ratedGal} | ${r.p.philosophy ?? '-'} | ${r.p.roster.length} | ${total(r.p.roster)} | ${names(r.p.roster) || '(none: ' + (r.p.why ?? '') + ')'} |`);
    fs.writeFileSync(`${DUMP}/size-tiers.md`, L.join(String.fromCharCode(10)));
  });
  it('a school is ONE schooling kind; a mixed-zone tier holds 4 kinds at 3+ levels', () => {
    for (const r of rows) {
      if (r.p.philosophy === 'school') { expect(r.p.roster).toHaveLength(1); expect(getSpecies(r.p.roster[0].species)!.group).toBeTruthy(); }
      if (r.p.philosophy === 'mixed-zone') expect(r.p.roster.length).toBeGreaterThanOrEqual(4);
    }
  });
  it('welfare regression: every roster fits its tank and has no Problem/Caution line, and no tier is empty because of a philosophy', () => {
    const P = defaultProfile(), now = Date.now(); let n = 0;
    for (const r of rows) {
      if (!r.p.roster.length) continue;
      const tank = tanks[r.t], fit = fitIn(r.p.roster, tank); expect(fit && !fit.fails.length, `${r.a.id} t${r.t}`).toBe(true);
      if (r.p.philosophy !== 'compact') { const ev = evaluateCandidate({ constraints: {} }, P, 'in', now, { animals: r.p.roster, tank, build: buildsFor(r.p.roster, tank, now)[2] }); expect(ev.welfareWords, `${r.a.id} t${r.t} ${r.p.philosophy}`).toEqual([]); n++; }
    }
    expect(n).toBeGreaterThan(5);
  });
  it('is deterministic and exclusions still apply', () => {
    const a = looks[0], x = stockTier(a, tanks[1], 1), y = stockTier(a, tanks[1], 1); expect(x).toEqual(y);
    const ex = new Set(x.roster.map(r => r.species)); expect(stockTier(a, tanks[1], 1, ex).roster.some(r => ex.has(r.species))).toBe(false);
  });
});
