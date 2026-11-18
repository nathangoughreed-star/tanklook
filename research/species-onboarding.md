# Species onboarding checklist (R141, Nathan 2026-11-18)

Every new species goes through this list, in order, before it is committed. It extends `research/species-art-method.md` (the photo and drawing steps, which are step 2 here). `test/species-onboarding.test.ts` fails when a species misses a data piece; old species that predate the list are in `research/species-onboarding-baseline.json`, and that list may only shrink (a species that now passes must be taken off it).

Nathan's emphasis: do the research including pictures, and focus on the species' specific needs, checks and warnings, above all its **social needs and preferences** and its **minimum tank dimensions**.

## 1. Research and sources
- Read at least one species profile that states numbers (Seriously Fish first; FishBase; a hobby care page). Record the URL, the date opened, and the figure it states. Never put a source on a number it does not state.
- Standard length (SL) vs total length: the species `tl` is total length; Seriously Fish gives SL, which we multiply by 1.2 unless a source gives total length. Say so in the provenance rule.
- Males and females: if the sexes differ in size or look, give both (`female` in species.json, a `_f` art plan).
- Look for conflicts between pages (gallons, adult size, "peaceful" vs "aggressive"), keep the safer figure, and write the conflict in the provenance `why`.
- Captive colour forms and hybrids: say whether the animal sold is a hobby form and what the wild fish is (origin.json `form: "captive-bred"`).

## 2. Reference photos and the look
Follow `research/species-art-method.md`: two or more real photos per look, one per sex, written look, render beside the photo, record the URLs in `research/screens/<lane>/README.md`. Photos stay in the scratchpad, never in the repo. If the only photo is unusable, say so and get another before sign-off.

## 3. Specific needs (what the animal needs whatever the group count)
Record each of these, or write "none found" in the provenance:
- **Water**: temperature range, pH and GH (`waterchem.ts`, `climatedata.ts`, `care.ts` temp).
- **Diet**: what it eats and whether a plain tank supplies it (wood for the clown pleco, live pods, algae).
- **Substrate**: grain and sharpness (`DWELLER` in `substrateTraits.ts`; sand for sifters).
- **Cover**: caves, wood, dense plants, floating plants, dim light (`care.ts` `cover`, a NEEDS line).
- **Flow and zone**: `flow` and `zone` in `groups.ts`.
- **Lid / jumper**: does the source say it jumps? Then add it to `REQUIRED` in `lidNeed.ts` and a `Lid:` line in `careNeeds.ts`.

## 4. Checks and warnings the app must raise
- Each essential condition goes in `careNeeds.ts` `NEEDS` (kind, severity S1-S3 by rules-spec section 3, wording only, no numbers).
- Adult size warnings: the species `tl` is the adult size, and `care.ts` `minL` (litres) the tank it needs, so a small tank warns (the common pleco is 15 in and 75 gal, though it is sold at 3 in).
- Temperature, pH and GH ranges that disagree with the tank warn through `climatedata.ts` and `waterchem.ts`.
- Anything the engine does not model is still written as a NEEDS line (it shows as "unchecked").

## 5. Social needs and preferences
Write all of these in `groups.ts` (`bands`, `msg`, `sexed`, `max`, `territory`) and `care.ts` (`temper`, `nip`, `prey`, `guard`, `cover`), and the reason in the provenance rule:
- **Group size**: the smallest shoal, the comfortable number, the great number; what happens below it (shy, nippy, stressed).
- **Solitary, pair, or colony**: one male per tank, one pair per N inches of tank length, a colony with a sex ratio.
- **Sex ratio**: males harassing females (livebearers: several females per male), `sexed.ratio`.
- **Aggression**: toward its own kind, toward other species, while breeding (convict, firemouth, acara pairs).
- **Fin nippers and fin-nipping victims**: `nip` and the long-finned fish it should not share with (yoyo loach vs bettas and guppies).
- **Predation by adult size**: what it eats once grown (`prey`); what eats it (pleco / cichlid vs small tetras, neon and glowlight tetras next to a convict).
- **Tankmate guidance**: peaceful community fish it suits, and the ones it does not.

## 6. Minimum tank DIMENSIONS, not only gallons
- Take the length and width the source gives (Seriously Fish gives the base, e.g. 90 x 30 cm) and put them in `tankmin.json` as `red` `L` and `W` (mm), `from: "footprint"`, with the URL and the stated wording in `states`.
- `vol.gal` is the volume the same page gives; `care.ts` `minL` is that volume in litres. If a page gives gallons only, derive the footprint from the standard tank for that volume (`ref` g20l, g75) and mark it `derived (est)`.
- `groups.ts` `minLengthMm` is the shortest tank length the group needs, and it must not be shorter than the footprint `L`.
- Pair and territorial species also need a `territory` rule (inches of tank length per pair).

## 7. Every data touch point (the test checks these)
| Piece | File |
|---|---|
| species row (sci, tl, art, zone, level, female) | `src/data/species.json` |
| art plan(s), male and female | `src/art/fishgen.ts` |
| care, temp, minL (litres) | `src/data/care.ts` |
| tank minimum footprint and volume | `src/data/tankmin.json` |
| group bands, social, minLengthMm | `src/data/groups.ts` |
| pH and GH | `src/data/waterchem.ts` |
| climate range | `src/data/climatedata.ts` |
| origin | `src/data/origin.json` |
| body mass and body volume | `src/data/bodymass.json`, `bodyvolume.json`, `scripts/lw-sources.json` |
| behaviour tables (pec, style, habit, grain, benthic) | `src/scene/fishBehavior.ts` |
| space factor | `src/data/spacefactor.ts` |
| substrate rule (bottom dwellers) | `src/data/substrateTraits.ts` |
| needs and warnings | `src/data/careNeeds.ts` |
| AqAdvisor id (a stand-in is allowed, flagged `standIn`) | `src/data/aqadvisor.json` |
| demand / cost item | `src/data/demand-items.json` |
| baked gallery picture, every look | `public/gallery/<look>.webp` (`node scripts/bake-gallery.mjs`) |
| model version record, every look | `src/data/model-versions.json` (`node scripts/export-sheets.mjs --record --only=<looks>`) |
| provenance rules for every number | `src/data/provenance.ts` (the sources ratchet) |
| forms, if sold in colours | `src/data/forms.json`, `src/art/forms.ts` |

## 8. Commit
`npx tsc --noEmit`, `npm run build`, `npx vitest run test/species-onboarding.test.ts test/sources.test.ts` plus the species / picker / groups / origin tests. List what the species still lacks in the commit message and the lane README.

## The test
`test/species-onboarding.test.ts` runs one check per row of section 7 for every aquatic species. A check that a species fails must be in `research/species-onboarding-baseline.json`; a species on the baseline that now passes must be removed (`GEN_ONBOARDING=1 npx vitest run test/species-onboarding.test.ts` rewrites it, and may only shrink it).
