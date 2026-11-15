// UI2 shell step 6 (lane S6, 2026-11-14): the Equipment section. The presets ladder, one sub-menu per category, and in each category an
// "I own" group and a "Buy" group with the item in use marked and an independent "Use this one for sure" lock on every row (screen map §2a).
// Components only draw logic/equipment.ts and call its edits, each as one store.edit (one undo step).
import { useEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { Store } from '../scene/store';
import { GENERIC } from '../scene/gearOwn';
import {
  categoryGroups, groupOfKind, buyTree, categoryView, presetLadder, applyPresetEdit, useItem, setOwned, setLock, ownSum, addOwnAny, specOf, isCat, type CatId, type GearRow,
} from './logic/equipment';
import { LightingGroup } from './lighting';
import { artOf } from './logic/gearArt';
import { gearSel, onGearSel } from '../render/gearSel';
import { orientOf, withOrient, type Orient } from '../interact/gearDrag';
import { Group, Icon, Pill } from './ui';
import { openSection, OPEN_EVENT } from './open';
import { takeOpen } from './logic/sections';
import type { SectionId } from './logic/sections';

const CAT_KEY = 'tanklook.ui2.equipCat';
const loadCat = () => { try { return localStorage.getItem(CAT_KEY) ?? 'filter'; } catch { return 'filter'; } };
const saveCat = (c: string) => { try { localStorage.setItem(CAT_KEY, c); } catch { /* private window: not remembered */ } };

/** Opens another section's group (Constraints > Your home): App listens to this window event (detail: { section, group }). */
const gotoSection = (section: SectionId, group?: string) => openSection(section, group);

/** The product's picture: the baked still (public/gallery/gear/<stem>.webp), else drawn live from its 3D model, else the plain icon (R61). */
const liveArt = new Map<string, string>();
function GearArt({ cat, item }: { cat: string; item: string }) {
  const art = artOf(cat, item), baked = art ? `${import.meta.env.BASE_URL}gallery/gear/${art.stem}.webp` : '';
  const [src, setSrc] = useState(baked), [dead, setDead] = useState(false);
  useEffect(() => { setSrc(baked); setDead(false); }, [baked]);
  if (!art || dead) return <Icon name="gear" />;
  const fallback = () => {
    if (liveArt.has(art.stem)) { const u = liveArt.get(art.stem)!; if (u && u !== src) setSrc(u); else if (!u) setDead(true); return; }
    void import('../render/gearStill').then(m => { let u = ''; try { u = m.gearStill(art.spec) ?? ''; } catch { /* no WebGL */ } liveArt.set(art.stem, u); if (u) setSrc(u); else setDead(true); });
  };
  return <img class="gearart" src={src} alt="" loading="lazy" draggable={false} onError={fallback} />;
}

function Row({ r, store, cat }: { r: GearRow; store: Store; cat: CatId }) {
  const use = () => store.edit(s => useItem(s, cat, r.item));
  const lock = () => store.edit(s => setLock(s, cat, r.item, !r.locked));
  const own = () => store.edit(s => setOwned(s, cat, r.item, !r.owned));
  return (
    <div class={`erow${r.inUse ? ' inuse' : ''}`} data-item={r.item}>
      <span class="thumb"><GearArt cat={cat} item={r.item} /></span>
      <span class="eb">
        <span class="t" title={r.name}>{r.name}</span>
        <span class="eline">
          <span class="efacts">
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
        </span>
      </span>
    </div>
  );
}

function AddOwn({ store, cat }: { store: Store; cat: CatId }) {
  const [open, setOpen] = useState(false), [name, setName] = useState(''), [w, setW] = useState(''), [bad, setBad] = useState('');
  const sp = specOf(cat);
  if (!open) return <button type="button" class="addrow" onClick={() => setOpen(true)}><Icon name="plus" /> Add one I own (any brand)</button>;
  const save = () => {
    const watts = w === '' ? undefined : +w;
    if (!name.trim()) { setBad('Give it a name.'); return; }
    if (sp && (watts === undefined || !(watts >= sp.min && watts <= sp.max))) { setBad(`${sp.label} is needed, ${sp.min}-${sp.max} ${sp.unit}.`); return; }
    let ok = false; store.edit(s => { ok = addOwnAny(s, cat, name, watts); });
    if (ok) { setOpen(false); setName(''); setW(''); setBad(''); }
  };
  return (
    <div class="addown">
      <div class="row"><span class="lbl">Name</span><input class="input" value={name} placeholder="Brand and model" aria-label="Name" maxLength={50} onInput={e => setName((e.target as HTMLInputElement).value)} /><span /></div>
      {sp ? <div class="row"><span class="lbl">{sp.label}</span><span class="val"><input class="input num" type="number" min={sp.min} max={sp.max} value={w} aria-label={`${sp.label} (${sp.unit})`} onInput={e => setW((e.target as HTMLInputElement).value)} /><span class="unit">{sp.unit}</span></span></div> : null}
      {bad ? <div class="hint bad" role="alert">{bad}</div> : null}
      <div class="btns"><button type="button" class="btn sm primary" onClick={save}>Add to I own</button><button type="button" class="btn sm ghost" onClick={() => { setOpen(false); setBad(''); }}>Cancel</button></div>
    </div>
  );
}

/** One size band of a type: the band holding this tank is open, the others collapsed with their counts. */
function Band({ label, count, open, onToggle, tank, children }: { label: string; count: number; open: boolean; onToggle: () => void; tank: boolean; children: ComponentChildren }) {
  return (
    <div class={`band${open ? ' open' : ''}`}>
      <button type="button" class="bh" aria-expanded={open} onClick={onToggle}><Icon name="chev" />{label}{tank ? <span class="tk">this tank</span> : null}<span class="n">{count}</span></button>
      {open ? <div class="bb">{children}</div> : null}
    </div>
  );
}

const ORIENTS: { id: Orient; label: string }[] = [{ id: 'vertical', label: 'Vertical' }, { id: 'horizontal', label: 'Horizontal' }, { id: 'angled', label: 'Angled' }];

/** GD1: where the piece picked in the view sits. A heater gets its orientation on the glass face it is on (Vertical / Horizontal / Angled 45 deg);
 *  every piece says how to move it. Reads the view's pick (render/gearSel.ts), so it follows a click in the tank. */
function PlacementGroup({ store }: { store: Store }) {
  const [, tick] = useState(0);
  useEffect(() => onGearSel(() => tick(n => n + 1)), []);
  const g = gearSel(), S = g ? store.scene.tanks[g.vi] : undefined, isHeater = !!g && g.row.split('.')[0] === 'heater';
  const [open, setOpen] = useState(true);
  if (!g || !S) return <Group title="Placement" sum="click a piece in the tank" open={open} onToggle={() => setOpen(!open)}><div class="hint">Click a piece of equipment in the tank to pick it. Drag it along where it can mount; the arrow keys nudge it 0.25 in; Esc lets go.</div></Group>;
  const place = S.tech?.place?.[g.row] ?? g.from, cur = orientOf(place?.lean);
  const set = (o: Orient) => { if (!place) return; store.editTank(g.vi, t => { const tech = t.tech ?? { rows: {} }; t.tech = { ...tech, place: { ...tech.place, [g.row]: withOrient(place, o) } }; }); store.seal(); };
  const where = g.mount === 'rim' ? 'slides along the top rim' : g.mount === 'glass' ? 'drags on the inside glass' : g.mount === 'floor' ? 'drags on the substrate' : 'moves on the top';
  return (
    <Group title="Placement" sum={`${g.row.split('.')[0]} picked`} open={open} onToggle={() => setOpen(!open)}>
      {isHeater && place?.wall === 'floor' ? <div class="hint">Lying on the substrate. Drag it onto a glass face to stand it up or angle it.</div> : isHeater ? <div class="row"><span class="lbl">Orientation</span><span class="chips" role="group" aria-label="Heater orientation">{ORIENTS.map(o => <button type="button" class={`chip${cur === o.id ? ' on' : ''}`} aria-pressed={cur === o.id} data-orient={o.id} onClick={() => set(o.id)}>{o.label}</button>)}</span><span /></div> : null}
      <div class="hint">This one {where}. Arrow keys nudge it 0.25 in; Esc lets go.</div>
    </Group>
  );
}

function KindBody({ store, units, cat }: { store: Store; units: 'in' | 'cm'; cat: CatId }) {
  const [own, setOwn] = useState(true), [bands, setBands] = useState<Record<string, boolean>>({});
  const S = store.tank, v = categoryView(S, cat, units, { showAll: true }), tree = buyTree(S, cat, units), multiType = tree.length > 1;
  return (
    <div class="kb">
      {v.note ? <div class="catnote">{v.note}{v.roomLink ? <> <button type="button" class="linkbtn" onClick={() => gotoSection('constraints', 'home')}>Edit the room in Constraints</button></> : null}</div> : null}
      <Group title="I own" sum={v.owned.length ? `${v.owned.length} · ${ownSum(v.owned.length)}` : ownSum(0)} open={own} onToggle={() => setOwn(!own)}>
        {v.owned.map(r => <Row r={r} store={store} cat={cat} />)}
        <AddOwn store={store} cat={cat} key={cat} />
        <div class="hint">Owning is not the same as using: the plan prefers what you own, at $0, when it fits.</div>
      </Group>
      <div class="buyhead"><span>Buy</span><span class="sum">{v.buyTotal} · fits this tank, price</span></div>
      {tree.map(t => (
        <div class="type" data-type={t.label}>
          {multiType ? <div class="th">{t.label}<span class="n">{t.count}</span></div> : null}
          {t.bands.map(b => {
            const k = `${t.label}|${b.label}`, open = bands[k] ?? b.hasTank;
            return t.bands.length === 1 ? <div class="bb">{b.rows.map(r => <Row r={r} store={store} cat={cat} />)}</div>
              : <Band label={b.label} count={b.rows.length} tank={b.hasTank} open={open} onToggle={() => setBands({ ...bands, [k]: !open })}>{b.rows.map(r => <Row r={r} store={store} cat={cat} />)}</Band>;
          })}
        </div>
      ))}
      {cat === 'light' ? <LightingGroup store={store} /> : null}
    </div>
  );
}

export function EquipmentSection({ store, units }: { store: Store; units: 'in' | 'cm' }) {
  const S = store.tank, groups = categoryGroups(S), ladder = presetLadder(S);
  // CM2: a click on a piece of gear asks for its category: its group and its kind open
  const [sel] = useState(() => { const g = takeOpen('equipment'); if (g && isCat(g)) { saveCat(g); return g; } return loadCat(); });
  const [openG, setOpenG] = useState<Record<string, boolean>>(() => ({ [groupOfKind(S, sel) ?? 'filtration']: true }));
  const [openK, setOpenK] = useState<string | null>(sel);
  useEffect(() => { const f = () => { const g = takeOpen('equipment'); if (g && isCat(g)) { saveCat(g); setOpenK(g); const gid = groupOfKind(store.tank, g); if (gid) setOpenG(o => ({ ...o, [gid]: true })); } }; addEventListener(OPEN_EVENT, f); return () => removeEventListener(OPEN_EVENT, f); }, []);
  const pickKind = (id: string) => { const on = openK === id ? null : id; setOpenK(on); if (on) saveCat(on); };
  return (
    <div class="equip">
      {ladder.length ? <div class="ladder" role="group" aria-label="Setup level">{ladder.map(p => <button type="button" class={`chip${p.on ? ' on' : ''}`} aria-pressed={p.on} title="Set every row to this level" onClick={() => store.edit(s => applyPresetEdit(s, p.id))}>{p.label}</button>)}</div> : null}
      <PlacementGroup store={store} />
      {groups.map(g => {
        const open = !!openG[g.id];
        return (
          <Group id={g.id} title={g.label} sum={open ? undefined : g.kinds.map(k => `${k.label}: ${k.status}`).join(' · ')} open={open} onToggle={() => setOpenG({ ...openG, [g.id]: !open })}>
            {g.kinds.map(k => {
              const on = openK === k.id;
              return (
                <div class={`kind${on ? ' open' : ''}`} data-kind={k.id}>
                  <button type="button" class="kh" aria-expanded={on} onClick={() => pickKind(k.id)}><Icon name="chev" /><span class="kn">{k.label}</span><span class="ks">{k.owned ? `${k.status} · ${k.owned} own` : k.status}</span></button>
                  {on ? <KindBody store={store} units={units} cat={k.id} /> : null}
                </div>
              );
            })}
          </Group>
        );
      })}
    </div>
  );
}
