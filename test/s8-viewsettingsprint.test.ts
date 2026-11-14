// Lane S8 (2026-11-13; UI2 §7 step 8): the View popover, Settings and Print view-models (src/shell/logic/{view,settings,print}.ts).
import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { Store } from '../src/scene/store';
import { defaultProfile } from '../src/demand/types';
import { reportOf } from '../src/ui/report';
import { buildSheet, sheetCsv } from '../src/scene/setupsheet';
import { FX, FX_DEFAULT } from '../src/render/fx';
import { CAM_PRESETS, presetNow, presetOf, camReadout, parseHidden, loadMap, saveMap, loadHidden, saveHidden, pngName, pngTitle, anotherMoment, SHOWS } from '../src/shell/logic/view';
import { setUnits, chooseRules, rulesNow, graphicsModel, UNIT_OPTS } from '../src/shell/logic/settings';
import {
  PRESETS, presetById, defaultPrefs, loadPrefs, savePrefs, choosePreset, toggleTick, tickCount, paperOf, paperText, paperCsv, partOfRow, filterReportHtml, fileName, shoppingTotal,
} from '../src/shell/logic/print';

const NOW = Date.parse('2026-11-13');
const scene = (id: string) => parseScene(JSON.parse(SCENES[id])).scene;
const fake = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };
const prof = defaultProfile();
const dollars = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

describe('View', () => {
  it('camera presets set the camera and are recognised again', () => {
    const c = { dist: 1200, az: 30, el: 20, zoom: 1.5 };
    expect(presetNow(c)).toBeNull();
    Object.assign(c, presetOf('front')!.cam); expect(presetNow(c)).toBe('front');
    Object.assign(c, presetOf('above')!.cam); expect(presetNow(c)).toBe('above');
    expect(CAM_PRESETS.map(p => p.id)).toEqual(['front', 'above', 'left', 'right']);
  });
  it('readouts: distance in feet or metres, degrees, zoom', () => {
    expect(camReadout('dist', 1524, 'in')).toBe('5 ft'); expect(camReadout('dist', 2000, 'cm')).toBe('2 m');
    expect(camReadout('az', 12.4, 'in')).toBe('12°'); expect(camReadout('zoom', 1.234, 'in')).toBe('1.23×');
  });
  it('the Show switches keep what the old shell kept (same storage key), ignoring junk', () => {
    expect(SHOWS.map(s => s.id)).toEqual(['fish', 'plants', 'hardscape', 'gear']);
    expect([...parseHidden('["plants","bogus",3]')]).toEqual(['plants']); expect(parseHidden('nope').size).toBe(0);
    const st = fake(); saveHidden(['fish', 'hardscape'], st); expect([...loadHidden(st)]).toEqual(['fish', 'hardscape']);
  });
  it('the viewpoint map is OFF until switched on (decision 9), and remembered', () => {
    const st = fake(); expect(loadMap(st)).toBe(false); saveMap(true, st); expect(loadMap(st)).toBe(true); saveMap(false, st); expect(loadMap(st)).toBe(false);
  });
  it('PNG names and pixel sizes', () => {
    expect(pngName('Planted community!', 2)).toBe('planted-community-2x.png'); expect(pngName('', 1)).toBe('tank-1x.png'); expect(pngTitle(800, 600, 2, 2)).toBe('3200 × 2400 px');
  });
  it('Another moment moves the animals in one undo step, and does nothing without animals', () => {
    const st = new Store(scene('planted')), pos = () => JSON.stringify(st.tank.fish.map(f => [f.x, f.y, f.depth])), before = pos();
    expect(anotherMoment(st, 12345)).toBe(true); expect(pos()).not.toBe(before);
    st.undo(); expect(pos()).toBe(before);
    const bare = new Store(scene('planted')); bare.edit(s => { s.fish = []; }); expect(anotherMoment(bare, 1)).toBe(false);
  });
});

