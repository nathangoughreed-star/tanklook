// STUB (lane DX5): the one door into Discovery that the start flows call. Lane DX4 owns src/ui/discover/* and replaces this file with the real
// `openDiscovery`; the signature is the contract. Until then it only announces the request (nothing listens, so nothing happens).
import type { Tab } from '../../scene/scope';

export interface DiscoveryOpen {
  /** the tabs to tick (default: all five) */ scope?: Tab[];
  /** who is asking: the New-tank shortcuts, the guided questioner, a tab's own button */ from?: 'start-exploring' | 'start-ideas' | 'start-existing' | 'coach' | 'tab';
}
export function openDiscovery(opts: DiscoveryOpen = {}): void {
  if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('tanklook:discover', { detail: opts }));
}
