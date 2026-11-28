// 3D shrimp (anatomy audit P0, lane M): per-species data and paint for the shrimp body builder (render/shrimp3d.ts).
// The skin is painted in the body's own coordinates: x = along the body (0 front of the carapace .. 1 end of the 6th
// abdominal segment), y = round the section (0 the dorsal midline .. 1 the keel, both flanks share it), so a back
// stripe stays on the back from above and from the side. The tail fan has its own small texture: x = along a blade
// (0 root .. 1 tip), y = across it.
import { rng } from './paint';

export interface Shrimp3D {
  rost: number;   // rostrum length (widths)
  up: number;     // rostrum tip raised (widths)
  hump: number;   // abdominal bend: 0 straight .. 1 strongly arched with the tail carried low (cleaner)
  deep: number;   // body depth x the default
  legL: number;   // walking-leg spread x the default (long, stilted legs > 1)
  stand: number;  // body carried this far (widths) above the default ride height on longer legs
  ant: number;    // antenna length x the default
  glass?: number; // body and limb opacity (translucent shrimp)
  leg: string; antC: string; eye: string;
  skin: (x: CanvasRenderingContext2D, W: number, H: number) => void;
  marks?: (x: CanvasRenderingContext2D, W: number, H: number) => void; // drawn on the glass body as a solid overlay
  fan: (x: CanvasRenderingContext2D, W: number, H: number) => void;
  /** crayfish: the first walking legs are big chelae; size x the default (a redclaw's is ~1.35), patch = the colour of an outer patch on the palm */
  claw?: { size: number; patch?: string };
  /** build C: limbs ringed in colour c, n rings per width, share = how much of each ring period is the band colour */
  band?: { c: string; n: number; share: number };
}

/** Where the carapace ends along the spine (fraction) and the six abdominal segments' relative lengths. */
export const CARA = 0.4, SEG = [1, 1.05, 1.05, 0.95, 0.9, 1.25];
/** Spine fraction [front, rear] of abdominal segment k (0..5): the skin's x, so marks can sit on the segment rims. */
export const segRange = (k: number) => {
  const tot = SEG.reduce((a, b) => a + b), a = SEG.slice(0, k).reduce((s, b) => s + b, 0);
  return [CARA + (1 - CARA) * a / tot, CARA + (1 - CARA) * (a + SEG[k]) / tot];
};

/** A vertical gradient over the whole skin (dorsal midline at the top, keel at the bottom). */
function bands(x: CanvasRenderingContext2D, W: number, H: number, stops: [number, string][]) {
  const g = x.createLinearGradient(0, 0, 0, H); for (const [f, c] of stops) g.addColorStop(f, c);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
}
/** Soft mottling: n blobs of radius r (px) in the colours, seeded. */
function mottle(x: CanvasRenderingContext2D, W: number, H: number, seed: number, n: number, r: number, cols: string[], a: number) {
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    x.globalAlpha = a * (0.4 + R() * 0.6); x.fillStyle = cols[Math.floor(R() * cols.length)];
    x.beginPath(); x.ellipse(R() * W, R() * H, r * (0.6 + R()), r * (0.4 + R() * 0.6), 0, 0, Math.PI * 2); x.fill();
  }
  x.globalAlpha = 1;
}
/** The fan blades' fill: colour c, the edges and tip clearer (alpha a at the root .. a * edge at the rim). */
function blade(x: CanvasRenderingContext2D, W: number, H: number, c: string, a: number, edge: number) {
  x.fillStyle = c;
  for (let i = 0; i < W; i += 2) for (let j = 0; j < H; j += 2) {
    const u = i / W, v = Math.abs(j / H * 2 - 1), k = 1 - (1 - edge) * Math.max(u ** 3, v ** 4);
    x.globalAlpha = a * k; x.fillRect(i, j, 2, 2);
  }
  x.globalAlpha = 1;
}

