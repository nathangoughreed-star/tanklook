// UI2 shell step 10 (lane S10): the Discover section (screen map 2a "Section Discover"), the shared "Ideas for ..." header button and the
// "From an animal I want" door. Discover has MODES (Explore / Remix / Refine, Fill only the gaps, Whole tank, This or that) on the existing engines:
// ui/discover/logic createInline (breadth presets, finishSetup), ui/ab (A/B pairs). A preview is drawn in the viewer; NOTHING is written to the
// design until Apply / Keep (applyCard: one undo step; PS1). Locks are honoured by the engines.
import { render } from 'preact';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Store } from '../scene/store';
import type { Tab } from '../scene/scope';
import type { Viewer } from '../render/viewer';
import type { UserProfile } from '../demand';
import type { DiscoveryProposal } from '../scene/discover';
import { emptyBrief } from '../ui/setupBrief';
import { createInline, applyCard, TAB_LABEL, countText, type InlineController, type Preview, type RunResult } from '../ui/discover/logic';
import { conflictCardHtml } from '../ui/infeasibleCard';
import { discoverTabs } from '../scene/discoverScope';
import { createRealEngine } from '../ui/ab/real';
import { acceptPlan, metricsOf, ROLE_LABEL, roleOf } from '../ui/ab/logic';
import { searchSpecies } from '../data/species';
import { getSpecies } from '../data/species';
import { totalOf, type Pk } from '../ui/stockPlanLogic';
import { startProject } from '../ui/projectStart';
import * as P7 from '../ui/logic/files';
import type { Outcome, PairResult } from '../scene/discoveryTypes';
import { MODES, modeOf, presetOfMode, scopedStore, scopeName, gapsIn, ideasLabel, addPick, removePick, bumpPick, doorPlan, animalScene, type ModeId } from './logic/discover';
import type { SectionId } from './logic/sections';
import { Icon, Pill } from './ui';

const VERB = { add: 'Adds', remove: 'Removes', change: 'Changes' } as const;
const rowText = (r: Preview['rows'][number]) => `${VERB[r.verb]} ${r.tab === 'gear' ? '' : TAB_LABEL[r.tab as Tab].toLowerCase() + ': '}${r.text}`;
const GAP_LABEL: Record<string, string> = { hardscape: 'Hardscape', plants: 'Plants', animals: 'Animals', substrate: 'Substrate' };

export interface DiscoverProps {
  store: Store; getViewer: () => Viewer | undefined; profile: () => UserProfile;
  /** the tabs Discover is scoped to ("Ideas for Plants"), undefined = the whole design */
  scope: Tab[] | undefined; onScope: (t: Tab[] | undefined) => void;
  say: (text: string, bad?: boolean) => void; phone: boolean;
}
type Gallery = { items: Preview[]; sel: number };

