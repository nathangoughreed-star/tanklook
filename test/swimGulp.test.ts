// R145: air gulping. A fish with a GULP entry makes a short trip to the surface and back to where it was; its shoal stays put.
import { describe, expect, it } from 'vitest';
import { makeSwimSim } from '../src/scene/swimSim';
import { GULP, gulpFor } from '../src/scene/fishBehavior';
import { cast, field } from './swimCast';

const dt = 1 / 30;
const withGulp = () => {
  const fish = cast();
  const cory = fish.findIndex(f => f.group?.key === 'cory'), loner = fish.findIndex(f => f.zone === 'bottom' && !f.group), tetra = fish.findIndex(f => f.group?.key === 'tetra');
  fish[cory].gulp = { perHour: 4, dart: true }; fish[loner].gulp = { perHour: 4, dart: true }; fish[tetra].gulp = { perHour: 10, dart: false };
  return { fish, cory, loner, tetra };
};

describe('air gulping (R145)', () => {
  it('table: every entry has a positive rate; gulpFor applies the night factor and the bottom-fish default', () => {
    for (const [id, g] of Object.entries(GULP)) expect(g.perHour, id).toBeGreaterThan(0);
    expect(gulpFor('bronzecory', true, false)).toEqual({ perHour: 4, dart: true });
    expect(gulpFor('bronzecory', true, true)!.perHour).toBeCloseTo(5.2);
    expect(gulpFor('betta', false, false)!.dart).toBe(false);
    expect(gulpFor('clownknife', false, false)!.dart).toBe(false);
    expect(gulpFor('neon', false, false)).toBeUndefined();
  });

  for (const who of ['cory', 'loner', 'tetra'] as const) it(`a forced trip (${who}) reaches the surface, stays clear of solids and comes back to where it was`, () => {
    const c = withGulp(), i = c[who], f = c.fish[i], sim = makeSwimSim(c.fish, field, 11);
    for (let s = 0; s < 20 / dt; s++) sim.step(dt);
    const p = sim.pose(f.id)!, x0 = p.x, y0 = p.y, z0 = p.z;
    expect(sim.gulp!(f.id)).toBe(true);
    expect(sim.gulp!(f.id)).toBe(false); // already on a trip
    let top = -1e9, minC = 1e9, maxPitch = -90, t = 0, back = -1, wentUp = false;
    for (let s = 0; s < 30 / dt; s++) {
      sim.step(dt); t += dt;
      const q = sim.pose(f.id)!;
      top = Math.max(top, q.y); maxPitch = Math.max(maxPitch, q.pitch);
      minC = Math.min(minC, field.clearance(q.x, q.y, q.z, undefined, 1e6) / (f.len * 0.12));
      if (q.y > field.waterTop - f.len) wentUp = true;
      if (back < 0 && wentUp && Math.hypot(q.x - x0, q.y - y0, q.z - z0) < f.len * 0.1) back = t;
    }
    const snout = top + 0.5 * f.len * Math.sin(maxPitch * Math.PI / 180);
    console.log(`${who}: top=${top.toFixed(0)} snout=${snout.toFixed(0)} waterTop=${field.waterTop} pitch=${maxPitch.toFixed(0)} back after ${back.toFixed(1)} s minC/r=${minC.toFixed(2)}`);
    expect(snout).toBeGreaterThan(field.waterTop - f.len * 0.1); // the snout reaches the surface
    expect(top).toBeLessThan(field.waterTop);                     // the body stays in the water
    expect(maxPitch).toBeGreaterThan(30);
    expect(minC).toBeGreaterThanOrEqual(0.99);
    expect(back).toBeGreaterThan(0);                              // back at the spot it left
    expect(back).toBeLessThan(who === 'tetra' ? 20 : 6);
  });

  it('the shoal does not follow a member up; trips happen at about the set rate', () => {
    const c = withGulp(), sim = makeSwimSim(c.fish, field, 5), cor = c.fish.filter(f => f.group?.key === 'cory');
    for (let s = 0; s < 10 / dt; s++) sim.step(dt);
    sim.gulp!(c.fish[c.cory].id);
    let maxOther = 0;
    for (let s = 0; s < 3 / dt; s++) { sim.step(dt); for (const f of cor) if (f !== c.fish[c.cory]) { const q = sim.pose(f.id)!; maxOther = Math.max(maxOther, q.y - field.floorAt(q.x, q.z)); } }
    expect(maxOther).toBeLessThan(cor[0].len); // the others stay on the floor
    // natural trips: a fast rate so a short run sees several
    const d = withGulp(); d.fish[d.cory].gulp = { perHour: 120, dart: true };
    const s2 = makeSwimSim(d.fish, field, 9), id = d.fish[d.cory].id;
    let trips = 0, up = false;
    for (let s = 0; s < 600 / dt; s++) { s2.step(dt); const q = s2.pose(id)!, hi = q.y > field.waterTop - d.fish[d.cory].len; if (hi && !up) trips++; up = hi; }
    console.log(`trips in 600 s at 120/h: ${trips}`);
    expect(trips).toBeGreaterThanOrEqual(8);
    expect(trips).toBeLessThanOrEqual(35);
  });
});
