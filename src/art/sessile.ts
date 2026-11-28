// Sessile animals (species kind 'sessile', 2026-11-28, research/design/sessile-livestock.md): anemones now, clams later.
// The 3D body is the reef builder in render/coral3d.ts (reefShape(variant, seed, size)); this file holds the card meta and the
// 2D picker card, the way art/snails.ts does for snails. Card width = disc width; aspect = card height / width.
export interface SessileSpec {
  /** reefShape variant that draws it in 3D. */
  shape: string;
  /** Card aspect (height / width) and the card centre's height above the base, in widths (rest). */
  aspect: number; rest: number;
  /** Column / tentacle / tip colours of the picker card. */
  col: [string, string, string];
}
export const SESSILE: Record<string, SessileSpec> = {
  bta: { shape: 'anemone', aspect: 0.5, rest: 0.25, col: ['#8a3a3a', '#c85a6a', '#f27a98'] },
};
export const sessileSpec = (art: string): SessileSpec => SESSILE[art] ?? SESSILE.bta;
export const sessileMeta = (art: string) => { const s = sessileSpec(art); return { aspect: s.aspect, rest: s.rest }; };

/** The picker card: a flared column under a disc crowded with tentacles that swell into bulbs. */
export function drawSessileCard(art: string, W = 512): HTMLCanvasElement {
  const s = sessileSpec(art), H = Math.round(W * s.aspect), c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d')!; x.lineCap = 'round'; x.lineJoin = 'round';
  const cx = W / 2, base = H * 0.94;
  // column
  x.fillStyle = s.col[0]; x.beginPath(); x.moveTo(cx - W * 0.1, base); x.lineTo(cx - W * 0.07, base - H * 0.3); x.lineTo(cx + W * 0.07, base - H * 0.3); x.lineTo(cx + W * 0.1, base); x.closePath(); x.fill();
  // tentacles from the disc outward, drawn back to front
  let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const n = 46, top = base - H * 0.3;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), a = (t - 0.5) * Math.PI * 0.95 + (r() - 0.5) * 0.12, len = H * (0.4 + 0.3 * Math.cos(a * 0.9) + r() * 0.1);
    const x0 = cx + Math.sin(a) * W * 0.07, ex = cx + Math.sin(a) * (W * 0.1 + len * 1.2), ey = top - Math.cos(a) * len * 0.8 - r() * H * 0.05;
    x.strokeStyle = s.col[1]; x.lineWidth = Math.max(2, W * 0.012);
    x.beginPath(); x.moveTo(x0, top); x.quadraticCurveTo((x0 + ex) / 2, (top + ey) / 2 - len * 0.1, ex, ey); x.stroke();
    x.fillStyle = s.col[2]; x.beginPath(); x.arc(ex, ey, Math.max(2.5, W * 0.013), 0, Math.PI * 2); x.fill(); // the bubble tip
  }
  return c;
}
