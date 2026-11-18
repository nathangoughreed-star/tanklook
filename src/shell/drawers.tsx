// UI2 shell step 1: the four check drawers, READ-ONLY (screen map §2a "Drawers"). They draw the view-models of logic/checks.ts;
// editing (Set my space, feeding, limits) comes with the sections that own those settings (§3: one home per setting).
import { useState } from 'preact/hooks';
import { openLimit } from './constraints';
import { openSection } from './open';
import { DEAL_NOTE, type ApplyPlan } from './logic/deals';
import { goTargetOf, type FixPlan, type GoTarget } from './logic/noteFixes';
import type { ChecksModel, CheckId, HabitatView, CostView, WaterView, NotesView } from './logic/checks';
import { CHECKS } from './logic/checks';
import { Icon, Meter, Pill } from './ui';

/** R117: "Fix it" takes the user to the section where the problem is fixed by hand. It navigates only: nothing is applied. */
function GoButton({ to }: { to: GoTarget }) {
  return <button type="button" class="btn fixit" data-goto={`${to.section}:${to.group}`} title={`Open ${to.label}`} onClick={() => openSection(to.section, to.group)}>Fix it</button>;
}

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
          {c.items.length ? <ul class="dlist">{c.items.map(t => <li>{t.text}{t.go ? <> <GoButton to={t.go} /></> : null}</li>)}</ul> : null}
        </div>
      ))}
      {v.reason ? <div class="hint">{v.reason}</div> : null}
    </>
  );
}

type Fig = 'setup' | 'upkeep' | 'minutes' | 'risk';
/** R138: the "Lower it?" button by the time estimate: a short list of what would cut the weekly time. Information only; nothing is applied. */
function LowerIt({ v }: { v: CostView }) {
  const [open, setOpen] = useState(false);
  const items = open ? v.lower() : [];
  return (
    <div class="lowerit">
      <button type="button" class="btn sm" aria-expanded={open} onClick={() => setOpen(!open)}>Lower it?</button>
      {open ? (items.length ? (
        <ul class="dlist money lowerlist">{items.map(i => (
          <li class="dbrk" data-lower={i.id}><span>{i.title}</span><b>{i.savesText.replace('saves about ', '−')}</b>
            <div class="hint dswap">{i.detail} {i.costText.charAt(0).toUpperCase() + i.costText.slice(1)}.{i.section ? <> <button type="button" class="spLink" onClick={() => openSection(i.section!)}>See it in Equipment</button></> : null}</div></li>
        ))}</ul>
      ) : <div class="hint">Nothing in this build would cut the time by a noticeable amount: it is already about as light as it gets.</div>) : null}
      {open && items.length ? <div class="hint">Best guesses to the nearest 5 minutes a week. Information only: nothing is applied or required.</div> : null}
    </div>
  );
}
/** R136: what Apply on the bundle card does, one line per swapped part; nothing changes until Apply is pressed in the confirm. */
export interface BundleApply { plan: (id: string) => ApplyPlan | undefined; apply: (p: ApplyPlan) => void }
function ApplyConfirm({ plan, onYes, onNo }: { plan: ApplyPlan; onYes: () => void; onNo: () => void }) {
  return (
    <div class="scrim" onClick={e => { if (e.target === e.currentTarget) onNo(); }}>
      <div class="dlg" role="dialog" aria-modal="true" aria-label="Apply this bundle" data-applybundle={plan.deal.id}>
        <div class="sec-head"><h2>Apply this bundle?</h2></div>
        <div class="sec-body">
          <div>{plan.title}, {plan.price}: saves about {plan.saving} against buying the parts.</div>
          <div class="cap">Swapped into your build</div>
          <ul class="dlist">{plan.lines.map(l => <li>{l}</li>)}</ul>
          {plan.worse.length ? <><div class="cap">Also worse for this build</div><ul class="dlist">{plan.worse.map(l => <li>{l}</li>)}</ul></> : null}
          {plan.loses.length ? <><div class="cap">What you lose</div><ul class="dlist">{plan.loses.map(l => <li>{l}</li>)}</ul></> : null}
          <div class="hint">The bundle's parts are held like a kit start (unlock one to change it), and Cost and time prices the bundle. Undo puts your parts back. Your animals, plants and hardscape do not change.</div>
          <div class="dacts"><button type="button" class="btn" data-applycancel onClick={onNo}>Cancel</button><button type="button" class="btn primary" data-applyyes onClick={onYes}>Apply</button></div>
        </div>
      </div>
    </div>
  );
}

