# Notes to read: chatgpt high 2 (ai), build cba9d609

59 tanks with a note. Read each one as research/calib/v4/note-reading.md says, and fill its entry in `v4-<expert>.notes.json` beside the answers.

## A01 (chatgpt high 2)

**Tank:** 5 gal, 16 x 8 x 10 in, fresh, 26 °C. **Stock:** 1 Betta (male), 65 mm.

**Asked:** verdict, change, min, confidence; big enough / smallest for Betta: 2.5 gal (12 x 6 x 8 in) | 5 gal (16 x 8 x 10 in) | 10 gal (20 x 10 x 12 in) | 20 gal long (30 x 12 x 12 in). **Tests:** tankmin.betta, space.nano.

**The app today:** caution (tankmin yellow: betta); space 28 % (water 28, floor 0).

**Answers:** `{"verdict":"ideal","change":"nothing","bigEnough":"yes","smallest":"5 gal (16 x 8 x 10 in)","confidence":"high"}`

**Note:**

> Optional note: Five gallons is a reasonable minimum for a single male betta, assuming adequate filtration, heating, and appropriate furnishings. The 16-inch horizontal length and shallow water column are favorable. A larger tank provides more room, but isn't necessary for acceptable long-term welfare.
>
> This matches the common 5-gallon minimum recommended by Aquarium Co-Op and the betta-keeping community. 
>
> Aquarium Co-Op
>
> +1
>
> Calibration distinction: I interpret Ideal as a healthy, appropriate long-term setup—not necessarily the largest or most enriching possible enclosure. Under that definition, this qualifies.

## A03 (chatgpt high 2)

**Tank:** 10 gal, 20 x 10 x 12 in, fresh, 25 °C. **Stock:** 8 Guppy (2 males, 6 females) (counted), 38 mm; 6 Cherry shrimp, 30 mm; 1 Nerite snail, 32 mm.

**Asked:** verdict, change, counts, compat, confidence. **Tests:** space.livebearer-nano, compat.prey-shrimp, groups.sexed.

**The app today:** problems (space 131 %; group too small: cherryshrimp); space 131 % (water 131, floor 9).

**Answers:** `{"verdict":"caution","changeSp":["guppy"],"change":"fewer","together":"caution","reasons":["eat"],"problem":["cherryshrimp"],"ideal":4,"limit":6,"confidence":"medium"}`

**Note:**

> Optional note: Eight adult guppies, especially six large females, make this 20-inch tank crowded for active swimming. Four (1M/3F) would be comfortably stocked; six is a reasonable upper limit with good care. The shrimp and nerite add little spatial pressure. Adults are generally compatible, although guppies will prey on shrimplets. Mixed-sex guppies will also reproduce, requiring population control in practice. Water hardness should suit all three species.
>
> Calibration distinction: This is yellow, not red. The adult population can remain healthy under the stated assumptions, but eight guppies exceed what I'd consider comfortable stocking. Aquarium Co-Op also identifies six fancy guppies as a viable 10-gallon stocking option.

## A04 (chatgpt high 2)

**Tank:** 20 gal long, 30 x 12 x 12 in, fresh, 24 °C. **Stock:** 10 Neon tetra (counted), 38 mm; 6 Bronze corydoras (counted, bottom), 65 mm; 1 Bristlenose pleco, 125 mm.

**Asked:** verdict, change, counts, confidence. **Tests:** space.water, space.floor, space.canonical-20.

**The app today:** problems (space 101 %); space 101 % (water 101, floor 81).

**Answers:** `{"verdict":"caution","changeSp":["bristlenose"],"change":"drop","ideal":10,"limit":15,"mateIdeal":6,"mateLimit":8,"confidence":"medium"}`

**Note:**

> Optional note: The neon school is appropriately sized, and six bronze corydoras form a suitable social group. The concern is the fully grown 5-inch bristlenose sharing a 30 × 12-inch footprint with six relatively large corydoras. This is near the lower acceptable enclosure size for the pleco, and territorial displacement may occur. The arrangement can work, but removing the pleco or upgrading to a larger tank would provide better long-term spatial margins. Hobbyist experiences with this combination vary substantially. 
>
> Reddit
>
> +2
>
> Calibration distinction: Yellow, but closer to green than red. I wouldn't expect chronic problems in a well-managed aquarium with compatible individuals. The concern is limited bottom-area margin, not the number of neon tetras or overall filtration capacity.

## A05 (chatgpt high 2)

**Tank:** 20 gal high, 24 x 12 x 16 in, fresh, 24 °C. **Stock:** 10 Neon tetra (counted), 38 mm; 6 Bronze corydoras (counted, bottom), 65 mm; 1 Bristlenose pleco, 125 mm.

**Asked:** verdict, counts, confidence. **Tests:** space.footprint-vs-height.

**The app today:** too-small (tankmin red: bronzecory); the rest problems (space 119 %); space 119 % (water 119, floor 101).

**Answers:** `{"verdict":"caution","ideal":10,"limit":12,"mateIdeal":6,"mateLimit":7,"confidence":"medium"}`

**Note:**

> Optional note: Compared with the 20-gallon long, this tank has 20% less floor area despite similar volume. Six adult bronze corydoras sharing a 24 × 12-inch bottom with a mature bristlenose pleco is the main concern. Ten neon tetras remain reasonable, but the shorter swimming length reduces their margin as well. The setup is workable with appropriate shelter and compatible individuals, although a 20-gallon long or larger would be preferable.
>
> Calibration distinction: Still yellow, but noticeably closer to red than the preceding 20-gallon long. The difference is driven primarily by reduced horizontal space and bottom-dweller crowding, not waste production. The numerical limits are approximate rather than sharp biological thresholds.

## A06 (chatgpt high 2)

**Tank:** 29 gal, 30 x 12 x 18 in, fresh, 25 °C. **Stock:** 12 Harlequin rasbora (counted), 50 mm; 8 Panda corydoras, 46 mm; 1 Dwarf gourami (male), 80 mm; 3 Amano shrimp, 51 mm; 2 Nerite snail, 32 mm.

**Asked:** verdict, change, counts, compat, confidence. **Tests:** space.community-29, compat.temperature-narrow.

**The app today:** unworkable (compat high); space 78 % (water 78, floor 49); compat high: Harlequin rasbora with Nerite snail (zebra): water chemistry: pH 5.0-7.0 against its 7.0-8.5 (Nerite snail (zebra)).

**Answers:** `{"verdict":"ideal","change":"nothing","together":"yes","ideal":12,"limit":18,"confidence":"high"}`

**Note:**

> Optional note: Well-balanced community with appropriately sized schools, distinct habitat use, and no substantial spatial conflicts. Twelve harlequins provide a strong school without overwhelming the swimming area. Eight panda corydoras comfortably occupy the bottom, while the single dwarf gourami provides a centerpiece. Adult Amano shrimp and nerites are compatible. At 25°C, panda corydoras are at the upper end of their recommended temperature range; 24°C would provide slightly more margin. Individual dwarf gourami temperament remains a consideration. 
>
> Seriously Fish
>
> +2
>
> Calibration distinction: Solid green. This is close to what I'd consider a well-stocked, attractive 29-gallon community aquarium. The 18-rasbora maximum is an approximate upper boundary, not the preferred stocking target.

## A07 (chatgpt high 2)

**Tank:** 29 gal, 30 x 12 x 18 in, fresh, 25 °C. **Stock:** 8 Tiger barb, 70 mm; 1 Betta (male), 65 mm.

**Asked:** verdict, change, compat, confidence. **Tests:** compat.nip-vs-fins.

**The app today:** unworkable (compat high); space 69 % (water 69, floor 0); compat high: Tiger barb with Betta: would harass its long fins.

**Answers:** `{"verdict":"problems","changeSp":["betta"],"change":"drop","together":"no","reasons":["nip"],"confidence":"high"}`

**Note:**

> Optional note: Tiger barbs are active, persistent fin nippers, making them poor companions for slower, long-finned male bettas. A group of eight reduces aggression among the barbs but does not reliably prevent harassment of the betta. The 29-gallon tank provides reasonable space for the tiger barbs themselves; the problem is behavioral incompatibility, not stocking density. Removing the betta would make this a substantially better arrangement. 
>
> Aquarium Co-Op
>
> Calibration distinction: This is a clear behavioral failure that additional filtration or water changes cannot resolve. I selected Problems likely rather than Not workable because individual fish may coexist temporarily, but I would not recommend the combination for long-term housing.

## A08 (chatgpt high 2)

**Tank:** 40 gal breeder, 36 x 18 x 16 in, fresh, 26 °C. **Stock:** 2 Angelfish [a bonded pair], 150 mm; 15 Rummy-nose tetra (counted), 50 mm; 10 Sterba's corydoras, 65 mm; 2 Bristlenose pleco (1 male, 1 female), 125 mm.

**Asked:** verdict, change, counts, min, compat, confidence; big enough / smallest for Angelfish: 29 gal (30 x 12 x 18 in) | 40 gal breeder (36 x 18 x 16 in) | 55 gal (48 x 13 x 21 in) | 75 gal (48 x 18 x 21 in). **Tests:** tankmin.angel-height, compat.breeding-pair-floor, compat.prey-size.

**The app today:** problems (space 122 %); space 122 % (water 122, floor 77); compat concern: Angelfish breeding pair defends much of this floor (648 sq in): tankmates need caves and sight breaks elsewhere.

**Answers:** `{"verdict":"caution","change":"bigger","together":"caution","reasons":["aggression"],"problem":["angel","bristlenose"],"ideal":15,"limit":20,"bigEnough":"yes","smallest":"55 gal (48 x 13 x 21 in)","confidence":"medium"}`

**Note:**

> Optional note: This is a fairly heavily occupied community, but the main limitation is the 16-inch tank height for fully grown angelfish. Adult angelfish can exceed 8 inches in total vertical height, and a 20-inch-tall aquarium is preferable. A bonded pair may also defend spawning territory aggressively. Two adult bristlenose plecos add potential territorial conflict at the bottom, although the 18-inch tank width helps. The rummy-nose and Sterba's corydoras groups are appropriately sized. A 55-gallon would address the height and swimming-length concerns, while a 75-gallon would be substantially more comfortable. 
>
> Seriously Fish
>
> +1
>
> Calibration distinction: Upper yellow. This could remain functional long term, but it has limited behavioral and spatial margins. I would not classify it as red solely because of the number of fish.

## A09 (chatgpt high 2)

**Tank:** 55 gal, 48 x 13 x 21 in, fresh, 26 °C. **Stock:** 2 Angelfish [a bonded pair], 150 mm; 12 Neon tetra, 38 mm; 8 Bronze corydoras, 65 mm.

**Asked:** verdict, change, compat, confidence. **Tests:** compat.prey-size.

**The app today:** too-small (tankmin red: angel); the rest unworkable (temperature none); space 74 % (water 74, floor 49); compat concern: Angelfish breeding pair defends much of this floor (624 sq in): tankmates need caves and sight breaks elsewhere.

**Answers:** `{"verdict":"problems","changeSp":["neon"],"change":"drop","together":"no","reasons":["eat"],"problem":["angel","neon"],"confidence":"high"}`

**Note:**

> Optional note: The 55-gallon dimensions are appropriate for a bonded pair of adult angelfish, and eight bronze corydoras are a suitable bottom-dwelling group. The primary problem is predation: fully grown angelfish can swallow adult neon tetras. Some individuals coexist peacefully, particularly when raised together, but this is not a reliably safe long-term pairing. At 26°C, the water is also somewhat warm for neons. Replacing them with larger-bodied, peaceful schooling fish would substantially improve compatibility. 
>
> Aquario
>
> +2
>
> Calibration distinction: Red despite having ample tank volume and otherwise modest stocking. This is a species-compatibility failure rather than an overcrowding problem. A larger aquarium would not reliably eliminate the predation risk.

