import { describe, it, expect } from 'vitest';
import { SPECIES, getSpecies, speciesOf } from '../src/data/species';
import { PLANS, artMeta } from '../src/art/fishgen';
import { albinoColour } from '../src/art/albino';
import { parseScene } from '../src/scene/validate';
import { emptyScene } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { selectionView, setAlbino, speciesDetail } from '../src/shell/logic/animals';
import { carryAnimals } from '../src/scene/carry';

const ALBINO = SPECIES.filter(s => s.albino);
const fish = (id: string, extra: object = {}) => ({ id: 1, species: id, x: 100, y: 100, depth: 100, yaw: 0, pitch: 0, roll: 0, bend: 0, ...extra });

describe('AL1 albino forms', () => {
  it('only some species carry the flag, each with one https source', () => {
    expect(ALBINO.map(s => s.id).sort()).toEqual(['angel', 'bristlenose', 'bronzecory', 'oscar', 'tigerbarb']);
    for (const s of ALBINO) { expect(s.albino).toMatch(/^https:\/\//); expect(s.albinoForm?.art).toBe(s.art + '~albino'); expect(PLANS[s.art + '~albino']).toBeTruthy(); expect(artMeta(s.art + '~albino')).toEqual(artMeta(s.art)); }
    expect(getSpecies('neon')!.albino).toBeUndefined();
  });
  it('speciesOf gives the albino look only to a flagged fish of a flagged species', () => {
    expect(speciesOf({ species: 'oscar', albino: true })!.look).toBe('oscar~a');
    expect(speciesOf({ species: 'oscar' })!.look).toBe('oscar');
    expect(speciesOf({ species: 'neon', albino: true })!.look).toBe('neon');
    expect(speciesOf({ species: 'oscar', albino: true })!.tl).toBe(getSpecies('oscar')!.tl);
  });
  it('the recolour drops the melanin: dark paint becomes pale, red fin pigment stays, eyes are pink', () => {
    const lum = (h: string) => { const n = parseInt(h.slice(1), 16); return ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) / 255; };
    expect(lum(albinoColour('#16140e'))).toBeGreaterThan(0.6);
    expect(albinoColour('#c23a28').slice(1, 3) > albinoColour('#c23a28').slice(5)).toBe(true); // still red-dominant
    const p = PLANS['bristlenose~albino'], q = PLANS.bristlenose;
    expect(lum(p.shade[0])).toBeGreaterThan(lum(q.shade[0]) + 0.4);
    expect(p.eye.pupil).toBeTruthy(); expect(p.eye.iris[0]).not.toBe(q.eye.iris[0]);
    expect(PLANS['tigerbarb~albino'].marks?.some(m => 'c' in m && lum(m.c) < 0.45) ?? false).toBe(false);
  });
  it('round-trips save and load; old files and unflagged species load as normal colour', () => {
    const S = emptyScene(); S.tanks[0].fish = [fish('oscar', { albino: true }), fish('neon', { id: 2, albino: true }), fish('bristlenose', { id: 3 })] as never;
    const back = parseScene(JSON.parse(JSON.stringify(S))).scene.tanks[0].fish;
    expect(back.find(f => f.species === 'oscar')!.albino).toBe(true);
    expect(back.find(f => f.species === 'neon')!.albino).toBeUndefined();
    expect(back.find(f => f.species === 'bristlenose')!.albino).toBeUndefined();
  });
  it('the toggle is offered only for flagged species, sets the whole species, and undoes', () => {
    const st = new Store(); st.edit(s => { s.fish = [fish('oscar'), fish('oscar', { id: 2 }), fish('neon', { id: 3 })] as never; });
    const v = (id: number) => selectionView(st.tank, id, 'in')!;
    expect(v(1).albino).toMatchObject({ on: false, n: 2 }); expect(v(3).albino).toBeNull();
    st.select(1); setAlbino(st, true);
    expect(st.tank.fish.map(f => !!f.albino)).toEqual([true, true, false]);
    st.select(3); setAlbino(st, true); expect(st.tank.fish[2].albino).toBeUndefined();
    st.undo(); st.undo?.();
    expect(st.tank.fish.some(f => f.albino)).toBe(false);
  });
  it('detail note and carry-over', () => {
    const d = speciesDetail(emptyScene().tanks[0], getSpecies('oscar')!, { level: 'ok', text: '', more: [], inTank: 0 } as never, 'in');
    expect(d.rows.some(r => r[0] === 'Albino form')).toBe(true);
    const a = { fish: [fish('oscar', { albino: true })] }, b = { fish: [fish('oscar')] };
    carryAnimals(a as never, b as never); expect((b.fish[0] as { albino?: boolean }).albino).toBe(true);
  });
});
