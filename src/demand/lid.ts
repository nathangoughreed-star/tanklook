// Lid advice (Nathan 2026-10-26): an open-top tank whose animals climb, jump or walk out is told it needs a lid, and which kind.
// A dry tank's animals (spiders, geckos, snakes) all get out of an open top: a mesh top keeps them in and lets air through.
// In a wet tank, the animals that leave the water (frogs, crabs, newts) and the jumpers named in careNeeds ('Lid: ...') want a glass top.
import { getSpecies } from '../data/species';
import { NEEDS } from '../data/careNeeds';
import type { LidType, TankSetup } from '../scene/types';

export interface LidAdvice { lid: Exclude<LidType, 'open'>; who: string[]; text: string }

const jumper = (id: string) => (NEEDS[id] ?? []).some(n => n.text.startsWith('Lid'));

/** Undefined when the tank has a lid or nothing in it needs one. */
export function lidAdvice(S: TankSetup): LidAdvice | undefined {
  if (S.lid !== 'open') return undefined;
  const who: string[] = [];
  for (const f of S.fish) {
    const sp = getSpecies(f.species);
    if (sp && (!S.water.on || sp.habitat !== 'water' || jumper(sp.id)) && !who.includes(sp.name)) who.push(sp.name);
  }
  if (!who.length) return undefined;
  const them = who.length > 1 ? 'them' : 'it', names = who.length > 2 ? `${who.slice(0, 2).join(', ')} and others` : who.join(' and ');
  return S.water.on
    ? { lid: 'glass', who, text: `${names} can get out of an open top, so the tank needs a lid. A glass top keeps ${them} in and the water warm.` }
    : { lid: 'mesh', who, text: `${names} can get out of an open top, so the tank needs a lid. A mesh top keeps ${them} in and lets air through.` };
}