## A10 (chatgpt high 2)

**Tank:** 55 gal, 48 x 13 x 21 in, fresh, 25 °C. **Stock:** 20 Neon tetra (counted), 38 mm; 10 Cardinal tetra, 45 mm; 8 Rummy-nose tetra, 50 mm; 12 Bronze corydoras (counted, bottom), 65 mm; 6 Otocinclus, 33 mm; 1 Bristlenose pleco, 125 mm; 2 Pearl gourami (1 male, 1 female), 120 mm.

**Asked:** verdict, change, counts, confidence. **Tests:** space.school-curve, space.full-community.

**The app today:** unworkable (temperature single); space 118 % (water 118, floor 87).

**Answers:** `{"verdict":"caution","changeSp":["neon"],"change":"fewer","ideal":12,"limit":20,"mateIdeal":8,"mateLimit":12,"confidence":"medium"}`

**Note:**

> Optional note: Heavily stocked but generally compatible community. The 48-inch swimming length accommodates the three tetra schools, although 38 midwater tetras create substantial activity alongside two adult pearl gouramis. Twelve bronze corydoras plus a bristlenose also make for a busy 13-inch-wide bottom. The otocinclus are appropriately grouped. Reducing the neons to approximately 12 would improve swimming space without compromising schooling behavior. Pearl gourami territorial behavior during breeding is a secondary concern. 
>
> Seriously Fish
>
> Calibration distinction: Upper yellow, approaching the stocking limit I'd recommend for this community. No individual species is fundamentally unsuitable, and serious long-term problems aren't inevitable. The primary issue is cumulative crowding across several otherwise reasonable groups.
>
> The numerical limits are approximate judgments, not sharp biological thresholds.

## A11 (chatgpt high 2)

**Tank:** 75 gal, 48 x 18 x 21 in, fresh, 26 °C. **Stock:** 8 Boeseman's rainbowfish (3 males, 5 females) (counted), 108 mm; 12 Cherry barb (4 males, 8 females), 55 mm; 10 Kuhli loach (counted, bottom), 100 mm; 4 Siamese algae eater, 150 mm.

**Asked:** verdict, change, counts, confidence. **Tests:** space.mid-class, space.kuhli-floor-factor, groups.sae.

**The app today:** unworkable (compat high; temperature single); space 113 % (water 113, floor 54); compat high: Boeseman's rainbowfish with Kuhli loach: water hardness: GH 9-19 against its 1-10.

**Answers:** `{"verdict":"caution","change":"bigger","ideal":8,"limit":10,"mateIdeal":10,"mateLimit":14,"confidence":"medium"}`

**Note:**

> Optional note: The rainbowfish group and sex ratio are appropriate, as are the cherry barb and kuhli loach groups. The main concern is four mature 6-inch Siamese algae eaters sharing a 48-inch tank with eight highly active rainbowfish. Siamese algae eaters are strong swimmers, can become competitive with maturity, and benefit from more horizontal space. A 60-inch or longer tank would be preferable. Water chemistry is another consideration: Boesemani rainbowfish favor harder, more alkaline water than kuhli loaches generally prefer. 
>
> Seriously Fish
>
> +2
>
> Calibration distinction: Upper yellow. The aquarium has adequate overall volume, and the species are not inherently aggressive toward one another. However, adult swimming-space demands and differing water preferences prevent an Ideal rating. The suggested numerical limits assume the other populations remain unchanged; they do not resolve the Siamese algae eater concern.

## A12 (chatgpt high 2)

**Tank:** 20 gal long, 30 x 12 x 12 in, fresh, 20 °C, unheated room-temperature tank. **Stock:** 12 Zebra danio (counted), 50 mm; 8 White cloud mountain minnow, 40 mm.

**Asked:** verdict, change, counts, confidence. **Tests:** space.coolwater, compat.nip-no-target.

**The app today:** caution (space 99 %; tankmin yellow: danio; temperature narrow); space 99 % (water 99, floor 0). Not modelled: setting: unheated room-temperature tank.

**Answers:** `{"verdict":"caution","change":"bigger","ideal":8,"limit":12,"confidence":"medium"}`

**Note:**

> Optional note: Both species are compatible at 20°C, and their social groups are appropriately sized. The concern is swimming space. Zebra danios are exceptionally active, and 12 adults sharing a 30-inch tank with eight similarly active minnows is crowded. A 36-inch or longer aquarium would be preferable. Reducing the danios to eight would help, but increasing swimming length is the better solution. Seriously Fish recommends a minimum 36 × 12-inch footprint for zebra danios. 
>
> Seriously Fish
>
> Calibration distinction: Yellow, primarily because of activity density rather than bioload or incompatibility. The existing 12 danios are at my approximate upper limit for this particular arrangement. The 8-fish ideal is a compromise within the existing footprint, not an assertion that eight danios in 30 inches is optimal.

## A13 (chatgpt high 2)

**Tank:** 10 gal, 20 x 10 x 12 in, fresh, 24 °C. **Stock:** 20 Neon tetra (counted), 38 mm.

**Asked:** verdict, change, counts, confidence. **Tests:** space.water-small, space.school-curve.

**The app today:** problems (space 142 %); space 142 % (water 142, floor 0).

**Answers:** `{"verdict":"problems","change":"bigger","ideal":8,"limit":10,"confidence":"medium"}`

**Note:**

> Optional note: Twenty adult neon tetras are substantially overcrowded in a 20 × 10-inch footprint, even with excellent filtration and water quality. Their schooling and swimming behavior requires more horizontal space. Eight is a reasonable target for a species-only 10-gallon under more permissive husbandry guidance, with ten as my approximate upper limit. A 20-gallon long would be considerably better for a school of twenty.
>
> Calibration distinction: Red due to spatial crowding rather than bioload. The 10-gallon recommendation is somewhat contested: Aquarium Co-Op supports 6–8 neons in a 10-gallon, while Seriously Fish recommends a minimum 24 × 12-inch footprint. 
>
> Aquarium Co-Op
>
> +1
>
>  The numerical answers reflect the more permissive interpretation; I'd prefer the larger footprint for optimal welfare.

## A14 (chatgpt high 2)

**Tank:** 29 gal, 30 x 12 x 18 in, fresh, 26 °C. **Stock:** 1 Betta (male), 65 mm; 10 Ember tetra (counted), 23 mm; 8 Pygmy corydoras, 25 mm; 6 Kuhli loach, 100 mm.

**Asked:** verdict, change, compat, counts, confidence. **Tests:** compat.betta-community, space.tiny-class.

**The app today:** caution (space 85 %; tankmin yellow: kuhli; temperature narrow); space 85 % (water 85, floor 36).

**Answers:** `{"verdict":"ideal","change":"nothing","together":"yes","ideal":12,"limit":20,"confidence":"medium"}`

**Note:**

> Optional note: Well-balanced planted community with adequate schooling groups and complementary habitat use. Ten ember tetras are already a good group; twelve would be my preferred target, and approximately twenty is a reasonable upper limit with the other inhabitants unchanged. Pygmy corydoras occupy both the bottom and lower water column, while kuhli loaches primarily use the substrate and cover. The 26°C temperature is near the warm end for pygmy corydoras but acceptable. Betta temperament introduces some uncertainty, although the tank provides sufficient room for separation.
>
> Calibration distinction: Solid green. All four species have appropriate space, group sizes, and broadly compatible environmental requirements. The possibility of an unusually aggressive betta doesn't, by itself, justify downgrading an otherwise appropriate community to yellow.

## A15 (chatgpt high 2)

**Tank:** 20 gal long, 30 x 12 x 12 in, fresh, 25 °C. **Stock:** 3 Honey gourami (1 male, 2 females), 60 mm; 12 Chili rasbora (counted), 23 mm; 15 Cherry shrimp, 30 mm.

**Asked:** verdict, change, counts, compat, confidence. **Tests:** space.chili-refit, compat.prey-shrimp, space.invert-class.

**The app today:** caution (space 92 %; temperature narrow); space 92 % (water 92, floor 8).

**Answers:** `{"verdict":"caution","changeSp":["honeygourami"],"change":"fewer","together":"caution","reasons":["aggression"],"problem":["honeygourami"],"ideal":15,"limit":20,"confidence":"medium"}`

**Note:**

> Optional note: The chili rasbora school is appropriately sized, and the overall stocking density is reasonable. The main uncertainty is the honey gourami trio: a breeding male can become territorial and harass females, even with a 1M/2F ratio. Keeping one honey gourami would be more predictable. Adult cherry shrimp can coexist, but juvenile shrimp are vulnerable to predation. The planted 30-inch tank provides useful separation, although individual temperament remains important. 
>
> Reddit
>
> +2
>
> Calibration distinction: Lower yellow, close to green. This is not overcrowded, and all three species can coexist successfully. The caution reflects the possibility of breeding-related territorial behavior, rather than insufficient tank capacity.

## A16 (chatgpt high 2)

**Tank:** 40 gal breeder, 36 x 18 x 16 in, fresh, 25 °C. **Stock:** 6 Platy (2 males, 4 females) (counted), 40 mm; 6 Black molly (2 males, 4 females), 85 mm; 5 Swordtail (1 male, 4 females), 110 mm; 8 Bronze corydoras (counted, bottom), 65 mm.

**Asked:** verdict, change, counts, confidence. **Tests:** space.livebearers, groups.sexed, space.swordtail-refit.

**The app today:** problems (space 102 %); space 102 % (water 102, floor 47).

**Answers:** `{"verdict":"caution","change":"bigger","ideal":4,"limit":6,"mateIdeal":8,"mateLimit":10,"confidence":"medium"}`

**Note:**

> Optional note: Seventeen adult livebearers, including six large mollies and five swordtails, create substantial swimming-space competition in a 36-inch tank. Swordtails are the primary limitation; a 48-inch or longer aquarium would better accommodate their activity. The eight bronze corydoras are appropriately grouped, and the 18-inch tank depth provides adequate foraging space. The sex ratios are reasonable, and all species can coexist in sufficiently hard, alkaline freshwater, although bronze corydoras generally prefer less alkaline conditions than mollies. 
>
> Seriously Fish
>
> +1
>
> Calibration distinction: Upper yellow, approaching red. The bottom population is reasonable; the primary problem is crowding among three relatively active livebearer species. Removing the swordtails would substantially improve this arrangement without requiring a larger tank.

## B01 (chatgpt high 2)

**Tank:** 55 gal, 48 x 13 x 21 in, fresh, 25 °C. **Stock:** 1 Oscar, 300 mm.

**Asked:** verdict, change, min, confidence; big enough / smallest for Oscar: 55 gal (48 x 13 x 21 in) | 75 gal (48 x 18 x 21 in) | 125 gal (72 x 18 x 21 in) | 180 gal (72 x 24 x 24 in). **Tests:** tankmin.oscar.

**The app today:** too-small (tankmin red: oscar); the rest ideal; space 43 % (water 43, floor 15).

**Answers:** `{"verdict":"unworkable","change":"bigger","bigEnough":"no","smallest":"75 gal (48 x 18 x 21 in)","confidence":"high"}`

**Note:**

> Optional note: A 12-inch Oscar in a tank only 13 inches front-to-back has severely restricted turning and maneuvering space. The 48-inch length is also limiting. A 75-gallon tank is a commonly accepted minimum for one adult, although 125 gallons or larger is preferable for comfortable long-term housing. Excellent filtration cannot compensate for inadequate physical dimensions. 
>
> Aquarium Co-Op
>
> +1
>
> Calibration distinction: This crosses from Problems likely into Not workable because the enclosure's physical dimensions are fundamentally unsuitable for the adult fish. The 75-gallon recommendation is a lower acceptable boundary, not an optimal target.

