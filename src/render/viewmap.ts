// Viewpoint map: a small top-down inset showing where the eye is (and what it sees) relative to the tank, stand,
// room wall and scale person. A DOM canvas over the view, so it never appears in PNG exports.
import { WALL_GAP, fmtLen, glassThickness } from '../scene/physics';
import type { Scene, Tank } from '../scene/types';

interface Spot { x: number; z: number; w: number }

export function drawViewMap(cv: HTMLCanvasElement, S: Scene, T: Tank, eye: { x: number; z: number }, hfov: number, person: Spot | null) {
  const css = getComputedStyle(cv), v = (n: string, d: string) => css.getPropertyValue(n).trim() || d;
  const W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(devicePixelRatio, 2);
  if (!W || !H) return;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext('2d')!; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const t = glassThickness(T, S.render.glass), rim = S.render.rim ? t + 8 : t, c = S.camera;
  // fit tank, eye and person; world x -> right, world z (toward the viewer) -> down
  const xs = [-rim, T.L + rim, eye.x], zs = [rim, -T.D - rim, eye.z];
  if (person) { xs.push(person.x - person.w / 2, person.x + person.w / 2); zs.push(person.z); }
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs), mapH = H - 22;
  const k = Math.min((W - 24) / (x1 - x0), (mapH - 20) / (z1 - z0));
  const ox = (W - (x1 - x0) * k) / 2 - x0 * k, oz = (mapH - (z1 - z0) * k) / 2 - z0 * k;
  const X = (x: number) => ox + x * k, Z = (z: number) => oz + z * k;
  const ink = v('--ink', '#1d2330'), muted = v('--muted', '#5d6676'), accent = v('--accent', '#1f6feb');

  if (S.wall.show) {            // room wall: a thick line across the map
    g.strokeStyle = muted; g.lineWidth = 3; g.beginPath();
    if (S.wall.side === 'back') { const z = Z(-T.D - t - WALL_GAP); g.moveTo(4, z); g.lineTo(W - 4, z); }
    else { const x = X(S.wall.side === 'right' ? T.L + t + WALL_GAP : -t - WALL_GAP); g.moveTo(x, 4); g.lineTo(x, mapH - 4); }
    g.stroke();
  }
  // view cone: horizontal field of view from the eye, toward the tank centre
  const dir = Math.atan2(-T.D / 2 - eye.z, T.L / 2 - eye.x), reach = Math.hypot(T.L / 2 - eye.x, -T.D / 2 - eye.z) * 1.6;
  g.fillStyle = accent; g.globalAlpha = 0.14; g.beginPath(); g.moveTo(X(eye.x), Z(eye.z));
  for (const s of [-1, 1]) { const a = dir + s * hfov / 2; g.lineTo(X(eye.x + Math.cos(a) * reach), Z(eye.z + Math.sin(a) * reach)); }
  g.closePath(); g.fill(); g.globalAlpha = 1;
  g.strokeStyle = accent; g.setLineDash([3, 3]); g.lineWidth = 1; g.beginPath(); g.moveTo(X(eye.x), Z(eye.z)); g.lineTo(X(T.L / 2), Z(-T.D / 2)); g.stroke(); g.setLineDash([]);
  // tank (outer glass) with the front edge marked
  g.fillStyle = '#2f6f9a'; g.fillRect(X(-rim), Z(-T.D - rim), (T.L + 2 * rim) * k, (T.D + 2 * rim) * k);
  g.strokeStyle = '#8fd6bb'; g.lineWidth = 2; g.beginPath(); g.moveTo(X(-rim), Z(rim)); g.lineTo(X(T.L + rim), Z(rim)); g.stroke();
  if (person) { g.fillStyle = '#7d8593'; g.beginPath(); g.arc(X(person.x), Z(person.z), Math.max(3, person.w * 0.25 * k), 0, 7); g.fill(); }
  g.fillStyle = accent; g.beginPath(); g.arc(X(eye.x), Z(eye.z), 4, 0, 7); g.fill();
  // caption: distance and angles
  const side = c.az === 0 ? 'straight on' : `${Math.abs(c.az)}° ${c.az < 0 ? 'left' : 'right'}`;
  g.fillStyle = ink; g.font = '600 12px system-ui, "Segoe UI", sans-serif'; g.textBaseline = 'bottom';
  g.fillText(`Eye ${fmtLen(c.dist, S.units, 0)} from glass · ${side}${c.el ? ` · ${c.el}° above` : ''}`, 6, H - 5, W - 12);
}
