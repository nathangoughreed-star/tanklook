// UI2 shell step 9 (lane S9, 2026-11-14): Compare, the side-by-side view (screen map §2a "Viewer cluster", shot 03). Draws logic/compare.ts on the Store's own
// split (the viewer already draws two tanks side by side; ui/sideStore.ts is used as it is, see the test). Pieces: the cluster's buttons, one tab and one check
// bar per half, the "Editing A / B / Both" strip over the panel, and a drawer that shows both tanks with the differences marked.
import type { ComponentChildren } from 'preact';
import type { Store } from '../scene/store';
import { CHECKS, type CheckId, type ChecksModel } from './logic/checks';
import {
  EDIT_MODES, editModeOf, setEditMode, startCompare, endCompare, useSide, setLinked, linkedOf, linkWord, linkTitle, diffRows, sideTab, checkDiffs, checkCompare, letterOf,
} from './logic/compare';
import { DrawerBody } from './drawers';
import { Icon, Pill } from './ui';

/** The cluster's Compare buttons (slotted into view.tsx's toolbar): Compare, or, while split, Views linked + End compare. */
export function CompareButtons({ store, phone, say }: { store: Store; phone: boolean; say: (m: string) => void }) {
  if (store.scene.tanks.length < 2) return (
    <button type="button" class="btn sm" title="Two setups side by side: tank B starts as a copy of tank A" onClick={() => { if (startCompare(store)) say('Compare: tank B is a copy you can change freely. Pick which tank the panel edits at its top.'); }}><Icon name="split" /> Compare</button>
  );
  const linked = linkedOf(store);
  return (
    <>
      <button type="button" class={`btn sm${linked ? ' on' : ''}`} aria-pressed={linked} title={linkTitle(linked)} onClick={() => setLinked(store, !linked)}><Icon name="lock" /> {phone ? (linked ? 'Linked' : 'Free') : linkWord(linked)}</button>
      <button type="button" class="btn sm" title="Back to one tank: keeps the tank the panel shows (Ctrl+Z brings the other back)" onClick={() => endCompare(store)}><Icon name="x" /> {phone ? 'End' : 'End compare'}</button>
    </>
  );
}

/** "Editing  A | B | Both" at the top of the panel; replaces the old Edit tick on each view's tab. */
export function EditingBar({ store }: { store: Store }) {
  const mode = editModeOf(store.targets);
  return (
    <div class="editbar" role="group" aria-label="Which tank the panel edits">
      <span class="cap">Editing</span>
      <div class="seg">{EDIT_MODES.map(m => <button type="button" class={mode === m ? 'on' : ''} aria-pressed={mode === m} title={m === 'Both' ? 'Changes go to both tanks' : `Changes go to tank ${m} only`} onClick={() => setEditMode(store, m)}>{m}</button>)}</div>
      <span class="hint">{mode === 'Both' ? 'changes go to both tanks' : mode === 'none' ? 'pick a tank to edit' : `changes go to tank ${mode} only`}</span>
    </div>
  );
}

function SideCheckBar({ m, other, side, on, onPick }: { m: ChecksModel; other: ChecksModel; side: number; on: CheckId | null; onPick: (id: CheckId) => void }) {
  const d = checkDiffs(m, other);
  const c = (id: CheckId, body: ComponentChildren) => (
    <button type="button" class={`check${on === id ? ' on' : ''}${d[id] ? ' differs' : ''}`} aria-pressed={on === id} title={`${CHECKS.find(x => x.id === id)!.title}, tank ${letterOf(side)}${d[id] ? ': differs from the other tank' : ''}`} onClick={() => onPick(id)}>{body}{d[id] ? <i class="dmark" aria-label="differs from the other tank" /> : null}</button>
  );
  return (
    <div class="checkbar glass" role="toolbar" aria-label={`Checks, tank ${letterOf(side)}`}>
      {c('habitat', <>Habitat <Pill tone={m.habitat.pill.tone}>{m.habitat.pill.word}</Pill></>)}<div class="vsep" />
      {c('cost', m.cost ? <><b>{m.cost.setup}</b><span class="dim"> · {m.cost.monthly}</span></> : <span class="dim">No price yet</span>)}<div class="vsep" />
      {c('water', <><Icon name="drop" /> {m.water.temp} <Pill tone={m.water.pill.tone}>{m.water.pill.word}</Pill></>)}<div class="vsep" />
      {c('notes', <><Icon name="note" /> Notes <Pill tone={m.notes.tone}>{m.notes.count}</Pill></>)}
    </div>
  );
}