## B02 (chatgpt high 2)

**Tank:** 125 gal, 72 x 18 x 21 in, fresh, 26 °C. **Stock:** 1 Oscar, 300 mm; 5 Clown loach [adults, about 23 cm] (counted), 230 mm; 1 Bristlenose pleco, 125 mm.

**Asked:** verdict, change, counts, compat, confidence. **Tests:** space.big-class, tankmin.clownloach, compat.prey-size.

**The app today:** too-small (tankmin red: oscar); the rest problems (space 107 %); space 107 % (water 107, floor 50). Not modelled: clownloach: adults, about 23 cm.

**Answers:** `{"verdict":"problems","change":"bigger","together":"caution","reasons":["aggression","other"],"problem":["oscar","clownloach"],"countStatus":"no-valid-count","confidence":"high"}`

**Note:**

> Optional note: The 72-inch length is good, but the 18-inch width becomes restrictive for five mature 9-inch clown loaches sharing space with a 12-inch Oscar. Clown loaches require groups of at least five, so reducing their number isn't a satisfactory solution. Seriously Fish recommends a minimum 72 × 24-inch footprint for a group. The Oscar and bristlenose introduce additional competition for space and potential behavioral conflicts. A 180-gallon (72 × 24 × 24-inch) or larger aquarium would be substantially more appropriate. 
>
> Seriously Fish
>
> Calibration distinction: Red primarily because of the combined spatial demands of large adult fish, not an inherent incompatibility between the species. The Oscar itself is appropriately housed in a 125-gallon tank. The clown loaches are the limiting factor, and reducing their group below five would create a separate welfare problem.

## B03 (chatgpt high 2)

**Tank:** 10 gal, 20 x 10 x 12 in, fresh, 21 °C, unheated. **Stock:** 1 Fancy goldfish, 203 mm.

**Asked:** verdict, change, min, confidence; big enough / smallest for Fancy goldfish: 10 gal (20 x 10 x 12 in) | 20 gal high (24 x 12 x 16 in) | 29 gal (30 x 12 x 18 in) | 40 gal breeder (36 x 18 x 16 in). **Tests:** tankmin.goldfish.

**The app today:** too-small (tankmin red: goldfish); the rest problems (space 103 %; group too small: goldfish); space 103 % (water 103, floor 23). Not modelled: setting: unheated.

**Answers:** `{"verdict":"unworkable","change":"bigger","bigEnough":"no","smallest":"29 gal (30 x 12 x 18 in)","confidence":"high"}`

**Note:**

> Optional note: An 8-inch adult fancy goldfish has inadequate swimming and turning space in a 20 × 10-inch footprint. Excellent filtration cannot resolve this physical limitation. A 29-gallon is my lower acceptable boundary for one adult, though the 40-gallon breeder is substantially preferable because of its 36 × 18-inch footprint. The 21°C temperature is appropriate. Minimum-size recommendations vary, with Aquarium Co-Op suggesting at least 20 gallons per fancy goldfish. 
>
> Aquarium Co-Op
>
> +1
>
> Calibration distinction: Clear red, specifically Not workable. An adult fish occupying 40% of the tank's length has fundamentally inadequate room to maneuver. The issue persists regardless of water quality.

## B04 (chatgpt high 2)

**Tank:** 40 gal breeder, 36 x 18 x 16 in, fresh, 21 °C, unheated. **Stock:** 3 Fancy goldfish (counted), 203 mm; 6 White cloud mountain minnow, 40 mm.

**Asked:** verdict, change, counts, compat, confidence. **Tests:** space.big-class-mass, compat.coolwater-mates.

**The app today:** caution (space 82 %; temperature narrow); space 82 % (water 82, floor 22). Not modelled: setting: unheated.

**Answers:** `{"verdict":"problems","changeSp":["goldfish"],"change":"fewer","together":"caution","reasons":["eat","other"],"ideal":1,"limit":2,"confidence":"high"}`

**Note:**

> Optional note: Three fully grown 8-inch fancy goldfish are too crowded for comfortable long-term housing in a 36 × 18-inch footprint. One would be comfortable; two are plausible but approaching the spatial limit. White cloud minnows share suitable temperature requirements at 21°C, but mature goldfish can swallow them. Fancy goldfish are slower than common goldfish, so coexistence is possible, but predation remains unpredictable. 
>
> Aquarium Co-Op
>
> +2
>
> Calibration distinction: Red due to cumulative adult crowding and predation risk, not water quality. Reducing the goldfish population improves spatial conditions but doesn't eliminate the risk to the minnows.

## B05 (chatgpt high 2)

**Tank:** 55 gal, 48 x 13 x 21 in, fresh, 29 °C. **Stock:** 6 Discus [adults] (counted), 150 mm.

**Asked:** verdict, change, counts, confidence. **Tests:** golden.discus-85.

**The app today:** caution (space 82 %; tankmin yellow: discus); space 82 % (water 82, floor 0). Not modelled: discus: adults.

**Answers:** `{"verdict":"caution","change":"bigger","limit":6,"ideal":0,"confidence":"medium"}`

**Note:**

> Six adult 15 cm discus represent a workable but cramped group in a standard 55-gallon aquarium. The 48-inch length and 21-inch height are adequate, but the 13-inch front-to-back dimension restricts maneuvering and avoidance between individuals. A 75-gallon (48 × 18-inch footprint) is substantially preferable. Reducing the school below 5–6 risks worsening social dynamics, so there is no count I would call truly ideal in this footprint. Six is approximately the upper workable limit under the stipulated excellent care. The 29°C temperature is appropriate. 
>
> Aquarium Co-Op
>
> +2
>
> Calibration note: The ideal count of zero is deliberate. It means no socially appropriate group achieves my preferred comfort standard in this aquarium. The problem is better addressed by increasing tank width than reducing the school size.

## B06 (chatgpt high 2)

**Tank:** 75 gal, 48 x 18 x 21 in, fresh, 29 °C. **Stock:** 6 Discus [adults] (counted), 150 mm; 15 Cardinal tetra, 45 mm; 8 Sterba's corydoras (counted, bottom), 65 mm.

**Asked:** verdict, change, counts, compat, confidence. **Tests:** space.discus-community, compat.temperature-warm.

**The app today:** unworkable (temperature outside); space 102 % (water 102, floor 35). Not modelled: discus: adults.

**Answers:** `{"verdict":"caution","change":"other","reasons":["temperature"],"together":"caution","problem":["sterbai"],"ideal":6,"limit":7,"mateIdeal":10,"mateLimit":16,"confidence":"medium"}`

**Note:**

> The 48 × 18-inch footprint is adequate for six adult discus, and the 15 cardinals and 8 Sterba's corydoras add relatively little spatial competition. This is a conventional, reasonable discus community rather than a significantly overstocked aquarium. My caution concerns the 29°C temperature: cardinals tolerate it, but it exceeds the commonly cited 24–28°C range for Sterba's corydoras. Lowering to approximately 28°C would provide a better compromise for all three species. At that temperature, I would classify the existing stocking as Ideal, albeit toward the upper end for discus. 
>
> The Fish Collection
>
> +2
>
> Calibration distinction: The Caution verdict is driven by temperature, not physical stocking. Six discus represent a sensible adult group in this footprint; adding one is potentially workable, but eight would push beyond my preferred limit. The corydoras have more numerical expansion room than the discus.

## B07 (chatgpt high 2)

**Tank:** 55 gal, 48 x 13 x 21 in, fresh, 26 °C, hard alkaline water, heavy rockwork. **Stock:** 8 Yellow lab cichlid (2 males, 6 females) (counted), 100 mm; 8 Demasoni cichlid (2 males, 6 females), 70 mm.

**Asked:** verdict, change, counts, max, compat, confidence; most Demasoni cichlid: 0 | 4 | 6 | 8 | 12 | 16+. **Tests:** space.mbuna-convention, tankmin.demasoni-width, groups.demasoni.

**The app today:** too-small (tankmin red: demasoni); the rest caution (space 85 %; temperature narrow); space 85 % (water 85, floor 46). Not modelled: setting: hard alkaline water, heavy rockwork.

**Answers:** `{"verdict":"caution","change":"ratio","together":"caution","reasons":["aggression"],"limit":10,"max":{"demasoni":"12"},"confidence":"medium"}`

**Note:**

> The water conditions and species pairing are appropriate. Eight yellow labs at 2M:6F is reasonable, but eight demasoni at 2M:6F creates a significant aggression-management risk. Many keepers recommend groups of 12 or more demasoni to disperse aggression, although smaller groups can succeed. Increasing the demasoni group toward 12, maintaining a female majority, or choosing a less aggressive mbuna would improve the setup. The 13-inch tank depth restricts territorial separation. No yellow lab count makes the unchanged demasoni group confidently ideal.
>
> Calibration note
>
> This case exposes a limitation of conventional stocking calculations: adding demasoni can sometimes improve welfare despite increasing physical stocking density.
>
> Sources differ on the minimum group size. Practical Fishkeeping describes successful smaller groups, while other care references recommend 12 or more. That disagreement warrants a Caution verdict rather than automatically classifying eight demasoni as unworkable. 
>
> Practical Fishkeeping
>
> +2
>
> The ideal yellow lab answer is intentionally No count works as described, because the uncertainty comes from the fixed demasoni group, not excessive yellow lab numbers.

## B08 (chatgpt high 2)

**Tank:** 75 gal, 48 x 18 x 21 in, fresh, 26 °C, hard alkaline water. **Stock:** 5 Peacock cichlid (1 male, 4 females) (counted), 118 mm; 6 Yellow lab cichlid (1 male, 5 females), 100 mm; 3 Malawi synodontis, 190 mm.

**Asked:** verdict, change, counts, confidence. **Tests:** space.malawi-mix, groups.syno.

**The app today:** caution (space 95 %; temperature narrow); space 95 % (water 95, floor 46). Not modelled: setting: hard alkaline water.

**Answers:** `{"verdict":"caution","change":"bigger","ideal":4,"limit":6,"confidence":"medium"}`

**Note:**

> This is a plausible but fairly crowded Malawi community. The peacock and yellow lab sex ratios are favorable, and yellow labs are among the mbuna most likely to coexist successfully with peacocks. However, five adult peacocks, six yellow labs, and three 19 cm Synodontis put substantial demands on a 48 × 18-inch footprint. The catfish also require adequate bottom retreats. A 6-foot aquarium would provide meaningfully better territorial separation. Four peacocks (1M, 3F) would be my preferred count with the other animals unchanged; six is approximately the upper workable limit. 
>
> WetWebMedia
>
> +3
>
> Calibration note: This is primarily a spatial and territorial Caution, not a water-chemistry issue. The yellow labs are relatively peaceful for mbuna, but they can still outcompete or harass peacocks. The three large Synodontis are an important contributor to the limited available space. I am assuming the listed Malawi synodontis are Synodontis njassae, consistent with the stated adult length.

## B09 (chatgpt high 2)

**Tank:** 29 gal, 30 x 12 x 18 in, fresh, 25 °C. **Stock:** 8 Neon tetra, 38 mm; 2 Yellow lab cichlid (1 male, 1 female), 100 mm; 6 Bronze corydoras, 65 mm.

**Asked:** verdict, change, compat, confidence. **Tests:** compat.water-chemistry, compat.temper, tankmin.yellowlab, groups.yellowlab-min.

**The app today:** too-small (tankmin red: yellowlab); the rest unworkable (compat high); space 91 % (water 91, floor 77); compat high: Neon tetra with Yellow lab cichlid: water chemistry: pH 5.0-7.0 against its 7.6-8.6 / Neon tetra with Yellow lab cichlid: water hardness: GH 1-10 against its 10-20.

