// Build-B fish pictures (method row 44): six views and a tail-base close-up, saved by the dev server's /__shot endpoint
// (scripts/shots-plugin.mjs) as shots/<id>-<view>[-<tag>].png. Then: python -I scripts/fish-contact.py <id> --sheet <sheet.webp>.
// In the page (?photoart, ~4 s after load; close the tank panel first):
//   const m = await import('/scripts/fish-shots.js'); await m.shootFish('gbrb', 50);          // tl in mm
//   await m.shootFish('gbrb', 50, { tag: 'before', views: ['tail'] });                       // one view, tagged
// Zoom scales with 1/TL (28 at 50 mm side-on); the canvas is drawn by hand because the drawn-listener route times out
// whenever the pane isn't being captured.
const wait = ms => new Promise(r => setTimeout(r, ms));

export const VIEWS = {
  side: { yaw: 0, az: 0, el: 0, z: 1 },
  other: { yaw: 180, az: 0, el: 0, z: 1 },          // right flank: turn the fish, not the camera (the camera orbits the tank centre)
  q34: { yaw: 40, az: 0, el: 15, z: 0.55 },
  rear34: { yaw: 140, az: 0, el: 15, z: 0.55 },
  front: { yaw: 0, az: 90, el: 0, z: 30 / 28 },
  top: { yaw: 0, az: 0, el: 89, z: 24 / 28 },
  tail: { yaw: 0, az: 0, el: 0, z: 2.6, dx: 0.3 }, // tail base centred: the fish moves forward by 0.3 TL
  head: { yaw: 0, az: 0, el: 0, z: 2.6, dx: -0.3 }, // head close-up (snout / lips / mouth, b6 2026-11-24): the fish moves back by 0.3 TL
  face: { yaw: 0, az: 90, el: 0, z: 2.6 }, // front close-up (face, b6 2026-11-24)
  face34: { yaw: -55, az: 0, el: 0, z: 2.2 }, // head from front-left, 45 deg: front-layer mouth against the 3D snout tip (2026-11-25)
};

async function grab(name) {
  const v = globalThis.__gb.viewer, c = v.renderer.domElement;
  for (let i = 0; i < 4; i++) { v.dirty = true; v.draw(); await wait(300); }
  // read the canvas in the same task as a draw: WebGL clears the buffer once the frame is composited, so a toDataURL after an await
  // came back solid black whenever the composite won the race (most often with the Browser pane hidden or just resized, 2026-11-24)
  v.dirty = true; v.draw(); const url = c.toDataURL('image/png');
  const blob = await (await fetch(url)).blob();
  const r = await fetch('/__shot?name=' + encodeURIComponent(name), { method: 'POST', body: blob });
  if (!r.ok) throw new Error('shot ' + name + ': ' + r.status);
}

// behind: a second fish of that species 1.2 TL farther from the camera, lower by 0.15 TL (see-through bodies, 2026-11-25: something to see through)
export async function shootFish(species, tlMm, { tag = '', views = Object.keys(VIEWS), settle = 1800, behind } = {}) {
  const gb = globalThis.__gb, v = gb.viewer, z0 = 28 * 50 / tlMm, done = [];
  for (const name of views) {
    const o = VIEWS[name];
    v.swim = false; v.sway = false; v.drifters.length = 0;
    gb.store.update(s => {
      const t = s.tanks[s.active]; t.tank = { L: 72 * 25.4, H: 24 * 25.4, D: 24 * 25.4 };
      t.fish = [{ id: 901, species, x: 0.5 * t.tank.L + (o.dx || 0) * tlMm, y: 0.5 * t.tank.H, depth: 0.5 * t.tank.D, yaw: o.yaw, pitch: 0, roll: 0, bend: 0 }];
      if (behind) t.fish.push({ id: 902, species: behind, x: 0.5 * t.tank.L + (o.dx || 0) * tlMm, y: 0.5 * t.tank.H - 0.15 * tlMm, depth: 0.5 * t.tank.D - 1.2 * tlMm, yaw: o.yaw, pitch: 0, roll: 0, bend: 0 });
      t.camera = { ...t.camera, az: o.az, el: o.el, zoom: z0 * o.z };
    });
    await wait(done.length ? settle : settle + 2500);   // the first view after a page load waits for the new fish's textures (a blank side shot, tailspot)
    const file = `${species}-${name}${tag ? '-' + tag : ''}`; await grab(file); done.push(file);
  }
  return done;
}
