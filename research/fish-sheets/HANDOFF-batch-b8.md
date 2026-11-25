# Handoff: build-B batch b8 (the 21 remaining old-model fish), written 2026-11-25

## Start here
- Steps live in `research/fish-sheets/PIPELINE.md`; this file holds only the b8 list and notes.
- **State:** 21 prompts written and committed (`research/fish-sheets/prompts/<id>-b8-5row.md`). Work folders `C:/Users/nreed/fish-sheets/<id>-b8-gen/`
  hold `species.txt`, `fishshapes.json`, `prompt.txt` (outside the repo; regenerate with PIPELINE steps 3-4). **No sheet exists yet.**
- **Nathan's list approval:** 2026-11-25, "Approve all 21".
- **Next (Nathan):** after the 6 b7 sheets finish (ocellaris, peacock, peapuffer, rainbowshark, tigerbarb, yoyoloach) and the R147 f1 queue is confirmed stopped
  (one queue only), run from the shared folder. Do NOT use `--all` (it would also pick up the 19 unsheeted `*-f1-gen` colour-form folders):
```
python scripts/sheet-queue.py C:/Users/nreed/fish-sheets/merah-b8-gen C:/Users/nreed/fish-sheets/exclamation-b8-gen C:/Users/nreed/fish-sheets/chili-b8-gen C:/Users/nreed/fish-sheets/clownpleco-b8-gen C:/Users/nreed/fish-sheets/pleco-b8-gen C:/Users/nreed/fish-sheets/demasoni-b8-gen C:/Users/nreed/fish-sheets/kadango-b8-gen C:/Users/nreed/fish-sheets/livingstonii-b8-gen C:/Users/nreed/fish-sheets/afra-b8-gen C:/Users/nreed/fish-sheets/syno-b8-gen C:/Users/nreed/fish-sheets/firefish-b8-gen C:/Users/nreed/fish-sheets/banggai-b8-gen C:/Users/nreed/fish-sheets/sixline-b8-gen C:/Users/nreed/fish-sheets/koletang-b8-gen C:/Users/nreed/fish-sheets/foxface-b8-gen C:/Users/nreed/fish-sheets/lawnmowerblenny-b8-gen C:/Users/nreed/fish-sheets/pajamacardinal-b8-gen C:/Users/nreed/fish-sheets/yellowtailblue-b8-gen C:/Users/nreed/fish-sheets/coralbeauty-b8-gen C:/Users/nreed/fish-sheets/watchman-b8-gen C:/Users/nreed/fish-sheets/mandarin-b8-gen
```
- Then build in the background: `python -I scripts/fish-batch.py --batch b8 --idle 45` and end the turn.
- Model id `<id>b`, folder `<id>-b8-gen`. All 21 ids are in `src/data/species.json`.

## The 21 for b8
Chosen as every fish still on an old model with no sheet or spec; left out: fancy goldfish (twin tail), kuhli loach (eel), hillstream loach (flat). TL in mm is from species.json.

