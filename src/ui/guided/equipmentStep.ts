// Guided Setup Rev 03, step 2: Equipment (lane GS4). "Are you bringing anything with you?" One screen: the owned-gear sheet (ui/ownedGear.ts) with the tank as a
// size list or typed dimensions, each ticked item Required / Available (default Available, one tap to Required), a big "Starting from scratch" and "Skip for now".
// Nothing here replaces the scene (the tank on screen is left alone; the project state carries the owned tank and the pictures are drawn in it).
import { equipmentOf, setScratch } from '../../scene/project';
import { worldOf } from '../../scene/project';
import type { Store } from '../../scene/store';
import { applyOwned, emptyOwned, mountOwnedSheet } from '../ownedGear';
import { editBrief, getBrief } from '../setupBrief';
import { ONBOARD_ASK, skipEquipment } from './logic';

export interface EquipmentStepOpts { store: Store; status(m: string, bad?: boolean): void; next(): void; back(): void }
export function mountEquipmentStep(root: HTMLElement, o: EquipmentStepOpts) {
  root.innerHTML = `<h3 class="vd-ask">${ONBOARD_ASK.equipment}</h3>
<p class="gs-bigrow"><button type="button" class="gs-big" data-gs="scratch"><b>Starting from scratch</b><span>I don't own anything yet.</span></button>
<button type="button" class="gs-big" data-gs="skip"><b>Skip for now</b><span>I'll sort this out later.</span></button></p>
<p class="hint">Or tell us what you already have. It stays flexible unless you tap Required: owning something never locks it into the design.</p>
<div class="gs-sheet"></div>
<p class="vd-nav"><button type="button" data-gs="back">Back</button> <button type="button" class="primary" data-gs="next">Continue</button> <span class="hint gs-eqhint"></span></p>`;
  const box = root.querySelector<HTMLElement>('.gs-sheet')!, cont = root.querySelector<HTMLButtonElement>('[data-gs="next"]')!, hint = root.querySelector<HTMLElement>('.gs-eqhint')!;
  const paint = () => {
    const n = equipmentOf(getBrief()).items.length;
    cont.disabled = n === 0; hint.textContent = n ? '' : 'Tick something you own, or choose Starting from scratch or Skip for now.';
  };
  const land = worldOf(getBrief()) === 'terrarium';
  mountOwnedSheet(o.store, { pickTank: () => undefined, status: o.status }, box, { compactTank: true, land, onChange: paint });
  paint();
  root.addEventListener('click', e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-gs]'); if (!t) return;
    switch (t.dataset.gs) {
      case 'scratch': o.store.edit(S => applyOwned(S, emptyOwned()), { coalesce: 'owned' }); editBrief(setScratch); o.next(); break;   // gear the sheet put on the scene comes off with the answer
      case 'skip': editBrief(skipEquipment); o.next(); break;
      case 'next': o.next(); break;
      case 'back': o.back(); break;
    }
  });
  return { destroy() { root.replaceChildren(); } };
}
