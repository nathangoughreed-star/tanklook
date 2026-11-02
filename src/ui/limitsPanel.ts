// "Your limits" (lane VD5, 2026-11-02): the old Guided Limits step as a Make It Your Own panel, opened from the brief bar. Same brief data and same editors as
// before: the welcomeGuard fields (money, time, space, tank size, room, water, experience; every limit a range) plus set-up hours. Optional, never a gate.
import { rangeOf, setSetupHours, editBrief, getBrief } from './setupBrief';
import { attachWelcomeGuard } from './welcomeGuard';

export function attachLimitsPanel() {
  const dlg = document.createElement('dialog');
  dlg.className = 'libdlg limdlg'; dlg.setAttribute('aria-labelledby', 'limTitle');
  dlg.innerHTML = `<form method="dialog" class="libhead"><h2 id="limTitle">Your limits</h2><button value="close" aria-label="Close">✕</button></form>
    <p class="hint">Limits are optional and never stop you: a plan that goes over one shows a warning with a fix. Animal welfare is not a limit; it always applies.</p>
    <div class="limbox" id="limBox"></div>`;
  document.body.append(dlg);
  const box = dlg.querySelector<HTMLElement>('#limBox')!;
  let guard: HTMLElement | undefined;
  const draw = () => {
    if (!guard) { guard = document.createElement('section'); guard.className = 'welcomeGuard'; attachWelcomeGuard(guard); }
    const h = rangeOf(getBrief(), 'constraints.setupHours');
    const hours = document.createElement('label'); hours.className = 'wgRow gv-hours';
    hours.innerHTML = `<span>Set-up time you will spend (hours)</span><span class="wgMax wgBand"><input id="limHoursMin" type="number" min="0" step="1" placeholder="at least" value="${h.min ?? ''}" aria-label="Set-up hours: at least"> to <input id="limHours" type="number" min="0" step="1" placeholder="at most" value="${h.max ?? ''}" aria-label="Set-up hours: at most"></span>`;
    box.replaceChildren(guard, hours);
  };
  dlg.addEventListener('change', e => {
    const el = e.target as HTMLInputElement;
    if (el.id === 'limHours' || el.id === 'limHoursMin') { const n = el.value.trim() === '' ? undefined : parseFloat(el.value); editBrief(b => setSetupHours(b, n, el.id === 'limHours' ? 'max' : 'min')); }
  });
  return { open() { draw(); if (!dlg.open) dlg.showModal(); } };
}
