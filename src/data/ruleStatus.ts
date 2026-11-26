// Lane HV unit 2: how well sourced the rules behind a Problem line are (Fable answer 6: "a judgment can never render red"). ruleStatus.json is the app-side copy, per species, of the
// weakest provenance status (src/data/provenance.ts, audit-only) of each field that can raise a Problem; test/hvNoRedAudit.test.ts regenerates it and keeps it in step with the audit.
// Status words: cited, fitted, derived, researched = backed by a source or a fit; claimed, assumption, unsourced = our judgment.
import data from './ruleStatus.json';

export const JUDGMENT: ReadonlySet<string> = new Set(['claimed', 'assumption', 'unsourced']);
const D = data as Record<string, Record<string, string>>;
/** The weakest status among these species' fields (a field a species has no rule for is skipped); undefined when none of them has one. */
export function ruleStatusOf(id: string | string[], fields: string[]): string | undefined {
  const RANK = ['cited', 'fitted', 'derived', 'researched', 'claimed', 'assumption', 'unsourced'];
  let worst: string | undefined;
  for (const i of Array.isArray(id) ? id : [id]) for (const f of fields) { const s = D[i]?.[f]; if (s && (worst === undefined || RANK.indexOf(s) > RANK.indexOf(worst))) worst = s; }
  return worst;
}
/** True when the rule behind a line rests on judgment alone. */
export const isJudgment = (id: string | string[], fields: string[]) => { const s = ruleStatusOf(id, fields); return s !== undefined && JUDGMENT.has(s); };
