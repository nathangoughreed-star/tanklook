// DQ9 (2026-11-12): the Guided / Sandbox rule set (brief.project.rules, scene/brief.ts rulesOf). Three readers use it: the manual species picker
// (ui/pickerStrict.ts pickerReader), the Checks strip wording (ui/checksStrip.ts) and Discover's candidate filter (discoverGates below, for lane DQ10).
// Pure; nothing here writes the scene. D7: Sandbox Discover is still welfare-safe, it only drops the person's own limits.
import type { Rules } from './brief';
import type { Issue, Verdict } from './verdict';

export interface DiscoverGates {
  /** welfare / physical gates (`verdict.gates`: room, filtration, the five husbandry categories): a candidate that adds one is dropped, in BOTH modes */
  welfare: boolean;
  /** the person's own limits (`verdict.hard`: budget, upkeep, care time, space, experience): a candidate that adds one is dropped in Guided only */
  limits: boolean;
}
/** Which of a candidate's verdict lists make it unacceptable. Guided: welfare + limits (today's behaviour). Sandbox: welfare only. */
export const discoverGates = (rules: Rules): DiscoverGates => ({ welfare: true, limits: rules === 'guided' });
/** The issues of a verdict that block a Discover candidate under these rules (the ones `discover.ts` / `candidates.ts` filter on). */
/** SD1: a bottom dweller on a substrate it cannot live on is a welfare Caution (an advisory) that Guided Discover still drops. */
export const isNeedsIssue = (i: Issue): boolean => i.id.startsWith('substrate:needs:');
export const blockingIssues = (v: Verdict, rules: Rules): Issue[] => { const g = discoverGates(rules); return [...(g.welfare ? v.gates : []), ...(g.limits ? v.hard : []), ...(rules === 'guided' ? v.advisories.filter(isNeedsIssue) : [])]; };

/** What the Checks strip says about itself: Sandbox shows the same checks, as information only. */
export const checksNote = (rules: Rules): string => rules === 'sandbox' ? 'Sandbox: these checks are information only. Nothing is blocked.' : '';

/** Switching Sandbox -> Guided: the gates and limits the design breaks now (the Checks strip's own lines), for the person to see and fix one at a time. */
export const violationsOf = (v: Verdict): Issue[] => [...v.gates, ...v.hard];
