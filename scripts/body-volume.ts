// Volume of the lofted fish body (src/render/fish3d.ts sections() / ringPt(), which are not exported, copied here: keep in step; test/bodymass.test.ts fails when the stored volumes drift from this). Card width 1 = total length; the body only, no fins. Used offline by the cross-check, never at run time.
import { profile, type Plan } from '../src/art/fishgen';

const EXP = 2.4, INSET = 0.006, RING = 120, ST = 400;
const spE = (c: number, e: number) => Math.sign(c) * Math.abs(c) ** (2 / e);
const smooth = (a: number, b: number, x: number) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
// copy of fish3d.ts sections()/ringPt() (not exported); volume of the lofted body in card-width^3
export function unitVolume(p: Plan) {
  const prof = profile(p), thick = p.thick!, pedT = p.pedT ?? 0.55, gu = 1 - (1 - p.pedU) * 0.2;
  const maxHv = Math.max(...Array.from({ length: 41 }, (_, i) => { const [a, b] = prof(p.pedU + (1 - p.pedU) * i / 40); return (b - a) / 2; }));
  let vol = 0, prev = 0;
  for (let i = 0; i <= ST; i++) {
    const u = p.pedU + (1 - p.pedU) * i / ST, s = (u - p.pedU) / (1 - p.pedU), [a, b] = prof(u), vc = (a + b) / 2, hv = Math.max(0, (b - a) / 2 - INSET);
    let t = thick * (0.35 * hv + 0.65 * maxHv * Math.sin(Math.min(1, hv / maxHv) * Math.PI / 2)) * (pedT + (1 - pedT) * Math.sqrt(s));
    if (p.step) t *= 1 - p.step * smooth(gu - 0.015, gu + 0.02, u);
    if (p.noseW) { t = Math.max(t, p.noseW * thick * maxHv * smooth(0.55, 0.8, s) * (1 - 0.5 * smooth(0.9, 1, s))); const k = Math.max(0, (s - 0.86) / 0.14); t *= Math.sqrt(Math.max(0, 1 - k * k)); }
    let A = 0, px = 0, py = 0;
    for (let j = 0; j <= RING; j++) {
      const th = j / RING * Math.PI * 2, c = Math.cos(th), e = c < 0 ? EXP * (1 + 2.5 * (p.belly ?? 0)) : EXP;
      const v = vc - hv * spE(c, e), z = t * spE(Math.sin(th), e) * (1 - 0.5 * (p.wide ?? 0) * c);
      if (j) A += px * z - v * py; 
      px = v; py = z;
    }
    A = Math.abs(A) / 2;
    if (i) vol += (A + prev) / 2 * (1 - p.pedU) / ST;
    prev = A;
  }
  return vol;
}
