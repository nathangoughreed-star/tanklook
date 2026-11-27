# Handoff: build-B batch b10 (the last two catalogue fish), written 2026-11-27

## Start here
- Steps live in `research/fish-sheets/PIPELINE.md`; this file holds only the b10 list, what already exists for these two fish, and the queue command.
- **State:** 2 prompts written and committed (`research/fish-sheets/prompts/<id>-b10-5row.md`; each ends with an HTML comment listing the reference photos).
  Work folders `C:/Users/nreed/fish-sheets/<id>-b10-gen/` hold `species.txt`, `fishshapes.json`, `prompt.txt` (outside the repo).
- **The two:** flame angelfish and orchid dottyback, the last catalogue fish with no build-B model (inverts, herps and arachnids are out of scope).
- **No colour forms** (PIPELINE step 1). Never `--all`: it would pick up the `*-f1-gen` colour-form folders.
- **Queue (Nathan), from the shared folder, after any running queue finishes (one queue only):**
```
python scripts/sheet-queue.py C:/Users/nreed/fish-sheets/flameangel-b10-gen C:/Users/nreed/fish-sheets/orchiddottyback-b10-gen
```
- Build in the background: `python -I scripts/fish-batch.py --batch b10 --idle 45`. Model ids `flameangelb`, `orchiddottybackb`.

## What already exists (do not overwrite)
- **Flame angel:** an older sheet-method model (E0 photoart baseline, f3160d5a): spec `research/fish-specs/flameangel.json`, art `public/art/fish/flameangel*.webp`,
  `src/data/fishart/flameangel{,.sheet}.anatomy.json`, a JSON plan (`flameangel.json` + `.grid.json` in `fishartjson.ts`). Method doc row: "built; top view 6% long,
  front and top ratios disagreed". Not in `fishLive.json`. The b10 build writes only `flameangelb*` files.
- **Orchid dottyback:** the first fish ever built with the sheet method, on the old 3-view sheet (`research/fish-model-sheet-method.md` section 1):
  card `public/art/fish/orchiddottyback.webp`, anatomy `orchiddottyback{,2,3}.anatomy.json`, drawn by `src/art/photoart.ts` behind `?photoart`.
  Method doc: "built and approved; prompt lost". Not in `fishLive.json`, so the live site still draws the procedural plan (`fishgen.ts`).
  The b10 build writes only `orchiddottybackb*` files; the approved card stays as it is. Going live with `orchiddottybackb` replaces what visitors see (the
  procedural fish), not the photo card, and is Nathan's call at review.

## The two
| id | species | TL mm | SL_IN | FishShapes (depth % SL) | watch |
|---|---|---|---|---|---|
| flameangel | Centropyge loricula | 150 | 4.7 | **own**, listed as *Centropyge loriculus* (n 3): depth 55, head 36, ped 12, width 19 | 5 black bars; black/electric-blue banded rear dorsal and anal; cheek spine |
| orchiddottyback | Pseudochromis fridmani | 76 | 2.5 | **proxy** *P. flavivertex* (n 3, depth 30.1, range 23.5-31.4); depth hand-set **27** from photos | one even colour; long dorsal/anal reaching the peduncle; dark eye line |

`fishshapes.py "Centropyge loricula"` and `"Pseudochromis fridmani"` both say "not in FishShapes"; the flame angel is under the synonym spelling.
The dottyback proxy's specimens are not orchid-sized, so its mass check is a sanity range only (stated in the JSON note).

## Colours (Commons photos seen 2026-11-27 in the browser pane; URLs in each prompt's last comment)
- **flameangel:** deep red-orange, yellower mid-flank and lower body; five narrow irregular black bars on the upper/middle flank, not reaching the belly;
  rear soft dorsal and anal edged with alternating black and electric-blue bands; plain yellow-orange rounded tail; orange pectorals.
- **orchiddottyback:** one even magenta-violet over body and fins (back a little darker), dark purple line from the snout through the eye; rounded tail.

## Risks
- **flameangel:** the black bars are body markings (MARKS_SHORT) and belong in row 2; the risk is the blue-banded fin edges bleeding
  into row 2 at the dorsal/anal bases. The preopercle spine may come out as a stray piece in the fin cut; if so, `erase` it in the spec. Deep, compressed body:
  the old model's top view drew 6 % long and front/top disagreed (method rows 13, 19), so check the audit's width-vs-front ratio first.
- **orchiddottyback:** dorsal and anal both run to the peduncle, so the fin cut may merge them with the caudal (the clownknife `KeyError: 'caudal'` family):
  redo the sheet or `--body-from-map`. Same-colour fins: row 5's colour map is what separates them. Compare built depth with the photos (asked 27 % SL).

## State table (fill in as each lands)
| id | sheet | built | verdict | sha | live |
|---|---|---|---|---|---|
| flameangel | no | no | | | no |
| orchiddottyback | no | no | | | no |
