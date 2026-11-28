# Invert model method ("build C"): snails, shrimp, soft corals

Status: **PILOT, waiting on Nathan's verdict** (2026-11-28). It gates the 20 invert species in the first milestone of
`research/species-backlog-2026-11-28.md` (section 3a, answer 5).
Ask (Nathan 2026-11-28): "modeling the soft corals may need a new modeling process, same with snails and shrimp."
Pilots: banded trochus snail, peppermint shrimp, zoanthids. Review pictures: `research/screens/invert-c/`.

## Why not build B (the fish sheet pipeline)
Build B lofts a body from a 3-view silhouette and paints it with the sheet's own pixels. That suits fish (one smooth
body, a side profile that says almost everything). It fits these animals badly:
- **Shells are log spirals.** The silhouette changes with every angle, and the pattern follows the coil. A projected
  side view smears at the 3/4 view. A spiral generator gets every angle right from a few numbers.
- **Shrimp are jointed.** Ten thin legs, antennae 1.5 body lengths long and a segmented, see-through body can't come
  from a silhouette cut-out, and the existing decapod builder (`src/render/shrimp3d.ts`) is already anatomical.
- **Soft corals are colonies.** A zoanthid rock carries 50-150 copies of one polyp. The look comes from one polyp's
  rings and from how tightly they pack, not from one outline.

So build C keeps a **generator per body plan** and makes everything it is fed **measured from real photos**. The old
specs were eyeballed, so the generator was never the problem. Each species becomes a short, cited list of numbers and
colours, plus a pattern recipe painted in the generator's own coordinates (along the coil, along the body, across the disc).
That is why patterns stay on the shell, the segment or the disc at every angle.

## What was wrong with the current models (seen on the pilots' review sheet)
- Snails: every marine snail reused the globose turbo shape. Smooth shell, no sculpture, one flat olive colour, bands that
  don't match any photo.
- Shrimp: bodies painted as opaque gradients. No species-placed marks (lines on segment rims), single-colour legs.
- Zoanthids: sparse polyps on top of the rock only, discs as flat dots, no tentacle fringe, colours not from a photo.

## The steps (per species)
1. **Photos.** At least two real photos, one side-on where possible (`research/species-art-method.md` step 1;
   Wikimedia Commons first). Record the page URLs in the spec's comment. Download to the scratchpad only, never
   into the repo.
2. **Written look.** Write it in the spec's comment before drawing: shape, colours, the diagnostic marks, the
   sculpture.
3. **Measure.** Take the numbers off the photos with a script, not by eye:
   - snail: height/width, apical angle, whorl count, base flat or round, cords per whorl, beads per turn.
     (The pilot measured H/W 0.84-0.98 and apical 58-65 deg with a silhouette script on black-background shells.)
   - shrimp: carapace share of the body, where the abdomen bends, leg reach, antenna length, eye size.
   - polyp: disc radius vs rock, packing (disc spacing / disc diameter), tentacle count and length, column height.
   - colours: `python -I scripts/invert-lab/radial.py <photo> <cx> <cy> <r>` gives a polyp's ring colours; shells and
     bodies take a median of the masked pixels. **Lift sampled colours to the photo's bright side.** A median mixes in
     shadow and gaps, and the scene's stylization keeps colours vivid (as plants: vivid, not muted).
