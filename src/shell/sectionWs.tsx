// WS3 (2026-11-17): the full-screen workspaces for Tank, Plants, Animals and Equipment. They reuse WS2's frame (live view left, catalogue right,
// "Revert this visit", stacked on a phone) and put the section's own component (its picture grids, filters, facts and add / remove, all unchanged
// and all live on the tank) in the wide catalogue pane. The side column under the view lists what is in the tank. No second shell.
import { useEffect, useMemo, useRef } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { Store } from '../scene/store';
import type { Viewer } from '../render/viewer';
import type { SectionId } from './logic/sections';
import { ideasLabel } from './logic/discover';
import { WS_META, wsSide, enterVisit, revertVisit, visitDirty, tankFraming, type Visit } from './logic/workspace';
import { Icon } from './ui';
import { WorkspaceFrame, Tray } from './workspace';

export function SectionWorkspace({ id, store, phone, onDone, onIdeas, children }: { id: SectionId; store: Store; phone: boolean; onDone: () => void; onIdeas?: () => void; children: ComponentChildren }) {
  const visit = useRef<Visit>();
  if (!visit.current) visit.current = enterVisit(store);
  const S = store.tank, meta = WS_META[id]!;
  const dirty = useMemo(() => visitDirty(store, visit.current!), [store.rev, store.mark]);
  // open framed on the tank (the camera is not part of the visit: it is a view setting, never undone)
  useEffect(() => { const f = tankFraming(store.tank.camera); if (f) store.cam(c => { Object.assign(c, f); }); }, []);
  const side = wsSide(S, id), ideas = ideasLabel(id);
  const sidebody = (
    <div class="wsside-in">
      {side.lines.length ? <div class="wsfacts card" aria-label="In this tank">{side.lines.map(([k, v]) => <div class="drow"><span>{k}</span><b>{v}</b></div>)}</div>
        : <Tray sub={side.sub} chips={side.chips} empty={side.empty} onPick={sp => { if (id === 'animals') { const f = S.fish.find(x => x.species === sp); if (f) store.select(f.id); } else { const it = S.items.find(x => x.variant === sp); if (it) store.selectItem(it.id); } }} />}
    </div>
  );
  return (
    <WorkspaceFrame title={meta.title} sub={meta.sub} mode="live" phone={phone} dirty={dirty} onDone={onDone} onUndoAll={() => revertVisit(store, visit.current!)}
      count={meta.count(S)} side={sidebody}
      extra={ideas && onIdeas ? <button type="button" class="btn sm ideas" title={`Ideas that change only the ${meta.title}`} onClick={onIdeas}><Icon name="ideas" /> {ideas}</button> : null}>
      <div class={`wsbody ws-${id}`}>{children}</div>
    </WorkspaceFrame>
  );
}

export type { Viewer };
