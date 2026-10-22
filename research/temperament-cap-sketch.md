# Temperament caps: a sketch (2026-10-21, not built)

_Superseded 2026-10-22: built in a simpler form (size-scaled `territory` steps on the existing group data, warning only). See territory-caps.md and HANDOFF.md section S196._

## Why
The experts' maximum stockings read a 59 % median in our engine (research/expert-curve.md). For territorial fish the count is limited by peace, not room. Examples: 8 dwarf gouramis in 55 gal reads 31 %, 4 angelfish in 75 gal 52 %, 3 chromis in 75 gal 12 %. The stocking percent cannot say this, so it needs its own rule. Bioload stays as it is.

## What exists
- `GroupCare.max` in `src/data/groups.ts` is a flat "most per tank", the same in 10 gal and 125 gal: dwarf gourami 1, gbr 2, angel 8, yellowlab 12.
- `CARE.temper` (0 peaceful, 1 territorial / pushy, 2 aggressive) and `sexed` ratios.
- `animalfit.ts` checks pairs of species against each other, not counts within one species.
- `starter.ts` caps counts with its own `stocking(sp).max`.

## Proposed rule
Applies only to species with temper 1 or 2 (about 30 species). Schools keep the flat `max` as a "plenty" ceiling.

```ts
territory?: {
  unit: 'fish' | 'male' | 'pair',   // what holds a territory; 'male' uses sexed.ratio for the females
  basis: 'volume' | 'length' | 'footprint',  // midwater fish by litres, bottom / cave fish by floor area, cruisers by length
  first: number,      // tank size (L, mm or cm2) for the first unit
  each: number,       // extra size per further unit
  src: string,        // research row
}
capOf(sp, tank) = units = 1 + floor((size - first) / each)   (0 if size < first)
                  animals = units x (unit 'male' ? 1 + females per male : unit 'pair' ? 2 : 1)
```

- The cap is checked per species, and separately across species that hold the same kind of territory (two cichlid species on the bottom share one floor). The cross-species check is phase 2.
- **Output:** a line beside the stocking percent: "8 dwarf gouramis: a 55 gal holds about 4 males' territories". It is a warning band, like the group bands (ok / crowded / fights likely at 1.5x the cap), and never a change to the percent.
- **Starters:** `stocking(sp).max` becomes `min(flat max, capOf(sp, tank))`, so big tanks may carry more territorial fish and small tanks fewer.

## Worked examples, numbers to be sourced
| species | unit / basis | first, each | 10 gal | 29 gal | 55 gal | 75 gal | data now |
|---|---|---|---|---|---|---|---|
| dwarf gourami | male / volume | 38 L, 76 L | 1 + 0-1 females | 1-2 | 3 | 4 | Aquarium Source table, about +1 fish per 5 gal (fish, not males) |
| German blue ram | pair / footprint | 30 in x 12 in, +1 pair per 12 in of length | 0 | 1 pair | 1-2 | 2 | 4 sizes in expert-curve.json |
| angelfish | fish / volume | 110 L, 40 L | 0 | 1-2 | 6 | 7-8 | expert maximums disagree (6 in 55 gal, 4 in 75 gal) |
| mbuna (yellowlab etc.) | male / length | 48 in, 24 in | 0 | 0 | 1 male + 4 females | the same, more groups | 3 sizes, but dwarf and regular mbuna are mixed |

## Data needed
About 30 territorial species. For each: the holding unit, the basis, and two or more (size, count) points from one source, the same method as research/expert-curve.json. Cost: about 150-180k Sonnet tokens per run of about 15 species, so 2 runs.

## Open for Nathan
1. Is "warning only, never the percent" right? A bad mix could otherwise show 30 % and look safe.
2. Should the cross-species territory check (shared floor) be in phase 1?
