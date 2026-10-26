// Dry-tank gear standing on the lid (dome heat lamp, UVB tube, mister, fogger) and the light fixture above it (lane S231,
// 2026-10-26): a fixture on legs or hung over the top must clear the tallest piece, or it is drawn through it and the light
// map is for a lamp that cannot stand there. The pieces' heights mirror render/gear3d.ts TOP (a test builds them and checks).
import { RIM_DROP, RIM_H } from './physics';
import { techParts } from './tech';
import type { TankSetup } from './types';

/** Height of a lid piece above the top it stands on (mm), by tech gear id: the dome's neck (a deep dome on a tank over 3 ft). */
const PIECE_H: Record<string, (L: number) => number> = {
  heatdome: L => (L >= 900 ? 108 : 70) * 0.95 + 34 + 3,
  uvbtube: () => 36,
  uvblow: () => 36,
  mister: () => 26,
  fogger: () => 46,
};
/** Clear air left between the tallest piece and the fixture (mm). */
export const TOP_GEAR_GAP = 6;
/** The top's surface above the tank's top edge (mm) for a mesh or glass lid, or the rim with no lid; mirrors lidTop. */
const surfaceAbove = (S: TankSetup) => (S.lid === 'open' ? (S.render.rim ? RIM_DROP : 0) : S.render.rim ? RIM_DROP + 10 - RIM_H : 4);

/** How far above the tank's top edge the tallest top piece reaches (mm), 0 with none (wet tank, hood: its lamp is fixed). */
export function topGearReach(S: TankSetup): number {
  if (S.water.on || S.lid === 'hood') return 0;
  let h = 0;
  for (const p of techParts(S)) h = Math.max(h, PIECE_H[p.gear]?.(S.tank.L) ?? 0);
  return h ? surfaceAbove(S) + h : 0;
}
/** Raise the light's height to clear the top gear; true when it moved. Only ever raises (the owner's higher height stands). */
export function clearTopGear(S: TankSetup): boolean {
  const need = Math.ceil(topGearReach(S) + TOP_GEAR_GAP);
  if (need <= TOP_GEAR_GAP || S.light.height >= need) return false;
  S.light.height = Math.min(need, 600);
  return true;
}
