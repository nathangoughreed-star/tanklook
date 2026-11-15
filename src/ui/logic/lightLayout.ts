// R87: the light's layout controls, shared by the old Lighting section (ui/panels.ts) and the new shell's Lighting group
// (shell/lighting.tsx). Every edit below is the old panel's own handler, moved here unchanged; the view-model is the old
// panel's show / hide / range logic (panels.ts, the `lType` ... `lPar` rows) as data. No DOM.
import { EXP_MAX, EXP_MIN, FIXTURES, FIX_SPEC, MH_BULBS, TECHS, TUBE_SP_MAX, bestPos, emitters, fitFixture, fixtureOf, ledBarDepth, mountOf, posMax, powerRange, techOf, techsFor, tubeLayout, tubeOf, wattsOf, type Fixture } from '../../scene/lightout';
import { productOn } from '../../scene/lightproduct';
import { locksOf } from '../../scene/integrated';
import { fitK } from '../../scene/tankEdit';
import { topGearReach, TOP_GEAR_GAP } from '../../scene/topgear';
import type { LightProduct } from '../../data/gearCatalog';
import type { LightSettings, LightTech, TankSetup } from '../../scene/types';

/** The numeric fields the sliders write (the old panel's `lKeys`). */
export type LightKey = 'count' | 'rows' | 'spacing' | 'cone' | 'height' | 'bright' | 'kelvin' | 'watts' | 'par' | 'pos';

/** One slider's write. Spacing below a bulb's width (tubes: 20 mm) snaps to 0 = auto; while the power is set, Brightness is Exposure, in stops (bright = 2^v). */
export function setLightField(s: TankSetup, k: LightKey, v: number): void {
  s.light[k] = k === 'spacing' && v < (s.light.type === 'tube' ? 20 : 80) ? 0 : k === 'bright' && wattsOf(s) > 0 ? +(2 ** v).toFixed(3) : v;
}
/** Up to 12 bulbs when placed to fit the tank (no rows to multiply them), 6 otherwise; a fixture may set its own (pendants 4). */
export const countMax = (l: LightSettings) => FIX_SPEC[fixtureOf(l)]?.maxCount ?? (l.type === 'spot' && l.pattern === 'fit' ? 12 : 6);
export const capCount = (l: LightSettings) => { l.count = Math.min(l.count, countMax(l)); };
/** Optimize: the front-to-back place that lights the floor most evenly (lightout bestPos). */
export function optimizePos(s: TankSetup): void { const b = bestPos(s.tank, s.light); if (b != null) s.light.pos = b; }
export const setMount = (s: TankSetup, m: 'legs' | 'hang'): void => { s.light.mount = m; };
export function setHoodLed(s: TankSetup, v: 'bar' | 'strips'): void { if (v === 'bar') s.light.hoodLed = 'bar'; else delete s.light.hoodLed; }
export function setPattern(s: TankSetup, p: LightSettings['pattern']): void { s.light.pattern = p; capCount(s.light); }
export const setBulb = (s: TankSetup, w: number): void => { s.light.bulbW = w; };
/** Fixture (Nathan 2026-10-15): the style sets the geometry and which lamps fit; a lamp it does not come in becomes its first, and a colour outside the new lamp's usual range its usual one. */
export function setFixture(s: TankSetup, f: Fixture): void {
  const l = s.light;
  l.type = FIXTURES[f].type; delete l.product; // a fixture picked by hand: the generic one (the catalogued light is the Tech menu's)
  if (f !== 'flat' && !(l.tech && TECHS[l.tech].on.includes(f))) l.tech = techsFor(f)[0];
  if (f !== 'flat') fitK(l);
  capCount(l); fitFixture(l, s.tank, true); // the style's usual height, beam and power
}
/** A screw-in lamp change also takes that lamp's usual power (a 50 W halogen is a 10 W LED bulb). */
export function setTech(s: TankSetup, t: LightTech): void {
  const l = s.light; l.tech = t; fitK(l); delete l.product;
  if (fixtureOf(l) === 'bulb') delete l.watts;
}

export interface Slider { show: boolean; value: number; min: number; max: number; step: number; disabled?: boolean }
export interface LayoutView {
  /** an integrated kit's own light: the equipment rows are read-only */
  locked: boolean;
  product?: LightProduct;
  fixture: Fixture; hood: boolean; flat: boolean;
  fixtureOptions: { id: Fixture; label: string; disabled: boolean }[];
  tech: LightTech; techOptions: { id: LightTech; label: string }[];
  /** what the product or kit fixes, as read-only lines */
  fixed: { fixture: boolean; tech: boolean; power: boolean; count: boolean; cone: boolean; kelvin: boolean; par: boolean };
  count: Slider & { label: string; total: number };
  rows: Slider; pattern: { show: boolean; value: LightSettings['pattern'] };
  spacing: Slider & { tube: boolean; hoodDepth: number };
  cone: Slider;
  height: Slider; mount: { show: boolean; value: 'legs' | 'hang' };
  hoodLed: { show: boolean; value: 'bar' | 'strips' };
  pos: Slider & { depth: number; best: number | null; even: boolean };
  watts: number; wattsSlider: Slider & { typical: boolean }; wattsFixedText: string;
  bulb: { show: boolean; value: number };
  par: Slider;
  bright: Slider & { exposure: boolean; x: number };
  kelvin: Slider & { lo: number; hi: number; off: boolean };
}

