// Lane S2 (2026-11-13; UI2 §7 step 2): the file menu's view-models (src/shell/logic/files.ts) over P7's rules.
import { describe, expect, it } from 'vitest';
import { defaultScene } from '../src/scene/defaults';
import * as P7 from '../src/ui/logic/files';
import { FILE_MENU, newProject, libraryRows, savedLine, saveAsView, hashOf, startMode, EMPTY_LIBRARY } from '../src/shell/logic/files';
import { hasWork } from '../src/ui/newTank';

function mem(): Storage {
  const m = new Map<string, string>();
  return { get length() { return m.size; }, clear: () => m.clear(), key: i => [...m.keys()][i] ?? null, getItem: k => m.get(k) ?? null, removeItem: k => { m.delete(k); }, setItem: (k, v) => { m.set(k, v); } };
}
const named = (name: string) => { const s = defaultScene(); s.name = name; return s; };

describe('S2 file menu', () => {
  it('lists the five items of screen map 2a in order', () => {
    expect(FILE_MENU.map(m => m.id)).toEqual(['new', 'open', 'saveas', 'share', 'download']);
  });
  it('New makes an empty tank of the chosen water, keeping units and camera', () => {
    const cam = defaultScene().tanks[0].camera;
    const s = newProject('cm', 'saltwater', { ...cam, az: 33 });
    expect(s.name).toBe('New tank'); expect(s.units).toBe('cm'); expect(s.tanks).toHaveLength(1);
    expect(s.tanks[0].water.salt).toBeTruthy(); expect(s.tanks[0].camera.az).toBe(33);
    expect(hasWork(s)).toBe(false);                       // nothing to lose, so no replace question
    expect(newProject('in', 'freshwater', cam).tanks[0].water.salt).toBeFalsy();
  });
});

describe('S2 library rows and the saved line', () => {
  it('empty library says so; saved tanks list newest first and mark the current one', () => {
    const st = mem();
    expect(libraryRows(st)).toEqual([]); expect(EMPTY_LIBRARY).toMatch(/No saved tanks/);
    const a = P7.saveHere(named('Reef'), 'ta', st), b = P7.saveHere(named('Betta'), 'tb', st);
    if (!a.ok || !b.ok) throw new Error('save');
    const rows = libraryRows(st);
    expect(rows).toHaveLength(2);
    expect(rows.filter(r => r.current).map(r => r.name)).toEqual(['Betta']);   // the last save is the current tank
    expect(rows.every(r => r.when.length > 0)).toBe(true);
  });
  it('savedLine: autosaved only, saved in this browser, and mid-save', () => {
    const st = mem(), s = named('Reef');
    expect(savedLine(s, true, st)).toMatch(/Autosaved/);
    P7.saveHere(s, '', st);
    expect(savedLine(s, true, st)).toBe('Saved in this browser as “Reef”');
    expect(savedLine(s, false, st)).toBe('Saving…');
  });
});

describe('S2 Save as', () => {
  it('same name updates in place; a new name is a new entry; a name taken by another saved tank asks to replace', () => {
    const st = mem();
    P7.saveHere(named('Reef'), '', st); P7.saveHere(named('Betta'), '', st);
    P7.setLibId(libId('Reef', st), st);
    const cur = named('Reef');
    expect(saveAsView('Reef', cur, st)).toMatchObject({ rename: null, effect: 'update' });
    expect(saveAsView('  Reef 2  ', cur, st)).toMatchObject({ rename: 'Reef 2', name: 'Reef 2', effect: 'new' });
    expect(saveAsView('Betta', cur, st)).toMatchObject({ rename: 'Betta', effect: 'replace' });
    expect(saveAsView('   ', cur, st)).toMatchObject({ rename: null, name: 'Reef' }); // blank keeps the name
  });
});
function libId(name: string, st: Storage) { return libraryRows(st).find(r => r.name === name)!.id; }

describe('S2 share links and start', () => {
  it('finds the share hash in a pasted link', () => {
    expect(hashOf('https://tanklook.com/?ui=2#tank=abc123')).toBe('#tank=abc123');
    expect(hashOf('#tank=xyz ')).toBe('#tank=xyz');
    expect(hashOf('https://tanklook.com/')).toBeNull();
  });
  it('a return visit resumes; a first visit is new; an unreadable save says why', () => {
    expect(startMode(defaultScene())).toEqual({ mode: 'resume' });
    expect(startMode(null)).toEqual({ mode: 'new', message: undefined });
    expect(startMode(null, 'bad json').message).toContain('bad json');
  });
});
