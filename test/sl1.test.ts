import { describe, it, expect } from 'vitest';
import { canClose, routeChoice, stepForMenu, backOf, libraryState, CHOICES, EMPTY_LIBRARY } from '../src/ui/startScreenLogic';

// @ts-expect-error node only (no node types in this project)
const fs = await import('node:fs');
const readFileSync = (f: string, enc: 'utf8') => fs.readFileSync(new URL(`../${f}`, import.meta.url), enc) as string;
describe('SL1 start screen', () => {
  it('first load cannot close; from the toolbar it can', () => { expect(canClose(true)).toBe(false); expect(canClose(false)).toBe(true); });
  it('three plain choices, each routed to its own step', () => {
    expect(CHOICES.map(c => c.label)).toEqual(['New Setup', 'Starter / Example Setups', 'Open Existing']);
    expect(CHOICES.map(c => routeChoice(c.id))).toEqual(['new', 'starters', 'open']);
  });
  it('toolbar New / Open land on the matching step', () => {
    expect(stepForMenu('new')).toBe('new'); expect(stepForMenu('open')).toBe('open'); expect(stepForMenu('open', 'starters')).toBe('starters');
  });
  it('Back ends at the three choices, never the editor', () => {
    expect(backOf('home')).toBeNull();
    for (const s of ['new', 'starters', 'open', 'deals'] as const) expect(backOf(s)).toBe('home');
  });
  it('an empty library shows the empty state', () => { expect(libraryState(0)).toBe('empty'); expect(libraryState(2)).toBe('list'); expect(EMPTY_LIBRARY).toBe('No saved tanks yet in this browser'); });
  it('markup: one start dialog, the three buttons, an upload button, no old mode dialog', () => {
    const html = readFileSync('index.html', 'utf8');
    for (const id of ['startNew', 'startStarters', 'startOpen', 'openFile', 'habitatList', 'startDeals']) expect(html).toContain(`id="${id}"`);
    expect(html).not.toContain('id="modeDlg"'); expect(html).not.toContain('id="startSwap"');
    expect(html).toContain('Open a file from your computer');
  });
});