/** The old panel's refresh for the Lighting rows, as data. Lengths in mm. */
export function layoutView(s: TankSetup): LayoutView {
  const l = s.light, fx = fixtureOf(l), flat = fx === 'flat', hood = s.lid === 'hood', spec = FIX_SPEC[fx], pw = powerRange(l, s.tank);
  const kit = !!locksOf(s)?.light, product = productOn(l), W = wattsOf(s), watts = W > 0, fixedW = fx === 'tube' || fx === 'pendant';
  const spot = l.type === 'spot', tube = l.type === 'tube', tl = tube ? tubeLayout(s.tank, l) : null;
  const total = spot ? emitters(s.tank, l).length : l.count;
  const fit = spot && l.pattern === 'fit';
  const fixed = {
    fixture: kit || !!product, tech: kit || !!product, power: kit || !!product, count: kit || (!!product && spot), cone: kit || !!product?.beamDeg,
    kelvin: kit || !!product?.kelvin, par: kit || !!product?.par,
  };
  // front to back (bars): as far as the housing stays over the tank
  const barDep = tl ? tl.depth : l.type === 'led' ? ledBarDepth(s.tank, l) : 0, pm = Math.floor(posMax(s.tank, barDep) / 5) * 5, pv = Math.min(Math.max(l.pos ?? 0, -pm), pm);
  const best = barDep && !hood ? bestPos(s.tank, l) : null;
  const reach = topGearReach(s), hMin = Math.max(spec?.h[0] ?? 0, Math.ceil(reach + TOP_GEAR_GAP) * +(reach > 0));
  const [ka, kb] = TECHS[techOf(l)].k;
  const ex = Math.min(Math.max(l.bright, EXP_MIN), EXP_MAX);
  const tubeInfo = fx === 'tube' ? tubeOf(l, s.tank) : null;
  return {
    locked: kit, product, fixture: fx, hood, flat, fixed,
    fixtureOptions: (Object.keys(FIXTURES) as Fixture[]).map(id => ({ id, label: id === 'led' && hood ? 'LED (strips or bar)' : FIXTURES[id].label, disabled: id === 'pendant' && hood })),
    tech: techOf(l), techOptions: techsFor(fx).map(id => ({ id, label: TECHS[id].label })),
    count: { show: spot || tube, label: tube ? 'Tubes' : 'Bulbs', value: l.count, min: 1, max: countMax(l), step: 1, total },
    rows: { show: spot && !fit, value: l.rows, min: 1, max: spec?.maxRows ?? 4, step: 1 },
    pattern: { show: spot, value: l.pattern },
    spacing: { show: (spot && !fit) || tube, value: l.spacing ?? 0, min: 0, max: tube ? TUBE_SP_MAX : 1500, step: tube ? 5 : 10, tube, hoodDepth: tl?.depth ?? 0 },
    cone: { show: spot, value: l.cone, min: spec?.cone?.[0] ?? 15, max: spec?.cone?.[1] ?? 120, step: 1 },
    height: { show: !flat, value: l.height, min: Math.max(hMin, 0), max: spec?.h[1] ?? 900, step: 5, disabled: hood },
    mount: { show: !flat && !hood, value: mountOf(l) },
    hoodLed: { show: hood && l.type === 'led', value: l.hoodLed ?? 'strips' },
    pos: { show: !!barDep && !hood, value: pv, min: -pm, max: pm, step: 5, depth: barDep, best, even: best != null && Math.abs(best - pv) < 1 },
    watts: W,
    wattsSlider: { show: !flat && !fixedW, value: W, min: 1, max: pw?.[1] ?? 400, step: 1, typical: !((l.watts ?? 0) > 0) },
    wattsFixedText: tubeInfo ? `${l.count} × ${tubeInfo.w} W tube${l.count > 1 ? 's' : ''}` : fx === 'pendant' ? `${emitters(s.tank, l).length} × ${l.bulbW ?? 150} W bulb${emitters(s.tank, l).length > 1 ? 's' : ''}` : '',
    bulb: { show: fx === 'pendant', value: l.bulbW ?? 150 },
    par: { show: watts, value: l.par ?? 0, min: 0, max: 1500, step: 5 },
    bright: watts ? { show: !flat, value: Math.log2(ex), min: Math.log2(EXP_MIN), max: Math.log2(EXP_MAX), step: 0.05, exposure: true, x: ex } : { show: !flat, value: l.bright, min: 0.2, max: 2.5, step: 0.05, exposure: false, x: l.bright },
    kelvin: { show: !flat, value: l.kelvin, min: 2700, max: 20000, step: 100, lo: ka, hi: kb, off: !flat && (l.kelvin < ka || l.kelvin > kb) },
  };
}
export { MH_BULBS };
