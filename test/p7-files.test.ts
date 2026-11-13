import { describe, expect, it } from 'vitest';
import { defaultScene, emptyScene } from '../src/scene/defaults';
import { EXAMPLES } from '../src/examples';
import { SCENES } from '../src/examples/scenes';
import { listLib } from '../src/scene/library';
import { readShare, shareHash } from '../src/scene/share';
import { parseScene } from '../src/scene/validate';
import * as F from '../src/ui/logic/files';

function mem(quota = Infinity): Storage {
  const m = new Map<string, string>();
  const used = () => [...m].reduce((n, [k, v]) => n + k.length + v.length, 0);
  return {
    get length() { return m.size; }, clear: () => m.clear(), key: i => [...m.keys()][i] ?? null,
    getItem: k => m.get(k) ?? null, removeItem: k => { m.delete(k); },
    setItem(k, v) { const old = m.get(k); m.set(k, v); if (used() > quota) { if (old == null) m.delete(k); else m.set(k, old); throw new DOMException('full', 'QuotaExceededError'); } },
  };
}
const named = (name: string) => { const s = defaultScene(); s.name = name; return s; };
const worked = (name: string) => { const s = named(name); s.tanks[0].tank.L += 100; return s; };

describe('P7 library: add / rename / delete', () => {
  it('Save adds a new entry, makes it current, and counts the saved tanks', () => {
    const st = mem(), a = named('Reef');
    expect(F.planSave(a, st).kind).toBe('new');
    const r = F.saveHere(a, 'data:a', st);
    if (!r.ok) throw new Error(r.message);
    expect(r.count).toBe(1);
    expect(r.message).toContain('Saved “Reef” in this browser (1 saved)');
    expect(F.libId(st)).toBe(r.entry.id);
    expect(F.planSave(a, st).kind).toBe('update');       // same tank again: updated in place, no question
    F.saveHere(a, 'data:a2', st);
    expect(listLib(st)).toHaveLength(1);
  });
  it('a different tank of the same name asks before replacing; a rename is a new entry', () => {
    const st = mem();
    F.saveHere(named('Reef'), 'x', st);
    F.setLibId(null, st);                                  // a different project now called Reef
    const plan = F.planSave(named('Reef'), st);
    expect(plan.kind).toBe('replace');
    expect(F.replaceQuestion('Reef', plan.existing!.saved)).toMatch(/^A different tank called “Reef” is already saved .*Replace it\?\n\nCancel, then change the name, to keep both\.$/);
    expect(F.renameFor('  Planted ', 'Reef')).toBe('Planted');
    expect(F.renameFor('Reef', 'Reef')).toBeNull();
    expect(F.renameFor('   ', 'Reef')).toBeNull();
    F.saveHere(named('Planted'), 'y', st);
    expect(listLib(st).map(e => e.name).sort()).toEqual(['Planted', 'Reef']);
  });
  it('names: trimmed to 80, blank falls back to My tank', () => {
    expect(F.cleanName('x'.repeat(100))).toHaveLength(80);
    expect(F.sceneNameOf('  ')).toBe('My tank');
    expect(F.sceneNameOf(' Nano ')).toBe('Nano');
  });
  it('delete removes the entry and forgets it as current only when it was current', () => {
    const st = mem();
    const a = F.saveHere(named('A'), '', st), b = F.saveHere(named('B'), '', st);
    if (!a.ok || !b.ok) throw new Error('save');
    expect(F.libId(st)).toBe(b.entry.id);
    expect(F.deleteSaved(a.entry.id, st)).toBe(true);
    expect(F.libId(st)).toBe(b.entry.id);
    expect(F.deleteSaved(b.entry.id, st)).toBe(true);
    expect(F.libId(st)).toBeNull();
    expect(F.deleteSaved('nope', st)).toBe(false);
    expect(listLib(st)).toEqual([]);
  });
  it('a full or blocked store reports the reason and leaves the library alone', () => {
    const st = mem(400);
    const r = F.saveHere(named('Big'), '', st);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/storage is full/);
    expect(F.libId(st)).toBeNull();
    expect(F.saveHere(named('A'), '', undefined).ok).toBe(false);
  });
});

