// BR2: the tap label. A small note over the tapped animal saying what the sim has it doing ("Bronze cory: rooting in the sand"), kept current, each phrase held
// at least 1.5 s so a quick change does not flicker. When it is rushing or fleeing a pair the stocking check flags, one line quotes that verdict and links to it.
// Tapping never pauses the sim; the label reads the sim on a timer only while it is shown.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Viewer } from '../render/viewer';
import { FISH_TAP } from '../interact/viewLock';

export const OPEN_CHECK = 'tl-open-check';
const HOLD_MS = 1500, SHOW_MS = 9000, TICK_MS = 250;
interface Shown { text: string; why?: string; x: number; y: number; at: number }

export function FishLabel({ getViewer, watch }: { getViewer: () => Viewer | undefined; watch: boolean }) {
  const [shown, setShown] = useState<Shown | null>(null);
  const id = useRef<number | null>(null), last = useRef(0), cur = useRef<Shown | null>(null);
  useEffect(() => {
    const read = () => {
      const v = getViewer(), i = id.current; if (!v || i == null) return;
      const l = v.fishLabel(i), now = performance.now();
      if (!l || now - last.current > SHOW_MS) { id.current = null; cur.current = null; setShown(null); return; }
      const c = cur.current, keep = !!c && c.text !== l.text && now - c.at < HOLD_MS; // hold the phrase it has until it has been up for 1.5 s
      const n: Shown = keep ? { ...c!, x: l.x, y: l.y } : { text: l.text, why: l.why, x: l.x, y: l.y, at: c && c.text === l.text ? c.at : now };
      cur.current = n; setShown(n);
    };
    const tap = (e: Event) => { const d = (e as CustomEvent<{ id: number | null }>).detail?.id ?? null; id.current = d; last.current = performance.now(); cur.current = null; if (d == null) setShown(null); else read(); };
    const t = setInterval(read, TICK_MS);
    addEventListener(FISH_TAP, tap);
    return () => { clearInterval(t); removeEventListener(FISH_TAP, tap); };
  }, [getViewer]);
  const pin = (el: HTMLDivElement | null) => { el?.style.setProperty('display', 'block', 'important'); }; // Tank only hides every direct child of the app but the viewer; the label is the one that stays
  if (!shown) return null;
  const left = Math.min(Math.max(shown.x, 90), innerWidth - 90), top = Math.max(shown.y - 8, 40);
  return (
    <div ref={pin} class="fishlabel glass" role="status" style={{ left: `${left}px`, top: `${top}px` }}>
      <div class="fl-text">{shown.text}</div>
      {shown.why ? <div class="fl-why">{shown.why}{watch ? null : <> <button type="button" class="fl-link" onClick={() => dispatchEvent(new Event(OPEN_CHECK))}>See the stocking check</button></>}</div> : null}
    </div>
  );
}
