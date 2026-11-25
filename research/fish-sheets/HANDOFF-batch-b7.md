# Handoff: build-B batch b7 (the next 20 fish), written 2026-11-25

## Start here
- **The steps live in `research/fish-sheets/PIPELINE.md`** (one runbook, 15 steps). This file holds only the b7 list and notes.
- **Pending for b7 (2026-11-25):** body translucency (step 10) waits on branch `claude/translucent-bodies`, parked by Nathan; fin beat (step 11) needs no spec change. b7 builds ship without translucency.
- This is the same pipeline as b6. Read `research/fish-sheets/HANDOFF-batch-b6.md` for the steps, the known fixes and the
  "never again" incidents; this file only records what is different for b7.
- **State:** the 20 prompts are written and committed (`research/fish-sheets/prompts/<id>-b7-5row.md`). The work folders
  `C:/Users/nreed/fish-sheets/<id>-b7-gen/` hold `species.txt`, `fishshapes.json` and `prompt.txt` (they live outside the repo;
  if they are gone, regenerate with `scripts/fishshapes.py` and `scripts/fish-prompt-fill.py` as in b6 step 1). **No sheet exists yet.**
- **Nathan's list approval:** 2026-11-25, "Approve all 20" (asked in the b7 prompt-writing chat, with the list below).
- Next: Nathan runs the sheet queue (one only; see b6 "Never again"):
  `python scripts/sheet-queue.py --all` from the shared folder. Only the 20 b7 folders have a prompt and no sheet, so `--all` is safe.
  Then build in the background: `python -I scripts/fish-batch.py --batch b7 --idle 45`, and end the turn.
- The model id is `<id>b`, the folder `<id>-b7-gen`, as in b6. All 20 ids are already in `src/data/species.json`.

## The 20 for b7
Chosen as the common, popular roster fish with no build-B sheet or prompt yet (checked against `fishLive.json`, every `*-b5/b6-5row.md`,
`research/fish-specs/` and the roster). FishShapes: "own" = the species itself; otherwise the closest relative, named in the
prompt header and in `fishshapes.json` (`proxy_for`, `note`). Depth is the one number in each prompt.

| id | species | TL mm | FishShapes (depth % SL) | watch |
|---|---|---|---|---|
| tigerbarb | Puntigrus tetrazona | 70 | own, filed as Systomus tetrazona, n 3 (41) | specimens only 24-27 mm SL; four bars: check they stay on the body in row 2 |
| harlequin | Trigonostigma heteromorpha | 50 | proxy Rasbora caudimaculata, n 3 (29) | proxy is shallow: real wedge is likely ~33 % SL (recalled, unchecked); judge the depth; black wedge edge |
| clownloach | Chromobotia macracanthus | 230 | proxy Botia histrionica, n 3 (29) | real is likely ~22-25 %; barbels short; infraorbital spine flat; forked tail |
| comet | Carassius auratus | 250 | proxy Cyprinus carpio, n 3 (35) | single forked tail (not a fancy twin tail); sheet may drift toward a deeper fancy goldfish |
| bristlenose | Ancistrus sp. | 125 | proxy Ancistrus cirrhosus, n 3 (18) | plecos rest on their fins; snout tentacles; eyes on top; adipose; sail dorsal; head-on flat belly (cory recipe: `plan`, `--snout-open`, `plan_extra`, see method rows 52-53) |
| balashark | Balantiocheilos melanopterus | 330 | own, n 3 (24) | forked tail with black edges |
| rainbowshark | Epalzeorhynchos frenatum | 150 | own, n 1 (26) | n 1; downturned sucker mouth |
| firemouth | Thorichthys meeki | 144 | proxy Thorichthys callolepis, n 2 (40) | long for its depth; other congeners 45-46; filament on dorsal and anal |
| kribensis | Pelvicachromis pulcher | 110 | proxy Pelvicachromis humilis, n 3 (30) | |
| cockatoo | Apistogramma cacatuoides | 85 | proxy Apistogramma agassizii, n 3 (32) | male crest of long dorsal rays: row 5 must keep it with the dorsal |
| peacock | Aulonocara stuartgranti | 118 | proxy Nimbochromis livingstonii, n 4 (36) | real is likely ~30-33 % (recalled, unchecked) |
| endler | Poecilia wingei | 28 | proxy Poecilia reticulata, n 3 (28) | livebearer: row 2 must drop the tail and gonopodium (guppy lesson); sheet may copy the guppy |
| glasscatfish | Kryptopterus vitreolus | 78 | proxy Kryptopterus bicirrhis, n 3 (21) | clear body: the mask threshold (`--thr 8`) may lose the body; tiny dorsal; abdominal bulge |
| dwarfpencil | Nannostomus marginatus | 35 | proxy Nannostomus beckfordi, n 3 (22) | very thin; stripes are body marks |
| greenneon | Paracheirodon simulans | 30 | proxy Paracheirodon innesi, n 3 (28) | sheet may copy the neon (neonb is live): no red band here |
| yoyoloach | Botia almorhae | 160 | proxy Botia histrionica, n 3 (29) | same proxy as the clown loach; slimmer in life |
| peapuffer | Carinotetraodon travancoricus | 30 | proxy Carinotetraodon lorteti, n 3 (43) | **no pelvic fins**: the prompt's rows 4 and 5 have the pelvic lines removed; fish-new / fin cut may expect a pelvic. No scales. Rounded body |
| clownkilli | Epiplatys annulatus | 42 | proxy Epiplatys sexfasciatus, n 3 (25) | dorsal set far back |
| ocellaris | Amphiprion ocellaris | 100 | own, n 3 (43) | notched dorsal (see below); three white bars edged black |
| chromis | Chromis viridis | 100 | proxy Chromis atripectoralis, n 3 (49) | `fishshapes.py` crashes on C. viridis itself (missing values); notched dorsal; forked tail |