| id | species | TL mm | FishShapes (depth % SL) | watch |
|---|---|---|---|---|
| merah | Boraras merah | 24 | proxy Boraras maculatus, n 3 (27) | translucent fins; uniform red, no stripe |
| exclamation | Boraras urophthalmoides | 19 | proxy B. maculatus (27) | flank stripe + black spot (pattern recalled, check photos) |
| chili | Boraras brigittae | 23 | proxy B. maculatus (27) | red body, flank stripe + spot (check photos) |
| clownpleco | Panaque maccus | 100 | proxy Ancistrus cirrhosus, n 3 (18) | pleco: cory recipe, adipose, `pec.flat`; real is stouter |
| pleco | Hypostomus plecostomus | 380 | proxy Hypostomus auroguttatus, n 3 (19) | pleco recipe, adipose, spotted/vermiculated |
| demasoni | Pseudotropheus demasoni | 70 | proxy Maylandia zebra, n 3 (36) | real ~32 % (recalled): judge depth; 8-10 narrow bars |
| kadango | Copadichromis borleyi | 170 | proxy Otopharynx brooksi, n 3 (34) | real ~28-30 % (recalled): Protomelas was 42, too deep |
| livingstonii | Nimbochromis livingstonii | 250 | own, n 4 (36) | blotched male pattern; same numbers as the peacock proxy |
| afra | Cynotilapia afra | 100 | proxy Maylandia zebra, n 3 (36) | barred; yellow dorsal (Cobue-type male) |
| syno | Synodontis njassae | 190 | own, n 3 (26) | three barbel pairs, adipose fin, spotted, forked tail |
| firefish | Nemateleotris magnifica | 90 | own, n 3 (21) | **two separate dorsals** (ROW5_EXTRA second dorsal red); long first-dorsal filament |
| banggai | Pterapogon kauderni | 80 | proxy Ostorhinchus cookii, n 3 (36) | not in FishShapes; real ~40 % (recalled): judge depth; two dorsals; long fin points |
| sixline | Pseudocheilinus hexataenia | 100 | proxy P. octotaenia, n 3 (31) | six orange lines; check count in row 2 |
| koletang | Ctenochaetus strigosus | 185 | own, n 3 (53) | scalpel spine at the peduncle; lunate tail |
| foxface | Siganus vulpinus | 250 | own, n 3 (45) | tubular snout, black eye band and patch; very thin from above |
| lawnmowerblenny | Salarias fasciatus | 150 | own, n 3 (27) | blunt steep forehead, eye tentacles, notched dorsal |
| pajamacardinal | Sphaeramia nematoptera | 85 | own, n 3 (54) | **two separate dorsals**; black band, red-orange spots |
| yellowtailblue | Chrysiptera parasema | 76 | proxy Chrysiptera cyanea, n 3 (43) | notched one-piece dorsal; blue-to-yellow change |
| coralbeauty | Centropyge bispinosa | 115 | own, n 3 (61) | gill-cover spine; vertical dark bars faint |
| watchman | Cryptocentrus cinctus | 120 | own, n 2 (20) | **two separate dorsals**; pelvics joined as a disc |
| mandarin | Synchiropus splendidus | 70 | own, n 3 (28) | **two separate dorsals**; scaleless, swirling pattern |

All colour/pattern text is written from memory; check the reference photos (PIPELINE step 2) and fix the species.txt, refill and re-queue only that fish if a pattern is wrong.
Review fixes carried in every prompt (nose, snout, split dorsal wording per PIPELINE step 4). Where a fish has two dorsals, `ROW5_EXTRA` maps the second dorsal to the first's red (peacock gudgeon precedent).
Fish-new may expect specific roles for non-fish-typical anatomy (firefish filament, watchman pelvic disc, mandarin): watch the fin cut on the first build.

## Colour check against references (2026-11-25, Nathan: "check colours")
Done by three Sonnet subagents reading Wikipedia / Commons / Seriously Fish / museum text; each prompt's `.md` ends with an HTML comment listing sources and verdict.
**Only kadango was seen as a photo (one small Commons image); every other fish is TEXT-ONLY**: the colour is checked against page text, not against pixels.
Changed: merah, chili, demasoni, kadango, livingstonii (anal), firefish, sixline, koletang, foxface, lawnmowerblenny, pajamacardinal, coralbeauty, mandarin, watchman (small), banggai (depth 42 % SL, hand-set in `fishshapes.json`; was 36).
OK as written: exclamation, afra (yellow dorsal = Jalo form), yellowtailblue. Unverified, left as is: clownpleco, syno; pleco belly depends on which species Nathan means (spotted = P. pardalis, vermiculated kept for Hypostomus).
Before the sheet runs, a photo look at the text-only fish is still owed (PIPELINE step 2).
