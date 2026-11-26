// SS1 (2026-11-16) / FD unit 2 (2026-11-26, R162): the landing sheet of the new UI. Shown once on a first visit and from New in the header menu.
// A headline that says the job, four doors named by situation (each with a picture), and two quiet links (bundles, saved tanks).
// Closable: Esc, the x, or "Just look around" leave the tank behind it as it is.
import type { ComponentChildren } from 'preact';
import type { Files } from './files';
import { listLib } from '../scene/library';
import { doorsFor, linksFor, markWelcomed, landingDock, HEADLINE, SUBLINE, type DoorId } from './logic/start';
import { PRODUCT_NAME } from './productName';
import plantedPic from '../examples/planted.jpg?url';
import bettaPic from '../examples/betta-bowl.jpg?url';
import iwagumiPic from '../examples/iwagumi.jpg?url';
import blankPic from './doors/blank.jpg?url';

export const ANIMAL_DOOR_EVENT = 'ui2:animaldoor';
/** "Build my own" and "I already have a tank or gear": open the Tank section on its picker. */
export const PICKER_EVENT = 'ui2:tankpicker';
type DialogC = (p: { title: string; onClose: () => void; children: ComponentChildren; wide?: boolean; dock?: boolean }) => preact.VNode;

export function StartSheet({ files, Dialog }: { files: Files; Dialog: DialogC }) {
  markWelcomed();
  const saved = listLib().length;
  const go = (id: DoorId) => {
    if (id === 'examples') { files.close(); void files.peekExample(0); }
    else if (id === 'animal') { files.close(); dispatchEvent(new Event(ANIMAL_DOOR_EVENT)); }
    else { files.freshIfLanding(); files.close(); dispatchEvent(new Event(PICKER_EVENT)); }   // 'have' and 'blank': an empty tank, then the picker
  };
  const PICS: Record<DoorId, string> = { examples: plantedPic, animal: bettaPic, have: iwagumiPic, blank: blankPic };   // four rendered pictures of the same kind
  const pic = (id: DoorId) => <img class="doorpic" src={PICS[id]} alt="" loading="lazy" />;
  return (
    <Dialog title={PRODUCT_NAME} wide dock={landingDock()} onClose={() => files.close()}>
      <h2 class="startline">{HEADLINE}</h2>
      <p class="hint startsub">{SUBLINE}</p>
      <div class="libgrid startdoors">{doorsFor().map(d => (
        <button type="button" class="card door" data-door={d.id} onClick={() => go(d.id)}>{pic(d.id)}<b class="t">{d.label}</b><span class="m">{d.hint}</span></button>))}</div>
      <div class="acts startlinks">
        {linksFor(saved).map(l => <button type="button" class="link" data-link={l.id} onClick={() => l.id === 'deals' ? files.openKits() : files.openAt('saved')}>{l.label}</button>)}
        <button type="button" class="btn ghost" onClick={() => files.close()}>Just look around</button>
      </div>
    </Dialog>
  );
}
