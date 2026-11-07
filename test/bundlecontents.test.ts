// Every kit / bundle in the catalogue: what its listing says is in the box is what the record holds, and what the Sandbox start gives (Nathan 2026-11-07: an Imagitarium LED kit
// drew as a bare tank, and a Red Sea REEF-FRAME MAX, with a skimmer and pump but no filter flag, started with no filtration while costing twice the plain one).
import { describe, expect, it } from 'vitest';
import { TANK_MODELS } from '../src/data/tanks';
import { sandboxRoomScene } from '../src/scene/sandboxRoom';
import { dockGroups, includesText, isBundle, previewSetup, startGear } from '../src/ui/tankDockLogic';

const rows = TANK_MODELS.flatMap(m => (m.variants ?? []).filter(isBundle).map(v => ({ m, v })));
const gear = { filter: /\b(filter|filtration|sump|skimmer|canister|hob)\b/i, heater: /\bheater\b/i, light: /\b(light|led)\b/i, stand: /\b(stand|cabinet)\b/i };
// the contents sentence of a note: before dims / variant chatter
const contents = (v: { line?: string; price_note?: string }) => `${v.line ?? ''} | ${(v.price_note ?? '').split(/\. |Variants|[Dd]ims|Maker |Page |page also|Some color|Listing|Size selector|includes list|; Prices|; Item/)[0]}`;
const WORDS: Record<string, string> = { filter: 'filter|filtration|sump|skimmer|canister|hob', skimmer: 'skimmer', ato: 'ato', pump: 'pump', heater: 'heater', light: 'light|led', stand: 'stand|cabinet' };
// "no heater", "no filter or heater", "without a stand": a no / without ahead of the word, in the same clause
const negated = (k: string, t: string) => new RegExp(String.raw`\b(no|without|not include\w*|excl\w*|sold separately)\b[^;,.]*?\b(${WORDS[k]})\b`, 'i').test(t);

describe('every bundle holds what its listing says it comes with', () => {
  it('there are bundles to check', () => expect(rows.length).toBeGreaterThan(300));
  for (const [k, re] of Object.entries(gear)) it(`a listing that names ${k} has the ${k} flag`, () => {
    const bad = rows.filter(({ v }) => re.test(contents(v)) && !negated(k, contents(v)) && !(v.includes as Record<string, unknown> | undefined)?.[k]).map(({ v }) => `${v.brand} ${v.line}`);
    expect(bad).toEqual([]);
  });
  it('a listing that names a skimmer, pump or auto top-off records it as an extra', () => {
    const lacks = (v: (typeof rows)[number]['v'], w: 'skimmer' | 'ato' | 'pump') => new RegExp(String.raw`\b${w}\b`, 'i').test(contents(v)) && !negated(w, contents(v)) && !v.includes?.extras?.includes(w);
    const bad = rows.filter(({ v }) => lacks(v, 'skimmer') || lacks(v, 'ato') || lacks(v, 'pump')).map(({ v }) => `${v.brand} ${v.line}`);
    expect(bad).toEqual([]);
  });
});

describe('a bundle starts the Sandbox with everything it comes with', () => {
  const opts = dockGroups('freshwater').concat(dockGroups('saltwater' as never)).flatMap(g => g.bands.flatMap(b => b.opts)).filter(o => o.v && isBundle(o.v) && !o.v.kit);
  it('has bundle rows', () => expect(opts.length).toBeGreaterThan(100));
  it('a light that comes with it is drawn, and a filter that comes with it is kept', () => {
    const bad: string[] = [];
    for (const o of opts) {
      const inc = o.v!.includes ?? {}, S = sandboxRoomScene('freshwater').tanks[0], p = previewSetup(S, o, true);
      if (inc.light && p.light.type === 'flat') bad.push(`${o.name}: light not drawn`);
      if (inc.light && p.lid === 'open' && !inc.lid) bad.push(`${o.name}: no lid for the light`);
      const g = startGear(p, o);
      if (inc.filter && g && g.rows.filter === 'none') bad.push(`${o.name}: filter dropped`);
      if (inc.heater && g && g.rows.heater === 'none') bad.push(`${o.name}: heater dropped`);
    }
    expect(bad).toEqual([]);
  });
  it('the two REEF-FRAME 170 kits both start with filtration, and the MAX says why it costs more', () => {
    const std = opts.find(o => /REEF-FRAME 170/.test(o.name))!, max = opts.find(o => /REEF-FRAME MAX 170/.test(o.name))!;
    expect(std && max).toBeTruthy();
    expect(includesText(max.v)).toMatch(/skimmer.*pump.*auto top-off/);
    expect(includesText(std.v)).toMatch(/sump/);
  });
});
