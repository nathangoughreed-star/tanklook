import { describe, it, expect } from 'vitest';
import { SPECIES, getSpecies, speciesOf, hasForm, gloForm } from '../src/data/species';
import { PLANS, artMeta, bodyPlan } from '../src/art/fishgen';
import { COLOUR_PATCH, FIN_PATCH, FORMS, formArt } from '../src/art/forms';
import { parseScene } from '../src/scene/validate';
import { emptyScene } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { selectionView, setForm, setAlbino, addSpecies } from '../src/shell/logic/animals';
import { groupPicker, OK_FIT } from '../src/scene/pickerKind';
import { carryAnimals } from '../src/scene/carry';

const fish = (id: string, extra: object = {}) => ({ id: 1, species: id, x: 100, y: 100, depth: 100, yaw: 0, pitch: 0, roll: 0, bend: 0, ...extra });
const ids = (l: { id: string }[]) => l.map(x => x.id);

describe('CM3 colour / fin forms', () => {
  it('every form in the data has paint and every paint has a form, no duplicate ids, a source per species', () => {
    for (const [sp, F] of Object.entries(FORMS)) {
      expect(getSpecies(sp), sp).toBeTruthy();
      expect(F.src, sp).toMatch(/^https:\/\//);
      expect(new Set(ids(F.colour)).size).toBe(F.colour.length); expect(new Set(ids(F.fin)).size).toBe(F.fin.length);
      if (sp !== 'cherryshrimp') {
        expect(ids(F.colour).sort(), sp + ' colour').toEqual(Object.keys(COLOUR_PATCH[sp] ?? {}).sort());
        expect(ids(F.fin).sort(), sp + ' fin').toEqual(Object.keys(FIN_PATCH[sp] ?? {}).sort());
      }
    }
    for (const sp of Object.keys(COLOUR_PATCH)) expect(FORMS[sp], sp).toBeTruthy();
  });
  it('the species covered, each with plenty of forms', () => {
    expect(Object.keys(FORMS).sort()).toEqual(['angel', 'betta', 'blackskirt', 'cherryshrimp', 'danio', 'discus', 'goldfish', 'guppy', 'molly', 'platy', 'swordtail', 'threespot', 'tigerbarb']);
    expect(FORMS.betta.colour.length).toBeGreaterThanOrEqual(12); expect(FORMS.betta.fin.length).toBeGreaterThanOrEqual(6); expect(FORMS.guppy.colour.length).toBeGreaterThanOrEqual(10);
  });
  it('every form has a plan (males and females) with a card size', () => {
    for (const [id, F] of Object.entries(FORMS)) {
      const sp = getSpecies(id)!;
      for (const a of [sp.art, sp.female?.art]) {
        if (!a) continue;
        for (const c of F.colour) { const k = formArt(a, c.id); expect(bodyPlan(k), k).toBeTruthy(); expect(artMeta(k), k).toBeTruthy(); }
        for (const t of F.fin) { const k = formArt(a, undefined, t.id); expect(bodyPlan(k), k).toBeTruthy(); }
      }
    }
    expect(PLANS[formArt('betta', 'koi', 'halfmoon')].tail.type).toBe('half');
  });
  it('a colour form changes the paint, not the body; a fin form changes the tail', () => {
    const b = PLANS.betta, k = PLANS[formArt('betta', 'blue')], h = PLANS[formArt('betta', undefined, 'halfmoon')];
    expect(k.shade[1]).not.toBe(b.shade[1]); expect(k.depth).toBe(b.depth); expect(k.tail.type).toBe(b.tail.type); expect(k.tail.tint).not.toBe(b.tail.tint);
    expect(h.tail.type).toBe('half'); expect(h.shade).toEqual(b.shade);
  });
  it('speciesOf draws the form of a fish that carries one, and ignores unknown ids', () => {
    expect(speciesOf({ species: 'betta', form: 'koi' })!.art).toBe(formArt('betta', 'koi'));
    expect(speciesOf({ species: 'betta', form: 'koi', sex: 'f' })!.art).toBe(formArt('betta_f', 'koi'));
    expect(speciesOf({ species: 'betta', form: 'nope' })!.art).toBe('betta');
    expect(speciesOf({ species: 'neon', form: 'koi' })!.art).toBe('tetra');
    expect(speciesOf({ species: 'betta', form: 'koi' })!.tl).toBe(getSpecies('betta')!.tl);
    expect(hasForm('betta', 'colour', 'koi')).toBe(true); expect(hasForm('betta', 'fin', 'koi')).toBe(false);
  });
  it('round-trips save and load; old files and unknown form ids load as the normal look', () => {
    const S = emptyScene(); S.tanks[0].fish = [fish('betta', { form: 'koi', finForm: 'halfmoon' }), fish('betta', { id: 2, form: 'bogus' }), fish('neon', { id: 3, form: 'koi' }), fish('guppy', { id: 4 })] as never;
    const back = parseScene(JSON.parse(JSON.stringify(S))).scene.tanks[0].fish;
    expect(back[0]).toMatchObject({ form: 'koi', finForm: 'halfmoon' });
    expect(back[1].form).toBeUndefined(); expect(back[2].form).toBeUndefined(); expect(back[3].form).toBeUndefined(); expect(back[3].finForm).toBeUndefined();
  });
  it('the menu: whole species or one animal, undoable view, and exclusive with albino', () => {
    const st = new Store(); st.edit(s => { s.fish = [fish('angel'), fish('angel', { id: 2 }), fish('neon', { id: 3 })] as never; });
    const v = (id: number) => selectionView(st.tank, id, 'in')!;
    expect(v(1).forms!.axes.map(a => a.axis)).toEqual(['colour', 'fin']); expect(v(3).forms).toBeNull();
    expect(v(1).forms!.axes[0].list[0].id).toBe('');
    st.select(1); setForm(st, 'colour', 'koi'); expect(st.tank.fish.map(f => f.form)).toEqual(['koi', 'koi', undefined]);
    setForm(st, 'colour', 'zebra', false); expect(st.tank.fish.map(f => f.form)).toEqual(['zebra', 'koi', undefined]);
    setAlbino(st, true); expect(st.tank.fish.slice(0, 2).every(f => !f.form && f.albino)).toBe(true);
    setForm(st, 'colour', 'gold'); expect(st.tank.fish.slice(0, 2).every(f => f.form === 'gold' && !f.albino)).toBe(true);
    setForm(st, 'colour', 'bogus'); expect(st.tank.fish[0].form).toBe('gold');
    setForm(st, 'colour', ''); expect(st.tank.fish.some(f => f.form)).toBe(false);
    st.select(3); setForm(st, 'colour', 'koi'); expect(st.tank.fish[2].form).toBeUndefined();
  });
  it('carries over to a rebuilt tank', () => {
    const a = { fish: [fish('betta', { form: 'koi', finForm: 'plakat' })] }, b = { fish: [fish('betta')] };
    carryAnimals(a as never, b as never); expect(b.fish[0]).toMatchObject({ form: 'koi', finForm: 'plakat' });
  });
  it('GloFish: the black skirt tetra exists; three species sell as GloFish and add in a glow colour', () => {
    expect(getSpecies('blackskirt')!.sci).toBe('Gymnocorymbus ternetzi');
    expect(SPECIES.filter(s => gloForm(s)).map(s => s.id).sort()).toEqual(['blackskirt', 'danio', 'tigerbarb']);
    expect(gloForm(getSpecies('danio')!)).toBe('glo-green');
    const st = new Store();
    addSpecies(st, getSpecies('danio')!, undefined, 100, false, 'glo-green');
    expect(st.tank.fish.length).toBeGreaterThan(0); expect(st.tank.fish.every(f => f.form === 'glo-green')).toBe(true);
    expect(groupPicker(SPECIES.filter(s => s.id === 'danio'), 'freshwater', () => OK_FIT).map(g => g.role)).not.toContain('glo');   // the GloFish group is built in pickView, not groupPicker
  });
});
