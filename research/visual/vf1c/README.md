# VF1 follow-up: wall glow and cold load (2026-11-12)

Wall glow: with ACES on, the tank's warm light on the room wall (Nathan 2026-10-08) went flat grey: the wall is lit
above 1, the hue-keeping normalise was skipped under tone mapping, and ACES compressed and desaturated it. Room surfaces
(uRoomMat: wall, floor, stand) now stay out of the curve and keep the normalise. Planted wall pixels: unchanged
(240,233,219), ACES before the fix (217,214,209), ACES after (240,233,219): identical to unchanged. VF1-wall-glow-fix.pdf.

Cold first frame (cold-ab.json; fresh profile per load, before / after alternating, median of 3, first frame / settled ms):
| tank | VF0 build (before) | VF1 build (after) |
|---|---|---|
| planted4 | 4903 / 7078 | 4431 / 7231 |
| nano | 3164 / 4995 | 3284 / 5380 |
| reef | 4797 / 7132 | 3779 / 6253 |
Within noise (single loads vary by 1-3 s on this shared machine); the "after" build also carries VF-B's plant variety.
VF0's own recording was 3781 / 3200 / 3763 ms (first frame).

Steady GPU, front view, alternating none vs ACES: paired delta +0.15 / +0.36 / +0.33 ms; draw calls unchanged.
