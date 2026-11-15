// UI2 shell step 4 (lane S4, 2026-11-14): the Animals section (search, filters, stocking list, greyed animals with a reason, remove
// misfits), and the Selection drawer (Water look moved to the Tank section, lane AT1). Components only draw logic/animals.ts and call its edits.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Store } from '../scene/store';
import type { Viewer } from '../render/viewer';
import { getSpecies, type Sex } from '../data/species';
import { emptyBrief, rulesOf } from '../scene/brief';
import { LIMITS } from '../scene/validate';
import { createFitter } from '../ui/logic/animalPicker';
import {
  DEFAULT_QUERY, pickView, stockView, selectionView, addSpecies, setCount, removeMisfits,
  flip, del, dup, setSex, setSize, dropSpecies, copySelection, COPY_START, COPY_RANGE, type CopyOpt, setPair, setGender, findSpecies, rowKeyOf, type PickQuery, type PickRow,
} from './logic/animals';
import { Icon, Pill } from './ui';
import { dragOut } from './drag';
import { aqView, aqCheck, onAq } from './logic/aq';

const FITS_KEY = 'tanklook.ui2.fits';
const loadFits = () => { try { return localStorage.getItem(FITS_KEY) !== '0'; } catch { return true; } };
const saveFits = (on: boolean) => { try { localStorage.setItem(FITS_KEY, on ? '1' : '0'); } catch { /* private window: not remembered */ } };

/** Animals can be picked in the view only while the Animals section is open (as the old shell: its menu open). Boot's attachPointer reads this. */
export const pickable = { fish: false };

const tone = (l: PickRow['level']) => (l === 'problem' ? 'bad' : 'warn');

