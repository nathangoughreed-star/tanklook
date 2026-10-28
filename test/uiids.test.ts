import { describe, it, expect } from 'vitest';


// a handler wired to an id that index.html no longer has throws inside attachPanels and leaves the
// rest of the UI (animal picker, sidebar adding) dead; the toolbar rework removed #welcomeBtn this way
describe('UI element ids', () => {
  it('every $(\'id\') literal in src/ui exists in index.html', async () => {
    // @ts-expect-error node only
    const { readFileSync, readdirSync } = await import('node:fs');
    const html = readFileSync('index.html', 'utf8');
    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
    const missing: string[] = [];
    for (const f of readdirSync('src/ui').filter((f: string) => f.endsWith('.ts'))) {
      const s = readFileSync('src/ui/' + f, 'utf8');
      for (const m of s.matchAll(/\$(?:<[^>]+>)?\('([A-Za-z0-9_-]+)'\)/g)) if (!ids.has(m[1])) missing.push(`${f}:${m[1]}`);
    }
    expect(missing).toEqual([]);
  });
});
