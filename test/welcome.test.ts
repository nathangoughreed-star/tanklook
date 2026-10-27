import { describe, expect, it } from 'vitest';
import { SUGGEST_ACTION, WELCOME_TILES, welcomeOutcome } from '../src/ui/welcome';

describe('welcome screen', () => {
  it('has the three entry tiles in order', () => {
    expect(WELCOME_TILES.map(t => t.title)).toEqual(['An animal I want', 'A look I want', 'Sandbox']);
  });
  it('animal goes to the stocking screen, sandbox to an empty tank', () => {
    const by = (id: string) => welcomeOutcome(WELCOME_TILES.find(t => t.id === id)!.action);
    expect(by('animal')).toEqual({ kind: 'go', to: 'stocking' });
    expect(by('sandbox')).toEqual({ kind: 'go', to: 'sandbox' });
  });
  it('look and Suggest a setup show a coming-soon panel', () => {
    const look = welcomeOutcome(WELCOME_TILES[1].action), sug = welcomeOutcome(SUGGEST_ACTION);
    expect(look.kind).toBe('soon'); expect(sug.kind).toBe('soon');
    expect((sug as { text: string }).text).toMatch(/coming soon/);
  });
});
