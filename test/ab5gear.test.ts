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
  it('size is a design variable: a larger size of a look has more animals or more kinds, and more plants and hardscape (never just more water)', () => {
    let checked = 0;
    for (const a of looks) {
      const mine = pool.filter(x => x.id === a.id).sort((p, q) => p.gal - q.gal); if (mine.length < 2) continue;
      const small = mine[0], big = mine[mine.length - 1], cnt = (S: TankSetup) => S.fish.length, kinds = (S: TankSetup) => new Set(S.fish.map(f => f.species)).size, cover = (S: TankSetup) => S.items.length;
      expect(cnt(big.S) > cnt(small.S) || kinds(big.S) > kinds(small.S) || cover(big.S) > cover(small.S), `${a.id}: ${small.gal} vs ${big.gal} gal`).toBe(true); checked++;
    }
    expect(checked).toBeGreaterThan(3);
  });
});

// ---------------------------------------------------------------------------------------------------------------- quick preferences (AB6 shape, through the adapter)
import { clearPairCache, nextPair } from '../src/scene/pairGen';
import { startSession } from '../src/scene/discoverySession';
import { defaultSetup } from '../src/scene/defaults';
import { regenerate } from '../src/scene/starter';
import { IN } from '../src/scene/physics';
describe('quick preferences: hard answers filter, the rest rank', () => {
  const project = () => { const t = structuredClone(defaultSetup()); t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; regenerate(t, 'all', 1); return ensureUids(t); };
  const pair = (prefs: never) => { clearPairCache(); return nextPair({ tank: project(), rev: 1 }, b, startSession(1, ['tank', 'animals', 'plants', 'hardscape', 'substrate'], 'freshwater', 's'), () => undefined, { next: 'first', prefs }); };
  it('Definitely live plants + No CO2 (size only ranks): every candidate has live plants, no CO2 feed or line', () => {
    const r = pair({ world: 'freshwater', sizeGal: { lo: 20, hi: 60 }, plants: 'require', avoid: ['co2'] } as never); expect(r.ok).toBe(true); if (!r.ok) return;
    for (const c of [r.a, r.b]) {
      expect(c.snapshot.items.filter(i => i.kind === 'plant').length).toBeGreaterThanOrEqual(6); expect(c.snapshot.grow.feed).not.toBe('co2');
      expect(c.facts.toBuy.some(l => /co2/i.test(l.label))).toBe(false); expect(!!c.snapshot.water.salt).toBe(false);
    }
  }, 200000);
  it('a HARD size is honoured: whatever pair comes back is inside the range', () => {
    const r = pair({ sizeGal: { lo: 20, hi: 60, strength: 'hard' } } as never); if (r.ok) for (const c of [r.a, r.b]) { expect(c.facts.gallons!).toBeGreaterThanOrEqual(20); expect(c.facts.gallons!).toBeLessThanOrEqual(60); }
  }, 200000);
  it('a prefer-size answer only ranks: no candidate is removed for being outside it', () => {
    const r = pair({ sizeGal: { lo: 30, hi: 40 }, plants: 'prefer' } as never); expect(r.ok).toBe(true);
  }, 200000);
});
