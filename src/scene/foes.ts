// BR: who rushes whom in the roaming tank. The unfriendly behavior (chase, flee) appears only where the stocking has a flagged pair, so this
// does not copy any rule: it CALLS the same pair rule the compatibility chips use (animalfit.ts whysAnimal, one species against one other,
// the same call compatRisks makes) and keeps the behavioral reasons said from the side that acts ("would eat it", "would harass its long
// fins", "could nip its feelers", "too aggressive for it"). The passive mirror ("it would ...") is the other side's line and is skipped, as there.
// Chemistry, temperature, size, expertise, one-per-tank and species-tank reasons are not behavior and give no foe.
import { whysAnimal } from './animalfit';
import type { Species } from '../data/species';

/** The reason texts (after "compatibility: ") that mean this species goes at the other one. */
export const ACTS = /^(would eat|may eat|would harass|could nip|too aggressive)\b/;

/** `species`: the water species in the tank (one entry each); `tl`: young animals' lengths by species id (mm), as compatRisks passes. Returns species id -> ids of the species it rushes. */
export function foesOf(species: Species[], tl?: Record<string, number>): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const s of species) {
    for (const o of species) {
      if (o === s || s.habitat === 'land' || o.habitat === 'land') continue;
      const acts = whysAnimal(s, Infinity, 3, [o], { tl }).some(w => {
        if (w.kind !== 'compat' || w.temp) return false;
        const t = w.text.replace(/^compatibility: /, '');
        return !/^it /.test(t) && ACTS.test(t);
      });
      if (acts) { const a = out.get(s.id); if (a) a.push(o.id); else out.set(s.id, [o.id]); }
    }
  }
  return out;
}

/** BR2: the verdict's own sentence for why `s` goes at `o` (the same reason foesOf matched, e.g. "would eat it"), or null when the pair is not flagged. */
export function foeReason(s: Species, o: Species, tl?: Record<string, number>): string | null {
  if (s === o || s.habitat === 'land' || o.habitat === 'land') return null;
  for (const w of whysAnimal(s, Infinity, 3, [o], { tl })) {
    if (w.kind !== 'compat' || w.temp) continue;
    const t = w.text.replace(/^compatibility: /, '');
    if (!/^it /.test(t) && ACTS.test(t)) return t.replace(/ \([^)]*\)$/, '');
  }
  return null;
}
