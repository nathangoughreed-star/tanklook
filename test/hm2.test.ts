// HM2: view toolbar tidy. Static checks on index.html and the wiring source.
import { describe, it, expect } from 'vitest';
// @ts-expect-error node only (no node types in this project)
const { readFileSync } = await import('node:fs');
const html = readFileSync('index.html', 'utf8');
const panels = readFileSync('src/ui/panels.ts', 'utf8');
const between = (a: string, b: string) => html.slice(html.indexOf(a), html.indexOf(b));
describe('HM2 view toolbar', () => {
  it('Undo / Redo are the first thing in the left panel, not on the view bar', () => {
    const side = html.slice(html.indexOf('<aside id="side">'));
    expect(side.indexOf('id="undo"')).toBeGreaterThan(-1);
    expect(side.indexOf('id="undo"')).toBeLessThan(side.indexOf('<header class="top">'));
    expect(side.indexOf('id="redo"')).toBeLessThan(side.indexOf('<header class="top">'));
    const tools = between('<div class="viewtools">', '<div id="pairMenu"');
    expect(tools).not.toMatch(/id="undo"|id="redo"/);
    expect(tools).not.toMatch(/id="undo2"|id="redo2"|id="saveIcon"/);   // HM3: none of Undo / Redo / Save on the viewer, even collapsed
  });
  it('the room-light slider and Auto live in the View menu', () => {
    const pop = between('<div id="viewPop"', '</div>\n<');
    expect(html.indexOf('id="roomChip"')).toBeGreaterThan(html.indexOf('<div id="viewPop"'));
    expect(between('<div class="viewtools">', '<div id="pairMenu"')).not.toContain('roomChip');
    expect(html).toContain('id="vRoomAuto"'); void pop;
  });
  it('HM3: no Map / Save / Discover on the viewer; undo state drives the panel pair', () => {
    expect(html).not.toContain('id="mapShow"');
    expect(html).toContain('id="mapOn"');   // the View menu's Map checkbox
    expect(html).not.toContain('id="hm3Discover"');
    expect(panels).toMatch(/\['undo'\]\)[^\n]*disabled = !store\.canUndo/);
    expect(panels).toMatch(/\['redo'\]\)[^\n]*disabled = !store\.canRedo/);
  });
});
