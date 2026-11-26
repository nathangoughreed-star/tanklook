// Lane HV: the user sees the displayed severity, the generator avoids what the audit capped. A neon + Endler's tank (GH 1-12 against 15-35) shows Caution to the
// user, and the generator-facing verdict (verdictOf with avoid: true) still gates on it.
import { describe, expect, it } from 'vitest';
import { stockSummary, avoidedLine } from '../src/ui/stockSummary';
import { stockingMemo } from '../src/scene/stocking';
import { tileState } from '../src/ui/fullnessTile';
import { verdictOf } from '../src/scene/verdict';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { inferTech } from '../src/scene/tech';
import { emptyBrief } from '../src/scene/brief';
import type { TankSetup } from '../src/scene/types';

const base = (): TankSetup => { const sc = parseScene(JSON.parse(SCENES[Object.keys(SCENES).find(k => { const t = parseScene(JSON.parse(SCENES[k])).scene; return t.tanks[t.active].water.on; })!])).scene; return sc.tanks[sc.active]; };
const tank = (): TankSetup => { const S = base(), f0 = S.fish[0]; return { ...S, tech: { rows: { ...inferTech(S).rows, heater: 'one', filter: 'hob' } }, fish: ['neon', 'endler'].flatMap((id, i) => [0, 1, 2, 3, 4, 5].map(j => ({ ...f0, species: id, id: 100 * i + j }))), tank: { ...S.tank, L: 1500, D: 600, H: 500 } } as TankSetup; };
const gates = (S: TankSetup, avoid: boolean) => verdictOf(S, emptyBrief(), { units: 'in', ...(avoid ? { avoid: true } : {}) }).gates.filter(g => /hardness|chemistry/.test(g.text));

describe('displayed severity vs what the generator avoids', () => {
  it('neon + Endler\'s: the user sees Caution, never Problem, for the water mismatch', () => {
    const S = tank(), sm = stockSummary(S, stockingMemo(S), tileState(S, stockingMemo(S), 'in').mins, 'in');
    const lines = sm.cats.flatMap(c => c.items).filter(i => /water (hardness|chemistry)/.test(i.text));
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every(i => i.level === 'caution' && i.capped)).toBe(true);
    expect(lines.every(avoidedLine)).toBe(true);
  });
  it('the user-facing verdict does not gate on it; the generator-facing verdict does', () => {
    const S = tank();
    expect(gates(S, false)).toEqual([]);
    expect(gates(S, true).length).toBeGreaterThan(0);
  });
});
