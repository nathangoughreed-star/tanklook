// SS1: the new UI's Start sheet rules.
import { describe, it, expect } from 'vitest';
import { shouldWelcome, markWelcomed, doorsFor, blankKinds, WELCOME_KEY } from '../src/shell/logic/start';

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } }; };

describe('SS1 start sheet', () => {
  it('shows by itself once, on a first visit only', () => {
    const st = mem();
    expect(shouldWelcome(null, undefined, st)).toBe(true);
    markWelcomed(st);
    expect(st.getItem(WELCOME_KEY)).toBe('1');
    expect(shouldWelcome(null, undefined, st)).toBe(false);
  });
  it('a return visit or an unreadable save does not show it', () => {
    expect(shouldWelcome({ any: 1 }, undefined, mem())).toBe(false);
    expect(shouldWelcome(null, 'bad file', mem())).toBe(false);
  });
  it('four doors with saved tanks, three without', () => {
    expect(doorsFor(0).map(d => d.id)).toEqual(['blank', 'starters', 'animal']);
    expect(doorsFor(2).map(d => d.id)).toEqual(['blank', 'starters', 'animal', 'open']);
    expect(doorsFor(2)[3].hint).toContain('2 saved');
  });
  it('the blank door offers the aquarium kinds', () => {
    const k = blankKinds().map(x => x.kind);
    expect(k).toContain('freshwater'); expect(k).toContain('saltwater');
  });
});
