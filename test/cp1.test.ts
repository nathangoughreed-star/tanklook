// CP1: "Constraints and preferences" is two menu sections; every door opens the right one.
import { describe, it, expect } from 'vitest';
import { DEMO_STEPS } from '../src/ui/coach/steps';
// @ts-expect-error node only (no node types in this project)
const fs = await import('node:fs');
const read = (f: string) => fs.readFileSync(f, 'utf8') as string;
describe('CP1 split menu', () => {
  const html = read('index.html'), panels = read('src/ui/panels.ts');
  it('has Preferences and Constraints as sibling sections, no old brief section', () => {
    expect(html).toContain('data-sec="prefs"><summary><h2>Preferences</h2>'); expect(html).toContain('data-sec="limits"><summary><h2>Constraints</h2>');
    expect(html).not.toContain('data-sec="brief"');
  });
  it('limits doors open Constraints', () => {
    expect(panels).toContain("openSec('limits'); $('limitsHost')"); expect(panels).toContain("attachLimitsPanel($('limitsHost'), () => openSec('limits'))");
    expect(panels).not.toContain("openSec('brief')");
    expect(DEMO_STEPS.find(s => s.id === 'limits')!.target).toEqual({ section: 'limits', control: '#limitsHost' });
  });
});
