# Batch b12: 20 more roster species (sheet queue)

Started 2026-11-28 by lane b11. Nathan: "there should be nothing stopping us from continuing to generate ref sheets. get another queue set up please"; list approved ("Approve all 20"). Request R206.
Steps: `PIPELINE.md`. Same method as b11 (`HANDOFF-batch-b11.md`).

## State
- **Done:** steps 1, 3, 4. Generator `python -I scripts/b12-species-blocks.py` (imports `block()` / `strip_fins()` from `b11-species-blocks.py`),
  `fish-prompt-fill.py` per folder, then `b12-species-blocks.py --finish` (strips absent fins, copies to `prompts/<id>-b12-5row.md`).
  Each `C:/Users/nreed/fish-sheets/<id>-b12-gen/` has `fishshapes.json`, `species.txt`, `prompt.txt`, `species-entry.json` (name, sci, TL for `fish-batch.py`; no catalogue row yet).
- **Sheets running (2026-11-28, terminal tab, worktree copy of sheet-queue).** Group 1 built f86ea63a; `fish-batch.py --batch b12 --group 4 --idle 90` per group.
- **Next (Nathan): sheets.** `python scripts/sheet-queue.py --all` picks exactly these 20 (it skips `*-f1-gen`; every b11 folder has its sheet).
  Use the worktree copy until branch `claude/unruffled-pike-9ae74f` is merged (main's copy would also take the 18 banned f1 folders).
- **Then:** `python -I scripts/fish-batch.py --batch b12 --group 4 --idle 90`, visual check, 4-view review sheet (`fishsheet.mjs`), Nathan's verdicts here.
- **Catalogue:** none of the 20 is in `species.json`; the C24 onboarding lanes (SO1 / SO2, R202 for b11) are the path before go-live.

## The 20
| id | Common / scientific | TL | FishShapes | Absent fins | Notes |
|---|---|---|---|---|---|
| bleedingheart | Bleeding heart tetra, *Hyphessobrycon erythrostigma* | 2.6 in | own | - (adipose) | |
| blackneon | Black neon tetra, *H. herbertaxelrodi* | 1.5 in | own (n=1) | - (adipose) | |
| rosybarb | Rosy barb (male), *Pethia conchonius* | 4 in | own | - | |
| giantdanio | Giant danio, *Devario aequipinnatus* | 4 in | own | - | |
| sailfinmolly | Sailfin molly (male, wild type), *Poecilia latipinna* | 4 in | own | - | gonopodium as the anal fin; row 2 must not keep the sail |
| severum | Severum (wild type), *Heros efasciatus* | 8 in | own | - | |
| greenterror | Green terror (male), *Andinoacara rivulatus* | 8 in | own | - | nuchal hump |
| agassizii | Agassiz's dwarf cichlid (male), *Apistogramma agassizii* | 3 in | own | - | spade tail |
| elephantnose | Elephantnose, *Gnathonemus petersii* | 9 in | own | - | chin trunk: build with the tube-snout outline (`--face`, method row 78) |
| arowana | Silver arowana, *Osteoglossum bicirrhosum* | 24 in | own | - | |
| upsidedowncat | Upside-down catfish, *Synodontis nigriventris* | 3.5 in | proxy *S. nigrita* | - (adipose) | drawn upright |
| dwarfchainloach | Dwarf chain loach, *Ambastaia sidthimunki* | 2 in | proxy *Botia histrionica* | - | check depth vs photo |
| maroonclown | Maroon clownfish, *Premnas biaculeatus* | 6 in | own | - | |
| boxfish | Yellow boxfish (juvenile), *Ostracion cubicus* | 4 in | proxy *O. immaculatus* | pelvic | box body |
| valentini | Valentini puffer, *Canthigaster valentini* | 4 in | own | pelvic | |
| purpletang | Purple tang, *Zebrasoma xanthurum* | 10 in | proxy *Z. flavescens* | - | |
| bicolorblenny | Bicolor blenny, *Ecsenius bicolor* | 4 in | own | - | pectorals spread (rests on them) |
| neongoby | Neon goby, *Elacatinus oceanops* | 2 in | own | - (2nd dorsal) | pelvic disc |
| bluedamsel | Blue damselfish (male), *Chrysiptera cyanea* | 3 in | own | - | |
| melanurus | Melanurus wrasse (male), *Halichoeres melanurus* | 4.5 in | own | - | |

Not in b12 (told Nathan): lined seahorse (upright body), kissing gourami and blood parrot (store forms are colour forms / hybrids). Optional: redo the Denison barb sheet (red stripe ran full length).

## Review log
| fish | built | verdict (Nathan) | note |
|---|---|---|---|
| agassizii | f86ea63a | approved 2026-11-28 ("rest can ship") | go-live needs a catalogue row |
| arowana | f86ea63a, rebuilt | fix 2026-11-28 ("arowana mouth/front needs work"); snout + forward barbels, shown | method row 81; mass 1.45-1.90x |
| bicolorblenny | f86ea63a, rebuilt (row 76) | fix 2026-11-28 ("blenny looks too stretched long"); rebuilt, shown | method row 81 |
| blackneon | f86ea63a | approved 2026-11-28 ("rest can ship") | go-live needs a catalogue row |
| bleedingheart | (group 2) | approved 2026-11-28 ("Approve group 2") | |
| bluedamsel | (group 2) | approved 2026-11-28 ("Approve group 2") | blue very saturated |
| boxfish | (group 2) | approved 2026-11-28 ("Approve group 2") | proxy depth O. immaculatus; mass-soft 1.22-1.60x |
| dwarfchainloach | (group 2), fixed | approved 2026-11-28 ("Approve group 2") | fishshapes.json depth set by hand 23 / 22-26 (FishBase: "elongated"); plan_extra barbels |
