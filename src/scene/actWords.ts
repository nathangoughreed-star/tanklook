// BR2: the tap label's words. One plain phrase per sim state (ACT, swimTypes.ts), an action only, backed by what the sim is really doing.
// Per-species flavour only where the motion differs (a cory roots in the sand, a plecos rasps). No exclamation marks, no filler.
import { ACT } from './swimTypes';

const BASE: Record<number, string> = {
  [ACT.swim]: 'swimming', [ACT.rest]: 'resting on the bed', [ACT.hover]: 'hovering', [ACT.shoal]: 'swimming with its group',
  [ACT.forage]: 'foraging', [ACT.dig]: 'digging into the substrate', [ACT.hidden]: 'hiding', [ACT.home]: 'at its home spot',
  [ACT.peck]: 'pecking at a surface', [ACT.patrol]: 'patrolling its patch', [ACT.gulp]: 'going up for air', [ACT.startled]: 'startled',
  [ACT.chase]: 'chasing', [ACT.flee]: 'fleeing', [ACT.pair]: 'staying close to its mate',
};
/** Per-species wording for a few states: kind id -> act -> phrase. */
const FLAVOUR: Record<string, Record<number, string>> = {
  bronzecory: { [ACT.forage]: 'rooting in the substrate' }, pepperedcory: { [ACT.forage]: 'rooting in the substrate' }, pandacory: { [ACT.forage]: 'rooting in the substrate' },
  pygmycory: { [ACT.forage]: 'rooting in the substrate' }, sterbai: { [ACT.forage]: 'rooting in the substrate' }, saltpepper: { [ACT.forage]: 'rooting in the substrate' }, falsejulii: { [ACT.forage]: 'rooting in the substrate' },
  kuhli: { [ACT.forage]: 'sifting the substrate', [ACT.hidden]: 'hiding in the substrate' },
  pleco: { [ACT.forage]: 'rasping the bed' }, bristlenose: { [ACT.forage]: 'rasping the bed' },
  betta: { [ACT.gulp]: 'going up for air' },
};

/** The phrase after the species name: "rooting in the substrate", "chasing the neon tetra". `target` = the other species' name for a chase or a flee. */
export function actPhrase(act: number, kind: string, target?: string): string {
  const p = FLAVOUR[kind]?.[act] ?? BASE[act] ?? 'swimming';
  if (act === ACT.chase && target) return `chasing the ${target.toLowerCase()}`;
  if (act === ACT.flee && target) return `fleeing the ${target.toLowerCase()}`;
  return p;
}
/** The label: "Bronze cory: rooting in the substrate". */
export const actLabel = (name: string, act: number, kind: string, target?: string) => `${name}: ${actPhrase(act, kind, target)}`;
