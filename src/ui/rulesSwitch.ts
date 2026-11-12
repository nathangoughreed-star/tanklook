// DQ9: the header Guided / Sandbox toggle (brief.project.rules). Switching changes ONLY that field: the design is never touched. Sandbox -> Guided on a design that
// breaks a gate shows the violations (the Checks strip's own issues) and offers `solve` fixes one at a time; a fix is applied only when the person presses Apply.
import type { Store } from '../scene/store';
import { rulesOf, setRules } from '../scene/brief';
import { verdictOf, type VerdictOpts } from '../scene/verdict';
import { propose, type DiscoveryProposal } from '../scene/discover';
import { TABS } from '../scene/scope';
import { applyProposal } from '../scene/proposal';
import { violationsOf } from '../scene/rules';
import { editBrief, getBrief, onBrief } from './setupBrief';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function attachRulesSwitch(store: Store, opts: () => VerdictOpts = () => ({})) {
  const g = document.getElementById('rulesGuided'), sb = document.getElementById('rulesSandbox');
  if (!g || !sb) return;
  const sync = () => { const r = rulesOf(getBrief()); g.setAttribute('aria-pressed', String(r === 'guided')); sb.setAttribute('aria-pressed', String(r === 'sandbox')); g.classList.toggle('on', r === 'guided'); sb.classList.toggle('on', r === 'sandbox'); };
  onBrief(sync); store.subscribe(k => { if (k === 'load') sync(); }); sync();
  const issues = () => { try { return violationsOf(verdictOf(store.tank, getBrief(), { units: store.scene.units, ...opts() })); } catch { return []; } };

  let panel: HTMLDivElement | undefined, note = '', offer: DiscoveryProposal | undefined;
  const close = () => { panel?.remove(); panel = undefined; offer = undefined; note = ''; };
  function draw() {
    const bad = issues();
    if (!bad.length && !note) return close();
    if (!panel) { panel = document.createElement('div'); panel.className = 'dq9-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Switched to Guided'); document.body.append(panel); }
    panel.innerHTML = `<b>Guided rules are on.</b> ${bad.length ? `This design breaks ${bad.length} check${bad.length === 1 ? '' : 's'}. Nothing was changed.` : 'Every check passes now.'}`
      + `<ul>${bad.map(i => `<li>${esc(i.text)}${i.relax ? ` <i>Smallest change: ${esc(i.relax)}.</i>` : ''}</li>`).join('')}</ul>`
      + (offer ? `<p class="dq9-fix"><b>A fix:</b> ${esc(offer.summary || offer.source)}</p><button data-a="apply">Apply this fix</button><button data-a="skip">Show another</button>` : bad.length ? '<button data-a="fix">Show me a fix</button>' : '')
      + (note ? `<p class="dq9-note">${esc(note)}</p>` : '')
      + `<button data-a="sandbox">Back to Sandbox</button><button data-a="close">${bad.length ? 'Keep as is' : 'Done'}</button>`;
    panel.onclick = e => {
      const a = (e.target as HTMLElement).dataset?.a; if (!a) return;
      if (a === 'close') return close();
      if (a === 'sandbox') { close(); return editBrief(b => setRules(b, 'sandbox')); }
      if (a === 'apply' && offer) { const r = applyProposal(store, offer); note = r.ok ? '' : 'The design changed since this fix was made. Show me a fix again.'; offer = undefined; return draw(); }
      // fix / skip: one fix at a time; "Show another" asks for several and shows one that differs from the one on screen
      const seen = a === 'skip' && offer ? offer.summary : '';
      let found: DiscoveryProposal | undefined; note = '';
      try {
        const d = propose(store, getBrief(), { scope: [...TABS], objective: 'solve' }, 3, opts());
        found = d.proposals.find(p => p.summary !== seen) ?? d.proposals[0];
        if (!found) note = d.noSolution ? `No single fix: ${d.noSolution.relaxations.slice(0, 3).join('; ')}.` : 'No fix found.';
      } catch { note = 'No fix found.'; }
      offer = found; draw();
    };
  }
  g.onclick = () => { if (rulesOf(getBrief()) === 'guided') return; editBrief(b => setRules(b, 'guided')); if (issues().length) draw(); };
  sb.onclick = () => { close(); if (rulesOf(getBrief()) !== 'sandbox') editBrief(b => setRules(b, 'sandbox')); };
  store.subscribe(k => { if (panel && k === 'scene') draw(); });
}
