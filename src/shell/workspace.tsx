// R111 / WS2 (2026-11-16): the shared frame of a full-screen workspace (frame A: the live view left, the catalogue right; stacked on a phone)
// and the reusable Tile. A workspace renders three grid children next to the real viewer: the bar, the side column under the view, the catalogue.
import { useEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { Icon, Pill } from './ui';
import type { Tone } from './logic/checks';

export interface FrameProps {
  title: string; sub?: string;
  /** live = edits change the tank now, with "Revert this visit"; draft = Cancel / Use this */
  mode: 'live' | 'draft';
  phone: boolean;
  /** live: anything changed since entry (Revert is off until then); draft: whether Use this is on */
  dirty: boolean;
  onDone: () => void;
  /** live: revert this visit; draft: cancel */
  onUndoAll: () => void;
  doneLabel?: string;
  /** extra buttons in the bar, before Revert (e.g. "Ideas for Hardscape") */
  extra?: ComponentChildren;
  /** under the view on a wide screen; on a phone it opens from the footer */
  side?: ComponentChildren;
  /** the phone footer's count, e.g. "3 placed" */
  count?: string;
  children: ComponentChildren;
}

export function WorkspaceFrame({ title, sub, mode, phone, dirty, onDone, onUndoAll, doneLabel, extra, side, count, children }: FrameProps) {
  const live = mode === 'live';
  const [sheet, setSheet] = useState(false), [big, setBig] = useState(false);
  // "Bigger" grows the phone's view strip: a class on the app grid, dropped on the way out
  useEffect(() => { const app = document.querySelector('.ui2app'); app?.classList.toggle('wsbigview', big); return () => app?.classList.remove('wsbigview'); }, [big]);
  const revert = <button type="button" class="btn sm ghost wsrevert" disabled={live && !dirty} title={live ? 'Undo everything since you opened this workspace, in one click' : 'Throw the draft away'} onClick={onUndoAll}>{live ? '↶ Revert this visit' : 'Cancel'}</button>;
  const done = <button type="button" class="btn primary" onClick={onDone} title="Back to the tank (Esc)">{doneLabel ?? (live ? 'Done' : 'Use this')}</button>;
  return (
    <>
      <div class="wsbar" role="toolbar" aria-label={`${title} workspace`}>
        <button type="button" class="btn icon ghost" aria-label="Back to the tank" title="Back (Esc)" onClick={onDone}><span class="wsback"><Icon name="chev" /></span></button>
        <div class="wstitle"><h2>{title}</h2>{sub && !phone ? <div class="hint">{sub}</div> : null}</div>
        <span class={`wsmode ${mode}`} role="status">{live ? <><i class="ldot" />{phone ? 'live' : 'Live: edits change your tank now'}</> : 'Draft: nothing changes until you use it'}</span>
        <span class="grow" />
        {extra}
        {phone ? null : revert}
        {done}
      </div>
      {phone ? (
        <>
          <div class="wsstrip"><button type="button" class="btn sm wsbig" aria-pressed={big} onClick={() => setBig(!big)}>{big ? 'Smaller' : 'Bigger'}</button></div>
          <section class="wscat sheet" aria-label={`${title} catalogue`}>{children}</section>
          <footer class="wsfoot">
            <button type="button" class="btn sm wscount" aria-expanded={sheet} onClick={() => setSheet(!sheet)}>{count ?? ''} {side ? (sheet ? '▾' : '▴') : ''}</button>
            <span class="grow" />{revert}{done}
          </footer>
          {sheet && side ? <div class="wssheet" role="dialog" aria-label="In this tank"><div class="wssheethead"><b>In this tank</b><button type="button" class="btn sm" onClick={() => setSheet(false)}>Close</button></div>{side}</div> : null}
        </>
      ) : (
        <>
          <aside class="wsside" aria-label="In this tank">{side}</aside>
          <section class="wscat" aria-label={`${title} catalogue`}>{children}</section>
        </>
      )}
    </>
  );
}

export interface TileProps {
  name: string; facts?: string; title?: string;
  /** the baked picture; a missing file falls back to a neutral placeholder, never a drawing */
  img?: string;
  pills?: { text: string; tone: Tone }[];
  count?: number;
  selected?: boolean;
  /** a line under the pills saying why this tile is flagged */
  why?: string;
  onClick?: () => void;
  onPointerDown?: (e: PointerEvent) => void;
  /** a tiny second action in the corner */
  corner?: ComponentChildren;
  children?: ComponentChildren;
}
/** One big catalogue tile: the picture, the name, one line of facts, effect pills, a placed-count badge. Reused by every workspace. */
export function Tile({ name, facts, title, img, pills, count, selected, why, onClick, onPointerDown, corner, children }: TileProps) {
  const [bad, setBad] = useState(false);
  const src = img ? `${import.meta.env.BASE_URL}${img}` : '';
  return (
    <div class={`wstile${selected ? ' sel' : ''}${why ? ' flagged' : ''}`} data-tile={name}>
      <button type="button" class="wsface" title={title ?? name} aria-label={`Add ${name}${count ? `, ${count} placed` : ''}`} onClick={onClick} onPointerDown={onPointerDown}>
        <span class={`wspic${src && !bad ? '' : ' none'}`}>
          {src && !bad ? <img src={src} alt="" loading="lazy" draggable={false} onError={() => setBad(true)} /> : <i class="wsph" aria-hidden="true" />}
          {count ? <b class="wscnt" aria-hidden="true">{count}</b> : null}
        </span>
        <span class="wsname">{name}</span>
        {facts ? <span class="wsfacts">{facts}</span> : null}
        {pills?.length ? <span class="wspills">{pills.map(p => <Pill tone={p.tone}>{p.text}</Pill>)}</span> : null}
        {why ? <span class="wswhy">{why}</span> : null}
      </button>
      {corner ? <span class="wscorner">{corner}</span> : null}
      {children}
    </div>
  );
}

/** "In this tank": the placed pieces as chips with counts. */
export function Tray({ title = 'In this tank', sub, chips, onPick, empty }: { title?: string; sub?: string; chips: { id: string; label: string; n: number; img?: string }[]; onPick?: (id: string) => void; empty?: string }) {
  return (
    <div class="wstray">
      <div class="wstrayh"><b>{title}</b>{sub ? <span class="hint">{sub}</span> : null}</div>
      {chips.length ? <div class="chips">{chips.map(c => <button type="button" class="chip trayc" title={`Select the first ${c.label}`} onClick={() => onPick?.(c.id)}>{c.label} <span class="dim">×{c.n}</span></button>)}</div> : <div class="hint">{empty ?? 'Nothing here yet.'}</div>}
    </div>
  );
}

export { Icon };