describe('P7 open', () => {
  it('opens a saved tank by id and reports a missing one', () => {
    const st = mem(), r = F.saveHere(named('Reef'), '', st);
    if (!r.ok) throw new Error('save');
    expect(F.savedName(r.entry.id, st)).toBe('Reef');
    const o = F.openSaved(r.entry.id, st);
    expect(o.scene?.name).toBe('Reef'); expect(o.message).toBe('Opened "Reef". Undo brings the previous one back.'); expect(o.bad).toBe(false);
    const gone = F.openSaved('zzz', st);
    expect(gone.scene).toBeUndefined(); expect(gone.bad).toBe(true); expect(gone.message).toMatch(/no longer/);
    expect(F.savedName('zzz', st)).toBe('tank');
  });
  it('opening a file: size limit, parse errors, and it joins the library; the same file reuses its entry', () => {
    const st = mem();
    expect(F.tooLarge(5e6 + 1)).toBe(true); expect(F.tooLarge(5e6)).toBe(false);
    expect(F.isFail(F.parseOpened('not json'))).toBe(true);
    const ok = F.parseOpened(JSON.stringify(worked('From file')));
    if (F.isFail(ok)) throw new Error(ok.message);
    const first = F.addOpenedToLibrary(ok.scene, () => 'data:t', st);
    expect(first.note).toBe(' Added to your saved tanks.'); expect(F.libId(st)).toBe(first.id);
    const again = F.addOpenedToLibrary(ok.scene, () => { throw new Error('no canvas'); }, st);  // no picture: still saved
    expect(again.id).toBe(first.id); expect(listLib(st)).toHaveLength(1);
    expect(F.openedFileMessage('From file', first.note, ['w1'])).toBe('Opened "From file". Added to your saved tanks. w1');
    const full = F.addOpenedToLibrary(ok.scene, () => '', mem(10));
    expect(full.id).toBeNull(); expect(full.note).toMatch(/storage is full/);
  });
  it('shared link round-trips: scene -> link -> open', async () => {
    const scene = parseScene(SCENES[EXAMPLES[0].id]).scene;
    const back = await readShare(await shareHash(scene));
    expect(back.scene).toEqual(scene);
    expect(F.sharedMessage(back.scene.name, [])).toBe(`Opened the shared tank "${scene.name}". Undo brings your previous tank back; Save keeps your own copy.`);
    expect(F.sharedMessage('x', ['w'])).toMatch(/ w$/);
    expect(F.shareFailMessage(new Error('x'))).toBe('Could not open that share link.');
    expect(F.exampleMessage('Reef')).toContain('Opened the example "Reef"');
  });
});

describe('P7 save as / download / share text', () => {
  it('the file is the scene with its name as the file name, and re-opens equal', () => {
    const s = worked('My Reef #1!'), f = F.sceneFile(s);
    expect(f.filename).toBe('my-reef-1.json'); expect(F.slug('???')).toBe('tank');
    expect(parseScene(f.text).scene.name).toBe('My Reef #1!');
  });
  it('one tank of a split downloads on its own, single-tank, camera locked', () => {
    const s = defaultScene(); s.name = 'Pair'; s.tanks = [structuredClone(s.tanks[0]), structuredClone(s.tanks[0])];
    const one = F.singleTank(s, 1)!;
    expect(one.scene.tanks).toHaveLength(1); expect(one.scene.active).toBe(0); expect(one.scene.camLock).toBe(true);
    expect(one.scene.name).toBe('Pair - Tank B'); expect(one.message).toBe('Downloaded Tank B on its own as "Pair - Tank B".');
    expect(F.singleTank(s, 5)).toBeNull();
  });
  it('share messages and base', () => {
    const s = defaultScene();
    expect(F.shareCopiedMessage(s, 1234)).toBe('Copied a share link (1,234 characters). Whoever opens it gets this tank as a new, unsaved copy.');
    expect(F.shareCopiedMessage(s, 2500)).toMatch(/It is long: .*tinyurl\.com/);
    expect(F.shareBase('file:', 'file:///x/index.html')).toBe('https://tanklook.com/');
    expect(F.shareBase('https:', 'https://tanklook.com/#a')).toBe('https://tanklook.com/#a');
  });
});

describe('P7 resume and the replace guard', () => {
  it('resume reads the open section and Discovery flag; bad or missing storage means nothing to reopen', () => {
    const st = mem();
    expect(F.resumeState(st)).toEqual({ sec: undefined, disc: false });
    st.setItem(F.UI_KEY, JSON.stringify({ sec: 'tank', disc: true, hidden: false }));
    expect(F.resumeState(st)).toEqual({ sec: 'tank', disc: true });
    st.setItem(F.UI_KEY, '{oops');
    expect(F.resumeState(st)).toEqual({ disc: false });
    expect(F.resumeState(undefined)).toEqual({ sec: undefined, disc: false });
  });
  it('the replace guard: a blank project never asks; unsaved work asks; work saved as it stands does not', () => {
    const st = mem();
    expect(F.replaceNeedsAsk(emptyScene(), st)).toBe(false);
    const w = worked('Work');
    expect(F.replaceNeedsAsk(w, st)).toBe(true);
    expect(F.isSavedAsIs(w, st)).toBe(false);
    expect(F.saveHere(w, '', st).ok).toBe(true);
    expect(F.savedText(st)).toBe(JSON.stringify(w));
    expect(F.isSavedAsIs(w, st)).toBe(true);
    expect(F.replaceNeedsAsk(w, st)).toBe(false);
    const edited = structuredClone(w); edited.tanks[0].tank.H += 50;
    expect(F.replaceNeedsAsk(edited, st)).toBe(true);     // edited since the save
    F.setLibId(null, st);                                 // a link / example makes it unsaved
    expect(F.replaceNeedsAsk(w, st)).toBe(true);
  });
  it('locks alone make the guard ask even on a bare tank', () => {
    const s = emptyScene(); s.tanks[0].locks = { objects: [1], roster: [] } as never;
    expect(F.replaceNeedsAsk(s, mem())).toBe(true);
  });
});
