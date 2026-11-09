// The Checks strip (lane DX1): a small READ-ONLY readout of the project's one verdict (scene/verdict.ts), visible in every mode, discovery or not.
// One line per gate (welfare / physical) and per hard limit, kept apart and labelled apart; advisories and soft targets sit collapsed. It never edits the
// scene: a relaxation is said, not applied. Recomputed (debounced) on every store change; the verdict is memoised, so an unrelated change costs nothing.
import type { Store } from '../scene/store';
import { verdictOf, type Issue, type Verdict, type VerdictOpts } from '../scene/verdict';
import { getBrief } from './setupBrief';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const line = (i: Issue) => `<li data-tab="${i.tab}">${esc(i.text)}${i.relax ? ` <i>Smallest change: ${esc(i.relax)}.</i>` : ''}</li>`;
const group = (cls: string, title: string, xs: Issue[]) => xs.length ? `<div class="ck-${cls}"><b>${title}</b><ul>${xs.map(line).join('')}</ul></div>` : '';

/** The strip's markup for a verdict (pure, so a test can read it). Empty string = nothing to say. */
export function checksHtml(v: Verdict): string {
  const rest = v.targets.length + v.advisories.length;
  return group('gates', 'Welfare and physical limits', v.gates) + group('hard', 'Your limits', v.hard)
    + (rest ? `<details class="ck-more"><summary>${rest} more note${rest === 1 ? '' : 's'}</summary>${group('targets', 'Preferences not met', v.targets)}${group('adv', 'Advice', v.advisories)}</details>` : '');
}

/** The one-line summary: what the collapsed strip says on a phone. */
export const headline = (v: Verdict): string => [v.gates.length && `${v.gates.length} welfare / physical`, v.hard.length && `${v.hard.length} over your limits`].filter(Boolean).join(' · ') || 'Checks: notes only';

/** @param opts the cost totals / limits when the cost panel has them (budget and time checks need them; welfare and room do not). */
export function attachChecksStrip(store: Store, opts: () => VerdictOpts = () => ({})) {
  const box = document.createElement('div');
  box.className = 'checks'; box.setAttribute('role', 'status'); box.hidden = true;
  document.body.append(box);
  const narrow = typeof matchMedia === 'function' ? matchMedia('(max-width: 900px)') : undefined;
  let open = !narrow?.matches;   // open on a desktop, a one-line pill on a phone
  narrow?.addEventListener('change', () => { open = !narrow.matches; run(); });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = () => {
    timer = undefined;
    let html = '', head = '';
    try { const v = verdictOf(store.tank, getBrief(), { units: store.scene.units, ...opts() }); html = checksHtml(v); head = headline(v); } catch { /* an unfinished scene has nothing to judge */ }
    box.innerHTML = html ? `<details class="ck-all"${open ? ' open' : ''}><summary>${esc(head)}</summary>${html}</details>` : ''; box.hidden = !html;
    box.querySelector('details')?.addEventListener('toggle', e => { open = (e.target as HTMLDetailsElement).open; });
  };
  const schedule = () => { if (!timer) timer = setTimeout(run, 400); };
  store.subscribe(kind => { if (kind !== 'view') schedule(); });
  schedule();
  return { refresh: run };
}
