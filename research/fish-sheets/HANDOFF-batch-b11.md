# Batch b11: 20 new roster species (sheet queue)

Started 2026-11-27 by lane b11. Nathan: "write prompts for like 20 species I want a long queue to work on"; list approved in chat ("Approve all 20"). Request R195.
Steps live in `PIPELINE.md`; this file holds only the fish list and batch notes.

## State
- **Done:** steps 1 (pick), 3 (FishShapes / proxies), 4 (prompts). `species.txt`, `fishshapes.json`, `prompt.txt` in `C:/Users/nreed/fish-sheets/<id>-b11-gen/`;
  committed copies in `research/fish-sheets/prompts/<id>-b11-5row.md`. Generator: `python -I scripts/b11-species-blocks.py` (species.txt), then
  `fish-prompt-fill.py` per folder, then `b11-species-blocks.py --finish` (strips absent fins from rows 4-5, copies to `prompts/`). Edit the generator and rerun, not the outputs.
- **Next (Nathan): step 5 sheets.** From the shared folder: `python scripts/sheet-queue.py --all` (20 folders, alphabetical). `--all` now skips the banned
  `*-f1-gen` colour-form folders (before this fix it would have queued 18 of them first).
- **Not done: catalogue entries.** None of the 20 is in `src/data/species.json` yet. A species row there shows the fish in the catalogue, so it needs care data
  (temperature, pH, compatibility, tank size, `note`) and a fallback look before it goes in. Do this before any build goes live (step 14 needs the id); the
  build steps 6-12 do not need it.
