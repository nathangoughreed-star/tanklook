// SS1 (2026-11-16) / FD unit 2 (2026-11-26, R162): the landing sheet of the new UI. Shown once on a first visit and from New in the header menu.
// A headline that says the job, four doors named by situation (each with a picture), and two quiet links (bundles, saved tanks).
// Closable: Esc, the x, or "Just look around" leave the tank behind it as it is.
import type { ComponentChildren } from 'preact';
import type { Files } from './files';
import { listLib } from '../scene/library';
import { doorsFor, linksFor, markWelcomed, HEADLINE, SUBLINE, type DoorId } from './logic/start';
import { PRODUCT_NAME } from './productName';
import plantedPic from '../examples/planted.jpg?url';
import bettaPic from '../examples/betta-bowl.jpg?url';

export const ANIMAL_DOOR_EVENT = 'ui2:animaldoor';
/** "Build my own" and "I already have a tank or gear": open the Tank section on its picker. */
export const PICKER_EVENT = 'ui2:tankpicker';
type DialogC = (p: { title: string; onClose: () => void; children: ComponentChildren; wide?: boolean }) => preact.VNode;

/** Hand-drawn door pictures (no library): an empty tank on a stand, and a tank with a filter and heater beside it. */
const Draw = ({ kind }: { kind: 'blank' | 'have' }) => (
  <svg class="doorpic" viewBox="0 0 160 96" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="28" y="18" width="104" height="52" rx="3" /><path d="M24 70h112M40 70v14M120 70v14" />
    {kind === 'have' ? <><rect x="102" y="24" width="8" height="34" rx="2" /><path d="M106 24v-6M44 52c8-6 14 6 22 0s14 6 22 0" /></> : <path d="M36 56h88" stroke-dasharray="2 6" />}
  </svg>
);

export function StartSheet({ files, Dialog }: { files: Files; Dialog: DialogC }) {
  markWelcomed();
  const saved = listLib().length;
  const go = (id: DoorId) => {
    if (id === 'examples') files.openExamples();
    else if (id === 'animal') { files.close(); dispatchEvent(new Event(ANIMAL_DOOR_EVENT)); }
    else { files.close(); dispatchEvent(new Event(PICKER_EVENT)); }   // 'have' and 'blank'
  };
  const pic = (id: DoorId) => id === 'examples' ? <img class="doorpic" src={plantedPic} alt="" loading="lazy" /> : id === 'animal' ? <img class="doorpic" src={bettaPic} alt="" loading="lazy" /> : <Draw kind={id} />;
  return (
    <Dialog title={PRODUCT_NAME} wide onClose={() => files.close()}>
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
