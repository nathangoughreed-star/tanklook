// UI2 shell step 6 (lane S6, 2026-11-14): the Equipment section. The presets ladder, one sub-menu per category, and in each category an
// "I own" group and a "Buy" group with the item in use marked and an independent "Use this one for sure" lock on every row (screen map §2a).
// Components only draw logic/equipment.ts and call its edits, each as one store.edit (one undo step).
import { useState } from 'preact/hooks';
import type { Store } from '../scene/store';
import { GENERIC } from '../scene/gearOwn';
import {
  categories, categoryView, presetLadder, applyPresetEdit, useItem, setOwned, setLock, marks, ownSum, type CatId, type GearRow,
} from './logic/equipment';
import { LightingGroup } from './lighting';
import { Group, Icon, Pill } from './ui';

const CAT_KEY = 'tanklook.ui2.equipCat';
const loadCat = () => { try { return localStorage.getItem(CAT_KEY) ?? 'filter'; } catch { return 'filter'; } };
const saveCat = (c: string) => { try { localStorage.setItem(CAT_KEY, c); } catch { /* private window: not remembered */ } };

/** Opens another section's group (Constraints > Your home): App listens to this window event (detail: { section, group }). */
export const gotoSection = (section: string, group?: string) => dispatchEvent(new CustomEvent('ui2:goto', { detail: { section, group } }));

function Row({ r, store, cat }: { r: GearRow; store: Store; cat: CatId }) {
  const use = () => store.edit(s => useItem(s, cat, r.item));
  const lock = () => store.edit(s => setLock(s, cat, r.item, !r.locked));
  const own = () => store.edit(s => setOwned(s, cat, r.item, !r.owned));
  return (
    <div class={`erow${r.inUse ? ' inuse' : ''}`} data-item={r.item}>
      <span class="thumb"><Icon name="gear" /></span>
      <span class="eb">
        <span class="t" title={r.name}>{r.name}</span>
        <span class="m">{r.sub}</span>
        <span class="pills">
          {r.owned ? <Pill tone="ok">Owned · $0</Pill> : r.price ? <span class="m">{r.price}</span> : null}
          {r.inUse ? <Pill tone="accent">In use</Pill> : null}
          {r.fit ? <Pill tone={r.fit.tone}>{r.fit.text}</Pill> : null}
        </span>
      </span>
      <span class="acts">
        {r.inUse ? null : <button type="button" class="btn sm" title={r.owned ? 'Use the one you own' : 'Put this on the design'} onClick={use}>Use</button>}
        {r.item === GENERIC && !r.owned ? null : <button type="button" class="btn sm ghost own" title={r.owned ? 'You no longer have it (it leaves the I own list)' : 'You have this one: it costs $0'} onClick={own}>{r.owned ? 'Not mine' : 'I own it'}</button>}
        <button type="button" class={`btn icon sm ghost lockbtn${r.locked ? ' on' : ''}`} aria-pressed={r.locked} aria-label={r.locked ? `Release ${r.name}` : `Use ${r.name} for sure`}
          title={r.locked ? 'Used for sure: Discover and Suggest keep this. Click to release.' : 'Use this one for sure (owned or not, in use or not)'} onClick={lock}><Icon name="lock" /></button>
      </span>
    </div>
  );
}

export function EquipmentSection({ store, units }: { store: Store; units: 'in' | 'cm' }) {
  const S = store.tank, cats = categories(S), [sel, setSel] = useState(loadCat());
  const [open, setOpen] = useState({ own: true, buy: true, all: false });
  const cat = (cats.find(c => c.id === sel) ?? cats[0]).id as CatId;
  const v = categoryView(S, cat, units, { showAll: open.all }), ladder = presetLadder(S), mk = marks(S);
  const pick = (id: string) => { setSel(id); saveCat(id); setOpen({ ...open, all: false }); };
  return (
    <div class="equip">
      {ladder.length ? <div class="ladder" role="group" aria-label="Setup level">{ladder.map(p => <button type="button" class={`chip${p.on ? ' on' : ''}`} aria-pressed={p.on} title="Set every row to this level" onClick={() => store.edit(s => applyPresetEdit(s, p.id))}>{p.label}</button>)}</div> : null}
      <div class="cats" role="tablist" aria-label="Equipment categories">
        {cats.map(c => { const m = mk[c.id]; return <button type="button" role="tab" class={`chip${c.id === cat ? ' on' : ''}`} aria-selected={c.id === cat} onClick={() => pick(c.id)}>{c.label}{m?.owned ? <span class="mk">· {m.owned} own</span> : null}{m?.locked ? <Icon name="lock" /> : null}</button>; })}
      </div>
      {v.note ? <div class="catnote">{v.note}{v.roomLink ? <> <button type="button" class="linkbtn" onClick={() => gotoSection('constraints', 'home')}>Edit the room in Constraints</button></> : null}</div> : null}

      <Group title="I own" sum={v.owned.length ? `${v.owned.length} · ${ownSum(v.owned.length)}` : ownSum(0)} open={open.own} onToggle={() => setOpen({ ...open, own: !open.own })}>
        {v.owned.map(r => <Row r={r} store={store} cat={cat} />)}
        <button type="button" class="addrow" onClick={() => store.edit(s => setOwned(s, cat, GENERIC, true))}><Icon name="plus" /> Add one I own (any brand)</button>
        <div class="hint">Owning is not the same as using: the plan prefers what you own, at $0, when it fits.</div>
      </Group>

      <Group title="Buy" sum={`${v.buyTotal} · fits this tank, price`} open={open.buy} onToggle={() => setOpen({ ...open, buy: !open.buy })}>
        {v.buy.map(r => <Row r={r} store={store} cat={cat} />)}
        {v.buyTotal > v.buy.length || open.all ? <button type="button" class="addrow" onClick={() => setOpen({ ...open, all: !open.all })}>{open.all ? 'Show fewer' : `Show all ${v.buyTotal}`}</button> : null}
      </Group>

      {cat === 'light' ? <LightingGroup store={store} /> : null}
    </div>
  );
}
