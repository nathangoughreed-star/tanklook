// Lane NT1 (Nathan 2026-11-14): New starts fresh (floor, wall + person, no heater / filter) and the Get started card can be hidden per tank and brought back.
import { describe, it, expect } from 'vitest';
import { emptyScene, defaultScene } from '../src/scene/defaults';
import { freshScene } from '../src/scene/freshScene';
import { filterState, techOf } from '../src/scene/tech';
import { newProject } from '../src/shell/logic/files';
import { checklistOf, showChecklist, hideChecklist, restoreChecklist, resetChecklist, hideState, migrateOldOff, KEY } from '../src/shell/logic/checklist';
import { ensureUids } from '../src/scene/uid';

describe('NT1 freshScene', () => {
  it('is an empty tank on the floor with the wall and person on, and no heater or filter', () => {
    const T = freshScene().tanks[0];
    expect(T.stand.show).toBe(false);
    expect(T.wall.show).toBe(true); expect(T.person.show).toBe(true);
    expect(T.items.length).toBe(0); expect(T.fish.length).toBe(0);
    expect(techOf(T).rows.heater).toBe('none'); expect(techOf(T).rows.filter).toBe('none');
    expect(T.tech?.heaters?.length).toBe(0); expect(T.tech?.filters?.length).toBe(0);
    expect(filterState(T)).toBe('unset');                 // a to-do item, not an error
    expect(checklistOf(T).done).toBe(0);                  // the equipment step is open
    expect(T.tank).toEqual(emptyScene().tanks[0].tank);  // same default tank
  });
  it('leaves emptyScene / defaultScene alone, and New project uses it', () => {
    expect(emptyScene().tanks[0].stand.show).toBe(true); expect(emptyScene().tanks[0].wall.show).toBe(false);
    expect(defaultScene().tanks[0].fish.length).toBeGreaterThan(0);
    const N = newProject('in', 'freshwater', freshScene().tanks[0].camera).tanks[0];
    expect(N.stand.show).toBe(false); expect(N.person.show).toBe(true); expect(techOf(N).rows.heater).toBe('none');
  });
  it('survives a save / load round trip', () => {
    const T = ensureUids(structuredClone(freshScene().tanks[0]));
    expect(T.tech?.rows.filter).toBe('none');
  });
});

describe('NT1 checklist hide / restore', () => {
  it('× hides for this tank, a new project shows it again, the menu brings it back anywhere', () => {
    const T = freshScene().tanks[0];
    resetChecklist(); expect(showChecklist(T, hideState().hidden, true, hideState().forced)).toBe(true);
    hideChecklist(); expect(showChecklist(T, hideState().hidden, true, hideState().forced)).toBe(false);
    resetChecklist(); expect(hideState().hidden).toBe(false);
    hideChecklist();
    const built = structuredClone(T); built.fish = defaultScene().tanks[0].fish.slice(0, 1);   // a tank with a design already
    restoreChecklist(); const h = hideState();
    expect(showChecklist(built, h.hidden, false, h.forced)).toBe(true);
    expect(showChecklist(built, false, false, false)).toBe(false);
  });
  it('the old permanent off key is dropped once and counts as hidden', () => {
    const store: Record<string, string> = { [KEY]: 'off' };
    const m = { getItem: (k: string) => store[k] ?? null, removeItem: (k: string) => { delete store[k]; } };
    expect(migrateOldOff(m)).toBe(true); expect(store[KEY]).toBeUndefined(); expect(migrateOldOff(m)).toBe(false);
  });
});
