// FD unit 2 (R165): the "Building the tank" state over the viewer. The wait is the shader link of a first load, an opened example or a planned tank
// (measured: research/fd/waits-desktop.json). Nothing shows for the first second; then a quiet hand-drawn wave line; after 3 seconds one tip about the tool
// (src/data/loadingTips.json, each with its source). The viewer announces it with a `tank:building` event (viewer.ts hint()).
import { useEffect, useState } from 'preact/hooks';
import tips from '../data/loadingTips.json';

export const SHOW_AFTER_MS = 1000, TIP_AFTER_MS = 3000;
/** Which tip to show for the nth wait (they take turns). */
export const tipFor = (n: number): string => tips.tips[((n % tips.tips.length) + tips.tips.length) % tips.tips.length].text;

export function BuildingBar() {
  const [stage, setStage] = useState<0 | 1 | 2>(0), [n, setN] = useState(0);
  useEffect(() => {
    let t1 = 0, t2 = 0;
    const f = (e: Event) => {
      clearTimeout(t1); clearTimeout(t2);
      if (!(e as CustomEvent<{ on: boolean }>).detail?.on) { setStage(0); return; }
      t1 = window.setTimeout(() => { setN(k => k + 1); setStage(1); }, SHOW_AFTER_MS);
      t2 = window.setTimeout(() => setStage(2), TIP_AFTER_MS);
    };
    addEventListener('tank:building', f);
    return () => { removeEventListener('tank:building', f); clearTimeout(t1); clearTimeout(t2); };
  }, []);
  if (!stage) return null;
  return (
    <div class="ov loadbar glass" role="status" aria-live="polite">
      <svg class="loadwave" viewBox="0 0 120 14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 8c8-7 14 7 22 0s14 7 22 0 14 7 22 0 14 7 22 0 14 7 22 0" /></svg>
      <span class="loadtxt">Building the tank</span>
      {stage === 2 ? <span class="loadtip">{tipFor(n)}</span> : null}
    </div>
  );
}
