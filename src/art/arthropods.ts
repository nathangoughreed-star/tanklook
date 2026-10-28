// Pet arthropods beyond the tarantulas, the isopods and the crabs (lane arthropods, 2026-10-28; research/arthropods/arthropods.md): scorpion,
// millipede, roach, mantis and stick insect, built on the amphibian generator (art/herps.ts Herp3D: one side outline + half-widths for the
// body, Limb3D joint chains for legs, claws, feelers and the scorpion's tail), so one description feeds both the side card (picking, the
// species picker) and the 3D body (render/herp3d.ts). Unit = the card width = the species' `tl`; u 0 rear .. 1 nose; v down from the centre
// line in widths; the animal stands on the ground line g = aspect / 2 - 0.015. herps.ts spreads ARTH_ART / ARTH3D / arthMeta in. Each
// family below is data only; colours are the true colours of the reference photos listed in research/arthropods/arthropods.json.
import { type Ctx, type Proj, type Pt, body, blob, rng } from './paint';
import type { Herp3D, Limb3D, Mark3D } from './herps';

export interface ArthSpec { aspect: number; h: Herp3D }
const ground = (aspect: number) => aspect / 2 - 0.015;

/** A plain capsule body with no limbs: the placeholder every family starts from until its real drawing replaces it. */
function stub(aspect: number, col: string): ArthSpec {
  const g = ground(aspect), top = g - 0.16, side: Pt[] = [[0.98, g - 0.08, 'c'], [0.9, top + 0.03], [0.6, top], [0.2, top + 0.01], [0.04, g - 0.08, 'c'], [0.2, g - 0.01], [0.6, g], [0.9, g - 0.01]];
  return { aspect, h: { side, wid: [[0.04, 0.03], [0.5, 0.08], [0.96, 0.03]], belly: 2.4, tone: [[0, col], [0.5, col], [1, col]], marks: [], limbs: [], legCol: [col, col],
    eye: { u: 0.9, th: 0.3, r: 0.012, iris: ['#2a2420', '#080606'], pupil: 'dark', bulge: 0.6 }, ground: g } };
}

export const ARTH: Record<string, ArthSpec> = {
  emperorscorpion: stub(0.4, '#1d2a24'),
  africanmillipede: stub(0.12, '#2a2420'),
  hissingroach: stub(0.34, '#4a2c18'),
  orchidmantis: stub(0.55, '#f2e8ea'),
  indianstick: stub(0.3, '#7a6a48'),
};
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
    ctx.globalAlpha = 1;
  };
  for (const l of h.limbs) chain(l, true);
  body(ctx, P, W, h.side, g - 0.3, g, [[0, col(0)], [0.5, col(1)], [1, col(2)]], 0.02, l => {
    for (const m of h.marks as Mark3D[]) {
      if (m.k === 'spots') { const r = rng(m.seed); for (let i = 0; i < Math.min(m.n, 40); i++) blob(l, P, W, m.u[0] + r() * (m.u[1] - m.u[0]), g - 0.12 + r() * 0.06, m.r[1], m.r[1] * 0.7, m.c, m.o * 0.5); }
    }
  });
  for (const l of h.limbs) chain(l, false);
}
export const ARTH_ART: Record<string, (ctx: Ctx, P: Proj, W: number) => void> = Object.fromEntries(Object.entries(ARTH).map(([k, s]) => [k, (c: Ctx, P: Proj, W: number) => drawArth(s, c, P, W)]));
