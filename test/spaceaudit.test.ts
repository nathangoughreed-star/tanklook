// Space-bar audit (lane MA, 2026-10-21; research/tank-minimum-first-principles.md Decision 6): the six shapes of question Decision 6 names.
// Lane MA recorded the per-litre heuristic and left five `it.todo` where it rewarded volume that gives no habitat; lane HB (2026-10-21,
// research/habitat-model.md) added the floor limit (Space = the larger of the water limit and the floor the bottom dwellers use) and the
// five are plain tests. `GEN_SPACE_AUDIT=1 npx vitest run test/spaceaudit.test.ts` rewrites research/space-audit.md from the same cases.
import { describe, expect, it } from 'vitest';
import { TANK_MODELS, tankFromModel } from '../src/data/tanks';
import { bareSetup } from '../src/scene/defaults';
import { IN } from '../src/scene/physics';
import { stockingOf } from '../src/scene/stocking';
import { tankMinimum } from '../src/scene/tankMin';
import type { Fish, Tank, TankSetup } from '../src/scene/types';
// @ts-expect-error node only (no node types in this project)
const { writeFileSync } = await import('node:fs');

const model = (id: string) => tankFromModel(TANK_MODELS.find(m => m.id === id)!);
/** A rectangular tank of these interior inches (length x front-to-back x height). */
const rect = (L: number, D: number, H: number): Tank => ({ ...model('g20l'), L: L * IN, D: D * IN, H: H * IN });
const stock = (counts: Record<string, number>): Fish[] => Object.entries(counts).flatMap(([species, n]) => Array.from({ length: n }, () => species))
  .map((species, i) => ({ id: i + 1, species, x: 0, y: 0, depth: 0, yaw: 0, pitch: 0, roll: 0, bend: 0 }));
const setup = (tank: Tank, counts: Record<string, number>): TankSetup => { const S = bareSetup(); S.tank = tank; S.water.on = true; S.water.level = 0.9; S.water.salt = false; S.fish = stock(counts); return S; };

interface Row { label: string; tank: string; stock: string; gal: number; floorSqIn: number; space: number; water: number; floor: number; filtration: number; minimum: number }
const MIX = { bronzecory: 6, danio: 8 }, CORY = { bronzecory: 10 };
const desc = (c: Record<string, number>) => Object.entries(c).map(([k, n]) => `${n} ${k}`).join(' + ');
function row(label: string, tankName: string, tank: Tank, counts: Record<string, number>): Row {
  const S = setup(tank, counts), s = stockingOf(S), m = tankMinimum(S);
  return { label, tank: tankName, stock: desc(counts), gal: s.capacity.litres / 3.785, floorSqIn: tank.L * tank.D / IN / IN, space: s.spacePercent, water: s.waterPercent, floor: s.floorPercent,
    filtration: s.filtrationPercent, minimum: m.percent };
}

