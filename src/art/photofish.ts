/**
 * Generic photo-fish loader (fish model method, research/fish-model-sheet-method.md), DOGFOOD ONLY: loaded by main.ts with `?photoart`.
 * Every src/data/fishart/<id>.anatomy.json with a `render.photo` block (written by scripts/fish-build.py) is applied: measured outline and
 * thickness, the sheet's own eye, photo-cut paired fins, top and front projection layers, and the card. No per-species code.
 */
import { PLANS, profile } from './fishgen';
import { FISH_ART } from './placeholder';
import { FIN_OPACITY, PHOTO_FINS } from '../render/textures';
import { PROJ_ART } from './projart';

const base = import.meta.env.BASE_URL;
// `v` = the build's stamp (render.photo.ver, fish-build.py): a rebuilt fish's images keep their URLs, and the browser's image cache served the
// old opacity map across reloads (2026-11-24); the stamp makes each build's URLs new
const load = (f: string, v?: string) => new Promise<HTMLCanvasElement>((res, rej) => {
  const im = new Image();
  im.onload = () => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d')!.drawImage(im, 0, 0); res(c); };
  im.onerror = () => rej(new Error('photofish: ' + f + ' failed to load')); im.src = `${base}art/fish/${f}.webp${v ? '?v=' + v : ''}`;
});
const files = import.meta.glob('../data/fishart/*.anatomy.json', { eager: true, import: 'default' }) as Record<string, any>;

/** The 3D eye covers the iris only: eye_full (fish-eye-colour.py, 1.35 x the sheet's eye r) reached the dark socket round the eye on
 *  nearly every build-B fish, and the dome painted it as iris: a wide pale ring that read as an oversized eye (Nathan 2026-11-25, zebra
 *  danio; all 25 live cards checked: the iris edge sits at 1.0-1.15 r). 1.1 r = 0.815 eye_full; the card's own socket shows round it. */
const EYE_IRIS = 1.1 / 1.35;
/**
 * Applies the build-B fish: all of them (?photoart, the review page) or only the arts in `only` (the approved ones in
 * src/data/fishLive.json, for every visitor). Images load in parallel; resolves to the arts that loaded, so a fish whose
 * images failed keeps its old look (main.ts swaps only those).
 */