**Answers:** `{"verdict":"unworkable","changeSp":["yellowlab"],"change":"drop","together":"no","reasons":["aggression"],"problem":["yellowlab"],"confidence":"high"}`

**Note:**

> Yellow labs are comparatively peaceful mbuna, but still require substantially more territorial space than a 30 × 12-inch aquarium provides. A 1M:1F pair also creates harassment risk, particularly for the female. Most established husbandry recommendations favor at least a 36–48-inch tank with one male and several females. Their preference for hard, alkaline Malawi water additionally conflicts with the softer-water preferences of neon tetras and bronze corydoras. The small, peaceful tankmates risk harassment or injury. Removing both yellow labs leaves a reasonable 29-gallon community. 
>
> Practical Fishkeeping
>
> +2
>
> Calibration note: This is not a bioload problem. Even with ideal filtration and rockwork, the combination fails due to territorial behavior, social structure, and water chemistry. Increasing the tank size alone would not resolve every incompatibility.

## B10 (chatgpt high 2)

**Tank:** 20 gal long, 30 x 12 x 12 in, fresh, 24 °C, caves provided. **Stock:** 2 Kribensis (1 male, 1 female) [a pair], 110 mm; 8 Neon tetra, 38 mm; 6 Panda corydoras, 46 mm.

**Asked:** verdict, change, compat, max, confidence; most Kribensis: 1 | 2 | 3 | 4 | 6+. **Tests:** compat.breeding-pair-floor, compat.cover-cave, groups.territory-krib.

**The app today:** too-small (tankmin red: kribensis); the rest caution (space 78 %; compat concern; temperature narrow); space 78 % (water 78, floor 61); compat concern: Kribensis breeding pair defends much of this floor (360 sq in): tankmates need caves and sight breaks elsewhere. Not modelled: setting: caves provided.

**Answers:** `{"verdict":"problems","changeSp":["kribensis"],"change":"drop","together":"no","reasons":["aggression"],"problem":["kribensis"],"max":{"kribensis":"2"},"confidence":"high"}`

**Note:**

> A kribensis pair can inhabit a 20-gallon-long aquarium, but combining them with six bottom-foraging panda corydoras is risky. Kribensis become strongly territorial during spawning, and the corydoras will repeatedly enter defended areas while foraging. The 30 × 12-inch footprint offers insufficient separation to reliably protect them. The neon tetras are comparatively suitable tankmates because they occupy the water column. Temperature is acceptable for all three species. I would keep the kribensis pair without other bottom dwellers or remove the pair to retain the peaceful community. 
>
> Seriously Fish
>
> +2
>
> Calibration note: The two kribensis aren't excessive by themselves. The problem is territorial overlap with the panda corydoras, especially during spawning. Since spawning behavior can occur even when offspring aren't counted, the compatibility risk remains.

## B11 (chatgpt high 2)

**Tank:** 20 gal high, 24 x 12 x 16 in, fresh, 28 °C. **Stock:** 2 German blue ram (1 male, 1 female) [a pair], 50 mm; 10 Ember tetra, 23 mm; 10 Cherry shrimp, 30 mm.

**Asked:** verdict, change, compat, confidence. **Tests:** compat.temperature-none, compat.prey-shrimp.

**The app today:** unworkable (compat high; temperature none); space 61 % (water 61, floor 25); compat high: German blue ram with Cherry shrimp: would eat it.

**Answers:** `{"verdict":"caution","changeSp":["cherryshrimp"],"change":"drop","together":"caution","reasons":["eat","temperature"],"problem":["gbr","cherryshrimp"],"confidence":"medium"}`

**Note:**

> The 24 × 12-inch footprint is adequate for an established ram pair, and 10 ember tetras add little spatial pressure. The primary concern is the cherry shrimp. At 30 mm, healthy adults may survive alongside rams, especially with dense cover, but predation remains a significant risk, particularly during molting. The 28°C temperature is appropriate for rams and acceptable for ember tetras, but sits at the upper tolerance limit for cherry shrimp, potentially shortening their lifespan. Removing the shrimp would make this a comfortable, lightly stocked community. 
>
> Seriously Fish
>
> +3
>
> Calibration note: Spatial stocking is firmly Ideal. Caution comes exclusively from shrimp predation risk and temperature suitability, not crowding. I would not classify this as Problems likely solely because the rams might eat shrimp, given that the survey explicitly specifies large adults and adequate cover.

## B12 (chatgpt high 2)

**Tank:** 29 gal, 30 x 12 x 18 in, fresh, 25 °C. **Stock:** 2 Dwarf gourami (male) [both males], 80 mm; 10 Harlequin rasbora, 50 mm; 6 Panda corydoras, 46 mm.

**Asked:** verdict, change, maxMales, compat, confidence; most male Dwarf gourami: 0 | 1 | 2 | 3. **Tests:** groups.males-rule, compat.temperature-narrow.

**The app today:** caution (temperature narrow); space 71 % (water 71, floor 32). Not modelled: dwarfgourami: both males.

**Answers:** `{"verdict":"problems","changeSp":["dwarfgourami"],"change":"fewer","together":"no","reasons":["aggression","nip"],"problem":["dwarfgourami"],"maxMales":{"dwarfgourami":"1"},"confidence":"high"}`

**Note:**

> The tank is comfortably stocked in terms of physical space, but two male dwarf gouramis present a significant territorial aggression risk in a 30-inch aquarium. Dense planting and sight breaks help, but don't reliably prevent one male from dominating or injuring the other. A single male dwarf gourami alongside ten harlequin rasboras and six panda corydoras would make a reasonable community. The 25°C temperature is acceptable, although toward the warm end for panda corydoras. 
>
> Seriously Fish
>
> +1
>
> Calibration note: Problems likely is driven entirely by male-male aggression, not stocking density. Two males can occasionally coexist, but the failure risk is sufficiently high that I wouldn't recommend this arrangement for long-term keeping.

## B13 (chatgpt high 2)

**Tank:** 10 gal, 20 x 10 x 12 in, fresh, 26 °C, densely planted. **Stock:** 3 Pea puffer (1 male, 2 females), 30 mm; 6 Otocinclus, 33 mm.

**Asked:** verdict, change, max, compat, confidence; most Pea puffer: 0 | 1 | 2 | 3 | 4 | 5+. **Tests:** groups.territory-puffer, compat.species-only.

**The app today:** unworkable (compat high); space 105 % (water 105, floor 12); compat high: Pea puffer with Otocinclus: too aggressive for it. Not modelled: setting: densely planted.

**Answers:** `{"verdict":"caution","change":"bigger","together":"caution","reasons":["nip","aggression","food"],"max":{"peapuffer":"3"},"confidence":"medium"}`

**Note:**

> Three pea puffers at a 1M:2F ratio can be maintained in a densely planted 10-gallon aquarium, although this is a relatively tight arrangement. Otocinclus are among the more plausible pea puffer tankmates, but fin-nipping remains possible. The six otos also require dependable grazing and supplemental feeding. A 20-gallon long would provide more territorial separation and grazing surfaces. A species-only puffer aquarium would be more predictable. 
>
> Aquarium Co-Op
>
> +2
>
> Calibration note: I wouldn't automatically classify this combination as unworkable. The favorable sex ratio and dense planting materially improve its prospects. However, three puffers represent my upper limit for this 10-gallon footprint, not an ideal social group size. Specialist guidance increasingly favors larger groups of six or more in larger aquariums.

## B14 (chatgpt high 2)

**Tank:** 40 gal breeder, 36 x 18 x 16 in, fresh, 25 °C. **Stock:** 4 Bolivian ram (2 males, 2 females), 89 mm; 12 Rummy-nose tetra, 50 mm; 8 Sterba's corydoras, 65 mm.

**Asked:** verdict, change, max, confidence; most Bolivian ram: 1 | 2 | 3 | 4 | 6 | 8+. **Tests:** groups.territory-bolivian, compat.breeding-pair-floor.

**The app today:** problems (crowd: 4 Bolivian rams); space 83 % (water 83, floor 75).

**Answers:** `{"verdict":"caution","changeSp":["bolivianram"],"change":"fewer","max":{"bolivianram":"4"},"confidence":"medium"}`

**Note:**

> The 36 × 18-inch footprint provides reasonable space for four Bolivian rams, but two males and two females may form two territorial breeding pairs. Eight Sterba's corydoras continually foraging across the substrate could intrude into those territories, particularly during spawning. Bolivian rams are relatively peaceful cichlids, so this is workable with good sight breaks, but a single established pair would be more predictable. The 12 rummy-nose tetras add little territorial pressure, and 25°C is suitable for all three species. 
>
> Aquarist Atlas
>
> +2
>
> Calibration note: Four Bolivian rams is my upper workable count in this footprint, not an ideal target with other bottom dwellers present. This is a moderate Caution driven by territorial interactions, rather than excessive bioload or insufficient swimming volume.

## B15 (chatgpt high 2)

**Tank:** 20 gal long, 30 x 12 x 12 in, fresh, 24 °C, new tank: cycled six weeks ago, no visible algae yet. **Stock:** 1 Bristlenose pleco, 125 mm; 8 Otocinclus (counted), 33 mm; 6 Amano shrimp, 51 mm.

**Asked:** verdict, change, counts, confidence. **Tests:** limits.food-not-room, groups.grazer-density.

**The app today:** ideal; space 72 % (water 72, floor 30). Not modelled: setting: new tank: cycled six weeks ago, no visible algae yet.

**Answers:** `{"verdict":"problems","change":"notroom","countStatus":"no-valid-count","confidence":"high"}`

**Note:**

> The tank has sufficient physical space for these animals, and the species are generally compatible. However, a six-week-old aquarium without visible algae is unlikely to have a sufficiently established grazing ecosystem for eight otocinclus, particularly alongside a bristlenose pleco and six Amano shrimp. Otocinclus are vulnerable to starvation in immature aquariums and may initially reject supplemental foods. I would postpone introducing them until the tank has matured and reliable feeding is established. Once mature, six to eight otos could be reasonable with deliberate supplemental feeding. 
>
> Aquarium Co-Op
>
> +1
>
> Calibration note: This should trigger a food/maturity warning, not a spatial stocking penalty. Zero is a temporary recommendation based on the aquarium's immaturity, not an assertion that the tank can never support otocinclus. A lack of visible algae doesn't prove a lack of biofilm, but it's an important warning sign in such a young aquarium.

## B16 (chatgpt high 2)

**Tank:** 10 gal, 20 x 10 x 12 in, fresh, 23 °C. **Stock:** 30 Cherry shrimp (counted), 30 mm; 3 Nerite snail, 32 mm; 8 Chili rasbora, 23 mm.

**Asked:** verdict, change, counts, confidence. **Tests:** space.invert-class, compat.fish-in-shrimp-tank.

**The app today:** unworkable (compat high); space 104 % (water 104, floor 39); compat high: Chili rasbora with Nerite snail (zebra): water chemistry: pH 5.0-7.0 against its 7.0-8.5 (Nerite snail (zebra)).

**Answers:** `{"verdict":"caution","changeSp":["nerite"],"change":"fewer","ideal":40,"limit":80,"confidence":"medium"}`

**Note:**

> Optional note: Physical stocking is comfortable. Eight chili rasboras and 30 cherry shrimp are reasonable in a planted 10-gallon. The main concern is supporting three adult nerite snails with adequate grazing food. Reducing to one or two nerites would make the setup more robust. Cherry shrimp can tolerate relatively high densities with adequate supplemental feeding and surfaces.
>
> Calibration note: The caution is primarily a food-availability issue, not a spatial stocking issue. Increasing shrimp numbers should not automatically trigger spatial crowding warnings at the same rate as adding fish. The 40/80 thresholds are approximate and assume reliable supplemental feeding.

## C01 (chatgpt high 2)

