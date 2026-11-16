// GS3: edge finish (raw / ground / flat polish / beveled) per pane group: defaults, warnings, and the saved spec round trip.
import { describe, expect, it } from 'vitest';
import { parseSpec, parseEdges, type CustomTankSpec } from '../src/scene/customTanks';
import { defaultEdges, edgeSummary, edgeWarnings, edgesOf, sameEdge } from '../src/shell/logic/edges';
import { defaultSetup } from '../src/scene/defaults';

describe('GS3 edge finish', () => {
  it('a rimless tank defaults to polished edges, a rimmed one to ground', () => {
    expect(sameEdge(defaultEdges(false))).toBe('polish'); expect(sameEdge(defaultEdges(true))).toBe('ground');
    expect(edgesOf(undefined, false)).toEqual(defaultEdges(false));
    expect(edgesOf({ front: 'bevel', ends: 'polish', bottom: 'ground' }, false).front).toBe('bevel');
  });
  it('summary and warnings: raw on a visible edge, a bevel on thin glass, nothing for the usual finishes', () => {
    expect(edgeSummary(defaultEdges(false))).toBe('flat polished edges');
    expect(edgeSummary({ front: 'polish', ends: 'ground', bottom: 'raw' })).toBe('edges flat polished / ground / raw');
    expect(edgeWarnings(defaultEdges(false), 9.5, false)).toEqual([]);
    expect(edgeWarnings({ front: 'raw', ends: 'polish', bottom: 'polish' }, 9.5, false).join(' ')).toMatch(/rimless/);
    expect(edgeWarnings({ front: 'bevel', ends: 'bevel', bottom: 'bevel' }, 4.76, false).join(' ')).toMatch(/1\/4 in/);
    expect(edgeWarnings({ front: 'bevel', ends: 'bevel', bottom: 'bevel' }, 6.35, false)).toEqual([]);
  });
  it('is saved with the custom tank and a bad value is dropped; 3/32 and 2.5 mm glass are accepted', () => {
    const base: CustomTankSpec = { name: 'T', tank: defaultSetup().tank, glass: 'auto', glassType: 'standard', rim: false, edges: { front: 'polish', ends: 'bevel', bottom: 'ground' } };
    expect(parseSpec(JSON.parse(JSON.stringify(base)))!.edges).toEqual(base.edges);
    expect(parseEdges({ front: 'polish', ends: 'shiny', bottom: 'ground' })).toBeUndefined();
    expect(parseSpec({ ...JSON.parse(JSON.stringify(base)), edges: 'x' })!.edges).toBeUndefined();
    for (const g of [2.38, 2.5, 3.18]) expect(parseSpec({ ...JSON.parse(JSON.stringify(base)), glass: g })!.glass, `glass ${g}`).toBeCloseTo(g, 1);
  });
});
