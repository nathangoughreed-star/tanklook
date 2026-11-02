// The Guided entry (lane C4 2026-10-27; GV1 stepper 2026-10-30; since 2026-11-02 and lane VD5 it is Visual Discovery only, ui/discovery/).
// The old Kind / Start from / What you have / Limits stepper, its picture cards and the look-first screen are retired (research/design/visual-discovery-plan.md,
// question 2). Owned gear and limits are panels of Make It Your Own (ui/ownedGear.ts, ui/limitsPanel.ts), opened from the brief bar.
import type { Store } from '../scene/store';
import type { TankSetup } from '../scene/types';
import { attachDiscovery, type DiscoveryHost } from './discovery/screens';

export interface WelcomeHost {
  status(m: string, bad?: boolean): void;
  /** The animal screen (Animals): "I already know my animals". */ stocking(): void;
  /** An empty tank in the editor. */ sandbox(): boolean;
  /** Open the old New / Open chooser (deals, starters, saved tanks). */ browse(menu: 'new' | 'open'): void;
  /** Discovery's personalized pictures (lane VD6): draw a scene in the viewer, return a small picture. */ shot?(T: TankSetup): string;
}

export function attachWelcome(store: Store, host: WelcomeHost) {
  let discovery: ReturnType<typeof attachDiscovery> | undefined;
  const dh: DiscoveryHost = { status: host.status, stocking: host.stocking, sandbox: host.sandbox, browse: host.browse, shot: host.shot };
  /** Open Guided: Visual Discovery at its first open step (a fresh tank starts at Environment; a known roster usually at Family). */
  return { show() { (discovery ??= attachDiscovery(store, dh)).open(); } };
}
