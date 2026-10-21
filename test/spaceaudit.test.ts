// Space-bar audit (lane MA, 2026-10-21; research/tank-minimum-first-principles.md Decision 6). The Space bar (`stockingOf` spacePercent)
// stays a per-litre heuristic for now: these cases record what it says for the six shapes of question Decision 6 names, and lock it only
// where it is right. Where it rewards volume that gives no usable habitat the case is an `it.todo` (documented, not fixed: lane MM / a
// later Space model). `GEN_SPACE_AUDIT=1 npx vitest run test/spaceaudit.test.ts` rewrites research/space-audit.md from the same cases.
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

interface Row { label: string; tank: string; stock: string; gal: number; floorSqIn: number; space: number; filtration: number; minimum: number }
const MIX = { bronzecory: 6, danio: 8 }, CORY = { bronzecory: 10 };
const desc = (c: Record<string, number>) => Object.entries(c).map(([k, n]) => `${n} ${k}`).join(' + ');
function row(label: string, tankName: string, tank: Tank, counts: Record<string, number>): Row {
  const S = setup(tank, counts), s = stockingOf(S), m = tankMinimum(S);
  return { label, tank: tankName, stock: desc(counts), gal: s.capacity.litres / 3.785, floorSqIn: tank.L * tank.D / IN / IN, space: s.spacePercent, filtration: s.filtrationPercent, minimum: m.percent };
}

/** The six cases; `verdict` is the plain reading, `right` whether the heuristic answers the habitat question correctly. */
const CASES: { id: string; title: string; rows: () => Row[]; right: 'yes' | 'no' | 'partly'; verdict: string }[] = [
  { id: 'A', title: '15 cory + 5 danio vs 5 cory + 15 danio, 40 gal breeder', right: 'partly',
    rows: () => [row('cory-heavy', '40 breeder', model('g40b'), { bronzecory: 15, danio: 5 }), row('danio-heavy', '40 breeder', model('g40b'), { bronzecory: 5, danio: 15 })],
    verdict: 'The cory-heavy mix reads fuller, but only because a bronze cory weighs more than a danio. Space never asks whether 15 bottom dwellers fit on the 36 x 18 in floor: the same two mixes in a 40 gal tank of any shape give the same numbers. Right direction, wrong reason.' },
  { id: 'B', title: '20 long vs 20 high, same stock', right: 'no',
    rows: () => [row('20 long', '20 gal long', model('g20l'), MIX), row('20 high', '20 gal high', model('g20h'), MIX)],
    verdict: 'The 20 long has about 33 % more floor and 6 in more swimming run, yet Space reads it within a few points of the 20 high (only the water volume differs). For cories (floor) and danios (run) the 20 long is clearly the roomier tank; the heuristic cannot see it. The tank-minimum gate does (108 % vs 143 %): the two bars disagree about which tank is roomier.' },
  { id: 'C', title: 'Tall-narrow vs shallow-wide, equal volume (24 x 12 x 24 in vs 48 x 24 x 6 in)', right: 'no',
    rows: () => [row('tall-narrow', '24 x 12 x 24 in', rect(24, 12, 24), MIX), row('shallow-wide', '48 x 24 x 6 in', rect(48, 24, 6), MIX)],
    verdict: 'Identical Space for 4x the floor and twice the run. The shallow-wide tank gives the cories four times the bottom habitat and the danios a 48 in run; the tall tank gives height neither uses much. Volume stands in for habitat here and gets it wrong; the tank-minimum gate reads the same pair 144 % vs 49 %.' },
  { id: 'D', title: 'Same floor (30 x 12 in), 12 in vs 24 in high, mixed stock', right: 'partly',
    rows: () => [row('12 in high', '30 x 12 x 12 in', rect(30, 12, 12), MIX), row('24 in high', '30 x 12 x 24 in', rect(30, 12, 24), MIX)],
    verdict: 'Doubling the height halves Space. For the danios (midwater shoalers) some extra column is real room; for the cories it is none: they get the same 360 sq in of floor. Half the stock is credited with habitat it does not use. The extra water does help stability (dilution), which the Filtration bar and a volume advisory should carry, not Space.' },
  { id: 'E', title: 'More height, same floor (30 x 12 in), bottom dwellers only (10 bronze cory)', right: 'no',
    rows: () => [12, 18, 24, 36].map(h => row(`${h} in high`, `30 x 12 x ${h} in`, rect(30, 12, h), CORY)),
    verdict: 'Space falls as 1 / height without limit (10 cories read about a third as full at 36 in as at 12 in) although their floor never changes. The tank-minimum gate plateaus as it should (its floor-area share binds); Space does not. This is the clearest case of the heuristic rewarding volume that gives no usable habitat.' },
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
  it('A: the heavier-bodied mix reads fuller (direction only; the reason is mass, see the todo)', () => {
    expect(byId.A[0].space).toBeGreaterThan(byId.A[1].space);
  });
  it('Space never depends on the shape of the tank, only on its water (documents the limit the todos name)', () => {
    const [t, w] = byId.C; expect(t.space).toBeCloseTo(w.space, 6);
  });
  it('E: the tank minimum plateaus once the floor binds; Space keeps falling (recorded, the Space half is the todo below)', () => {
    const e = byId.E; expect(e[3].minimum).toBeCloseTo(e[2].minimum, 6); expect(e[3].space).toBeLessThan(e[2].space * 0.7);
  });
  it.todo('A: a cory-heavy mix should be judged against floor area (bottom habitat), not total water');
  it.todo('B: for the same stock a 20 long should read roomier than a 20 high (more floor, longer run)');
  it.todo('C: of two tanks with equal water, the shallow-wide one should read roomier for bottom dwellers and swimmers');
  it.todo('D: extra height on the same floor should count for midwater swimmers only, not for bottom dwellers');
  it.todo('E: for a bottom-only stock, Space should stop falling once only height grows (same floor = same habitat)');
});

