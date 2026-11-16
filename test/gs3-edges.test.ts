// GS3: edge finish (raw / ground / flat polish / beveled) for the whole tank: default, warnings, and the saved spec round trip.
import { describe, expect, it } from 'vitest';
import { parseSpec, parseEdge, type CustomTankSpec } from '../src/scene/customTanks';
import { defaultEdge, edgeOf, edgeSummary, edgeWarnings } from '../src/shell/logic/edges';
import { defaultSetup } from '../src/scene/defaults';

describe('GS3 edge finish', () => {
  it('a rimless tank defaults to polished edges, a rimmed one to ground', () => {
    expect(defaultEdge(false)).toBe('polish'); expect(defaultEdge(true)).toBe('ground');
    expect(edgeOf(undefined, false)).toBe('polish'); expect(edgeOf('bevel', false)).toBe('bevel');
  });
  it('summary and warnings: raw on a visible edge, a bevel on thin glass, nothing for the usual finishes', () => {
    expect(edgeSummary('polish')).toBe('flat polished edges');
    expect(edgeWarnings('polish', 9.5, false)).toEqual([]);
    expect(edgeWarnings('raw', 9.5, false).join(' ')).toMatch(/rimless/);
    expect(edgeWarnings('raw', 9.5, true).join(' ')).toMatch(/trim/);
    expect(edgeWarnings('bevel', 4.76, false).join(' ')).toMatch(/1\/4 in/);
    expect(edgeWarnings('bevel', 6.35, false)).toEqual([]);
  });
  it('is saved with the custom tank and a bad value is dropped; 3/32 and 2.5 mm glass are accepted', () => {
    const base: CustomTankSpec = { name: 'T', tank: defaultSetup().tank, glass: 'auto', glassType: 'standard', rim: false, edge: 'bevel' };
    expect(parseSpec(JSON.parse(JSON.stringify(base)))!.edge).toBe('bevel');
    expect(parseEdge('shiny')).toBeUndefined();
    expect(parseSpec({ ...JSON.parse(JSON.stringify(base)), edge: 'x' })!.edge).toBeUndefined();
    for (const g of [2.38, 2.5, 3.18]) expect(parseSpec({ ...JSON.parse(JSON.stringify(base)), glass: g })!.glass, `glass ${g}`).toBeCloseTo(g, 1);
  });
});
