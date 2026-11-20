/**
 * Generic photo-fish loader (fish model method, research/fish-model-sheet-method.md), DOGFOOD ONLY: loaded by main.ts with `?photoart`.
 * Every src/data/fishart/<id>.anatomy.json with a `render.photo` block (written by scripts/fish-build.py) is applied: measured outline and
 * thickness, the sheet's own eye, photo-cut paired fins, top and front projection layers, and the card. No per-species code.
 */
import { PLANS, profile } from './fishgen';
import { FISH_ART } from './placeholder';
import { PHOTO_FINS } from '../render/textures';
import { PROJ_ART } from './projart';

const base = import.meta.env.BASE_URL;
const load = (f: string) => new Promise<HTMLCanvasElement>((res, rej) => {
  const im = new Image();
  im.onload = () => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d')!.drawImage(im, 0, 0); res(c); };
  im.onerror = () => rej(new Error('photofish: ' + f + ' failed to load')); im.src = `${base}art/fish/${f}.webp`;
});
const files = import.meta.glob('../data/fishart/*.anatomy.json', { eager: true, import: 'default' }) as Record<string, any>;

for (const J of Object.values(files)) {
  const R = J.anatomy?.render?.photo;
  if (!R) continue;
  const id: string = R.art;
  try {
    const [card, top, front, fin] = await Promise.all([load(id), load(id + '-top'), load(id + '-front'), R.finImg ? load(id + '-fin') : Promise.resolve(null)]);
    const P: any = (PLANS[id] ??= { ...PLANS[R.plan ?? 'oscar'] }), A = J.anatomy, d = A.depthProfile, F: any = A.fins;
    delete P.fins; delete P.finGrid;
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
    Object.assign(P, { pedU, outline: [...topS, ...botS.reverse()] });
    P.thick = A.thickness.fit.thick * (R.thickx ?? 1); P.pedT = A.thickness.fit.pedT;
    if (R.measuredWidth) P.halfWidth = d.stations.map((s: number, i: number) => [U(s), Wd(A.thickness.halfWidthPctSL[i]) * (R.thickx ?? 1)] as [number, number]).sort((a: number[], b: number[]) => a[0] - b[0]);
    P.tail = { ...P.tail, h: R.noTail ? 0.0005 : Wd(Math.max(...F.caudal.outline.map((c: number[]) => (c[1] + c[2]) / 2))) };
    if (F.dorsal) P.dorsal = { ...P.dorsal, at: U(F.dorsal.baseStartPctSL), len: Wd(F.dorsal.baseEndPctSL - F.dorsal.baseStartPctSL), h: Wd(F.dorsal.maxHeightPctSL) };
    if (F.dorsal2) P.dorsal2 = { ...P.dorsal2, at: U(F.dorsal2.baseStartPctSL), len: Wd(F.dorsal2.baseEndPctSL - F.dorsal2.baseStartPctSL), h: Wd(F.dorsal2.maxHeightPctSL) };
    if (F.anal) P.anal = { ...P.anal, at: U(F.anal.baseStartPctSL), len: Wd(F.anal.baseEndPctSL - F.anal.baseStartPctSL), h: Wd(F.anal.maxHeightPctSL), rake: 0.85 };
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
      P.eye = { ...P.eye, u, dv: (v - et) / (eb - et) - 0.38, r: er / sl * SLc, iris: ['#c8902a', '#0a0206'] }; }
    PHOTO_FINS[id] = { img: fin ?? card };
    PROJ_ART[id] = { top: { img: top }, front: { img: front, k: R.proj.fk, y0: R.proj.y0 } };
    FISH_ART[id] = (ctx, _p, W) => ctx.drawImage(card, 0, 0, W, W * (ctx.canvas.height / ctx.canvas.width));
  } catch (e) { console.warn(e); }
}
