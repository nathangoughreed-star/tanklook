# VF1 tone mapping (lane VF-A, 2026-11-12)

Nathan picked C. ACES from research/visual/vf1/VF1-tone-mapping-options.pdf (unchanged / AgX / ACES, 3 tanks x 3 views),
and asked for more separation in the near-blacks ("ACES appears to crush some of the dark detail, particularly on the
cabinets"). Fix: below mid grey the ACES result eases back toward the untoned value, keeping a third of ACES's
darkening at black (render/lighting.ts AQ_TONE). VF1-aces-shadow-fix.pdf: unchanged | first ACES | ACES + fix.
ACES is now the default (render/fx.ts FX_DEFAULT.tonemap = 2); `?fx=tonemap:none` / `tonemap:agx` compare.

Cost, front view, alternating frames (vf-shots.json): paired GPU delta +0.19 / +0.36 / +0.12 ms (planted4 / nano /
reef; frame-to-frame noise p95 about 1-1.6 ms on this shared machine), draw calls unchanged, no extra programs.
Not fixed here (later stages): pale live rock, coral colours, crevice shading (VF4 contact, VF7 reef tune).
