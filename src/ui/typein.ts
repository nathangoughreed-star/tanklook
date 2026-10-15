// Type-in values for sliders: click (or Tab to and press Enter on) the readout next to a slider and type an exact number.
// The slider stays; the typed value goes through the slider's own input handler, so undo, coalescing and clamping to
// the slider's range are the same as for a drag. Step snapping is skipped, so 30" really is 30".
import type { Units } from '../scene/types';
import { IN } from '../scene/physics';

/** How a slider's raw value reads in the box: `show` turns it into the number typed, `parse` turns typed text back
 *  (null = not understood). */
export interface TypeIn { show: (v: number) => number | string; parse: (t: string) => number | null }

const NUM = String.raw`-?\d+(?:\.\d+)?|-?\.\d+`;

/** A length in mm from typed text: a bare number is in the scene's units; 30", 30 in, 76 cm, 760 mm, 1.2 m, 5'10, 5 ft 10 in. */
export function parseLen(text: string, u: Units): number | null {
  const t = text.trim().toLowerCase().replace(/[′’]/g, "'").replace(/[″”]/g, '"').replace(/,/g, '.');
  const ft = t.match(new RegExp(String.raw`^(${NUM})\s*(?:'|ft|feet|foot)\s*(?:(${NUM})\s*(?:"|in|inch|inches)?)?$`));
  if (ft) return (+ft[1] * 12 + (ft[2] ? +ft[2] : 0) * Math.sign(+ft[1] || 1)) * IN;
  const m = t.match(new RegExp(String.raw`^(${NUM})\s*("|in|inch|inches|cm|mm|m)?$`));
  if (!m) return null;
  const n = +m[1], unit = m[2] ?? (u === 'in' ? 'in' : 'cm');
  return n * ({ '"': IN, in: IN, inch: IN, inches: IN, cm: 10, mm: 1, m: 1000 } as Record<string, number>)[unit];
}

export const plainNum = (t: string): number | null => {
  const m = t.trim().replace(/,/g, '.').match(new RegExp(String.raw`^(${NUM})\s*(?:[°%×xkw]|µmol|umol)?\s*$`, 'i'));
  return m ? +m[1] : null;
};

/** Round for the box: no float noise, at most `d` decimals. */
export const tidy = (v: number, d = 2) => String(+v.toFixed(d));

/** Make each readout in `specs` (keyed by slider id) editable. The readout is the slider's next sibling <output>. */
export function attachTypeIns(specs: Record<string, TypeIn>) {
  for (const [id, spec] of Object.entries(specs)) {
    // the readout is usually the slider's next sibling; some rows put a hint or a wrapper between them (Total Power,
    // Colour temp), so fall back to the row's own <output>
    const range = document.getElementById(id) as HTMLInputElement | null;
    const next = range?.nextElementSibling;
    const out = (next?.tagName === 'OUTPUT' ? next : range?.closest('.row')?.querySelector(':scope > output')) as HTMLOutputElement | null;
    if (!range || !out) continue;
    out.classList.add('typein'); out.tabIndex = 0; out.title = 'Click to type an exact value';
    // restoring the step snaps the slider (760 mm for a typed 30"), so the box reopens on the typed value while the
    // slider has not moved since
    let typed: { v: number; at: string } | null = null;
    const open = () => {
      if (range.disabled || range.hidden || out.hidden) return;
      const box = document.createElement('input');
      box.type = 'text'; box.className = 'typeinBox'; box.value = String(spec.show(typed && typed.at === range.value ? typed.v : +range.value));
      box.setAttribute('aria-label', (range.labels?.[0]?.textContent ?? id) + ', exact value');
      out.hidden = true; out.after(box); box.focus(); box.select();
      let done = false;
      const close = (commit: boolean, refocus = true) => {
        if (done) return; done = true;
        const v = commit ? spec.parse(box.value) : null;
        box.remove(); out.hidden = false;
        if (commit && v == null && box.value.trim()) { out.classList.add('bad'); setTimeout(() => out.classList.remove('bad'), 900); }
        if (v != null && Number.isFinite(v)) {
          const step = range.step;
          range.step = 'any'; range.value = String(v); // the range clamps to min..max
          range.dispatchEvent(new Event('input', { bubbles: true })); range.dispatchEvent(new Event('change', { bubbles: true }));
          const v1 = +range.value; range.step = step; typed = { v: v1, at: range.value };
        }
        if (refocus) out.focus();
      };
      box.onkeydown = e => {
        if (e.key === 'Enter') { e.preventDefault(); close(true); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(false); }
      };
      box.onblur = () => close(true, false);
    };
    out.onclick = open;
    out.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'F2') { e.preventDefault(); open(); } };
  }
}