/** The two halves over the viewer: each a tab (letter, size, editing, N diffs with the list on hover, Use this one) and its own check bar.
 *  Phone (< 700 px): the halves stay side by side in the short view; the tabs show only the letter, and the strip below picks which side's checks show. */
export function CompareLayer({ store, models, drawer, onPick, phone, say }: { store: Store; models: ChecksModel[]; drawer: CheckId | null; onPick: (id: CheckId) => void; phone: boolean; say: (m: string) => void }) {
  const u = store.scene.units, rows = diffRows(store.scene.tanks[0], store.scene.tanks[1], u);
  return (
    <div class="cmplayer" aria-label="Compare">
      {[0, 1].map(i => {
        const t = sideTab(store.scene.tanks[i], i, u, store.isEditing(i), rows.length);
        return (
          <div class={`cmpside s${i}`}>
            <div class={`cmptab glass${t.editing ? ' editing' : ''}`}>
              <b class="letter">{t.letter}</b>
              {phone ? null : <span class="tsize">{t.size}</span>}
              {t.editing ? <span class="pill accent">editing</span> : phone ? null : <span class="dim tdes">as designed</span>}
              <span class="diffs" tabindex={0}><Pill tone={rows.length ? 'warn' : 'neutral'}>{t.diffWord}</Pill>
                {rows.length ? <div class="difflist glass" role="tooltip">{rows.map(r => <div class="drow2"><span>{r.a}</span><span class="dim">vs</span><span>{r.b}</span></div>)}</div> : null}
              </span>
              <button type="button" class="btn sm useone" title={`Keep tank ${t.letter} and drop the other one (Ctrl+Z brings it back)`} onClick={() => say(useSide(store, i))}>{phone ? 'Use' : 'Use this one'}</button>
            </div>
            {phone ? null : <div class="ov checkwrap side"><SideCheckBar m={models[i]} other={models[1 - i]} side={i} on={drawer} onPick={onPick} /></div>}
          </div>
        );
      })}
    </div>
  );
}

/** Phone: the side picker and that side's checks in the strip under the view. `side` is the tank whose checks show (and which the panel edits). */
export function CompareStrip({ store, models, side, setSide, drawer, onPick }: { store: Store; models: ChecksModel[]; side: number; setSide: (i: number) => void; drawer: CheckId | null; onPick: (id: CheckId) => void }) {
  const pickSide = (i: number) => { setSide(i); setEditMode(store, i === 0 ? 'A' : 'B'); };
  return (
    <div class="cmpstrip">
      <div class="seg" role="group" aria-label="Tank to check and edit">{[0, 1].map(i => <button type="button" class={side === i ? 'on' : ''} aria-pressed={side === i} onClick={() => pickSide(i)}>Tank {letterOf(i)}</button>)}</div>
      <SideCheckBar m={models[side]} other={models[1 - side]} side={side} on={drawer} onPick={onPick} />
    </div>
  );
}

/** The drawer while comparing: a "this check, side by side" block with the differing ones marked, then each tank's full read-only content. */
export function CompareDrawer({ id, models, onClose }: { id: CheckId; models: ChecksModel[]; onClose: () => void }) {
  const title = CHECKS.find(c => c.id === id)!.title, cc = checkCompare(models[0], models[1]);
  return (
    <aside class="drawer cmpdrawer" aria-label={`${title}, both tanks`}>
      <div class="sec-head"><h2>{title}</h2><span class="hint">both tanks</span><button type="button" class="btn icon ghost" title="Close (Esc)" aria-label="Close" onClick={onClose}><Icon name="x" /></button></div>
      <div class="sec-body">
        <div class="card cmpsum" aria-label="Differences">
          <div class="cmprow head"><span class="k">A vs B</span><span class="a">A</span><span class="b">B</span><span />
          </div>
          {cc.map(c => <div class={`cmprow${c.differs ? ' differs' : ''}${c.id === id ? ' cur' : ''}`}><span class="k">{c.title}</span><span class="a">{c.a}</span><span class="b">{c.b}</span>{c.differs ? <i class="dmark" aria-label="differs" /> : <span class="same dim">same</span>}</div>)}
        </div>
        {[0, 1].map(i => <div class="cmpcol"><h3><b class="letter">{letterOf(i)}</b> Tank {letterOf(i)}</h3><DrawerBody id={id} model={models[i]} /></div>)}
      </div>
    </aside>
  );
}
