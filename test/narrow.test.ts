// Suggest round 1 (lane GV6, narrowing rounds retired by VD5): taste from picks and passes, and "I like this one" (make it mine).
import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../src/demand/types';
import { narrowTaste, suggestSetups, type Wants } from '../src/demand/suggest';

const P = defaultProfile(), NOW = Date.parse('2026-10-27');
const W: Wants = { kinds: ['freshwater'], constraints: { startupUsd: { on: true, value: 600 }, monthlyUsd: { on: true, value: 40 }, minutesPerWeek: { on: true, value: 60 } } };
const round1 = suggestSetups(W, P, 'cm', NOW).proposals;
const vars = round1;

describe('round 1', () => {
  it('has options, and a pick feeds taste: a pass per other look shown, then the pick', () => {
    expect(round1.length).toBeGreaterThanOrEqual(3);
    const ev = narrowTaste(round1, 0), pick = round1[0].build.finish?.style;
    if (pick) expect(ev[ev.length - 1]).toEqual({ style: pick, kind: 'pick' });
    for (const e of ev.slice(0, -1)) { expect(e.kind).toBe('reject'); expect(e.style).not.toBe(pick); }
  });
});

describe('make it mine', () => {
  it('applies the option to the tank, keeps the brief, and Undo brings the old tank back', async () => {
    const { Store } = await import('../src/scene/store');
    const { defaultScene } = await import('../src/scene/defaults');
    const { makeItMine } = await import('../src/ui/suggest');
    const st = new Store(defaultScene()), was = structuredClone(st.scene), brief = st.tank.brief, v = vars[0];
    makeItMine(st, v);
    expect(st.scene.name).toBe(v.archetype.title);
    expect(st.tank.tank.L).toBe(v.build.setup.tank.L);
    expect(st.tank.fish.map(f => f.species).sort()).toEqual(v.build.animals.flatMap(a => Array(a.n).fill(a.species)).sort());
    // lane GV10: the brief is kept, with the chosen tank in its Tank row
    const { emptyBrief, setTank } = await import('../src/ui/setupBrief');
    expect(st.tank.brief).toEqual(setTank(brief ?? emptyBrief(), { id: v.build.tank.id }));
    st.undo();
    expect(st.scene.name).toBe(was.name);
    expect(st.scene.tanks.map(t => [t.tank, t.fish.length, t.items.length])).toEqual(was.tanks.map(t => [t.tank, t.fish.length, t.items.length]));
  });
});
