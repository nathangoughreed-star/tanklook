# Plant propagation for the grow-in timeline (draft, 2026-10-16)

Goal: Time (scene/growtime.ts) today only makes each plant bigger/denser (`Item.growth`, 0..1). Add reproduction and
spreading: patches fill in, daughters appear, plants encroach on each other.

## What exists now
- One `Item` = one plant or clump. `spread` (circle radius) and `stems` / `crowns` are per-item overrides; floaters have
  `spread` + `dens`. Growth never adds Items or moves the footprint, so nothing can spread past where it was planted.
- `PLANT3D[type].grow` has `speed` and `overflow` ('trail' | 'emerge' | 'spread' | 'none'). `overflow` already hints at
  this but only acts on the vertical axis.
- Time is reversible (`planted` is kept so Time runs both ways). Any propagation must be too: scrub back = daughters vanish.

## Propagation templates (one per mechanism, not per species)

| Template | Species in the library | Real behaviour | Rate / range | Looks like |
|---|---|---|---|---|
| **Runner (stolon)** | Vallisneria, dwarf sagittaria, dwarf hairgrass, carpet patch (Monte Carlo / HC-style), Amazon sword (rare: it sends flower stalks that make plantlets, runners in some), Ozelot | Thin horizontal runner from the crown; a daughter crown forms at the end, 5-30 cm away, then roots. Grass and sag are the fastest; sword is slow and stays near. | grass/sag/hairgrass: 1 daughter per 0.15-0.25 Time per mature plant, hop 40-150 mm (sword: 1 per 0.5, hop 150-300) | Chain of small rosettes joined by a faint line, a daughter at growth 0 beside a big parent |
| **Stem cuttings (side shoots, fragmentation)** | Stem plant, red stem, rotala, ludwigia, hornwort, anacharis | Branches at nodes, tops get pinched; every cutting replanted roots. Hornwort / anacharis fragment and drift. Bottom leaves drop as the stem lengthens. | Already modelled as `shoots`. New: a stem past 0.7 growth that tops out makes lateral stems that bend outward, widening the clump | Wider, bushier bunch; leggy and bare at the base when tall |
| **Rhizome (creeping, sectioned)** | Anubias, buce, java fern, crypts (rhizome-ish, also runners underground), tropical fern | Rhizome extends along the substrate or wood, a new leaf at the tip every few weeks; old rhizome branches into a new growing point. Java fern and buce also grow plantlets on old leaf edges. | slow: new crown 1 per 0.3-0.5 Time, hop 20-60 mm, stays attached to surface it started on (wood / rock) | Clump on the same piece of wood that grows sideways, never jumps to open sand |
| **Offsets / plantlets (crown division)** | Cryptocoryne wendtii, balansae, bromeliad, echeveria, aloe, haworthia, barrel (pups), java fern (leaf plantlets) | Daughter crowns pop up right at the parent base ("pups") and the parent becomes a clump. Crypts do this underground via runners 5-15 cm out. | 1 per 0.3-0.6 Time, hop 10-80 mm; crypts further | Clump gets more crowns (use `crowns`) then separates |
| **Mat / cushion spread** | Java moss, sphagnum, Monte Carlo, hairgrass (as well as runner) | Edge of the mat advances continuously, no discrete daughter, attached to the surface it started on. Moss on wood climbs wood. | Footprint radius grows with Time at a per-species rate | Smooth patch growth (`spread` or footprint radius, no new Items) |
| **Floater multiplication** | Red root floaters, salvinia, frogbit, water lettuce | Exponential doubling at the surface, limited only by nutrients and surface area; frogbit and lettuce send stolons, redroot and salvinia fragment. | doubling time ~0.1-0.2 Time at 'ferts', slower in low-tech; capped by surface area | A growing cover that fills the water line, thicker in the middle |
| **Tuber / bulb (offsets from a bulb)** | Tiger lotus | Bulb sends up new shoots, plants bud off daughter bulbs in the substrate | 1 per ~0.6 Time, hop 100-250 mm | Second plant appears beside the first, then more |
| **Vine / trailing nodes** | Pothos, creeping fig, burro's tail | Node roots wherever it touches moist ground; burro's tail drops leaves that root. | continuous along the stem; leaf drop 1 per 0.4 Time | Longer vine that roots where it touches (`trail` already) |

