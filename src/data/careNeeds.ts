// Essential care conditions (lane RF, 2026-10-22; research/rules-spec.md section 6, first finding): what an animal needs whatever the group
// count (feeding, tank maturity, its environment), evaluated on their own and shown beside every group result, never inside a group band.
// Before this the mandarin's live-pod line sat in groups.ts as its "avoid" band message, which a count of 1 never reaches, so it never showed.
// Wording only, no numbers: the lines that were band messages in groups.ts (P1 data, research/groups-sources.md) moved here.

/** feeding = what it eats and whether the tank supplies it; maturity = how established the tank must be; environment = a fixture or condition */
export type NeedKind = 'feeding' | 'maturity' | 'environment';
/** rules-spec section 3: S3 death or injury, S2 chronic harm, S1 reduced success */
export type NeedSeverity = 'S3' | 'S2' | 'S1';
export interface CareNeed {
  kind: NeedKind;
  severity: NeedSeverity;
  /** the condition, in words */
  text: string;
}
/** How a need stands for a given plan: 'unchecked' = the engine has no model for it (no food supply, no tank age), so it is the user's to confirm. */
export interface NeedResult extends CareNeed { status: 'met' | 'unmet' | 'unchecked' }

export const NEEDS: Record<string, CareNeed[]> = {
  mandarin: [
    { kind: 'feeding', severity: 'S3', text: 'Feeding: eats live copepods (pods) and needs a pod-rich tank or a steady pod supply' },
    { kind: 'maturity', severity: 'S3', text: 'Tank maturity: needs a mature reef with an established pod population, not a newly cycled tank' },
  ],
  hatchet: [{ kind: 'environment', severity: 'S3', text: 'Lid: hatchetfish jump; needs a tight lid' }],
  hermit: [{ kind: 'environment', severity: 'S2', text: 'Shells: needs a spare shell each; short of shells they can attack snails' }],
  // an advisory, not a computed result: the engine does not model territorial behaviour (gbr review 2026-10-22)
  gbr: [{ kind: 'environment', severity: 'S1', text: 'Breeding territory: when breeding, rams may chase other bottom-dwelling fish; provide separate sheltered areas and watch for any fish kept away from food or cover' }],
};

const KIND_NAME: Record<NeedKind, string> = { feeding: 'food supply', maturity: 'tank age', environment: 'fixture' };

/** The species' essential conditions for a plan, independent of how many are kept. The engine models none of them yet, so each is
 *  'unchecked' (rules-spec section 3: report the limitation; never imply another answer would fix it). */
export function needsOf(id: string): NeedResult[] {
  return (NEEDS[id] ?? []).map(n => ({ ...n, status: 'unchecked' as const }));
}

/** One line per need as the screens show it. */
export function needLine(n: NeedResult): string {
  return n.status === 'unchecked' ? `${n.text}. Not checked: the tool cannot see the ${KIND_NAME[n.kind]}; confirm it before buying` : n.text;
}
