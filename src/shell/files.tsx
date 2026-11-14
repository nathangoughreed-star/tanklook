// UI2 shell step 2 (lane S2, 2026-11-13): the header's project name, Save and `...` file menu, and the windows behind them
// (Open, Save as, the "replace your project?" question, a status toast). Every rule is P7's (src/ui/logic/files.ts); the
// view-models are logic/files.ts. `createFiles` is the controller boot.tsx builds (it needs the viewer for thumbnails).
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Store } from '../scene/store';
import type { Scene } from '../scene/types';
import { listLib } from '../scene/library';
import { readShare, shareUrl } from '../scene/share';
import { parseScene } from '../scene/validate';
import { EXAMPLES, examplesInScope, exampleScenes } from '../examples';
import { setProjectAsker, confirmStart, startProject } from '../ui/projectStart';
import * as P7 from '../ui/logic/files';
import { FILE_MENU, EMPTY_LIBRARY, newProject, libraryRows, savedLine, saveAsView, hashOf, type FileAction } from './logic/files';
import { Icon } from './ui';

export interface Ask { title: string; text: string; actions: { label: string; value: string; primary?: boolean; danger?: boolean }[]; resolve: (v: string) => void }
export interface FState { dlg: 'open' | 'saveas' | null; ask: Ask | null; toast: { text: string; bad: boolean } | null; n: number }
export interface Files {
  get(): FState; sub(fn: () => void): () => void;
  say(text: string, bad?: boolean): void; close(): void; dismissToast(): void;
  run(a: FileAction): void; save(): void;
  rename(v: string): void;
  openSaved(id: string): Promise<void>; deleteSaved(id: string): void; openExample(id: string): Promise<void>;
  openFile(file: File): Promise<void>; openShared(hash: string): Promise<void>;
  saveAs(typed: string, how: 'browser' | 'file' | 'link'): Promise<void>; downloadTank(i: number): void;
}

