// Lane TA1 (R111): every Scape catalogue entry has a baked tile (rebuild with `node scripts/ta1-tiles.mjs`): hardscape under public/gallery/scape/<id>.webp,
// substrates and leaf litter under public/gallery/substrate/<id>.webp (litter as litter-<leaf>).
import { describe, expect, it } from 'vitest';
import { LIBRARY } from '../src/scene/items';
import { SUBSTRATES } from '../src/art/placeholder';

// @ts-expect-error node only (no node types in this project)
const fs = await import('node:fs');
const at = (dir: string, id: string) => new URL(`../public/gallery/${dir}/${id}.webp`, import.meta.url);
const has = (dir: string, id: string) => fs.existsSync(at(dir, id)) && fs.statSync(at(dir, id)).size > 1000;
describe('TA1 scape tiles', () => {
  it('every stone, wood, cave and decor item has a tile', () => {
    const ids = Object.keys(LIBRARY).filter(id => ['stone', 'wood', 'cave', 'ornament'].includes(LIBRARY[id].kind));
    expect(ids.length).toBeGreaterThan(20);
    expect(ids.filter(id => !has('scape', id))).toEqual([]);
  });
  it('every preset substrate and leaf litter has a tile', () => {
    expect(Object.keys(SUBSTRATES).filter(id => !has('substrate', id))).toEqual([]);
    expect(['mixed', 'oak', 'magnolia', 'catappa'].filter(l => !has('substrate', 'litter-' + l))).toEqual([]);
  });
});
