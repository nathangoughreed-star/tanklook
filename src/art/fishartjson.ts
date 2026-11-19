// Species art from JSON (fish painter experiment A, research/fish-painter-design.md sections 3 and 8).
// A migrated species takes its JSON as the SOLE authority: every field below is required and a missing one throws
// (message names the file and the path), except the documented defaults. Annotation coordinates are source-photo pixels;
// the frame (xTail, xSnout, yAxis) turns them into card units (u 0 tail tip .. 1 snout tip, v down from the centre line).
import type { Plan, MedianFin } from './fishgen';
import flameangel from '../data/fishart/flameangel.json';
import flameangelGrid from '../data/fishart/flameangel.grid.json';
import pajama from '../data/fishart/pajamacardinal.json';
import pajamaGrid from '../data/fishart/pajamacardinal.grid.json';
import kole from '../data/fishart/koletang.json';
import koleGrid from '../data/fishart/koletang.grid.json';



import j_foxface from '../data/fishart/foxface.json';
import j_foxfaceGrid from '../data/fishart/foxface.grid.json';


type Raw = (number | string)[];
type CPt = [number, number] | [number, number, 'c'];

/** Documented defaults (nothing else is defaulted): the 3D thickness when no front/top photo or cited figure exists. */
const DEFAULT_THICK = 0.34;