export function DiscoverSection({ store, getViewer, profile, scope, onScope, say, phone }: DiscoverProps) {
  const [mode, setMode] = useState<ModeId | null>(null);
  const [busy, setBusy] = useState(false);
  const [cur, setCur] = useState<Preview | undefined>();
  const [fail, setFail] = useState<Extract<RunResult, { ok: false }> | undefined>();
  const [gal, setGal] = useState<Gallery | undefined>();
  const [note, setNote] = useState('');
  const [, bump] = useState(0);
  const scopeKey = (scope ?? []).join();
  const show = (t: Parameters<Viewer['setPreview']>[0]) => getViewer()?.setPreview(t ? structuredClone(t) : null, false);
  const ctl = useMemo<InlineController>(() => createInline(scopedStore(store, scope), {
    brief: () => store.tank.brief ?? emptyBrief(), show,
    opts: { get P() { return profile(); } } as never,
  }), [store, scopeKey]);   // eslint-disable-line react-hooks/exhaustive-deps
  const seq = useRef(0);
  const reset = () => { seq.current++; ctl.close(); setCur(undefined); setFail(undefined); setGal(undefined); setNote(''); setBusy(false); };
  // leaving the mode, the section or the scope puts the real design back in view (a preview never wrote anything)
  useEffect(() => { reset(); return () => { seq.current++; ctl.close(); }; }, [ctl]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => store.subscribe(k => { if (k === 'view' || k === 'select') return; ctl.onChange(); setCur(ctl.current()); bump(n => n + 1); }), [store, ctl]);

  const back = () => { reset(); setMode(null); };
  const pickMode = (m: ModeId) => { reset(); setMode(m); };
  const finish = (r: RunResult | undefined) => { setBusy(false); if (!r) return; if (r.ok) { setCur(r.preview); setFail(undefined); } else { setCur(undefined); setFail(r); } };
  const go = (fn: () => RunResult | undefined) => {
    const my = ++seq.current; setBusy(true); setNote(''); setFail(undefined);
    setTimeout(() => {
      let r: RunResult | undefined;
      try { r = fn(); } catch (e) { console.error(e); r = { ok: false, conflicts: ['Discover could not run on this design.'], relaxations: [] }; }
      if (my === seq.current) finish(r);
    }, 30);
  };
  const run = (m: ModeId, tab?: Tab) => {
    const p = presetOfMode(m);
    if (m === 'whole') {   // a gallery: three different complete setups, one after another (each draws on what the last did not show)
      const my = ++seq.current; setBusy(true); setNote(''); setFail(undefined); setCur(undefined); setGal(undefined); ctl.close();
      ctl.setPreset('explore');
      const items: Preview[] = []; let last: RunResult | undefined;
      const step = () => {
        if (my !== seq.current) return;
        try { last = ctl.run('regen'); } catch (e) { console.error(e); last = { ok: false, conflicts: ['Discover could not run on this design.'], relaxations: [] }; }
        if (last.ok) items.push(last.preview);
        if (last.ok && items.length < 3) { setGal({ items: [...items], sel: items.length - 1 }); setTimeout(step, 20); return; }
        setBusy(false);
        if (items.length) { setGal({ items: [...items], sel: 0 }); show(items[0].after); if (!last.ok) setNote(`Only ${items.length} setup${items.length === 1 ? '' : 's'} fit.`); }
        else if (!last.ok) setFail(last);
      };
      setTimeout(step, 30); return;
    }
    if (p) ctl.setPreset(p);
    go(() => m === 'gaps' ? ctl.run('fill', tab) : ctl.run('regen'));
  };
  const apply = (keep: boolean) => {
    const p = gal ? gal.items[gal.sel] : cur; if (!p) return;
    if (p.baseRev !== store.rev) { setNote('Your design changed: run it again before applying.'); return; }
    const r = applyCard(store, p.proposal as unknown as DiscoveryProposal, keep);
    if (!r.ok) { setNote(r.reason === 'stale' ? 'Your design changed: run it again before applying.' : 'That conflicts with something you kept.'); return; }
    reset(); say(keep ? 'Applied and kept. Undo steps back.' : 'Applied. Undo steps back.');
  };
  const again = () => { if (mode === 'whole') run('whole'); else go(() => ctl.regenerate()); };
  const showBack = (p: Preview) => { if (gal) { const i = gal.items.indexOf(p); setGal({ ...gal, sel: i }); show(p.after); } };

  const eff = scopedStore(store, scope).effTank, gaps = gapsIn(eff, scope && scope.length ? scope : undefined);
  const counts = countText(ctl.counts());
  const head = (
    <div class="dscope">
      <span class="hint">{scope ? <>Looking at <b>{scopeName(scope)}</b> only</> : <>Looking at the whole design</>} · {counts}</span>
      {scope ? <button type="button" class="btn sm ghost" onClick={() => onScope(undefined)}>Whole design</button> : null}
    </div>
  );

  if (mode === 'thisthat') return <ThisOrThat store={store} getViewer={getViewer} profile={profile} scope={scope} say={say} phone={phone} onBack={back} />;

  if (!mode) return (
    <div class="discover">
      {head}
      <div class="modes">{MODES.map(m => (
        <button type="button" class="card media mode" onClick={() => pickMode(m.id)} data-mode={m.id}>
          <span class="ic"><Icon name={m.id === 'thisthat' ? 'split' : m.id === 'whole' ? 'tank' : m.id === 'gaps' ? 'plus' : 'ideas'} /></span>
          <span class="mbody"><b class="t">{m.label}</b><span class="m">{m.hint}</span></span><Icon name="chev" />
        </button>))}</div>
      <p class="hint">Nothing changes until you press Apply.</p>
    </div>
  );

  const md = modeOf(mode), p = gal ? gal.items[gal.sel] : cur, ran = !!(cur || gal || fail);
  return (
    <div class="discover" data-mode={mode}>
      <div class="dback"><button type="button" class="btn sm ghost" onClick={back}><Icon name="chev" /> All modes</button><b>{md.label}</b></div>
      {head}
      <p class="hint">{md.hint}</p>
      {mode === 'gaps' ? (gaps.length
        ? <div class="chips" role="group" aria-label="Section to fill">{gaps.map(g => <button type="button" class="chip" disabled={busy} onClick={() => run('gaps', g as Tab)}>Fill {GAP_LABEL[g] ?? g}</button>)}</div>
        : <div class="card dnote" role="status"><b class="t">Nothing to fill</b><span class="m">{scope ? `${scopeName(scope)} already has something in it.` : 'Every section has something in it.'} Try Refine to improve what is there.</span></div>)
        : <div class="acts"><button type="button" class="btn primary" disabled={busy} onClick={() => run(mode)}>{ran ? 'Show another' : mode === 'whole' ? 'Show me three setups' : 'Show me an idea'}</button></div>}
      {mode === 'whole' && discoverTabs(eff).includes('tank') ? <p class="hint">{ctl.tankKept() ? <>The tank stays as it is. <button type="button" class="link" onClick={() => { ctl.unlockTank(); bump(n => n + 1); }}>Let Discover pick a different tank</button></> : <>Discover may pick a different tank. <button type="button" class="link" onClick={() => { ctl.keepTank(); bump(n => n + 1); }}>Keep the tank</button></>}</p> : null}
      {busy ? <p class="hint" role="status">Looking for designs that fit…</p> : null}
      {gal ? <div class="gallery" role="group" aria-label="Complete setups">{gal.items.map((g, i) => (
        <button type="button" class={`card gal${i === gal.sel ? ' sel' : ''}`} aria-pressed={i === gal.sel} onClick={() => showBack(g)}>
          <b class="t">{g.title}</b><span class="m">{g.rows.slice(0, 3).map(rowText).join(' · ') || 'No change'}</span></button>))}</div> : null}
      {p && !gal ? <div class="card preview"><b class="t">{p.title}</b>{p.stale ? <p class="hint bad" role="alert">Your design changed, so this preview is out of date. Show another.</p> : null}
        <ul>{p.rows.map(r => <li>{rowText(r)}</li>)}{p.rows.length ? null : <li>No change</li>}</ul>
        <Pill tone="neutral">{p.fit === 1 ? 'Only this one fits' : `${p.fit} designs fit`}</Pill></div> : null}
      {gal && p ? <div class="card preview"><b class="t">{p.title}</b><ul>{p.rows.map(r => <li>{rowText(r)}</li>)}{p.rows.length ? null : <li>No change</li>}</ul></div> : null}
      {p ? <div class="acts dacts">
        <button type="button" class="btn primary" disabled={busy || (!gal && !!cur?.stale)} onClick={() => apply(false)}>Apply</button>
        <button type="button" class="btn" disabled={busy} title="Apply, and lock what was added so Discover never changes it" onClick={() => apply(true)}>Keep</button>
        <button type="button" class="btn ghost" disabled={busy} onClick={again}>Show another</button>
      </div> : null}
      {fail ? <div class="dfail" dangerouslySetInnerHTML={{ __html: fail.exhausted ? `<div class="card dnote" role="status"><b class="t">That was every design</b><span class="m">${esc(fail.conflicts[0] ?? '')}</span></div>`
        : fail.nothingMissing ? `<div class="card dnote" role="status"><b class="t">Nothing to fill</b><span class="m">${esc(fail.conflicts[0] ?? '')}</span></div>`
          : conflictCardHtml({ conflicts: fail.conflicts, relaxations: fail.relaxations, ...(fail.kept ? { kept: fail.kept } : {}) }) }}
        onClick={e => { const el = (e.target as HTMLElement).closest<HTMLElement>('[data-a="relax"]'); if (el) { const r = fail.relaxations[Number(el.dataset.i)]; if (r) go(() => ctl.relax(r)); } }} /> : null}
      {note ? <p class="hint" role="status">{note}</p> : null}
    </div>
  );
}
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// ---------------------------------------------------------------------------------------------------------------- This or that (the A/B taste screen, kept)
function ThisOrThat({ store, getViewer, profile, scope, say, phone, onBack }: { store: Store; getViewer: () => Viewer | undefined; profile: () => UserProfile; scope: Tab[] | undefined; say: DiscoverProps['say']; phone: boolean; onBack: () => void }) {
  const engine = useMemo(() => createRealEngine(store, () => ({ limits: profile().limits })), [store]);   // eslint-disable-line react-hooks/exhaustive-deps
  const [res, setRes] = useState<PairResult | undefined>();
  const [busy, setBusy] = useState(true);
  const [side, setSide] = useState<0 | 1>(0);
  const [rounds, setRounds] = useState(0);
  const dead = useRef(false);
  const freeze = (on: boolean) => { store.frozen = on; store.onBlocked = on ? () => say('This or that is open: your design is unchanged. Close it to edit.', true) : undefined; };
  const draw = (r: PairResult | undefined) => {
    const v = getViewer(); if (!v) return;
    if (r && r.ok) v.showPair([r.a.snapshot, r.b.snapshot], { ...(phone ? { only: side } : {}), info: [roleText(engine, r.a.id), roleText(engine, r.b.id)] });
    else if (r && r.single) v.showPair([r.single.snapshot, r.single.snapshot], { only: 0, info: ['The only design that fits', ''] });
    else v.showPair(null);
  };
  const later = (fn: () => PairResult) => { setBusy(true); setTimeout(() => { if (dead.current) return; let r: PairResult; try { r = fn(); } catch (e) { console.error(e); r = { ok: false, conflicts: ['Could not make a pair for this design.'], relaxations: [] }; } setRes(r); setBusy(false); }, 30); };
  useEffect(() => {
    dead.current = false; freeze(true);
    later(() => { engine.open(scope); return engine.next(); });
    return () => { dead.current = true; getViewer()?.showPair(null); freeze(false); engine.pause(); };
  }, [engine]);   // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { draw(busy ? undefined : res); }, [res, busy, side, phone]);   // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (o: Outcome) => { setRounds(n => n + 1); later(() => engine.choose(o)); };
  const use = (rec: NonNullable<Extract<PairResult, { ok: true }>['a']>) => {
    getViewer()?.showPair(null); freeze(false);
    const r = acceptPlan(store, rec, engine.session());
    if (r.ok) { say('Applied. Undo steps back.'); engine.pause(); onBack(); } else { freeze(true); say('That design conflicts with something you kept.', true); draw(res); }
  };
  const ok = !busy && res && res.ok ? res : undefined;
  return (
    <div class="discover thisthat" data-mode="thisthat">
      <div class="dback"><button type="button" class="btn sm ghost" onClick={onBack}><Icon name="chev" /> All modes</button><b>This or that</b></div>
      <p class="hint">Pick the one you like more. It learns your taste; your design stays as it is until you use one.{rounds ? ` Round ${rounds + 1}.` : ''}</p>
      {busy ? <p class="hint" role="status">Looking for two designs…</p> : null}
      {phone && ok ? <div class="seg full" role="tablist">{(['A', 'B'] as const).map((s, i) => <button type="button" role="tab" aria-selected={side === i} class={side === i ? 'on' : ''} onClick={() => setSide(i as 0 | 1)}>{s}</button>)}</div> : null}
      {ok ? <div class="pairs">{([ok.a, ok.b] as const).map((r, i) => { const m = metricsOf(r.facts); return (
        <div class="card pair"><b class="t">{i ? 'B' : 'A'} · {roleText(engine, r.id)}</b><span class="m">{r.facts.title}</span><span class="m">{m.spend} · {m.upkeep} · {m.minutes}</span>
          <div class="acts"><button type="button" class="btn primary" onClick={() => choose(i ? 'B' : 'A')}>Prefer {i ? 'B' : 'A'}</button><button type="button" class="btn sm ghost" title="Use this design: one undo step" onClick={() => use(r)}>Use {i ? 'B' : 'A'}</button></div></div>); })}</div> : null}
      {ok ? <div class="acts"><button type="button" class="btn" onClick={() => choose('both')}>Like both</button><button type="button" class="btn" onClick={() => choose('neither')}>Like neither</button><button type="button" class="btn ghost" onClick={() => choose('skip')}>Skip</button><button type="button" class="btn ghost" onClick={() => later(() => engine.different())}>Something different</button></div> : null}
      {!busy && res && !res.ok ? <div class="card dnote" role="status"><b class="t">No pair to show</b><span class="m">{res.conflicts[0] ?? 'Nothing fits what you kept.'}</span></div> : null}
    </div>
  );
}
const roleText = (engine: ReturnType<typeof createRealEngine>, id: string) => ROLE_LABEL[roleOf(engine.session(), id)];