export function AnimalsSection({ store, getViewer }: { store: Store; getViewer?: () => Viewer | undefined }) {
  const S = store.tank, units = store.scene.units, rules = rulesOf(S.brief ?? emptyBrief());
  const fitter = useRef(createFitter()).current;
  const [, setN] = useState(0);
  const [query, setQuery] = useState<PickQuery>({ ...DEFAULT_QUERY, fitsOnly: loadFits() });
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
  const pct = 100;   // AT1 (R42): new animals come in at the default size; a placed one is resized in the Selection drawer
  useEffect(() => onAq(() => setN(n => n + 1)), []);
  const aq = aqView(S);
  const timer = useRef(0);
  const say = (text: string, bad = false) => { setNote({ text, bad }); clearTimeout(timer.current); timer.current = window.setTimeout(() => setNote(null), bad ? 9000 : 4000); };
  useEffect(() => () => clearTimeout(timer.current), []);

  const pv = pickView(S, units, rules, fitter, query);
  const sv = stockView(S, rules, units, fitter);
  // the exact fit reading is worked out a slice at a time after the first paint, then redraws the list
  const list = useMemo(() => findSpecies(S, query.q, query.role), [S, query.q, query.role]);
  useEffect(() => { fitter.refineFits(S, units, rules, list, () => setN(n => n + 1)); });

  const set = (q: Partial<PickQuery>) => setQuery({ ...query, ...q });
  const flipFits = () => { saveFits(!query.fitsOnly); set({ fitsOnly: !query.fitsOnly }); };
  const report = (r: ReturnType<typeof addSpecies>) => { if (!r.ok) say(r.why, true); else if (r.note) say(r.note); };
  const pick = (id: string) => { const f = store.tank.fish.find(x => rowKeyOf(x) === id); if (f) store.select(f.id); };

  return (
    <div class="animals">
      {note ? <div class={`note${note.bad ? ' bad' : ''}`} role="status">{note.text}</div> : null}

      <div class="cap">Your animals {sv.total ? <span class="n">{sv.total}</span> : null}</div>
      {sv.rows.length ? (
        <div class="stock" aria-label="Stocking">
          {sv.rows.map(r => (
            <div class={`sr${r.off ? ' misfit' : ''}${r.level !== 'ok' ? ' gated' : ''}${store.selected && rowKeyOf(store.selected) === r.key ? ' sel' : ''}`} data-sp={r.key}>
              <button type="button" class="nm" title={`${r.sci}${r.more.length ? ' · ' + r.more.join('; ') : ''}`} onClick={() => pick(r.key)}>
                <span class="t">{r.name}</span>
                {r.reason ? <small class={`why ${tone(r.level)}`}>{r.off ? '✕ ' : ''}{r.reason}{r.more.length ? ` (+${r.more.length} more)` : ''}</small> : null}
              </button>
              <button type="button" class="btn icon sm" aria-label={`One fewer ${r.name}`} title="One fewer (the last one takes it off the list)"
                onClick={() => { const sp = getSpecies(r.id)!; report(setCount(store, sp, k => k - 1, r.sex, pct)); }}>−</button>
              <input class="input num" type="number" min={0} max={LIMITS.maxFish} value={r.n} aria-label={`How many ${r.name}`}
                onChange={e => { const t = e.target as HTMLInputElement, v = Math.round(+t.value), sp = getSpecies(r.id)!; if (Number.isFinite(v) && t.value !== '') report(setCount(store, sp, () => Math.max(0, v), r.sex)); else t.value = String(r.n); }} />
              <button type="button" class="btn icon sm" aria-label={`One more ${r.name}`} title="One more" disabled={sv.atLimit}
                onClick={() => { const sp = getSpecies(r.id)!; report(setCount(store, sp, k => k + 1, r.sex, pct)); }}>+</button>
              <button type="button" class="btn icon sm ghost" aria-label={`Remove ${r.name}`} title="Take it off the list"
                onClick={() => { const sp = getSpecies(r.id)!; report(setCount(store, sp, () => 0, r.sex)); }}><Icon name="x" /></button>
            </div>
          ))}
        </div>
      ) : <div class="hint">{sv.empty}</div>}
      {aq.show ? (
        <div class="aqrow"><span class="lbl">AqAdvisor</span>
          {aq.canCheck ? <button type="button" class="btn sm" disabled={aq.busy} title="Ask AqAdvisor for this tank's stocking level (one request; only when the site is up)" onClick={() => void aqCheck(S)}>Check</button> : null}
          <span class={aq.bad ? 'bad' : ''} role="status">{aq.text}</span>
          <a href={aq.url} target="_blank" rel="noopener" title="Open this tank and stocking in AqAdvisor's calculator for the full report">AqAdvisor ↗</a>
          {aq.note ? <div class="hint">{aq.note}</div> : null}</div>
      ) : aq.note ? <div class="hint">{aq.note}</div> : null}
      {sv.misfits ? (
        <div class="misnote"><span>{sv.misfitText} <span class="hint">{sv.misfitNames}.</span></span>
          <button type="button" class="btn sm" title="Take off the animals that do not live in this water (Ctrl+Z brings them back)" onClick={() => report(removeMisfits(store))}>Remove misfits ({sv.misfits})</button></div>
      ) : null}

      <div class="cap">Add animals</div>
      <label class="search"><Icon name="search" /><input class="input" type="search" placeholder={pv.placeholder} value={query.q} aria-label="Search animals" onInput={e => set({ q: (e.target as HTMLInputElement).value })} /></label>
      <button type="button" class="tglrow" role="switch" aria-checked={query.fitsOnly} onClick={flipFits}>
        <span class={`toggle${query.fitsOnly ? ' on' : ''}`} />Fits this tank{pv.hidden ? <span class="hint"> · {pv.hidden} held back</span> : null}
      </button>
      <div class="chips">{pv.chips.map(c => <button type="button" class={`chip${(query.role ?? undefined) === c.role ? ' on' : ''}`} aria-pressed={(query.role ?? undefined) === c.role} onClick={() => set({ role: c.role })}>{c.label} <span class="n">{c.n}</span></button>)}</div>
      {pv.none ? <div class="hint">{pv.none}</div> : null}
      {pv.groups.map(g => (
        <div class="pgroup">
          {query.role ? null : <div class="cap">{g.label} <span class="n">{g.rows.length}</span></div>}
          {g.rows.map(r => {
            const sp = getSpecies(r.id)!;
            return (
              <div class={`prow${r.level !== 'ok' ? ' gated' : ''}`}
                onPointerDown={e => { if (!getViewer || (e.target as HTMLElement).closest('button')) return; dragOut(e, sp.name, getViewer, store, (at, overView) => { if (at || overView) report(dropSpecies(store, sp, undefined, at ?? undefined, pct)); }); }} title={r.level !== 'ok' ? [r.reason, ...r.more, 'Still addable: Add anyway.'].join('; ') : sp.note ?? ''}>
                <div class="pi"><span class="t">{r.name}{r.tag ? <b class="tag">{r.tag}</b> : null}</span><span class="m">{r.size} · <i>{r.sci}</i></span>
                  {r.reason ? <small class={`why ${tone(r.level)}`}>{r.reason}{r.more.length ? ` (+${r.more.length} more)` : ''}</small> : null}</div>
                {r.inTank ? <Pill tone="neutral">{r.inTank} in</Pill> : null}
                <button type="button" class={`btn sm${r.level === 'ok' ? '' : ' ghost'}`} title={sp.female ? 'Adds the males; use the Selection box to switch one to a female' : `Add ${r.startCount > 1 ? r.startCount : 'one'}`}
                  onClick={() => report(addSpecies(store, sp, undefined, pct))}>{r.level === 'ok' ? `Add${r.startCount > 1 ? ' ' + r.startCount : ''}` : 'Add anyway'}</button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function CopiesBox({ store, say }: { store: Store; say: (s: string) => void }) {
  const [o, setO] = useState<CopyOpt>(COPY_START);
  const row = (k: 'n' | 'angle' | 'scale' | 'spacing', label: string, unit: string) => (
    <div class="row"><span class="lbl">{label}</span><input class="slider" type="range" min={COPY_RANGE[k][0]} max={COPY_RANGE[k][1]} value={o[k]} aria-label={label} onInput={e => setO({ ...o, [k]: +(e.target as HTMLInputElement).value })} /><span class="val">{k === 'n' ? '×' : ''}{o[k]}{unit}</span></div>
  );
  return (
    <div class="copybox">
      {row('n', 'Copies', '')}{row('angle', 'Turn ±', '°')}{row('scale', 'Size ±', '%')}{row('spacing', 'Spacing ±', '%')}
      <button type="button" class="btn sm" onClick={() => { const r = copySelection(store, o); say(r.ok ? `Made ${r.made}. Ctrl+Z takes them back.` : r.why); }}>Make copies</button>
    </div>
  );
}

export function SelectionDrawer({ store, getViewer, onClose }: { store: Store; getViewer: () => Viewer | undefined; onClose: () => void }) {
  const v = selectionView(store.tank, store.selId, store.scene.units, f => getViewer()?.measure(f) ?? null, store.group.fish.length - 1);
  useEffect(() => { if (!v) onClose(); }, [!v]);
  const [copies, setCopies] = useState(false), [msg, setMsg] = useState('');
  if (!v) return null;
  const seg = <T extends string>(on: T, opts: [T, string][], pick: (k: T) => void, label: string) => (
    <div class="seg full" role="group" aria-label={label}>{opts.map(([k, t]) => <button type="button" class={on === k ? 'on' : ''} aria-pressed={on === k} onClick={() => pick(k)}>{t}</button>)}</div>
  );
  return (
    <aside class="drawer" aria-label="Selection">
      <div class="sec-head"><h2>Selection</h2><button type="button" class="btn icon ghost" title="Close (Esc)" aria-label="Close" onClick={() => { store.select(null); onClose(); }}><Icon name="x" /></button></div>
      <div class="sec-body">
        <div class="card"><div class="t">{v.name}{v.sexMark}</div><div class="m"><i>{v.sci}</i></div></div>
        {v.extra > 0 ? <div class="hint">{v.extra} more selected with it: the buttons below act on this one.</div> : null}
        {v.lines.map(([k, t]) => <div class="drow"><span>{k}</span><b>{t}</b></div>)}
        <div class="field"><div class="cap" title="Adult is 100%. Drag, or pick a life stage where the species has them">Size, % of adult</div>
          <div class="row"><input class="slider" type="range" min={15} max={130} step={1} value={v.size.pct} aria-label="Size, percent of adult size" onInput={e => setSize(store, +(e.target as HTMLInputElement).value)} /><span class="val">{v.size.text}</span></div>
          {v.size.stages ? <div class="seg" role="group" aria-label="Life stage">{v.size.stages.map(b => <button type="button" class={b.on ? 'on' : ''} aria-pressed={b.on} title={b.text} onClick={() => setSize(store, b.pct)}>{b.name}</button>)}</div> : null}</div>
        {v.sex ? <div class="field"><div class="cap">Sex</div>{seg(v.sex.on, [['m', '♂ Male'], ['f', '♀ Female']] as ['m' | 'f', string][], k => setSex(store, k === 'f' ? ('f' as Sex) : undefined), 'Sex')}</div> : null}
        {v.pair ? <div class="field"><div class="cap" title="Two of a pair-forming species are judged as a pair only once you say they are one">Pair</div>{seg(v.pair.on, v.pair.choices, k => setPair(store, k), 'Pair')}</div> : null}
        {v.gender ? <div class="field"><div class="cap" title="Tracked for the stocking check; the drawing does not change">Sex (tracked)</div>
          {seg(v.gender.on, [['', 'Not sexed'], ['m', '♂ Male'], ['f', '♀ Female']] as ['' | 'm' | 'f', string][], k => setGender(store, k || undefined), 'Tracked sex')}<div class="hint">{v.gender.how}</div></div> : null}
        <div class="btns">
          <button type="button" class="btn sm" onClick={() => flip(store)} title="Turn it round (F)">Flip</button>
          <button type="button" class="btn sm" onClick={() => dup(store)} title="Another one beside it (Ctrl+D)">Duplicate</button>
          <button type="button" class="btn sm" aria-expanded={copies} onClick={() => setCopies(!copies)} title="Several copies with a little random variation: a school">Copies…</button>
          <button type="button" class="btn sm danger" onClick={() => del(store)}>Delete</button>
        </div>
        {copies ? <CopiesBox store={store} say={setMsg} /> : null}
        {msg ? <div class="hint" role="status">{msg}</div> : null}
        <div class="hint">Position and pose are random: "Another moment" (view bar) rolls them again.</div>
      </div>
    </aside>
  );
}