**Tank:** 10 gal, 20 x 10 x 12 in, salt, 25 °C, live rock, no corals. **Stock:** 2 Ocellaris clownfish [a bonded pair], 100 mm; 2 Blue-leg hermit crab, 25 mm.

**Asked:** verdict, change, min, confidence; big enough / smallest for Ocellaris clownfish: 10 gal (20 x 10 x 12 in) | 15 gal (24 x 12 x 12 in) | 20 gal (24 x 12 x 16 in) | 29 gal (30 x 12 x 18 in). **Tests:** tankmin.ocellaris, space.salt-load.

**The app today:** too-small (tankmin red: ocellaris); the rest caution (space 82 %); space 82 % (water 82, floor 6). Not modelled: setting: live rock, no corals.

**Answers:** `{"verdict":"problems","change":"bigger","bigEnough":"yes","smallest":"20 gal (24 x 12 x 16 in)","confidence":"medium"}`

**Note:**

> Optional note: A single adult ocellaris can potentially be maintained in a well-designed 10-gallon aquarium, but two adults approaching 4 inches each make the 20 × 10-inch footprint uncomfortably restrictive. A bonded pair is less problematic than two unpaired fish, but still needs room for territorial behavior and movement. A 20-gallon is a defensible minimum for the pair; 29 gallons would be more comfortable. The hermit crabs are not a meaningful constraint. 
>
> coralifeproducts.com
>
> +2
>
> Calibration note: This is a useful test of pair stocking versus individual minimum tank size. A 10-gallon can be marginally acceptable for one ocellaris without being acceptable for two. Pair bonding reduces aggression concerns but does not eliminate space requirements.

## C02 (chatgpt high 2)

**Tank:** 20 gal all-in-one cube, 18 x 18 x 16 in, salt, 25 °C, soft corals, live rock. **Stock:** 2 Ocellaris clownfish [a pair], 100 mm; 1 Royal gramma, 80 mm; 1 Firefish goby, 90 mm; 2 Skunk cleaner shrimp, 60 mm; 5 Blue-leg hermit crab, 25 mm; 3 Mexican turbo snail, 70 mm.

**Asked:** verdict, change, min, compat, confidence; big enough / smallest for Royal gramma: 20 gal cube (18 x 18 x 16 in) | 29 gal (30 x 12 x 18 in) | 40 gal breeder (36 x 18 x 16 in) | 55 gal (48 x 13 x 21 in). **Tests:** space.nano-reef, tankmin.royalgramma.

**The app today:** too-small (tankmin red: royalgramma; tankmin red: firefish; tankmin red: ocellaris); the rest caution (space 99 %; temperature narrow); space 99 % (water 99, floor 46). Not modelled: setting: soft corals, live rock.

**Answers:** `{"verdict":"problems","change":"bigger","together":"caution","reasons":["aggression","food"],"problem":["ocellaris","royalgramma","firefish","turbo"],"bigEnough":"yes","smallest":"40 gal breeder (36 x 18 x 16 in)","confidence":"medium"}`

**Note:**

> Optional note: Four adult reef fish totaling approximately 15 inches in an 18-inch cube create significant territorial crowding. The bonded clownfish pair may defend a substantial portion of the aquarium, while the royal gramma and timid firefish need separate retreats. These species can coexist in a larger aquarium. Three adult Mexican turbo snails also represent considerable grazing demand for a small reef. A 40 breeder provides a substantially better footprint for this community. 
>
> LiveAquaria
>
> +2
>
> Calibration note: This case is limited by the combination of territorial space and adult fish size, not filtration capacity. The 18 × 18-inch footprint is particularly important: 22 gallons in a cube does not provide the same territorial separation as a longer aquarium. The 40 breeder recommendation is for the entire community as stocked, not the royal gramma alone.
>
> The three large turbo snails warrant a separate food-availability caution, even after upgrading, unless supplemental feeding is reliable. 
>
> Reef2Reef
>
> +1

## C03 (chatgpt high 2)

**Tank:** 29 gal all-in-one cube, 18 x 18 x 20 in, salt, 25 °C, LPS corals, live rock. **Stock:** 2 Ocellaris clownfish [a pair], 100 mm; 1 Yellow watchman goby, 120 mm; 1 Six-line wrasse, 100 mm; 1 Skunk cleaner shrimp, 60 mm; 10 Blue-leg hermit crab (counted), 25 mm; 5 Mexican turbo snail, 70 mm.

**Asked:** verdict, change, compat, counts, confidence. **Tests:** compat.prey-sw-inverts, compat.hermits-vs-snails, tankmin.sixline.

**The app today:** too-small (tankmin red: sixline; tankmin red: ocellaris; tankmin red: watchman); the rest unworkable (compat high); space 118 % (water 118, floor 79); compat high: Six-line wrasse with Blue-leg hermit crab: would eat it. Not modelled: setting: LPS corals, live rock.

**Answers:** `{"verdict":"problems","changeSp":["sixline"],"change":"drop","together":"caution","reasons":["aggression","food"],"problem":["turbo","sixline"],"countStatus":"no-valid-count","confidence":"medium"}`

**Note:**

> Optional note: The 18 × 18-inch footprint is restrictive for four adult fish, particularly an active, potentially aggressive six-line wrasse sharing space with a territorial clownfish pair. Five large Mexican turbo snails also present substantial grazing demands. The ten blue-leg hermit crabs are not the primary problem, although competition for food and shells deserves attention. 
>
> LiveAquaria
>
> +1
>
> Calibration note: This has the same 18 × 18-inch footprint as the previous 20-gallon cube. The additional water height does little to improve territorial separation or swimming room. Removing hermit crabs alone would not resolve the problems, so No count works as described is the appropriate survey response.
>
> For separate hermit-crab density calibration, I'd tentatively target 5–8 ideal, 15 at most in a comparable mature 29-gallon reef after correcting the fish and snail issues. Those are low-confidence estimates, not established biological limits.

## C04 (chatgpt high 2)

**Tank:** 40 gal breeder, 36 x 18 x 16 in, salt, 25 °C, LPS and soft corals. **Stock:** 2 Ocellaris clownfish [a pair], 100 mm; 1 Royal gramma, 80 mm; 6 Blue-green chromis (counted), 100 mm; 1 Coral beauty angelfish, 115 mm; 1 Yellow watchman goby, 120 mm; 1 Skunk cleaner shrimp, 60 mm; 10 Blue-leg hermit crab, 25 mm; 5 Mexican turbo snail, 70 mm.

**Asked:** verdict, change, counts, compat, confidence. **Tests:** space.reef-40, compat.coral-nipper, tankmin.coralbeauty, groups.chromis.

**The app today:** too-small (tankmin red: coralbeauty); the rest problems (space 126 %); space 126 % (water 126, floor 47). Not modelled: setting: LPS and soft corals.

**Answers:** `{"verdict":"problems","change":"bigger","together":"caution","reasons":["aggression","food"],"problem":["chromis","coralbeauty","turbo"],"countStatus":"no-valid-count","confidence":"medium"}`

**Note:**

> Optional note: Six adult blue-green chromis require more open swimming space than this 36-inch aquarium provides, especially alongside five other adult fish. Chromis also develop dominance hierarchies that can lead to persistent harassment. The coral beauty is another major constraint: commonly recommended minimums are 50–70 gallons, and it may nip LPS and soft corals. Five large Mexican turbo snails create additional grazing competition. 
>
> The Ornamental Aquatic Trade Association
>
> +3
>
> Calibration note: Even removing every chromis would leave the adult coral beauty in an undersized aquarium, so No count works as described is more appropriate than returning zero. This is an important distinction between an individual species' stocking capacity and the suitability of the fixed community.
>
> Also, reducing six chromis to two or three is not necessarily a safe compromise: smaller groups can concentrate aggression on subordinate individuals. 
>
> CORAL Magazine
>
> +1

## C05 (chatgpt high 2)

**Tank:** 55 gal, 48 x 13 x 21 in, salt, 25 °C, LPS and soft corals. **Stock:** 2 Ocellaris clownfish [a pair], 100 mm; 1 Royal gramma, 80 mm; 6 Blue-green chromis (counted), 100 mm; 1 Coral beauty angelfish, 115 mm; 1 Yellow watchman goby, 120 mm; 1 Skunk cleaner shrimp, 60 mm; 10 Blue-leg hermit crab, 25 mm; 5 Mexican turbo snail, 70 mm.

**Asked:** verdict, counts, confidence. **Tests:** space.salt-scale, tankmin.coralbeauty-width.

**The app today:** too-small (tankmin red: coralbeauty); the rest problems (space 122 %); space 122 % (water 122, floor 49). Not modelled: setting: LPS and soft corals.

**Answers:** `{"verdict":"problems","countStatus":"no-valid-count","confidence":"medium"}`

**Note:**

> Optional note: The 48-inch length is a meaningful improvement over the 40 breeder, making the coral beauty more defensible, although it remains borderline and potentially prone to coral nipping. However, six adult chromis alongside four other adult fish create a crowded community. Chromis are best maintained in groups of approximately five or more, but this aquarium has insufficient spare capacity for a comfortable group. Reducing them to two or three risks concentrating aggression among the remaining fish. 
>
> The Ornamental Aquatic Trade Association
>
> +2
>
> Calibration note: Zero is intentional rather than selecting No count works as described. Without chromis, the remaining four fish are a defensible, though somewhat borderline, 55-gallon community. The problem is that a suitable chromis group would push this particular community beyond a comfortable stocking level, while smaller groups introduce social risks.
>
> The zero thresholds are husbandry judgments, not hard physical limits. A chromis group of five or six in a less heavily occupied 55-gallon aquarium would be a different assessment.

## C06 (chatgpt high 2)

**Tank:** 55 gal, 48 x 13 x 21 in, salt, 25 °C, fish only with live rock. **Stock:** 1 Yellow tang, 200 mm; 2 Ocellaris clownfish [a pair], 100 mm; 6 Blue-green chromis, 100 mm; 1 Firefish goby, 90 mm.

**Asked:** verdict, change, min, confidence; big enough / smallest for Yellow tang: 55 gal (48 x 13 x 21 in) | 75 gal (48 x 18 x 21 in) | 90 gal (48 x 18 x 24 in) | 125 gal (72 x 18 x 21 in). **Tests:** tankmin.yellowtang.

**The app today:** caution (space 91 %; tankmin yellow: yellowtang; temperature narrow); space 91 % (water 91, floor 0). Not modelled: setting: fish only with live rock.

**Answers:** `{"verdict":"unworkable","change":"bigger","bigEnough":"no","smallest":"125 gal (72 x 18 x 21 in)","confidence":"high"}`

**Note:**

> Optional note: An adult 8-inch yellow tang is fundamentally unsuited to the 48 × 13-inch footprint, particularly alongside nine other fish. The narrow front-to-back dimension restricts turning and maneuvering, while the four-foot length provides inadequate sustained swimming space. A six-foot 125-gallon aquarium is a defensible minimum for this community, although larger would be preferable. Adult yellow tang recommendations vary from approximately 100 to 180 gallons, with Biota specifically recommending 125 gallons or more. 
>
> The Biota Group
>
> +2
>
> Calibration note: This is a clear example of a species-specific minimum footprint overriding otherwise reasonable community stocking calculations. Even removing all six chromis would not make this aquarium appropriate for the adult tang. The restriction is primarily swimming geometry, not bioload.

## C07 (chatgpt high 2)

**Tank:** 75 gal, 48 x 18 x 21 in, salt, 25 °C, live rock, soft corals. **Stock:** 1 Yellow tang, 200 mm; 1 Blue tang [juvenile now, judge for the adult], 310 mm; 2 Ocellaris clownfish [a pair], 100 mm; 1 Royal gramma, 80 mm; 5 Blue-green chromis, 100 mm.

