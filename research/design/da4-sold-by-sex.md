# DA4 sold-by-sex audit (2026-11-06)

Sex-mix verdicts ("Your mix is short on females", males-fight, "keep 1 male to N females") show only where a species is commonly sold by sex. 36 species have a sex-ratio, males or pair rule; 15 of the ones with a ratio rule lose the verdict (grey tip instead). Source: data/soldSex.ts. Regenerate: `DA4_AUDIT=1 npx vitest run test/da4SoldSex.test.ts`.

| id | species | rule | sold | confidence | basis |
|---|---|---|---|---|---|
| cpd | Celestial pearl danio | 1:2 males-rule | unsexed | sourced | LiveAquaria sells it as a group; eBay lists it unsexed; Aquahuna picks the sex at random |
| cherrybarb | Cherry barb | 1:2 | sexed | sourced | iFISH, Finchville and Tails and Scales sell males only (the red ones); other shops sell a mixed 3-pack |
| boesemani | Boeseman's rainbowfish | 1:2 | unsexed | sourced | sold almost only as drab juveniles; listings say "unsexed juvenile"; Aquatic Arts and iFISH list no sex choice |
| guppy | Guppy | 1:2 | sexed | sourced | male, female, pair and trio listings (PlantedAquaria, Flip Aquatics, Light.fish); males are sold apart because they are the colourful ones |
| platy | Platy | 1:3 | sexed | UNSURE | no male / female split listing found in the 2026-11-06 search; kept as sexed because shops sort livebearers by sex and Nathan kept the livebearer ratio amber (DA3) |
| molly | Black molly | 1:3 | sexed | UNSURE | no male / female split listing found in the 2026-11-06 search; kept as sexed because shops sort livebearers by sex and Nathan kept the livebearer ratio amber (DA3) |
| swordtail | Swordtail | 1:3 | sexed | UNSURE | no male / female split listing found in the 2026-11-06 search; kept as sexed because shops sort livebearers by sex and Nathan kept the livebearer ratio amber (DA3) |
| dwarfgourami | Dwarf gourami |  males-rule | sexed | UNSURE | shops sell mostly males (the colourful ones); no male / female choice found, the existing males rule stays |
| gourami | Pearl gourami | 1:3 | unsexed | UNSURE | pearl gourami listings are often marked "unsexed" (BioAcuatica) and shops say they cannot guarantee sex; males are the showy ones, so some shops sell males |
| gbr | German blue ram |  pair | sexed | UNSURE | sold as pairs or by sex by specialist shops; pet-store fish are often unsexed |
| bolivianram | Bolivian ram |  pair | unsexed | UNSURE | sold as singles or "pairs" of unsexed fish; no confirmed M / F listing found |
| kribensis | Kribensis | 1:1 pair | sexed | sourced | sold as 1 male + 1 female pairs (Dan's Fish, Light.fish, Imperial Tropicals) |
| cockatoo | Cockatoo dwarf cichlid | 1:3 males-rule | sexed | sourced | aquariumfish.com sells pairs and males; Fish Barn sells females alone; schools of 4 for juveniles |
| yellowlab | Yellow lab cichlid | 1:4 | unsexed | sourced | sold as unsexed juveniles (Capital Cichlids sellers, LiveFishDirect "unsexed juvenile" option, Guidarium) |
| peacock | Peacock cichlid | 1:3 | sexed | sourced | LiveFishDirect offers Male / Female / Unsexed; ThatPetPlace and Rockland sell adult males; "assorted" bags are mixed |
| demasoni | Demasoni cichlid | 1:3 | unsexed | UNSURE | no listing found with a sex option; sold as small juveniles that cannot be sexed (the species note says so) |
| kadango | Kadango (red-fin) cichlid | 1:4 | sexed | UNSURE | a peacock-type haplochromine: adult males are the product, but juveniles are common; no listing found either way |
| labeo | Blue-nosed mbuna | 1:4 | unsexed | UNSURE | no listing found with a sex option; mbuna juveniles are sold unsexed |
| auratus | Golden mbuna | 1:6 | unsexed | UNSURE | sold as small juveniles; a breeder lists a 1 male + 1 female pair (ohmy.ca), but the usual lot is unsexed |
| livingstonii | Livingstone's cichlid | 1:4 | unsexed | UNSURE | no listing found with a sex option; sold by size |
| afra | Dogtooth cichlid | 1:6 | unsexed | UNSURE | no listing found with a sex option; mbuna juveniles are sold unsexed |
| angel | Angelfish |  pair | unsexed | sourced | sold as juveniles by size; only "breeding pairs" are sold paired |
| discus | Discus |  pair | unsexed | sourced | sold as juveniles by size; only proven pairs are sold paired, and discus cannot be sexed by eye |
| bristlenose | Bristlenose pleco | 1:3 | sexed | UNSURE | LiveFishDirect offers a sex selection on its bristlenose pages; eBay sells 2 male + 1 female colony packs; many shops sell unsexed juveniles (sexing a 1 in fish is guesswork) |
| peapuffer | Pea puffer | 1:3 | unsexed | UNSURE | sold unsexed; sexing small puffers is hard; no listing found with a sex option |
| cherryshrimp | Cherry shrimp | 1:2 | unsexed | UNSURE | sold by the dozen with no sex choice (the ratio is only a breeding tip) |
| cpo | Orange dwarf crayfish (CPO) | 1:2 | sexed | sourced | Aquatic Arts sells an unsexed single, a guaranteed female and a male / female pair; males and females are easy to tell apart |
| cajundwarf | Cajun dwarf crayfish | 1:2 | sexed | UNSURE | same dwarf-crayfish trade as the CPO (Aquatic Arts-style male / female / pair listings); none found for this one by name |
| ocellaris | Ocellaris clownfish |  pair | unsexed | sourced | sold singly or as a matched pair; all clownfish start male, so the sex is not offered |
| firefish | Firefish goby |  pair | unsexed | sourced | sold singly or as a pair; the sexes look alike |
| banggai | Banggai cardinalfish |  pair | unsexed | sourced | sold singly or as a pair; the sexes look alike |
| watchman | Yellow watchman goby |  pair | unsexed | sourced | sold singly or as a pair; the sexes look alike |
| dartfrog | Dyeing dart frog | 1:1 | unsexed | sourced | captive-bred juveniles are "unsexed unless otherwise noted" (Josh's Frogs, breeders); proven pairs are rare and expensive |
| greenanole | Green anole | 1:3 | unsexed | UNSURE | wild-import green anoles are listed "Sex: Unsexed" (Tails and Scales); pet stores sell them mixed |
| greenanolebrown | Green anole (brown phase) | 1:3 | unsexed | UNSURE | as the green anole |
| brownanole | Brown anole | 1:3 | unsexed | UNSURE | as the green anole |
