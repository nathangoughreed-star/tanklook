// The environment a GENERATED setup comes with (lane ED1, Nathan 2026-11-03: "I want the tank generation to default to this environment. Person on, low ambient
// light, wall on, etc."; taken from his exported tank, research/design/env-default-new-tank.json). One named constant, read by every place that makes a generated
// scene (builds.ts baseSetup, drygear.ts drySetup) and by the hand-off (reeval.ts handOff, pristine scene). It holds ENVIRONMENT only: the room, the stand's finish,
// the camera and the render flags. Never a look (the background is each look's own), animals, plants, layout, light product or gear.
// Not applied to: a plain New tank (emptyScene / bareSetup, NW1: starts clean), saved projects (loaded as they were), or a design already in place (GS6: the person's
// own environment is theirs and survives re-evaluation; `wall` is therefore no longer one of the look's fields).
import type { TankSetup } from './types';

export interface DefaultEnvironment {
  /** ambient room light, 0-1 (the factory default is 0.15) */
  room: number;
  wall: TankSetup['wall'];
  person: TankSetup['person'];
  /** the stand's finish only: its height / style stay what the tank brings */
  standFinish: TankSetup['stand']['finish'];
  /** orbit and zoom only: the eye distance stays the tank's */
  camera: Pick<TankSetup['camera'], 'az' | 'el' | 'zoom'>;
  render: Pick<TankSetup['render'], 'edges' | 'rim' | 'grid' | 'beams' | 'pop' | 'glass'>;
}

export const DEFAULT_ENVIRONMENT: DefaultEnvironment = {
  room: 0.05,
  wall: { show: true, side: 'back', color: '#d8d2c6' },
  person: { show: true, height: 1750, side: 'left' },   // 5 ft 9 in
  standFinish: 'oak',
  camera: { az: 30, el: 16, zoom: 0.34 },
  render: { edges: true, rim: true, grid: false, beams: false, pop: 0.15, glass: 'auto' },
};

/** Put the default environment on a generated scene (mutates and returns it). */
export function withDefaultEnvironment<T extends TankSetup>(S: T, env: DefaultEnvironment = DEFAULT_ENVIRONMENT): T {
  S.light = { ...S.light, room: env.room };
  S.wall = { ...env.wall };
  S.person = { ...env.person };
  S.stand = { ...S.stand, finish: env.standFinish };
  S.camera = { ...S.camera, ...env.camera };
  S.render = { ...S.render, ...env.render };
  return S;
}

/** The fields of `S` that differ from the default environment (empty = it carries it). */
export function environmentGaps(S: TankSetup, env: DefaultEnvironment = DEFAULT_ENVIRONMENT): string[] {
  const out: string[] = [], eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  if (S.light.room !== env.room) out.push('light.room');
  if (!eq(S.wall, env.wall)) out.push('wall');
  if (!eq(S.person, env.person)) out.push('person');
  if (S.stand.finish !== env.standFinish) out.push('stand.finish');
  for (const k of ['az', 'el', 'zoom'] as const) if (S.camera[k] !== env.camera[k]) out.push(`camera.${k}`);
  for (const k of Object.keys(env.render) as (keyof DefaultEnvironment['render'])[]) if (S.render[k] !== env.render[k]) out.push(`render.${k}`);
  return out;
}

/** The hand-off of a pristine scene takes the generated one whole, but an environment field the person already changed from the factory's is theirs (GS6): copy those
 *  back from `current` onto `gen` (mutates `gen`). `factory` is what an untouched New tank has. */
export function keepUserEnvironment<T extends TankSetup>(gen: T, current: TankSetup, factory: TankSetup): T {
  const ch = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);
  if (ch(current.light.room, factory.light.room)) gen.light = { ...gen.light, room: current.light.room };
  if (ch(current.wall, factory.wall)) gen.wall = { ...current.wall };
  if (ch(current.person, factory.person)) gen.person = { ...current.person };
  if (ch(current.stand.finish, factory.stand.finish)) gen.stand = { ...gen.stand, finish: current.stand.finish };
  for (const k of ['az', 'el', 'zoom'] as const) if (current.camera[k] !== factory.camera[k]) gen.camera = { ...gen.camera, [k]: current.camera[k] };
  for (const k of Object.keys(DEFAULT_ENVIRONMENT.render) as (keyof DefaultEnvironment['render'])[]) if (ch(current.render[k], factory.render[k])) gen.render = { ...gen.render, [k]: current.render[k] };
  return gen;
}
