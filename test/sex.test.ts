import { describe, expect, it } from 'vitest';
import { artMeta } from '../src/art/fishgen';
import { SPECIES, fishTL, getSpecies, speciesOf } from '../src/data/species';
import { defaultScene } from '../src/scene/defaults';
import { randomSize } from '../src/scene/scatter';
import type { Fish } from '../src/scene/types';
import { parseScene } from '../src/scene/validate';

const fish = (species: string, extra: Partial<Fish> = {}): Fish => ({ id: 1, species, x: 300, y: 150, depth: 150, yaw: 0, pitch: 0, roll: 0, bend: 0, ...extra });

describe('male / female looks', () => {
  it('every female has its own drawing, a look key and an adult length', () => {
    const dim = SPECIES.filter(s => s.female);
    expect(dim.length).toBeGreaterThanOrEqual(9);
    for (const s of dim) {
      const f = s.female!;
      expect(artMeta(f.art), f.art).toBeTruthy();
      expect(f.art).not.toBe(s.art);
      expect(f.look).toBe(s.id + '~f');
      expect(f.sex).toBe('f');
      expect(f.id).toBe(s.id);
    }
  });
  it('a female is drawn and sized as the female; a male or a non-dimorphic species ignores it', () => {
    const b = getSpecies('betta')!;
    expect(speciesOf(fish('betta', { sex: 'f' }))).toBe(b.female);
    expect(speciesOf(fish('betta'))).toBe(b);
    expect(speciesOf(fish('neon', { sex: 'f' }))).toBe(getSpecies('neon'));
    expect(fishTL(fish('guppy', { sex: 'f' }), getSpecies('guppy')!)).toBe(getSpecies('guppy')!.female!.tl);
    expect(fishTL(fish('guppy', { sex: 'f', tl: 30 }), getSpecies('guppy')!)).toBe(30);
    expect(getSpecies('guppy')!.female!.tl).toBeGreaterThan(getSpecies('guppy')!.tl); // livebearer females are bigger
  });
  it('random sizes centre on the adult length of the fish\'s sex', () => {
    const sp = getSpecies('swordtail')!, f = fish('swordtail', { sex: 'f' });
    const seq = [0.5, 0.25]; let i = 0; randomSize(f, sp, 100, () => seq[i++ % 2]); // cos(2π·0.25) = 0: exactly the mean
    expect(fishTL(f, sp)).toBe(sp.female!.tl);
  });
  it('a saved female loads back; a sex on a species without one is dropped', () => {
    const s = defaultScene();
    s.tanks[0].fish = [fish('betta', { sex: 'f', tl: 50 }), { ...fish('neon', { sex: 'f' }), id: 2 }];
    const t = parseScene(JSON.parse(JSON.stringify(s))).scene.tanks[0];
    expect(t.fish[0].sex).toBe('f');
    expect(t.fish[0].tl).toBe(50);
    expect(t.fish[1].sex).toBeUndefined();
  });
});
