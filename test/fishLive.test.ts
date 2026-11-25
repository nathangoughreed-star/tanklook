import { describe, expect, it } from 'vitest';
import { getSpecies, goLive } from '../src/data/species';
import fishLive from '../src/data/fishLive.json';

const anat = import.meta.glob('../src/data/fishart/*.anatomy.json', { eager: true, import: 'default' }) as Record<string, any>;
const live = fishLive.live as Record<string, { look: string; approved: string }>;

describe('fishLive.json (approved build-B fish)', () => {
  it('every entry names a real species, a build-B look with a built model, and an approval date', () => {
    for (const [id, e] of Object.entries(live)) {
      expect(getSpecies(id), id).toBeTruthy();
      const look = getSpecies(e.look);
      expect(look, e.look).toBeTruthy();
      expect(look!.sci, `${id} -> ${e.look}: same fish`).toBe(getSpecies(id)!.sci);
      const f = `../src/data/fishart/${look!.art}.anatomy.json`;
      expect(anat[f]?.anatomy?.render?.photo?.art, f).toBe(look!.art);
      expect(e.approved, id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('goLive draws the species with the look row art and size, and leaves the albino form alone', () => {
    const s = getSpecies('angel')!, l = getSpecies('angelb')!, albinoArt = s.albinoForm?.art;
    expect(goLive('angel', 'angelb')).toBe(true);
    expect([s.art, s.aspect, s.rest, s.look]).toEqual([l.art, l.aspect, l.rest, l.look]);
    expect(s.albinoForm?.art).toBe(albinoArt);
    expect(goLive('angel', 'nope')).toBe(false);
  });
});

describe('build-B review looks stay out of the app lists', () => {
  it('model-only rows (angelb, cardinalc, bluetangd, clownknife, bichirb) are findable but not listed; real species stay listed', async () => {
    const { SPECIES, REVIEW_LOOKS } = await import('../src/data/species');
    const listed = new Set(SPECIES.map(s => s.id)), review = new Set(REVIEW_LOOKS.map(s => s.id));
    for (const id of ['angelb', 'cardinalc', 'bluetangd', 'oscarb', 'royalgrammab', 'clownknife', 'bambooshark', 'bichirb']) { expect(listed.has(id), id).toBe(false); expect(review.has(id), id).toBe(true); expect(getSpecies(id), id).toBeTruthy(); }
    for (const id of ['angel', 'cardinal', 'bluetang', 'oscar', 'royalgramma', 'betta', 'goldfish', 'comet', 'flameangel', 'peapuffer']) expect(listed.has(id), id).toBe(true);
  });
});

describe('colour forms of a species gone live', () => {
  it('repaint the old model, whose form plan exists, not the build-B look', async () => {
    const { speciesOf } = await import('../src/data/species');
    const { artMeta } = await import('../src/art/fishgen');
    const old = getSpecies('platy')!.art;
    goLive('platy', 'platyb');
    const f = speciesOf({ species: 'platy', form: 'sunburst' })!;
    expect(f.art.startsWith(old + '~f:')).toBe(true);
    expect(artMeta(f.art), f.art).toBeTruthy();
    expect(getSpecies('platy')!.art).toBe(getSpecies('platyb')!.art);
  });
});
