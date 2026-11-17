// LW1: the open-top / lid warning and the heater / chiller hold-the-temperature warnings in the shell.
import { describe, expect, it } from 'vitest';
import { bareSetup } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { emptyScene } from '../src/scene/defaults';
import { fixPlans } from '../src/shell/logic/noteFixes';
import { lidIssues, tempIssues, lidView, lidFix, setNoLid } from '../src/shell/logic/lidTemp';
import { heatLoss, tempEvidence, techOf } from '../src/scene/tech';
import { lidFreeChosen } from '../src/data/lidNeed';
import type { Fish, TankSetup } from '../src/scene/types';

const fish = (species: string, id: number): Fish => ({ id, species, x: 100, y: 100, depth: 100, yaw: 0, pitch: 0, roll: 0, bend: 0 }) as unknown as Fish;
function wet(sp: string[], lid: TankSetup['lid'] = 'open'): TankSetup {
  const s = bareSetup(); s.water.on = true; s.lid = lid; s.fish = sp.map((x, i) => fish(x, i + 1)); return s;
}

describe('open-top warning', () => {
  it('trumpet snail: warned', () => { expect(lidIssues(wet(['trumpet'])).length).toBe(1); });
  it('fires for an animal that gets out of an open top, and not with a lid', () => {
    const s = wet(['betta']);
    const i = lidIssues(s); expect(i.map(x => x.id)).toEqual(['lid:open']); expect(i[0].text).toMatch(/open top|needs a lid/);
    expect(lidIssues(wet(['betta'], 'glass'))).toEqual([]);
    expect(lidIssues(wet(['neon']))).toEqual([]);
  });
  it('the fix adds the engine lid, prices it, and is one undo step', () => {
    const s = wet(['betta']), price = (t: TankSetup) => (t.lid === 'glass' ? 39 : 0);
    const plans = fixPlans(s, lidIssues(s), { price }), p = plans.find(x => x.kind === 'lid')!;
    expect(p.what).toBe('Add a glass top (about $39)'); expect(p.describe).toContain('about $39'); expect(p.label).toBe('Fix this');
    const st = new Store(emptyScene()); st.tank.water.on = true; st.tank.fish = s.fish; st.tank.lid = 'open';
    const before = st.canUndo ? 1 : 0; st.editTank(st.scene.active, t => p.apply(t));
    expect(st.tank.lid).toBe('glass'); st.undo(); expect(st.tank.lid).toBe('open'); void before;
  });
  it('withdraws a "lid-free" choice when the lid goes on; the choice is a brief flag', () => {
    const s = wet(['betta']); setNoLid(s, true); expect(lidFreeChosen(s.brief)).toBe(true);
    expect(lidView(s).lidFree).toBe(true); expect(lidIssues(s)[0].text).toMatch(/^You chose no lid/);
    const f = lidFix(s)!; f.apply(s); expect(s.lid).toBe('glass'); expect(lidFreeChosen(s.brief)).toBe(false);
  });
});

describe('hold the temperature', () => {
  const cold = (): TankSetup => { const s = wet(['neon']); s.tech = { rows: { heater: 'one' }, roomC: 10, targetC: 25, heaterW: 25 } as TankSetup['tech']; return s; };
  it('warns when a small heater cannot hold the target in a cold room, and the fix is a bigger heater that holds it', () => {
    const s = cold(), ev = tempEvidence(s)!; expect(ev.heatHolds).toBe(false);
    const ids = tempIssues(s).map(x => x.id); expect(ids).toContain('temp:hold:weak');
    const p = fixPlans(s, tempIssues(s)).find(x => x.kind === 'heater')!; expect(p).toBeTruthy(); expect(p.describe).toMatch(/Replaces the 25 W heater/);
    const t = structuredClone(s); p.apply(t); expect(tempEvidence(t)!.heatHolds).toBe(true);
    expect(heatLoss(t).totalW).toBeGreaterThanOrEqual(heatLoss(t).lossW);
    expect(tempIssues(t).map(x => x.id)).not.toContain('temp:hold:weak');
  });
  it('no heater and a target above the room: warns, and adds one', () => {
    const s = cold(); s.tech = { rows: { heater: 'none' }, roomC: 10, targetC: 25 } as TankSetup['tech'];
    expect(tempIssues(s).map(x => x.id)).toContain('temp:hold:noheater');
    const p = fixPlans(s, tempIssues(s)).find(x => x.kind === 'heater')!; const t = structuredClone(s); p.apply(t);
    expect(techOf(t).rows.heater).not.toBe('none'); expect(tempEvidence(t)!.heatHolds).not.toBe(false);
  });
  it('a room warmer than the tank should be: chiller warning and fix', () => {
    const s = wet(['neon']); s.tech = { rows: { heater: 'none' }, roomC: 32, targetC: 24 } as TankSetup['tech'];
    expect(tempIssues(s).some(x => x.id === 'temp:hold:cool' || x.id === 'temp:chiller')).toBe(true);
    const p = fixPlans(s, tempIssues(s)).find(x => x.kind === 'chiller')!; expect(p.describe).toMatch(/Adds a chiller/);
    const t = structuredClone(s); p.apply(t); expect(techOf(t).rows.chiller).toBe('chiller');
    expect(tempIssues(t).filter(x => x.id.startsWith('temp:hold:cool') || x.id === 'temp:chiller')).toEqual([]);
  });
  it('a dry tank and a fine setup say nothing; a measured temp out of range is warning only', () => {
    const d = wet(['neon']); d.water.on = false; expect(tempIssues(d)).toEqual([]);
    const s = wet(['neon']); s.tech = { rows: { heater: 'one' }, measuredC: 10 } as TankSetup['tech'];
    const i = tempIssues(s); expect(i.map(x => x.id)).toContain('temp:measured');
    expect(fixPlans(s, i).filter(x => x.kind === 'heater' || x.kind === 'chiller')).toEqual([]);
  });
});