export const SHRIMP3D: Record<string, Shrimp3D> = {
  // cherry shrimp (Neocaridina davidi, red): solid deep red, a little paler and clearer low on the flanks, mottled
  cherryshrimp: {
    rost: 0.085, up: 0.004, hump: 0.45, deep: 1, legL: 1, stand: 0.035, ant: 1, leg: '#b02a2c', antC: '#a03030', eye: '#140c0a',
    skin: (x, W, H) => {
      bands(x, W, H, [[0, '#9a161c'], [0.35, '#b8242a'], [0.75, '#cc3c40'], [1, '#d65a5c']]);
      mottle(x, W, H, 31, 260, 5, ['#8a1218', '#d8484c', '#e06a66'], 0.25);
    },
    fan: (x, W, H) => blade(x, W, H, '#b8282c', 0.95, 0.55),
  },
  // Amano (Caridina multidentata): a translucent grey-green glass body, a pale line down the back and rows of broken
  // red-brown dashes and dots along the flanks
  amano: {
    rost: 0.1, up: 0.012, hump: 0.4, deep: 0.92, legL: 1.05, stand: 0.045, ant: 1.05, glass: 0.32, leg: '#8a9694', antC: '#7a8684', eye: '#18120e',
    skin: (x, W, H) => bands(x, W, H, [[0, '#7e8a88'], [0.5, '#98a4a2'], [1, '#b0b8b4']]),
    marks: (x, W, H) => {
      const R = rng(7);
      x.fillStyle = '#e8d8a0'; x.globalAlpha = 0.85; x.fillRect(0.02 * W, 0, 0.96 * W, 0.045 * H); x.globalAlpha = 1;
      x.strokeStyle = x.fillStyle = '#4a2418'; x.lineCap = 'round'; x.lineWidth = 0.028 * H;
      for (const f of [0.3, 0.46, 0.62]) for (let s = 0.03 + R() * 0.02; s < 0.96;) {
        const y = (f + (R() - 0.5) * 0.03) * H;
        if (R() < 0.35) { x.beginPath(); x.arc(s * W, y, 0.02 * H, 0, Math.PI * 2); x.fill(); s += 0.022 + R() * 0.015; continue; }
        const len = 0.015 + R() * 0.022; x.beginPath(); x.moveTo(s * W, y); x.lineTo((s + len) * W, y + (R() - 0.5) * 0.02 * H); x.stroke();
        s += len + 0.01 + R() * 0.016;
      }
    },
    fan: (x, W, H) => {
      blade(x, W, H, '#909c9a', 0.55, 0.4);
      x.fillStyle = '#4a2418'; const R = rng(9);
      for (let i = 0; i < 6; i++) { x.beginPath(); x.arc((0.2 + R() * 0.5) * W, (0.3 + R() * 0.4) * H, 0.02 * W, 0, Math.PI * 2); x.fill(); }
    },
  },
  // skunk cleaner (Lysmata amboinensis): a white stripe down the middle of the back from the rostrum to the telson, a
  // broad red band each side of it, yellow-orange flanks; long white antennae; red tail fan with white spots; the
  // abdomen arched, the tail carried low
  cleanershrimp: {
    rost: 0.07, up: 0.006, hump: 1, deep: 1.05, legL: 1.3, stand: 0.08, ant: 1.35, leg: '#e0603a', antC: '#f4f2ea', eye: '#120c0a',
    skin: (x, W, H) => {
      bands(x, W, H, [[0, '#f6f4ee'], [0.05, '#f6f4ee'], [0.075, '#c42a20'], [0.38, '#c8281e'], [0.5, '#e08a30'], [0.62, '#eca838'], [1, '#f2be58']]);
      mottle(x, W, H, 41, 120, 4, ['#d8a040', '#f0c060'], 0.2);
    },
    fan: (x, W, H) => {
      blade(x, W, H, '#c8281e', 1, 0.7);
      x.fillStyle = '#f6f4ee';
      for (const [u, v] of [[0.62, 0.5], [0.78, 0.35], [0.78, 0.65], [0.45, 0.5]]) { x.beginPath(); x.ellipse(u * W, v * H, 0.06 * W, 0.14 * H, 0, 0, Math.PI * 2); x.fill(); }
    },
  },
  // peppermint shrimp (Lysmata wurdemanni / boggessi), build C pilot 2026-11-28 (research/invert-model-method.md).
  // Photos: Commons Lysmata_wurdemanni_(I0699), _0468, Nausicaa; Lysmata_boggessi. A clear glassy body with a faint
  // amber-pink cast (the gut and liver show as a warm shadow under the carapace); thin red lines run lengthwise along
  // the abdomen (three a side) and across it at every segment rim, oblique red lines on the carapace; clear legs ringed
  // red, the second pair long and thin; long red antennae; big amber eyes; the tail fan clear with red lines. Measured
  // on 0468 (side on): carapace ~0.38 of the body without rostrum, abdomen arched at the third segment, legs reach about
  // 0.4 body lengths below it, antennae about 1.5 body lengths.
  peppermint: {
    rost: 0.075, up: 0.012, hump: 0.85, deep: 1.0, legL: 1.35, stand: 0.075, ant: 1.55, glass: 0.66, leg: '#e0a898', antC: '#c04a3c', eye: '#b07a2c',
    band: { c: '#c8382c', n: 90, share: 0.85 },
    skin: (x, W, H) => {
      bands(x, W, H, [[0, '#d08a7a'], [0.5, '#dea494'], [1, '#eac0b2']]);
      const g = x.createRadialGradient(0.22 * W, 0.5 * H, 0, 0.22 * W, 0.5 * H, 0.16 * W); // the warm organ shadow in the carapace
      g.addColorStop(0, 'rgba(206,110,60,0.85)'); g.addColorStop(1, 'rgba(206,110,60,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    },
    marks: (x, W, H) => {
      const R = rng(17); x.strokeStyle = '#c42e26'; x.lineCap = 'round';
      const wav = (x0: number, x1: number, y: number, lw: number) => { // a slightly wavy line, broken now and then
        x.lineWidth = lw * H; x.beginPath(); let pen = false;
        for (let u = x0; u <= x1; u += 0.004) { const yy = (y + 0.012 * Math.sin(u * 60 + y * 9)) * H; if (R() < 0.015) { pen = false; continue; } if (pen) x.lineTo(u * W, yy); else { x.moveTo(u * W, yy); pen = true; } }
        x.stroke();
      };
      for (const y of [0.12, 0.3, 0.48, 0.66]) wav(CARA - 0.02, 0.97, y, 0.028); // lengthwise lines along the abdomen
      for (let k = 0; k < 6; k++) { const [, b] = segRange(k); x.lineWidth = 0.016 * H; x.beginPath(); x.moveTo((b - 0.012) * W, 0.1 * H); x.lineTo((b - 0.006) * W, 0.7 * H); x.stroke(); } // segment rims
      x.lineWidth = 0.03 * H; x.beginPath(); x.moveTo(CARA * W, 0.02 * H); x.lineTo((CARA - 0.01) * W, 0.9 * H); x.stroke(); // the carapace's rear rim
      for (const [x0, y0, x1, y1] of [[0.05, 0.55, 0.3, 0.12], [0.1, 0.8, 0.36, 0.38], [0.2, 0.85, 0.38, 0.62]]) { x.lineWidth = 0.028 * H; x.beginPath(); x.moveTo(x0 * W, y0 * H); x.quadraticCurveTo((x0 + x1) / 2 * W, (y0 + y1) / 2 * H + 0.06 * H, x1 * W, y1 * H); x.stroke(); }
    },
    fan: (x, W, H) => {
      blade(x, W, H, '#ead8d0', 0.45, 0.4);
      x.strokeStyle = '#c42e26'; x.lineWidth = 0.08 * H; x.globalAlpha = 0.9;
      for (const v of [0.3, 0.7]) { x.beginPath(); x.moveTo(0.1 * W, v * H); x.lineTo(0.95 * W, (0.5 + (v - 0.5) * 1.3) * H); x.stroke(); }
      x.globalAlpha = 1;
    },
  },
  // crayfish (S238): the shrimp body plan with a short rostrum, a straight deeper abdomen and big chelae on the first legs
  // Orange dwarf crayfish (Cambarellus patzcuarensis, CPO): bright orange all over, a little paler below, light mottling
  cpo: {
    rost: 0.04, up: 0, hump: 0.08, deep: 1.4, legL: 0.95, stand: 0.03, ant: 0.85, leg: '#d8681e', antC: '#c85a1a', eye: '#140c0a', claw: { size: 1.15 },
    skin: (x, W, H) => { bands(x, W, H, [[0, '#c4561a'], [0.4, '#e2782a'], [0.8, '#f0a050'], [1, '#f4b878']]); mottle(x, W, H, 51, 220, 5, ['#b04a14', '#f6b060', '#e8802c'], 0.22); },
    fan: (x, W, H) => blade(x, W, H, '#e2782a', 0.95, 0.6),
  },
  // Cajun dwarf crayfish (Cambarellus shufeldtii): tan to grey-blue-brown, darker marbling, a dark back band
  cajundwarf: {
    rost: 0.04, up: 0, hump: 0.08, deep: 1.35, legL: 0.95, stand: 0.03, ant: 0.85, leg: '#8a7a5e', antC: '#7a6c52', eye: '#140c0a', claw: { size: 1.05 },
    skin: (x, W, H) => { bands(x, W, H, [[0, '#4e4434'], [0.15, '#7a6a50'], [0.6, '#968664'], [1, '#b4a686']]); mottle(x, W, H, 52, 260, 5, ['#5a4e3a', '#a8b0a0', '#6e6044'], 0.3); },
    fan: (x, W, H) => blade(x, W, H, '#8a7a5e', 0.95, 0.6),
  },
  // Red swamp crayfish (Procambarus clarkii): dark red-brown above, bright red flanks and claws, paler belly
  rswcrayfish: {
    rost: 0.05, up: 0, hump: 0.05, deep: 1.5, legL: 1, stand: 0.035, ant: 0.9, leg: '#b02a1c', antC: '#8a2418', eye: '#140c0a', claw: { size: 1.45 },
    skin: (x, W, H) => { bands(x, W, H, [[0, '#3c1410'], [0.2, '#6a2018'], [0.55, '#b02a1c'], [0.85, '#d04a30'], [1, '#e08060']]); mottle(x, W, H, 53, 200, 4, ['#d84a30', '#4a1812', '#e86a4a'], 0.25); },
    fan: (x, W, H) => blade(x, W, H, '#a82a1c', 0.95, 0.6),
  },
  // Redclaw (Cherax quadricarinatus): olive-green to blue-green body, a bright red patch on the outer edge of each claw
  redclaw: {
    rost: 0.05, up: 0, hump: 0.05, deep: 1.5, legL: 1, stand: 0.04, ant: 0.9, leg: '#3e6e62', antC: '#3a5e54', eye: '#140c0a', claw: { size: 1.65, patch: '#d8321e' },
    skin: (x, W, H) => { bands(x, W, H, [[0, '#2e463e'], [0.3, '#3e6a5e'], [0.7, '#4e8070'], [1, '#78a090']]); mottle(x, W, H, 54, 200, 5, ['#2a5a68', '#6a9a80', '#3a5a4a'], 0.25); },
    fan: (x, W, H) => blade(x, W, H, '#3e6e62', 0.95, 0.6),
  },
};

// CM3: Neocaridina colour forms (cherry shrimp is the red one): the same body, repainted. Key = formArt('cherryshrimp', id)
// in SHRIMP3D (here) and in the card table (fishgen); NEO_BODY is the card's two body colours.
const NEO: Record<string, { stops: [string, string, string, string]; mot: string[]; fan: string; glass?: number; patches?: string }> = {
  'fire-red': { stops: ['#6e080e', '#92121a', '#b02228', '#c43a3c'], mot: ['#5a060c', '#c8403e'], fan: '#a01a20' },
  orange: { stops: ['#c4560a', '#e47a16', '#f09a3a', '#f8b868'], mot: ['#b04a08', '#f8b058'], fan: '#e47818' },
  yellow: { stops: ['#c8a014', '#e8c42c', '#f4dc5c', '#f8e890'], mot: ['#b88e10', '#fcee9a'], fan: '#ecc830' },
  green: { stops: ['#34561c', '#58882a', '#7ca646', '#a0c070'], mot: ['#2a4814', '#b4d088'], fan: '#5a8a2c' },
  blue: { stops: ['#08266a', '#14469e', '#2664c0', '#4e86d8'], mot: ['#061c52', '#6a98e0'], fan: '#1a4ca4' },
  chocolate: { stops: ['#36200e', '#58341a', '#7a4e2a', '#a07848'], mot: ['#2a1608', '#b08a58'], fan: '#5a361c' },
  snowball: { stops: ['#d4d4cf', '#e8e8e3', '#f4f4ef', '#f9f9f6'], mot: ['#c4c4be', '#ffffff'], fan: '#ecece6' },
  rili: { stops: ['#d4c4bc', '#e2d4ce', '#eadfd9', '#f0e8e3'], mot: ['#c8b8b0', '#f4ece8'], fan: '#e6d8d2', glass: 0.7, patches: '#b8242a' },
};
export const NEO_BODY: Record<string, [string, string]> = Object.fromEntries(Object.entries(NEO).map(([k, v]) => [k, [v.stops[1], v.stops[2]]]));
/** Register the Neocaridina forms of a shrimp art under their form keys. */
export function registerNeo(art: string, key: (id: string) => string) {
  const base = SHRIMP3D[art]; if (!base) return;
  for (const [id, v] of Object.entries(NEO)) {
    SHRIMP3D[key(id)] = {
      ...base, leg: v.stops[1], antC: v.stops[1], glass: v.glass,
      skin: (x, W, H) => {
        bands(x, W, H, [[0, v.stops[0]], [0.35, v.stops[1]], [0.75, v.stops[2]], [1, v.stops[3]]]);
        mottle(x, W, H, 31, 260, 5, v.mot, 0.25);
        if (v.patches) mottle(x, W, H, 77, 16, 22, [v.patches], 0.92);
      },
      fan: (x, W, H) => blade(x, W, H, v.fan, 0.95, 0.55),
    };
  }
}
