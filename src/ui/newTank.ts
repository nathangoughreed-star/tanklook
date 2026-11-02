// New starts new (lane NW1, Nathan 2026-11-02): New / Guided / Sandbox begin from an empty tank and an empty brief, so Guided opens at World
// and not past it because the last tank's animals are still loaded. When the current tank has something to lose and is not saved, a warning
// offers Save / Start new / Cancel first. The pure part is testable.
import type { Scene } from '../scene/types';
import { hasState } from '../scene/brief';
import { emptyScene } from '../scene/defaults';

/** True when a tank holds anything a new start would throw away: animals, pieces, a brief (vision, owned gear, limits, picks), a pinned kit, a second tank or a resized tank. */
export function hasWork(scene: Scene): boolean {
  const bare = emptyScene().tanks[0];
  return scene.tanks.length > 1 || scene.tanks.some(t =>
    t.fish.length > 0 || t.items.length > 0 || (!!t.brief && hasState(t.brief)) || !!t.product ||
    t.tank.L !== bare.tank.L || t.tank.H !== bare.tank.H || t.tank.D !== bare.tank.D);
}
/** Whether to warn: something to lose, and not already saved as it stands (`savedText` = the stored JSON of the tank this one came from). */
export function atStake(scene: Scene, savedText?: string | null): boolean {
  return hasWork(scene) && JSON.stringify(scene) !== savedText;
}

/** The warning (index.html #newDlg). `save` tries to save and says whether it did; resolves true to go ahead, false when cancelled. */
export function confirmNew(save: () => boolean): Promise<boolean> {
  const dlg = document.getElementById('newDlg') as HTMLDialogElement;
  return new Promise(done => {
    const end = (ok: boolean) => { dlg.oncancel = dlg.onclose = null; if (dlg.open) dlg.close(); done(ok); };
    document.getElementById('newSave')!.onclick = () => { if (save()) end(true); };
    document.getElementById('newGo')!.onclick = () => end(true);
    document.getElementById('newCancel')!.onclick = () => end(false);
    dlg.oncancel = () => end(false); dlg.onclose = () => end(false);
    dlg.showModal();
  });
}