function Cost({ v, bundle }: { v: CostView | null; bundle?: BundleApply }) {
  const [sel, setSel] = useState<Fig>('setup');
  const [ask, setAsk] = useState<ApplyPlan | null>(null);
  if (!v) return <div class="hint">No price yet: choose a tank first.</div>;
  const d = sel === 'setup' ? null : v.detail(sel);
  const fig = (id: Fig, cap: string, big: string) => (
    <button type="button" class={'dfig' + (sel === id ? ' on' : '')} aria-pressed={sel === id} onClick={() => setSel(id)}>
      <span class="cap">{cap}</span><span class="big">{big}</span>
    </button>
  );
  return (
    <>
      <div class="dnums">
        {fig('setup', 'To set up', v.setup)}{fig('upkeep', 'Upkeep', v.monthly)}{fig('minutes', 'Time', v.minutes)}
      </div>
      {fig('risk', 'Relative difficulty', `${v.risk} / 10 · ${v.riskWord}`)}
      <div class="hint">Difficulty uses your Experience constraint (off means an average keeper). <button type="button" class="spLink" onClick={() => openLimit('experience')}>Edit in Constraints</button></div>
      <div class="hint">Budget and monthly limit live in <button type="button" class="spLink" onClick={() => openLimit('money')}>Constraints</button>. Time is a best guess to the nearest 5 min, never a limit.</div>
      {v.deal ? (
        <div class="dealbox" data-deal={v.deal.id}>
          <span class="t">A bundle close to your build</span>
          <span><a href={v.deal.url} target="_blank" rel="noopener" title="A plain retailer link, not sponsored">{v.deal.retailer} {v.deal.name} ↗</a></span>
          <span class="m"><b>{v.deal.price}</b>{v.deal.was ? <> <s>{v.deal.was}</s></> : null} · saves about {v.deal.saving} against buying the parts</span>
          {v.deal.worse.length ? <span class="hint warn">Worse for this build: {v.deal.worse.join('; ')}.</span> : null}
          <span class="hint">Comes with: {v.deal.includes}. As of {v.deal.asOfText}{v.deal.guessed ? ' (some details guessed)' : ''}; {DEAL_NOTE}.</span>
          {bundle ? <button type="button" class="btn sm applybundle" data-applybundle-open onClick={() => setAsk(bundle.plan(v.deal!.id) ?? null)}>Apply</button> : null}
        </div>
      ) : null}
      {ask && bundle ? <ApplyConfirm plan={ask} onNo={() => setAsk(null)} onYes={() => { bundle.apply(ask); setAsk(null); }} /> : null}
      {v.gearSales ? <div class="hint">{v.gearSales.n === 1 ? '1 gear sale fits' : `${v.gearSales.n} gear sales fit`} this tank{v.gearSales.first ? `, such as ${v.gearSales.first.title} (${v.gearSales.first.off}% off)` : ''}: see On sale now in Equipment.</div> : null}
      <LowerIt v={v} />
      <div class="cap">{d ? d.title : 'Costs most to set up'}</div>
      {d ? (
        <>
          {d.rhythm ? <div class="hint" title={d.rhythm.note}>Rhythm: {d.rhythm.text} <em>(estimate)</em>{d.rhythm.away ? <><br />Can be left: {d.rhythm.away}</> : null}</div> : null}
          {d.rows.length ? <ul class="dlist money">{d.rows.map(r => (
            <li class="dbrk"><span>{r.label}</span><b>{r.value}</b>{r.swaps.map(s => <div class="hint dswap">{s}</div>)}</li>
          ))}</ul> : <div class="hint">{d.empty}</div>}
          {d.warnings.length ? <><div class="cap">Why</div>{d.warnings.map(w => <div class="dwarn warn">{w}</div>)}</> : null}
        </>
      ) : (
        <>
          <ul class="dlist money">{v.rows.map(r => <li><span>{r.label}</span><b>{r.setup}</b></li>)}</ul>
          {v.detail('setup').rows.some(r => r.swaps.length) ? <div class="cap">Swaps that lower it</div> : null}
          <ul class="dlist money">{v.detail('setup').rows.filter(r => r.swaps.length).map(r => (
            <li class="dbrk"><span>{r.label}</span><b>{r.value}</b>{r.swaps.map(x => <div class="hint dswap">{x}</div>)}</li>
          ))}</ul>
        </>
      )}
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
          {r.chart ? <div class="clwrap" dangerouslySetInnerHTML={{ __html: r.chart }} />
            : r.per.length ? <ul class="dlist money">{r.per.map(p => <li><span>{p.name}</span><Pill tone={p.tone}>{p.word}</Pill></li>)}</ul>
            : <div class="hint">No animals with temperature data yet: the default range is shown.</div>}
        </div>
      ))}
    </>
  );
}

