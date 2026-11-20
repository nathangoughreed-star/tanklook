/**
 * Photo-cutout fish art (fish-painter experiment, 2026-11-19), DOGFOOD ONLY: loaded by main.ts when the page URL has `?photoart`.
 * Draws the orchid dottyback as a photo-derived cutout card (public/art/fish/orchiddottyback.webp, made by
 * scripts/fish-cutout-card.py from a generated 3-view sheet) and feeds the plan the body outline, tail and thickness measured from
 * that sheet (src/data/fishart/orchiddottyback3.anatomy.json; scripts/fish-outline.py, fish-topview.py). Nothing here runs without the flag.
 */
import anatomy from '../data/fishart/orchiddottyback3.anatomy.json';
import { PLANS, profile } from './fishgen';
import { FISH_ART } from './placeholder';

const img = new Image();
await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('photoart: card image failed to load')); img.src = `${import.meta.env.BASE_URL}art/fish/orchiddottyback.webp`; });

const P = PLANS.orchiddottyback, A = anatomy.anatomy, d = A.depthProfile;
const pedU = 1 - 1 / A.tlOverSl, SLc = 1 - pedU, U = (s: number) => pedU + SLc * (1 - s / 100), Wd = (x: number) => x / 100 * SLc;
const top = d.stations.map((s, i) => [U(s), -Wd(d.top[i])] as [number, number]), bot = d.stations.map((s, i) => [U(s), Wd(d.bottom[i])] as [number, number]);
Object.assign(P, { pedU, outline: [...top, ...bot.reverse()] });
P.thick = A.thickness.fit.thick; P.pedT = A.thickness.fit.pedT;                       // from the top view's widths
P.tail = { ...P.tail, h: Wd(Math.max(...A.fins.caudal.outline.map(c => (c[1] + c[2]) / 2))) };
// paired fins: 3D ones rooted where the sheet's side view roots them (sheet px: snout 1275, axis 207, SL 896; pectoral root 1010,233; pelvic root 1005,295, 120 px long),
// so the front and 3/4 views show fins attached to the body; the card image has the pelvic erased (the 3D one replaces it), the painted pectoral stays flat on the flank
{ const sl = 896, pu = 1 - (1275 - 1010) / sl * SLc, [pt, pb] = profile(P)(pu);
  P.pectoral = true; P.pec = { u: pu, v: (26 / sl * SLc - pt) / (pb - pt), s: 1.2, tint: '#b848c8', spread: 1.0 };
  P.pelvic = { u: 1 - (1275 - 1005) / sl * SLc, len: 120 / sl * SLc, tint: '#c050e0' }; }
P.wide = 0.3;                                                                           // head-on the sheet's body is widest low, a round chin
// the photo's own eye (sheet px: eye centre 1190,177, ring radius 14, snout 1275, axis 207, SL 896) gets a 3D eye seated on it
{ const sl = 896, u = 1 - (1275 - 1190) / sl * SLc, v = -(207 - 177) / sl * SLc, [et, eb] = profile(P)(u);
  P.eye = { ...P.eye, u, dv: (v - et) / (eb - et) - 0.38, r: 14 / sl * SLc, bulge: 0.6, iris: ['#c8902a', '#0a0206'] }; }
FISH_ART.orchiddottyback = (ctx, _p, W) => ctx.drawImage(img, 0, 0, W, W * (ctx.canvas.height / ctx.canvas.width));
