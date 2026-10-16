// Snakes (lane BP, 2026-10-16; roadmap Release 2): the data of the serpentine body plan, built in 3D by render/snake3d.ts, plus
// a plain side card for the no-WebGL fallback and picking. Unit = the TOTAL length (snout to tail tip = the card width = the
// species' `tl`, or the animal's own length by life stage); the spine is that long in every pose (a pose bends, never stretches).
// Body frame as the herps: x forward (the head), y up, z to the animal's + side; the surface it lies on is the plane y = -ground
// (on a branch: the limb's top). Heights are measured from the spine (the centre line of the body), the belly lies `bot` below.
import type { Ctx, Proj } from './paint';

/** A station along the body: s (0 tail tip .. 1 snout), half-width, height above the spine, depth below it (units of the length). */
export type SStn = [s: number, hw: number, top: number, bot: number];

export interface SnakeSpec {
  /** Card height / width (the card is the picking target; the body's coils fit inside it). */
  aspect: number;
  /** Adult length (mm): smaller animals get a relatively bigger head and eye. */
  adult: number;
  stations: SStn[];
  /** Section exponents above and below the spine (2 = round; the belly is flat, the back a low ridge). */
  eT: number; eB: number; ridge: number;
  /** Where the neck ends and the head's own mesh and texture begin. */
  neck: number;
  /** The eye: station, angle round the section from the top (rad), radius. */
  eye: { s: number; a: number; r: number };
  /** Body diameter used to space coils, and the scale (length of one belly plate / dorsal scale row). */
  scale: number;
  // paint
  col: { dorsal: string; flank: string; belly: string; tan: string; tanEdge: string; spot: string; lip: string; head: string; stripe: string; pit: string; iris: string };
  /** Blotches along each side: the spacing, its jitter and a seed. */
  blotch: { period: number; jitter: number; seed: number };
}

/** Ground line (card frame, + down) = the resting offset: the belly lies on it. */
export const snakeGround = (S: SnakeSpec) => S.aspect / 2;

// ---------- ball python (Python regius) ----------
// Adult 1.0-1.5 m (female larger): a stout body with a short thin tail, a head clearly broader than the neck. Dark brown, the
// flanks with large tan blotches that hold a dark spot ("alien heads"), a cream belly, cream lip scales with heat pits.
const BALL: SStn[] = [
  [0.0, 0.0008, 0.0008, 0.0008], [0.02, 0.0035, 0.0035, 0.003], [0.05, 0.0072, 0.0068, 0.006], [0.09, 0.0125, 0.0115, 0.0105],
  [0.15, 0.0175, 0.015, 0.0135], [0.25, 0.0213, 0.0178, 0.0158], [0.4, 0.0228, 0.0192, 0.0166], [0.6, 0.0228, 0.0192, 0.0166],
  [0.78, 0.0205, 0.0175, 0.0152], [0.87, 0.0168, 0.0145, 0.0128], [0.915, 0.0135, 0.0118, 0.0105], [0.935, 0.0128, 0.0112, 0.01],
  [0.948, 0.0146, 0.0098, 0.0088], [0.96, 0.0168, 0.0092, 0.0092], [0.973, 0.0153, 0.0083, 0.0086], [0.986, 0.0118, 0.0068, 0.0072],
  [0.995, 0.0092, 0.0058, 0.0058], [1.0, 0.0062, 0.0048, 0.0048],
];

export const SNAKES: Record<string, SnakeSpec> = {
  ballpython: {
    aspect: 0.16, adult: 1200, stations: BALL, eT: 2.3, eB: 3.6, ridge: 0.07, neck: 0.935,
    eye: { s: 0.976, a: 0.4 * Math.PI, r: 0.0019 }, scale: 0.0042,
    col: { dorsal: '#2b190a', flank: '#1f1207', belly: '#eadfc6', tan: '#9c7a52', tanEdge: '#664630', spot: '#1d1109', lip: '#dccaa0', head: '#2c1a0d', stripe: '#a8733a', pit: '#120a04', iris: '#c08a3a' },
    blotch: { period: 0.034, jitter: 0.22, seed: 7 },
  },
};
export const isSnake = (art: string) => art in SNAKES;
export function snakeMeta(art: string): { aspect: number; rest: number } | undefined {
  const S = SNAKES[art]; return S && { aspect: S.aspect, rest: snakeGround(S) };
}