/** NF1: one button per kind of fix. The hover / focus tooltip says exactly what it changes; on touch (no hover) the same text always shows under the button. */
function FixButtons({ fixes, onFix }: { fixes: FixPlan[]; onFix: (p: FixPlan) => void }) {
  return (
    <div class="fixes">
      {fixes.map(p => (
        <div class="fixbtn" data-fix={p.kind}>
          <button type="button" class="btn primary fixgo" aria-describedby={`fixtip-${p.kind}`} onClick={() => onFix(p)}><b>{p.label}</b><span>{p.what}</span></button>
          <div class="fixtip" role="tooltip" id={`fixtip-${p.kind}`}>{p.describe}</div>
        </div>
      ))}
    </div>
  );
}

function Notes({ v, onFix }: { v: NotesView; onFix?: (p: FixPlan) => void }) {
  if (!v.count) return <div class="hint">No notes: nothing in this design is over a limit or against advice.</div>;
  return (
    <>
      {v.info ? <div class="hint">{v.info}</div> : null}
      {v.groups.map(g => (
        <div class="dcat"><div class="cap">{g.title}</div><ul class="dlist">{g.items.map(i => <li>{i.text}{i.relax ? <i class="hint"> Smallest change: {i.relax}.</i> : null}{goTargetOf(i.id) ? <> <GoButton to={goTargetOf(i.id)!} /></> : null}</li>)}</ul></div>
      ))}
      {onFix && v.fixes.length ? <FixButtons fixes={v.fixes} onFix={onFix} /> : null}
    </>
  );
}

/** One check's read-only content (also drawn once per tank by Compare's drawer). */
export function DrawerBody({ id, model }: { id: CheckId; model: ChecksModel }) {
  return id === 'habitat' ? <Habitat v={model.habitat} /> : id === 'cost' ? <Cost v={model.cost} /> : id === 'water' ? <Water v={model.water} /> : <Notes v={model.notes} />;
}

export function Drawer({ id, model, onClose, onFix, bundle }: { id: CheckId; model: ChecksModel; onClose: () => void; onFix?: (p: FixPlan) => void; bundle?: BundleApply }) {
  const title = CHECKS.find(c => c.id === id)!.title;
  return (
    <aside class="drawer" aria-label={title}>
      <div class="sec-head"><h2>{title}</h2><button type="button" class="btn icon ghost" title="Close (Esc)" aria-label="Close" onClick={onClose}><Icon name="x" /></button></div>
      <div class="sec-body">
        {id === 'habitat' ? <Habitat v={model.habitat} /> : id === 'cost' ? <Cost v={model.cost} bundle={bundle} /> : id === 'water' ? <Water v={model.water} /> : <Notes v={model.notes} onFix={onFix} />}
        <div class="hint dro">{id === 'notes' ? (model.notes.fixes.length && onFix ? 'Each button makes one change and is one undo step. A note with no button has no exact fix: change it in its own section.' : 'These notes have no exact one-click fix: change each in its own section.') : 'Read-only for now: each setting is changed in its own section.'}</div>
      </div>
    </aside>
  );
}