**Asked:** verdict, change, compat, min, confidence; big enough / smallest for Blue tang: 75 gal (48 x 18 x 21 in) | 125 gal (72 x 18 x 21 in) | 180 gal (72 x 24 x 24 in) | 240 gal (96 x 24 x 24 in). **Tests:** compat.two-tangs, tankmin.bluetang, groups.chromis-under-min.

**The app today:** too-small (tankmin red: bluetang); the rest unworkable (compat high); space 78 % (water 78, floor 2); compat high: Yellow tang with Blue tang: rivals of its look-alike, keep one tang / Blue tang with Yellow tang: rivals of its look-alike, keep one tang. Not modelled: bluetang: juvenile now, judge for the adult; setting: live rock, soft corals.

**Answers:** `{"verdict":"unworkable","change":"bigger","together":"caution","reasons":["aggression"],"problem":["yellowtang","bluetang","chromis"],"bigEnough":"no","smallest":"240 gal (96 x 24 x 24 in)","confidence":"high"}`

**Note:**

> Optional note: An adult 12-inch blue tang requires substantially more swimming length than this 48-inch aquarium offers. A 180-gallon, six-foot aquarium is a commonly recommended minimum for the species alone. With an adult yellow tang and eight additional fish, I would prefer the eight-foot 240-gallon option. Yellow and blue tangs can coexist, but territorial conflicts remain possible. The chromis also introduce some within-group aggression risk. 
>
> LiveAquaria
>
> +2
>
> Calibration note: This reinforces the distinction between current juvenile size and adult requirements. The blue tang should fail the 75-gallon assessment independently of total stocking density. The 240-gallon recommendation is specific to this entire community; an adult blue tang alone could reasonably be accommodated in a 180-gallon aquarium with suitable dimensions.

## C08 (chatgpt high 2)

**Tank:** 125 gal, 72 x 18 x 21 in, salt, 25 °C, mixed reef, two years old, refugium. **Stock:** 1 Yellow tang, 200 mm; 1 Blue tang, 310 mm; 1 Coral beauty angelfish, 115 mm; 2 Ocellaris clownfish [a pair], 100 mm; 9 Blue-green chromis (counted), 100 mm; 1 Mandarin dragonet, 70 mm; 1 Yellow watchman goby, 120 mm; 2 Skunk cleaner shrimp, 60 mm; 20 Blue-leg hermit crab, 25 mm; 10 Mexican turbo snail, 70 mm.

**Asked:** verdict, change, counts, confidence. **Tests:** space.reef-125, space.salt-scale.

**The app today:** unworkable (compat high); space 91 % (water 91, floor 41); compat high: Yellow tang with Blue tang: rivals of its look-alike, keep one tang / Blue tang with Yellow tang: rivals of its look-alike, keep one tang. Not modelled: setting: mixed reef, two years old, refugium.

**Answers:** `{"verdict":"unworkable","changeSp":["bluetang"],"change":"drop","countStatus":"no-valid-count","confidence":"high"}`

**Note:**

> Optional note: The principal issue is the adult 12.2-inch blue tang in a 72 × 18-inch aquarium, particularly alongside an 8-inch yellow tang. The six-foot length is an improvement over the previous scenarios, but the narrow footprint and extensive community make this unsuitable for comfortable long-term housing. A 180-gallon aquarium is a widely recommended minimum for adult blue tangs. 
>
> Quality Marine
>
> +1
>
>  Nine adult chromis add substantial swimming-space demand, while ten large Mexican turbo snails create significant grazing competition. The mature refugium makes the mandarin considerably more defensible.
>
> Calibration note: No count of chromis resolves the underlying adult blue tang constraint. This is why No count works as described is preferable to zero. Removing the blue tang would substantially change the assessment and make a moderate chromis group potentially reasonable.
>
> A separate concern is the ten turbo snails: food availability should be evaluated independently of fish stocking, since a mature 125-gallon reef may not sustain that many large grazers without supplemental feeding

## C09 (chatgpt high 2)

**Tank:** 20 gal all-in-one cube, 18 x 18 x 16 in, salt, 25 °C, three months old, no refugium. **Stock:** 1 Mandarin dragonet, 70 mm; 2 Ocellaris clownfish [a pair], 100 mm.

**Asked:** verdict, change, confidence. **Tests:** limits.food-not-room, tankmin.mandarin.

**The app today:** too-small (tankmin red: mandarin; tankmin red: ocellaris); the rest ideal; space 43 % (water 43, floor 10). Not modelled: setting: three months old, no refugium.

**Answers:** `{"verdict":"unworkable","change":"notroom","confidence":"high"}`

**Note:**

> Optional note: A three-month-old, 20-gallon aquarium without a refugium is unlikely to sustain the copepod population required by a typical mandarin dragonet. Chronic starvation is the primary concern, not swimming space or aggression. The clownfish pair is reasonably accommodated in this footprint, but the mandarin should be removed unless a reliable, independently verified feeding strategy is established. Captive-bred mandarins already eating prepared foods are an important exception, although even Biota recommends at least 30 gallons. 
>
> The Ornamental Aquatic Trade Association
>
> +2
>
> Calibration note: This is a strong test of habitat and food suitability independent of spatial stocking. The engine should recognize the combination of small volume, immature aquarium, no refugium, and specialized feeding requirements as a severe husbandry problem. Captive-bred, prepared-food-trained mandarins should receive different treatment from specimens dependent on naturally reproducing copepods.

## C10 (chatgpt high 2)

**Tank:** 29 gal, 30 x 12 x 18 in, salt, 25 °C, live rock. **Stock:** 5 Banggai cardinalfish [unsexed juveniles], 80 mm; 2 Ocellaris clownfish [a pair], 100 mm.

**Asked:** verdict, change, max, confidence; most Banggai cardinalfish: 0 | 1 | 2 | 3 | 5 | 7+. **Tests:** groups.territory-banggai.

**The app today:** problems (crowd: 5 Banggai cardinalfish); space 73 % (water 73, floor 0). Not modelled: banggai: unsexed juveniles; setting: live rock.

**Answers:** `{"verdict":"problems","changeSp":["banggai"],"change":"fewer","max":{"banggai":"2"},"confidence":"high"}`

**Note:**

> Optional note: Five juvenile Banggai cardinalfish may coexist temporarily, but as they mature, pair formation can trigger serious aggression toward other cardinals. In a 30-inch aquarium, subordinate individuals have little opportunity to escape. A single Banggai or a confirmed compatible pair is appropriate alongside the bonded clownfish pair. Two randomly selected adults are not necessarily compatible. NOAA's captive-breeding guidance specifically documents potentially fatal social stress when pairs form in groups. 
>
> NOAA Institutional Repository
>
> +1
>
> Calibration note: Banggai cardinalfish should not be treated as conventional schooling fish. Their long-term stocking limits are governed primarily by pair formation and conspecific territorial aggression, not swimming-space demand. Five juveniles can be temporarily acceptable while five adults in the same tank are problematic, even without population growth.

## C11 (chatgpt high 2)

**Tank:** 40 gal breeder, 36 x 18 x 16 in, salt, 25 °C, live rock. **Stock:** 2 Royal gramma [bought separately], 80 mm; 2 Firefish goby [bought separately], 90 mm; 2 Ocellaris clownfish [a pair], 100 mm.

**Asked:** verdict, change, max, compat, confidence; most Royal gramma: 0 | 1 | 2 | 3; most Firefish goby: 0 | 1 | 2 | 3 | 4+. **Tests:** groups.territory-gramma, groups.firefish-pair.

**The app today:** problems (crowd: Royal gramma is best kept one to a tank); space 38 % (water 38, floor 6). Not modelled: royalgramma: bought separately; firefish: bought separately; setting: live rock.

**Answers:** `{"confidence":"high","verdict":"problems","changeSp":["royalgramma","firefish"],"change":"fewer","together":"caution","reasons":["aggression","breeding"],"problem":["royalgramma","firefish"],"max":{"royalgramma":"1","firefish":"1"}}`

**Note:**

> Optional note: Both royal grammas and firefish are generally peaceful toward other species but can be strongly territorial toward their own kind. Two separately purchased royal grammas may fight over caves, while two unpaired firefish can harass one another, sometimes severely. Confirmed compatible pairs are exceptions. A single royal gramma, single firefish, and bonded clownfish pair would make a comfortable community in this 36-inch aquarium. 
>
> LiveAquaria
>
> +3
>
> Calibration note: This is primarily an intraspecific aggression problem, not spatial overstocking. The engine should distinguish established pairs from two independently acquired individuals. Both species can be housed singly without compromising their welfare, so reducing each to one is an appropriate solution rather than requiring a larger tank.

## C12 (chatgpt high 2)

**Tank:** 20 gal high, 24 x 12 x 16 in, salt, 25 °C, live rock. **Stock:** 3 Ocellaris clownfish [bought as juveniles], 100 mm.

**Asked:** verdict, change, max, confidence; most Ocellaris clownfish: 0 | 1 | 2 | 3 | 4+. **Tests:** groups.clown-max-2.

**The app today:** problems (crowd: 3 Ocellaris clownfish); space 56 % (water 56, floor 0). Not modelled: ocellaris: bought as juveniles; setting: live rock.

**Answers:** `{"verdict":"problems","changeSp":["ocellaris"],"change":"fewer","max":{"ocellaris":"2"},"confidence":"high"}`

**Note:**

> Optional note: Three juvenile ocellaris may initially coexist, but as they mature, a dominant female and breeding male typically establish themselves. The third fish risks persistent harassment, exclusion from feeding, and potentially death. A bonded pair is appropriate for this 24 × 12-inch aquarium. Larger clownfish social groups can sometimes work, but they require substantially more favorable conditions and are not reliably sustainable here. 
>
> Practical Fishkeeping
>
> +1
>
> Calibration note: This is a social-structure limitation rather than a simple stocking-density problem. The engine should strongly discourage three adult clownfish in a small aquarium, even if they were introduced simultaneously as juveniles. Two is a meaningful social threshold; adding a third can substantially increase aggression rather than merely increasing stocking pressure by 50%.

## D01 (chatgpt high 2)

**Tank:** 10 gal, 20 x 10 x 12 in, none, dry, warm side 32 C. **Stock:** 1 Leopard gecko [adult], 250 mm.

**Asked:** verdict, change, min, confidence; big enough / smallest for Leopard gecko: 10 gal (20 x 10 x 12 in) | 20 gal long (30 x 12 x 12 in) | 40 gal breeder (36 x 18 x 16 in) | 4 x 2 x 2 ft (48 x 24 x 24 in). **Tests:** herp.floor-min-leo.

**The app today:** too-small (herp: Leopard gecko: floor 1); the rest ideal. Not modelled: leopardgecko: adult; setting: dry, warm side 32 C.

**Answers:** `{"verdict":"unworkable","change":"bigger","bigEnough":"no","smallest":"40 gal breeder (36 x 18 x 16 in)","confidence":"high"}`

**Note:**

> Optional note: A 20 × 10-inch footprint is substantially too small for a 10-inch adult leopard gecko. It restricts exercise, exploration, and establishing meaningful thermal zones. A 36 × 18-inch footprint is a reasonable modern minimum, providing 3.24 times the floor area. A 4 × 2-foot enclosure would be preferable, but isn't necessary for an acceptable long-term setup. 
>
> Leopard Gecko Care Sheet
>
> +1
>
> Calibration note: Leopard geckos should be evaluated primarily on usable floor area rather than enclosure volume. A 10-gallon enclosure fails even for a single adult, regardless of otherwise excellent husbandry. A 20-long represents an improvement but remains below the preferred modern minimum.

## D02 (chatgpt high 2)

