// UI2 shell step 1: the four check drawers, READ-ONLY (screen map §2a "Drawers"). They draw the view-models of logic/checks.ts;
// editing (Set my space, feeding, limits) comes with the sections that own those settings (§3: one home per setting).
import type { ChecksModel, CheckId, HabitatView, CostView, WaterView, NotesView } from './logic/checks';
import { CHECKS } from './logic/checks';
import { Icon, Meter, Pill } from './ui';

function Habitat({ v }: { v: HabitatView }) {
  return (
    <>
      <div class="drow"><span class="cap">Verdict</span><Pill tone={v.pill.tone}>{v.pill.word}</Pill></div>
      <div class="hint">{v.sizeLine}</div>
      {v.empty ? <div class="hint">No animals in the water yet: the check fills in as you add them.</div> : null}
      {v.warnings.map(w => <div class={`dwarn ${w.tone}`}>{w.text}</div>)}
      {v.bars.map(b => (
        <div class="dbar">
          <div class="drow"><span>{b.label}</span><b>{b.bar.text}</b></div>
          <Meter fill={b.bar.fill} tone={b.tone} label={b.label} />
          {b.topLines.length ? <ul class="dlist">{b.topLines.map(t => <li>{t}</li>)}</ul> : null}
        </div>
      ))}
      {v.cats.length ? <div class="cap">By topic</div> : null}
      {v.cats.map(c => (
        <div class="dcat">
          <div class="drow"><span>{c.label}</span><Pill tone={c.tone}>{c.word}</Pill></div>
          {c.items.length ? <ul class="dlist">{c.items.map(t => <li>{t}</li>)}</ul> : null}
        </div>
      ))}
      {v.reason ? <div class="hint">{v.reason}</div> : null}
    </>
  );
}

function Cost({ v }: { v: CostView | null }) {
  if (!v) return <div class="hint">No price yet: choose a tank first.</div>;
  return (
    <>
      <div class="dnums">
        <div><div class="cap">To set up</div><div class="big">{v.setup}</div></div>
        <div><div class="cap">Upkeep</div><div class="big">{v.monthly}</div></div>
        <div><div class="cap">Time</div><div class="big">{v.minutes}</div></div>
      </div>
      <div class="drow"><span>Relative difficulty</span><span><b>{v.risk}</b> / 10 · {v.riskWord}</span></div>
      <div class="hint">Difficulty is for the experience saved in this browser (new to it unless set); it becomes the optional Experience constraint in a later step.</div>
      <div class="cap">Costs most to set up</div>
      <ul class="dlist money">{v.rows.map(r => <li><span>{r.label}</span><b>{r.setup}</b></li>)}</ul>
    </>
  );
}

function Water({ v }: { v: WaterView }) {
  if (!v.rows.length) return <div class="hint">Nothing to say about the water yet.</div>;
  return (
    <>
      {v.rows.map(r => (
        <div class="dcat">
          <div class="drow"><b>{r.label}</b></div>
          <div>{r.line}</div>
          {r.note ? <div class="hint">{r.note}</div> : null}
          {r.per.length ? <ul class="dlist money">{r.per.map(p => <li><span>{p.name}</span><Pill tone={p.tone}>{p.word}</Pill></li>)}</ul>
            : <div class="hint">No animals with temperature data yet: the default range is shown.</div>}
        </div>
      ))}
    </>
  );
}

function Notes({ v }: { v: NotesView }) {
  if (!v.count) return <div class="hint">No notes: nothing in this design is over a limit or against advice.</div>;
  return (
    <>
      {v.info ? <div class="hint">{v.info}</div> : null}
      {v.groups.map(g => (
        <div class="dcat"><div class="cap">{g.title}</div><ul class="dlist">{g.items.map(i => <li>{i.text}{i.relax ? <i class="hint"> Smallest change: {i.relax}.</i> : null}</li>)}</ul></div>
      ))}
    </>
  );
}

export function Drawer({ id, model, onClose }: { id: CheckId; model: ChecksModel; onClose: () => void }) {
  const title = CHECKS.find(c => c.id === id)!.title;
  return (
    <aside class="drawer" aria-label={title}>
      <div class="sec-head"><h2>{title}</h2><button type="button" class="btn icon ghost" title="Close (Esc)" aria-label="Close" onClick={onClose}><Icon name="x" /></button></div>
      <div class="sec-body">
        {id === 'habitat' ? <Habitat v={model.habitat} /> : id === 'cost' ? <Cost v={model.cost} /> : id === 'water' ? <Water v={model.water} /> : <Notes v={model.notes} />}
        <div class="hint dro">Read-only for now: each setting is changed in its own section.</div>
      </div>
    </aside>
  );
}