/**
 * Half the footprint of each pose family (ball, extended, coiled, alert, serpentine; the index is round((bend + 1) * 2)), as
 * fractions of the length: [along the head's heading, across it], the body's own thickness included. Shuffle keeps the whole
 * footprint inside the glass (measured from the spines of render/snake3d.ts).
 */
export const SNAKE_FOOT: [number, number][] = [[0.09, 0.09], [0.5, 0.12], [0.14, 0.14], [0.27, 0.13], [0.44, 0.12]];
export const snakeFoot = (bend: number) => SNAKE_FOOT[Math.min(4, Math.max(0, Math.round((Math.min(1, Math.max(-1, bend)) + 1) * 2)))];

/** Life stages (length in mm): a hatchling is about 25 cm, a juvenile 50, a sub-adult 80, an adult 1.2 m. */
export const SNAKE_STAGES: [string, number][] = [['hatchling', 250], ['juvenile', 500], ['sub-adult', 800], ['adult', 1200]];
/** The largest stage that fits a tank `L` long (the rule of thumb: the enclosure is as long as the snake), at least a hatchling. */
export function snakeStageFor(L: number, adult: number) {
  let best = SNAKE_STAGES[0][1];
  for (const [, mm] of SNAKE_STAGES) if (mm <= L && mm <= adult) best = mm;
  return best;
}

/** The side card (no-WebGL fallback and the picking target): a loosely curved body on the ground line, tan blotches, the head. */
function drawSnake(S: SnakeSpec, ctx: Ctx, P: Proj, W: number) {
  const g = snakeGround(S), N = 90, top: [number, number][] = [], bot: [number, number][] = [];
  const curve = (s: number) => 0.012 * Math.sin(s * 9.5) * Math.min(1, s * 6) + 0.003;
  const wTop = (s: number) => { let k = S.stations.findIndex(t => t[0] >= s); if (k < 1) k = 1; const a = S.stations[k - 1], b = S.stations[k], f = (s - a[0]) / (b[0] - a[0] || 1); return [a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f]; };
  for (let i = 0; i <= N; i++) { const s = i / N, [t, b] = wTop(s), y = g - b * 1.02 + curve(s), x = s - 0.5; top.push(P(x + 0.5, y - t - b * 0.98 + 0)); bot.push(P(x + 0.5, y + b - b * 0.98 + 0)); }
  ctx.fillStyle = S.col.dorsal; ctx.beginPath(); top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); bot.reverse().forEach(([x, y]) => ctx.lineTo(x, y)); ctx.closePath(); ctx.fill();
  ctx.fillStyle = S.col.tan;
  for (let s = 0.06; s < 0.9; s += S.blotch.period) { const [x, y] = P(s, g - 0.012 + curve(s)); ctx.beginPath(); ctx.ellipse(x, y, S.blotch.period * 0.3 * W, 0.006 * W, 0, 0, 7); ctx.fill(); }
  const [ex, ey] = P(S.eye.s, g - 0.028 + curve(S.eye.s));
  ctx.fillStyle = '#0a0705'; ctx.beginPath(); ctx.arc(ex, ey, S.eye.r * W, 0, 7); ctx.fill();
}
export const SNAKE_ART: Record<string, (ctx: Ctx, P: Proj, W: number) => void> =
  Object.fromEntries(Object.entries(SNAKES).map(([k, S]) => [k, (c: Ctx, P: Proj, W: number) => drawSnake(S, c, P, W)]));
