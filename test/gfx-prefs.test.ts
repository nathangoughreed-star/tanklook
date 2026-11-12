import { beforeEach, describe, expect, it } from 'vitest';
import { FX, FX_DEFAULT, setFx } from '../src/render/fx';
import { causticStatus, levelReason, readPrefs, restoreFxDefaults, chooseFx, urlKeys, writePrefs } from '../src/render/fxPrefs';

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };

describe('fx prefs', () => {
  beforeEach(() => setFx({ ...FX_DEFAULT }));
  it('round-trips only non-default values', () => {
    const st = mem();
    writePrefs({ caustics: false, contact: true, tonemap: 1 }, st);
    expect(readPrefs(st)).toEqual({ caustics: false, tonemap: 1 });
    writePrefs({}, st);
    expect(st.getItem('tanklook.fx')).toBeNull();
  });
  it('ignores junk', () => {
    const st = mem(); st.setItem('tanklook.fx', JSON.stringify({ caustics: 'x', tonemap: 9, bogus: true, depth: true }));
    expect(readPrefs(st)).toEqual({ depth: true });
    st.setItem('tanklook.fx', '{nope'); expect(readPrefs(st)).toEqual({});
  });
  it('the page address names the keys it overrides', () => {
    expect(urlKeys('caustics,-contact').sort()).toEqual(['caustics', 'contact']);
    expect(urlKeys('tonemap:aces')).toEqual(['tonemap']);
    expect(urlKeys('none').length).toBe(Object.keys(FX_DEFAULT).length);
    expect(urlKeys(null)).toEqual([]);
  });
  it('chooseFx applies live; restore returns defaults', () => {
    chooseFx({ caustics: false });
    expect(FX.caustics).toBe(false);
    restoreFxDefaults();
    expect(FX.caustics).toBe(FX_DEFAULT.caustics);
  });
});

describe('status wording', () => {
  it('words each caustic state', () => {
    expect(causticStatus('moving').text).toBe('Caustics: moving.');
    expect(causticStatus('still: idle').text).toMatch(/no input for 60 s.*move the mouse/);
    expect(causticStatus('still: performance level').text).toMatch(/not Full quality/);
    const slow = causticStatus('still: slow machine'); expect(slow.text).toMatch(/slow/); expect(slow.retry).toBe(true);
    expect(causticStatus('off').text).toBe('Caustics: off.');
  });
  it('words why the level is where it is', () => {
    const names = ['Full quality', 'Lighter'];
    expect(levelReason({ level: 1, auto: true, lowered: { from: 0, at: Date.UTC(2026, 10, 12, 15, 0), fps: 22 } }, names)).toMatch(/Auto lowered this from Full quality on .* because frames missed 30 fps \(22 fps\)/);
    expect(levelReason({ level: 0, auto: true, lowered: null }, names)).toMatch(/^Full quality/);
    expect(levelReason({ level: 1, auto: false, lowered: null }, names)).toMatch(/You chose/);
  });
});
