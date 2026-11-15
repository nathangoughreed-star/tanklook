// What New starts from (lane NT1). Its own module, not in defaults.ts: defaultEnvironment / placement reach locks.ts, and defaults.ts is imported early (an import cycle broke scope.ts at load).
import { emptyScene } from './defaults';
import { withDefaultEnvironment } from './defaultEnvironment';
import { putOnFloor } from './placement';
import type { Scene } from './types';

/** What New starts from (lane NT1, Nathan 2026-11-14): emptyScene, but fresh: the tank on the floor (no stand), no heater, no filter, and the room's wall and the person
 *  for scale on (the default environment). Its own function, so the scenes the engine tests pin (emptyScene / defaultScene) do not move. */
export function freshScene(): Scene {
  const s = emptyScene(), T = s.tanks[0];
  withDefaultEnvironment(T); putOnFloor(T);
  T.person.side = 'right';                                   // away from the Get started card (top left)
  T.camera = { ...T.camera, az: 15, el: 8, zoom: 0.15 };   // the tank on the floor and the whole person, head to feet
  T.tech = { rows: { heater: 'none', filter: 'none' }, heaters: [], filters: [] };   // nothing chosen: the checks list them as to-do (filterState 'unset'), never an error
  return s;
}