**Tank:** 40 gal breeder used as a terrarium (36 x 18 x 16 in), 36 x 18 x 16 in, none, dry, warm side 32 C. **Stock:** 2 Leopard gecko [juveniles about 5 in, sexes unknown], 250 mm.

**Asked:** verdict, change, compat, max, confidence; most Leopard gecko: 1 | 2 | 3 | 4+. **Tests:** herp.cohab-sex-rule, herp.each-extra.

**The app today:** too-small (herp: Leopard gecko: floor 4); the rest ideal. Not modelled: leopardgecko: juveniles about 5 in, sexes unknown; setting: dry, warm side 32 C.

**Answers:** `{"verdict":"unworkable","changeSp":["leopardgecko"],"change":"fewer","together":"no","confidence":"high","max":{"leopardgecko":"1"}}`

**Note:**

> Optional note: Leopard geckos are best housed individually. Two males risk serious fighting; a male-female combination introduces persistent mating pressure; and even two females can compete for territory and resources or injure one another. Successful female cohabitation is possible, but not reliably safe, especially in a 36 × 18-inch enclosure. The RSPCA recommends solitary housing, and ReptiFiles discourages cohabitation even among females. 
>
> RSPCA
>
> +1
>
> Calibration note: The 40 breeder is appropriate for one adult leopard gecko, but not a recommended permanent enclosure for two. The all-female maximum of 1 reflects responsible long-term husbandry rather than an absolute biological limit. Sexing the animals does not fully resolve the cohabitation risk.

## D03 (chatgpt high 2)

**Tank:** 12 x 12 x 18 in terrarium, 12 x 12 x 18 in, none, humid, planted. **Stock:** 1 Crested gecko [adult], 229 mm.

**Asked:** verdict, change, min, confidence; big enough / smallest for Crested gecko: 12 x 12 x 18 in | 18 x 18 x 24 in | 18 x 18 x 36 in | 24 x 18 x 36 in. **Tests:** herp.arboreal-min, herp.height.

