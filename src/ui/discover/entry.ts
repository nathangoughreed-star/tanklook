// The one door into the Discovery screen for other lanes (DX5's start flows): openDiscovery({ scope?, from? }).
// scope absent (from 'coach' / 'new' or the global button) = every unlocked tab; scope given = exactly those tabs. If the panel has not loaded yet the call waits for it.
import type { Tab } from '../../scene/scope';

export interface DiscoveryOpen { scope?: Tab[]; from?: string }
type Opener = (o: DiscoveryOpen) => void;
let opener: Opener | undefined, pending: DiscoveryOpen | undefined;

export function openDiscovery(opts: DiscoveryOpen = {}): void { if (opener) opener(opts); else pending = opts; }
/** The panel registers itself here (panels.ts); a call made before it loaded is replayed. */
export function registerDiscovery(fn: Opener): void { opener = fn; if (pending) { const p = pending; pending = undefined; fn(p); } }

// DQ10: Discover inside the editor (ui/discover/inline.ts) registers its opener here; the A/B door above is unchanged.
let inlineOpener: (() => void) | undefined;
export const openInlineDiscover = (): void => inlineOpener?.();
export function registerInline(fn: () => void): void { inlineOpener = fn; }
