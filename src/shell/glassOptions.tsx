// GS3 (2026-11-16): the thickness picker's options, one list for both unit systems: each size once with both names, grouped by where it is sold.
import { TIER_LABEL, glassChoices } from '../scene/glassSolver';
import { glassOption, type Units } from './logic/tank';

/** <option>s for a thickness <select>: `extras` are values already in use that are not on the list (shown last). `suffix` is added to each label. */
export function GlassOptions({ u, extras = [], suffix = '' }: { u: Units; extras?: number[]; suffix?: string }) {
  const groups = glassChoices(u), listed = groups.flatMap(g => g.items.map(i => i.mm));
  const odd = [...new Set(extras)].filter(e => !listed.some(l => Math.abs(l - e) < 0.02)).sort((a, b) => a - b);
  return <>
    {groups.map(g => <optgroup label={TIER_LABEL[g.tier]}>{g.items.map(i => <option value={String(i.mm)}>{i.label}{suffix}</option>)}</optgroup>)}
    {odd.length ? <optgroup label="Your own">{odd.map(e => <option value={String(e)}>{glassOption(e, u)}{suffix}</option>)}</optgroup> : null}
  </>;
}