describe('Settings', () => {
  it('units switch the scene; rules change only the brief field', () => {
    const st = new Store(scene('planted')); expect(UNIT_OPTS.map(o => o[0])).toEqual(['in', 'cm']);
    setUnits(st, 'cm'); expect(st.scene.units).toBe('cm'); setUnits(st, 'in'); expect(st.scene.units).toBe('in');
    const design = () => JSON.stringify([st.tank.fish, st.tank.items, st.tank.tank]), before = design();
    expect(rulesNow(st)).toBe('guided');
    expect(chooseRules(st, 'sandbox')).toBe(true); expect(rulesNow(st)).toBe('sandbox'); expect(chooseRules(st, 'sandbox')).toBe(false);
    expect(design()).toBe(before);
    chooseRules(st, 'guided'); expect(rulesNow(st)).toBe('guided');
  });
  it('graphics model: one row per effect with GS1 wording; a locked key says so; Back to Full only when off Full', () => {
    const names = ['Full quality', 'Balanced', 'Fast', 'Fastest'];
    const m = graphicsModel({ level: 0, auto: true, fps: null, lowered: null }, names, { ...FX_DEFAULT }, [], 'moving');
    expect(m.rows.length).toBe(Object.keys(FX_DEFAULT).length); expect(m.rows.find(r => r.key === 'caustics')!.label).toBe('Caustics');
    expect(m.showBackToFull).toBe(false); expect(m.caustics).toEqual({ text: 'Caustics: moving.', retry: false });
    const low = graphicsModel({ level: 2, auto: false, fps: 24, lowered: { from: 0, at: 0, fps: 24 } }, names, { ...FX_DEFAULT, caustics: false }, ['caustics'], 'still: slow machine');
    expect(low.showBackToFull).toBe(true); expect(low.reason).toMatch(/Auto lowered this from Full quality/); expect(low.fps).toBe('24 fps while moving');
    const c = low.rows.find(r => r.key === 'caustics')!; expect(c.locked).toBe(true); expect(c.tag).toBe('(set by the page address)'); expect(low.caustics.retry).toBe(true);
    expect(m.rows.find(r => r.key === 'tonemap')!.kind).toBe('choice'); expect(m.rows.find(r => r.key === 'tonemap')!.tag).toBe('(default)');
    void FX;
  });
});

