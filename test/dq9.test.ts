// DQ9: Guided / Sandbox rules (brief.project.rules): default and migration, picker gating by mode, Sandbox Discover gates, the switch keeps the design byte-identical.
import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { SPECIES, getSpecies } from '../src/data/species';
import { OK_FIT, offeredIn, tankKind } from '../src/scene/pickerKind';
import { pickerReader } from '../src/ui/pickerStrict';
import { emptyBrief, parseBrief, projectExtras, rulesOf, setProjectExtras, setRules } from '../src/scene/brief';
import { blockingIssues, discoverGates, violationsOf } from '../src/scene/rules';
import { verdictOf } from '../src/scene/verdict';
import { propose } from '../src/scene/discover';
import { TABS } from '../src/scene/scope';
import { Store } from '../src/scene/store';
import type { TankSetup } from '../src/scene/types';

const base = (): TankSetup => { const sc = parseScene(JSON.parse(SCENES[Object.keys(SCENES).find(k => { const t = parseScene(JSON.parse(SCENES[k])).scene; return t.tanks[t.active].water.on && !t.tanks[t.active].water.salt; })!])).scene; return sc.tanks[sc.active]; };
const crowded = (): TankSetup => { const S = base(); let id = 1; return { ...S, fish: Array.from({ length: 60 }, () => ({ ...S.fish[0], id: id++, species: 'danio' })) }; };

describe('DQ9 rules field', () => {
  it('defaults to guided; an old save (no project) and a brief with a project but no rules read as guided', () => {
    expect(rulesOf(emptyBrief())).toBe('guided');
    expect(rulesOf(setProjectExtras(emptyBrief(), { world: 'aquarium' }))).toBe('guided');
    expect(rulesOf(parseBrief({ v: 4, items: {} }) ?? emptyBrief())).toBe('guided');
  });
  it('sandbox round-trips through JSON; guided is not stored; junk reads as guided', () => {
    const b = setRules(emptyBrief(), 'sandbox');
    expect(projectExtras(b).rules).toBe('sandbox');
    const again = parseBrief(JSON.parse(JSON.stringify(b)));
    expect(again && rulesOf(again)).toBe('sandbox');
    const back = setRules(b, 'guided');
    expect(back).toEqual(emptyBrief());   // nothing left behind: byte-identical to never having switched
    expect(rulesOf(setProjectExtras(emptyBrief(), { rules: 'wild' as never }))).toBe('guided');
    expect(projectExtras(setProjectExtras(emptyBrief(), { rules: 'guided' })).rules).toBeUndefined();
  });
  it('the switch changes only the rules field of the brief and keeps other project answers', () => {
    const b0 = setProjectExtras(emptyBrief(), { world: 'aquarium', lidFree: true });
    const b1 = setRules(b0, 'sandbox');
    expect(projectExtras(b1)).toEqual({ world: 'aquarium', lidFree: true, rules: 'sandbox' });
    expect(setRules(b1, 'guided')).toEqual(b0);
  });
});

describe('DQ9 picker gate by mode', () => {
  it('guided grays what adds a Caution / Problem; sandbox grays nothing', () => {
    const S = crowded(), offered = SPECIES.filter(s => offeredIn(s, tankKind(S)) && !S.fish.some(f => f.species === s.id));
    const g = pickerReader('guided', S, 'in', () => OK_FIT), sb = pickerReader('sandbox', S, 'in', () => OK_FIT);
    expect(offered.filter(s => g(s).level !== 'ok').length).toBeGreaterThan(5);
    expect(offered.every(s => sb(s).level === 'ok')).toBe(true);
    expect(g(getSpecies('oscar')!).level).not.toBe('ok');
  });
});

describe('DQ9 Discover gates (D7)', () => {
  it('sandbox keeps the welfare gates, drops only the limits; guided keeps both', () => {
    expect(discoverGates('guided')).toEqual({ welfare: true, limits: true });
    expect(discoverGates('sandbox')).toEqual({ welfare: true, limits: false });
    const v = { gates: [{ id: 'g', tab: 'animals', uids: [], text: 'room' }], hard: [{ id: 'h', tab: 'tank', uids: [], text: 'budget' }], targets: [], advisories: [], feasible: false } as never;
    expect(blockingIssues(v, 'guided').map(i => i.id)).toEqual(['g', 'h']);
    expect(blockingIssues(v, 'sandbox').map(i => i.id)).toEqual(['g']);
  });
});

describe('DQ9 switching keeps the design byte-identical', () => {
  it('Sandbox -> Guided on an overcrowded tank changes nothing but the field; the gates show; a fix is only a proposal', () => {
    const S = crowded(), before = JSON.stringify(S.fish), b = setRules(emptyBrief(), 'sandbox');
    const v = verdictOf(S, b), bad = violationsOf(v);
    expect(bad.length).toBeGreaterThan(0);
    expect(bad.some(i => i.id === 'stock:room' || i.id === 'stock:filter' || i.id.startsWith('cat:'))).toBe(true);
    const g = setRules(b, 'guided');
    expect(JSON.stringify(S.fish)).toBe(before);
    expect(verdictOf(S, g).gates.map(i => i.id)).toEqual(v.gates.map(i => i.id));   // the same checks in both modes
    // the solve offer is a proposal against a copy: the store is untouched until applyProposal
    const store = new Store(); store.update(s => { s.tanks[s.active] = S; }, { history: false });
    const rev = store.rev, snap = JSON.stringify(store.scene);
    propose(store, g, { scope: [...TABS], objective: 'solve' }, 1);
    expect(store.rev).toBe(rev); expect(JSON.stringify(store.scene)).toBe(snap);
  });
});