// ---------------------------------------------------------------------------------------------------------------- the shared "Ideas for ..." header button
/** ONE component for every section header (inventory row 34): it finds the open panel's header and puts the button in it, so no section file carries its own. */
export function IdeasButton({ section, onIdeas }: { section: SectionId | null; onIdeas: (s: SectionId) => void }) {
  const label = ideasLabel(section);
  const [, setN] = useState(0);
  useLayoutEffect(() => {
    document.querySelectorAll('.ideasslot').forEach(n => { render(null, n); n.remove(); });
    if (!label || !section) return;
    const head = document.querySelector<HTMLElement>('.panel .sec-head'); if (!head) return;
    const slot = document.createElement('span'); slot.className = 'ideasslot';
    head.insertBefore(slot, head.querySelector('.btn.icon') ?? null);
    render(<button type="button" class="btn sm ideas" title={`${label}: ideas that change only this section`} onClick={() => onIdeas(section)}><Icon name="ideas" /> {label}</button>, slot);
    const mo = new MutationObserver(() => { if (!head.contains(slot)) setN(n => n + 1); }); mo.observe(head, { childList: true });
    return () => { mo.disconnect(); render(null, slot); slot.remove(); };
  });
  return null;
}

// ---------------------------------------------------------------------------------------------------------------- the start door "From an animal I want"
export function AnimalDoor({ store, onClose, say, initial }: { store: Store; onClose: () => void; say: (t: string, bad?: boolean) => void; initial?: string }) {
  const [q, setQ] = useState('');
  const [picks, setPicks] = useState<Pk[]>(() => initial ? addPick([], initial) : []);
  const found = q.trim() ? searchSpecies(q).filter(s => !picks.some(p => p.id === s.id)).slice(0, 8) : [];
  const dp = useMemo(() => doorPlan(picks), [picks]);
  const make = async () => {
    const sc = animalScene(picks, store.scene.units, store.tank.camera); if (!sc) return;
    if (await startProject(store, sc, P7.savedText())) { say('New tank planned around your animals. Undo brings the previous project back.'); onClose(); }
  };
  useEffect(() => { const f = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }; addEventListener('keydown', f, true); return () => removeEventListener('keydown', f, true); }, [onClose]);
  return (
    <div class="scrim" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="dlg" role="dialog" aria-modal="true" aria-label="From an animal I want">
        <div class="sec-head"><h2>From an animal I want</h2><button type="button" class="btn icon ghost" aria-label="Close" onClick={onClose}><Icon name="x" /></button></div>
        <div class="dlgbody">
          <p class="hint">Name an animal. We pick the smallest real tank that holds the group, and build the tank around it.</p>
          <input class="input" autofocus aria-label="Search animals" placeholder="Search animals, e.g. neon tetra" value={q} onInput={e => setQ((e.target as HTMLInputElement).value)} />
          {found.length ? <div class="animalfound">{found.map(s => <button type="button" class="card pick" onClick={() => { setPicks(addPick(picks, s.id)); setQ(''); }}><span /><span class="pbody"><b class="t">{s.name}</b><span class="m">{s.sci}</span></span><Icon name="plus" /></button>)}</div> : null}
          {picks.map(p => (
            <div class="card picked"><b class="t">{getSpecies(p.id)?.name ?? p.id}</b>
              <span class="acts"><button type="button" class="btn sm icon" aria-label="Fewer" disabled={totalOf(p) <= 1} onClick={() => setPicks(bumpPick(picks, p.id, -1))}>−</button><b class="val">{totalOf(p)}</b><button type="button" class="btn sm icon" aria-label="More" onClick={() => setPicks(bumpPick(picks, p.id, 1))}>+</button>
                <button type="button" class="btn sm ghost" onClick={() => setPicks(removePick(picks, p.id))}>Remove</button></span></div>))}
          {picks.length ? <div class={`card doorplan${dp.ok ? '' : ' bad'}`} role="status"><b class="t">{dp.tankName ? (/gal/i.test(dp.tankName) ? dp.tankName : `${dp.tankName} · ${dp.gallons} gal`) : 'No tank holds this group'}</b>{dp.problem ? <span class="m">{dp.problem}</span> : <span class="m">Smallest real tank that holds the group.</span>}</div> : null}
          <div class="dlgfoot acts"><button type="button" class="btn ghost" onClick={onClose}>Cancel</button><button type="button" class="btn primary" disabled={!dp.ok} onClick={() => void make()}>Plan this tank</button></div>
        </div>
      </div>
    </div>
  );
}
