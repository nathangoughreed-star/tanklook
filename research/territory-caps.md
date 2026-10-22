# Territory caps: what the sources support (2026-10-21)

Data: territory-batch1.json (15 species), territory-batch2.json (14). Each rule is clamped to at least one unit and at most today's flat GroupCare.max.

## Rules as sources state them, unclamped (they extrapolate badly)

| species | unit | 10 gal | 20 | 29 | 40 | 55 | 75 | 125 | rule (source) |
|---|---|---|---|---|---|---|---|---|---|
| dwarfgourami | fish | 1 | 3 | 4 | 7 | 10 | 14 | 24 | Fishkeeping World / Aquarium Source: 10 gal, +5 gal per fish (Co-Op, Seriously Fish: 1 male only) |
| swordtail | male | 0 | 8 | 12 | 24 | 36 | 52 | 92 | Fishkeeping World: 15 gal, +5 gal; 1 male : 3 females |
| kribensis | pair | 0 | 2 | 2 | 4 | 6 | 10 | 18 | Furry Critter (retailer): 20 gal a pair, +10-15 gal per pair |
| peapuffer | fish | 2 | 6 | 9 | 12 | 17 | 24 | 41 | Aquarium Co-Op: 5 gal the first, about +3 gal each |
| bolivianram | fish | 0 | 0 | 0 | 2 | 4 | 7 | 13 | Fishkeeping World: 30 gal for one, +5-10 gal each |
| labeo | fish | 0 | 0 | 0 | 0 | 1 | 1 | 1 | Seriously Fish: one per 48 in tank, territory ~1 m across |
| betta | male | 1 | 1 | 1 | 1 | 1 | 1 | 1 | one male per tank (sorority 4-6 females in a 20 long is separate) |
| ocellaris | pair | 2 | 2 | 2 | 2 | 2 | 2 | 2 | one pair per tank (BRS, LiveAquaria) |
| firefish | pair | 2 | 2 | 2 | 2 | 2 | 2 | 2 | one fish or one bonded pair |
| watchman | pair | 2 | 2 | 2 | 2 | 2 | 2 | 2 | one fish or one bonded pair |
| sixline | fish | 1 | 1 | 1 | 1 | 1 | 1 | 1 | Saltwater Aquarium Blog: one per tank |
| bluetang | fish | 1 | 1 | 1 | 1 | 1 | 1 | 1 | Practical Fishkeeping: one adult per tank |
| yellowtang | fish | 1 | 1 | 1 | 1 | 1 | 1 | 1 | SAB: more than one not recommended |
| coralbeauty | fish | 1 | 1 | 1 | 1 | 1 | 1 | 1 | SAB: one per tank unless over 180 gal |
| royalgramma | fish | 1 | 1 | 1 | 1 | 2 | 2 | 3 | Fishkeeping World: 30 gal one, 50 a pair, 100+ a group |
| oscar | fish | 1 | 1 | 1 | 1 | 1 | 1 | 1 | one adult; a pair needs more, no number given |
| peacock | male | 5 | 5 | 5 | 5 | 5 | 5 | 5 | one male per 48 in with 3-6 females; no increment stated |

## Clamped

| species | today (flat) | 10 gal | 20 | 29 | 40 | 55 | 75 | 125 |
|---|---|---|---|---|---|---|---|---|
| dwarfgourami | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| swordtail | 10 | 4 | 8 | 10 | 10 | 10 | 10 | 10 |
| kribensis | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 |
| peapuffer | 8 | 2 | 6 | 8 | 8 | 8 | 8 | 8 |
| bolivianram | 8 | 1 | 1 | 1 | 2 | 4 | 7 | 8 |
| labeo | 16 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| royalgramma | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| coralbeauty | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |

## Decision (Nathan 2026-10-22)
Option 1: warn above the sourced, size-scaled limit (no clamp to the old flat max); a warning only. Built for the 8 species with a stated rule, see HANDOFF.md section S196. Picture: territory-warning.png.
