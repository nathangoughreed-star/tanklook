# Batch b13: saltwater first-50 species that b11/b12 did not cover (2026-11-28)

Source: `research/species-backlog-2026-11-28.md` (12 saltwater fish in the first-50 milestone). Steps 1-4 of `PIPELINE.md`.

## The 12: where each stands
| Species | Where | State |
|---|---|---|
| Purple firefish | **b13 (here)** | prompt `prompts/purplefirefish-b13-5row.md`, needs sheet |
| Diamond watchman goby | **b13** | `prompts/diamondwatchman-b13-5row.md`, needs sheet |
| Yellow coris wrasse | **b13** | `prompts/yellowcoris-b13-5row.md`, needs sheet |
| McCosker's flasher wrasse (male) | **b13** | `prompts/mccoskers-b13-5row.md`, needs sheet |
| Lyretail anthias (male) | **b13** | `prompts/lyretailanthias-b13-5row.md`, needs sheet |
| Bicolor blenny | b12 | sheet filed + built (not live); Nathan: "to fix" (8abfe3e6) |
| Purple tang | b12 | prompt only, in the running b12 queue |
| Neon goby | b12 | prompt only, in the running b12 queue |
| Maroon clownfish | b12 | prompt only, in the running b12 queue |
| Powder blue tang | b11 | sheet + build exist |
| Copperband butterflyfish | b11 | sheet + build exist |
| Flame hawkfish | b11 | sheet + build exist |
b11/b12 prompts live on branch `claude/unruffled-pike-9ae74f` (not yet on main).

## Folders / queue
Prompts were filled in the scratchpad, not in `C:/Users/nreed/fish-sheets/<id>-b13-gen/`, because the b12 sheet queue (`--all`) was running and
picks up any folder with `prompt.txt` and no `sheet.webp`. **Before queueing b13:** after the b12 queue ends, create `<id>-b13-gen/` for
purplefirefish, diamondwatchman, yellowcoris, mccoskers, lyretailanthias, copy `research/fish-sheets/prompts/<id>-b13-5row.md` to `prompt.txt`
(strip nothing; it is the filled prompt), and add `species-entry.json` (name, sci, tl in mm). FishShapes JSONs are already written in
`<id>-b13-gen/fishshapes.json` for all but the flasher (not in FishShapes v1: depth 27 % / head depth 18 % / peduncle 12 % are estimates from
FishBase/Seriously Fish shape, check against photo at review).

## Names (WoRMS accepted, checked 2026-11-28)
- *Nemateleotris decora* Randall & Allen 1973; *Valenciennea puellaris* (Tomiyama 1956); *Halichoeres chrysus* Randall 1981;
  *Paracheilinus mccoskeri* Randall & Harmelin-Vivien 1977; *Pseudanthias squamipinnis* (Peters 1855) (FishBase common name "sea goldie").
- **Maroon clownfish:** WoRMS accepts *Amphiprion biaculeatus* (Bloch 1790), AphiaID 1605249; *Premnas biaculeatus* is a synonym. The b12 prompt says
  Premnas; harmless for the sheet, but the species.json row (R143) must use *Amphiprion biaculeatus*.
- Max lengths (FishBase, TL): purple firefish 3.5 in; diamond watchman 7.9 in SL (aquarium ~6 in); yellow coris 4.7 in; flasher 3.1 in; lyretail male 5.9 in.
- Copperband and powder blue tang: warnings on the species row (Nathan 2026-11-28): true size, minimum tank, why they fail.

## Reference photos (step 2): NOT DONE to the method's standard
A helper read Commons file pages only (no image seen; sex/view unverified). Looks above are written from FishBase text and general knowledge, so
**every b13 look is unreviewed until a photo is viewed**: do that at the visual-check step (compare each sheet to photos) and record URLs here.
- purple firefish: https://commons.wikimedia.org/wiki/File:Nemateleotris_decora.jpg
- diamond watchman: https://commons.wikimedia.org/wiki/File:Valenciennea_puellaris.jpg
- yellow coris: https://commons.wikimedia.org/wiki/File:Halichoeres_chrysus-Yellow_Wrasse.jpg
- lyretail male / female: https://commons.wikimedia.org/wiki/File:Pseudanthias_squamipinnis_(Scalefin_anthias)_male.jpg / ..._female.jpg
- McCosker's flasher: no Commons category found; use Seriously Fish / FishBase photos. Check the male's dorsal filament and bar pattern.
- Weakest guesses to check first: purple firefish rear-body violet and tail margin; diamond watchman spot pattern; flasher male colour.

## Notes
- Lyretail and flasher sheets are the **male** look (the display form). Females are a different look (lyretail: orange-gold with violet lines); they wait for the colour-form phase (no colour forms yet).
- Species.json rows and catalogue work go through the C24 onboarding lanes (R143); none of the 12 is in species.json yet.
