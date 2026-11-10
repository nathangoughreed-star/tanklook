// DX7: seven menus (Tank, Substrate, Hardscape, Plants, Animals | Constraints, Equipment), the "Discovery can change this" switches, one store for space.
import { describe, expect, it } from 'vitest';
import { defaultScene, defaultSetup } from '../src/scene/defaults';
import { Store } from '../src/scene/store';
import { regenerate } from '../src/scene/starter';
import { ensureUids } from '../src/scene/uid';
import { IN } from '../src/scene/physics';
import { propose } from '../src/scene/discover';
import { emptyBrief } from '../src/ui/setupBrief';
import { applyCard, defaultScope } from '../src/ui/discover/logic';
import { discoverIsOn, discoverTabs, setDiscoverTab } from '../src/scene/discoverScope';
import { TABS, diffTouches } from '../src/scene/scope';
import { getItem } from '../src/scene/brief';
import { mirrorSpace, writeSpace } from '../src/scene/spaceStore';
import { parseScene } from '../src/scene/validate';
import { switchHtml, toggleSwitch } from '../src/ui/discover/switches';
import type { TankSetup } from '../src/scene/types';

// @ts-expect-error node only (no node types in this project)
const fs = await import('node:fs');
const read = (f: string) => fs.readFileSync(f, 'utf8') as string;
const html = read('index.html');

describe('seven menus plus Report', () => {
  const secs = [...html.matchAll(/<details class="sec" data-sec="([^"]+)"><summary><h2[^>]*>([^<]+)<\/h2>/g)].map(m => [m[1], m[2]]);
  it('the side panel has exactly these menus, in this order', () => {
    expect(secs.map(s => s[1])).toEqual(['Tank', 'Substrate', 'Hardscape', 'Plants', 'Animals', 'Constraints and preferences', 'Equipment', 'Report']);
    expect(secs.map(s => s[0])).toEqual(['tank', 'substrate', 'hardscape', 'plants', 'fish', 'brief', 'equipment', 'report']);
    expect(html.match(/<details class="sec"/g)!.length).toBe(8);
  });
  const sec = (key: string) => { const a = html.indexOf(`data-sec="${key}"`), n = html.indexOf('<details class="sec"', a + 10), e = html.indexOf('id="quickHome"'); return html.slice(a, n > 0 && n < e ? n : e); };
  it('what used to be other menus lives in one of them (Room, Water, Tech, My equipment, the brief)', () => {
    expect(sec('tank')).toContain('id="placeRow"'); expect(sec('tank')).toContain('id="spKinds"'); expect(sec('tank')).toContain('id="wallOn"'); expect(sec('tank')).toContain('id="personOn"'); expect(sec('tank')).toContain('id="ceilH"');
    expect(sec('fish')).toContain('id="wLevel"'); expect(sec('fish')).toContain('id="cond"'); expect(sec('fish')).toContain('id="spSearch"');
    expect(sec('equipment')).toContain('id="equipHost"'); expect(sec('equipment')).toContain('id="techMenu"'); expect(sec('equipment')).toContain('id="lType"');
    expect(sec('brief')).toContain('id="briefHost"'); expect(sec('brief')).toContain('id="limitsHost"'); expect(sec('brief')).toContain('id="cnNoNew"');
  });
  it('viewer, compare and display controls are in the View popover; Quick setup rides in the Discover panel', () => {
    const pop = html.slice(html.indexOf('id="viewPop"'), html.indexOf('<canvas id="c"'));
    for (const id of ['cDist', 'cAz', 'cEl', 'cZoom', 'camReset', 'showFish', 'showPlants', 'showHard', 'gearOn', 'split', 'edge', 'pop', 'perf', 'mapOn', 'gridOn', 'sheetBtn', 'reportBtn']) expect(pop, id).toContain(`id="${id}"`);
    expect(html).toContain('id="viewBtn"');
    const q = html.slice(html.indexOf('id="quickHome"'));
    for (const id of ['browseLooks', 'layout', 'layoutShuffle', 'plantTier', 'layoutComp', 'densHard', 'densPlant', 'densAnimal', 'gateStock']) expect(q, id).toContain(`id="${id}"`);
  });
  it('no orphaned controls: every id the panel code looks up with $(...) exists in the page, once', () => {
    const src = read('src/ui/panels.ts'), ids = new Set([...src.matchAll(/\$(?:<[^>]*>)?\('([A-Za-z][\w-]*)'\)/g)].map(m => m[1]));
    const missing = [...ids].filter(id => !html.includes(`id="${id}"`));
    expect(missing).toEqual([]);
    const dup = [...html.matchAll(/ id="([^"]+)"/g)].map(m => m[1]).filter((id, i, a) => a.indexOf(id) !== i);
    expect(dup).toEqual([]);
  });
  it('the five creative menus get a switch; Constraints and Equipment do not', () => {
    const src = read('src/ui/discover/switches.ts');
    expect(src).toContain("tank: 'tank', substrate: 'substrate', hardscape: 'hardscape', plants: 'plants', animals: 'fish'");
    expect(html).not.toContain('Discovery can change this');   // added by attachMenuSwitches, one per tab
    expect(switchHtml('plants', true)).toContain('Discovery can change this');
    expect(switchHtml('plants', true)).toContain('aria-checked="true"');
  });
});