/** The six cases; `verdict` is the plain reading, `right` whether Space answers the habitat question correctly. */
const CASES: { id: string; title: string; rows: () => Row[]; right: 'yes' | 'no' | 'partly'; verdict: string }[] = [
  { id: 'A', title: '15 cory + 5 danio vs 5 cory + 15 danio, 40 gal breeder', right: 'yes',
    rows: () => [row('cory-heavy', '40 breeder', model('g40b'), { bronzecory: 15, danio: 5 }), row('danio-heavy', '40 breeder', model('g40b'), { bronzecory: 5, danio: 15 })],
    verdict: 'The cory-heavy mix is judged against the 36 x 18 in floor: its 15 cories use most of it, and the floor limit binds above the water limit. The danio-heavy mix stays a water question. (Lane MA: right direction for the wrong reason, mass only.)' },
  { id: 'B', title: '20 long vs 20 high, same stock', right: 'yes',
    rows: () => [row('20 long', '20 gal long', model('g20l'), MIX), row('20 high', '20 gal high', model('g20h'), MIX)],
    verdict: 'The 20 long reads roomier, and the cories use a smaller share of its 30 x 12 in floor than of the 24 x 12 in floor of the 20 high. With this stock the water limit binds in both, so the gap is small. The run itself is held by the tank minimum (sourced red-line length), which reads the pair 100 % vs 133 %; no sourced run coefficient exists for Space (research/habitat-model.md).' },
  { id: 'C', title: 'Tall-narrow vs shallow-wide, equal volume (24 x 12 x 24 in vs 48 x 24 x 6 in)', right: 'yes',
    rows: () => [row('tall-narrow', '24 x 12 x 24 in', rect(24, 12, 24), MIX), row('shallow-wide', '48 x 24 x 6 in', rect(48, 24, 6), MIX)],
    verdict: 'With equal water the tall-narrow tank now reads fuller: its 288 sq in of floor binds for the six cories, the 1152 sq in tray leaves them a fifth of it. (Lane MA: identical Space for 4x the floor.) The tank-minimum gate reads the pair 133 % vs 41 %.' },
  { id: 'D', title: 'Same floor (30 x 12 in), 12 in vs 24 in high, mixed stock', right: 'yes',
    rows: () => [row('12 in high', '30 x 12 x 12 in', rect(30, 12, 12), MIX), row('24 in high', '30 x 12 x 24 in', rect(30, 12, 24), MIX)],
    verdict: 'Doubling the height halves the water limit (real room for the midwater danios) but not the cories\' share of the same 360 sq in of floor: on the 24 in tank the floor limit binds and Space stops there. The extra water still helps stability, which the Filtration bar carries.' },
  { id: 'E', title: 'More height, same floor (30 x 12 in), bottom dwellers only (10 bronze cory)', right: 'yes',
    rows: () => [12, 18, 24, 36].map(h => row(`${h} in high`, `30 x 12 x ${h} in`, rect(30, 12, h), CORY)),
    verdict: 'Space is the same at every height: the 10 cories use the same floor and the floor limit binds (about 107 %; Scotcat\'s six to eight inches of fish per square foot gives 5-7 cories on 2.5 sq ft). Lane MA: Space fell as 1 / height without limit. The tank-minimum gate plateaus too.' },
  { id: 'F', title: 'More fish past the viable group (bronze cory 6, 12, 24, 48 in a 20 long)', right: 'yes',
    rows: () => [6, 12, 24, 48].map(n => row(`${n} cory`, '20 gal long', model('g20l'), { bronzecory: n })),
    verdict: 'Space rises in proportion to the count while the tank minimum stays put. That is the split Decision 1 asks for: animals past the viable group raise crowding, not the enclosure minimum. Locked.' },
];

const r1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1), r0 = (x: number) => String(Math.round(x));
const byId = Object.fromEntries(CASES.map(c => [c.id, c.rows()]));

describe('Space-bar audit (Decision 6): what is right is locked', () => {
  it('F: Space rises in proportion to the count; the tank minimum does not move with it', () => {
    const rows = byId.F, base = rows[0];
    for (const r of rows) {
      const k = Number(r.label.split(' ')[0]) / 6;
      expect(r.space / base.space, r.label).toBeCloseTo(k, 6);
      expect(r.minimum, r.label).toBeCloseTo(base.minimum, 9);
    }
  });
  it('the water limit alone is still shape-blind (the AqAdvisor-fitted per-litre number is unchanged)', () => {
    const [t, w] = byId.C; expect(t.water).toBeCloseTo(w.water, 6);
  });
});

