// Tarantulas (lane TA, 2026-10-16; roadmap Release 2): the data of the large-arachnid body plan, built in 3D by
// render/tarantula3d.ts, plus a plain side card for the no-WebGL fallback and picking. Unit = the BODY length (nose of the
// carapace to the spinnerets = the card width = the species' `tl`); legs reach well past the card (span about 3x). Frame as
// the jumping spider (art/spiders.ts): x forward, y up, z to the animal's + side; heights y from the underside of the carapace
// (the sternum); the standing surface lies at y = -stand below it.
// Species: Grammostola pulchripes (Chaco golden knee), a terrestrial New World tarantula: a heavy rounded carapace with a
// central fovea, the eyes together on a small tubercle at the front, big chelicerae with fangs, thick palps, a big round
// abdomen with a bald urticating-hair patch, eight stout legs of seven segments (coxa, trochanter, femur, patella, tibia,
// metatarsus, tarsus) with scopulae pads, pale golden knees on a dark leg, rose-brown fuzz. The male is slimmer and darker,
// with a hook on the tibia of each front leg; otherwise the same animal.
import type { Ctx, Proj } from './paint';
import type { SMark, Stn } from './spiders';

/** One of the eight legs (the + side; the far side mirrors it). */
export interface TarLeg {
  hx: number; hz: number;               // where the coxa leaves the underside
  foot: [number, number];               // the tarsus tip's place on the surface in the walking pose (x, z from the midline)
  /** coxa, trochanter, femur, patella, tibia, metatarsus, tarsus */
  len: [number, number, number, number, number, number, number];
  /** radius at the joints: hip, coxa/troch, troch/femur, femur/patella, patella/tibia, tibia/meta, meta/tarsus, tip */
  r: [number, number, number, number, number, number, number, number];
}

export interface TarSpec {
  sex: 'm' | 'f';
  aspect: number;                       // card height / width
  stand: { ground: number; glass: number; tuck: number };  // underside of the carapace above the surface: walking, clinging, resting
  carapace: Stn[]; abdomen: Stn[];
  eT: number; eB: number;               // section exponents of the carapace
  legs: [TarLeg, TarLeg, TarLeg, TarLeg];
  tubercle: { x: number; rx: number; ry: number; rz: number; lift: number };   // the eye mound
  eyeR: number;
  fovea: { x: number; hw: number; depth: number };
  palp: { pts: [number, number, number][]; r: number[] };
  chel: { len: number; r: number; fang: number };
  // paint
  carapaceCol: string; abdomenCol: string; legCol: [string, string]; palpCol: string; hairCol: string; legHair: string; chelCol: string;
  carapaceMarks: SMark[]; abdomenMarks: SMark[];
  legBands: number[];                   // segments (0 coxa .. 6 tarsus) that wear the pale colour
  patch: { x: number; hw: number; col: string };        // the urticating patch on the abdomen's back
  hooks: boolean;                       // the male's tibial hooks on the front pair
  hair: { body: number; leg: number };  // strands per body part / per leg
}

/** The ground line v (card frame, + down), = the resting offset. */
export const tarGround = (S: TarSpec) => S.aspect / 2 - 0.015;

// A heavy, wide, low carapace (front first): x, half-width, top, bottom, centre line.
const CARAPACE: Stn[] = [
  [0.5, 0.07, 0.04, 0.05, 0.08], [0.48, 0.12, 0.07, 0.075, 0.095], [0.44, 0.165, 0.095, 0.095, 0.11], [0.38, 0.195, 0.11, 0.105, 0.115],
  [0.3, 0.208, 0.118, 0.105, 0.118], [0.22, 0.2, 0.112, 0.1, 0.112], [0.14, 0.172, 0.09, 0.09, 0.098], [0.08, 0.12, 0.06, 0.065, 0.078], [0.05, 0.05, 0.03, 0.04, 0.06],
];
// A big round abdomen, lifted clear of the ground when it walks.
const ABDOMEN: Stn[] = [
  [0.07, 0.07, 0.05, 0.05, 0.14], [0.0, 0.18, 0.13, 0.115, 0.165], [-0.1, 0.245, 0.18, 0.14, 0.17], [-0.22, 0.275, 0.205, 0.155, 0.17],
  [-0.34, 0.245, 0.19, 0.145, 0.16], [-0.44, 0.15, 0.115, 0.095, 0.14], [-0.5, 0.06, 0.05, 0.045, 0.12],
];
/** The male's abdomen: smaller and slimmer. */
const ABDOMEN_M: Stn[] = ABDOMEN.map(([x, hw, t, b, yc]) => [x * 0.95, hw * 0.76, t * 0.82, b * 0.82, yc - 0.01] as Stn);

