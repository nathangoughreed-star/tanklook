import { describe, expect, it } from 'vitest';
import { SANDBOX_ACTION, SUGGEST_ACTION, WELCOME_TILES, welcomeOutcome } from '../src/ui/welcome';

describe('welcome screen: what do you have in mind?', () => {
  it('has four pieces of information in order; Sandbox is not one of them', () => {
    expect(WELCOME_TILES.map(t => t.title)).toEqual(['Animals', 'Appearance', 'Tank or equipment', "I'm open to ideas"]);
  });
  it('each card goes where its piece is chosen', () => {
    const by = (id: string) => welcomeOutcome(WELCOME_TILES.find(t => t.id === id)!.action);
    expect(by('animal')).toEqual({ kind: 'go', to: 'stocking' });
    expect(by('look')).toEqual({ kind: 'go', to: 'look' });
    expect(by('equipment')).toEqual({ kind: 'go', to: 'equipment' });
    expect(by('open')).toEqual({ kind: 'go', to: 'suggest' });
  });
  it('Build manually (Sandbox) is a separate action to an empty tank; Suggest opens the Suggest panel', () => {
    expect(welcomeOutcome(SANDBOX_ACTION)).toEqual({ kind: 'go', to: 'sandbox' });
    expect(welcomeOutcome(SUGGEST_ACTION)).toEqual({ kind: 'go', to: 'suggest' });
  });
});
