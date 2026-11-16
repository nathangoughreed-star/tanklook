// Request R91 (2026-11-15): Full screen / Tank only state and decisions (src/shell/logic/fullscreen.ts).
import { describe, expect, it } from 'vitest';
import { FS_OFF, choose, fsAvailable, fsItems, isIphone, keyChoice, onFullscreenChange, exitVisible, type FsEnv, type FsState } from '../src/shell/logic/fullscreen';

const desk: FsEnv = { api: true, iphone: false }, iphone: FsEnv = { api: false, iphone: true }, noApi: FsEnv = { api: false, iphone: false };
const labels = (s: FsState, e: FsEnv) => fsItems(s, e).map(i => i.label);

describe('menu', () => {
  it('labels follow the state', () => {
    expect(labels(FS_OFF, desk)).toEqual(['Full screen', 'Tank only']);
    expect(labels({ fullscreen: true, tankOnly: false, viaApi: false }, desk)).toEqual(['Exit full screen', 'Tank only']);
    expect(labels({ fullscreen: true, tankOnly: true, viaApi: true }, desk)).toEqual(['Full screen', 'Exit tank only']);
  });
  it('iPhone Safari (and any browser without the API): no Full screen item, Tank only stays', () => {
    expect(isIphone('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true); expect(isIphone('Mozilla/5.0 (Macintosh)')).toBe(false);
    expect(fsAvailable(iphone)).toBe(false); expect(labels(FS_OFF, iphone)).toEqual(['Tank only']); expect(labels(FS_OFF, noApi)).toEqual(['Tank only']);
  });
});
describe('toggle', () => {
  it('Full screen enters and leaves browser fullscreen, UI unchanged', () => {
    const a = choose(FS_OFF, desk, 'full'); expect(a).toEqual({ action: 'enter', next: { fullscreen: true, tankOnly: false, viaApi: false } });
    expect(choose(a.next, desk, 'full')).toEqual({ action: 'exit', next: FS_OFF });
    expect(choose(FS_OFF, iphone, 'full').action).toBeNull();
  });
  it('Tank only also enters fullscreen where there is one, and exiting leaves both', () => {
    const a = choose(FS_OFF, desk, 'tank'); expect(a).toEqual({ action: 'enter', next: { fullscreen: true, tankOnly: true, viaApi: true } });
    expect(choose(a.next, desk, 'tank')).toEqual({ action: 'exit', next: FS_OFF });
  });
  it('Tank only from Full screen keeps fullscreen on exit; on iPhone it is only the hidden chrome', () => {
    const full: FsState = { fullscreen: true, tankOnly: false, viaApi: false };
    const t = choose(full, desk, 'tank'); expect(t).toEqual({ action: null, next: { fullscreen: true, tankOnly: true, viaApi: false } });
    expect(choose(t.next, desk, 'tank')).toEqual({ action: null, next: full });
    const p = choose(FS_OFF, iphone, 'tank'); expect(p).toEqual({ action: null, next: { fullscreen: false, tankOnly: true, viaApi: false } });
    expect(choose(p.next, iphone, 'tank').next).toEqual(FS_OFF);
  });
});
describe('fullscreenchange', () => {
  it('Esc out of fullscreen leaves Tank only that entered it, keeps one that did not', () => {
    expect(onFullscreenChange({ fullscreen: true, tankOnly: true, viaApi: true }, false)).toEqual(FS_OFF);
    expect(onFullscreenChange({ fullscreen: true, tankOnly: true, viaApi: false }, false)).toEqual({ fullscreen: false, tankOnly: true, viaApi: false });
    expect(onFullscreenChange(FS_OFF, true)).toEqual({ fullscreen: true, tankOnly: false, viaApi: false });
    const s = { fullscreen: true, tankOnly: false, viaApi: false }; expect(onFullscreenChange(s, true)).toBe(s);
  });
});
describe('F key', () => {
  const f = { key: 'f' };
  it('toggles Full screen, not while typing, not with modifiers', () => {
    expect(keyChoice(f, false, desk, FS_OFF)).toBe('full'); expect(keyChoice({ key: 'F' }, false, desk, FS_OFF)).toBe('full');
    expect(keyChoice(f, true, desk, FS_OFF)).toBeNull(); expect(keyChoice({ key: 'f', ctrlKey: true }, false, desk, FS_OFF)).toBeNull(); expect(keyChoice({ key: 'g' }, false, desk, FS_OFF)).toBeNull();
  });
  it('without Full screen it toggles Tank only; in Tank only on desktop it leaves fullscreen', () => {
    expect(keyChoice(f, false, iphone, FS_OFF)).toBe('tank');
    expect(keyChoice(f, false, desk, { fullscreen: true, tankOnly: true, viaApi: true })).toBe('full');
  });
  it('the exit button fades after 2 s', () => { expect(exitVisible(1999)).toBe(true); expect(exitVisible(2000)).toBe(false); });
});