/** The controller: one small state object the components redraw from; every action goes through P7 and the project-start guard. */
export function createFiles(store: Store, thumb: () => string, afterReplace: () => void = () => {}): Files {
  let st: FState = { dlg: null, ask: null, toast: null, n: 0 }, tt = 0;
  const subs = new Set<() => void>();
  const set = (p: Partial<FState>) => { st = { ...st, ...p, n: st.n + 1 }; subs.forEach(f => f()); };
  const say = (text: string, bad = false) => { set({ toast: { text, bad } }); clearTimeout(tt); tt = window.setTimeout(() => set({ toast: null }), bad ? 9000 : 6000); };
  const ask = (a: Omit<Ask, 'resolve'>) => new Promise<string>(res => set({ ask: { ...a, resolve: v => { set({ ask: null }); res(v); } } }));
  const doSave = async (): Promise<boolean> => {
    const g = store.scene, plan = P7.planSave(g);
    if (plan.kind === 'replace' && await ask({ title: 'Replace the saved tank?', text: P7.replaceQuestion(g.name, plan.existing!.saved), actions: [{ label: 'Cancel', value: 'no' }, { label: 'Replace', value: 'yes', primary: true, danger: true }] }) !== 'yes') return false;
    let t = ''; try { t = thumb(); } catch { /* no picture: still save the tank */ }
    const r = P7.saveHere(g, t);
    say(r.message, !r.ok); dispatchEvent(new Event('ui2:saved')); // redraws the header's saved line
    return r.ok;
  };
  // "replace your project?" (DX5): Save a copy first / Replace / Cancel; true = go ahead
  setProjectAsker(async () => {
    const v = await ask({ title: 'Replace your project?', text: 'This tank has changes (or locks) that are not saved. Opening something else replaces it. Undo brings it back until you reload.',
      actions: [{ label: 'Cancel', value: 'cancel' }, { label: 'Replace', value: 'replace', danger: true }, { label: 'Save a copy, then continue', value: 'save', primary: true }] });
    if (v === 'save') { await doSave(); return P7.isSavedAsIs(store.scene); }
    return v === 'replace';
  });
  const replaced = () => { set({ dlg: null }); afterReplace(); };
  const download = (scene: Scene) => {
    const f = P7.sceneFile(scene), a = document.createElement('a'), url = URL.createObjectURL(new Blob([f.text], { type: 'application/json' }));
    a.href = url; a.download = f.filename; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  const copy = async (made: Promise<string>): Promise<boolean> => {
    try { await navigator.clipboard.write([new ClipboardItem({ 'text/plain': made.then(t => new Blob([t], { type: 'text/plain' })) })]); return true; } catch { /* try the older ways */ }
    const t = await made.catch(() => ''); if (!t) return false;
    try { await navigator.clipboard.writeText(t); return true; } catch { return false; }
  };
  const share = async () => {
    const made = shareUrl(store.scene, P7.shareBase(location.protocol, location.href)), copied = copy(made);
    let url: string; try { url = await made; } catch { say(P7.SHARE_UNSUPPORTED, true); return; }
    if (!await copied) { prompt('Copy this link:', url); return; }
    say(P7.shareCopiedMessage(store.scene, url.length));
  };
  const f: Files = {
    get: () => st, sub: fn => { subs.add(fn); return () => { subs.delete(fn); }; },
    say, close: () => set({ dlg: null }), dismissToast: () => set({ toast: null }),
    run(a) {
      if (a === 'new') void (async () => { if (await startProject(store, newProject(store.scene.units, 'freshwater', store.tank.camera), P7.savedText())) { P7.setLibId(null); say('New project. Undo brings the previous one back.'); afterReplace(); } })();
      else if (a === 'open') set({ dlg: 'open' });
      else if (a === 'saveas') set({ dlg: 'saveas' });
      else if (a === 'share') void share();
      else download(store.scene);
    },
    save: () => { void doSave(); },
    rename(v) { const n = P7.sceneNameOf(v); if (n !== store.scene.name) store.update(s => { s.name = n; }); },
    async openSaved(id) {
      if (!await confirmStart(store.scene, P7.savedText())) return;
      const o = P7.openSaved(id);
      if (!o.scene) { say(o.message, true); return; }
      try { store.replace(o.scene); } catch { say('Could not open that tank.', true); return; }
      P7.setLibId(id); say(o.message, o.bad); replaced();
    },
    deleteSaved(id) { P7.deleteSaved(id); set({}); },
    async openExample(id) {
      const x = EXAMPLES.find(q => q.id === id); if (!x) return;
      let text: string; try { text = (await exampleScenes())[id]; } catch { say('Could not load the examples (no connection?). Try again in a moment.', true); return; }
      if (!await confirmStart(store.scene, P7.savedText())) return;
      try { const { scene } = parseScene(text); store.replace(scene); P7.setLibId(null); say(P7.exampleMessage(scene.name)); replaced(); } catch { say('Could not open that example.', true); }
    },
    async openFile(file) {
      if (P7.tooLarge(file.size)) { say(P7.TOO_LARGE_MESSAGE, true); return; }
      const parsed = P7.parseOpened(await file.text());
      if (P7.isFail(parsed)) { say(parsed.message, true); return; }
      if (!await confirmStart(store.scene, P7.savedText())) return;
      try { store.replace(parsed.scene); } catch { say('Could not open that file.', true); return; }
      const { note } = P7.addOpenedToLibrary(store.scene, thumb); // an opened file goes straight into the saved list
      say(P7.openedFileMessage(parsed.scene.name, note, parsed.warnings), parsed.warnings.length > 0); replaced();
    },
    async openShared(hash) {
      let parsed: Awaited<ReturnType<typeof readShare>>; try { parsed = await readShare(hash); } catch (e) { say(P7.shareFailMessage(e), true); return; }
      if (!await confirmStart(store.scene, P7.savedText())) return;
      try { store.replace(parsed.scene); } catch { say('Could not open that share link.', true); return; }
      P7.setLibId(null); say(P7.sharedMessage(parsed.scene.name, parsed.warnings), parsed.warnings.length > 0); replaced();
    },
    async saveAs(typed, how) {
      const v = saveAsView(typed, store.scene);
      if (v.rename) { store.update(s => { s.name = v.rename!; }); if (how === 'browser') P7.setLibId(null); } // a new name is a new entry
      set({ dlg: null });
      if (how === 'browser') await doSave(); else if (how === 'file') download(store.scene); else await share();
    },
    downloadTank(i) { const one = P7.singleTank(store.scene, i); if (!one) return; download(one.scene); say(one.message); },
  };
  return f;
}

export function useFiles(files: Files): FState {
  const [, n] = useState(0);
  useEffect(() => files.sub(() => n(x => x + 1)), [files]);
  return files.get();
}

/** The project name (click to rename), the saved dot, and the `...` menu; `Save` itself stays in the header next to it. */
export function ProjectName({ store, files, saved, phone }: { store: Store; files: Files; saved: boolean; phone: boolean }) {
  const [edit, setEdit] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (edit) { ref.current?.focus(); ref.current?.select(); } }, [edit]);
  const done = (commit: boolean) => { if (commit && ref.current) files.rename(ref.current.value); setEdit(false); };
  const line = savedLine(store.scene, saved);
  return (
    <span class="proj" title={store.scene.name}>
      {phone ? null : <span class="dim">· </span>}
      {edit
        ? <input ref={ref} class="input pnameedit" aria-label="Project name" maxLength={P7.NAME_MAX} defaultValue={store.scene.name} onBlur={() => done(true)}
            onKeyDown={e => { if (e.key === 'Enter') done(true); else if (e.key === 'Escape') { e.stopPropagation(); done(false); } }} />
        : <button type="button" class="pname pnamebtn" title="Click to rename" onClick={() => setEdit(true)}>{store.scene.name || 'Untitled'}</button>}
      <span class={`dot${saved ? '' : ' off'}`} title={line} />
    </span>
  );
}

