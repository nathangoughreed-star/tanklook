# SH1: real cast shadows (R191a), 2026-11-27

Fixture -> depth map of rock, wood, plants and gear (src/render/castPass.ts), sampled in aqLight (src/render/castShadow.ts).
Redrawn only when the scene, the light, the Show boxes or the Performance level change; orbit / caustics / sway reuse it.
Fish receive but do not cast (contact shadows stay). Plant leaves take half the shadow (uCastLeaf 0.5, plants keep their colour);
rock, wood, sand, gear and fish take 82 % of the fixture's light away (CAST_DEPTH). Switch: Graphics settings "Cast shadows" (fx key `shadows`, on).
Map 2048 at Full quality, 1024 at every lighter level.

- sheet-<scene>.png: rows front / largest rock / raised three-quarter; left shadows off, right on (shipped fx defaults otherwise).
- aquascaper-vs-tanklook.png: Aquascaper Studio hardscape editor | iwagumi without | with shadows, similar raised angle.
- run3/: the raw shots + vf-shots.json.

Perf (scripts/vf-shots.mjs, alternating A/B frames, 40 pairs, window 1280x800 -> 3D view 512x416 CSS at ratio 1, headless Edge d3d11):

| scene | GPU off | GPU on | paired delta | CPU p95 | draw calls |
|---|---|---|---|---|---|
| iwagumi | 13.88 ms | 15.46 ms | +1.68 ms (noisy, p95 8.8) | 13.9 -> 12.9 | 783 = 783 |
| photo-60t | 5.54 ms | 6.01 ms | +0.48 ms | 1.9 -> 1.9 | 229 = 229 |
| planted4 | 6.09 ms | 6.94 ms | +0.48 ms | 4.8 -> 4.8 | 568 = 568 |

The per-frame cost is the 16-tap compare in every lit fragment; it scales with the pixels drawn (a full-screen view costs more).
