import { describe, expect, it } from 'vitest';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { eyeClear } from '../src/scene/orbit';
import { Store } from '../src/scene/store';

const walled = (side: 'back' | 'left' | 'right') => { const s = defaultSetup(); s.wall.show = true; s.wall.side = side; return s; };

describe('orbit limit at the room wall', () => {
  it('no wall: every angle is clear', () => {
    const s = defaultSetup(); expect(eyeClear(s, { ...s.camera, az: 180 })).toBe(true);
  });
  it('back wall: front clear, straight behind blocked', () => {
    const s = walled('back');
    expect(eyeClear(s, { ...s.camera, az: 0 })).toBe(true);
    expect(eyeClear(s, { ...s.camera, az: 180 })).toBe(false);
  });
  it('end walls block their own side only', () => {
    const l = walled('left'), r = walled('right');
    expect(eyeClear(l, { ...l.camera, az: -90 })).toBe(false); expect(eyeClear(l, { ...l.camera, az: 90 })).toBe(true);
    expect(eyeClear(r, { ...r.camera, az: 90 })).toBe(false); expect(eyeClear(r, { ...r.camera, az: -90 })).toBe(true);
  });
  it('a drag stops at the wall instead of passing through', () => {
    const st = new Store(defaultScene()); st.edit(t => { t.wall.show = true; t.wall.side = 'back'; });
    st.cam(c => { c.az = 170; });
    const az = st.tank.camera.az;
    expect(az).toBeGreaterThan(60); expect(az).toBeLessThan(170);
    expect(eyeClear(st.tank, st.tank.camera)).toBe(true);
    expect(eyeClear(st.tank, { ...st.tank.camera, az: az + 1 })).toBe(false); // right at the limit
    st.cam(c => { c.az = -170; }); // the far side is not reachable by jumping through the wall either
    expect(eyeClear(st.tank, st.tank.camera)).toBe(true);
  });
  it('turning the wall on moves an eye that is behind it', () => {
    const st = new Store(defaultScene()); st.cam(c => { c.az = 180; });
    st.edit(t => { t.wall.show = true; t.wall.side = 'back'; });
    expect(eyeClear(st.tank, st.tank.camera)).toBe(true);
  });
});
