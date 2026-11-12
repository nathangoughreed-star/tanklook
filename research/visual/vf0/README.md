# VF0 baseline (lane VF-A, 2026-11-11)

Everything in plan VF (prompts/plan-VF-visual-fidelity.md) compares against these pictures and numbers.

## The three reference tanks (`scenes/`)
Built by `scenes/make-scenes.py` (seeded; re-run only to change a setup on purpose, then re-record the baseline).
Camera locked in each file (`dist 3000, az -8, el 8, zoom 1`), light preset and every item / fish seed fixed.
- `planted4.json`: 48 x 18 x 21 in (about 79 gal), cream sand with dense dark gravel flecks (custom blend, 35 %),
  driftwood (spider, branch, mopani), 24 grass clumps, two swords, crypts, ferns; honey gouramis, neons, cories,
  amanos; LED bar 6500 K. Matches Nathan's screenshot 1 (the PDF's first image).
- `nano.json`: 17.7 x 11.8 x 11.8 in (about 10.7 gal) rimless low-iron, natural gravel, spider wood, red and green stems,
  carpet, anubias on the wood, 12 neons; LED 7000 K.
- `reef.json`: the reef example (48 in bow-front, live rock, acropora, montipora, mushrooms, leathers; 14000 K spots),
  camera locked as above.

## Pictures
`<tank>-<view>-<fx>.png`, view = front, ground (substrate close-up), rock (largest stone or wood), 1050 x 850, fx none.

## Numbers (build 1784 + fx.ts, Intel Arc Pro, D3D11, 1050 x 850)
From `vf-shots.json` (alternating frames, after the progressive reveal has finished):

| tank | GPU ms median | GPU p95 | CPU ms median | CPU p95 | draw calls | triangles |
|---|---|---|---|---|---|---|
| planted4 | 10.81 | 12.65 | 3.3 | 6.4 | 272 | 635 k |
| nano | 7.59 | 8.16 | 2.2 | 4.3 | 163 | 437 k |
| reef | 9.60 | 11.62 | 2.7 | 4.7 | 233 | 237 k |

A/A noise (same fx both sides): paired GPU delta -0.05 / -0.04 / -0.02 ms, p95 of the delta about 0.6 ms.

Cold first frame, production build, fresh profile each load (`cold-ab.json`, median of 3, first frame / settled):
planted4 3781 / 6663 ms, nano 3200 / 3397 ms, reef 3763 / 6233 ms; 38 / 33 / 35 programs.

`perf-baseline.json` (scripts/perf-baseline.mjs on the same files) is kept for its memory / program / rebuild columns;
its steady GPU for reef (2.4 ms, 30 k triangles) was taken before the reveal finished, so use the table above.

## Re-running
```
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/lowprio.ps1 node scripts/vf-shots.mjs --dir research/visual/vfN --fx "none;tonemap:agx;tonemap:aces" --sheet
```
`--cold ../Glass-Box-vf-a-dist-vf0` adds the cold-load A/B against the VF0 production build (kept outside the repo).
