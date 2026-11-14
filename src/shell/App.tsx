// UI2 shell step 1 (lane S1, 2026-11-13): header, rail, panel host, the existing viewer, the view cluster, the check bar and
// the right drawer (screen map §2a, §5, §6). Every later shell step adds a section body or a drawer to this frame.
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Store } from '../scene/store';
import type { TankSetup } from '../scene/types';
import { loadLibrary } from '../scene/customTanks';
import { TankSection, TankPicker, type MakerHow } from './tank';
import { Maker, type MakerInit } from './maker';
import { startSpec, specOfEntry } from './logic/tank';
import type { UserProfile } from '../demand';
import { checksModel, CHECKS, type CheckId, type ChecksModel } from './logic/checks';
import { SECTIONS, PHONE_TABS, MORE, COMES_IN, sectionOf, railClick, escape, type SectionId } from './logic/sections';
import type { Viewer } from '../render/viewer';
import { Drawer } from './drawers';
import { ViewCluster } from './view';
import { SettingsSection } from './settings';
import { PrintSection, PrintPaper } from './print';
import { Icon, Pill } from './ui';
import { ProjectName, FileMenu, FileLayer, type Files } from './files';

export interface AppProps {
  store: Store;
  /** the viewer's host (canvas inside), built once by boot.ts and moved into the view area */
  viewHost: HTMLElement;
  profile: () => UserProfile;
  save: () => void;
  /** the viewer's view-only preview (picker rows, the maker's scratch tank); null = the scene itself */
  preview: (S: TankSetup | null) => void;
  /** the file menu's controller (files.tsx), built by boot.tsx */
  files: Files;
  /** the viewer (built after the first render, so read on demand) */
  viewer: () => Viewer | undefined;
}

/** Re-render on every store change; `slow` (the engines) only once the scene settles, as the old cost panel does. */
function useStore(store: Store) {
  const [, setN] = useState(0);
  const [slowN, setSlowN] = useState(0);
  useEffect(() => {
    let t = 0;
    const off = store.subscribe(kind => {
      setN(n => n + 1);
      if (kind === 'view' || kind === 'select') return;
      clearTimeout(t); t = window.setTimeout(() => setSlowN(n => n + 1), 150);
    });
    return () => { off(); clearTimeout(t); };
  }, [store]);
  return slowN;
}

const PHONE = '(max-width: 699px)';
function usePhone() {
  const [m, setM] = useState(() => matchMedia(PHONE).matches);
  useEffect(() => { const q = matchMedia(PHONE), f = () => setM(q.matches); q.addEventListener('change', f); return () => q.removeEventListener('change', f); }, []);
  return m;
}

function Header({ store, files, saved, phone }: { store: Store; files: Files; saved: boolean; phone: boolean }) {
  return (
    <header class="apphead">
      {phone ? null : <span class="brand">TankLook</span>}
      <ProjectName store={store} files={files} saved={saved} phone={phone} />
      <span class="grow" />
      <button type="button" class="btn icon ghost" title="Undo (Ctrl+Z)" aria-label="Undo" disabled={!store.canUndo} onClick={() => store.undo()}><Icon name="undo" /></button>
      <button type="button" class="btn icon ghost" title="Redo (Ctrl+Y)" aria-label="Redo" disabled={!store.canRedo} onClick={() => store.redo()}><Icon name="redo" /></button>
      <button type="button" class="btn sm" title="Save in this browser (Ctrl+S)" onClick={() => files.save()}><Icon name="save" />{phone ? null : ' Save'}</button>
      <FileMenu files={files} />
    </header>
  );
}

function Rail({ open, onPick }: { open: SectionId | null; onPick: (id: SectionId) => void }) {
  const btn = (id: SectionId) => { const s = sectionOf(id); return (
    <button type="button" class={`ritem${open === id ? ' on' : ''}`} aria-pressed={open === id} title={open === id ? `Fold the ${s.title} panel` : s.title} onClick={() => onPick(id)}>
      <span class="ic"><Icon name={s.icon} /></span>{s.title}
    </button>
  ); };
  return (
    <nav class="rail" aria-label="Sections">
      {SECTIONS.filter(s => !s.bottom).map(s => <>{s.gap ? <div class="rsep" /> : null}{btn(s.id)}</>)}
      <div class="sp" />
      {SECTIONS.filter(s => s.bottom).map(s => btn(s.id))}
    </nav>
  );
}

