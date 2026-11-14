// UI2 shell step 8 (lane S8, 2026-11-13): the Settings section (rail bottom; screen map §2a): US / Metric, Rules, Graphics (lane GS1's modules), Help, Scene data.
// Draws logic/settings.ts; the graphics wording and storage are render/fxPrefs.ts + render/perf.ts, not the old DOM.
import { useEffect, useState } from 'preact/hooks';
import type { Store } from '../scene/store';
import type { Viewer } from '../render/viewer';
import { LEVELS, perf, onPerf, setLevel, setAuto, backToFull, AUTO_QUALITY } from '../render/perf';
import { FX, onFx } from '../render/fx';
import { chooseFx, lockedByUrl, restoreFxDefaults } from '../render/fxPrefs';
import { sceneFile } from '../ui/logic/files';
import { Group } from './ui';
import { Seg, Toggle } from './tank';
import { KEYS } from './logic/view';
import { UNIT_OPTS, UNIT_NOTE, RULE_OPTS, RULE_NOTE, setUnits, chooseRules, rulesNow, graphicsModel, HELP } from './logic/settings';

const GROUPS_KEY = 'tanklook.ui2.settings';
const loadOpen = (): Record<string, boolean> => { try { return { gfx: false, help: false, data: false, ...JSON.parse(localStorage.getItem(GROUPS_KEY) ?? '{}') }; } catch { return { gfx: false, help: false, data: false }; } };

function Graphics({ store, getViewer }: { store: Store; getViewer: () => Viewer | undefined }) {
  const [, bump] = useState(0);
  useEffect(() => {
    const a = onPerf(() => bump(n => n + 1)), b = onFx(() => bump(n => n + 1)), t = setInterval(() => { if (!document.hidden) bump(n => n + 1); }, 1000);
    return () => { a(); b(); clearInterval(t); };
  }, []);
  const v = getViewer();
  const m = graphicsModel(perf, LEVELS.map(l => l.name), FX, lockedByUrl(), v?.causState().why ?? 'moving');
  const render = store.tank.render;
  return (
    <>
      <div class="row"><span class="lbl" title="Slow or jerky when you orbit and pan? Each step trades a little picture for speed.">Performance</span>
        <input class="slider" type="range" min={0} max={LEVELS.length - 1} step={1} value={m.level} aria-label="Performance" onInput={e => setLevel(+(e.target as HTMLInputElement).value)} />
        <span class="val">{m.levelName}</span></div>
      {AUTO_QUALITY ? <Toggle on={m.auto} label={<>Auto <span class="hint">{m.fps}</span></>} onFlip={setAuto} /> : null}
      <div class="hint">{m.reason}</div>
      {m.showBackToFull ? <button type="button" class="btn sm" onClick={() => backToFull()}>Back to Full quality</button> : null}
      <div class="subh">Effects (this browser only)</div>
      {m.rows.map(r => r.kind === 'switch'
        ? <span title={r.help}><Toggle on={r.on} label={<>{r.label} <span class="hint">{r.tag}</span></>} onFlip={on => { if (!r.locked) chooseFx({ [r.key]: on } as never); }} /></span>
        : <div class="row" title={r.help}><span class="lbl">{r.label}</span>
          <select class="select" disabled={r.locked} value={r.choice} aria-label={r.label} onChange={e => chooseFx({ [r.key]: +(e.target as HTMLSelectElement).value } as never)}>{m.tones.map((n, i) => <option value={i}>{n}</option>)}</select>
          <span class="hint">{r.tag}</span></div>)}
      <div class="hint" role="status">{m.caustics.text}</div>
      <div class="acts-row">{m.caustics.retry ? <button type="button" class="btn sm" onClick={() => v?.causRetry()}>Try again</button> : null}
        <button type="button" class="btn sm" title="Every effect back to what ships" onClick={() => restoreFxDefaults()}>Restore defaults</button></div>
      <div class="subh">The picture</div>
      <div class="row"><span class="lbl">Fish edges</span>
        <select class="select" value={render.edge} aria-label="Fish edges" onChange={e => store.update(s => { for (const t of s.tanks) t.render.edge = (e.target as HTMLSelectElement).value as typeof render.edge; })}>
          <option value="a2c">Smooth, see-through fins</option><option value="cutout">Crisp, solid fins (faster)</option></select></div>
      <div class="row"><span class="lbl" title="Lifts fish off busy backgrounds: brighter colour and a darker outline. 0 = plain lighting.">Fish stand out</span>
        <input class="slider" type="range" min={0} max={100} step={5} value={Math.round(render.pop * 100)} aria-label="Fish stand out"
          onInput={e => store.update(s => { for (const t of s.tanks) t.render.pop = +(e.target as HTMLInputElement).value / 100; })} onChange={() => store.seal()} />
        <span class="val">{Math.round(render.pop * 100)}</span></div>
      <Toggle on={!!v?.sway} label="Plants sway in the current" onFlip={on => { v?.setSway(on); bump(n => n + 1); }} />
      <Toggle on={!!v?.hideOverhead} label="Hide the light fixture when looking down from above it" onFlip={on => {
        if (v) { v.hideOverhead = on; v.invalidate(); } try { localStorage.setItem(KEYS.hideLight, on ? 'on' : 'off'); } catch { /* lasts this visit */ } bump(n => n + 1); }} />
      <Toggle on={render.grid} label={`Grid on back wall and floor (${store.scene.units === 'in' ? '2″' : '5 cm'})`} onFlip={on => store.edit(s => { s.render.grid = on; })} />
    </>
  );
}

function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })), a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export function SettingsSection({ store, getViewer }: { store: Store; getViewer: () => Viewer | undefined }) {
  const [open, setOpen] = useState(loadOpen);
  const flip = (k: string) => { const n = { ...open, [k]: !open[k] }; setOpen(n); try { localStorage.setItem(GROUPS_KEY, JSON.stringify(n)); } catch { /* lasts this visit */ } };
  const [copied, setCopied] = useState(false);
  const u = store.scene.units, rules = rulesNow(store);
  return (
    <>
      <div class="sgroup"><h3>Units</h3>
        <Seg value={u} opts={UNIT_OPTS} label="Units" onPick={x => setUnits(store, x)} /><div class="hint">{UNIT_NOTE[u]}</div></div>
      <div class="sgroup"><h3>Rules</h3>
        <Seg value={rules} opts={RULE_OPTS} label="Rules" onPick={r => chooseRules(store, r)} /><div class="hint">{RULE_NOTE[rules]}</div></div>
      <Group title="Graphics" sum={open.gfx ? undefined : 'quality, effects, picture'} open={open.gfx} onToggle={() => flip('gfx')}><Graphics store={store} getViewer={getViewer} /></Group>
      <Group title="Help" open={open.help} onToggle={() => flip('help')}>
        {HELP.map(h => <div class="helpblk"><b>{h.title}</b>{h.lines.map(l => <div class="hint">{l}</div>)}</div>)}
      </Group>
      <Group title="Scene data (JSON)" sum={open.data ? undefined : 'download, copy'} open={open.data} onToggle={() => flip('data')}>
        <div class="hint">The whole design as one JSON file: the same file Save as writes.</div>
        <div class="acts-row">
          <button type="button" class="btn sm" onClick={() => { const f = sceneFile(store.scene); download(f.text, f.filename); }}>Download JSON</button>
          <button type="button" class="btn sm" onClick={async () => { try { await navigator.clipboard.writeText(sceneFile(store.scene).text); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { setCopied(false); } }}>{copied ? 'Copied' : 'Copy JSON'}</button>
        </div>
      </Group>
    </>
  );
}
