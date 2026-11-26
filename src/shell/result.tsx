// FD unit 2 (R162): the one card over a full-width tank: what it is, what it costs, whether it will work, and the two ways on.
// The verdict is the Habitat check (which reads scene/lifeSupport.ts's lifeSupportOf for a missing heater or filter) plus that list's own lines, so the card cannot disagree with the Habitat drawer.
import type { Store } from '../scene/store';
import type { ChecksModel } from './logic/checks';
import { lifeSupportOf } from '../scene/lifeSupport';
import { setResult, nextIndex, type Result } from './logic/result';
import { Pill } from './ui';

export function ResultCard({ store, model, result, onMine, onAnother }: { store: Store; model: ChecksModel; result: Result; onMine: () => void; onAnother: (r: Result) => void }) {
  const h = model.habitat, c = model.cost, missing = lifeSupportOf(store.tank, store.scene.units === 'in');
  const another = () => result.kind === 'example' ? onAnother({ ...result, i: nextIndex(result.i, result.list.length) }) : onAnother(result);
  return (
    <div class="ov resultcard glass" role="region" aria-label="This tank">
      <div class="rcname"><b>{store.scene.name}</b><span class="dim">{h.sizeLine ? ` · ${h.sizeLine}` : ''}</span></div>
      <div class="rccost">{c ? <><b>{c.setup}</b><span class="dim"> to set up · {c.monthly} · {c.minutes}</span></> : <span class="dim">No price yet</span>}</div>
      <div class="rcverdict"><Pill tone={h.pill.tone}>{h.pill.word}</Pill>{h.reason ? <span class="rcreason"> {h.reason}</span> : null}</div>
      {missing.length ? <ul class="rcmiss">{missing.map(m => <li>{m.text}</li>)}</ul> : null}
      <div class="acts rcacts">
        <button type="button" class="btn primary" onClick={onMine}>Make it mine</button>
        <button type="button" class="btn ghost" onClick={another}>{result.kind === 'example' ? 'See another' : result.kind === 'animal' ? 'Pick different animals' : 'Start my own'}</button>
      </div>
    </div>
  );
}
export { setResult };
