// "Your limits" (lane VD5, 2026-11-02; DX7 2026-11-09: now INLINE in the Constraints menu, no dialog; `open()` opens that menu). Same brief data and same editors as
// before: the welcomeGuard fields (money, time, space, tank size, room, water, experience; every limit a range) plus set-up hours. Optional, never a gate.
import { rangeOf, setSetupHours, editBrief, getBrief } from './setupBrief';
import { attachWelcomeGuard } from './welcomeGuard';
import { applyRetainedFix, feasibilityNow, retainedHtml } from './briefFeasibility';
import { onBrief } from './setupBrief';

/** The limits editors, in the Constraints menu's `#limitsHost`. `openMenu` opens the Constraints section (what every "Edit in Your limits" button does). */
export function attachLimitsPanel(host: HTMLElement, openMenu: () => void) {
  host.classList.add('limdlg'); host.innerHTML = `<p class="hint">Limits are optional and never stop you: a plan that goes over one shows a warning with a fix. Animal welfare is not a limit; it always applies.</p>
    <div class="limbox" id="limBox"></div><div class="limkeep" id="limKeep" aria-live="polite"></div>`;
  const box = host.querySelector<HTMLElement>('#limBox')!, keepBox = host.querySelector<HTMLElement>('#limKeep')!;
  // lane GS6: a limit that makes an earlier choice stop working never removes it: the choice stays, with the reason and the adjustments on offer
  let keep = feasibilityNow(getBrief());
  const drawKeep = () => { keep = feasibilityNow(getBrief()); keepBox.innerHTML = retainedHtml(keep, s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)); };
  keepBox.addEventListener('click', e => { const t = (e.target as HTMLElement).closest<HTMLElement>('[data-keepfix]'); if (!t) return; const n = applyRetainedFix(getBrief(), keep, t.dataset.keepfix!); if (n) editBrief(() => n); });
  const guard = document.createElement('section'); guard.className = 'welcomeGuard'; attachWelcomeGuard(guard);
  const draw = () => {
    const h = rangeOf(getBrief(), 'constraints.setupHours');
    const hours = document.createElement('label'); hours.className = 'wgRow gv-hours';
    hours.innerHTML = `<span>Set-up time you will spend (hours)</span><span class="wgMax wgBand"><input id="limHoursMin" type="number" min="0" step="1" placeholder="at least" value="${h.min ?? ''}" aria-label="Set-up hours: at least"> to <input id="limHours" type="number" min="0" step="1" placeholder="at most" value="${h.max ?? ''}" aria-label="Set-up hours: at most"></span>`;
    box.replaceChildren(guard, hours); drawKeep();
  };
  host.addEventListener('change', e => {
    const el = e.target as HTMLInputElement;
    if (el.id === 'limHours' || el.id === 'limHoursMin') { const n = el.value.trim() === '' ? undefined : parseFloat(el.value); editBrief(b => setSetupHours(b, n, el.id === 'limHours' ? 'max' : 'min')); }
  });
  onBrief(() => { if (!host.contains(document.activeElement)) draw(); else drawKeep(); });
  draw();
  return { open() { openMenu(); host.scrollIntoView?.({ block: 'start' }); } };
}