describe('Space-bar habitat model (lane HB, research/habitat-model.md): the five MA todos', () => {
  it('A: a cory-heavy mix is judged against floor area (bottom habitat), not total water', () => {
    const [cory, danio] = byId.A;
    expect(cory.floor).toBeGreaterThan(cory.water); expect(cory.space).toBe(cory.floor);
    expect(danio.floor).toBeLessThan(danio.water); expect(cory.space).toBeGreaterThan(danio.space);
  });
  it('B: for the same stock a 20 long reads roomier than a 20 high (more floor)', () => {
    const [long, high] = byId.B; expect(long.space).toBeLessThan(high.space); expect(long.floor).toBeLessThan(high.floor);
  });
  it('C: of two tanks with equal water, the shallow-wide one reads roomier', () => {
    const [tall, wide] = byId.C; expect(wide.space).toBeLessThan(tall.space); expect(tall.space).toBe(tall.floor);
  });
  it('D: extra height on the same floor counts for the midwater swimmers only, not for the bottom dwellers', () => {
    const [h12, h24] = byId.D;
    expect(h24.water).toBeCloseTo(h12.water / 2, 0); expect(h24.floor).toBeCloseTo(h12.floor, 9); // the cories' floor share does not move
    expect(h24.space).toBeGreaterThan(h12.space / 2); expect(h24.space).toBe(h24.floor);
  });
  it('E: for a bottom-only stock Space stops falling once only height grows (same floor = same habitat)', () => {
    const e = byId.E;
    for (const r of e.slice(1)) expect(r.space, r.label).toBeCloseTo(e[0].space, 9);
    expect(e[3].minimum).toBeCloseTo(e[2].minimum, 6);
  });
});

if ((globalThis as any).process?.env.GEN_SPACE_AUDIT) it('writes research/space-audit.md', () => {
  const out = ['# Space-bar audit (lane MA, 2026-10-21; habitat model lane HB, same day)', '',
    'Decision 6 (research/tank-minimum-first-principles.md) audited the Space bar (`stockingOf` in src/scene/stocking.ts, spacePercent).',
    'Since lane HB (research/habitat-model.md) Space is the larger of two limits: WATER = sum of mass^0.45 x fitted species factor /',
    '(litres x SPACE_PER_L), the AqAdvisor-fitted per-litre number; FLOOR = the floor the bottom dwellers use (15 sq in per inch of',
    'mass-equivalent length, "all"-zone fish half) over the tank floor. Filtration and the tank-minimum gate (`tankMinimum`) are shown beside it',
    'for contrast. Numbers from test/spaceaudit.test.ts (`GEN_SPACE_AUDIT=1 npx vitest run test/spaceaudit.test.ts`); default filter,',
    'water at 90 % of the tank height, no plants. US units: gal of water, sq in of floor.', '',
    '| Case | Verdict | Space right? |', '|---|---|---|',
    ...CASES.map(c => `| ${c.id} | ${c.title} | ${c.right} |`), ''];
  for (const c of CASES) {
    out.push(`## ${c.id}. ${c.title}`, '', '| Tank | Stock | Water gal | Floor sq in | Space % | water limit % | floor limit % | Filtration % | Tank minimum % |', '|---|---|---|---|---|---|---|---|---|');
    for (const r of byId[c.id]) out.push(`| ${r.tank} | ${r.stock} | ${r1(r.gal)} | ${r0(r.floorSqIn)} | ${r0(r.space)} | ${r0(r.water)} | ${r0(r.floor)} | ${r0(r.filtration)} | ${r0(r.minimum)} |`);
    out.push('', `**Verdict (${c.right === 'yes' ? 'right, locked' : c.right === 'no' ? 'wrong' : 'partly right'}).** ${c.verdict}`, '');
  }
  out.push('## What changed (lane HB)', '',
    '- Space sees the floor: bottom dwellers are held to floor area (A, C), so a taller tank on the same floor gives them no more room (D, E), and the floor share tells a 20 long from a 20 high (B).',
    '- The water limit is the AqAdvisor-fitted number, unchanged (median ours / AqAdvisor 1.03 on the 24 mixes, before and after).',
    '- Count is still handled right (F): more animals raise Space, not the minimum.',
    '- Not modelled (nothing sourced, research/habitat-model.md): a run-length term in Space (the tank minimum holds the sourced length), an activity multiplier, height limits for swimmers.',
    '- Extra water still matters for stability (dilution, temperature swings): that belongs to the Filtration bar and the volume advisory (Decision 2), not to Space.', '');
  writeFileSync('research/space-audit.md', out.join('\n'));
});
