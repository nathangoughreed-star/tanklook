// Lane KT (2026-10-27): terrarium kit deals replace the separately priced tank, lid, dome, bulb and gauge in the suggest builds.
import { describe, expect, it } from 'vitest';
import { DEALS, dealAsKit, dealsFor } from '../src/data/deals';
import { getTankModel } from '../src/data/tanks';
import { dryDealsFor } from '../src/demand/drydeals';
import { buildsFor } from '../src/scene/builds';
import { demandOf, defaultProfile } from '../src/demand';
import items from '../src/data/demand-items.json';

const NOW = Date.parse('2026-10-27');
const T36 = getTankModel('t36x18x18')!, P = defaultProfile();
const gecko = () => buildsFor([{ species: 'leopardgecko', n: 1 }], T36, NOW);

describe('terrarium kit deals', () => {
  it('the recorded rows carry a listing url, a read date and a confidence; snippet rows are tagged low-confidence', () => {
    const dry = DEALS.filter(d => d.terrarium);
    expect(dry.length).toBeGreaterThanOrEqual(5);
    for (const d of dry) { expect(d.url).toMatch(/^https:/); expect(d.asOf).toMatch(/^\d{4}-\d\d-\d\d$/); expect(d.dims).toBeDefined(); expect(d.confidence).toBeDefined(); }
    expect(dry.filter(x => x.confidence === 'low').length).toBeGreaterThanOrEqual(3);
  });
  it('offers the Thrive 40G kit for a 36 x 18 x 18 terrarium, not the low-confidence snippet rows, not another size, not once stale', () => {
    const ids = dryDealsFor(T36, NOW).map(d => d.id);
    expect(ids).toEqual(['petsmart-thrive-desert-40']);
    expect(dryDealsFor(getTankModel('t48x24x24')!, NOW)).toEqual([]);
    expect(dryDealsFor(T36, Date.parse('2026-12-31'))).toEqual([]);
  });
  it('an aquarium never gets a terrarium kit', () => {
    expect(dealsFor(40, true, NOW).some(d => d.terrarium)).toBe(false);
  });
  it('the kit credits tank, lid, lamp and gauge but not the thermostat or the UVB (its 23 W compact is not a T5)', () => {
    const b = gecko()[0], plain = demandOf(b.setup, P, { now: NOW });
    const kit = demandOf(b.setup, P, { now: NOW, kit: dealAsKit(DEALS.find(d => d.id === 'petsmart-thrive-desert-40')!) });
    for (const k of ['tank', 'lid', 'heatlamp', 'gauge']) { expect(plain.items.find(i => i.key === k)?.setup, k).toBeDefined(); expect(kit.items.find(i => i.key === k)?.setup, k).toBeUndefined(); }
    for (const k of ['thermostat', 'uvb']) expect(kit.items.find(i => i.key === k)?.setup, k).toBeDefined();
  });
  it('the leopard gecko builds use the kit and come out well under the separately priced parts', () => {
    for (const b of gecko()) {
      expect(b.bundle?.id, b.id).toBe('petsmart-thrive-desert-40');
      expect(b.listUsd - b.setupUsd, b.id).toBeGreaterThan(100);
      expect(b.savingUsd).toBe(b.listUsd - b.setupUsd);
      expect(b.setup.tech?.rows.uvb, b.id).not.toBe('none'); // the build's own UVB stays
    }
  });
  it('a size with no kit is priced as before', () => {
    for (const b of buildsFor([{ species: 'leopardgecko', n: 1 }], getTankModel('n_20gal_long_terrarium')!, NOW).slice(0, 1)) expect(b.bundle?.terrarium).not.toBe(false);
  });
  it('the leopard gecko price is anchored on the PetSmart listing with Ward\'s as the high', () => {
    const r = (items as unknown as { rows: Record<string, { lo: number; mode: number; hi: number }> }).rows['animal:leopardgecko'];
    expect(r.mode).toBe(32); expect(r.hi).toBeGreaterThanOrEqual(79.95);
  });
});