function TabBar({ open, onPick }: { open: SectionId | 'more' | null; onPick: (id: SectionId | 'more') => void }) {
  return (
    <nav class="tabbar" aria-label="Sections">
      {PHONE_TABS.map(id => { const s = sectionOf(id); return <button type="button" class={open === id ? 'on' : ''} onClick={() => onPick(id)}><Icon name={s.icon} />{s.title}</button>; })}
      <button type="button" class={open === 'more' || (open && MORE.includes(open as SectionId)) ? 'on' : ''} onClick={() => onPick('more')}><Icon name="more" />More</button>
    </nav>
  );
}

interface TankHost { store: Store; picker: boolean; setPicker: (on: boolean) => void; maker: (h: MakerHow) => void; preview: (S: TankSetup | null) => void; libN: number }
interface S8Host { store: Store; profile: () => UserProfile; getViewer: () => Viewer | undefined; phone: boolean }
function Panel({ id, more, onPick, onClose, tank, s8 }: { id: SectionId | null; more: boolean; onPick: (id: SectionId) => void; onClose: () => void; tank: TankHost; s8: S8Host }) {
  if (more) return (
    <section class="panel" aria-label="More sections">
      <div class="sec-head"><h2>More</h2><button type="button" class="btn icon ghost" aria-label="Close" onClick={onClose}><Icon name="x" /></button></div>
      <div class="sec-body">{MORE.map(m => { const s = sectionOf(m); return <button type="button" class="card media morerow" onClick={() => onPick(m)}><span class="ic"><Icon name={s.icon} /></span><span class="t">{s.title}</span><Icon name="chev" /></button>; })}</div>
    </section>
  );
  if (!id) return null;
  const s = sectionOf(id);
  if (id === 'tank' && tank.picker) return <TankPicker store={tank.store} preview={tank.preview} onClose={() => tank.setPicker(false)} onMaker={tank.maker} libN={tank.libN} />;
  if (id === 'tank') return (
    <section class="panel" aria-label="Tank">
      <div class="sec-head"><h2>Tank</h2><button type="button" class="btn icon ghost" title="Fold the panel (Esc)" aria-label="Fold the panel" onClick={onClose}><Icon name="x" /></button></div>
      <div class="sec-body"><TankSection store={tank.store} onPicker={() => tank.setPicker(true)} onMaker={tank.maker} libN={tank.libN} /></div>
    </section>
  );
  if (id === 'print' || id === 'settings') return (
    <section class={`panel${id === 'print' ? ' printpanel' : ''}`} aria-label={s.title}>
      <div class="sec-head"><h2>{s.title}</h2>{id === 'print' ? <span class="hint printsub">one page builder, three presets</span> : null}<button type="button" class="btn icon ghost" title="Fold the panel (Esc)" aria-label="Fold the panel" onClick={onClose}><Icon name="x" /></button></div>
      <div class="sec-body">{id === 'print' ? <PrintSection {...s8} /> : <SettingsSection store={s8.store} getViewer={s8.getViewer} />}</div>
    </section>
  );
  return (
    <section class="panel" aria-label={s.title}>
      <div class="sec-head"><h2>{s.title}</h2><button type="button" class="btn icon ghost" title="Fold the panel (Esc)" aria-label="Fold the panel" onClick={onClose}><Icon name="x" /></button></div>
      <div class="sec-body"><div class="empty"><Icon name={s.icon} /><div>{s.title} moves here in shell step {COMES_IN[id]}.</div><div class="hint">Until then the current app (without <code>?ui=2</code>) has it.</div></div></div>
    </section>
  );
}

function CheckBar({ m, on, onPick }: { m: ChecksModel; on: CheckId | null; onPick: (id: CheckId) => void }) {
  const c = (id: CheckId, body: ComponentChildren) => (
    <button type="button" class={`check${on === id ? ' on' : ''}`} aria-pressed={on === id} title={CHECKS.find(x => x.id === id)!.title} onClick={() => onPick(id)}>{body}</button>
  );
  return (
    <div class="ov checkwrap"><div class="checkbar glass" role="toolbar" aria-label="Checks">
      {c('habitat', <>Habitat <Pill tone={m.habitat.pill.tone}>{m.habitat.pill.word}</Pill></>)}<div class="vsep" />
      {c('cost', m.cost ? <><b>{m.cost.setup}</b><span class="dim"> · {m.cost.monthly} · {m.cost.minutes}</span></> : <span class="dim">No price yet</span>)}<div class="vsep" />
      {c('water', <><Icon name="drop" /> {m.water.temp} <Pill tone={m.water.pill.tone}>{m.water.pill.word}</Pill></>)}<div class="vsep" />
      {c('notes', <><Icon name="note" /> Notes <Pill tone={m.notes.tone}>{m.notes.count}</Pill></>)}
    </div></div>
  );
}

