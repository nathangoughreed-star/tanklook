// The Discovery screen's door (lane AB3 replaced DX4's proposal cards): attachDiscoverPanel mounts the A/B compare (src/ui/ab/screen.ts) and returns the same { open, close }
// that panels.ts, keep.ts and entry.ts already call, so every Discover button reaches the A/B screen. The DX4 proposal-card list (Apply / Reject) is retired.
import { TABS, type Tab } from '../../scene/scope';
import { SECTION_OF } from './logic';
import { attachAbScreen } from '../ab/screen';
import { createRealEngine } from '../ab/real';
import type { VerdictOpts } from '../../scene/verdict';
import type { Store } from '../../scene/store';
import type { Viewer } from '../../render/viewer';

export interface DiscoverDeps { status: (msg: string, warn?: boolean) => void; opts: () => VerdictOpts }
export interface DiscoverUI { open(scope?: Tab | Tab[], quick?: boolean): void; close(): void }

/** Open a left-panel section (a relaxation button only ever opens the setting, it never changes it). */
export function openSection(name: string) {
  const sec = document.querySelector<HTMLDetailsElement>(`details.sec[data-sec="${SECTION_OF[name] ?? name}"]`);
  if (!sec) return;
  sec.open = true; sec.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

export function attachDiscoverPanel(store: Store, viewer: Viewer, deps: DiscoverDeps): DiscoverUI {
  // real session (AB0) + history (AB2); the pair source is still the stand-in in ui/ab/fake.ts until AB1's nextPair merges (swap `draw` in ui/ab/real.ts)
  const engine = createRealEngine(store, deps.opts);
  const ui = attachAbScreen(store, viewer, engine, { status: deps.status });
  const quickEl = document.getElementById('quickBlock');
  return {
    open(arg, quick = false) {
      const scope = Array.isArray(arg) ? TABS.filter(t => arg.includes(t)) : arg ? [arg] : undefined;
      ui.open(scope);
      if (quick) { const d = document.querySelector<HTMLDetailsElement>('.abq'); if (d && quickEl) d.open = true; }
    },
    close: ui.close,
  };
}
