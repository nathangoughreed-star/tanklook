// UI2 shell step 4 (lane S4, 2026-11-14): the Animals section (search, filters, stocking list, greyed animals with a reason, remove
// misfits), and the Selection drawer (Water look moved to the Tank section, lane AT1). Components only draw logic/animals.ts and call its edits.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Store } from '../scene/store';
import type { Viewer } from '../render/viewer';
import { getSpecies, type Sex } from '../data/species';
import { ensureLive } from '../art/liveFish';
import { emptyBrief, rulesOf } from '../scene/brief';
import { LIMITS } from '../scene/validate';
import { createFitter } from '../ui/logic/animalPicker';
import { OK_FIT } from '../scene/pickerKind';
import { drawFishCard } from '../art/placeholder';
import { artMeta } from '../art/fishgen';
import { SHRIMP3D } from '../art/shrimps';
import { drawSnailCard } from '../art/snails';
import { drawSessileCard } from '../art/sessile';
import {
  DEFAULT_QUERY, pickView, stockView, selectionView, addSpecies, setCount, removeMisfits,
  flip, del, dup, setSex, setSize, setAlbino, dropSpecies, copySelection, COPY_START, COPY_RANGE, type CopyOpt, setPair, setGender, findSpecies, rowKeyOf, speciesDetail, noteIn, type PickQuery, type PickRow,
} from './logic/animals';
import { wantsAlbino } from '../data/species';
import { setForm } from './logic/animals';
import { Icon } from './ui';
import { SpeciesListDialog, speciesCount } from './speciesList';
import { useFishSwimming } from './view';
import { dragOut } from './drag';
import { emptyScene } from '../scene/defaults';
import { applyKind } from '../scene/pickerKind';
import { totalOf, type Pk } from '../ui/stockPlanLogic';
import { addPick, bumpPick, removePick } from './logic/discover';

const FITS_KEY = 'tanklook.ui2.fits';
const loadFits = () => { try { return localStorage.getItem(FITS_KEY) !== '0'; } catch { return true; } };
const saveFits = (on: boolean) => { try { localStorage.setItem(FITS_KEY, on ? '1' : '0'); } catch { /* private window: not remembered */ } };

/** Animals can be picked in the view only while the Animals section is open (as the old shell: its menu open). Boot's attachPointer reads this. */
export const pickable = { fish: false };

const tone = (l: PickRow['level']) => (l === 'problem' ? 'bad' : 'warn');

/** The species picture: the baked still (public/gallery/<look>.webp), else the painted card, else nothing. */
const paint = new Map<string, string>();
const speciesAspectOf = (art: string, dflt: number) => artMeta(art)?.aspect ?? dflt;
export function FishArt({ id, look, big, art }: { id: string; look: string; big?: boolean; art?: string }) {
  const baked = `${import.meta.env.BASE_URL}gallery/${encodeURIComponent(look)}.webp`;
  const [src, setSrc] = useState(baked);
  useEffect(() => { setSrc(baked); }, [baked]);
  const fallback = () => {
    let u = paint.get(look);
    if (u === undefined) { try { const sp = getSpecies(id)!; u = (sp.kind === 'sessile' ? drawSessileCard(sp.art, 480) : sp.kind === 'snail' ? drawSnailCard(sp.art, 'side', 480) : drawFishCard(art ?? sp.art, art ? speciesAspectOf(art, sp.aspect) : sp.aspect, 480)).toDataURL(); } catch { u = ''; } paint.set(look, u); }
    if (u && u !== src) setSrc(u);
  };
  return <img class={`fishart${big ? ' big' : ''}`} src={src} alt="" loading={big ? 'eager' : 'lazy'} draggable={false} onError={fallback} />;
}

