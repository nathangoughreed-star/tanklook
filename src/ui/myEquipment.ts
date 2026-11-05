// My equipment, the entries to it (lane EQ1, Nathan 2026-11-05: "a totally separate menu for existing equipment that can be accessed at any time").
// The menu itself is ui/ownedGear.ts (the one place gear in hand is entered); this file is only its two always-there doors: the toolbar button and the
// left-panel section, which shows the one-line summary and opens the menu. A door holds no control of its own.
import type { Store } from '../scene/store';
import { equipmentSummary } from './ownedGear';
import { getBrief, onBrief } from './setupBrief';

export function attachMyEquipment(store: Store, open: (item?: string) => void) {
  const host = document.getElementById('equipHost'), btn = document.getElementById('myEquip');
  btn?.addEventListener('click', () => open());
  if (!host) return { draw() {} };
  host.innerHTML = '<p class="hint" id="equipLine"></p><button type="button" id="equipOpen" class="primary">Open My equipment…</button>';
  const line = host.querySelector<HTMLElement>('#equipLine')!;
  host.querySelector<HTMLButtonElement>('#equipOpen')!.onclick = () => open();
  const draw = () => { line.textContent = equipmentSummary(getBrief(), store.tank); };
  onBrief(draw);
  let tick: ReturnType<typeof setTimeout> | undefined; // the scene's owned light / heater / filter count too; coalesce the redraws
  store.subscribe(kind => { if (kind !== 'view' && !tick) tick = setTimeout(() => { tick = undefined; draw(); }, 300); });
  draw();
  return { draw };
}
