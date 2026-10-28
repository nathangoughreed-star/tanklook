// Pet arthropods beyond the tarantulas, the isopods and the crabs (lane arthropods, 2026-10-28; research/arthropods/arthropods.md): scorpion,
// millipede, roach, mantis and stick insect, built on the amphibian generator (art/herps.ts Herp3D: one side outline + half-widths for the
// body, Limb3D joint chains for legs, claws, feelers and the scorpion's tail), so one description feeds both the side card (picking, the
// species picker) and the 3D body (render/herp3d.ts). Unit = the card width = the species' `tl`; u 0 rear .. 1 nose; v down from the centre
// line in widths; the animal stands on the ground line g = aspect / 2 - 0.015. herps.ts spreads ARTH_ART / ARTH3D / arthMeta in. One file per
// family in art/arth/; each is data only, in the true colours of the reference photos listed in research/arthropods/arthropods.json.
import { type Ctx, type Proj, body, blob, rng } from './paint';
import type { Herp3D, Limb3D, Mark3D } from './herps';
import { ground, type ArthSpec } from './arth/util';
import { SPEC as EMPEROR } from './arth/scorpion';
import { SPEC as AFRICAN } from './arth/millipede';
import { SPEC as HISSING } from './arth/roach';
import { SPEC as ORCHID } from './arth/mantis';
import { SPEC as INDIAN } from './arth/stick';

export const ARTH: Record<string, ArthSpec> = { emperorscorpion: EMPEROR, africanmillipede: AFRICAN, hissingroach: HISSING, orchidmantis: ORCHID, indianstick: INDIAN };
export const ARTH3D: Record<string, Herp3D> = Object.fromEntries(Object.entries(ARTH).map(([k, s]) => [k, s.h]));
export const arthMeta = (art: string) => { const s = ARTH[art]; return s && { aspect: s.aspect, rest: ground(s.aspect) }; };

/** The side card, drawn from the same description as the 3D body: the outline filled with the colour stops, the limbs as tapered strokes. */
function drawArth(s: ArthSpec, ctx: Ctx, P: Proj, W: number) {
  const h = s.h, g = h.ground, col = (i: number) => h.tone[Math.min(i, h.tone.length - 1)][1];
  const chain = (l: Limb3D, far: boolean) => {
    const c = l.c ? l.c[0] : h.legCol[0];
    ctx.strokeStyle = far ? '#000' : c; ctx.globalAlpha = far ? 0.25 : 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 1; i < l.js.length; i++) {
      const a = l.js[i - 1], b = l.js[i], [x0, y0] = P(a[0] - (far ? 0.015 : 0), a[1]), [x1, y1] = P(b[0] - (far ? 0.015 : 0), b[1]);
      ctx.lineWidth = Math.max(1, (a[3] + b[3]) * W); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    // knobbed knees (the 3D leg swells its interior joints by `knee`)
    if (l.knee && !far) for (let i = 1; i < l.js.length - 1; i++) { const [x, y] = P(l.js[i][0], l.js[i][1]); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, Math.max(1, l.js[i][3] * l.knee * W), 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  };
  // the 3D body's extra solids (eye cones, wing panels, leg lobes, spines, hairs) as ellipses along their axis, near side and midline only
  const solids = () => {
    for (const sd of h.solids ?? []) {
      if (sd.at[2] < 0) continue;
      const [x, y] = P(sd.at[0], sd.at[1]), [x1, y1] = P(sd.at[0] + sd.ax[0], sd.at[1] + sd.ax[1]), rot = Math.atan2(y1 - y, x1 - x), len = Math.hypot(sd.ax[0], sd.ax[1]);
      if (len < 0.05 || Math.max(sd.r[1], sd.r[2]) < 0.004) continue; // pointing at the viewer, or a hair or keel too fine for the card
      const thick = sd.up && Math.abs(sd.up[2]) > 0.5 ? sd.r[2] : sd.r[1]; // the half-thickness seen from the side
      ctx.fillStyle = sd.c[0]; ctx.beginPath(); ctx.ellipse(x, y, Math.max(1, sd.r[0] * W), Math.max(0.6, thick * W), rot, 0, 7); ctx.fill();
    }
  };
  for (const l of h.limbs) chain(l, true);
  body(ctx, P, W, h.side, g - 0.3, g, [[0, col(0)], [0.5, col(1)], [1, col(2)]], 0.02, l => {
    for (const m of h.marks as Mark3D[]) {
      if (m.k === 'spots') { const r = rng(m.seed); for (let i = 0; i < Math.min(m.n, 40); i++) blob(l, P, W, m.u[0] + r() * (m.u[1] - m.u[0]), g - 0.12 + r() * 0.06, m.r[1], m.r[1] * 0.7, m.c, m.o * 0.5); }
    }
  });
  solids();
  for (const l of h.limbs) chain(l, false);
}
export const ARTH_ART: Record<string, (ctx: Ctx, P: Proj, W: number) => void> = Object.fromEntries(Object.entries(ARTH).map(([k, s]) => [k, (c: Ctx, P: Proj, W: number) => drawArth(s, c, P, W)]));