export function FileMenu({ files }: { files: Files }) {
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    if (!menu) return;
    const off = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.menuwrap')) setMenu(false); };
    addEventListener('mousedown', off); return () => removeEventListener('mousedown', off);
  }, [menu]);
  return (
    <span class="menuwrap">
      <button type="button" class="btn icon ghost" title="New, Open, Save as, Share link, Download" aria-label="File menu" aria-expanded={menu} onClick={() => setMenu(!menu)}><Icon name="more" /></button>
      {menu ? <div class="pop menu" role="menu" onClick={() => setMenu(false)}>
        {FILE_MENU.map(m => <button type="button" class="btn ghost" role="menuitem" title={m.hint} onClick={() => files.run(m.id)}>{m.label}</button>)}
      </div> : null}
    </span>
  );
}

function Dialog({ title, onClose, children, wide }: { title: string; onClose: () => void; children: preact.ComponentChildren; wide?: boolean }) {
  return (
    <div class="scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div class={`dlg${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div class="sec-head"><h2>{title}</h2><button type="button" class="btn icon ghost" aria-label="Close" onClick={onClose}><Icon name="x" /></button></div>
        <div class="dlgbody">{children}</div>
      </div>
    </div>
  );
}

type OpenTab = 'saved' | 'examples' | 'file';
function OpenDialog({ files }: { files: Files }) {
  const [tab, setTab] = useState<OpenTab>(() => listLib().length ? 'saved' : 'examples');
  const [link, setLink] = useState('');
  const [del, setDel] = useState<string | null>(null);
  const rows = libraryRows(), fileIn = useRef<HTMLInputElement>(null);
  const tabs: [OpenTab, string][] = [['saved', `Saved tanks${rows.length ? ` (${rows.length})` : ''}`], ['examples', 'Examples'], ['file', 'File or link']];
  return (
    <Dialog title="Open" wide onClose={() => files.close()}>
      <div class="seg full" role="tablist">{tabs.map(([id, t]) => <button type="button" role="tab" aria-selected={tab === id} class={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{t}</button>)}</div>
      {tab === 'saved' ? (rows.length ? <div class="libgrid">{rows.map(r => (
        <div class={`card libcard${r.current ? ' sel' : ''}`}>
          <button type="button" class="libopen" title={`Open “${r.name}”`} onClick={() => void files.openSaved(r.id)}>
            {r.thumb ? <img src={r.thumb} alt="" loading="lazy" /> : <span class="nothumb">No picture</span>}
            <b class="t">{r.name}</b><span class="m">{r.when}{r.tanks ? ` · ${r.tanks}` : ''}{r.current ? ' · open now' : ''}</span>
          </button>
          {del === r.id
            ? <span class="acts"><button type="button" class="btn sm danger" onClick={() => { files.deleteSaved(r.id); setDel(null); }}>Delete for good</button><button type="button" class="btn sm ghost" onClick={() => setDel(null)}>Keep</button></span>
            : <button type="button" class="btn sm ghost" aria-label={`Delete ${r.name}`} title={`Delete “${r.name}” from this browser`} onClick={() => setDel(r.id)}>Delete</button>}
        </div>))}</div> : <p class="hint" data-empty="true">{EMPTY_LIBRARY}</p>) : null}
      {tab === 'examples' ? <div class="libgrid">{examplesInScope().map(x => (
        <div class="card libcard"><button type="button" class="libopen" title={x.hint} onClick={() => void files.openExample(x.id)}>
          <img src={x.thumb} alt="" loading="lazy" /><b class="t">{x.name}</b><span class="m">{x.hint}</span></button></div>))}</div> : null}
      {tab === 'file' ? <div class="filetab">
        <div class="card"><div class="t">A scene file</div><div class="m">A .json file saved with Save as… (up to 5 MB). It is also added to your saved tanks.</div>
          <input ref={fileIn} type="file" accept=".json,application/json" hidden onChange={e => { const f = (e.target as HTMLInputElement).files?.[0]; (e.target as HTMLInputElement).value = ''; if (f) void files.openFile(f); }} />
          <div><button type="button" class="btn" onClick={() => fileIn.current?.click()}>Choose a file…</button></div></div>
        <div class="card"><div class="t">A share link</div><div class="m">Paste a link someone sent you. It opens as a new, unsaved copy.</div>
          <div class="acts"><input class="input grow" aria-label="Share link" placeholder="https://tanklook.com/#tank=…" value={link} onInput={e => setLink((e.target as HTMLInputElement).value)} />
            <button type="button" class="btn" disabled={!hashOf(link)} onClick={() => { const h = hashOf(link); if (h) void files.openShared(h); }}>Open</button></div>
          {link && !hashOf(link) ? <div class="m">That does not look like a TankLook share link.</div> : null}</div>
      </div> : null}
    </Dialog>
  );
}

function SaveAsDialog({ store, files }: { store: Store; files: Files }) {
  const [typed, setTyped] = useState(store.scene.name);
  const v = saveAsView(typed, store.scene), split = store.scene.tanks.length > 1;
  return (
    <Dialog title="Save as" onClose={() => files.close()}>
      <label class="fld"><span class="m">Name</span><input class="input" aria-label="Name" maxLength={P7.NAME_MAX} value={typed} autoFocus onInput={e => setTyped((e.target as HTMLInputElement).value)}
        onKeyDown={e => { if (e.key === 'Enter') void files.saveAs(typed, 'browser'); }} /></label>
      <div class="card"><div class="t">In this browser</div><div class="m">{v.note}</div><div><button type="button" class="btn primary" onClick={() => void files.saveAs(typed, 'browser')}>Save in this browser</button></div></div>
      <div class="card"><div class="t">A file</div><div class="m">Downloads “{P7.slug(v.name)}.json” with its pictures: back it up, or send it to someone.</div>
        <div class="acts"><button type="button" class="btn" onClick={() => void files.saveAs(typed, 'file')}>Download file</button>
          {split ? ['A', 'B'].map((l, i) => <button type="button" class="btn ghost" onClick={() => { files.close(); files.downloadTank(i); }}>Tank {l} on its own</button>) : null}</div></div>
      <div class="card"><div class="t">A share link</div><div class="m">Copies a link that opens this tank as a new, unsaved copy. No server; background pictures are left out.</div>
        <div><button type="button" class="btn" onClick={() => void files.saveAs(typed, 'link')}>Copy share link</button></div></div>
    </Dialog>
  );
}

/** Mounted once in App: the open window, Save as, the replace question and the status toast. */
export function FileLayer({ store, files }: { store: Store; files: Files }) {
  const s = useFiles(files);
  useEffect(() => {
    if (!s.dlg && !s.ask) return;
    const k = (e: KeyboardEvent) => { if (e.key !== 'Escape') return; e.stopPropagation(); if (s.ask) s.ask.resolve(s.ask.actions[0].value); else files.close(); };
    addEventListener('keydown', k, true); return () => removeEventListener('keydown', k, true);
  }, [s.dlg, s.ask, files]);
  return (
    <>
      {s.dlg === 'open' ? <OpenDialog files={files} /> : null}
      {s.dlg === 'saveas' ? <SaveAsDialog store={store} files={files} /> : null}
      {s.ask ? <Dialog title={s.ask.title} onClose={() => s.ask!.resolve(s.ask!.actions[0].value)}>
        <p class="dlgtext">{s.ask.text}</p>
        <div class="acts end">{s.ask.actions.map(a => <button type="button" class={`btn${a.primary ? ' primary' : ''}${a.danger ? ' danger' : ''}`} onClick={() => s.ask!.resolve(a.value)}>{a.label}</button>)}</div>
      </Dialog> : null}
      {s.toast ? <div class={`toast fstatus${s.toast.bad ? ' bad' : ''}`} role="status"><span>{s.toast.text}</span>
        <button type="button" class="btn icon ghost" aria-label="Dismiss" onClick={() => files.dismissToast()}><Icon name="x" /></button></div> : null}
    </>
  );
}
