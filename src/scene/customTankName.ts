// P9 (2026-11-13): naming and load-time migration of custom tanks. Kept free of imports from validate.ts so validate can use it.
import { shapeOf } from './shape';
import { tankSig } from './integrated';
import type { CustomTankRef, Tank, TankSetup } from './types';

const IN = 25.4;
const inch = (mm: number) => +(mm / IN).toFixed(1);
const SHAPE_WORD: Record<string, string> = { bow: 'bowfront ', round: 'round ', poly: 'polygon ', bowl: 'bowl ', pie: 'pie ', arch: 'curved-front ' };

/** The automatic name of a custom tank: "Custom 36 x 18 x 16 in" (L x D x H, inches), with the shape word for a non-rectangle. */
export function autoName(T: Tank): string {
  const s = shapeOf(T);
  return `Custom ${SHAPE_WORD[s] ?? ''}${inch(T.L)} x ${inch(T.D)} x ${inch(T.H)} in`;
}

/**
 * A saved scene with no `customTank`: a tank that is a catalogue product keeps being one, anything else (no product, or a product whose
 * size or shape was hand-edited since it was picked, which `product.sig` records) becomes a named custom copy. Nothing about the tank,
 * glass or rim changes, so the scene draws the same. A hand-edited product is released (as the first edit would have). In place on `S`;
 * returns the ref to store, or undefined when the tank stays a commercial one (or an integrated kit).
 */
export function migrateCustomRef(S: Pick<TankSetup, 'tank' | 'product' | 'integrated'>): CustomTankRef | undefined {
  if (S.integrated) return undefined;
  if (S.product) {
    if (!S.product.sig || S.product.sig === tankSig(S.tank)) return undefined;
    delete S.product; // hand-edited: no longer that product
  }
  return { name: autoName(S.tank) };
}