/** grid: the fin colour grids (scripts/fingrid.py output, photo px) */
export function planFromJson(j: any, grid?: any): Plan {
  const name = String(j?.art ?? '?');
  const need = <T>(v: T | undefined | null, path: string): T => { if (v === undefined || v === null) throw new Error(`fishart/${name}.json: missing ${path}`); return v; };
  const fr = need(j.frame, 'frame'), x0 = need<number>(fr.xTail, 'frame.xTail'), x1 = need<number>(fr.xSnout, 'frame.xSnout'), yA = need<number>(fr.yAxis, 'frame.yAxis'), W = x1 - x0;
  const cv = (q: Raw): CPt => { const u = (Number(q[0]) - x0) / W, v = (Number(q[1]) - yA) / W; return q[2] === 'c' ? [u, v, 'c'] : [u, v]; };
  const cu = (x: number) => (x - x0) / W, cw = (px: number) => px / W;
  const an = need(j.anatomy, 'anatomy'), look = need(j.look, 'look'), fins = need(an.fins, 'anatomy.fins');
  const body = need<Raw[]>(an.body, 'anatomy.body').map(cv) as [number, number][];
  // top (nose back) and bottom (tail forward) spans, to read the depth, the peduncle and the eye's place
  const k = body.reduce((m, q, i) => (q[0] < body[m][0] ? i : m), 0), top = body.slice(0, k + 1).reverse(), bot = [...body.slice(k), body[0]];
  const at = (c: [number, number][], u: number) => { if (u <= c[0][0]) return c[0][1]; for (let i = 1; i < c.length; i++) if (u <= c[i][0]) return c[i - 1][1] + (c[i][1] - c[i - 1][1]) * (u - c[i - 1][0]) / ((c[i][0] - c[i - 1][0]) || 1); return c[c.length - 1][1]; };
  const pedU = need<number>(an.pedU, 'anatomy.pedU');
  let depth = 0; for (let i = 0; i <= 60; i++) { const u = pedU + (1 - pedU) * i / 60; depth = Math.max(depth, at(bot, u) - at(top, u)); }
  const ped = (at(bot, pedU) - at(top, pedU)) / 2;
  const lm = need(an.landmarks, 'anatomy.landmarks'), eyeP = need<Raw>(lm.eye, 'landmarks.eye'), snoutP = need<Raw>(lm.snout, 'landmarks.snout');
  const eu = cu(Number(eyeP[0])), ev = (Number(eyeP[1]) - yA) / W, et = at(top, eu), eb = at(bot, eu);
  const med = (key: 'dorsal' | 'dorsal2' | 'anal', h: number): MedianFin | undefined => {
    if (!fins[key]) return undefined;
    const f = fins[key], l = look[key] ?? {}, b = need<number[]>(f.base, `fins.${key}.base`);
    return { at: cu(b[0]), len: cw(b[0] - b[1]), h, tint: l.tint, a: l.a, edge: l.edge };
  };
  const tailPts = need<Raw[]>(fins.caudal?.outline, 'fins.caudal.outline').map(cv);
  const tailExt = Math.max(...tailPts.map(q => Math.abs(q[1])));
  const pel = fins.pelvic, pec = fins.pectoral;
  const pelPts = pel ? need<Raw[]>(pel.outline, 'fins.pelvic.outline').map(cv) : undefined, pecPts = pec ? need<Raw[]>(pec.outline, 'fins.pectoral.outline').map(cv) : undefined;
  const pelRoot = pel ? cv(need<Raw>(pel.root, 'fins.pelvic.root')) : undefined, pecRoot = pec ? cv(need<Raw>(pec.root, 'fins.pectoral.root')) : undefined;
  const th = an.thickness;
  // bar paths: photo px [x, y, w] -> body-relative [u, t, w as a share of the local depth] (path marks)
  // look.barPaths: one group {c, a, paths, insert?} or a list of groups, each a set of body-relative ribbons in one colour (insert: where among the marks, default after the first)
  const groups: any[] = Array.isArray(look.barPaths) ? look.barPaths : look.barPaths ? [look.barPaths] : [];
  const marks = [...need<NonNullable<Plan['marks']>>(look.marks, 'look.marks')]; let at0 = 0;
  groups.forEach((bp, gi) => {
    const ribbons: NonNullable<Plan['marks']> = need<Raw[][]>(bp.paths, 'look.barPaths.paths').map(pts => ({
      k: 'path' as const, c: need<string>(bp.c, 'look.barPaths.c'), a: bp.a, feather: bp.feather,
      pts: pts.map(q => { const u = cu(Number(q[0])), v = (Number(q[1]) - yA) / W, a = at(top, u), b = at(bot, u); return [u, (v - a) / (b - a), cw(Number(q[2])) / (b - a)] as [number, number, number]; }),
    }));
    marks.splice((bp.insert ?? 1) + (gi ? at0 : 0), 0, ...ribbons); at0 += ribbons.length;
  });
  const gc = (g: any) => { const [cw0, ch0] = need<number[]>(grid?.cell, 'grid.cell'); return { u0: cu(need<number>(g?.x0, 'grid.x0')), v0: (need<number>(g?.y0, 'grid.y0') - yA) / W, du: cw(cw0), dv: cw(ch0), rows: need<(string | null)[][]>(g.rows, 'grid.rows') }; };
  // grid is optional: without one the fins take their flat tints (a photo whose fins are lit a different colour)
  const finGrid: NonNullable<Plan['finGrid']> | undefined = grid ? { tail: gc(grid.caudal) } : undefined;
  if (grid) for (const k of ['dorsal', 'dorsal2', 'anal'] as const) if (fins[k]) finGrid![k] = gc(grid[k]);
  const p: Plan = {
    outline: body, depth, pedU, ped, mouth: (Number(snoutP[1]) - yA) / W,
    shade: need(look.shade, 'look.shade'), fin: need(look.fin, 'look.fin'),
    tail: { type: 'round', h: tailExt, tint: need(look.tail?.tint, 'look.tail.tint'), a: look.tail?.a },
    dorsal: med('dorsal', 0.06), dorsal2: med('dorsal2', 0.06), anal: med('anal', 0.1),
    pelvic: pel ? { u: pelRoot![0], len: 0.2, tint: need(look.pelvic?.tint, 'look.pelvic.tint') } : undefined, ...(pec ? { pec: {} } : { pectoral: false }),
    marks, finMarks: need(look.finMarks, 'look.finMarks'),
    eye: { r: cw(need<number>(lm.eyeR, 'landmarks.eyeR')), iris: need(look.eyeIris, 'look.eyeIris'), u: eu, dv: (ev - et) / (eb - et) - 0.38 },
    gape: need(look.gape, 'look.gape'), gapeDrop: need(look.gapeDrop, 'look.gapeDrop'), scale: need(look.scale, 'look.scale'),
    thick: th?.source === 'unmeasured' ? need<number>(th.thick, 'anatomy.thickness.thick') : th?.thick ?? DEFAULT_THICK,
    finGrid: finGrid,
    fins: { dorsal: fins.dorsal?.outline.map(cv), dorsal2: fins.dorsal2?.outline.map(cv), anal: fins.anal?.outline.map(cv), tail: tailPts, pelvic: pelPts, pectoral: pecPts, pelvicRoot: pelRoot && [pelRoot[0], pelRoot[1]], pectoralRoot: pecRoot && [pecRoot[0], pecRoot[1]] },
    ...(look.extra ?? {}), // documented raw Plan fields (3D body shape knobs: sectionExp, headW, noseW ...)
  };
  return p;
}

/** The migrated species: art id -> plan built from its JSON. */
export const JSON_PLANS: Record<string, Plan> = { flameangel: planFromJson(flameangel, flameangelGrid), pajamacardinal: planFromJson(pajama, pajamaGrid), koletang: planFromJson(kole, koleGrid), foxface: planFromJson(j_foxface, j_foxfaceGrid) };