/** CM3: one swatch: a small render of the fish in that form (same card art as the tank, no baked file: forms are not in the gallery). */
const swatches = new Map<string, string>();
function Swatch({ art, aspect }: { art: string; aspect: number }) {
  let u = swatches.get(art);
  if (u === undefined) {
    try {
      const sh = SHRIMP3D[art];   // a shrimp is the 3D model in the tank: its swatch is that model's own skin paint, not the old flat card
      if (sh) { const c = document.createElement('canvas'); c.width = 200; c.height = 56; const x = c.getContext('2d')!; sh.skin(x, 200, 56); u = c.toDataURL(); } else u = drawFishCard(art, aspect, 200).toDataURL();
    } catch { u = ''; }
    swatches.set(art, u);
  }
  return <img class="swatch-img" src={u} alt="" draggable={false} />;
}
type FormsView = NonNullable<ReturnType<typeof import('./logic/animals').selectionView>>['forms'];
/** CM3: the Colour / form menu of the Selection drawer: a swatch per form, searchable when the list is long, for the whole species or just this one. */
function FormsMenu({ store, f }: { store: Store; f: NonNullable<FormsView> }) {
  const [q, setQ] = useState(''), [all, setAll] = useState(true);
  return (
    <div class="field forms">
      {f.n > 1 ? <div class="seg full" role="group" aria-label="Apply the form to"><button type="button" class={all ? 'on' : ''} aria-pressed={all} onClick={() => setAll(true)}>All {f.n}</button><button type="button" class={!all ? 'on' : ''} aria-pressed={!all} onClick={() => setAll(false)}>Just this one</button></div> : null}
      {f.axes.map(a => {
        const term = q.trim().toLowerCase(), shown = a.list.filter(x => !term || !x.id || x.name.toLowerCase().includes(term));
        return (
          <div class="faxis">
            <div class="cap">{a.title}</div>
            {a.list.length > 9 ? <input class="input" type="search" placeholder={`Search ${a.list.length - 1} forms`} aria-label={`Search ${a.title}`} value={q} onInput={e => setQ((e.target as HTMLInputElement).value)} /> : null}
            <div class="swgrid" role="listbox" aria-label={a.title}>
              {shown.map(x => <button type="button" role="option" class={`swatch${a.on === x.id ? ' on' : ''}`} aria-selected={a.on === x.id} title={x.est ? `${x.name} (est: listed by breeders and retailers)` : x.name} onClick={() => setForm(store, a.axis, x.id, all)}><Swatch art={x.art} aspect={x.aspect} /><span>{x.name}{x.est ? ' *' : ''}</span></button>)}
              {!shown.length ? <div class="hint">No match.</div> : null}
            </div>
          </div>
        );
      })}
      {f.note.map(t => <div class="hint">{t}</div>)}
      <div class="hint">Looks only: care and sizing stay the species'. <a href={f.src} target="_blank" rel="noreferrer">Source</a>; * = est.</div>
    </div>
  );
}

/** AT1 (R54): the start door's mode of this section: a pending list (nothing written to the design), no tank to judge against. */
export interface PendingList { picks: Pk[]; set: (p: Pk[]) => void }
const KINDS = [['freshwater', 'Freshwater'], ['saltwater', 'Saltwater'], ['terrarium', 'Land']] as const;