export function App({ store, viewHost, profile, save, preview, files, viewer }: AppProps) {
  const slow = useStore(store);
  const phone = usePhone();
  const [section, setSection] = useState<SectionId | null>(phone ? null : 'tank');
  const [more, setMore] = useState(false);
  const [drawer, setDrawer] = useState<CheckId | null>(null);
  const [saved, setSaved] = useState(true);
  const [picker, setPicker] = useState(false);
  const [maker, setMaker] = useState<MakerInit | null>(null);
  const [libN, setLibN] = useState(0);
  const openMaker = (h: MakerHow) => {
    const lib = loadLibrary();
    if (h.how === 'lib') { const e = lib.find(x => x.id === h.id); if (e) setMaker({ spec: specOfEntry(e), libId: e.id }); }
    else setMaker(startSpec(store.tank, h.how, lib));
  };
  const viewRef = useRef<HTMLElement>(null);
  const model = useMemo(() => checksModel(store.tank, store.scene.active, store.scene.units, profile()), [slow, store]);

  useEffect(() => { if (!maker) viewRef.current?.prepend(viewHost); }, [viewHost, maker]);
  // the saved dot: off from an edit until its autosave (boot.ts) lands
  useEffect(() => store.subscribe(kind => { if (kind !== 'select') setSaved(false); }), [store]);
  useEffect(() => { const f = () => setSaved(true); addEventListener('ui2:saved', f); return () => removeEventListener('ui2:saved', f); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest?.('input, textarea, select');
      if (maker) return; // the maker handles its own Esc (Cancel)
      if (e.key === 'Escape' && picker && section === 'tank') { setPicker(false); return; }
      if (e.key === 'Escape') { const n = escape({ drawer, section }); setDrawer(n.drawer as CheckId | null); setSection(n.section); setMore(false); return; }
      if (typing || !(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); store.undo(); } else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); store.redo(); } else if (k === 's') { e.preventDefault(); files.save(); }
    };
    addEventListener('keydown', onKey); return () => removeEventListener('keydown', onKey);
  }, [drawer, section, store, files, maker, picker]);

  const pick = (id: SectionId) => { setMore(false); setPicker(false); setSection(railClick(section, id)); if (phone) setDrawer(null); };
  const tab = (id: SectionId | 'more') => { if (id === 'more') { setSection(null); setMore(!more); setDrawer(null); } else pick(id); };
  const check = (id: CheckId) => { setDrawer(drawer === id ? null : id); if (phone) { setSection(null); setMore(false); } };
  const panelOpen = !!section || more;
  const cls = ['ui2app', panelOpen ? 'panel-on' : 'panel-off', drawer ? 'drawer-on' : '', phone ? 'phone' : ''].filter(Boolean).join(' ');

  return (
    <div class={cls}>
      <Header store={store} files={files} saved={saved} phone={phone} />
      {phone ? null : <Rail open={section} onPick={pick} />}
      <Panel id={section} more={more} onPick={pick} onClose={() => { setSection(null); setMore(false); setPicker(false); }} tank={{ store, picker, setPicker, maker: openMaker, preview, libN }} s8={{ store, profile, getViewer: viewer, phone }} />
      <main class="viewer" ref={viewRef}>
        {section === 'print' && !phone ? <PrintPaper store={store} profile={profile} getViewer={viewer} /> : null}
        <ViewCluster store={store} getViewer={viewer} phone={phone} />
        {phone ? null : <CheckBar m={model} on={drawer} onPick={check} />}
      </main>
      {phone ? <div class="checkstrip"><CheckBar m={model} on={drawer} onPick={check} /></div> : null}
      {drawer ? <Drawer id={drawer} model={model} onClose={() => setDrawer(null)} /> : null}
      {phone ? <TabBar open={more ? 'more' : section} onPick={tab} /> : null}
      <FileLayer store={store} files={files} />
      {maker ? <Maker store={store} init={maker} viewHost={viewHost} preview={preview} onEnd={() => { setMaker(null); setLibN(n => n + 1); }} /> : null}
    </div>
  );
}
