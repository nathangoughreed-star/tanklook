// Lane AB5: gear follows needs, size is a real design variable, quick-preference filters. Run across MANY generated candidates (every freshwater look, three sizes), not one hand-built case.
import { describe, expect, it } from 'vitest';
import { explorePool, isBuildable } from '../src/explore/pool';
import { ARCHETYPES } from '../src/scene/archetypes';
import { customTankWants } from '../src/demand/suggest';
import { briefToWants } from '../src/scene/brief';
import { emptyBrief } from '../src/ui/setupBrief';
import { defaultProfile } from '../src/demand/types';
import { factsOf, scoreScene } from '../src/scene/pairFacts';
import { parWanted } from '../src/demand/needs';
import { lightOutCached } from '../src/scene/lightout';
import { layerOf } from '../src/scene/items';
import { stockTier } from '../src/scene/sizeTiers';
import { fitGear } from '../src/scene/gearFit';
import { needFeed } from '../src/scene/tech';
import { NEEDS } from '../src/scene/lightneeds';
import { isFloat } from '../src/art/plants';
import { ensureUids } from '../src/scene/uid';
import type { TankSetup } from '../src/scene/types';

const b = emptyBrief(), w = customTankWants(b, briefToWants(b)), P = defaultProfile();
const looks = ARCHETYPES.filter(a => isBuildable(a) && a.env !== 'terrarium' && a.env !== 'paludarium' && a.water !== 'saltwater').slice(0, 10);
const pool: { id: string; gal: number; S: TankSetup; tier: number }[] = [];
const needCo2 = (S: TankSetup) => S.items.some(i => layerOf(i) === 'plant' && !isFloat(i.variant) && (NEEDS[i.variant] as { co2?: string } | undefined)?.co2 === 'required');
describe('gear follows what is drawn (many generated candidates)', () => {
  it('generates the pool', () => {
    for (const a of looks) { const r = explorePool(w, P, 'in', Date.now(), { only: [a.id], sizes: 3, explain: false, stock: stockTier }); [...r.eligible, ...r.provisional].forEach((c, k) => pool.push({ id: a.id, gal: c.tank.ratedGal, S: ensureUids(structuredClone(c.scene)), tier: k })); }
    expect(pool.length).toBeGreaterThan(15);
  }, 280000);
  it('after fitGear no candidate is drawn above its light, and CO2 is priced exactly when a drawn plant requires it', () => {
    let co2n = 0, lit = 0;
    for (const x of pool) {
      const { scene } = fitGear(x.S), plants = scene.items.some(i => layerOf(i) === 'plant');
      if (plants && scene.light.owned !== true) { const want = parWanted(scene), par = lightOutCached(scene)?.mean ?? 0; if (want > 0) { lit++; expect(par, `${x.id} ${x.gal}gal`).toBeGreaterThanOrEqual(want - 0.5); } }
      const buys = factsOf(scene, b, scoreScene(scene, b, w, P, Date.now())).toBuy.some(l => /co2/i.test(`${l.key ?? ''} ${l.label}`));
      if (needCo2(scene)) { co2n++; expect(scene.grow.feed, `${x.id} ${x.gal}gal`).toBe('co2'); expect(buys, `${x.id} ${x.gal}gal CO2 priced`).toBe(true); }
      else expect(needFeed(scene) === 'co2' || buys, `${x.id} carries CO2 nothing drawn needs`).toBe(false);
    }
    console.log(`gear audit: ${pool.length} candidates, ${lit} with plants needing light, ${co2n} needing CO2`);
  }, 280000);
  it('a "No CO2" requirement removes every injected-CO2 candidate; allowing it widens the set (the low-tech ones stay)', () => {
    const wide = pool.map(x => fitGear(x.S).scene), narrow = pool.map(x => fitGear(x.S, { noCo2: true }).scene);
    expect(narrow.every(s => !needCo2(s) && s.grow.feed !== 'co2')).toBe(true);
    const withCo2 = wide.filter(s => s.grow.feed === 'co2').length, lowTech = wide.filter(s => s.grow.feed !== 'co2').length;
    console.log(`CO2 allowed: ${withCo2} high-tech, ${lowTech} low-tech`);
    expect(lowTech).toBeGreaterThan(0);                                                    // lifting the prohibition does not force high-tech
    expect(narrow.filter(s => s.items.some(i => layerOf(i) === 'plant')).length).toBeGreaterThan(0);
  });
  it('size is a design variable: a larger size is a different design (composition, group sizes, cover or hardscape), never just more water; no count is required to rise', () => {
    let checked = 0;
    for (const a of looks) {
      const mine = pool.filter(x => x.id === a.id).sort((p, q) => p.gal - q.gal); if (mine.length < 2) continue;
      const small = mine[0], big = mine[mine.length - 1], sig = (S: TankSetup) => JSON.stringify([[...new Set(S.fish.map(f => f.species))].sort(), S.fish.length, S.items.length, S.items.filter(i => layerOf(i) !== 'plant').length]);
      expect(sig(big.S), `${a.id}: ${small.gal} vs ${big.gal} gal`).not.toBe(sig(small.S)); checked++;
    }
    expect(checked).toBeGreaterThan(3);
  });
});