if ((globalThis as any).process?.env.GEN_SPACE_AUDIT) it('writes research/space-audit.md', () => {
  const out = ['# Space-bar audit (lane MA, 2026-10-21)', '',
    'Decision 6 (research/tank-minimum-first-principles.md): the Space bar (`stockingOf` in src/scene/stocking.ts, spacePercent) stays a',
    'per-litre heuristic for now, labelled "Estimated stocking level", and is audited here. Space = sum over animals of mass^0.45 x fitted',
    'species factor / (litres x SPACE_PER_L): it sees the water volume (at the working fill) and the animals\' mass, nothing about floor,',
    'run or height. Filtration (the nitrogen budget) and the tank-minimum gate (`tankMinimum`, src/scene/tankMin.ts) are shown beside it',
    'for contrast. Numbers from test/spaceaudit.test.ts (`GEN_SPACE_AUDIT=1 npx vitest run test/spaceaudit.test.ts`); default filter,',
    'water at 90 % of the tank height, no plants. US units: gal of water, sq in of floor.', '',
    '| Case | Verdict | Heuristic right? |', '|---|---|---|',
    ...CASES.map(c => `| ${c.id} | ${c.title} | ${c.right} |`), ''];
  for (const c of CASES) {
    out.push(`## ${c.id}. ${c.title}`, '', '| Tank | Stock | Water gal | Floor sq in | Space % | Filtration % | Tank minimum % |', '|---|---|---|---|---|---|---|');
    for (const r of byId[c.id]) out.push(`| ${r.tank} | ${r.stock} | ${r1(r.gal)} | ${r0(r.floorSqIn)} | ${r0(r.space)} | ${r0(r.filtration)} | ${r0(r.minimum)} |`);
    out.push('', `**Verdict (${c.right === 'yes' ? 'right, locked' : c.right === 'no' ? 'wrong, documented as it.todo' : 'partly right, the right half locked'}).** ${c.verdict}`, '');
  }
  out.push('## What this means for the long-term Space model', '',
    '- Space is blind to shape: equal water gives equal Space (C), so it cannot tell a 20 long from a 20 high (B) or a tray from a column.',
    '- Height is credited to every animal: bottom dwellers read roomier in a taller tank on the same floor (D, E). The gate already holds them to floor area; Space should too.',
    '- Count is handled right (F): more animals past the viable group raise Space, not the minimum.',
    '- Mass is the only species input (A): bottom vs midwater habitat never enters. A habitat-based Space (bottom habitat for bottom dwellers, horizontal run for swimmers, height only where it helps) needs per-zone habitat coefficients, and Decision 6 forbids inventing per-animal footprint coefficients without evidence. Until then these limits stay documented here, not hidden.',
    '- Extra water still matters for stability (dilution, temperature swings): that belongs to the Filtration bar and the volume advisory (Decision 2), not to Space.', '');
  writeFileSync('research/space-audit.md', out.join('\n'));
});