4. **Spec + generator.** Write the numbers into the species' entry. If the body plan needs something the generator lacks,
   add it as an optional field, so every existing species stays the same. Fields added by the pilot:
   - shell (`Shell3D`, `src/art/snails.ts`): `sq` (squared section), `shear` (cone-leaning outer face, flat base), `cords`
     (beaded spiral cords as relief), `nth` / `texW` (sampling and texture detail for sculpted shells), `mark: 'flames'`.
   - shrimp (`Shrimp3D`, `src/art/shrimps.ts`): `band` (ringed limbs); `CARA` / `SEG` / `segRange` moved to the art file so
     marks sit on the real segment rims.
   - polyp colony (`src/render/coral3d.ts`): `zoaPolyp` (column, ringed disc, two-length tentacle fringe) and
     `zoanthidC` (polyps dart-thrown onto the rock's own triangles, facing out, packed at 1.7 disc radii). A morph = a
     ring profile + tentacle colours (`ZOA_C`).
5. **Lab review.** `node scripts/invert-lab/shot.mjs <outDir> <model> ...` renders side / 3-4 / top / front strips
   headless (models: a snail or shrimp art id, or `coral:<variant>`; `tank` / `tankold` = a lab tank shot of the
   pilots vs the current models). Put them beside the photos: one sheet per species, current model in the middle.
6. **Nathan's verdict.** He approves or corrects. Every correction becomes a row in the log below, in the same commit.
7. **Go live.** Point the species (or the coral item) at the new art, check it in the real app (tank shot), then ship.

## Gates before showing Nathan
- The diagnostic mark is there at tank distance: trochus flames + cone, peppermint red lines on a clear body, zoa ring
  colours + green fringe.
- Silhouette ratios within the photos' measured range.
- No buried or floating parts (polyps sunk in rock, shell off the foot).
- Cost: say the vertex count if it grows. The sculpted trochus shell is about 42k vertices (641 x 65); a zoa rock
  carries a few thousand triangles per ten polyps (not yet measured on a full rock). Fine for a few in a tank. A
  cleanup crew of 20 trochus needs a lower `nth` at a distance (LOD, not done yet): measure before going live.

## Pilot results (2026-11-28)
| Pilot | Spec | Photos (Commons) | Measured | State |
|---|---|---|---|---|
| Banded trochus | `SNAILS.trochus`, `SHELL3D.trochus` | Trochus_histrio_01, _02; Trochus_maculatus_01, _Landaagiraavaru | H/W 0.84-0.98, apical 58-65 deg, cream #baa089, flames #9c685c | built, lab only |
| Peppermint shrimp | `SHRIMP3D.peppermint` | Lysmata_wurdemanni_(I0699), _0468, _Nausicaa; Lysmata_boggessi | carapace ~0.38, arched at segment 3, antennae ~1.5 body | built, lab only |
| Zoanthids (dragon-eye) | `reefShape('zoanthid-c')`, morphs `dragoneye`, `purple` | Zoanthus-dragon-eye; Vi_-_Zoanthus_sociatus_-_2 | ring profile via radial.py; discs nearly touching | built, lab only |

Not live: no species row points at `trochus` or `peppermint`, and `zoanthid-c` isn't in the item catalogue. The live
turbo, cleaner shrimp and zoanthid item render exactly as before. The tank shot is the lab scene, not the app.

## Open questions for Nathan
1. Generator + measured numbers (this doc), or a ChatGPT reference sheet per invert like build B? Recommendation: the
   generator, because shells, jointed legs and colonies don't come from silhouettes. A sheet could later serve one job:
   a top-down picture of an irregular pattern (a zoa morph's disc) to sample ring colours from.
2. Zoanthid morphs: one colony = one morph (as sold), or mixed?

## Sheet test (Nathan 2026-11-28: "lets do a sheet test for each unique kind of body shape just to check how well it works")
One ChatGPT 5-row reference sheet per body plan in the milestone, to judge whether sheets beat the measured generator
(open question 1). Prompts: `scripts/invert-sheet-prompts.py` -> `research/invert-sheets/prompts/<id>-t1.md` and
`C:/Users/nreed/fish-sheets/<id>-inv1-gen/prompt.txt`. Header = build B's method block, reworded where it named fins.
| Body plan | Test species | Rows |
|---|---|---|
| Cone snail | banded trochus | side crawling; shell aperture / back; apex + base; sole through glass |
| Caridean shrimp | peppermint | side; side without appendages; top; front + map; side map |
| True crab | emerald crab | top; top without legs; side; front + map; underside |
| Hermit crab | scarlet reef hermit | side; crab out of shell; top; front + map; empty shell |
| Urchin | tuxedo urchin | side; side without spines; top; bottom + zone map; spine strip |
| Polyp colony | zoanthid (dragon-eye) | polyp top + side; disc ring map; closed polyp; colony patch; colony on rock |
**Crab template (R207, Nathan 2026-11-28: "I had to alter the emerald crab prompt ... because it was printing wrong
before"):** his rewrite is the emerald crab prompt word for word (`emeraldcrab-t1.md`; the folder's `prompt.txt` is the
original). It states the 10 appendages, five per side in order; it has a dorsal master view, a carapace-only dorsal
view, a front segmentation map (claws red, legs yellow, eyes white), a ventral view and a final checklist. New crabs copy
it and change only the species facts. Its general blocks are now in the script for every crustacean: the appendage
priority, a count per side in order, a fixed symmetric pose, strict orthographic with no ground lines, and the checklist
(`PRIO_CRUST`, `POSE_CRUST`, `CHECK_CRUST`). Peppermint and scarlet hermit have t2 prompts with them, written for a redo
and not queued (their t1 sheets exist).
Judge each sheet on: same specimen in every row, measured ratios held, rows usable by a script (maps flat, black clean),
and the look against the reference photos. Results go in the table below once the sheets are in.

## Correction log (Nathan's corrections, newest last)
| Date | Model | Correction | Fix |
|---|---|---|---|
