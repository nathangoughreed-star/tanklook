// UI2 shell step 5 (lane S5, 2026-11-14): the Constraints section (screen map §2a): the ONE home of every limit. Draws logic/constraints.ts + logic/fit.ts;
// every write goes through the old UI's `setBrief` (brief + the copy the old cost panel reads), the experience switch through demand/experience.ts.
import { useEffect, useState } from 'preact/hooks';
import type { Store } from '../scene/store';
import type { UserProfile } from '../demand';
import { bindBriefStore, setBrief } from '../ui/setupBrief';
import { makeItMine } from '../ui/suggest';
import { getExperience, onExperience, setAllLevels, setAreaLevel, setExperienceOn, LEVEL_NAME, type Level } from '../demand/experience';
import { Group } from './ui';
import { Seg, Toggle } from './tank';
import {
  limitsModel, setCap, setCapOn, setNoNew, setSpaceDims, setSpaceOn, setRoomF, setWater, setKwh, setRisk, WATER_LABEL, RISK_OPTS, WATERS, usd,
  type CapKey, type LimitGroup,
} from './logic/constraints';
import { openSection } from './open';
import { takeOpen } from './logic/sections';
import { runFit, type FitRun } from './logic/fit';

const KEY = 'tanklook.ui2.constraints';
const ORDER: LimitGroup[] = ['money', 'space', 'experience', 'home', 'fit'];
const loadOpen = (): Record<string, boolean> => { try { return { money: true, space: false, experience: true, home: false, fit: false, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return { money: true, space: false, experience: true, home: false, fit: false }; } };

/** A limit line elsewhere in the shell asks Constraints to open at a group: `openLimit('home')` (App opens the section; this reads the ask). */
export const openLimit = (group: LimitGroup) => openSection('constraints', group);
const takeAsk = (): LimitGroup | undefined => takeOpen('constraints') as LimitGroup | undefined;

const num = (v: string): number | undefined => { const n = parseFloat(v); return Number.isFinite(n) ? n : undefined; };

function NumRow({ label, unit, value, step, onSet, placeholder, off, onOff, hint }: { label: string; unit: string; value: number | undefined; step: number; onSet: (n: number | undefined) => void; placeholder?: string; off?: boolean; onOff?: (on: boolean) => void; hint?: string }) {
  return (
    <div class={`row limrow${off ? ' off' : ''}`}>
      <span class="lbl">{label}</span>
      <span class="val"><input class="input num" type="number" min={0} step={step} inputMode="decimal" value={value ?? ''} placeholder={placeholder ?? 'no limit'} aria-label={`${label} (${unit})`}
        key={`${label}-${value ?? ''}`} onChange={e => onSet(num((e.target as HTMLInputElement).value))} /><span class="unit">{unit}</span></span>
      {onOff ? <button type="button" class={`btn sm limsw${off ? '' : ' on'}`} role="switch" aria-checked={!off} disabled={value === undefined} title={off ? 'Not checked: switch on to check it' : 'Checked: switch off to ignore it'} onClick={() => onOff(!!off)}>{off ? 'Off' : 'On'}</button> : null}
      {hint ? <div class="hint limhint">{hint}</div> : null}
    </div>
  );
}

export function ConstraintsSection({ store, profile }: { store: Store; profile: () => UserProfile }) {
  const [, bump] = useState(0);
  const [open, setOpen] = useState(loadOpen);
  const [detail, setDetail] = useState(false);
  const [fit, setFit] = useState<FitRun | undefined>();
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState('');
  useEffect(() => { bindBriefStore(store); }, [store]);
  useEffect(() => store.subscribe(k => { if (k !== 'view' && k !== 'select') bump(n => n + 1); }), [store]);
  useEffect(() => onExperience(() => bump(n => n + 1)), []);
  const focus = () => { const g = takeAsk(); if (!g) return; const n = { ...open, [g]: true }; setOpen(n); requestAnimationFrame(() => document.getElementById(`lim-${g}`)?.scrollIntoView?.({ block: 'start' })); };
  useEffect(() => { focus(); const f = () => focus(); addEventListener('ui2:open', f); return () => removeEventListener('ui2:open', f); });   // eslint-disable-line react-hooks/exhaustive-deps
  const flip = (k: string) => { const n = { ...open, [k]: !open[k] }; setOpen(n); try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* lasts this visit */ } };

  const units = store.scene.units, brief = store.tank.brief;
  bindBriefStore(store);
  const m = limitsModel(brief, units, getExperience());
  const write = (fn: (b: typeof brief) => NonNullable<typeof brief>) => { setBrief(fn(store.tank.brief)); setFit(undefined); };
  const sum = (g: LimitGroup) => g === 'money' ? m.moneyText : g === 'space' ? m.space.text : g === 'experience' ? m.exp.text : g === 'home' ? m.home.text : '';
  const run = () => {
    setBusy(true); setSaid('');
    setTimeout(() => { try { setFit(runFit(store.tank.brief ?? { v: 0, items: {} } as never, profile(), store.scene.units)); } catch (e) { setSaid(`Could not work that out: ${(e as Error).message}`); } setBusy(false); }, 30);
  };
  const use = (i: number) => {
    const p = fit?.res.proposals[i]; if (!p) return;
    const r = makeItMine(store, p);
    setSaid('refused' in r ? r.refused : `${p.archetype.title} is now your design. Undo steps back.`);
  };

  return (
    <>
      <div class="hint limintro">Every limit lives here. Other sections read them; none keeps its own copy.</div>

      <div id="lim-money"><Group title="Money and time" sum={open.money ? undefined : sum('money')} open={open.money} onToggle={() => flip('money')}>
        {m.money.map(r => <NumRow label={r.label} unit={r.unit} value={r.value} step={r.step} off={r.value !== undefined && !r.on}
          onSet={v => write(b => setCap(b, r.key as CapKey, v))} onOff={on => write(b => setCapOn(b, r.key as CapKey, on))} />)}
        <Toggle on={m.noNew} label={<>No new equipment <span class="hint">spend nothing beyond what I have</span></>} onFlip={on => write(b => setNoNew(b, on))} />
        <div class="hint">A switched-off limit keeps its number and is not checked.</div>
      </Group></div>

      <div id="lim-space"><Group title="Space" sum={open.space ? undefined : sum('space')} open={open.space} onToggle={() => flip('space')}>
        <div class="row limrow"><span class="lbl">Fits in</span>
          <span class="val dims"><input class="input num" type="number" min={0} step="any" inputMode="decimal" aria-label={`Width (${m.space.unit})`} placeholder="wide" key={`w${m.space.w ?? ''}`} value={m.space.w ?? ''}
            onChange={e => write(b => setSpaceDims(b, num((e.target as HTMLInputElement).value), m.space.d, units))} />
            <span class="unit">x</span>
            <input class="input num" type="number" min={0} step="any" inputMode="decimal" aria-label={`Depth (${m.space.unit})`} placeholder="deep" key={`d${m.space.d ?? ''}`} value={m.space.d ?? ''}
              onChange={e => write(b => setSpaceDims(b, m.space.w, num((e.target as HTMLInputElement).value), units))} /><span class="unit">{m.space.unit}</span></span></div>
        {m.space.w !== undefined ? <Toggle on={m.space.on} label="Check the tank against this space" onFlip={on => write(b => setSpaceOn(b, on))} /> : null}
        <div class="hint">The footprint of the spot, not the tank. The tank picker and Suggest keep to it while it is on.</div>
      </Group></div>

      <div id="lim-experience"><Group title="Experience" sum={open.experience ? undefined : sum('experience')} open={open.experience} onToggle={() => flip('experience')}>
        <Toggle on={m.exp.on} label={<>Count my experience <span class="hint">optional</span></>} onFlip={on => { if (on && m.exp.one === undefined) setAllLevels(0); setExperienceOn(on); }} />
        {m.exp.on ? (
          <>
            <Seg<string> value={m.exp.one === undefined ? '' : String(m.exp.one)} label="My experience, one answer for all"
              opts={([0, 1, 2] as Level[]).map(l => [String(l), LEVEL_NAME[l]] as [string, string])} onPick={v => setAllLevels(+v as Level)} />
            <div class="hint">{m.exp.one === undefined ? 'Set per area below.' : 'One answer for every area.'} Animals, plants and gear rated harder than this are left out of Discover and Suggest and greyed in the pickers.</div>
            <button type="button" class="btn sm ghost" aria-expanded={detail} onClick={() => setDetail(!detail)}>{detail ? 'Less detail' : 'More detail'}</button>
            {detail ? m.exp.rows.map(r => <div class="row"><span class="lbl">{r.label}</span>
              <Seg<string> value={String(r.level)} label={r.label} opts={([0, 1, 2] as Level[]).map(l => [String(l), LEVEL_NAME[l]] as [string, string])} onPick={v => setAreaLevel(r.area, +v as Level)} /></div>) : null}
          </>
        ) : <div class="hint" id="expoff">{m.exp.off}</div>}
      </Group></div>

      <div id="lim-home"><Group title="Your home" sum={open.home ? undefined : sum('home')} open={open.home} onToggle={() => flip('home')}>
        <NumRow label="Room temperature" unit="deg F" value={m.home.roomF} step={1} placeholder="not set" onSet={v => write(b => setRoomF(b, v))} />
        <div class="row"><span class="lbl">Water for changes</span>
          <select class="select" aria-label="Water source" value={m.home.water ?? ''} onChange={e => { const v = (e.target as HTMLSelectElement).value; write(b => setWater(b, v ? v as never : undefined)); }}>
            <option value="">Not set</option>{WATERS.map(w => <option value={w}>{WATER_LABEL[w]}</option>)}</select></div>
        <NumRow label="Electricity" unit="$ per kWh" value={m.home.kwh} step={0.01} placeholder="not set" onSet={v => write(b => setKwh(b, v))} />
        <div class="row"><span class="lbl">Difficulty limit</span>
          <select class="select" aria-label="How much risk is fine" value={m.home.risk ?? ''} onChange={e => { const v = (e.target as HTMLSelectElement).value; write(b => setRisk(b, v ? v as never : undefined)); }}>
            <option value="">Not set</option>{RISK_OPTS.map(([v, t]) => <option value={v}>{t}</option>)}</select></div>
        <div class="hint">Stored once, in this design. The Equipment heater row, the Water and Cost drawers read it from here.</div>
      </Group></div>

      <div id="lim-fit"><Group title="If it does not all fit" open={open.fit} onToggle={() => flip('fit')}>
        <div class="hint">Suggest reads the limits above (no fields of its own) and fills in what you left open.</div>
        <button type="button" class="btn primary wide" disabled={busy} onClick={run}>{busy ? 'Working it out...' : 'Fill in what I left open'}</button>
        {said ? <div class="hint" role="status">{said}</div> : null}
        {fit ? (fit.cards.length ? <div class="fitlist" aria-label="Suggested setups">{fit.cards.map(c => (
          <div class="card fitcard" data-i={c.i}>
            <div class="t"><b>{c.title}</b></div>
            <div class="m">{c.tank}: {c.animals}</div>
            <div class="m fitfig"><b>{c.setup}</b> set-up · {c.monthly} · {c.minutes}</div>
            {c.note ? <div class="m">{c.note}</div> : null}
            {c.checks.length ? <div class="m">{c.checks.slice(0, 2).join(' · ')}</div> : null}
            <button type="button" class="btn sm primary" onClick={() => use(c.i)}>I like this one</button>
          </div>))}</div>
          : <div class="hint" role="status" id="fitnone">{fit.message}</div>) : null}
        {fit && fit.cards.length ? <div class="hint">{m.money[0].value !== undefined && m.money[0].on ? `Each one passes your ${usd(m.money[0].value)} set-up limit.` : 'No set-up limit is on, so these are ranked by appeal.'}</div> : null}
      </Group></div>
    </>
  );
}
export { ORDER };
