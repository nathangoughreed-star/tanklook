# Round 2 review: ngr-ai (11 tanks, 2026-10-23)

An AI model answered round 2 in Nathan's browser from screenshots (survey 2.2, "answering as: an AI model"). The export said `expert: "ngr"`,
the name of Nathan's own round-1 answers, and the fit keys experts by name, so the stored copy
(`answers/round-2-ngr-ai.json`) is `ngr-ai` with `answeredVia: "ngr"`. f16 was opened but not answered and is left out.

## Reading the notes, tank by tank

| tank | what the note says | how the fit reads it |
|---|---|---|
| f10 (40 gal, 11 hatchet, 8 honey gourami, 8 chili) | 12 hatchet / 20 chili are preferred counts with the 8 gouramis held; "they don't imply that the entire combination becomes green"; caution from gourami territory and surface overlap; sex ratio unknown | ideal counts and the water / overall bands set aside; the "at most" 20 kept |
| f8 (40 gal, 66 ember) | comfortably full; 70 / 110 | as given |
| f9 (29 gal, 18 guppy) | 25 / 40 at the listed 3 cm; sex ratio and breeding are separate | as given |
| p2b (40 gal 48 x 12, 15 bronze cory) | 18 / 28; the 12 in width spreads the group less than a breeder | as given |
| a1 (anchor, 125 gal) | the two ideals are alternatives (70 + 28 or 87 + 12): each holds the other species, as asked | as given (held out of the fit) |
| f6 (40 gal, 28 panda, 25 white cloud) | 25 white clouds is preferred, it "does not make the whole tank green"; white clouds are not half-time bottom dwellers | tankmate ideal set aside |
| f4 (75 gal, 59 panda, 49 rummy-nose) | "no count works" for the rummy-noses: the 59 pandas alone pass the floor | as given (the intended use of that answer) |
| f7 (40 gal, 52 neon) | 40 / 65; neons are bigger than embers | as given |
| f15 (75 gal, 4 SAE, 109 CPD) | 70 CPDs is "a preferred conditional count"; the water question left the SAEs out | tankmate ideal set aside |
| f13 (30 gal, 4 hillstream, 38 oto) | 4 hillstreams + 20 otos is the comfortable target; otos use glass and wood, not floor; food is separate from room | as given |
| f14 (125 gal, 37 bronze cory, 23 kadango) | counts withheld; kadango breeding territory beside 37 cories is a compatibility call; "if the floor question counted only the cories, I'd mark it Ideal" | water / overall bands set aside; floor restated as Ideal |

`review.skip` / `review.set` on each answer carry this; `scripts/calib-fit.mjs` lists every set-aside answer with its reason.

## What it changed in the survey (round 3, survey v3)

- **The count meant two things.** Three of the four tankmate ideals were "my preferred count with the others held", not "the count at
  which the tank reads Ideal", which is what the fit maps to 75 %. The count labels now say "most that still reads Ideal" and "most
  before Problems", with "the other animals stay at their counts; if they alone already pass the line, pick No count works".
- **Sex ratio and breeding** came up on f10, f9 and f14. The tank card now says: adults at the listed sizes, the count stays as shown
  (no breeding), sexes in the mix the expert would choose for that count.
- **The water-column question listed only part-time swimmers**, so floor + water species (SAE, cories) were missing from it. It now lists
  every species.
- **Food** (otos, grazers) is now named in "Not room: habitat, compatibility or food decides it".

## Engine questions it raised (not changed here)

The "uses" tags are the engine's own floor shares, shown on purpose. The expert disputed four:
white cloud (floor 0.5: "primarily upper and middle water"), CPD (0.5: "lower planted water is not substrate territory"), otocinclus
(0.5: they graze glass, wood and leaves), kadango (water near the surface: they need open water and bottom breeding sites). One AI
expert is not evidence enough to change `floorShare`; round 3's human answers on the same species will say whether it holds.
