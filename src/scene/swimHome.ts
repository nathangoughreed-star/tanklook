// FB3 (R118): where each habit fish lives. Pure functions of the SwimField, no three.js. A home is a hold spot just off a solid (the royal gramma's
// cave mouth or ledge, a firefish's bolt-hole at a rock foot, a watchman's burrow mouth, a clownfish's host or patch) and the direction away from
// that solid. With nothing to live in (a bare tank) it falls back to the back glass, so a fish still has a place to hold.
import type { SwimField, SwimmerSpec, V3 } from './swimTypes';

export interface HomeSpot { x: number; y: number; z: number; nx: number; ny: number; nz: number }

/** Is the nearest solid at (x, y, z), c away, a placed hard item (not the glass, floor, surface or a plant)? With the item list, by distance to the item; without, by distance to the walls. */
export function makeIsItem(field: SwimField) {
  const an = field.anchors;
  const wallD = (x: number, y: number, z: number) => Math.min(x - field.min[0], field.max[0] - x, z - field.min[2], field.max[2] - z, y - field.floorAt(x, z), field.waterTop - y);
  return (x: number, y: number, z: number, c: number, r: number) => {
    if (c > wallD(x, y, z) - r * 0.5) return false;
    if (!an || !an.length) return true;
    for (const a of an) {
      if (a.kind === 'plant' || a.kind === 'artificial') continue;
      const dh = Math.max(0, Math.hypot(x - a.x, z - a.z) - a.r), dv = y < a.y0 ? a.y0 - y : y > a.y1 ? y - a.y1 : 0;
      if (Math.hypot(dh, dv) <= c + r) return true;
    }
    return false;
  };
}

export function pickHomes(fish: SwimmerSpec[], field: SwimField, R: () => number): (HomeSpot | null)[] {
  const out: (HomeSpot | null)[] = fish.map(() => null), byKey = new Map<string, HomeSpot>(), used: { x: number; y: number; z: number }[] = [];
  const g: V3 = [0, 0, 0], an = field.anchors, isItem = makeIsItem(field);
  for (let i = 0; i < fish.length; i++) {
    const hb = fish[i].habit; if (!hb || hb.home === 'open') continue;
    const key = fish[i].group?.key, shared = key ? byKey.get(key) : undefined;
    if (shared) { const a = R() * 6.283, j = fish[i].len * 0.6; out[i] = { ...shared, x: shared.x + Math.cos(a) * j, z: shared.z + Math.sin(a) * j }; continue; }
    const L = fish[i].len, r = L * 0.12, floorKind = hb.home === 'bolt' || hb.home === 'burrow';
    let best: HomeSpot | null = null, bs = -1e9;
    if (hb.home === 'host' && an) { // an anemone, else a coral: the fish holds just over its top
      let hosts = an.filter(a => a.variant === 'anemone'); if (!hosts.length) hosts = an.filter(a => a.kind === 'coral');
      if (hosts.length) {
        let ba = hosts[0], bd = 1e18;
        for (const a of hosts) { let d = R(); for (const u of used) d += Math.max(0, 1 - Math.hypot(u.x - a.x, u.z - a.z) / (a.r * 3 + L * 4)) * 5; if (d < bd) { bd = d; ba = a; } }
        const x = ba.x + (R() - 0.5) * ba.r * 0.4, z = ba.z + (R() - 0.5) * ba.r * 0.4;
        best = { x, y: Math.max(ba.y1 + r * 1.5, field.floorAt(x, z) + r * 1.5), z, nx: 0, ny: 1, nz: 0 };
      }
    }
    if (!best) {
      for (let t = 0; t < 320; t++) {
        let x = field.min[0] + r * 2 + R() * Math.max(1, field.max[0] - field.min[0] - 4 * r), z = field.min[2] + r * 2 + R() * Math.max(1, field.max[2] - field.min[2] - 4 * r);
        const fl = field.floorAt(x, z), free = field.waterTop - fl; if (free < r * 4) continue;
        let y: number, nx = 0, ny = 1, nz = 0, sc: number;
        if (floorKind) { // a spot on the floor with a solid beside it (2-3 body radii off)
          y = fl + r * 1.3; if (field.clearance(x, y, z, undefined, r * 2) < r * 1.05) continue;
          let found = false; const gap = r * (hb.gap + 1.2);
          for (let k = 0; k < 8 && !found; k++) {
            const a = k * 0.785 + 0.3, px = x + Math.cos(a) * gap, pz = z + Math.sin(a) * gap, c = field.clearance(px, y + r * 0.5, pz, undefined, r * 3);
            if (c < r * 0.9 && isItem(px, y + r, pz, Math.max(c, 0), r)) { found = true; nx = -Math.cos(a); nz = -Math.sin(a); ny = 0; }
          }
          if (!found) continue;
          sc = 1 + R() * 0.5;
        } else {
          y = fl + r * 2 + R() * Math.max(0, free * 0.7 - r * 2);
          g[0] = 0; g[1] = 0; g[2] = 0; let c = field.clearance(x, y, z, g, L * 3);
          if (c < L * 3 - 1 && c > 0) { // a random point is rarely on a face: slide it to the face its nearest solid has (the gradient points away from it)
            const k = c - r * hb.gap * (0.85 + R() * 0.3); x = x - g[0] * k; y = y - g[1] * k; z = z - g[2] * k;
            if (z < field.min[2] || z > field.max[2] || x < field.min[0] || x > field.max[0] || y > field.waterTop) continue;
            g[0] = 0; g[1] = 0; g[2] = 0; c = field.clearance(x, y, z, g, L * 3);
          }
          if (c < r * 1.05 || c > r * (hb.gap + 0.9) || !isItem(x, y, z, c, r)) continue;
          nx = g[0]; ny = g[1]; nz = g[2];
          let tucked = 0; // a ledge that reaches 0.5 body lengths each way over the spot is a real overhang, not a corner
          if (ny < -0.4) for (let k = 0; k < 4; k++) { const dx = (k & 1 ? 1 : -1) * (k < 2 ? L * 0.5 : 0), dz = (k & 1 ? 1 : -1) * (k < 2 ? 0 : L * 0.5); if (field.clearance(x + dx, y, z + dz, undefined, r * 3) < r * (hb.gap + 1.2)) tucked++; }
          sc = tucked * 0.5 + 1 + (ny < -0.4 ? 1.2 : 0) + (field.clearance(x, y + L, z, undefined, L) < L * 0.5 ? 0.8 : 0) + (Math.abs(ny) < 0.5 ? 0.3 : 0) + R() * 0.3; // under a ledge or in a cave scores best
        }
        for (const u of used) { const d = Math.hypot(u.x - x, u.y - y, u.z - z); if (d < L * 4) sc -= (1 - d / (L * 4)) * 2; }
        if (sc > bs) { bs = sc; best = { x, y, z, nx, ny, nz }; }
      }
    }
    if (!best) { // nothing to live in: hold at the back glass
      const x = field.min[0] + (field.max[0] - field.min[0]) * (0.2 + 0.6 * R()), z = field.min[2] + r * (hb.gap + 0.4), fl = field.floorAt(x, z);
      best = { x, y: floorKind ? fl + r * 1.3 : fl + (field.waterTop - fl) * (0.2 + 0.25 * R()), z, nx: 0, ny: 0, nz: 1 };
    }
    out[i] = best; used.push(best); if (key) byKey.set(key, best);
  }
  return out;
}
