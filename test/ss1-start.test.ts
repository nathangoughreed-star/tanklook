// SS1: the new UI's Start sheet rules.
import { describe, it, expect } from 'vitest';
import { shouldWelcome, markWelcomed, doorsFor, linksFor, blankKinds, WELCOME_KEY } from '../src/shell/logic/start';

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
  it('four doors named by the visitor situation; bundles and saved tanks are links', () => {
    expect(doorsFor().map(d => d.label)).toEqual(['Show me tanks I could build', 'Start from a fish I want', 'I already have a tank or gear', 'Build my own from scratch']);
    expect(linksFor(0).map(l => l.id)).toEqual(['deals']);
    expect(linksFor(2).map(l => l.id)).toEqual(['deals', 'open']);
    expect(linksFor(2)[1].label).toContain('(2)');
  });
  it('the blank door offers the aquarium kinds', () => {
    const k = blankKinds().map(x => x.kind);
    expect(k).toContain('freshwater'); expect(k).toContain('saltwater');
  });
});
