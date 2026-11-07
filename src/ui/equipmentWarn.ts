// The small warning popup for owned gear (lane EQ1, Nathan 2026-11-07): when the design stops using, or outgrows, something the person said they own (a tank
// too small for new stock, a light / filter / heater undersized or dropped), say so once, with a button to My equipment. The notes are scene/ownedFit.ts;
// a note already shown stays quiet until it clears and comes back. Never while a dialog is open (the menu itself, Guided), and never blocking.
import type { Store } from '../scene/store';
import { ownedFit, type OwnedNote } from '../scene/ownedFit';
import { getBrief } from './setupBrief';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function attachEquipmentWarn(store: Store, open: (item?: string) => void) {
  const box = document.createElement('div');
  box.className = 'eqwarn'; box.setAttribute('role', 'alert'); box.hidden = true;
  document.body.append(box);
  const shown = new Set<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const hide = () => { box.hidden = true; box.replaceChildren(); };
  const check = () => {
    timer = undefined;
    if (document.querySelector('dialog[open]')) { schedule(); return; }
    let notes: OwnedNote[] = [];
    try { notes = ownedFit(store.tank, getBrief()); } catch { /* nothing to judge yet */ }
    for (const id of [...shown]) if (!notes.some(n => n.id === id)) shown.delete(id);   // cleared: may speak again if it returns
    const fresh = notes.filter(n => !shown.has(n.id));
    if (!fresh.length) { if (!notes.length) hide(); return; }
    fresh.forEach(n => shown.add(n.id));
    box.innerHTML = `<b>Your equipment</b><ul>${notes.map(n => `<li>${esc(n.text)}</li>`).join('')}</ul><div class="btns"><button type="button" data-act="open" class="primary">Open My equipment</button><button type="button" data-act="close" aria-label="Dismiss">Dismiss</button></div>`;
    box.dataset.item = fresh[0].item; box.hidden = false;
  };
  const schedule = () => { if (!timer) timer = setTimeout(check, 1200); };
  box.onclick = e => {
    const a = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
    if (a === 'open') { hide(); open(box.dataset.item); } else if (a === 'close') hide();
  };
  store.subscribe(kind => { if (kind !== 'view') schedule(); });
  return { check };
}
