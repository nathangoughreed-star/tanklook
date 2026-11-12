// The one door into the Discovery screen for other lanes (DX5's start flows): openDiscovery({ scope?, from? }).
// scope absent (from 'coach' / 'new' or the global button) = every unlocked tab; scope given = exactly those tabs. If the panel has not loaded yet the call waits for it.
import type { Tab } from '../../scene/scope';

export interface DiscoveryOpen { scope?: Tab[]; from?: string }
type Opener = (o: DiscoveryOpen) => void;
let opener: Opener | undefined, pending: DiscoveryOpen | undefined;

/** DQ13: the A/B screen has no way in except `?ab=1` (debugging). Every other Discover door opens the in-editor card. */
export const abEnabled = (search?: string): boolean => { try { return new URLSearchParams(search ?? location.search).get('ab') === '1'; } catch { return false; } };
export function openDiscovery(opts: DiscoveryOpen = {}): void {
  if (!abEnabled()) { if (opts.from !== 'resume') openInlineDiscover(opts.scope?.length === 1 ? opts.scope[0] : undefined); return; }   // a saved A/B session (SL2) opens the editor; the card's pill is there
  if (opener) opener(opts); else pending = opts;
}
/** The panel registers itself here (panels.ts); a call made before it loaded is replayed. */
export function registerDiscovery(fn: Opener): void { opener = fn; if (pending) { const p = pending; pending = undefined; fn(p); } }

// DQ10: Discover inside the editor (ui/discover/inline.ts) registers its opener here; DQ13: openDiscovery above now routes here unless ?ab=1.
type InlineOpener = (tab?: Tab) => void;
let inlineOpener: InlineOpener | undefined, inlinePending: { tab?: Tab } | undefined;
export const openInlineDiscover = (tab?: Tab): void => { if (inlineOpener) inlineOpener(tab); else inlinePending = { ...(tab ? { tab } : {}) }; };
export function registerInline(fn: InlineOpener): void { inlineOpener = fn; if (inlinePending) { const p = inlinePending; inlinePending = undefined; fn(p.tab); } }
