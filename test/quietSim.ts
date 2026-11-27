// Long-run statistics tests (cohesion, digging, hovering, home-keeping, pace) import makeSwimSim from HERE, not from src/scene/swimSim:
// the sim with its seeded alarm (a startle every 1-3 min) and foe rushes switched off. Those events are intended behavior, but they move
// a school's spread or a dig share by chance and differently per platform (CI saw 608 > 520 and 0.010 < 0.02 on Linux), and those tests
// measure something else. test/swimRelations.test.ts imports the real one and tests the events themselves.
import { makeSwimSim as realMakeSwimSim } from '../src/scene/swimSim';
import type { SwimField, SwimSim, SwimmerSpec } from '../src/scene/swimTypes';

export function makeSwimSim(specs: SwimmerSpec[], field: SwimField, seed: number): SwimSim {
  const sim = realMakeSwimSim(specs, field, seed);
  sim.setEvents(false);
  return sim;
}
