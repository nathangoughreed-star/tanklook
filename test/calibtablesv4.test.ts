// Survey v4 (research/calib/v4/survey-v4-design.md section 9.1): what the app says today about each of the 60 tanks, one engine run per
// tank, written to research/calib/tables/v4.json for scripts/calib-fit.mjs and scripts/calib-review-v4.mjs. The tanks are frozen (build
// cba9d609); only the readings are recomputed. GEN_RETABLE_V4=1 npx vitest run test/calibtablesv4.test.ts rewrites the file; the lock
// below fails when the engine has moved since (rerun the line above, then refit and rereview).
import { describe, expect, it } from 'vitest';
import { condKey, condScenario, pickOf, retableV4, setupV4, stockAt, verdictOf, waterDepthIn, type V4Condition, type V4Doc } from '../src/calib/v4';
import { stockingOf } from '../src/scene/stocking';
import V4J from '../research/calib/v4/scenarios-v4.json';

const V4 = V4J as unknown as V4Doc;
// @ts-expect-error node only (no node types in this project)
const fs = await import('node:fs');
const url = new URL('../research/calib/tables/v4.json', import.meta.url);
/** The survey's build (make-survey-v4.mjs): FNV-1a over the tanks, stock, env, the counted species and ask. */
function buildOf(J: any) {
  const s = JSON.stringify(J.scenarios.map((x: any) => [x.id, x.tank, J.tanks[x.tank].in, x.env, x.stock, x.focal ?? null, x.mate ?? null, x.ask]));
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
/** The tables entry without the count tables (one engine run per tank, plus the gate): what the lock compares. */
const retableLite = (s: V4Doc['scenarios'][number]) => { const { table: _t, mateTable: _m, minSizes: _z, ...rest } = retableV4({ ...V4, scenarios: [] } as V4Doc, { ...s, min: undefined, ask: s.ask.filter(a => a !== 'counts') }) as any; return rest; };
const sc = (id: string) => V4.scenarios.find(s => s.id === id)!;
/** The lock's fingerprint of a reading: the overall verdict and the space percent as shown. */
const lockOf = (t: any) => t.readable ? [t.app.verdict, t.app.space ? +t.app.space.pct.toFixed(6) : null, t.app.herp.length, t.app.crowd.length, t.app.compat?.level ?? null, t.gate ?? null, t.uses, t.tlMm] : null;
// the tanks as experts' notes say they read them (scripts/calib-notes-v4.mjs, research/calib/v4/note-reading.md; Nathan 2026-10-26)
const condUrl = new URL('../research/calib/tables/v4-notes.json', import.meta.url), answersDir = new URL('../research/calib/answers/', import.meta.url);
const modelled = (c: any) => !!c && (Array.isArray(c.stock) || typeof c.tempC === 'number' || (c.tl && typeof c.tl === 'object'));
/** Every condition a readings file states that the app can model and a conditional answer rests on: [key, base tank, condition]. */
function conditions(): [string, string, V4Condition][] {
  if (!fs.existsSync(answersDir)) return [];
  const out: [string, string, V4Condition][] = [];
  for (const name of (fs.readdirSync(answersDir) as string[]).filter(n => /^v4-.*\.notes\.json$/.test(n)).sort()) {
    const R = JSON.parse(fs.readFileSync(new URL(name, answersDir), 'utf8'));
    for (const [id, r] of Object.entries(R.tanks ?? {}) as [string, any][])
      if (modelled(r.condition) && Object.values(r.fields ?? {}).some((x: any) => x?.status === 'conditional')) out.push([condKey(id, R.expert), id, r.condition]);
  }
  return out;
}
const condOf = (c: V4Condition) => ({ stock: c.stock ?? null, tempC: c.tempC ?? null, tl: c.tl ?? null });

describe('survey v4 engine tables', () => {
  if ((globalThis as any).process?.env.GEN_RETABLE_V4) {
    it('rewrites research/calib/tables/v4.json', () => {
      const tanks = Object.fromEntries(V4.scenarios.map(s => [s.id, retableV4(V4, s)]));
      fs.writeFileSync(url, JSON.stringify({ survey: 'v4', build: buildOf(V4J), made: new Date().toISOString().slice(0, 10),
        note: 'what the app says today about each v4 tank (test/calibtablesv4.test.ts, src/calib/v4.ts); count tables for the tanks that ask counts', tanks }) + '\n');
      const cond = Object.fromEntries(conditions().map(([k, id, c]) => [k, { base: id, condition: c, ...retableV4(V4, condScenario(sc(id), c, k)) }]));
      fs.writeFileSync(condUrl, JSON.stringify({ survey: 'v4', build: buildOf(V4J), made: new Date().toISOString().slice(0, 10),
        note: "each tank as an expert's note says they read it (research/calib/v4/note-reading.md): the stated stock, temperature or lengths", tanks: cond }) + '\n');
    }, 600000);
  }

  it('is the build the survey was made from', () => expect(buildOf(V4J)).toBe('cba9d609'));

  it('has a reading for every tank, on the engine as it is now (else: GEN_RETABLE_V4=1 npx vitest run test/calibtablesv4.test.ts)', () => {
    expect(fs.existsSync(url), 'no research/calib/tables/v4.json').toBe(true);
    const T = JSON.parse(fs.readFileSync(url, 'utf8'));
    expect(T.build).toBe('cba9d609');
    for (const s of V4.scenarios) {
      const t = T.tanks[s.id];
      expect(t, s.id).toBeTruthy();
      if (!t.readable) continue;
      const now = retableLite(s);
      expect(lockOf(now), `${s.id}: the engine moved since the tables were made`).toEqual(lockOf(t));
      // count tables exactly for the tanks that ask counts, with row n = the shown count
      expect(!!t.table, `${s.id} table`).toBe(s.ask.includes('counts'));
      expect(!!t.mateTable, `${s.id} mate table`).toBe(s.ask.includes('counts') && !!s.mate);
      if (t.table) expect(Object.values(t.table[s.stock.find(x => x.id === s.focal)!.n].water as Record<string, number>).reduce((a, b) => a + b, 0)).toBeCloseTo(t.app.space.water, 6);
    }
  });

  it('reads every tank a note conditions, on the engine as it is now (else: GEN_RETABLE_V4=1 npx vitest run test/calibtablesv4.test.ts)', () => {
    const want = conditions();
    if (!want.length) return;
    expect(fs.existsSync(condUrl), 'no research/calib/tables/v4-notes.json').toBe(true);
    const C = JSON.parse(fs.readFileSync(condUrl, 'utf8'));
    expect(C.build).toBe('cba9d609');
    for (const [k, id, c] of want) {
      const t = C.tanks[k];
      expect(t, `${k}: a note's condition with no reading`).toBeTruthy();
      expect(condOf(t.condition), `${k}: the note's condition changed since it was read`).toEqual(condOf(c));
      if (!t.readable) continue;
      expect(lockOf(retableLite(condScenario(sc(id), c, k))), `${k}: the engine moved since the tables were made`).toEqual(lockOf(t));
    }
  });

  it("reads a tank under a note's condition: another stock, temperature or animal length", () => {
    const a13 = sc('A13'), juv = condScenario(a13, { text: 'juveniles', tl: { neon: 20 } }, condKey('A13', 'x y'));
    expect(juv.id).toBe('A13@x_y');
    const S = setupV4(V4.tanks.g10.in, juv.env, juv.stock, juv.tl);
    expect(S.fish.every(f => f.tl === 20)).toBe(true);
    // smaller animals read emptier at the same count
    expect(stockingOf(S).spacePercent).toBeLessThan(stockingOf(setupV4(V4.tanks.g10.in, a13.env, a13.stock)).spacePercent);
    expect(condScenario(a13, { text: 'cooler', tempC: 22 }, 'k').env.tempC).toBe(22);
    expect(condScenario(a13, { text: 'fewer', stock: [{ id: 'neon', n: 12 }] }, 'k').stock).toEqual([{ id: 'neon', n: 12 }]);
  });

  it('builds the tanks the way the stocking screen does', () => {
    // sexed fish: males, then females (dimorphic species drawn and sized as females)
    const g = setupV4(V4.tanks.g10.in, sc('A03').env, sc('A03').stock).fish.filter(f => f.species === 'guppy');
    expect(g.length).toBe(8);
    expect(g.filter(f => f.sex === 'f').length).toBe(6);
    // a pair species' two animals described as a pair are an established pair
    expect(pickOf({ id: 'kribensis', n: 2, sex: [1, 1], note: 'a pair' }).pair).toBe('established');
    expect(pickOf({ id: 'banggai', n: 2, note: 'unsexed juveniles' }).pair).toBeUndefined();
    // salt, dry and paludarium tanks
    expect(setupV4(V4.tanks.g40b.in, sc('C04').env, sc('C04').stock).water.salt).toBe(true);
    expect(setupV4(V4.tanks.t36x18x16.in, sc('D02').env, sc('D02').stock).water.on).toBe(false);
    const p = setupV4(V4.tanks.p20l.in, sc('D10').env, sc('D10').stock);
    expect(p.layout.id).toBe('paludarium');
    expect(waterDepthIn(sc('D10').env.note)).toBe(4);
    expect(p.water.level).toBeLessThan(0.5);
    // the count table's split keeps the shown ratio
    expect(stockAt(sc('A16'), 'platy', 9).find(s => s.id === 'platy')!.sex).toEqual([3, 6]);
    // a dry enclosure has no Space reading
    expect(stockingOf(setupV4(V4.tanks.t36x18x16.in, sc('D02').env, sc('D02').stock)).contributors.length).toBe(0);
  });

  it('reads the overall verdict from its parts, worst first', () => {
    const base = { space: null, tankmin: [], minHead: null, crowd: [], compat: null, temp: { shared: 'broad', range: null, state: 'inside', text: '' }, herp: [], groups: [], most: {} };
    expect(verdictOf(base).verdict).toBe('ideal');
    expect(verdictOf({ ...base, compat: { level: 'concern', items: ['x'] } }).verdict).toBe('caution');
    expect(verdictOf({ ...base, crowd: ['3 bettas: fight'], compat: { level: 'concern', items: ['x'] } })).toEqual({ verdict: 'problems', by: ['crowd: 3 bettas'], rest: null });
    expect(verdictOf({ ...base, compat: { level: 'high', items: ['x'] } }).verdict).toBe('unworkable');
    expect(verdictOf({ ...base, herp: [{ level: 'warn', who: 'Leopard gecko', text: '2 males: males fight' }] }).verdict).toBe('problems');
  });

  it('reads "too small" as a verdict of its own, with the rest on the 4 steps beside it (Nathan 2026-10-26)', () => {
    const base = { space: null, tankmin: [], minHead: null, crowd: [], compat: null, temp: { shared: 'broad', range: null, state: 'inside', text: '' }, herp: [], groups: [], most: {} };
    const red = { id: 'oscar', pct: 182, comfortPct: 182, level: 'red' as const, reason: '' };
    expect(verdictOf({ ...base, tankmin: [red], compat: { level: 'concern', items: ['x'] } })).toEqual({ verdict: 'too-small', by: ['tankmin red: oscar'], rest: { verdict: 'caution', by: ['compat concern'] } });
    expect(verdictOf({ ...base, herp: [{ level: 'warn', who: 'Leopard gecko', text: 'floor 1.39 sq ft; 1 animal need at least 4.5 sq ft' }] }).verdict).toBe('too-small');
    // the app reads B01 (one oscar in a 55) too small, the rest of it ideal
    const b01 = retableLite(sc('B01')).app;
    expect([b01.verdict, b01.rest?.verdict]).toEqual(['too-small', 'ideal']);
  });
});
