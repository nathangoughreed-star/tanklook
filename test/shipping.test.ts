import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { defaultProfile } from '../src/demand';
import { dealSwaps, dealTank, sameTank } from '../src/demand/dealmatch';
import { demandOf } from '../src/demand/engine';
import { PLANT_BUNDLES, bundleTotalUsd, pinPlantBundle, plantBundleOffers, plantBundleOpt, type PlantBundle } from '../src/demand/plantBundles';
import { DEALS, dealShip, dealTotalUsd, dealAsKit } from '../src/data/deals';
import { shipping } from '../src/data/shipping';
import { volume } from '../src/scene/physics';
import { parseScene } from '../src/scene/validate';
import type { TankSetup } from '../src/scene/types';

// Shipping on deals, the swap menu and plant bundles (lane BS, 2026-10-27).
const NOW = Date.parse('2026-10-27');
const P = defaultProfile();
const tankOf = (id: string) => parseScene(SCENES[id]).scene.tanks[0];

describe('shipping', () => {
  it('is free over the retailer threshold, charged under it, estimated where unconfirmed', () => {
    const under = shipping('Buce Plant', 20), over = shipping('Buce Plant', 60);
    expect(under.usd).toBeGreaterThan(0); expect(under.free).toBe(false); expect(under.text).toMatch(/\+\$/);
    expect(over).toMatchObject({ usd: 0, free: true, text: 'free shipping' });
  });
  it('store pickup carries none, and an unknown retailer says so', () => {
    expect(shipping('Petco', 200, true)).toMatchObject({ usd: 0, pickup: true });
    expect(shipping('Nowhere Aquatics', 20).text).toBe('shipping not checked');
  });
  it('a deal costs its price plus shipping, and the kit price carries it', () => {
    for (const d of DEALS) { expect(dealTotalUsd(d)).toBeCloseTo(d.price.usd + dealShip(d).usd); expect(dealAsKit(d).priceUsd).toBeCloseTo(dealTotalUsd(d)); }
    expect(DEALS.filter(d => d.pickupOnly).every(d => dealShip(d).pickup)).toBe(true);
  });
});

describe('swap menu', () => {
  it('lists only same-tank kits with a saving (no tank-size change is ever offered)', () => {
    let any = 0;
    for (const id of Object.keys(SCENES)) {
      const S = tankOf(id);
      for (const w of dealSwaps(S, P, { now: NOW })) {
        any++;
        expect(w.savingUsd).toBeGreaterThan(1);
        expect(w.sameTank).toBe(sameTank(S.tank, w.deal));
        expect(w.shipText.length).toBeGreaterThan(0);
        expect(w.sameTank).toBe(true); expect(w.tradeoffs.join(' ')).not.toMatch(/tank size/);
      }
    }
    expect(any).toBeGreaterThan(0);
    console.log(`swaps: ${any} across the examples`);
  });
});

describe('swap menu: same tank only (DM2, 2026-11-05)', () => {
  const tank = (d: typeof DEALS[number]) => dealTank(d)!;
  it('offers another brand kit of the same tank, never one that changes the tank, in short text', () => {
    const kits = DEALS.filter(d => dealTank(d) && d.includes.length > 2);
    expect(kits.length).toBeGreaterThan(1);
    let crossBrand = 0;
    for (const d of kits) {
      const S = tankOf('blackwater'); S.tank = { ...tank(d) };
      const ws = dealSwaps(S, P, { now: NOW });
      for (const w of ws) { expect(sameTank(S.tank, w.deal)).toBe(true); expect(w.tradeoffs.join(' ')).not.toMatch(/tank size/); }
      if (ws.some(w => w.deal.retailer !== d.retailer)) crossBrand++;
      // a kit of another size or shape is never in the list
      for (const o of kits) if (!sameTank(S.tank, o)) expect(ws.some(w => w.deal.id === o.id)).toBe(false);
    }
    console.log(`cross-brand same-tank swaps seen for ${crossBrand} of ${kits.length} kits`);
  });
  it('a 15 gal tank is not offered a 10 gal kit', () => {
    const k10 = DEALS.find(d => dealTank(d) && Math.round(volume(dealTank(d)!).gallons) <= 11)!;
    const S = tankOf('blackwater'); S.tank = { ...S.tank, L: 610, D: 305, H: 305 };
    expect(dealSwaps(S, P, { now: NOW }).some(w => w.deal.id === k10.id)).toBe(false);
  });
});

describe('plant bundles', () => {
  const pack: PlantBundle = { id: 't', retailer: 'Buce Plant', name: 'Test pack', priceUsd: 30, url: 'https://x.test', asOf: '2026-10-27', inStock: true, covers: { anubias: 3 } };
  const withPlants = (n: number): TankSetup => { const S = tankOf('blackwater'); const a = S.items.find(i => i.kind === 'plant') ?? { ...S.items[0], kind: 'plant' as const }; S.items = S.items.filter(i => i.kind !== 'plant'); for (let k = 0; k < n; k++) S.items.push({ ...a, id: `p${k}`, kind: 'plant', variant: 'anubias' } as never); return S; };
  it('prices covered plants as the pack, shipping included; plants beyond it stay one by one', () => {
    const S = withPlants(5), before = demandOf(S, P, { now: NOW }), plain = demandOf(S, P, { now: NOW }).items.filter(r => r.key.startsWith('plant:'));
    pinPlantBundle(S, pack);
    const opt = plantBundleOpt(S, [pack])!, after = demandOf(S, P, { now: NOW, plantBundle: opt });
    expect(opt.priceUsd).toBeCloseTo(bundleTotalUsd(pack));
    const mean = (rs: typeof plain) => rs.reduce((a, r) => a + (r.setup ? r.setup.mode : 0), 0);
    expect(mean(after.items.filter(r => r.key.startsWith('plant:')))).toBeCloseTo(mean(plain) * 2 / 5, 1);
    expect(after.items.some(r => r.key === 'bundle:t')).toBe(true);
    expect(after.totals.setupUsd).toBeLessThan(before.totals.setupUsd + bundleTotalUsd(pack));
  });
  it('a pack covering nothing in the tank adds no row and no offer', () => {
    const S = withPlants(0);
    expect(demandOf(S, P, { now: NOW, plantBundle: { id: 't', priceUsd: 30, asOf: pack.asOf, label: 'x', covers: { anubias: 3 } } }).items.some(r => r.key.startsWith('bundle:'))).toBe(false);
    expect(plantBundleOffers(S, P, { now: NOW }, [pack])).toEqual([]);
  });
  it('is offered only when it saves, in stock and fresh', () => {
    const S = withPlants(5);
    expect(plantBundleOffers(S, P, { now: NOW }, [{ ...pack, priceUsd: 1 }])[0]?.savingUsd).toBeGreaterThan(0);
    expect(plantBundleOffers(S, P, { now: NOW }, [{ ...pack, priceUsd: 1, inStock: false }])).toEqual([]);
    expect(plantBundleOffers(S, P, { now: Date.parse('2026-12-30') }, [{ ...pack, priceUsd: 1 }])).toEqual([]);
    expect(plantBundleOffers(S, P, { now: NOW }, [{ ...pack, priceUsd: 500 }])).toEqual([]);
  });
  it('the shipped data is well formed', () => {
    expect(PLANT_BUNDLES.length).toBeGreaterThan(10);
    for (const b of PLANT_BUNDLES) { expect(Object.keys(b.covers).length, b.id).toBeGreaterThan(0); expect(b.url).toMatch(/^https/); }
  });
});
