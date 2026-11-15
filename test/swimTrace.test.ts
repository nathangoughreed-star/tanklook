// @ts-nocheck (node-only helper: writes a PNG; the project's tsconfig has no node types)
// Draws a top-down and a side trace of 60 simulated seconds to a PNG: SWIM_TRACE=out.png npx vitest run scripts/swimTrace.test.ts
import { it } from 'vitest';
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { makeSwimSim } from '../src/scene/swimSim';
import { cast, field, OBS, D, TOP, GROUND } from './swimCast';



it.runIf(!!process.env.SWIM_TRACE)('trace picture', () => {
    const all = cast(), fish = all.filter((_, k) => k < 12 || k === 23 || k === 24 || k === 30 || k === 36), sim = makeSwimSim(all, field, 7), dt = 1 / 30;
    const W = 900, H1 = D, H2 = TOP, GAP = 12, HH = H1 + H2 + GAP, img = new Uint8Array(W * HH * 3).fill(255);
    type C = [number, number, number];
    const px = (x: number, y: number, c: C) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= HH) return; const k = (y * W + x) * 3; img[k] = c[0]; img[k + 1] = c[1]; img[k + 2] = c[2]; };
    const fillRect = (x0: number, y0: number, x1: number, y1: number, c: C) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px(x, y, c); };
    const line = (x0: number, y0: number, x1: number, y1: number, c: C) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (let i = 0; i <= n; i++) px(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c); };
    const dot = (x: number, y: number, r: number, c: C) => { for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (a * a + b * b <= r * r) px(x + a, y + b, c); };
    // top view (x right, z down) above, side view (y up) below
    const topY = (z: number) => -z, sideY = (y: number) => H1 + GAP + (TOP - y);
    fillRect(0, 0, W - 1, H1 - 1, [236, 244, 250]); fillRect(0, H1 + GAP, W - 1, HH - 1, [236, 244, 250]);
    fillRect(0, sideY(GROUND), W - 1, HH - 1, [214, 196, 160]);
    for (const o of OBS) {
      if (o.kind === 'box') { fillRect(o.min[0], topY(o.max[2]), o.max[0], topY(o.min[2]), [150, 150, 150]); fillRect(o.min[0], sideY(o.max[1]), o.max[0], sideY(o.min[1]), [190, 190, 190]); }
      else { dot(o.x, topY(o.z), o.r, [90, 170, 90]); fillRect(o.x - o.r, sideY(o.y1), o.x + o.r, sideY(o.y0), [140, 200, 140]); }
    }
    const loner: C[] = [[30, 80, 200], [20, 150, 150], [130, 40, 180], [60, 60, 60]];
    const col = (i: number): C => i < 12 ? [220, 40, 40] : [[120, 70, 20], [30, 80, 200], [20, 150, 150], [130, 40, 180]][i - 12] as C;
    const prev = fish.map(f => ({ ...sim.pose(f.id)! }));
    for (let s = 0; s < 60 / dt; s++) {
      sim.step(dt);
      fish.forEach((f, i) => { const p = sim.pose(f.id)!, c = col(i); line(prev[i].x, topY(prev[i].z), p.x, topY(p.z), c); line(prev[i].x, sideY(prev[i].y), p.x, sideY(p.y), c); prev[i] = { ...p }; });
    }
    fish.forEach((f) => { const p = sim.pose(f.id)!, r = Math.max(2, Math.round(f.len * 0.06)); dot(p.x, topY(p.z), r, [0, 0, 0]); dot(p.x, sideY(p.y), r, [0, 0, 0]); });
    for (let x = 0; x < W; x++) { px(x, 0, [0, 0, 0]); px(x, H1 - 1, [0, 0, 0]); px(x, H1 + GAP, [0, 0, 0]); px(x, HH - 1, [0, 0, 0]); }
    const raw = Buffer.alloc((W * 3 + 1) * HH);
    for (let y = 0; y < HH; y++) { raw[y * (W * 3 + 1)] = 0; Buffer.from(img.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1); }
    const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
    const crc = (b: Buffer) => { let c = -1; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
    const chunk = (t: string, d: Buffer) => { const o = Buffer.alloc(12 + d.length); o.writeUInt32BE(d.length, 0); o.write(t, 4, 'ascii'); d.copy(o, 8); o.writeUInt32BE(crc(o.subarray(4, 8 + d.length)), 8 + d.length); return o; };
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(HH, 4); ihdr[8] = 8; ihdr[9] = 2;
    writeFileSync(process.env.SWIM_TRACE!, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
  });