Left out on purpose: kuhli loach (eel-shaped; row 2 and the build would be hard), fancy goldfish (twin tail), the other Boraras
rasboras (near copies of the ember / dwarf rasbora), all inverts, herps and spiders. Still unbuilt after b7: kuhli, goldfish,
hillstream loach, the Boraras rasboras (merah, chili, exclamation), tiger-barb-like small barbs, and the marine set (firefish,
banggai, mandarin, coral beauty, six-line wrasse, watchman goby, foxface, kole tang, lawnmower blenny, pajama cardinal, yellowtail
blue damsel); marine ones have their own numbers in FishShapes except the banggai.

## Fixes from Nathan's b6 review, built into every b7 prompt
The method block in `B-5row-template.md` is not reworded (it is the blue tang prompt word for word); the fixes live in each species'
`BODY_BULLETS`, which land in the master-geometry section:
1. **Snouts not too pointy:** `* Snout blunt and gently rounded in the side and top views, never a pointed cone or beak.`
2. **No black hole in the nose from the front:** `* Seen from the front, the closed mouth is a fine lip line on a solid head surface; the nostrils are faint marks on the skin, never dark holes or openings.`
3. **Split dorsal fins:** the prompts say how each dorsal is built. A one-piece fin with a notch (ocellaris, chromis) says
   "One continuous fin ... two parts joined at the base: a spiny front part, a notch, then a soft rear part", so row 5 keeps one
   red fin. No b7 fish has two separate dorsals, so no `ROW5_EXTRA` dorsal line is needed, but three have an adipose fin
   (bristlenose, dwarfpencil, greenneon) and it is mapped to the dorsal's red as in the template rule.
   *This is my reading of "split dorsal fins" from the b6 brief; the b6 chat's own notes were not in the repo. If Nathan meant something else
   (e.g. rows 2 / 5 dropping or merging the second dorsal piece), fix the wording in the `species.txt` files and refill.*

Also taken from b5 / b6: `MARKS_SHORT` holds body marks only, no fin; no size adjectives where a number or a shape works
(the filler still warns on a few words like "long" and "thin" that describe the real fish; they are warnings, not errors);
no fin is named in the row 2 keep list; peapuffer has the pelvic lines removed by hand from the filled prompt (the template has no slot
for it, as the template note says).

## Watch list for the builds (from b5 / b6, applies here)
- Cory recipe for the bristlenose and, if the snout reads wedge-shaped, the loaches (barbels): `--snout-open`, `plan_extra` (rows 52-53).
- Forked tails (tigerbarb, harlequin, balashark, comet, chromis, clown loach): check the tail base (b6 "Tail base in the fork").
- Livebearer row 2 (endler): if the sheet keeps a tail, redo the sheet (b6 "Row 2 kept a fin").
- Proxies with a note about the real depth (harlequin, clownloach, yoyoloach, peacock, comet): compare the built depth with a real photo
  before approval; fish-new stretches the drawn depth to the median, so a proxy that is too shallow gives a thin fish.
- Colour hue shifts: set `sat` by hand where autosat cannot fix hue (b6 "Colour hue shift").

## Commit
Prompts and this file are committed by path with `scripts/ship.sh`. Specs, art and anatomy for built fish follow the b6 "Commit" recipe.

## State 2026-11-25 (b7 review)
Built (14): balashark bristlenose chromis clownkilli clownloach cockatoo comet dwarfpencil endler firemouth glasscatfish greenneon harlequin kribensis. Root-band filter on (fish-build, `fishroot.py`).
**Approved by Nathan 2026-11-25 and live in `fishLive.json` (12):** balashark bristlenose chromis clownkilli clownloach cockatoo comet dwarfpencil endler greenneon harlequin kribensis.
**Held:** firemouth (thin dark dotted line at the tail join, renderer or card, being checked) and glasscatfish (body see-through `body_clear` set from a Commons photo, not yet seen in a tank scene). Both are built, not in fishLive.
Notes: bristlenose has a chin barbel only (snout tentacles not modelled) and a small smudge below the belly; mass out of range on comet (1.24-1.54x), glasscatfish (1.45-1.56x), harlequin (0.79-1.36x). Fin-beat strips owed.
Still no sheet: ocellaris peacock peapuffer rainbowshark tigerbarb yoyoloach (Nathan's queue). The 25 fish live before 2026-11-25 still carry the tail-root band until rebuilt with fish-build.