- No blanket "blunt, gently rounded snout" bullet (R194, lane FH1): each snout is described as the species has it. The front-view mouth/nostril bullet stays
  (the moray's says its tube nostrils are skin tubes, not holes).

## The 20
TL = typical adult total length in the aquarium. Photos = Wikimedia Commons category file count on 2026-11-27 (step 2: pick 1-3 side views there, record the file names here).

| id | Common / scientific | TL | FishShapes | Absent fins (rows 4-5 edited) | Photos |
|---|---|---|---|---|---|
| serpae | Serpae tetra, *Hyphessobrycon eques* | 1.6 in | own | - (adipose -> red) | [12](https://commons.wikimedia.org/wiki/Category:Hyphessobrycon_eques) |
| congotetra | Congo tetra (male), *Phenacogrammus interruptus* | 3.3 in | own | - (adipose -> red) | [18](https://commons.wikimedia.org/wiki/Category:Phenacogrammus_interruptus) |
| silverdollar | Silver dollar, *Metynnis argenteus* | 5.5 in | proxy *M. hypsauchen* (depth 79 % SL, top of range: check vs photo) | - (adipose -> red) | [5](https://commons.wikimedia.org/wiki/Category:Metynnis_argenteus) |
| denison | Denison barb, *Sahyadria denisonii* | 6 in | **none**: hand-written estimate, depth 25 % SL, n=0 specimens (fish-new mass check may have nothing to compare: confirm depth and mass vs photos) | - | [29](https://commons.wikimedia.org/wiki/Category:Puntius_denisonii) |
| paradisefish | Paradise fish (male), *Macropodus opercularis* | 3.5 in | own | - | [42](https://commons.wikimedia.org/wiki/Category:Macropodus_opercularis) |
| jackdempsey | Jack Dempsey, *Rocio octofasciata* | 10 in | own | - | [29](https://commons.wikimedia.org/wiki/Category:Rocio_octofasciata) |
| frontosa | Frontosa, *Cyphotilapia frontosa* | 13 in | own | - | [22](https://commons.wikimedia.org/wiki/Category:Cyphotilapia_frontosa) |
| blackghost | Black ghost knifefish, *Apteronotus albifrons* | 8 in (20 in max) | own | dorsal, pelvic | [16](https://commons.wikimedia.org/wiki/Category:Apteronotus_albifrons) |
| pictus | Pictus catfish, *Pimelodus pictus* | 4.5 in | own | - (adipose -> red) | [9](https://commons.wikimedia.org/wiki/Category:Pimelodus_pictus) |
| greenspotpuffer | Green spotted puffer, *Dichotomyctere nigroviridis* | 6.5 in | own (as *Tetraodon nigroviridis*) | pelvic | [11](https://commons.wikimedia.org/wiki/Category:Tetraodon_nigroviridis) |
| bumblebeegoby | Bumblebee goby, *Brachygobius doriae* | 1.6 in | own | - (2nd dorsal -> red) | [5](https://commons.wikimedia.org/wiki/Category:Brachygobius_doriae) |
| scarletbadis | Scarlet badis (male), *Dario dario* | 0.8 in | proxy *D. hysginon* | - | [2: male + female](https://commons.wikimedia.org/wiki/File:Dario_dario_male.jpg) |
| powderbluetang | Powder blue tang, *Acanthurus leucosternon* | 9 in | proxy *A. japonicus* | - | [159](https://commons.wikimedia.org/wiki/Category:Acanthurus_leucosternon) |
| nasotang | Naso tang, *Naso elegans* | 18 in max (12 in typical) | proxy *N. lituratus* (n=6) | - | [60](https://commons.wikimedia.org/wiki/Category:Naso_elegans) |
| flamehawk | Flame hawkfish, *Neocirrhitus armatus* | 3.5 in | own (as *Neocirrhites*) | - (pectorals rest spread: perching fish, template exception) | [about 5, search](https://commons.wikimedia.org/w/index.php?search=Neocirrhites+armatus&ns6=1) |
| copperband | Copperband butterflyfish, *Chelmon rostratus* | 8 in | own | - (the snout really is a long tube) | [185](https://commons.wikimedia.org/wiki/Category:Chelmon_rostratus) |
| lionfish | Red lionfish, *Pterois volitans* | 15 in | own | - (separate dorsal spines, fan pectorals) | [270](https://commons.wikimedia.org/wiki/Category:Pterois_volitans) |
| snowflakemoray | Snowflake moray, *Echidna nebulosa* | 20-30 in | own (head-depth ratio left out: 3 % SL is an artifact) | pectoral, pelvic; dorsal-caudal-anal joined | [165](https://commons.wikimedia.org/wiki/Category:Echidna_nebulosa) |
| picasso | Picasso triggerfish, *Rhinecanthus aculeatus* | 12 in | own | pelvic (2nd dorsal -> red) | [64](https://commons.wikimedia.org/wiki/Category:Rhinecanthus_aculeatus) |
| domino | Domino damsel, *Dascyllus trimaculatus* | 5.5 in | own | - | [175](https://commons.wikimedia.org/wiki/Category:Dascyllus_trimaculatus) |

## Batch notes (expected trouble)
- **Reference photos:** the looks were written from each species' standard appearance. Step 2 still has to pick and look at the 1-3 Commons side views and
  record the file names above before review; correct `b11-species-blocks.py` and refill if a photo disagrees.
- **New body plans no build has handled:** black ghost (no dorsal, ribbon anal, tail stalk), snowflake moray (eel, no paired fins; `fish-fin-cut` / pectoral
  steps expect a pectoral), lionfish (separate spines, fan pectorals), green spotted puffer (rounded cross-section). Expect audit or fin-cut failures; record
  "step pending" per PIPELINE rather than inventing a substitute.
- **Pointed snouts are real** for copperband, naso, Picasso and powder blue: judge them against the photos, not against the b6 blunt-snout rule.
- **Sizes:** naso, lionfish, frontosa and moray are big-tank fish; `tl` in species.json should be the aquarium-typical value with FishBase max in `note`.
- Optional extras proposed, not approved: elephantnose, lined seahorse, yellow boxfish, Valentini puffer, maroon clownfish.

## Review log
| fish | built | verdict (Nathan) | note |
|---|---|---|---|
| congotetra | c9e6fc2c | approved 2026-11-27 ("congo tetra looks good") | go-live waits for the catalogue entry (proposed session "b11 catalogue entries") |
| bumblebeegoby | c9e6fc2c | broad head kept 2026-11-27 ("Keep it") | top view follows the sheet's broad goby head (R194 lane: not the width cap) |
| copperband | c9e6fc2c, snout aaae5e4a | snout rebuilt as a tube (method row 75), awaiting his look | |
| blackghost | failed | - | step pending: fish-spec-from-fins has no no-dorsal path |
| denison | c9e6fc2c | not shown yet | no visual_check yet |
