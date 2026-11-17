// Lane PB1 (R100): the Plumbing view's flow graph is derived from the tank's gear; plain sums, rated flow only.
import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { techOf } from '../src/scene/tech';
import * as TE from '../src/scene/techEdit';
import { plumbingOf } from '../src/shell/logic/plumbing';
import type { TankSetup } from '../src/scene/types';

const load = (k: string): TankSetup => { const sc = parseScene(JSON.parse(SCENES[k])).scene; return sc.tanks[sc.active]; };
const bare = (): TankSetup => { const S = structuredClone(load('planted')); S.tech = { rows: { filter: 'none', heater: 'none', co2: 'none', air: 'none', flow: 'none', skimmer: 'none', ato: 'none', uv: 'none', chiller: 'none' }, filterless: true, preset: 'custom' }; return S; };
const canister = (...ids: string[]): TankSetup => {
  const S = structuredClone(load('planted'));
  S.tech = { rows: { ...techOf(S).rows, filter: 'canister', co2: 'pressurized' }, filters: [{ kind: 'canister', product: 'fluval-307' }], preset: 'custom' };
  if (ids.length) TE.commitTech(S, s => ({ ...techOf(s), returnInline: ids }));
  return S;
};

describe('PB1 plumbing graph', () => {
  it('a tank with no gear is calmly empty, never an error', () => {
    const p = plumbingOf(bare());
    expect(p.empty).toBe(true); expect(p.loop).toBe('none'); expect(p.warnings).toEqual([]); expect(p.sums.turnover).toBe(0);
  });
  it('a canister: tank -> canister -> in-line gear -> tank, turnover = rated GPH / gallons', () => {
    const p = plumbingOf(canister('hydor-eth-200-5-8', 'co2art-inline-5-8'));
    expect(p.loop).toBe('canister');
    expect(p.chain.map(n => n.kind)).toEqual(['heater', 'inline']);
    const water = p.edges.filter(e => e.flow === 'dirty' || e.flow === 'clean').map(e => `${e.from}>${e.to}`);
    expect(water[0]).toBe('tank>filter0'); expect(water.at(-1)).toMatch(/>tank$/);
    expect(p.sums.filterGph).toBe(303); expect(p.sums.turnover).toBeCloseTo(303 / p.gal, 1);
    expect(p.sums.heaterW).toBe(200);
    expect(p.edges.some(e => e.flow === 'co2' && e.to === p.chain[1].id)).toBe(true); // the cylinder feeds the reactor, not an in-tank diffuser
    expect(p.edges.some(e => e.flow === 'heat' && e.from === p.chain[0].id)).toBe(true);
    expect(p.nodes.some(n => n.id === 'diffuser')).toBe(false);
  });
  it('CO2 with no in-line reactor gets a diffuser in the tank and the two sinks', () => {
    const p = plumbingOf(canister());
    expect(p.nodes.some(n => n.id === 'diffuser' && n.inTank)).toBe(true);
    expect(p.edges.filter(e => e.flow === 'co2' && e.from === 'tank').map(e => e.to).sort()).toEqual(['air', 'plants']);
  });
  it('overflow data absent = no warning; a return pump out-running its overflow warns', () => {
    const S = structuredClone(load('planted')); S.tech = { rows: { ...techOf(S).rows, filter: 'sump' }, filters: [{ kind: 'sump' }], preset: 'custom' };
    const p0 = plumbingOf(S); expect(p0.loop).toBe('sump'); expect(p0.warnings).toEqual([]);
    const gph = p0.sums.returnGph!; expect(gph).toBeGreaterThan(0);
    expect(plumbingOf(S, { overflowGph: gph + 100 }).warnings).toEqual([]);
    expect(plumbingOf(S, { overflowGph: gph - 1 }).warnings.length).toBe(1);
  });
  it('a reef: the skimmer drains to its cup and the sump is the loop', () => {
    const p = plumbingOf(load('reef'));
    expect(p.empty).toBe(false);
    expect(p.nodes.some(n => n.id === 'skimmer') === p.edges.some(e => e.flow === 'waste')).toBe(true);
    expect(p.sums.turnover).toBeGreaterThanOrEqual(0);
  });
  it('the chosen overflow box rates the warning and the sums (PB2 data); no choice = no check', () => {
    const S = structuredClone(load('planted')); Object.assign(S.tank, { L: 1219, D: 457, H: 508 });
    S.tech = { rows: { ...techOf(S).rows, filter: 'sump' }, filters: [{ kind: 'sump' }], preset: 'custom' };
    expect(plumbingOf(S).warnings).toEqual([]);
    S.tech.products = { overflow: 'eshopps-pf-300' };
    const p = plumbingOf(S); expect(p.sums.overflowGph).toBe(300); expect(p.sums.returnGph).toBeGreaterThan(300);
    expect(p.warnings.length).toBe(1); expect(p.warnings[0]).toContain('300 GPH');
    S.tech.products = { overflow: 'eshopps-pf-800' }; expect(plumbingOf(S).warnings).toEqual([]);
  });
});