describe('Print', () => {
  it('three presets (no Build plan); the shopping list ticks 7 of 9 like mockup 08', () => {
    expect(PRESETS.map(p => p.title)).toEqual(['Shopping list', 'Setup sheet', 'Full report']);
    const s = presetById('shopping'); expect(s.parts.length).toBe(9); expect(s.defaults.length).toBe(7);
    expect(s.defaults).not.toContain('where'); expect(s.defaults).not.toContain('picture'); expect(tickCount(s, new Set(s.defaults))).toBe(7);
  });
  it('ticks are per preset, remembered, and a preset puts back its own', () => {
    let p = defaultPrefs(); p = toggleTick(p, 'animals'); expect(p.ticks.shopping).not.toContain('animals');
    p = toggleTick(p, 'where'); expect(p.ticks.shopping).toContain('where');
    const st = fake(); savePrefs(p, st); expect(loadPrefs(st)).toEqual(p);
    const q = choosePreset(p, 'report'); expect(q.preset).toBe('report'); expect(q.ticks.report.length).toBe(7);
    expect(choosePreset(p, 'shopping').ticks.shopping).toEqual(presetById('shopping').defaults);
    expect(loadPrefs(fake())).toEqual(defaultPrefs());
  });
  it('rows are sorted into parts by what they are', () => {
    expect(['Tank (45 gal)', 'Stand', 'Substrate', 'Hardscape (rock, wood, caves, dishes)', 'Live plants', 'Artificial plants', 'Animals', 'Filter', 'Light (36 W)'].map(partOfRow))
      .toEqual(['tank', 'tank', 'substrate', 'substrate', 'plants', 'plants', 'animals', 'equipment', 'equipment']);
  });
  for (const ex of ['planted', 'reef', 'iwagumi'] as const) {
    it(`Shopping list matches the old report's numbers: ${ex}`, () => {
      const sc = scene(ex), r = reportOf(sc, 0, prof, NOW), all = new Set(presetById('shopping').defaults);
      const p = paperOf('shopping', all, { scene: sc, active: 0, profile: prof, now: NOW });
      const old = [...r.buyFirst, ...r.buyLater], mine = p.groups.flatMap(g => g.lines.filter(l => !l.sub));
      expect(shoppingTotal(p)).toBe(old.reduce((t, l) => t + l.usd, 0));
      expect(p.totals!.toBuy).toBe(dollars(shoppingTotal(p)));
      expect(p.totals!.monthly).toBe(`${dollars(r.tiers.ideal.upkeepUsdMo)}/mo`);
      expect(mine.map(l => [l.name, l.usd]).sort()).toEqual(old.map(l => [l.label, l.usd]).sort());
      expect(p.owned!.lines.map(l => l.name)).toEqual(r.have.map(h => h.label)); expect(p.owned!.lines.every(l => l.usd === 0)).toBe(true);
    });
  }
  it('unticking a part drops it and its dollars; unticking Prices drops every price and the totals', () => {
    const sc = scene('planted'), t = new Set(presetById('shopping').defaults), inp = { scene: sc, active: 0, profile: prof, now: NOW };
    const full = paperOf('shopping', t, inp);
    t.delete('animals'); const less = paperOf('shopping', t, inp);
    expect(less.groups.map(g => g.id)).not.toContain('animals'); expect(shoppingTotal(less)).toBeLessThan(shoppingTotal(full));
    t.delete('prices'); const bare = paperOf('shopping', t, inp);
    expect(bare.totals).toBeNull(); expect(paperText(bare)).not.toContain('To buy'); expect(paperCsv(bare).split('\r\n')[0]).toBe('Group,Qty,Item,Note');
    expect(paperOf('shopping', new Set(), inp).empty).toBe(true);
  });
  it('shopping text and csv carry the same lines; the csv has a price column', () => {
    const sc = scene('planted'), p = paperOf('shopping', new Set(presetById('shopping').defaults), { scene: sc, active: 0, profile: prof, now: NOW });
    const csv = paperCsv(p).trim().split('\r\n'); expect(csv[0]).toBe('Group,Qty,Item,Note,Price');
    expect(csv.length - 1).toBe([...p.groups, p.owned!].reduce((n, g) => n + g.lines.length, 0));
    expect(paperText(p)).toContain(`To buy: ${p.totals!.toBuy}`);
    expect(fileName('Planted community', 'shopping', 'csv')).toBe('planted-community-shopping-list.csv');
  });
  it('Where to buy lists the sales the plan finds (or is an empty list)', () => {
    const p = paperOf('shopping', new Set(['where', 'tank']), { scene: scene('planted'), active: 0, profile: prof, now: NOW });
    expect(Array.isArray(p.where)).toBe(true);
  });
  it('Setup sheet = the old sheet, sections filtered by tick; .csv is the old csv', () => {
    const sc = scene('planted'), all = new Set(presetById('setup').defaults), inp = { scene: sc, active: 0, profile: prof, now: NOW };
    const p = paperOf('setup', all, inp);
    expect(JSON.stringify(p.sheet)).toBe(JSON.stringify(buildSheet(sc, 0))); expect(paperCsv(p)).toBe(sheetCsv(buildSheet(sc, 0)));
    all.delete('animals'); all.delete('tank'); const q = paperOf('setup', all, inp), titles = q.sheet!.sections.map(s => s.title);
    expect(titles).not.toContain('Animals'); expect(titles).not.toContain('Tank'); expect(titles.length).toBeGreaterThan(0);
  });
  it('Full report = the old report page, with the unticked parts left out; its picture only when ticked', () => {
    const sc = scene('planted'), t = new Set(presetById('report').defaults), shot = 'data:image/jpeg;base64,AAAA', inp = { scene: sc, active: 0, profile: prof, now: NOW, shot };
    const full = paperOf('report', t, inp);
    for (const id of ['rundown', 'picture', 'have', 'shopping', 'costs', 'living', 'warnings']) expect(full.html, id).toContain(`data-rp="${id}"`);
    expect(full.html).toContain('<img src="data:image/jpeg');
    t.delete('costs'); t.delete('picture'); const some = paperOf('report', t, inp);
    expect(some.html).not.toContain('data-rp="costs"'); expect(some.html).not.toContain('<img src'); expect(some.html).toContain('data-rp="shopping"');
    expect(filterReportHtml('<section class="rp-sec" data-rp="a">x</section><section class="rp-sec rp-pic" data-rp="b">y</section>', new Set(['b']))).toBe('<section class="rp-sec rp-pic" data-rp="b">y</section>');
    expect(paperText(full)).toMatch(/Quick rundown/); expect(paperCsv(full).split('\r\n')[0]).toBe('Section,Line');
  });
});