Light, CO2 and ferts scale all of these through the existing `GrowFeed` rate; shaded areas could slow it (open question
from lane GR3: shaded plants grow slower, from the light map).

## Encroachment and crowding (the interaction rules)
1. **Footprint**: each plant covers a circle (spread, grown with growth and propagation). Two plants whose circles overlap
   compete.
2. **Competition**: the taller / faster species wins the contested area; the loser's growth cap is reduced in proportion to
   the overlap (a carpet under a sword stays small; Vallisneria in front of a rosette suppresses it).
3. **Light shading**: tall stems shade low plants (carpets die back under dense stem forests).
4. **Niche limits**: a rhizome plant stays on its hardscape; moss follows wood; floaters stay at the surface; stem plants
   root anywhere; nothing roots on glass.
5. **Space caps**: daughters land inside the tank and on the right surface; if the area is full the plant gets denser or
   taller instead of spawning (Time 1 = everything overgrown, per the existing definition).
6. **Hardscape and equipment**: runners go around rocks and cannot pass through them (cheap version: reject candidate
   positions inside a rock or wood).
7. **Algae**: a plant with no light drops growth, which couples to the algae view.

## How it plugs into the existing code (proposal)
Time runs both ways, so daughters must be **derived, not stored**, while previewing:
- Add `PLANT3D[type].grow.prop: { mode: 'runner'|'offset'|'rhizome'|'mat'|'float'|'bulb'|'cuttings', rate, hop, cap }`
  (name clashes with the existing `grow.prop` leaf-proportion flag, so call it `breed`).
- A pure function `daughtersAt(item, t, feed, tank)` in a new `scene/propagate.ts`: deterministic from `item.seed` and Time,
  so scrubbing is stable (the n-th daughter always lands in the same direction and distance, and appears when parent
  growth * rate passes n).
- Daughters render as extra plant items drawn with the normal reveal path (they carry their own `planted`/`growth`, born
  at growth 0 when the parent reaches threshold k). They are NOT saved in `s.items` during a preview; `endGrow` commits
  them as real Items with `parent` set (one new optional field, no scene version bump if absent = no parent).
- Mat and float spread need no new Items: grow `spread` / footprint with Time.
- Competition is a second pass: after daughters are placed, for each overlapping pair reduce the loser's `growth` ceiling.
  Costs O(n²) in plants; use a coarse grid if a dense tank gets over ~200 plants.
- Perf: reuse the GR4 GPU reveal path and the worker prebuild; a daughter is just an instance of an already built species
  mesh at a new position (cheap), avoid rebuilding per Time step.

## Decisions I need from you
1. **Preview or write**: when you press "keep", should daughters become real plants you can select, move, delete (my
   suggestion), or stay a visual only?
2. **Strictness**: realistic and a little random (runners go where they like) vs deterministic and tidy (daughters in a ring)?
3. **Competition**: include shading and suppression in v1, or only spawning and footprint growth first (my suggestion:
   spawning first, then competition as a second step)?
4. **Maximum plant count** per tank, so Time 1 on a dense planted tank doesn't mean 500 items?
5. Which species do you most want right first? (My suggestion: sag / vallisneria / hairgrass runners, crypt pups,
   floaters, moss mat, stem side shoots.)

## Decisions (Nathan, 2026-10-16: "go with your suggestions")
1. Keep writes daughters as real Items (selectable, movable, deletable) with an optional `parent`; a preview derives them.
2. Realistic with seeded randomness (deterministic per seed so Time scrubs stably).
3. Spawning and footprint growth first (v1); competition (suppression, shading) is step 2.
4. A per-tank plant cap (suggest 250 items); past it, plants get denser/taller instead of spawning.
5. First species: sagittaria / vallisneria / hairgrass runners, crypt pups, floaters, moss mat, stem side shoots.
