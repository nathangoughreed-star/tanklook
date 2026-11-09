// Lane DX1: one verdict for the current project, independent of any generator. Journey C (a 40 gal breeder + a proposed stocking is judged at once),
// the buckets never mix (a budget overrun is a hard limit, a welfare conflict is a gate), and a Required weak light against demanding plants is a gate
// that CO2 and fertilizer do not lift.
import { describe, expect, it } from 'vitest';
import { defaultSetup } from '../src/scene/defaults';
import { IN } from '../src/scene/physics';
import { emptyBrief } from '../src/ui/setupBrief';
import { PICK_CARE } from '../src/demand/suggest';
import { setEquipment, setOwnedUse } from '../src/scene/project';
import { verdictOf } from '../src/scene/verdict';
import { checksHtml } from '../src/ui/checksStrip';
import type { Fish, Item, TankSetup } from '../src/scene/types';

const fish = (species: string, n: number, from = 1): Fish[] => Array.from({ length: n }, (_, i) => ({ id: from + i, species, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 }));
const breeder = (stock: [string, number][] = []): TankSetup => {   // 36 x 18 x 16 in, the 40 gal breeder
  const s = defaultSetup();
  s.tank = { ...s.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN };
  s.water.on = true; s.water.level = 0.9; s.water.salt = false;
  let n = 1; s.fish = stock.flatMap(([id, k]) => { const f = fish(id, k, n); n += k; return f; });
  s.items = [];
  return s;
};
const plant = (variant: string, id: number): Item => ({ id, kind: 'plant', variant, seed: id, x: 0, depth: 0, lift: 0, yaw: 0 }) as unknown as Item;
const texts = (xs: { text: string }[]) => xs.map(x => x.text).join(' | ');

describe('verdictOf: journey C, no generator involved', () => {
  it('a sensible stocking in the 40 breeder has no gate and no hard issue', () => {
    const v = verdictOf(breeder([['neon', 8]]), emptyBrief());
    expect(v.gates).toEqual([]); expect(v.hard).toEqual([]); expect(v.feasible).toBe(true);
  });
  it('an impossible stocking is reported at once as a gate that names the animals', () => {
    const S = breeder([['oscar', 4]]), v = verdictOf(S, emptyBrief());
    expect(v.feasible).toBe(false);
    expect(v.gates.length).toBeGreaterThan(0);
    expect(v.gates.every(g => g.tab === 'animals' || g.tab === 'equipment')).toBe(true);
    expect(v.gates.some(g => g.uids.length > 0)).toBe(true);
    expect(v.hard).toEqual([]);   // welfare is not a limit of the person's
  });
  it('the same tank without animals is not judged on them (unchecked animals are not touched, only read)', () => {
    const S = breeder([['oscar', 4]]); const before = JSON.stringify(S);
    verdictOf(S, emptyBrief());
    expect(JSON.stringify(S)).toBe(before);
    expect(verdictOf({ ...S, fish: [] }, emptyBrief()).gates).toEqual([]);
  });
});

describe('verdictOf: buckets never mix', () => {
  it('a budget overrun is a hard limit with a relaxation; it is not a gate, and welfare is not a limit', () => {
    const S = breeder([['neon', 8]]); S.constraints = { startupUsd: { on: true, value: 100 } };
    const v = verdictOf(S, emptyBrief(), { totals: { setupUsd: 140, upkeepUsdMo: 5, minPerWeek: 10 } });
    expect(v.gates).toEqual([]);
    expect(v.hard).toHaveLength(1);
    expect(v.hard[0].relax).toBe('raise the budget by $40');
    expect(v.feasible).toBe(false);
  });
  it('an overrun and a welfare conflict at once land in different buckets', () => {
    const S = breeder([['oscar', 4]]); S.constraints = { startupUsd: { on: true, value: 100 } };
    const v = verdictOf(S, emptyBrief(), { totals: { setupUsd: 140, upkeepUsdMo: 5, minPerWeek: 10 } });
    expect(v.gates.length).toBeGreaterThan(0); expect(v.hard).toHaveLength(1);
    expect(texts(v.gates)).not.toMatch(/Set-up cost/); expect(texts(v.hard)).not.toMatch(/animals/i);
  });
  it('the strip shows the two kinds under separate headings', () => {
    const S = breeder([['oscar', 4]]); S.constraints = { startupUsd: { on: true, value: 100 } };
    const html = checksHtml(verdictOf(S, emptyBrief(), { totals: { setupUsd: 140, upkeepUsdMo: 5, minPerWeek: 10 } }));
    expect(html).toContain('Welfare and physical limits'); expect(html).toContain('Your limits');
  });
});

describe('verdictOf: a Required weak light against demanding plants', () => {
  const weak = (): TankSetup => {
    const S = breeder(); S.items = [plant('ludwigia', 1), plant('hairgrass', 2)];
    S.light = { ...S.light, owned: true, watts: 4 };
    return S;
  };
  const required = () => setOwnedUse(setEquipment(emptyBrief(), 'light', { pick: PICK_CARE }), 'light', 'required');
  it('is a gate when the light is Required, and only advice when it is merely owned', () => {
    const g = verdictOf(weak(), required());
    expect(g.gates.some(i => i.id === 'gear:light:dim')).toBe(true);
    expect(g.feasible).toBe(false);
    const a = verdictOf(weak(), setEquipment(emptyBrief(), 'light', { pick: PICK_CARE }));
    expect(a.gates.some(i => i.id === 'gear:light:dim')).toBe(false);
    expect(a.advisories.some(i => i.id === 'gear:light:dim')).toBe(true);
  });
  it('CO2 and fertilizer do not lift it, and the relaxation says so', () => {
    const S = weak(); (S as { grow?: unknown }).grow = { feed: { co2: 'high', ferts: 'high' } };
    const v = verdictOf(S, required());
    const i = v.gates.find(x => x.id === 'gear:light:dim');
    expect(i).toBeTruthy(); expect(i!.relax).toMatch(/CO2 and fertilizer do not add light/);
  });
});
