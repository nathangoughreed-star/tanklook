import { describe, expect, it } from 'vitest';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { IN } from '../src/scene/physics';
import { Store } from '../src/scene/store';
import { parseScene } from '../src/scene/validate';
import { tankDiff } from '../src/ui/diff';

/** A v6 (pre-split) flat save. */
const v6 = (compare: boolean) => {
  const { tank, ...rest } = structuredClone(defaultSetup());
  return { version: 6, name: 'Old', units: 'in', tankA: tank, tankB: { L: 2 * tank.L, H: tank.H, D: tank.D }, compare, ...rest };
};

describe('scene v7 migration', () => {
  it('a v6 file with Tank B shown becomes two independent tanks, fish at the same relative spots', () => {
    const old = v6(true), { scene } = parseScene(old);
    expect(scene.tanks.length).toBe(2);
    expect(scene.tanks[1].tank.L).toBe(2 * old.tankA.L);
    scene.tanks[1].fish.forEach((f, i) => expect(f.x).toBeCloseTo(scene.tanks[0].fish[i].x * 2, 6));
    expect(scene.tanks[1].water).toEqual(scene.tanks[0].water);
    expect({ active: scene.active, camLock: scene.camLock, name: scene.name }).toEqual({ active: 0, camLock: true, name: 'Old' });
  });
  it('a v6 file without Tank B shown loads as one tank', () => {
    expect(parseScene(v6(false)).scene.tanks.length).toBe(1);
  });
  it('keeps a split scene through save and load, edge mode the same in both', () => {
    const st = new Store(defaultScene()); st.splitTank(); st.edit(t => { t.tank.L = 900; t.render.edge = 'cutout'; });
    const back = parseScene(JSON.stringify(st.scene)).scene;
    expect(back.tanks.map(t => t.tank.L)).toEqual([st.scene.tanks[0].tank.L, 900]);
    expect(back.tanks[1].render.edge).toBe(back.tanks[0].render.edge);
  });
});

describe('split tanks', () => {
  it('split copies the tank; edits go to the active tank only', () => {
    const st = new Store(defaultScene()); st.splitTank();
    expect(st.scene.tanks.length).toBe(2); expect(st.scene.active).toBe(1);
    st.edit(t => { t.water.opacity = 0.5; t.fish.pop(); });
    expect(st.scene.tanks[0].water.opacity).toBe(0);
    expect(st.scene.tanks[0].fish.length).toBe(st.scene.tanks[1].fish.length + 1);
    st.setActive(0); st.edit(t => { t.lid = 'hood'; });
    expect(st.scene.tanks.map(t => t.lid)).toEqual(['hood', 'open']);
  });
  it('closing either tank leaves the other; undo brings it back', () => {
    const st = new Store(defaultScene()); st.splitTank(); st.edit(t => { t.lid = 'glass'; });
    st.closeTank(0);
    expect(st.scene.tanks.length).toBe(1); expect(st.tank.lid).toBe('glass'); expect(st.scene.active).toBe(0);
    st.undo(); expect(st.scene.tanks.length).toBe(2);
  });
  it('locked cameras move together; unlocked they move apart; re-locking snaps to the original tank', () => {
    const st = new Store(defaultScene()); st.splitTank();
    st.cam(c => { c.az = 30; });
    expect(st.scene.tanks.map(t => t.camera.az)).toEqual([30, 30]);
    st.setCamLock(false); st.cam(c => { c.az = -40; c.zoom = 2; }); // active = tank B
    expect(st.scene.tanks.map(t => t.camera.az)).toEqual([30, -40]);
    st.setCamLock(true);
    expect(st.scene.tanks[1].camera).toEqual(st.scene.tanks[0].camera);
    expect(st.scene.tanks[1].camera.az).toBe(30);
  });
  it('switching tanks keeps the selection when the same fish exists there', () => {
    const st = new Store(defaultScene()); const id = st.tank.fish[1].id; st.select(id);
    st.splitTank(); expect(st.selId).toBe(id);
    st.edit(t => { t.fish = t.fish.filter(f => f.id !== id); }); expect(st.selId).toBe(null);
    st.select(null); st.setActive(0); st.select(id); st.setActive(1); expect(st.selId).toBe(null);
  });
});

describe('difference labels', () => {
  const pair = () => { const a = defaultSetup(); return [a, structuredClone(a)] as const; };
  it('the same tank twice: nothing to list', () => {
    const [a, b] = pair(); expect(tankDiff(a, b, 'in')).toEqual([]);
  });
  it('dimensions show numbers; details only name each side', () => {
    const [a, b] = pair();
    b.tank = { L: 36 * IN, H: 16 * IN, D: 18 * IN }; b.fish.pop(); b.water.opacity = 0.4; a.water.opacity = 0.2; b.substrate.type = 'white';
    const d = tankDiff(a, b, 'in');
    expect(d).toContainEqual(['24 × 12 × 12″', '36 × 16 × 18″']);
    expect(d).toContainEqual(['Stocking A', 'Stocking B']);
    expect(d).toContainEqual(['Water tint A', 'Water tint B']);
    expect(d.find(x => x[0].startsWith('Substrate:'))?.[1]).toMatch(/^Substrate: /);
    expect(d.length).toBe(4);
  });
  it('stand height shows numbers, only when both tanks have a stand', () => {
    const [a, b] = pair(); b.stand.height = 24 * IN;
    expect(tankDiff(a, b, 'in')).toEqual([]); // neither shows a stand
    a.stand.show = b.stand.show = true;
    expect(tankDiff(a, b, 'in')).toEqual([['Stand 30″', 'Stand 24″']]);
  });
});
