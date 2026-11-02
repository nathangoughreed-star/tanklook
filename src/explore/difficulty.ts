// Explore, stage X1 (lane OX3): the Beginner / Intermediate / Advanced rating of a candidate (spec section 3: "based on husbandry complexity, sensitivity and consequence of error, not minutes a week";
// Nathan 2026-11-02, Q4). Derived from the demand model's husbandry risk points (animal care level, plant difficulty, small volume, salt, expert-only warnings: engine.ts `Contribution.risk`),
// computed with ONE fixed reference keeper (a first-time keeper: `defaultProfile()`, skill 0 everywhere) so the label never changes with the viewer's own experience, and cut at the existing
// safe / moderate / demanding boundaries. A salt system or a CO2 rig never reads Beginner. Pure; no render.
import { defaultProfile } from '../demand/types';
import { demandOf, riskLabel, riskScore } from '../demand/engine';
import { techOf } from '../scene/tech';
import type { TankSetup } from '../scene/types';
import { REFERENCE_KEEPER } from './constants';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export interface Difficulty {
  level: DifficultyLevel;
  /** the 0-10 husbandry score for the reference keeper, before any floor */
  score: number;
  /** why it reads as it does: the biggest risk rows, and any floor that raised it */
  why: string[];
}
const BY_LABEL = { safe: 'Beginner', moderate: 'Intermediate', demanding: 'Advanced' } as const satisfies Record<ReturnType<typeof riskLabel>, DifficultyLevel>;
const ORDER: DifficultyLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
const atLeast = (a: DifficultyLevel, b: DifficultyLevel) => ORDER[Math.max(ORDER.indexOf(a), ORDER.indexOf(b))];

/** The rating of a scene (its animals and equipment are read from the scene itself). */
export function difficultyOf(scene: TankSetup, now = Date.now()): Difficulty {
  const D = demandOf(scene, defaultProfile(), { now }), score = riskScore(D.totals.riskRaw);
  let level: DifficultyLevel = BY_LABEL[riskLabel(score)];
  const why = [...D.items].filter(i => i.risk > 0.05).sort((a, b) => b.risk - a.risk).slice(0, 3).map(i => `${i.label} (${i.risk.toFixed(1)} risk points)`);
  const co2 = scene.water.on ? techOf(scene).rows.co2 : undefined;
  if (scene.water.on && scene.water.salt && level === 'Beginner') { level = atLeast(level, 'Intermediate'); why.push('saltwater is never rated Beginner'); }
  if (co2 && co2 !== 'none' && level === 'Beginner') { level = atLeast(level, 'Intermediate'); why.push('a CO2 system is never rated Beginner'); }
  return { level, score: Math.round(score * 10) / 10, why: [`rated for ${REFERENCE_KEEPER}`, ...why] };
}
