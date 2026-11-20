/**
 * Clown knifefish built from a single generated reference sheet (fish model method, research/fish-model-sheet-method.md),
 * DOGFOOD ONLY: loaded by main.ts with `?photoart`. Mirrors the settings that gave the accepted harness render
 * (scripts/fish3d-cutout-test.ts; src/data/fishart/clownknife.anatomy.json `render` block): measured outline and thickness,
 * photo-cut pectoral fins, the sheet's own eye, top and front projection layers.
 */
import anatomy from '../data/fishart/clownknife.anatomy.json';
import { PLANS, profile } from './fishgen';
import { FISH_ART } from './placeholder';
import { PHOTO_FINS } from '../render/textures';
import { PROJ_ART } from './projart';

const base = import.meta.env.BASE_URL;
const load = (f: string) => new Promise<HTMLCanvasElement>((res, rej) => {
  const im = new Image();
  im.onload = () => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d')!.drawImage(im, 0, 0); res(c); };
  im.onerror = () => rej(new Error('photoknife: ' + f + ' failed to load')); im.src = `${base}art/fish/${f}.webp`;
});
const [card, top, front] = await Promise.all([load('clownknife'), load('clownknife-top'), load('clownknife-front')]);

const P: any = PLANS.clownknife, A = anatomy.anatomy, d = A.depthProfile, F: any = A.fins;
delete P.fins; delete P.finGrid;
const pedU = 1 - 1 / A.tlOverSl, SLc = 1 - pedU, U = (s: number) => pedU + SLc * (1 - s / 100), Wd = (x: number) => x / 100 * SLc;
const topPts = d.stations.map((s, i) => [U(s), -Wd(d.top[i])] as [number, number]), botPts = d.stations.map((s, i) => [U(s), Wd(d.bottom[i])] as [number, number]);
Object.assign(P, { pedU, outline: [...topPts, ...botPts.reverse()] });
P.thick = A.thickness.fit.thick; P.pedT = A.thickness.fit.pedT;
P.tail = { ...P.tail, h: Wd(Math.max(...F.caudal.outline.map((c: number[]) => (c[1] + c[2]) / 2))) };
P.dorsal = { ...P.dorsal, at: U(F.dorsal.baseStartPctSL), len: Wd(F.dorsal.baseEndPctSL - F.dorsal.baseStartPctSL), h: Wd(F.dorsal.maxHeightPctSL) };
P.anal = { ...P.anal, at: U(F.anal.baseStartPctSL), len: Wd(F.anal.baseEndPctSL - F.anal.baseStartPctSL), h: Wd(F.anal.maxHeightPctSL), rake: 0.85 };
// sheet px (side_full): snout 1405, SL 1220, axis y 200
const sx = 1405, sl = 1220, ax = 200, cv = (x: number, y: number): [number, number] => [1 - (sx - x) / sl * SLc, (y - ax) / sl * SLc];
{ const pu = cv(1160, 268)[0], [pt, pb] = profile(P)(pu);
  P.pectoral = true; P.pec = { u: pu, v: ((268 - ax) / sl * SLc - pt) / (pb - pt), s: 1, tint: '#6b6354', spread: 1.0 }; delete P.pelvic;
  const poly = [[1160, 268], [1100, 252], [1040, 258], [1046, 275], [1095, 290], [1150, 285]].map(([x, y]) => cv(x, y));
  P.fins = { pectoral: poly, pectoralRoot: poly[0] }; }
delete P.gape; delete P.gapeDrop; P.gillLine = 0;
{ const u = 1 - (sx - 1338) / sl * SLc, v = (ax - 208) / sl * -1 * SLc, [et, eb] = profile(P)(u);
  P.eye = { ...P.eye, u, dv: (v - et) / (eb - et) - 0.38, r: 18 / sl * SLc, iris: ['#c8902a', '#0a0206'] }; }
PHOTO_FINS.clownknife = { img: card };
PROJ_ART.clownknife = { top: { img: top }, front: { img: front, k: 1276, y0: 0.004 } };
FISH_ART.clownknife = (ctx, _p, W) => ctx.drawImage(card, 0, 0, W, W * (ctx.canvas.height / ctx.canvas.width));
