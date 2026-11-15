// R86: the light map ends when the Equipment section is left (another section opens, or the panel closes).
import { describe, expect, it } from 'vitest';
import { defaultScene } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { closeLightMap, setMapOn } from '../src/shell/logic/lighting';

const mk = () => { const s = new Store(defaultScene()); s.update(() => {}, { history: false }); return s; };

describe('closeLightMap', () => {
  it('switches the map off and does not add an undo step', () => {
    const s = mk();
    s.edit(t => setMapOn(t, true));
    expect(s.tank.render.beams).toBe(true);
    s.undo(); s.redo(); // the toggle itself is undoable; leave it on, then close
    const before = s.canUndo;
    closeLightMap(s);
    expect(s.tank.render.beams).toBe(false);
    expect(s.canUndo).toBe(before);
  });
  it('turns it off on every tank of a split view', () => {
    const s = mk();
    s.update(sc => { sc.tanks.push(structuredClone(sc.tanks[0])); sc.tanks.forEach(t => { t.render.beams = true; }); });
    closeLightMap(s);
    expect(s.scene.tanks.every(t => !t.render.beams)).toBe(true);
  });
  it('does nothing when the map is already off', () => {
    const s = mk(), rev = s.rev;
    closeLightMap(s);
    expect(s.rev).toBe(rev);
  });
});
