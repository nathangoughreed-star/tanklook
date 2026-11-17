// UI2 shell step 10 (lane S10): the Get started card (screen map 1a; decision 4 replaces the Guided flow). Five ticks read from the design; each opens the real
// section. Shown over the viewer on a new tank; the × hides it for this tank only; the ⋯ menu brings it back. A phone shows it as one line that opens.
import { useEffect, useState } from 'preact/hooks';
import type { TankSetup } from '../scene/types';
import { checklistOf, showChecklist, isNewTank, hideChecklist, hideState, subscribeHide } from './logic/checklist';
import type { SectionId } from './logic/sections';
import { Icon } from './ui';

export function GetStarted({ tank, open, onOpen, onAnimal, phone: _phone }: { tank: TankSetup; open: SectionId | null; onOpen: (s: SectionId) => void; onAnimal: () => void; phone: boolean }) {
  const [, bump] = useState(0);
  useEffect(() => subscribeHide(() => bump(n => n + 1)), []);
  const { hidden: off, forced, epoch } = hideState();
  const [folded, setFolded] = useState(true);   // WS3: starts as a one-line pill docked at the bottom-left, out of the tank; a click opens the five steps upward
  const [started, setStarted] = useState(() => isNewTank(tank));
  const isNew = isNewTank(tank);
  useEffect(() => { setStarted(isNewTank(tank)); }, [epoch]);   // another project opened: it starts over
  useEffect(() => { if (isNew) setStarted(true); }, [isNew]);   // a New project (or an emptied tank) brings it back; placing a piece does not take it away
  if (!showChecklist(tank, off, started, forced)) return null;
  const c = checklistOf(tank);
  return (
    <div class={`ov getstarted glass${folded ? ' folded' : ''}`} role="region" aria-label="Get started">
      <div class="gshead">
        <button type="button" class="gstitle" aria-expanded={!folded} onClick={() => setFolded(!folded)}><b>Get started</b><span class="dim"> · {c.done} of {c.steps.length}</span></button>
        <button type="button" class="btn icon ghost" title="Hide for this tank (bring it back from the ⋯ menu)" aria-label="Hide Get started" onClick={hideChecklist}><Icon name="x" /></button>
      </div>
      {folded ? null : <>
        <ol class="gslist">{c.steps.map(s => (
          <li class={s.done ? 'done' : ''}><button type="button" class={open === s.section ? 'on' : ''} onClick={() => onOpen(s.section)}>
            <span class="tick" aria-hidden="true">{s.done ? '✓' : null}</span>
            <span class="gst"><b>{s.label}</b><span class="dim">{s.hint}</span></span><span class="sr">{s.done ? 'done' : 'to do'}</span></button></li>))}</ol>
        <button type="button" class="link gsanimal" onClick={onAnimal}>Or start from an animal I want</button>
      </>}
    </div>
  );
}
