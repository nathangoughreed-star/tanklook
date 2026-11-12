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
    expect(tools).toMatch(/id="undo2"[^>]*hm2-collapsed-only/);   // reachable when the panel is collapsed
  });
  it('the room-light slider and Auto live in the View menu', () => {
    const pop = between('<div id="viewPop"', '</div>\n<');
    expect(html.indexOf('id="roomChip"')).toBeGreaterThan(html.indexOf('<div id="viewPop"'));
    expect(between('<div class="viewtools">', '<div id="pairMenu"')).not.toContain('roomChip');
    expect(html).toContain('id="vRoomAuto"'); void pop;
  });
  it('the Save icon runs the header Save; Ctrl+S too; undo state drives both button pairs', () => {
    expect(between('<div class="viewtools">', '<div id="pairMenu"')).toMatch(/id="saveIcon"[^>]*Save \(Ctrl\+S\)/);
    expect(panels).toMatch(/\$\('saveIcon'\)\.onclick = \(\) => \$\('saveScene'\)\.click\(\)/);
    expect(panels).toMatch(/\['undo', 'undo2'\]\)[^\n]*disabled = !store\.canUndo/);
    expect(panels).toMatch(/\['redo', 'redo2'\]\)[^\n]*disabled = !store\.canRedo/);
  });
});