function project(): TankSetup {
  const t = structuredClone(defaultSetup());
  t.tank = { ...t.tank, L: 36 * IN, D: 18 * IN, H: 16 * IN }; t.water.on = true; t.water.level = 0.9; t.water.salt = false;
  t.layout = { ...t.layout, id: 'nature' };
  regenerate(t, 'all', 1);
  t.fish = ['kuhli', 'ember'].flatMap((sp, k) => Array.from({ length: 5 }, (_, i) => ({ id: 100 * (k + 1) + i, species: sp, x: 100 + i * 20, y: 100, depth: 100, yaw: 0, pitch: 0, roll: 0, bend: 0 })));
  return ensureUids(t);
}
const mk = () => { const s = new Store({ ...defaultScene(), tanks: [project()] }); s.update(() => {}, { history: false }); return s; };

describe('the Discovery switches', () => {
  it('default on for every menu; switching one off changes only that one', () => {
    const t = project(); expect(discoverTabs(t)).toEqual([...TABS]); expect(t.discoverOn).toBeUndefined();
    setDiscoverTab(t, 'plants', false); expect(discoverTabs(t)).toEqual(['tank', 'animals', 'hardscape', 'substrate']); expect(discoverIsOn(t, 'plants')).toBe(false);
    setDiscoverTab(t, 'plants', true); expect(t.discoverOn).toBeUndefined();   // all on again stores nothing
  });
  it('round-trips through save and load, and is not an undo step', () => {
    const s = mk();
    s.undo(); const base = JSON.stringify(s.tank.fish);   // history is empty after mk(): undo is a no-op
    toggleSwitch(s, 'substrate', false); toggleSwitch(s, 'animals', false);
    expect(s.canUndo).toBe(false);
    expect(JSON.stringify(s.tank.fish)).toBe(base);
    const back = parseScene(JSON.parse(JSON.stringify(s.scene))).scene.tanks[0];
    expect(discoverTabs(back)).toEqual(['tank', 'plants', 'hardscape']);
    const none = structuredClone(s.tank); for (const t of TABS) setDiscoverTab(none, t, false);
    expect(discoverTabs(parseScene(JSON.parse(JSON.stringify({ ...s.scene, tanks: [none] }))).scene.tanks[0])).toEqual([]);   // every switch off is a real state
  });
  it('the switches are the scope: the panel default and propose follow them', () => {
    const s = mk(); toggleSwitch(s, 'tank', false); toggleSwitch(s, 'substrate', false); toggleSwitch(s, 'animals', false);
    expect(defaultScope(s.tank)).toEqual(['plants', 'hardscape']);
    expect(defaultScope(s.tank, 'tank')).toEqual(['tank']);   // a contextual open still preselects its own menu
    const d = propose(s, emptyBrief(), { scope: defaultScope(s.tank), objective: 'explore' }, 3);
    expect(d.proposals.length).toBeGreaterThan(0);
    for (const p of d.proposals) expect(p.scope.every(t => ['plants', 'hardscape'].includes(t))).toBe(true);
  });
  it('an unchecked menu is unchanged by a Discover apply', () => {
    const s = mk(); toggleSwitch(s, 'animals', false); toggleSwitch(s, 'tank', false); toggleSwitch(s, 'substrate', false);
    const before = structuredClone(s.tank), p = propose(s, emptyBrief(), { scope: defaultScope(s.tank), objective: 'explore' }, 3).proposals[0];
    expect(p).toBeTruthy(); expect(applyCard(s, p, false).ok).toBe(true);
    const t = diffTouches(before, s.tank);
    for (const off of ['animals', 'tank', 'substrate'] as const) expect(t.tabs, off).not.toContain(off);
    expect(JSON.stringify(s.tank.fish)).toBe(JSON.stringify(before.fish)); expect(JSON.stringify(s.tank.tank)).toBe(JSON.stringify(before.tank)); expect(JSON.stringify(s.tank.substrate)).toBe(JSON.stringify(before.substrate));
  });
});

describe('one store for space', () => {
  it('"Set my space" writes the brief value and layout.space together; clearing removes both', () => {
    const t = project(); writeSpace(t, { w: 1200, d: 500 });
    expect(t.layout.space).toEqual({ w: 1200, d: 500 }); expect(getItem(t.brief ?? emptyBrief(), 'constraints.maxSpace')?.value).toEqual({ w: 1200, d: 500 });
    writeSpace(t, undefined); expect(t.layout.space).toBeUndefined(); expect(getItem(t.brief ?? emptyBrief(), 'constraints.maxSpace')).toBeUndefined();
  });
  it('a brief edit wins; an older file that only has layout.space gets it in the brief on load', () => {
    const t = project(); t.layout.space = { w: 900, d: 400 }; mirrorSpace(t);
    expect(getItem(t.brief!, 'constraints.maxSpace')?.value).toEqual({ w: 900, d: 400 });
    t.layout.space = { w: 1, d: 1 }; mirrorSpace(t); expect(t.layout.space).toEqual({ w: 900, d: 400 });   // the brief is the value
    const old = project(); old.layout.space = { w: 1000, d: 450 };
    const back = parseScene(JSON.parse(JSON.stringify({ ...defaultScene(), tanks: [old] }))).scene.tanks[0];
    expect(getItem(back.brief!, 'constraints.maxSpace')?.value).toEqual({ w: 1000, d: 450 }); expect(back.layout.space).toEqual({ w: 1000, d: 450 });
  });
});
