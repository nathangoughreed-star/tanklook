// The Guided entry (lane C4 2026-10-27; GV1 stepper 2026-10-30; VD5 2026-11-02: Visual Discovery only; since lane GS4, Guided Setup Rev 03, 2026-11-02: the one onboarding shell,
// ui/guided/shell.ts): World -> Equipment -> Limits -> Starting Point, then Animals First or Look First in the same dialog. Owned gear and limits are also panels of Make It
// Your Own (ui/ownedGear.ts, ui/limitsPanel.ts), opened from the brief bar, for revisiting.
import type { Store } from '../scene/store';
import type { TankSetup } from '../scene/types';
import type { DiscoveryHost } from './discovery/screens';
import { attachGuided } from './guided/shell';
import type { OnboardStep } from './guided/logic';

export interface WelcomeHost {
  status(m: string, bad?: boolean): void;
  /** The animal screen (Animals First, until lane GS5 embeds its roster picker). */ stocking(): void;
  /** An empty tank in the editor. */ sandbox(): boolean | Promise<boolean>;
  /** Open the old New / Open chooser (deals, starters, saved tanks). */ browse(menu: 'new' | 'open'): void;
  /** Discovery's personalized pictures (lane VD6): draw a scene in the viewer, return a small picture. */ shot?(T: TankSetup): string;
}

export function attachWelcome(store: Store, host: WelcomeHost) {
  let guided: ReturnType<typeof attachGuided> | undefined;
  const dh: DiscoveryHost = { status: host.status, stocking: host.stocking, sandbox: host.sandbox, browse: host.browse, shot: host.shot };
  /** Open Guided at the first onboarding step still waiting (a fresh tank starts at World); `at` opens a given step ("Starting from something I have now" = Equipment). */
  return { show(at?: OnboardStep) { (guided ??= attachGuided(store, dh)).show(at); } };
}
