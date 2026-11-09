// GW2 (2026-11-07): the single-home cleanup and Guided = the coach. The page is index.html as shipped, so these checks read its markup: each setting has one control, and every guide
// step points at something that exists.
import { describe, expect, it } from 'vitest';
import { GUIDE_STEPS, DEMO_STEPS, type CoachCtx } from '../src/ui/coach/steps';

// @ts-expect-error node only (no node types in this project)
const fs = await import('node:fs');
const readFileSync = (f: string, e: 'utf8') => fs.readFileSync(f, e) as string;
const html = readFileSync('index.html', 'utf8');
const section = (key: string) => { const a = html.indexOf(`data-sec="${key}"`); expect(a, `section ${key}`).toBeGreaterThan(-1); const b = html.indexOf('<details class="sec"', a + 10); return html.slice(a, b < 0 ? undefined : b); };
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

describe('one home per setting', () => {
  it('Kind is in the Tank section only: not in Animals, and Water shows it without a second control', () => {
    expect(section('tank')).toContain('id="spKinds"');
    expect(count(html, /id="spKinds"/g)).toBe(1);
    expect(section('fish')).not.toContain('spKinds');
    const w = section('water');
    for (const id of ['wOn', 'wFresh', 'wSalt']) expect(w).not.toContain(`id="${id}"`);
    expect(w).toContain('id="wKindOpen"');
  });
  it('the care level is shown in Quick Setup (no slider of its own) and opens Your limits', () => {
    const q = section('quick');
    expect(q).not.toContain('id="expertise"');
    expect(q).toContain('id="expertiseOpen"');
  });
  it('Quick Setup holds the browse-looks and explore entries (Visual Discovery lives there)', () => {
    const q = section('quick');
    expect(q).toContain('id="browseLooks"'); expect(q).toContain('id="exploreSetups"');
  });
  it('the setup brief shows limits as a line with one button into Your limits, with no inputs of its own', () => {
    const src = readFileSync('src/ui/briefBar.ts', 'utf8');
    expect(src).toContain('data-act="limits"'); expect(src).not.toMatch(/id="bb(Budget|Time|W|D)/); expect(src).not.toContain("input('bb");
  });
});

describe('the guided path is the coach', () => {
  it('runs Kind -> Tank -> Placement -> My equipment -> Your limits -> Look -> Animals -> Review, with unique ids', () => {
    expect(GUIDE_STEPS.map(s => s.id)).toEqual(['kind', 'size', 'place', 'equipment', 'limits', 'look', 'animals', 'review']);
    expect(new Set(GUIDE_STEPS.map(s => s.id)).size).toBe(GUIDE_STEPS.length);
    for (const s of GUIDE_STEPS) expect(s.why.split(/(?<=[.!?])\s/).length).toBeLessThanOrEqual(2);
    expect(DEMO_STEPS.map(s => s.id)).toEqual(['kind', 'size', 'limits', 'look']);
  });
  it('every step target exists on the page: a section, a control inside it, or a dialog the host opens', () => {
    const dialogs = ['limits', 'equipment'];
    for (const s of GUIDE_STEPS) {
      const t = s.target;
      if (t.dialog) { expect(dialogs, s.id).toContain(t.dialog); continue; }
      const body = t.section ? section(t.section) : html;
      if (t.control) { const m = /^#([\w-]+)$/.exec(t.control); expect(m, `${s.id}: simple #id selector`).toBeTruthy(); expect(body, `${s.id} control`).toContain(`id="${m![1]}"`); }
    }
    const src = readFileSync('src/ui/panels.ts', 'utf8');
    for (const d of ['limits', 'equipment']) expect(src).toMatch(new RegExp(`attachCoach\\(store, \\{[^}]*${d}:`));
  });
  it('the coach is the questioner of Discovery (DX5): Guide me walks it, finishing hands over to Discovery, no old dialog', () => {
    const src = readFileSync('src/ui/panels.ts', 'utf8');
    expect(src).toContain("discover: () => openDiscovery({ from: 'coach' })"); expect(src).not.toContain('welcome.show(');
  });
  it('the equipment step reacts to owned gear, the limits step does not', () => {
    const ctx = (items: object): CoachCtx => ({ scene: {} as never, tank: { stand: undefined } as never, brief: { v: 1, items } as never });
    const snap = (id: string, c: CoachCtx) => JSON.stringify(((GUIDE_STEPS.find(s => s.id === id)!.done) as { changes: (c: CoachCtx) => unknown }).changes(c));
    const none = ctx({}), owned = ctx({ 'constraints.owned': { value: { filter: 'required' } } }), budget = ctx({ 'constraints.budget': { value: 500 } }), exp = ctx({ 'preferences.experience': { value: 1 } });
    expect(snap('equipment', none)).not.toBe(snap('equipment', owned));
    expect(snap('limits', none)).toBe(snap('limits', owned));
    expect(snap('limits', none)).not.toBe(snap('limits', budget));
    expect(snap('limits', none)).not.toBe(snap('limits', exp));
  });
});
