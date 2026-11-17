// SS1 (2026-11-16): the Start sheet of the new UI. Shown once on a first visit and from New in the header menu; doors
// (Blank tank, Example tanks, Bundles and sales, From an animal I want, Open a saved tank). Closable: Esc, the x, or "Just look around" leave the empty tank.
import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { Files } from './files';
import { listLib } from '../scene/library';
import { doorsFor, blankKinds, markWelcomed } from './logic/start';

export const ANIMAL_DOOR_EVENT = 'ui2:animaldoor';
type DialogC = (p: { title: string; onClose: () => void; children: ComponentChildren; wide?: boolean }) => preact.VNode;

export function StartSheet({ files, Dialog }: { files: Files; Dialog: DialogC }) {
  const [blank, setBlank] = useState(false);
  const doors = doorsFor(listLib().length);
  markWelcomed();
  const go = (id: string) => {
    if (id === 'blank') { setBlank(true); return; }
    if (id === 'examples') files.openExamples();
    else if (id === 'deals') files.openKits();
    else if (id === 'open') files.openAt('saved');
    else if (id === 'animal') { files.close(); dispatchEvent(new Event(ANIMAL_DOOR_EVENT)); }
  };
  return (
    <Dialog title="Start a tank" wide onClose={() => files.close()}>
      {blank ? <>
        <p class="hint">What are you building? A first direction only: you can change it in the Tank section.</p>
        <div class="libgrid startdoors">{blankKinds().map(k => (
          <button type="button" class="card door" onClick={() => files.newTank(k.kind)}><b class="t">{k.label}</b><span class="m">{k.tip}</span></button>))}</div>
        <div class="acts"><button type="button" class="btn ghost" onClick={() => setBlank(false)}>Back</button></div>
      </> : <>
        <div class="libgrid startdoors">{doors.map(d => (
          <button type="button" class="card door" data-door={d.id} onClick={() => go(d.id)}><b class="t">{d.label}</b><span class="m">{d.hint}</span></button>))}</div>
        <div class="acts"><button type="button" class="btn ghost" onClick={() => files.close()}>Just look around</button></div>
      </>}
    </Dialog>
  );
}