**The app today:** too-small (herp: Crested gecko: floor 1 sq ft (0; herp: Crested gecko: enclosure 18 in tall); the rest ideal. Not modelled: crestedgecko: adult; setting: humid, planted.

**Answers:** `{"verdict":"unworkable","change":"bigger","bigEnough":"no","smallest":"18 x 18 x 36 in","confidence":"high"}`

**Note:**

> Optional note: A 12 × 12 × 18-inch enclosure is appropriate for a growing juvenile but substantially undersized for a 9-inch adult. Crested geckos are arboreal and need both vertical climbing room and horizontal space for jumping and exploration. An 18 × 18 × 24-inch enclosure is accepted as a minimum by some husbandry authorities, but the more generous 18 × 18 × 36-inch size matches current ReptiFiles guidance and is my preferred long-term standard. 
>
> ReptiFiles
>
> +1
>
> Calibration note: Arboreal enclosure suitability should account for height, horizontal dimensions, and usable climbing volume. A 12 × 12 × 18-inch enclosure fails for an adult, while 18 × 18 × 24 inches represents a defensible lower boundary and 18 × 18 × 36 inches a stronger ideal-minimum target.

## D04 (chatgpt high 2)

**Tank:** 18 x 18 x 24 in terrarium, 18 x 18 x 24 in, none, humid, planted. **Stock:** 1 Crested gecko [adult], 229 mm; 1 Green anole (male) [adult], 200 mm.

**Asked:** verdict, change, compat, confidence. **Tests:** herp.cross-species.

**The app today:** unworkable (herp: Crested gecko: not with Green anole; herp: Green anole: not with Crested gecko (flame)). Not modelled: crestedgecko: adult; greenanole: adult; setting: humid, planted.

**Answers:** `{"confidence":"high","verdict":"unworkable","changeSp":["greenanole"],"change":"drop","together":"no","reasons":["temperature","aggression"]}`

**Note:**

> Optional note: These species have different thermal requirements. Green anoles require a daytime basking area around 85–95°F, whereas crested geckos are vulnerable to prolonged high temperatures, particularly above 85°F. Both are arboreal and would compete for limited climbing and retreat space in this enclosure. The territorial male anole presents an additional harassment risk. Separate housing is strongly recommended. 
>
> ReptiFiles
>
> +2
>
> Calibration note: This should trigger a severe interspecies compatibility failure independently of enclosure capacity. Both animals could potentially be maintained individually in an 18 × 18 × 24-inch enclosure under some husbandry standards, although larger enclosures are preferable. Increasing the enclosure size alone would not reliably resolve the thermal and behavioral incompatibilities.

## D05 (chatgpt high 2)

**Tank:** 18 x 18 x 24 in terrarium, 18 x 18 x 24 in, none, humid, planted. **Stock:** 2 Crested gecko (1 male, 1 female) [adults], 229 mm.

**Asked:** verdict, change, max, compat, confidence; most Crested gecko: 1 | 2 | 3 | 4+. **Tests:** herp.mixed-pair, herp.each-extra.

**The app today:** too-small (herp: Crested gecko: floor 2); the rest ideal. Not modelled: crestedgecko: adults; setting: humid, planted.

**Answers:** `{"verdict":"unworkable","changeSp":["crestedgecko"],"change":"fewer","together":"no","reasons":["aggression","breeding"],"max":{"crestedgecko":"1"},"confidence":"high"}`

**Note:**

> Optional note: Permanent male-female cohabitation is not recommended, particularly in an 18 × 18 × 24-inch enclosure. The male will likely attempt repeated mating, potentially causing female stress, injuries, and repeated egg production. Even though offspring aren't counted, reproductive behavior remains a significant concern. Some breeders successfully house compatible pairs temporarily, but that is different from recommended permanent housing. The RSPCA specifically advises against permanently keeping males with other crested geckos. 
>
> RSPCA
>
> +2
>
> Calibration note: This is primarily a reproductive and social compatibility failure rather than ordinary spatial overcrowding. Even a larger enclosure would not make permanent male-female cohabitation ideal. A single adult is the appropriate long-term stocking target, preferably in an enclosure at least 18 × 18 × 36 inches.

## D06 (chatgpt high 2)

**Tank:** 40 gal breeder used as a terrarium (36 x 18 x 16 in), 36 x 18 x 16 in, none, warm side 32 C, hides both ends. **Stock:** 1 Ball python [adult female, about 4.5 ft], 1311 mm.

**Asked:** verdict, change, min, confidence; big enough / smallest for Ball python: 40 gal breeder (36 x 18 x 16 in) | 4 x 2 x 1 ft (48 x 24 x 12 in) | 4 x 2 x 2 ft (48 x 24 x 24 in) | 6 x 2 x 2 ft (72 x 24 x 24 in). **Tests:** herp.floor-min-bp, herp.height-bp.

**The app today:** too-small (herp: Ball python: enclosure 16 in tall); the rest caution (herp floor under recommended: Ball python). Not modelled: ballpython: adult female, about 4.5 ft; setting: warm side 32 C, hides both ends.

**Answers:** `{"confidence":"high","verdict":"unworkable","change":"bigger","bigEnough":"no","smallest":"4 x 2 x 2 ft (48 x 24 x 24 in)"}`

**Note:**

> Optional note: A 36 × 18 × 16-inch enclosure is too restrictive for a 4.5-foot adult female ball python. The 36-inch length prevents her from fully extending along the enclosure, while the limited footprint and height constrain exploration, thermoregulation, and climbing opportunities. A 4 × 2 × 2-foot enclosure is a commonly accepted modern minimum, although a 6 × 2 × 2-foot enclosure would better accommodate this particular snake's length. 
>
> ReptiFiles
>
> +2
>
> Calibration note: Snake enclosure requirements should scale with individual adult length rather than relying exclusively on species-wide minimums. The 4 × 2 × 2-foot option represents a defensible practical minimum, but a stricter full-body-length criterion would favor the 6-foot enclosure for this 4.5-foot female. Both approaches clearly reject the 40 breeder for permanent housing.

## D07 (chatgpt high 2)

**Tank:** 18 x 18 x 24 in terrarium, 18 x 18 x 24 in, none, bioactive, 80 % humidity. **Stock:** 3 Dyeing dart frog (1 male, 2 females) [adults], 45 mm.

**Asked:** verdict, change, max, compat, confidence; most Dyeing dart frog: 1 | 2 | 3 | 4 | 5+. **Tests:** herp.dartfrog-group, herp.female-aggression.

**The app today:** too-small (herp: Dyeing dart frog: floor 2); the rest problems (herp: Dyeing dart frog: 2 females). Not modelled: dartfrog: adults; setting: bioactive, 80 % humidity.

**Answers:** `{"verdict":"problems","change":"ratio","together":"no","reasons":["aggression"],"max":{"dartfrog":"2"},"confidence":"high"}`

**Note:**

> Optional note: Dendrobates tinctorius females can be highly territorial toward one another, particularly when competing for access to a male. In an 18 × 18-inch footprint, two adult females present a substantial risk of fighting, chronic stress, and exclusion from feeding. A compatible male-female pair is the more reliable arrangement. Groups with multiple males and one female can sometimes succeed, but require careful management. 
>
> PMC
>
> +2
>
> Calibration note: This is primarily a sex-ratio and territoriality constraint rather than physical crowding. The enclosure has reasonable space for two adults, but introducing a second female substantially increases conflict risk. TankLook should distinguish a 1M/2F trio from a compatible 1M/1F pair rather than treating both as simple stocking-density increments.

## D08 (chatgpt high 2)

**Tank:** 18 x 18 x 24 in terrarium, 18 x 18 x 24 in, none, humid, planted. **Stock:** 2 White's tree frog [adults, same size], 127 mm; 2 Dyeing dart frog [adults], 45 mm.

**Asked:** verdict, change, compat, confidence. **Tests:** herp.prey-amphibian.

**The app today:** too-small (herp: White's tree frog: floor 2; herp: Dyeing dart frog: floor 2); the rest unworkable (herp: White's tree frog: not with Dyeing dart frog; herp: Dyeing dart frog: not with White's tree frog). Not modelled: treefrog: adults, same size; dartfrog: adults; setting: humid, planted.

**Answers:** `{"confidence":"high","verdict":"unworkable","changeSp":["treefrog"],"change":"drop","together":"no","reasons":["eat","temperature","habitat"]}`

**Note:**

> Optional note: Adult White's tree frogs are large, opportunistic predators capable of consuming smaller amphibians, making the 1.8-inch dart frogs potential prey. The species also have different preferred environmental conditions: White's tree frogs benefit from warmer basking areas and periodic drying, whereas dyeing dart frogs require consistently humid conditions and generally cooler temperatures. Their preferred ranges overlap somewhat, but this does not resolve the predation risk. 
>
> Litoria caerulea
>
> +2
>
> Calibration note: This is a clear interspecies predation failure, not a spatial stocking problem. Even a much larger enclosure would not make this combination reliably safe. TankLook should flag large, opportunistic amphibians housed with sufficiently small frogs, regardless of whether the species normally occupy different vertical zones.

## D09 (chatgpt high 2)

**Tank:** 18 x 18 x 24 in terrarium, 18 x 18 x 24 in, none, humid, branches. **Stock:** 3 White's tree frog [adults, same size], 127 mm.

**Asked:** verdict, change, max, min, confidence; big enough / smallest for White's tree frog: 18 x 18 x 24 in | 24 x 18 x 24 in | 36 x 18 x 18 in | 36 x 18 x 36 in; most White's tree frog: 1 | 2 | 3 | 4 | 5+. **Tests:** herp.treefrog-each-extra, herp.height.

**The app today:** too-small (herp: White's tree frog: floor 2); the rest ideal. Not modelled: treefrog: adults, same size; setting: humid, branches.

**Answers:** `{"verdict":"caution","confidence":"medium","change":"bigger","bigEnough":"yes","smallest":"36 x 18 x 36 in","max":{"treefrog":"2"}}`

**Note:**

> Optional note: White's tree frogs tolerate group housing well, so aggression is not the primary concern. However, three large, 5-inch adults in an 18 × 18 × 24-inch enclosure have limited climbing and perching space. Long-term success is possible with well-distributed sturdy branches and resting sites, but I would prefer a larger enclosure. A 36 × 18 × 36-inch terrarium offers comfortable room for three adults. Published recommendations vary, with some permitting three in this enclosure and others recommending substantially larger group housing. 
>
> The Bio Dude
>
> +2
>
> Calibration note: This is a useful distinction between acceptable and ideal group density. Three White's tree frogs are socially compatible, and the current enclosure is not automatically dangerous, but it is more crowded than desirable. Two adults represent my comfortable upper target for this footprint; three warrant caution rather than an automatic severe failure.

## D10 (chatgpt high 2)

**Tank:** 20 gal long paludarium, 30 x 12 x 12 in, half, 22 °C, half land, water 4 in deep, tight lid. **Stock:** 4 Fire-bellied toad, 51 mm; 6 White cloud mountain minnow, 40 mm.

**Asked:** verdict, change, compat, max, confidence; most Fire-bellied toad: 1 | 2 | 3 | 4 | 6 | 8+. **Tests:** herp.toad-group, herp.toad-with-fish, gap.toxins.

**The app today:** too-small (herp: Fire-bellied toad: floor 2); the rest unworkable (herp: Fire-bellied toad: not with White cloud mountain minnow); space 91 % (water 91, floor 50). Not modelled: setting: half land, tight lid.

**Answers:** `{"verdict":"problems","confidence":"low","together":"caution","max":{"firetoad":"4"}}`

**Note:**

> The four fire-bellied toads are reasonably accommodated, but the shallow aquatic section is unsuitable for six adult white cloud mountain minnows. Its exact volume and swimming footprint are unknown, although the 4-inch depth imposes a substantial limitation. Removing the minnows would be my first change.
>
> Calibration implication: TankLook shouldn't infer an exact aquatic footprint from a qualitative description like "half land, half water." It can establish an upper bound from known dimensions, but should otherwise acknowledge uncertainty rather than inventing geometry.

## D11 (chatgpt high 2)

**Tank:** 20 gal long, 30 x 12 x 12 in, fresh, 18 °C, water 8 in deep, a floating land spot, unheated. **Stock:** 4 Chinese fire-bellied newt, 102 mm; 10 Cherry shrimp, 30 mm; 2 Nerite snail, 32 mm.

**Asked:** verdict, change, compat, max, confidence; most Chinese fire-bellied newt: 1 | 2 | 3 | 4 | 6 | 8+. **Tests:** herp.newt-with-shrimp, herp.newt-group, compat.temperature-cool.

**The app today:** unworkable (temperature single); space 50 % (water 50, floor 32). Not modelled: setting: , a floating land spot, unheated.

**Answers:** `{"verdict":"caution","confidence":"medium","together":"caution","changeSp":["nerite"],"change":"drop","reasons":["eat","temperature"],"max":{"firenewt":"4"}}`

**Note:**

> Optional note: Four adult Chinese fire-bellied newts are reasonably accommodated by the 30 × 12-inch footprint, although the 8-inch water depth provides only approximately 12.5 gallons before displacement. The 18°C temperature is excellent for the newts and tolerable for cherry shrimp. Some shrimp may be eaten, but coexistence is possible with sufficient cover. Nerite snails are the least suitable inhabitants because 18°C is at the lower edge of their reported tolerance and below their usual preferred range. 
>
> Hypselotriton orientalis (Captive Bred)
>
> +3
>
> Calibration note: This is a borderline compatibility case rather than severe overcrowding. Four newts represent a defensible upper stocking target for this shallow setup, while shrimp predation and suboptimal nerite temperature warrant separate cautions. Neither should automatically produce a severe spatial stocking penalty.

## D12 (chatgpt high 2)

**Tank:** 5 gal, 16 x 8 x 10 in, fresh, 25 °C. **Stock:** 3 African dwarf frog, 55 mm; 1 Betta (male), 65 mm.

**Asked:** verdict, change, compat, max, confidence; most African dwarf frog: 0 | 1 | 2 | 3 | 4 | 6+. **Tests:** herp.adf-with-betta, herp.adf-min.

**The app today:** problems (space 107 %); space 107 % (water 107, floor 106).

**Answers:** `{"verdict":"problems","changeSp":["adf"],"change":"drop","together":"caution","reasons":["nip"],"max":{"adf":"0"},"confidence":"medium"}`

**Note:**

> Optional note: Three African dwarf frogs and a male betta are too much for this 16 × 8-inch footprint. The frogs are social and benefit from groups, but their poor eyesight and slow feeding create risks when housed with a betta, which may monopolize food or harass them. Accidental fin biting is also possible. Compatibility varies with individual temperament, and successful mixed housing does occur, but a 5-gallon aquarium leaves little margin for conflict. 
>
> Reddit
>
> +2
>
> Calibration note: The maximum of zero frogs applies specifically to this aquarium with the betta remaining. A species-only 5-gallon aquarium containing two or three African dwarf frogs is substantially more defensible. The limitation here is cumulative spatial pressure and interspecies feeding/behavioral risks, not an absolute incompatibility between the species.

## D13 (chatgpt high 2)

**Tank:** 10 gal, 20 x 10 x 12 in, fresh, 17 °C, unheated, cool room. **Stock:** 1 Axolotl [adult, about 25 cm], 300 mm.

**Asked:** verdict, change, min, confidence; big enough / smallest for Axolotl: 10 gal (20 x 10 x 12 in) | 20 gal long (30 x 12 x 12 in) | 29 gal (30 x 12 x 18 in) | 40 gal breeder (36 x 18 x 16 in). **Tests:** herp.axolotl-min.

**The app today:** too-small (tankmin red: axolotl); the rest ideal; space 64 % (water 54, floor 64). Not modelled: axolotl: adult, about 25 cm; setting: unheated, cool room.

**Answers:** `{"verdict":"unworkable","change":"bigger","bigEnough":"no","smallest":"40 gal breeder (36 x 18 x 16 in)","confidence":"high"}`

**Note:**

> Optional note: The 17°C water temperature is excellent, but the 20 × 10-inch footprint is unsuitable for an adult axolotl approaching 12 inches long. It severely restricts turning, walking, and exploration. A 29-gallon aquarium is considered an acceptable minimum by some keepers, but its 12-inch width remains restrictive. I would choose a 40 breeder for comfortable permanent housing, providing substantially more usable floor area. 
>
> Reddit
>
> +2
>
> Calibration note: This is a clear floor-space failure, independent of filtration or water quality. A 29-gallon aquarium is a defensible borderline minimum, while the 40 breeder is a stronger target for comfortable adult housing. TankLook should place greater weight on footprint, particularly front-to-back width, than water volume for axolotls.

## D14 (chatgpt high 2)

**Tank:** 20 gal long, 30 x 12 x 12 in, fresh, 17 °C, unheated, cool room. **Stock:** 2 Axolotl [adults, same size], 300 mm; 6 White cloud mountain minnow, 40 mm.

**Asked:** verdict, change, compat, max, confidence; most Axolotl: 0 | 1 | 2 | 3. **Tests:** herp.axolotl-pair, herp.axolotl-with-fish.

**The app today:** too-small (tankmin red: axolotl); the rest unworkable (compat high; herp: Axolotl: not with White cloud mountain minnow); space 82 % (water 82, floor 71); compat high: Axolotl with White cloud mountain minnow: would eat it. Not modelled: axolotl: adults, same size; setting: unheated, cool room.

**Answers:** `{"verdict":"unworkable","change":"bigger","together":"no","reasons":["eat"],"max":{"axolotl":"0"},"confidence":"high"}`

**Note:**

> Optional note: Two 12-inch adult axolotls are severely cramped in a 30 × 12-inch footprint. Even one adult would be inadequately accommodated under our established standards. The 17°C temperature suits both species, but white cloud minnows may be eaten by the axolotls or occasionally nip their exposed gills. A larger, preferably 48 × 24-inch enclosure would be much more appropriate for two similarly sized axolotls, with the minnows housed separately. 
>
> MyAxolotl
>
> +1
>
> Calibration note: Zero is appropriate because the enclosure is too small for even one adult axolotl, regardless of the minnows. The mixed-species predation risk is an independent compatibility concern. Increasing enclosure size resolves the spatial limitation but does not eliminate the risks of housing minnows with axolotls.

## D15 (chatgpt high 2)

**Tank:** 18 x 18 x 24 in terrarium, 18 x 18 x 24 in, none, basking spot 33 C, UVB, misted plants. **Stock:** 4 Green anole (1 male, 3 females) [adults], 200 mm.

**Asked:** verdict, change, max, maxMales, confidence; most Green anole: 1 | 2 | 3 | 4 | 5+; most male Green anole: 0 | 1 | 2 | 3. **Tests:** herp.anole-group, herp.one-male.

**The app today:** too-small (herp: Green anole: floor 2); the rest ideal. Not modelled: greenanole: adults; setting: basking spot 33 C, UVB, misted plants.

**Answers:** `{"verdict":"problems","change":"bigger","max":{"greenanole":"2"},"maxMales":{"greenanole":"1"},"confidence":"medium"}`

**Note:**

> Optional note: The 1M/3F ratio is sensible for group housing, but four adult green anoles are crowded in an 18 × 18 × 24-inch terrarium. Competition for basking positions, visual territories, and escape routes can cause chronic stress. One male with three females can succeed in larger, densely planted enclosures, but the available space here is restrictive. Two compatible adults are more defensible, although solitary housing is the safer standard. Husbandry recommendations vary considerably on communal housing. 
>
> ReptiFiles
>
> +2
>
> Calibration note: Green anoles are not strictly incompatible with conspecifics, but territorial pressure increases with density. A single male is the appropriate maximum regardless of total group size. The 1M/3F ratio reduces male-male aggression but does not eliminate competition or reproductive harassment. TankLook should treat two compatible animals as potentially workable with caution, while four in this footprint cross into likely long-term problems.

## D16 (chatgpt high 2)

**Tank:** 12 x 12 x 12 in terrarium, 12 x 12 x 12 in, none, deep substrate, a hide, water dish. **Stock:** 1 Chaco golden knee tarantula [adult female, 6 in leg span], 50 mm.

**Asked:** verdict, change, min, confidence; big enough / smallest for Chaco golden knee tarantula: 8 x 8 x 8 in | 12 x 12 x 12 in | 18 x 18 x 12 in | 20 gal long (30 x 12 x 12 in). **Tests:** tankmin.tarantula-row.

**The app today:** ideal. Not modelled: chacogoldenknee: adult female, 6 in leg span; setting: deep substrate, a hide, water dish.

**Answers:** `{"verdict":"caution","change":"bigger","bigEnough":"yes","smallest":"12 x 12 x 12 in","confidence":"medium"}`

**Note:**

> Optional note: A 12 × 12-inch footprint provides twice the spider's 6-inch leg span in each direction. This is at the lower end of commonly accepted terrestrial tarantula housing recommendations, but remains workable. An 18 × 18 × 12-inch enclosure would offer more comfortable floor space. Deep substrate is particularly important to minimize dangerous falling distances for this heavy-bodied terrestrial species. 
>
> nwzoo.com
>
> +1
>
> Calibration note: Tarantula enclosure sizing should primarily use diagonal leg span, not body length. For terrestrial species, approximately 2× leg span in horizontal dimensions is a defensible lower boundary, while 3× provides more comfortable room. Excessive unobstructed vertical height can actually increase injury risk, so larger enclosure volume is not automatically better.