export function AnimalsSection({ store, getViewer, pending }: { store: Store; getViewer?: () => Viewer | undefined; pending?: PendingList }) {
  const [kind, setKind] = useState<(typeof KINDS)[number][0]>('freshwater');
  const scratch = useMemo(() => { const T = emptyScene().tanks[0]; applyKind(T, kind); return T; }, [kind]);
  const S = pending ? scratch : store.tank, units = store.scene.units, rules = rulesOf(S.brief ?? emptyBrief());
  const fitter = useRef(createFitter()).current;
  const [, setN] = useState(0);
  const [query, setQuery] = useState<PickQuery>({ ...DEFAULT_QUERY, fitsOnly: loadFits() });
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
  const [pvId, setPvId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);   // R131: the full species list
  const albinoSearch = wantsAlbino(query.q);   // AL1 part 3: "albino cory": Add from the card puts the fish in with the albino form on
  const pct = 100;   // AT1 (R42): new animals come in at the default size; a placed one is resized in the Selection drawer
  const timer = useRef(0);
  const say = (text: string, bad = false) => { setNote({ text, bad }); clearTimeout(timer.current); timer.current = window.setTimeout(() => setNote(null), bad ? 9000 : 4000); };
  useEffect(() => () => clearTimeout(timer.current), []);

  const pv = pickView(S, units, rules, fitter, query, pending ? { held: new Set(pending.picks.map(p => p.id)), free: true, heldWord: 'your list' } : {});
  const tileIds = pv.groups.flatMap(g => g.rows.map(r => r.id)).join(',');
  useEffect(() => { let on = true; void ensureLive(tileIds.split(',').filter(Boolean)).then(c => { if (on && c.length) setN(n => n + 1); }); return () => { on = false; }; }, [tileIds]);   // FD: a tile's build-B art is fetched when the tile shows, so it never shows the old model (the Cardinal tetra tile showed the wrong fish)
  const sv = stockView(S, rules, units, fitter);
  // the exact fit reading is worked out a slice at a time after the first paint, then redraws the list
  const detSp = pvId ? getSpecies(pvId) : undefined, det = detSp ? speciesDetail(S, detSp, pending ? OK_FIT : fitter.exactNow(S, units, rules, detSp), units) : null;
  const list = useMemo(() => findSpecies(S, query.q, query.role, query.origin), [S, query.q, query.role, query.origin]);
  useEffect(() => { if (!pending) fitter.refineFits(S, units, rules, list, () => setN(n => n + 1)); });

  const set = (q: Partial<PickQuery>) => setQuery({ ...query, ...q });
  const flipFits = () => { saveFits(!query.fitsOnly); set({ fitsOnly: !query.fitsOnly }); };
  const report = (r: ReturnType<typeof addSpecies>) => { if (!r.ok) say(r.why, true); else if (r.note) say(r.note); };
  const add = (sp: NonNullable<ReturnType<typeof getSpecies>>, glo?: string) => { if (pending) { pending.set(addPick(pending.picks, sp.id, albinoSearch && !!sp.albino)); setPvId(null); } else report(addSpecies(store, sp, undefined, pct, albinoSearch && !!sp.albino && !glo, glo)); };
  const pick = (id: string) => { const f = store.tank.fish.find(x => rowKeyOf(x) === id); if (f) store.select(f.id); };

  return (
    <div class="animals">
      {note ? <div class={`note${note.bad ? ' bad' : ''}`} role="status">{note.text}</div> : null}

      {pending ? (<>
        <div class="cap">Your list {pending.picks.length ? <span class="n">{pending.picks.reduce((n, p) => n + totalOf(p), 0)}</span> : null}</div>
        {pending.picks.length ? (
          <div class="stock" aria-label="Stocking list">
            {pending.picks.map(p => { const sp = getSpecies(p.id); const nm = sp?.name ?? p.id; return (
              <div class="srow" data-sp={p.id}>
                <span class="nm"><span class="t">{nm}</span></span>
                <button type="button" class="btn icon sm" aria-label={`One fewer ${nm}`} title="One fewer" disabled={totalOf(p) <= 1} onClick={() => pending.set(bumpPick(pending.picks, p.id, -1))}>−</button>
                <b class="val">{totalOf(p)}</b>
                <button type="button" class="btn icon sm" aria-label={`One more ${nm}`} title="One more" onClick={() => pending.set(bumpPick(pending.picks, p.id, 1))}>+</button>
                <button type="button" class="btn icon sm ghost" aria-label={`Remove ${nm}`} title="Take it off the list" onClick={() => pending.set(removePick(pending.picks, p.id))}><Icon name="x" /></button>
              </div>); })}
          </div>
        ) : <div class="hint">Nothing yet. Pick the animals you want below; you can tell them by their pictures.</div>}
        <div class="chips" role="group" aria-label="Kind of animal">{KINDS.map(([k, l]) => <button type="button" class={`chip${kind === k ? ' on' : ''}`} aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>)}</div>
      </>) : (<>
      <div class="cap">Your animals {sv.total ? <span class="n">{sv.total}</span> : null}</div>
        {sv.rows.length ? (
          <div class="stock" aria-label="Stocking">
            {sv.rows.map(r => (
              <div class={`srow${r.off ? ' misfit' : ''}${r.level !== 'ok' ? ' gated' : ''}${store.selected && rowKeyOf(store.selected) === r.key ? ' sel' : ''}`} data-sp={r.key}>
                <button type="button" class="nm" title={`${r.sci}${r.more.length ? ' · ' + r.more.join('; ') : ''}`} onClick={() => pick(r.key)}>
                  <span class="t">{r.name}</span>
                  <small class="size" data-size>{r.size}</small>
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
        {sv.misfits ? (
          <div class="misnote"><span>{sv.misfitText} <span class="hint">{sv.misfitNames}.</span></span>
            <button type="button" class="btn sm" title="Take off the animals that do not live in this water (Ctrl+Z brings them back)" onClick={() => report(removeMisfits(store))}>Remove misfits ({sv.misfits})</button></div>
        ) : null}
  
      </>)}
      {det ? (
        <div class="detail">
          <button type="button" class="btn sm ghost back" onClick={() => setPvId(null)}>← Back to the list</button>
          <div class="dart"><FishArt id={det.id} look={det.look} big /></div>
          <div class="dname">{det.name}{det.tag ? <b class="tag">{det.tag}</b> : null}</div>
          <div class="m"><i>{det.sci}</i></div>
          {det.origin ? <div class="origin" title={`Native range from ${det.origin.src}${det.origin.est ? '; we are less sure of this one' : ''}`}><b class="tag">{det.origin.place}</b><span>{det.origin.region}</span></div> : null}
          {det.note ? <div class="hint">{det.note}</div> : null}
          <div class="rundown">{det.rows.map(([k, v]) => <div class="drow"><span>{k}</span><b>{v}</b></div>)}</div>
          {pending ? null : <div class={`fitbox ${det.fit.level}`}><b>{det.fit.level === 'ok' ? 'Fits' : det.fit.level === 'problem' ? 'Held back' : 'Caution'}</b> {det.fit.text}{det.fit.more.length ? <ul>{det.fit.more.map(m => <li>{m}</li>)}</ul> : null}{det.fit.inTank ? <div class="hint">{det.fit.inTank} already in the tank.</div> : null}</div>}
          <div class="acts-row"><button type="button" class={`btn${det.fit.level === 'ok' ? ' primary' : ' ghost'}`} title={det.dimorphic ? 'Adds the males and females in the proportion the species is kept' : ''}
            onClick={() => add(detSp!)}>{det.fit.level === 'ok' ? `Add ${det.start}` : `Add ${det.start} anyway`}</button></div>
        </div>
      ) : (<>
      <div class="cap">Add animals</div>
      <label class="search"><Icon name="search" /><input class="input" type="search" placeholder={pv.placeholder} value={query.q} aria-label="Search animals" onInput={e => set({ q: (e.target as HTMLInputElement).value })} /></label>
      {pending ? null : <button type="button" class="tglrow" role="switch" aria-checked={query.fitsOnly} onClick={flipFits}>
        <span class={`toggle${query.fitsOnly ? ' on' : ''}`} />Fits this tank{pv.hidden ? <span class="hint"> · {pv.hidden} held back</span> : null}
      </button>}
      <div class="chips">{pv.chips.map(c => <button type="button" class={`chip${(query.role ?? undefined) === c.role ? ' on' : ''}`} aria-pressed={(query.role ?? undefined) === c.role} onClick={() => set({ role: c.role })}>{c.label} <span class="n">{c.n}</span></button>)}</div>
      {pv.origins.length > 1 ? <div class="cap origincap">Where from</div> : null}
      {pv.origins.length > 1 ? <div class="chips origins" role="group" aria-label="Where from">{pv.origins.map(c => <button type="button" class={`chip${query.origin === c.c ? ' on' : ''}`} aria-pressed={query.origin === c.c} onClick={() => set({ origin: c.c })}>{c.label} <span class="n">{c.n}</span></button>)}</div> : null}
      {pv.none ? <div class="hint">{pv.none}</div> : null}
      {pv.groups.map(g => (
        <div class="pgroup">
          {query.role ? null : <div class="cap">{g.label} <span class="n">{g.rows.length}</span></div>}
          <div class="pgrid">
          {g.rows.map(r => {
            const sp = getSpecies(r.id)!;
            return (
              <div class={`ptile${r.level !== 'ok' ? ' gated' : ''}`}
                onPointerDown={e => { if (!getViewer || (e.target as HTMLElement).closest('button')) return; dragOut(e, sp.name, getViewer, store, (at, overView) => { if (at || overView) report(dropSpecies(store, sp, undefined, at ?? undefined, pct, albinoSearch && !!sp.albino && !r.glo, r.glo)); }); }} title={r.level !== 'ok' ? [r.reason, ...r.more, 'Still addable: Add anyway.'].join('; ') : noteIn(sp.note ?? '', units)}>
                <div class="tart"><FishArt id={r.id} look={r.look} art={r.art} /><button type="button" class="info" aria-label={`${r.name}: details`} title="Details" onClick={() => setPvId(r.id)}>i</button></div>
                <div class="tname">{r.name}{r.tag ? <b class="tag">{r.tag}</b> : null}{albinoSearch && sp.albino ? <b class="tag albino" title="Add puts it in with the albino form on">Albino</b> : null}</div>
                <div class="tmeta"><span>{r.size}</span>{r.care ? <span class="care">{r.care}</span> : null}</div>
                {r.reason ? <small class={`why ${tone(r.level)}`}>{r.reason}{r.more.length ? ` (+${r.more.length} more)` : ''}</small> : null}
                <button type="button" class={`btn sm${r.level === 'ok' ? '' : ' ghost'}`} title={sp.female ? 'Adds the males and females in the proportion the species is kept' : `Add ${r.startCount > 1 ? r.startCount : 'one'}`}
                  onClick={() => add(sp, r.glo)}>{r.level === 'ok' ? `Add${r.startCount > 1 ? ' ' + r.startCount : ''}` : 'Add anyway'}</button>
              </div>
            );
          })}
          </div>
        </div>
      ))}
      <div class="endnote hint"><button type="button" class="linkbtn" onClick={() => setListOpen(true)}>See all {speciesCount()} species</button> with sizes, levels and where they are from.</div>
      {pv.shown ? <div class="endnote hint">{pv.shown} {pv.shown === 1 ? 'animal' : 'animals'} shown{pv.hidden ? `, ${pv.hidden} held back by "Fits this tank"` : ''}.</div> : null}
      </>)}
      {listOpen ? <SpeciesListDialog store={store} onClose={() => setListOpen(false)} onOpen={id => { setListOpen(false); setPvId(id); }} /> : null}
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
  const swimming = useFishSwimming(getViewer);
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
        {v.albino ? <div class="field"><button type="button" class="tglrow" role="switch" aria-checked={v.albino.on} title={`Albino form (no melanin: pale body, pink eyes). Applies to all ${v.albino.n} of this species. Source: ${v.albino.src}`} onClick={() => setAlbino(store, !v.albino!.on)}><span class={`toggle${v.albino.on ? ' on' : ''}`} />Albino{v.albino.n > 1 ? <span class="hint"> · all {v.albino.n}</span> : null}</button></div> : null}
        {v.forms ? <FormsMenu store={store} f={v.forms} /> : null}
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
        <div class="hint">{swimming ? 'Position and pose are random; the fish keep swimming.' : 'Position and pose are random: "Another moment" (view bar) rolls them again.'}</div>
      </div>
    </aside>
  );
}
