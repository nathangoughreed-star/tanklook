// The one home of unit conversions and formats (lane P4, 2026-11-14), US and metric. No imports but a type, so the engine,
// the data and the UI can all use it. Each function keeps the rounding of the copy it replaced: the names say which.
import type { Units } from './scene/types';

export const IN = 25.4;

// ---- length (mm is the scene's own unit)
/** mm per display unit: 25.4 for inches, 10 for cm. */
export const unitMM = (u: Units) => (u === 'in' ? IN : 10);
/** mm as a number in the scene's units, two decimals (physics.toUnit). */
export const toUnit = (mm: number, u: Units) => +(mm / unitMM(u)).toFixed(2);
/** A typed value in the scene's units back to mm, unrounded (physics.fromUnit). */
export const fromUnit = (v: number, u: Units) => v * unitMM(u);
/** "12.5″" / "31.8 cm" with `digits` decimals (physics.fmtLen). */
export function fmtLen(mm: number, u: Units, digits = 1) {
  return u === 'in' ? (mm / IN).toFixed(digits) + '″' : (mm / 10).toFixed(digits) + ' cm';
}
/** mm in the scene's units: whole cm, or inches to a tenth (stockSummary.toUnits). */
export const toUnits = (mm: number, u: Units) => u === 'in' ? Math.round(mm / 25.4 * 10) / 10 : Math.round(mm / 10);
/** mm in the scene's units to a tenth of either (the sump size boxes). */
export const toUnitsTenth = (mm: number, u: Units) => u === 'in' ? Math.round(mm / 25.4 * 10) / 10 : Math.round(mm / 10 * 10) / 10;
/** A typed length back to whole mm (habitat.fromUnits, the sump size boxes). */
export const fromUnits = (v: number, u: Units) => Math.round(u === 'in' ? v * 25.4 : v * 10);
/** `12.5"` / `32 cm` (habitat.fmtLen). */
export const fmtLenShort = (mm: number, u: Units) => `${toUnits(mm, u)}${u === 'in' ? '"' : ' cm'}`;
/** Inches to a tenth, and back to whole mm (project.ts's toIn / toMm; the same as toUnits / fromUnits in inches). */
export const mmToIn = (mm: number) => toUnits(mm, 'in');
export const inToMm = (inch: number) => fromUnits(inch, 'in');
/** Person height: feet and inches (in) or metres (cm) (panels.fmtHeight). */
export function fmtHeight(mm: number, u: Units) {
  if (u === 'cm') return (mm / 1000).toFixed(2) + ' m';
  const inches = Math.round(mm / 25.4);
  return `${Math.floor(inches / 12)}′${inches % 12}″`;
}

// ---- temperature
/** °C to whole °F (techMenu, temprange). */
export const cToF = (c: number) => Math.round(c * 9 / 5 + 32);
/** °C to °F to the nearest 0.5 °F: 23.5 °C reads 74.5 °F (climate). */
export const cToFHalf = (c: number) => Math.round((c * 9 / 5 + 32) * 2) / 2;
/** °F to °C to the nearest 0.5 °C (techMenu's fromF). */
export const fToC = (f: number) => Math.round((f - 32) * 5 / 9 * 2) / 2;
/** A temperature DIFFERENCE in °C as whole °F (tech.ts's chiller text). */
export const deltaCToF = (k: number) => Math.round(k * 9 / 5);
/** "75 °F" or "24 °C" (the °C unchanged), the whole-degree form (temprange.fmtT, techMenu.tempTxt). */
export const fmtTemp = (c: number, us?: boolean) => us ? `${cToF(c)} °F` : `${c} °C`;
/** The shell's form: whole °F, or °C to the half (shell/logic/checks.fmtTemp). */
export const fmtTempHalf = (c: number, u: Units) => u === 'in' ? `${cToF(c)} °F` : `${Math.round(c * 2) / 2} °C`;

// ---- volume and area
export const GAL_L = 3.785;
/** "5.3 gal" / "20 L" (stockSummary.fmtOf.vol). */
export const fmtVol = (l: number, u: Units) => u === 'in' ? `${Math.round(l / GAL_L * 10) / 10} gal` : `${Math.round(l)} L`;
/** "46 sq in" / "300 cm²" (stockSummary.fmtOf.area). */
export const fmtArea = (cm2: number, u: Units) => u === 'in' ? `${Math.round(cm2 / 6.4516)} sq in` : `${Math.round(cm2)} cm²`;
