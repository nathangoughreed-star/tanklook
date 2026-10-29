// Equipment pieces (lane EN, 2026-10-16): a heater, hang-on filter, canister outlet, mister nozzle and light bar as
// placeable items (kind 'equip'). True sizes: `size` is the piece's defining length in mm (the heater's length, the
// filter's width, the pipe's height, the nozzle's stem, the bar's length). The shapes are in render/equipment.ts.
/** Off until Nathan approves the models (on hold 2026-10-16: "not great"): the library and Items panel do not offer equipment. Saved 'equip' items still load and draw. */
export const EQUIP_ENABLED = false;
export type V3 = [number, number, number];
export interface EquipDef { label: string; hint: string; size: number; min: number; max: number; dims: (s: number) => V3 }

/** dims(s) = [x, y, z] extents, base on y = 0, centred in x and z. */
export const EQUIPMENT: Record<string, EquipDef> = {
  heater: { label: 'Heater', hint: 'A submersible glass heater, 250 mm long (50-100 W): stand it upright, or tilt it near the substrate.', size: 250, min: 150, max: 450, dims: s => [s * 0.12, s, s * 0.12] },
  hobfilter: { label: 'Hang-on filter', hint: 'A power filter that hangs on the back rim: lift it to the rim height and set it at the back glass. Size = its width.', size: 140, min: 80, max: 300, dims: s => [s, s * 1.3, s * 0.45] },
  lilypipe: { label: 'Canister outlet (lily pipe)', hint: 'A glass lily-pipe outflow from a canister filter. Size = its height.', size: 200, min: 100, max: 400, dims: s => [s * 0.42, s, s * 0.42] },
  mister: { label: 'Mister line (nozzles)', hint: 'A misting line with three brass nozzles, for a terrarium: fix it high on the back wall or under the lid. Size = its length.', size: 240, min: 100, max: 800, dims: s => [s + 0.05 * s, 38, 28] },
  lightbar: { label: 'Light bar', hint: 'A slim LED bar, 600 mm long with end clips: lay it across under the lid. Size = its length.', size: 600, min: 200, max: 1500, dims: s => [s, 28, 44] },
};

/** The LIBRARY entries (scene/items.ts spreads this in). */
export const equipLibrary = () => !EQUIP_ENABLED ? {} : Object.fromEntries(Object.entries(EQUIPMENT).map(([id, d]) => [id, { kind: 'equip' as const, label: d.label, hint: d.hint, size: d.size, min: d.min, max: d.max }]));
export const equipDims = (variant: string, size: number): V3 => (EQUIPMENT[variant]?.dims ?? ((s: number): V3 => [s, s, s]))(size);