const leg = (hx: number, foot: [number, number], len: TarLeg['len'], r: TarLeg['r']): TarLeg => ({ hx, hz: 0.1, foot, len, r });
const LEGS_F: TarSpec['legs'] = [
  leg(0.3, [1.02, 0.6], [0.075, 0.04, 0.36, 0.17, 0.28, 0.25, 0.16], [0.1, 0.095, 0.088, 0.088, 0.08, 0.068, 0.056, 0.038]),
  leg(0.22, [0.62, 0.95], [0.075, 0.04, 0.34, 0.17, 0.26, 0.24, 0.15], [0.098, 0.092, 0.086, 0.086, 0.078, 0.066, 0.055, 0.037]),
  leg(0.13, [-0.2, 1.0], [0.07, 0.04, 0.33, 0.16, 0.25, 0.26, 0.15], [0.096, 0.09, 0.084, 0.084, 0.076, 0.064, 0.054, 0.036]),
  leg(0.05, [-0.96, 0.74], [0.07, 0.04, 0.38, 0.17, 0.3, 0.34, 0.17], [0.096, 0.09, 0.086, 0.086, 0.076, 0.062, 0.052, 0.035]),
];
/** The male's legs: longer, a touch thinner. */
const LEGS_M: TarSpec['legs'] = LEGS_F.map(l => ({ ...l, len: l.len.map(v => v * 1.08) as TarLeg['len'], r: l.r.map(v => v * 0.88) as TarLeg['r'], foot: [l.foot[0] * 1.1, l.foot[1] * 1.1] })) as TarSpec['legs'];

const PALP = { pts: [[0.47, 0.06, 0.06], [0.54, 0.0, 0.1], [0.6, -0.04, 0.115], [0.655, -0.075, 0.11], [0.7, -0.1, 0.1]] as [number, number, number][], r: [0.04, 0.042, 0.038, 0.034, 0.03] };

const patchMark = (c: string): SMark => ({ k: 'ell', x: -0.27, s: 0, rx: 0.13, rs: 0.17, c, o: 0.7, soft: 0.04 });

export const TARANTULAS: Record<string, TarSpec> = {
  // Male ~45 mm body (span ~13 cm): near black, bronze-gold fuzz, bright golden knees, a hook on the front tibiae.
  gpulchripes: {
    sex: 'm', aspect: 0.62, stand: { ground: 0.19, glass: 0.07, tuck: 0.07 },
    carapace: CARAPACE, abdomen: ABDOMEN_M, eT: 2.3, eB: 2.7, legs: LEGS_M,
    tubercle: { x: 0.435, rx: 0.062, ry: 0.032, rz: 0.07, lift: 0.0 }, eyeR: 0.0125,
    fovea: { x: 0.2, hw: 0.065, depth: 0.014 },
    palp: PALP, chel: { len: 0.13, r: 0.052, fang: 0.15 },
    carapaceCol: '#241812', abdomenCol: '#33251f', legCol: ['#1f1713', '#cfc29a'], palpCol: '#2a1d17', hairCol: '#563a2e', legHair: '#58402f', chelCol: '#1d1410',
    carapaceMarks: [
      { k: 'band', x: [0.06, 0.46], s: [0.38, 0.5], c: '#a8845a', o: 0.5, soft: 0.03 }, // gold hair along the carapace's edge
      { k: 'band', x: [0.1, 0.45], s: [0.0, 0.25], c: '#6b4a38', o: 0.4, soft: 0.05 },
      { k: 'ell', x: 0.2, s: 0, rx: 0.012, rs: 0.075, c: '#0e0907', o: 0.9, soft: 0.006 },
    ],
    abdomenMarks: [{ k: 'mottle', n: 160, r: [0.02, 0.06], c: '#54402f', o: 0.4, seed: 4 }, patchMark('#3e2a22')],
    legBands: [3], patch: { x: -0.27, hw: 0.14, col: '#5e3226' }, hooks: true, hair: { body: 26000, leg: 6500 },
  },
  // Female ~50 mm body (span ~15 cm): dark brown, rose-pink fuzz, pale golden knees.
  gpulchripes_f: {
    sex: 'f', aspect: 0.62, stand: { ground: 0.19, glass: 0.07, tuck: 0.07 },
    carapace: CARAPACE, abdomen: ABDOMEN, eT: 2.3, eB: 2.7, legs: LEGS_F,
    tubercle: { x: 0.435, rx: 0.062, ry: 0.032, rz: 0.07, lift: 0.0 }, eyeR: 0.0125,
    fovea: { x: 0.2, hw: 0.065, depth: 0.014 },
    palp: PALP, chel: { len: 0.13, r: 0.055, fang: 0.15 },
    carapaceCol: '#3a2a20', abdomenCol: '#47362f', legCol: ['#2a201a', '#c4b898'], palpCol: '#3a2a22', hairCol: '#6a4a3a', legHair: '#654a3c', chelCol: '#2a1d16',
    carapaceMarks: [
      { k: 'band', x: [0.06, 0.46], s: [0.38, 0.5], c: '#b69470', o: 0.5, soft: 0.03 },
      { k: 'band', x: [0.1, 0.45], s: [0.0, 0.25], c: '#8a6a52', o: 0.35, soft: 0.05 },
      { k: 'ell', x: 0.2, s: 0, rx: 0.012, rs: 0.075, c: '#150e0a', o: 0.9, soft: 0.006 },
    ],
    abdomenMarks: [{ k: 'mottle', n: 160, r: [0.02, 0.06], c: '#6e5448', o: 0.4, seed: 5 }, patchMark('#4e3026')],
    legBands: [3], patch: { x: -0.27, hw: 0.14, col: '#7a3a24' }, hooks: false, hair: { body: 26000, leg: 6500 },
  },
};

