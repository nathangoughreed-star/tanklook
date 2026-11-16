import { describe, expect, it } from 'vitest';
import { GEAR_DEALS } from '../src/data/gearDeals';
import { defaultSetup } from '../src/scene/defaults';
import { gearSales, showable, tankSale } from '../src/shell/logic/deals';
import type { TankVariant } from '../src/data/tanks';

const day = (iso: string, plus = 0) => Date.parse(iso + 'T12:00:00') + plus * 864e5;
const v = (checked: string, extra: Partial<TankVariant> = {}): TankVariant => ({ brand: 'X', L_in: 20, D_in: 10, H_in: 12, price_usd: 40, regular_usd: 80, retailer: 'PetSmart', checked, ...extra });

describe('DL1: what the new UI shows as a deal', () => {
  it('shows a listing read within 14 days and hides an older one', () => {
    expect(showable('2026-11-02', day('2026-11-15'))).toBe(true);
    expect(showable('2026-10-30', day('2026-11-15'))).toBe(false);
    expect(showable(undefined)).toBe(false);
  });
  it('a tank sale has the was-price, percent, store and date; an old or ended one is not shown', () => {
    const now = day('2026-11-10');
    const s = tankSale(v('2026-11-05'), now)!;
    expect(s.off).toBe(50);
    expect(s.text).toContain('was $80');
    expect(s.text).toContain('PetSmart');
    expect(tankSale(v('2026-10-20'), now)).toBeUndefined();
    expect(tankSale(v('2026-11-05', { sale_ends: '2026-11-08' }), now)).toBeUndefined();
    expect(tankSale(v('2026-11-05', { regular_usd: undefined }), now)).toBeUndefined();
  });
  it('gear sales: only fresh rows that fit the tank, biggest discount first, none for a non-gear category', () => {
    const S = defaultSetup(), light = GEAR_DEALS.find(d => d.slot === 'light' && d.fitMm && !d.salt)!;
    S.tank.L = (light.fitMm![0] + light.fitMm![1]) / 2;
    const fresh = day(light.asOf), stale = fresh + 20 * 864e5;
    const a = gearSales(S, 'light', fresh);
    expect(a.length).toBeGreaterThan(0);
    expect(a.every(x => x.slot === 'light')).toBe(true);
    expect(a.map(x => x.off)).toEqual([...a.map(x => x.off)].sort((p, q) => q - p));
    expect(gearSales(S, 'light', stale)).toEqual([]);
    expect(gearSales(S, 'substrate', fresh)).toEqual([]);
  });
});
