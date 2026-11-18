// VT1: the Tank workspace's picture tiles: one per base type and per BACKGROUNDS key, each with a baked picture; selection maps to today's placement / background.
import { describe, expect, it } from 'vitest';
import { BACKGROUNDS } from '../src/render/build';
import { defaultSetup } from '../src/scene/defaults';
import { putOnFloor, putOnStand, putOnMyFurniture } from '../src/scene/placement';
import { SITS_TILES, BG_TILES, sitsTileOn, bgShort, tileSrc } from '../src/shell/logic/tankTiles';

// @ts-expect-error node only (no node types in this project)
const fs = await import('node:fs');
const has = (img: string) => { const u = new URL(`../public/gallery/tank-ui/${img}.webp`, import.meta.url); return fs.existsSync(u) && fs.statSync(u).size > 800; };

describe('VT1 tank tiles', () => {
  it('Sits on has Floor, Stand and My own furniture, each with a picture', () => {
    expect(SITS_TILES.map(t => t.id)).toEqual(['floor', 'stand', 'furniture']);
    expect(SITS_TILES.filter(t => !has(t.img))).toEqual([]);
  });
  it('the chosen Sits on tile follows the placement, and none while the question is open', () => {
    const S = defaultSetup();
    putOnFloor(S); expect(sitsTileOn(S)).toBe('floor');
    putOnStand(S); expect(sitsTileOn(S)).toBe('stand');
    putOnMyFurniture(S); expect(sitsTileOn(S)).toBe('furniture');
    S.stand.show = false; S.stand.need = 'ask'; expect(sitsTileOn(S)).toBe('');
  });
  it('there is one background tile per BACKGROUNDS key, in order, with a picture and a short label', () => {
    expect(BG_TILES.map(t => t.id)).toEqual(Object.keys(BACKGROUNDS));
    expect(BG_TILES.length).toBe(21);
    expect(BG_TILES.filter(t => !has(t.img))).toEqual([]);
    expect(new Set(BG_TILES.map(t => t.label)).size).toBe(BG_TILES.length);
    expect(bgShort('Deep-sea fade (blue to black)')).toBe('Deep-sea fade');
    expect(BG_TILES.find(t => t.id === 'none')!.label).toBe('None');
  });
  it('picture urls sit under gallery/tank-ui', () => { expect(tileSrc('/', 'bg-blue')).toBe('/gallery/tank-ui/bg-blue.webp'); });
});