// ---------------------------------------------------------------------------------------------------------------- quick preferences (AB6's real contract)
import { clearPairCache, nextPair } from '../src/scene/pairGen';
import { startSession } from '../src/scene/discoverySession';
import { defaultSetup } from '../src/scene/defaults';
import { regenerate } from '../src/scene/starter';
import { IN } from '../src/scene/physics';
import { applyQuickPrefs, emptyAnswers, readQuickPrefs, type QuickAnswers } from '../src/scene/quickPrefs';
import { projectExtras, setProjectExtras, setRange } from '../src/scene/brief';
describe('quick preferences: hard answers filter, the rest rank, told outranks learned', () => {
  const project = () => { const t = structuredClone(defaultSetup()); t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; regenerate(t, 'all', 1); return ensureUids(t); };
  const briefOf = (a: Partial<QuickAnswers>) => applyQuickPrefs(setProjectExtras(emptyBrief(), { ...projectExtras(emptyBrief()), direction: 'freshwater' }), { ...emptyAnswers(), ...a });
  const pair = (br: ReturnType<typeof briefOf>) => { clearPairCache(); return nextPair({ tank: project(), rev: 1 }, br, startSession(1, ['tank', 'animals', 'plants', 'hardscape', 'substrate'], 'freshwater', 's'), () => undefined, { next: 'first' }); };
  it('Freshwater, Medium, Lush, Definitely live plants, No CO2: live plants, no CO2 feed or line, the medium size is only a ranking', () => {
    const br = briefOf({ size: 'medium', look: ['lush'], plants: 'definitely', avoid: ['co2'] }), q = readQuickPrefs(br);
    expect(q.plants).toEqual({ value: 'live', strength: 'hard' }); expect(q.prohibit).toContain('co2'); expect(q.sizeGal?.strength).toBe('prefer');
    const r = pair(br); expect(r.ok).toBe(true); if (!r.ok) return;
    for (const c of [r.a, r.b]) { expect(c.snapshot.items.filter(i => i.kind === 'plant').length).toBeGreaterThanOrEqual(3); expect(c.snapshot.grow.feed).not.toBe('co2'); expect(c.facts.toBuy.some(l => /co2/i.test(l.label))).toBe(false); }
  }, 200000);
  const hardSize = (lo: number, hi: number) => pair(setRange(emptyBrief(), 'constraints.tankGal', { min: lo, max: hi }, 'hard'));
  it('a HARD size gives an explicit outcome for zero, one and many feasible designs (never skipped, never a made-up second design)', () => {
    const zero = hardSize(11, 14); expect(zero.ok).toBe(false); if (zero.ok) return;                       // no catalogue tank between 10.8 and 15.9 gal
    expect(zero.single).toBeUndefined(); expect(zero.conflicts.join(' ')).toMatch(/No design fits a tank of 11-14 gal/); expect(zero.relaxations.join(' ')).toMatch(/size/i);
    const many = hardSize(6, 7); expect(many.ok).toBe(true); if (!many.ok) return;                         // the 6 gal tank: two looks
    expect(many.a.key).not.toBe(many.b.key); for (const c of [many.a, many.b]) { expect(c.facts.gallons!).toBeGreaterThanOrEqual(6); expect(c.facts.gallons!).toBeLessThanOrEqual(7); }
    const br = setRange(emptyBrief(), 'constraints.tankGal', { min: 6, max: 7 }, 'hard');                    // one left: the other was already shown
    const one = nextPair({ tank: project(), rev: 1 }, br, startSession(1, ['tank', 'animals', 'plants', 'hardscape', 'substrate'], 'freshwater', 's'), () => undefined, { next: 'first', shownKeys: [many.a.key!] });
    expect(one.ok).toBe(false); if (one.ok) return;
    expect(one.single?.key).toBe(many.b.key); expect(one.conflicts[0]).toMatch(/Only one design fits/); expect(one.conflicts[0]).toMatch(/no second design is made up/);
    const wide = hardSize(20, 60); expect(wide.ok).toBe(true); if (wide.ok) for (const c of [wide.a, wide.b]) { expect(c.facts.gallons!).toBeGreaterThanOrEqual(20); expect(c.facts.gallons!).toBeLessThanOrEqual(60); }
  }, 280000);
  it('lifting the No CO2 prohibition removes no candidate and does not force CO2 (the fitGear set above)', () => {
    const on = readQuickPrefs(briefOf({ avoid: ['co2'] })), off = readQuickPrefs(briefOf({}));
    expect(on.prohibit).toEqual(['co2']); expect(off.prohibit).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------- backdrop semantics, dry tiers, the final check
import { diffTouches } from '../src/scene/scope';
import { HARDSCAPE_KEYS, TANK_PROPS, lockViolations } from '../src/scene/locks';
import { confine } from '../src/scene/discover';
import { backdropUsd } from '../src/scene/pairFacts';
import { dryNeed, meaningfulDryTiers } from '../src/scene/sizeTiers';
import { finalCheck } from '../src/scene/finalCheck';
describe('the 3D backdrop is hardscape', () => {
  const base = () => { const t = structuredClone(defaultSetup()); t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; return ensureUids(t); };
  it('moves with the Hardscape tab, not the Tank tab, and is not room support', () => {
    const a = base(), c = structuredClone(a); c.backdrop = { kind: 'rock', depth: 50, seed: 3 };
    const t = diffTouches(a, c); expect(t.tabs).toEqual(['hardscape']); expect(t.support).not.toContain('backdrop'); expect(t.tank).toEqual([]);
    expect(HARDSCAPE_KEYS).toContain('backdrop'); expect(TANK_PROPS.room).not.toContain('backdrop');
    // the room around the tank is still the Tank tab
    const w = structuredClone(a); w.wall = { ...w.wall, show: !w.wall.show }; expect(diffTouches(a, w).tabs).toEqual(['tank']);
  });
  it('is held by the hardscape scope and by a backdrop lock', () => {
    const a = base(), c = structuredClone(a); c.backdrop = { kind: 'cork', depth: 50, seed: 1 };
    expect(confine(a, c, ['plants', 'animals'])!.backdrop.kind).toBe(a.backdrop.kind);                 // Hardscape off: the backdrop stays
    expect(confine(a, c, ['hardscape'])!.backdrop.kind).toBe('cork');
    const L = structuredClone(a); L.locks = { objects: [{ target: 'backdrop' }], roster: [] };
    expect(confine(L, c, ['hardscape'])!.backdrop.kind).toBe(a.backdrop.kind);                       // locked: held even with Hardscape on
    expect(lockViolations(L, c).some(v => v.target === 'backdrop')).toBe(true);
  });
  it('is a priced purchase, marked as an estimate', () => {
    const S = base(); S.backdrop = { kind: 'rock', depth: 50, seed: 1 }; const sc = scoreScene(S, b, w, P, Date.now()), f = factsOf(S, b, sc), f0 = factsOf({ ...S, backdrop: { kind: 'none', depth: 50, seed: 1 } }, b, sc);
    const line = f.toBuy.find(l => l.key === 'backdrop'); expect(line?.label).toMatch(/estimate/); expect(line!.usd).toBe(backdropUsd(S)); expect(f.newSpendUsd.mean - f0.newSpendUsd.mean).toBe(line!.usd); expect(f0.toBuy.some(l => l.key === 'backdrop')).toBe(false);
  });
});
describe('dry habitats are sized by what the animals need', () => {
  const tank = (L: number, D: number, H: number, g: number) => ({ outer: { L: L * 25.4, D: D * 25.4, H: H * 25.4 }, ratedGal: g });
  it('climbers need height, ground animals need floor area', () => {
    expect(dryNeed([{ species: 'treefrog', n: 2 } as never])).toBe('height'); expect(dryNeed([{ species: 'leopardgecko', n: 1 } as never])).toBe('floor');
  });
  it('a larger size that only adds the dimension the animals do not use is not a tier', () => {
    const arboreal = [{ species: 'treefrog', n: 2 } as never], tall = [{ tank: tank(18, 18, 18, 25), roster: arboreal }, { tank: tank(36, 18, 18, 50), roster: arboreal }, { tank: tank(18, 18, 36, 50), roster: arboreal }];
    const kept = meaningfulDryTiers(tall); expect(kept.map(c => c.tank.outer.H / 25.4)).toEqual([18, 36]);      // the wider tank adds no height: dropped
    const ground = [{ species: 'leopardgecko', n: 1 } as never], wide = [{ tank: tank(18, 18, 18, 25), roster: ground }, { tank: tank(18, 18, 36, 50), roster: ground }, { tank: tank(36, 18, 18, 50), roster: ground }];
    expect(meaningfulDryTiers(wide).map(c => c.tank.outer.L / 25.4)).toEqual([18, 36]);                      // the taller tank adds no floor: dropped
  });
});
describe('the final whole-candidate check', () => {
  it('says what a dry habitat does not model, and blocks animals that do not fit', () => {
    const dry = structuredClone(defaultSetup()); dry.water.on = false; dry.fish = []; const f = finalCheck(ensureUids(dry), w);
    expect(f.blocked).toBeUndefined(); expect(f.unknowns.join(' ')).toMatch(/Ventilation is not modelled/);
    const wet = structuredClone(defaultSetup()); wet.water.on = true; wet.tank = { ...wet.tank, L: 12 * IN, D: 8 * IN, H: 8 * IN }; wet.fish = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, species: 'oscar', x: 50 + i, y: 50, depth: 50, yaw: 0, pitch: 0, roll: 0, bend: 0 } as never));
    expect(finalCheck(ensureUids(wet), w).blocked).toMatch(/do not fit/);
  });
});