/** The other pet tarantulas (lane arthropods 2026-10-28): the Chaco golden knee female's build with each species' own colours; `body` = length in mm is the species' tl. */
const variant = (c: Partial<TarSpec>, legCol: [string, string], extra: Partial<TarSpec> = {}): TarSpec => ({ ...TARANTULAS.gpulchripes_f, legCol, ...c, ...extra });
TARANTULAS.bhamorii = variant({ carapaceCol: '#2a1c14', abdomenCol: '#352620', palpCol: '#2c1e16', hairCol: '#6a4630', legHair: '#5a4030', chelCol: '#1d1410' }, ['#24180f', '#c84a22']);
TARANTULAS.grosea = variant({ carapaceCol: '#5c4a3e', abdomenCol: '#6a5448', palpCol: '#584638', hairCol: '#8a6a5a', legHair: '#806656', chelCol: '#3a2a22' }, ['#5a4638', '#8a6c5a']);
TARANTULAS.talbopilosus = variant({ carapaceCol: '#241c16', abdomenCol: '#2a201a', palpCol: '#241c16', hairCol: '#6a5230', legHair: '#7a6038', chelCol: '#1c1410' }, ['#241c16', '#8a7448']);
TARANTULAS.aavicularia = variant({ carapaceCol: '#3a3028', abdomenCol: '#3e342c', palpCol: '#3a2e26', hairCol: '#6a5848', legHair: '#6a5a4a', chelCol: '#241a14' }, ['#3a3028', '#c4666e']);
/** The `bend` values Shuffle stores for each pose (render/tarantula3d.ts tarMode reads them back): walking, resting tucked, the threat pose. */
export const TAR_BEND = { walk: 0, tuck: 0.5, threat: 1 } as const;
/** A pose for a tarantula drawn from `u` (0..1): mostly walking, a quarter resting, a tenth in the threat pose; `calm` = no threat or rest (on the glass). */
export const tarantulaBend = (u: number, calm = false) => (calm ? TAR_BEND.walk : u < 0.1 ? TAR_BEND.threat : u < 0.35 ? TAR_BEND.tuck : TAR_BEND.walk);
export const isTarantula = (art: string) => art in TARANTULAS;
export function tarantulaMeta(art: string): { aspect: number; rest: number } | undefined {
  const S = TARANTULAS[art]; return S && { aspect: S.aspect, rest: tarGround(S) };
}

/** The side card (no-WebGL fallback and the picking target): abdomen, carapace, legs standing on the ground line, the eyes. */
function drawTarantula(S: TarSpec, ctx: Ctx, P: Proj, W: number) {
  const g = tarGround(S), base = g - S.stand.ground; // y of the carapace's underside (card frame, + down)
  const pt = (x: number, y: number) => P(x + 0.5, base - y);
  const blob = (st: Stn[], col: string) => {
    const top: [number, number][] = [], bot: [number, number][] = [];
    for (const [x, , t, b, yc] of st) { top.push(pt(x, yc + t)); bot.push(pt(x, yc - b)); }
    ctx.fillStyle = col; ctx.beginPath(); top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); bot.reverse().forEach(([x, y]) => ctx.lineTo(x, y)); ctx.closePath(); ctx.fill();
  };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  S.legs.forEach(l => {
    const f = l.foot[0] * 0.55 + l.hx * 0.45, a = pt(l.hx, 0.02), kn = pt((l.hx + f) / 2, 0.42), b = pt(f, -S.stand.ground);
    ctx.strokeStyle = S.legCol[0]; ctx.lineWidth = l.r[3] * 2 * W; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...kn); ctx.stroke();
    ctx.lineWidth = l.r[5] * 2 * W; ctx.beginPath(); ctx.moveTo(...kn); ctx.lineTo(...b); ctx.stroke();
    ctx.fillStyle = S.legCol[1]; ctx.beginPath(); ctx.arc(kn[0], kn[1], l.r[4] * W * 1.1, 0, 7); ctx.fill();
  });
  blob(S.abdomen, S.hairCol); blob(S.carapace, S.carapaceCol);
  const [ex, ey] = pt(S.tubercle.x + 0.02, 0.2);
  ctx.fillStyle = '#080605'; ctx.beginPath(); ctx.arc(ex, ey, S.eyeR * W * 1.4, 0, 7); ctx.fill();
}
export const TARANTULA_ART: Record<string, (ctx: Ctx, P: Proj, W: number) => void> =
  Object.fromEntries(Object.entries(TARANTULAS).map(([k, S]) => [k, (c: Ctx, P: Proj, W: number) => drawTarantula(S, c, P, W)]));
