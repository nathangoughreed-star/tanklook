/** SK2 (2026-11-17): what is in the box, always in one fixed order (Nathan: "list them off in a bulleted list, always in the same order"). */
export const BOX_ORDER: { key: string; label: string; aka: string[] }[] = [
  { key: 'tank', label: 'Tank', aka: ['tank'] }, { key: 'lid', label: 'Lid / hood', aka: ['lid', 'hood', 'canopy'] }, { key: 'light', label: 'Light', aka: ['light', 'led'] },
  { key: 'filter', label: 'Filter', aka: ['filter'] }, { key: 'heater', label: 'Heater', aka: ['heater'] }, { key: 'stand', label: 'Stand', aka: ['stand'] },
  { key: 'substrate', label: 'Substrate', aka: ['substrate', 'gravel', 'sand'] }, { key: 'decor', label: 'Decor / ornaments', aka: ['decor', 'ornament', 'ornaments', 'decoration'] },
];
/** The missing pieces that matter, in the same order as BOX_ORDER. */
export const BOX_NEEDS = ['light', 'filter', 'heater'];
const OTHER_NAME: Record<string, string> = { dome: 'Heat lamp dome', bulb: 'Heat bulb', uvb: 'UVB lamp', gauge: 'Gauge', thermometer: 'Thermometer', net: 'Net' };
const cap = (s: string) => s ? s[0].toUpperCase() + s.slice(1) : s;
/** `includes` keys to the fixed list: `have` in canonical order then Other (unknown keys, source order, de-duplicated), `missing` = light / filter / heater not in the box. Pure. */
export function boxList(includes: readonly string[]): { have: string[]; missing: string[] } {
  const keys = includes.map(k => String(k).trim().toLowerCase()), slot = (k: string) => BOX_ORDER.find(o => o.aka.includes(k));
  const got = new Set(keys.map(k => slot(k)?.key).filter(Boolean) as string[]);
  const other: string[] = [];
  for (const k of keys) if (k && !slot(k)) { const l = OTHER_NAME[k] ?? cap(k.replace(/[-_]+/g, ' ')); if (!other.includes(l)) other.push(l); }
  return { have: [...BOX_ORDER.filter(o => got.has(o.key)).map(o => o.label), ...other], missing: BOX_ORDER.filter(o => BOX_NEEDS.includes(o.key) && !got.has(o.key)).map(o => o.label) };
}
