// The Checks strip (lane DX1): a small READ-ONLY readout of the project's one verdict (scene/verdict.ts), visible in every mode, discovery or not.
// One line per gate (welfare / physical) and per hard limit, kept apart and labelled apart; advisories and soft targets sit collapsed. It never edits the
// scene: a relaxation is said, not applied. Recomputed (debounced) on every store change; the verdict is memoised, so an unrelated change costs nothing.
import type { Store } from '../scene/store';
import { verdictOf, type Issue, type Verdict, type VerdictOpts } from '../scene/verdict';
import { getBrief } from './setupBrief';
import { rulesOf, type Rules } from '../scene/brief';
import { checksNote } from '../scene/rules';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const line = (i: Issue) => `<li data-tab="${i.tab}">${esc(i.text)}${i.relax ? ` <i>Smallest change: ${esc(i.relax)}.</i>` : ''}</li>`;
const group = (cls: string, title: string, xs: Issue[]) => xs.length ? `<div class="ck-${cls}"><b>${title}</b><ul>${xs.map(line).join('')}</ul></div>` : '';

/** The strip's markup for a verdict (pure, so a test can read it). Empty string = nothing to say. */
export function checksHtml(v: Verdict, rules: Rules = 'guided'): string {
  const rest = v.targets.length + v.advisories.length;
  const info = v.gates.length + v.hard.length + rest && checksNote(rules) ? `<p class="ck-info">${esc(checksNote(rules))}</p>` : '';
  return info + group('gates', 'Welfare and physical limits', v.gates) + group('hard', 'Your limits', v.hard)
    + (rest ? `<details class="ck-more"><summary>${rest} more note${rest === 1 ? '' : 's'}</summary>${group('targets', 'Preferences not met', v.targets)}${group('adv', 'Advice', v.advisories)}</details>` : '');
}

/** The one-line summary: what the collapsed strip says on a phone. */
export const headline = (v: Verdict, rules: Rules = 'guided'): string => rules === 'sandbox' && v.gates.length + v.hard.length ? `Sandbox · ${v.gates.length + v.hard.length} note${v.gates.length + v.hard.length === 1 ? '' : 's'}, information only` : [v.gates.length && `${v.gates.length} welfare / physical`, v.hard.length && `${v.hard.length} over your limits`].filter(Boolean).join(' · ') || 'Checks: notes only';

/** @param opts the cost totals / limits when the cost panel has them (budget and time checks need them; welfare and room do not). */
export function attachChecksStrip(store: Store, opts: () => VerdictOpts = () => ({})) {
  const box = document.createElement('div');
  box.className = 'checks'; box.setAttribute('role', 'status'); box.hidden = true;
  (document.getElementById('view') ?? document.body).append(box);
  let open = false;   // FX1: a one-line pill everywhere (it covered the panel, Compare cards and door handles when open); a tap opens it upward
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = () => {
    timer = undefined;
    let html = '', head = '';
    try { const v = verdictOf(store.tank, getBrief(), { units: store.scene.units, ...opts() }); html = checksHtml(v, rulesOf(getBrief())); head = headline(v, rulesOf(getBrief())); } catch { /* an unfinished scene has nothing to judge */ }
    box.innerHTML = html ? `<details class="ck-all"${open ? ' open' : ''}><summary>${esc(head)}</summary>${html}</details>` : ''; box.hidden = !html;
    box.querySelector('details')?.addEventListener('toggle', e => { open = (e.target as HTMLDetailsElement).open; });
  };
  const schedule = () => { if (!timer) timer = setTimeout(run, 400); };
  store.subscribe(kind => { if (kind !== 'view') schedule(); });
  schedule();
  return { refresh: run };
}