export async function loadPhotoFish(only?: ReadonlySet<string>): Promise<Set<string>> {
 const done = new Set<string>();
 await Promise.all(Object.values(files).map(async J => {
  const R = J.anatomy?.render?.photo;
  if (!R || (only && !only.has(R.art))) return;
  const id: string = R.art;
  try {
    const v = R.ver as string | undefined;
    const [card, top, front, fin, op, finop] = await Promise.all([load(id, v), load(id + '-top', v), load(id + '-front', v), R.finImg ? load(id + '-fin', v) : Promise.resolve(null),
      R.opacity ? load(id + '-op', v) : Promise.resolve(null), R.opacity ? load(id + '-finop', v) : Promise.resolve(null)]);   // fin opacity maps (method row 61)
    const P: any = (PLANS[id] ??= { ...PLANS[R.plan ?? 'oscar'] }), A = J.anatomy, d = A.depthProfile, F: any = A.fins;
    delete P.fins; delete P.finGrid;
    if (R.bodyClear) P.bodyClear = R.bodyClear; else delete P.bodyClear; // see-through body zones from the photo check (scripts/fish-body-class.py; fishgen seeThrough)
    const pedU = 1 - 1 / A.tlOverSl, SLc = 1 - pedU, U = (s: number) => pedU + SLc * (1 - s / 100), Wd = (x: number) => x / 100 * SLc;
    const topPts = d.stations.map((s: number, i: number) => [U(s), -Wd(d.top[i])] as [number, number]), botPts = d.stations.map((s: number, i: number) => [U(s), Wd(d.bottom[i])] as [number, number]);
    // measured stations are sparse: smooth them lightly and resample with a clamped cubic so the head and tail are curves, not facets
    const smoothCurve = (pts: [number, number][], n = 120) => {
      const pp = pts.map((q, i) => i > 1 && i < pts.length - 2 ? [q[0], (pts[i - 1][1] + 2 * q[1] + pts[i + 1][1]) / 4] as [number, number] : q).sort((a, b) => a[0] - b[0]);
      const m = pp.map((_q, i) => { const a0 = pp[Math.max(0, i - 1)], b0 = pp[Math.min(pp.length - 1, i + 1)]; return (b0[1] - a0[1]) / ((b0[0] - a0[0]) || 1); });
      const out: [number, number][] = [];
      for (let k = 0; k < n; k++) {
        const u = pp[0][0] + (pp[pp.length - 1][0] - pp[0][0]) * k / (n - 1); let i = 0; while (i < pp.length - 2 && pp[i + 1][0] < u) i++;
        const h = pp[i + 1][0] - pp[i][0] || 1, t = (u - pp[i][0]) / h, t2 = t * t, t3 = t2 * t;
        out.push([u, (2 * t3 - 3 * t2 + 1) * pp[i][1] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * pp[i + 1][1] + (t3 - t2) * h * m[i + 1]]);
      }
      return out;
    };
    const topS = smoothCurve(topPts), botS = smoothCurve(botPts);
    Object.assign(P, { pedU, outline: [...topS.reverse(), ...botS] }); // outlineProfile (fishgen.ts) wants the snout first: top snout to tail, then bottom tail to snout
    P.thick = A.thickness.fit.thick * (R.thickx ?? 1); P.pedT = A.thickness.fit.pedT;
    if (R.measuredWidth) P.halfWidth = d.stations.map((s: number, i: number) => [U(s), Wd(A.thickness.halfWidthPctSL[i]) * (R.thickx ?? 1)] as [number, number]).sort((a: number[], b: number[]) => a[0] - b[0]);
    P.tail = { ...P.tail, h: R.noTail ? 0.0005 : Wd(Math.max(...F.caudal.outline.map((c: number[]) => (c[1] + c[2]) / 2))) };
    if (F.dorsal) P.dorsal = { ...P.dorsal, at: U(F.dorsal.baseStartPctSL), len: Wd(F.dorsal.baseEndPctSL - F.dorsal.baseStartPctSL), h: Wd(F.dorsal.maxHeightPctSL) };
    // a row of finlets (bichir): one plain band over all of them, its height the tallest finlet; the fin card's alpha cuts each finlet out.
    // The template plan's spiny front (oscar: spines 0.6, spineH 0.05-0.07) drew a dark block in front of the first finlet (method row 57)
    if (R.finlets) {
      P.finlets = R.finlets;
      const hp: [number, number][] = (F.dorsal?.heightProfile ?? []).map(([sp, h]: number[]) => [U(sp), h] as [number, number]).sort((a: number[], b: number[]) => a[0] - b[0]);
      const spans: [number, number][] = []; let s0: number | null = null, last = 0;
      for (const [u, h] of hp) { if (h > 0.3) { if (s0 === null) s0 = u; last = u; } else if (s0 !== null) { spans.push([s0, last]); s0 = null; } }
      if (s0 !== null) spans.push([s0, last]);
      if (spans.length) P.finletSpans = spans;
    }
    if (R.finlets && P.dorsal) P.dorsal = { at: P.dorsal.at, len: P.dorsal.len, h: P.dorsal.h, spines: 0, lead: 1, rake: 0.5, tip: 'round', trail: 0, a: P.dorsal.a };
    if (F.adipose) P.rootedTop = [[U(F.adipose.baseEndPctSL), U(F.adipose.baseStartPctSL)]];   // from the fin map (fish-build.py): the card cut its base away and the adipose floated (black skirt, sweep 2026-11-24)
    if (F.dorsal2) P.dorsal2 = { ...P.dorsal2, at: U(F.dorsal2.baseStartPctSL), len: Wd(F.dorsal2.baseEndPctSL - F.dorsal2.baseStartPctSL), h: Wd(F.dorsal2.maxHeightPctSL) };
    if (F.anal) P.anal = { ...P.anal, at: U(F.anal.baseStartPctSL), len: Wd(F.anal.baseEndPctSL - F.anal.baseStartPctSL), h: Wd(F.anal.maxHeightPctSL), rake: 0.85 };
    // the template plan's spines (oscar: spineH 0.04-0.07) stood taller than a low measured fin and drew a slab of card around it
    // (bichir anal: spines 0.04-0.06 on a 0.022 fin, method row 59): no spine above the fin's own height
    for (const k of ['dorsal', 'dorsal2', 'anal'] as const) {
      const f = P[k]; if (!f || !f.spineH) continue;
      const sh = (Array.isArray(f.spineH) ? f.spineH : [f.spineH, f.spineH]) as [number, number];
      if (Math.max(...sh) > f.h) P[k] = { ...f, spineH: [Math.min(sh[0], f.h), Math.min(sh[1], f.h)] };
    }
    const { sx, sl, ax } = R, cv = (x: number, y: number): [number, number] => [1 - (sx - x) / sl * SLc, (y - ax) / sl * SLc];
    P.fins = {};
    if (R.pec) {
      const pu = cv(R.pec.root[0], R.pec.root[1])[0], [pt, pb] = profile(P)(pu), poly = R.pec.poly.map(([x, y]: number[]) => cv(x, y));
      P.pectoral = true; P.pec = { u: pu, v: ((R.pec.root[1] - ax) / sl * SLc - pt) / (pb - pt), s: R.pec.s ?? 1, tint: R.pec.tint ?? '#6b6354', spread: R.pec.spread, flat: R.pec.flat, sweep: R.pec.sweep };
      P.fins.pectoral = poly; P.fins.pectoralRoot = poly[0];
    }
    if (R.pelvic) {
      const poly = R.pelvic.poly?.map(([x, y]: number[]) => cv(x, y));
      P.pelvic = { u: cv(R.pelvic.root[0], R.pelvic.root[1])[0], len: (R.pelvic.len ?? 120) / sl * SLc, tint: R.pelvic.tint ?? '#6b6354' };
      if (poly) { P.fins.pelvic = poly; P.fins.pelvicRoot = poly[0]; }
    } else delete P.pelvic;
    delete P.gape; delete P.gapeDrop; P.gillLine = 0;
    { const [ex, ey, er] = R.eye, u = 1 - (sx - ex) / sl * SLc, v = (ax - ey) / sl * -1 * SLc, [et, eb] = profile(P)(u);
      P.eye = { ...P.eye, u, dv: (v - et) / (eb - et) - 0.38, r: (R.eyeFull ? R.eyeFull * EYE_IRIS : er) / sl * SLc, iris: R.eyeIris ?? ['#c8902a', '#0a0206'], ...(R.eyePupil ? { pupil: R.eyePupil } : {}), ...(R.pupilFrac ? { pupilFrac: Math.min(0.9, R.pupilFrac / EYE_IRIS) } : {}) }; }   // iris sampled from the sheet's own eye (fish-eye-colour.py); amber only for older builds
    if (R.planExtra) Object.assign(P, R.planExtra); // per-model Plan knobs from the spec's plan_extra (cory barbels: method row 53)
    PHOTO_FINS[id] = { img: fin ?? card };
    if (op && finop) { FIN_OPACITY[id] = { card: op, fin: finop }; P.tailBlend = 0.05; }   // the solid fades onto the card over 5 % of TL before the fin
    PROJ_ART[id] = { top: { img: top }, front: { img: front, k: R.proj.fk, y0: R.proj.y0, ...(R.proj.ramp ? { ramp: R.proj.ramp } : {}) } };   // ramp: a wedge snout faces sideways, so its front layer needs a wider fade (Nathan 2026-11-25, three-spot)
    FISH_ART[id] = (ctx, _p, W) => ctx.drawImage(card, 0, 0, W, W * (ctx.canvas.height / ctx.canvas.width));
    done.add(id);
  } catch (e) { console.warn(e); }
 }));
 return done;
}
