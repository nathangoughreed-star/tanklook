import { describe, it, expect } from 'vitest';
import { Store, STORAGE_KEY } from '../src/scene/store';

// @ts-expect-error node only (no node types in this project)
const fs = await import('node:fs');
const read = (f: string) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8') as string;
const fake = (init?: string): Storage => { const m = new Map<string, string>(); if (init !== undefined) m.set(STORAGE_KEY, init); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); }, removeItem: k => { m.delete(k); }, clear: () => m.clear(), key: () => null, length: 0 } as Storage; };

describe('SL2 resume where the last session left off', () => {
  it('round trip: the autosaved design, camera and active tank come back', () => {
    const a = new Store(); a.scene.tanks[0].camera.zoom = 1.7; a.scene.name = 'Resume me';
    const st = fake(); a.saveLocal(st);
    const r = Store.loadLocalChecked(st);
    expect(r.error).toBeUndefined();
    expect(r.scene?.name).toBe('Resume me'); expect(r.scene?.tanks[0].camera.zoom).toBeCloseTo(1.7);
    expect(new Store(r.scene!).scene.name).toBe('Resume me');
  });
  it('first visit: nothing saved, no error (the start screen shows)', () => { expect(Store.loadLocalChecked(fake())).toEqual({ scene: null }); });
  it('corrupt or incompatible save: no scene and a reason (start screen with a message)', () => {
    for (const bad of ['{not json', '{"version":999,"tanks":[]}', '[]']) { const r = Store.loadLocalChecked(fake(bad)); expect(r.scene).toBeNull(); expect(r.error).toBeTruthy(); }
  });
  it('wiring: a saved tank resumes, a first visit or unreadable save shows the start screen', () => {
    const m = read('src/main.ts');
    expect(m).toContain('loadLocalChecked'); expect(m).toMatch(/if \(restored\) ui\.resume\(\)/); expect(m).toMatch(/showStart\(saveError/);
  });
  it('header (HM1): New, Open…, Save (+ Discover); Open asks saved or starter; Save offers Save / Save as…; no My equipment, Starter or Download buttons', () => {
    const h = read('index.html'), p = read('src/ui/panels.ts');
    for (const id of ['newScene', 'openScene', 'saveScene', 'openSaved', 'openStarter', 'saveHere', 'saveAs', 'dlFile', 'shareScene']) expect(h).toContain(`id="${id}"`);
    for (const id of ['startScene', 'downloadScene', 'myEquip']) expect(h).not.toContain(`id="${id}"`);
    expect(h.indexOf('id="newScene"')).toBeLessThan(h.indexOf('id="openScene"')); expect(h.indexOf('id="openScene"')).toBeLessThan(h.indexOf('id="saveScene"'));
    expect(read('src/ui/discover/keep.ts')).toContain("'.tb-main'");
    expect(p).not.toContain('Continue your last tank');
    expect(p).toMatch(/\$\('openStarter'\)\.onclick = .*stepForMenu\('open', 'starters'\)/);
    expect(p).toMatch(/\$\('openSaved'\)\.onclick = .*stepForMenu\('open'\)/);
    expect(p).toMatch(/\$\('newScene'\)\.onclick = .*stepForMenu\('new'\)/);
    expect(p).toMatch(/\$\('saveHere'\)\.onclick = .*doSave\(\)/);
    expect(read('src/ui/myEquipment.ts')).toContain('Open My equipment…');
  });
  it('open section and a Discovery in progress are saved for the next visit', () => {
    const p = read('src/ui/panels.ts');
    expect(p).toMatch(/sec: secs\.find/); expect(p).toMatch(/disc: !!store\.persistBase/); expect(p).toMatch(/openDiscovery\(\{ from: 'resume' \}\)/);
  });
});
