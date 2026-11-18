# Fish habits, homes and activity (FB3, R118, 2026-11-18)

Nathan's observation (reef tank: royal gramma, firefish, yellow watchman goby, two ocellaris): all of them swim the same way and fill
the same space. Cause: no marine fish is in `fishBehavior.ts`, so each falls to the default free-roam (goal-picking over the whole
tank, mid/low band). Real fish differ in four things, and the sim has none of them as a concept yet:

1. **Home** — most fish are tied to a place (cave, bolt-hole, burrow, host, plant clump). Open-water schoolers are the exception.
2. **Range** — how far from that place they go.
3. **Posture** — how they hold the body relative to the bottom and the rock (perched, hovering low, hugging, upside down, schooling).
4. **Actions** — the little repeated things: dart in and peek out, peck, patrol, flick, hop, sift.

This document covers phase 1: the behaviour table (section 2) and the sim proposal (section 3). Nothing is built.
Sources are care sheets and field notes, cited as tags: [FB] FishBase species pages, [RC] Reef Central / Reefs.com species profiles,
[LR] LiveAquaria / Marine Depot care sheets, [Wi] Wikipedia species pages, [SF] Seriously Fish, [PF] Practical Fishkeeping,
[Sh] Shrimp-goby symbiosis literature (Karplus 1987, Alpheus/Cryptocentrus). Numbers are judgement (rates = events per minute while
awake), same convention as FB1/FB2: they set how often, not what is true.

## 1. Vocabulary

**HOME** (where it returns to)

| tag | meaning |
|---|---|
| `crevice` | a cave, overhang, ledge or rock crevice; the fish ties to a rock face |
| `bolt` | a bolt-hole it dives into when startled: rock crevice or sand burrow mouth |
| `burrow` | a sand burrow at a rock edge it keeps open (gobies) |
| `host` | a host anemone / coral / urchin, or, without one, a patch (a corner, a rock top, a stone) |
| `plants` | a plant clump / wood root thicket |
| `wood` | wood or a rock top as a perch |
| `open` | no fixed home; schooling or free-cruising (leash = the tank) |
| `surface` | holds under the surface / floating plants |

**RANGE** (leash from home, body lengths L): `tight` 3-6 L, `medium` 8-15 L, `wide` 20+ L, `tank` = no leash.
Body lengths so a 1 in fish and a 12 in fish both scale; clamp so the leash is never bigger than the tank.

**POSTURE**

| tag | meaning |
|---|---|
| `perch` | sits on the bottom on its pelvic/pectoral fins, body held off the sand, head up; moves in hops |
| `hoverLow` | hangs 0.5-2 L above the bottom or rock, nearly still, pectorals sculling; moves in short glides, never scooting along the floor |
| `hug` | follows a rock face at about 0.5 L from it with the belly toward it; rolls to any angle, including upside down under a ledge |
| `mid` | free water column, no surface alignment |
| `station` | holds a spot in the current, facing it, tail nearly still |
| `school` | tight, aligned |
| `cling` | pressed on a surface (glass, rock, leaf), any angle |
| `lie` | rests on the bottom on its belly or side (loaches, goldfish at night, ambushers) |

**ACTIONS** (rate = per minute awake; dur seconds)

- `dart`: dive to home and hold flush (2-40 s), then peek out: nose past the opening, then back out. Trigger: timer or a close neighbour / glass tap.
- `peck`: approach a rock/glass/plant point, nose to it, 2-6 quick bites (0.2 s each), drift on.
- `patrol`: shuttle back and forth along one 3-8 L stretch (a territorial lap), 2-5 laps.
- `flick`: stationary; raise and drop the dorsal fin (firefish) or the whole body wiggle (clownfish nuzzle). Pure pose, no travel.
- `hop`: 1-3 L move then stop; repeated with 3-15 s stills.
- `sift`: mouthful of sand, spit it, 1-2 L away (gobies, cichlid males building).
- `graze`: a run of pecks along a surface while moving slowly (tangs, SAE, plecos).

**ACTIVITY** 0..1: scales how much of the day is moving versus holding (multiplies the species' existing cruise and rest shares).

## 2. Behaviour table

Existing FB1/FB2 tables (HOVER, STYLE, DIG, BENTHIC) stay and keep doing their jobs (fin fanning, pulse-glide, burrowing, resting).
HABIT is the new layer above them: it decides *where* and *what next*; they decide *how it looks while doing it*.
Fish only. Inverts (shrimp, crabs, crayfish, snails) belong to `arthBehavior.ts`; herps are not swimmers (see 2.9).

### 2.1 Marine fish (the 11; the ones that were wrong on live)

| species | HOME | RANGE | POSTURE | ACTIONS (rate/min) | ACT | Source / note |
|---|---|---|---|---|---|---|
| **Royal gramma** `royalgramma` | `crevice`: a cave mouth or under an overhang; claims one hole | tight-medium (6-10 L, ~20 in at 3 in length; rarely the whole tank) | `hug`: belly toward the rock, **often upside down** under ledges and in caves, head to the opening; flat-calm at rest | dart in/peek out 2-3; hover at cave mouth facing out between darts; nip the rock 1-2; short out-and-back trips up to 10 L then straight back | 0.5 | [LR][RC] "constantly in/out of caves"; field: Gramma loreto lives on walls, ledges and under overhangs, often seen upside down [FB][Wi] |
| **Firefish goby** `firefish` | `bolt`: a rock crevice or sand hole; one per fish (pair may share) | tight (3-5 L from the hole) | `hoverLow`: hangs 2-5 in above the hole, **faces the current**, tail still, head slightly up | flick dorsal 6-10 (raised-fin spike, 1 s up/down); **dive** headfirst to the hole when startled; peek back 3-10 s later; short glides up to 3 L | 0.35 | [LR][RC] "hovers over its burrow, flicks the first dorsal, dashes into it when threatened" |
| **Yellow watchman goby** `watchman` | `burrow`: sand under a rock edge, often with a pistol shrimp | very tight (1-3 L from mouth) | `perch`: **on the sand on the pelvic fins at the burrow mouth, still**, body on the sand, head up, eyes up; no cruising | hop 1-2 L and back, 1 per 15-30 s; sift sand 1-2; retreat into the burrow when something big comes close; tail-flick (shrimp signal) 1-2 | 0.15 | [LR][Sh] Cryptocentrus cinctus: sits at the burrow mouth and rarely leaves it; the shrimp excavates, the goby keeps watch |
| **Ocellaris clownfish** `ocellaris` | `host`: a bubble-tip anemone or hammer/torch coral if the tank has one; else **a patch**: a rock top, a corner, the best low overhang; pair shares one | tight (3-6 L; stays inside the host's reach) | `hoverLow` in and around the host: a **wriggling** body, pectoral paddling, little tail; swims with the pectorals, not the tail; pair side by side | `flick` (nuzzle/wiggle in the tentacles) 3-6; peck at the host's base or tend rock 2-4; short out-and-back to 8 L then home; chase off a neighbour (nip) 0.2 | 0.4 | [FB][RC][LR] Amphiprion ocellaris: "stay within a short distance of the host"; mated pairs tend one patch; poor sustained swimmers |
| **Yellow tang** `yellowtang` | `open`/rock: the rockwork is its pasture; sleeps wedged in a crevice (night, not drawn) | wide-tank (whole tank, but 70 % of its time along rock edges) | `mid`-`hoverLow` along rock: body parallel to the rock face, 0.5-1 L off | **graze**: long runs of pecks, 20-40 per min, drifting along rock faces; swim a full lap of the tank 1-2; stops to hover 3-10 s | 0.85 | [LR][RC] herbivore grazing the whole day; Zebrasoma flavescens works reef flats |
| **Blue tang** `bluetang` | `open`: cruises open water; **retreats into branching rock/coral when startled** (hides, wedges) | wide (tank, biased mid) | `mid`, stronger tail than other tangs; hovers at rock arms | graze 10 pecks; cruise lap 2-3; dart to cover 0.5 on startle, then peek | 0.8 | [LR][FB] Paracanthurus hepatus: zooplankton and algae, hides in branching coral |
| **Banggai cardinalfish** `banggai` | `host`: hover cluster among a long-spined urchin / branching coral / gorgonian / any rock arm; pair-group stays together | tight-medium (5-8 L) | `hoverLow`: **upright, slow drift, hanging**, fins fanned, near-zero speed | slow turn 6-10 (re-aim only); barely any dart (one per few min); hovers by the host more at lights-out | 0.25 | [LR][FB] Pterapogon kauderni: hovers in the spines of urchins; slow; nocturnal feeder |
| **Six-line wrasse** `sixline` | `crevice`: a rock hole it dives into when scared, and sleeps in sand under a cocoon (not drawn) | wide (whole tank, along rock) | `hug`/`mid`: **fast darting between rock faces**, short pauses to peck the rock | `graze`: dart-stop-peck, 15-30 pecks per min; dart to hole 0.6; fast laps along the rock 2-3 | 0.9 | [LR][RC] Pseudocheilinus hexataenia: hunts copepods and flatworms over rock all day |
| **Blue-green chromis** `chromis` | `open` (a school hovering **above** branching rock/coral, dropping into the branches when startled) | medium (stays near the school's rock, 8-12 L above it) | `school`: tight, hovering, facing the current | whole school: hover 15-30 s, dart in a single turn 2-3; dive to cover (all) when startled 0.3 | 0.65 | [LR] Chromis viridis: schools above branching Acropora, sinks into it on alarm |
| **Coral beauty** `coralbeauty` | `crevice`: its own piece of rockwork, one patch at a time | medium (a rock area, ~8 L) | `hug`: **rock-facing**, tilts sideways to the face as it grazes, vertical posture on faces; in and out of crevices | graze 15 pecks; slip in/out of a crevice 1-2; face-the-glass hover 1 | 0.55 | [LR][RC] Centropyge bispinosa: tied to rockwork, picks algae and film |
| **Mandarin dragonet** `mandarin` | `crevice`/rubble: a rock-and-rubble field | medium (a pasture, 10 L) | `hoverLow`: **hovers 1-2 cm over rock or sand without scooting**, pectoral-driven, short hops then still, never the open water | peck 10-20 (copepods); hop 1-3 L then stop 2-6 s; tuck under rock when startled | 0.4 | [LR][RC] Synchiropus splendidus: hops over rubble, pecks pods, a poor swimmer |

### 2.2 Freshwater open-water schoolers

| species | HOME | RANGE | POSTURE | ACTIONS | ACT | Note |
|---|---|---|---|---|---|---|
| zebra danio `danio`, white cloud `whitecloud`, tiger barb `tigerbarb`, bala shark `balashark`, black skirt `blackskirt` | `open` | tank | `school` mid-upper/top; fast, constant | pulse-glide (STYLE); occasional split-and-rejoin; barbs nip each other 1; bala: long straight runs | 0.9 | [SF] |
| neon `neon`, cardinal `cardinal`, green neon `greenneon`, harlequin `harlequin`, rummynose `rummynose` | `open`: loose school near plants | tank (wide) | `school` mid; **rummynose station-holders: tight and still**, harlequin slow | pulse-glide mix, hover; rummynose: very tight hover with synchronized turns | 0.5-0.6 | [SF] |
| ember `ember`, chili `chili`, strawberry `merah`, exclamation `exclamation`, dwarf spotted `dwarfrasbora`, CPD `cpd` | `plants`: dense stems or floating roots; stay inside them | medium (3-8 L round the plant) | `school` lower-mid, in and out of vegetation; CPD: **hovers low and flits, pauses a lot** | pulse-glide short; dart into plants 1; hover 10-20 s | 0.45 | [SF] CPD hides in grass, still for long |
| hatchet `hatchet` | `surface` | medium (a 6 L patch under the cover) | `hoverLow` just under the surface, belly up to the plants; **never leaves the top inch** | rare 1 s darts; jump on startle (not drawn) | 0.3 | [SF] |
| cherry barb `cherrybarb`, dwarf pencilfish `dwarfpencil` | `plants` | medium | mid, slow; pencilfish at an angle, head up | hop-glide; peck at plant leaf 2 | 0.4 | [SF] pencilfish hang in the roots |
| boesemani `boesemani` | `open` | tank | mid, leisurely cruise | graze at wood 1 | 0.55 | [SF] |

### 2.3 Livebearers and labyrinths

| species | HOME | RANGE | POSTURE | ACTIONS | ACT | Note |
|---|---|---|---|---|---|---|
| guppy `guppy`, platy `platy`, molly `molly`, swordtail `swordtail` | `open`/`plants` (males follow females; platy/molly also graze) | tank | `mid`-upper; swordtail faster | **graze** at algae on rock, glass and plants 3-6; males chase 1 | 0.55 | [SF] |
| betta `betta` | `wood`/`plants`: a leaf or ledge as a perch; claims a patch | medium (10 L) | `hoverLow`-`mid`; **resting on a leaf/plant top** (cling), slow fin-fanning | patrol 1-2 along one stretch; surface gulp 0.4; flare at the glass 0.3; rests 10-30 s | 0.35 | [SF] |
| gouramis (`dwarfgourami` `honeygourami` `sparklinggourami` `croakinggourami` `gourami`) | `plants` / surface | medium-tank | `hoverLow`-`mid` upper; feelers out, touches leaves | explore a plant 2-3; surface gulp 0.5; slow lap 1 | 0.4 | [SF] |

### 2.4 Cichlids

| species | HOME | RANGE | POSTURE | ACTIONS | ACT | Note |
|---|---|---|---|---|---|---|
| kribensis `kribensis` | `crevice`: a cave (pair's) | tight-medium (6 L) | `hoverLow`, upright, tail-ups at the cave mouth | dart in/peek out 1-2; patrol 20 cm of floor 1; sift 1 | 0.45 | [SF] |
| gbr `gbr`, bolivian ram `bolivianram` | `host`: a flat stone or a patch of sand | tight (4-6 L) | `perch`-`hoverLow`; **pecks the sand and stones** | sift/peck 4-6; patrol 1; hop 2 | 0.4 | [SF] |
| cockatoo `cockatoo` | `crevice`: a cave (the female's); male patrols | tight-medium | `hoverLow`; male above, female in/out of cave | dart in/peek 1; patrol 1 | 0.4 | [SF] |
| mbuna: yellow lab `yellowlab`, demasoni `demasoni`, golden `auratus`, blue-nosed `labeo`, dogtooth `afra` | `crevice`: **a rock hole each**, then the rock pile | medium (8-12 L, the rock stack) | `hug`: rock faces, in and out of holes, **graze the rock all day** | graze 15-30 (aufwuchs); dart in/peek 2; patrol the rock edge 1; chase 1 | 0.8 | [SF][FB] mbuna rock-dwellers |
| peacock `peacock`, kadango `kadango` | `open`/rock edge: males hold a patch of sand by the rocks; kadango hover mid-water | wide-medium | `mid`; males perched over their sand patch 1 | sift 2 (spawning pit), patrol 1, hover | 0.5 | [SF] |
| Livingstone's `livingstonii` | `open`: **ambush**: lies on the bottom/at a rock, motionless, then lunges | wide | `lie`/`perch`: waits as if dead (face down, tilted) | lie-in-wait 20-60 s; slow patrol 1; strike (not modelled) | 0.25 | [SF] |
| angel `angel`, discus `discus` | `plants`/`wood`: vertical stems or driftwood | medium | `mid`: hangs upright, slow glides, **against vertical structure** | slow patrol along stems 1-2; hover 10-20 s | 0.35 | [SF] |
| oscar `oscar` | `wood`/rock: a favourite stone or corner, follows the glass | medium | `lie`/`hoverLow`; **big, slow**, rests nose-down, rearranges stones | hover 30 s; slow lap 1; dig/move gravel 0.5 | 0.3 | [SF] |

### 2.5 Goldfish

| species | HOME | RANGE | POSTURE | ACTIONS | ACT | Note |
|---|---|---|---|---|---|---|
| fancy `goldfish`, comet `comet` | `open` | tank | `mid`-`hoverLow`; they forage the bottom head-down in gravel | `sift` gravel 4-6 (head-down, tail-up), slow laps; comet faster, more cruising | 0.5 / 0.7 | [PF] |

### 2.6 Bottom dwellers (FB2 covers cory rest and kuhli burrow; this adds home and clinging)

| species | HOME | RANGE | POSTURE | ACTIONS | ACT | Note |
|---|---|---|---|---|---|---|
| corys (`bronzecory` `pepperedcory` `pandacory` `sterbai` `pygmycory`) | `open` shoal floor | tank (shoal) | `perch` | as FB2 | — | **no change** |
| kuhli `kuhli`, clown loach `clownloach` | `crevice`/`burrow` | medium | kuhli as FB1; clown loach `lie` (sideways, even **upside down**) in a pile near a cave | clown loaches: group rest then a lap; dart into cave 1 | 0.4 | [SF] |
| bristlenose `bristlenose`, otocinclus `oto` | `wood`/`plants`: a root, leaf or glass patch | medium | `cling`: **stuck to a surface at any angle, still**; oto on a leaf | graze 6-10 slow, hop to next patch 1; bristlenose hides in a cave by day | 0.3 | [SF] |
| SAE `sae`, rainbow shark `rainbowshark`, red-tail shark `redtailshark` | `wood`/`crevice`: a territory (one cave or log) | medium (10 L) | `perch` on the pectorals on a rock top; SAE angled head-down | graze 6; patrol the territory 1-2; chase 0.5; **rainbow/redtail return to the cave between laps** | 0.5 | [SF] |
| hillstream `hillstream` | `cling` to a rock/glass | tight | pressed flat; **short hops, then still** | hop 1; graze 3 | 0.2 | [SF] |
| Malawi synodontis `syno` | `crevice`: caves (daylight), swims **upside down** along ledges at dusk | medium | `hug`: belly to the ceiling often; cave by day | dart in 1; graze rock upside down 3 | 0.35 | [SF] Synodontis njassae |

### 2.7 Pea puffer `peapuffer`

`plants` home, `hoverLow`, medium range 6 L, stalks: slow glide-stop, 1 s still head-down at a hunt (hop 3, peck 4 at the plant/rock film). ACT 0.5. [SF]

### 2.8 Where the three of Nathan's marine fish differ (the picture)

| | royal gramma | firefish | watchman | clownfish |
|---|---|---|---|---|
| where | at the cave mouth, any rock face | **above** the bolt-hole, 2-5 in up | **on the sand** at its burrow | in/near its host patch |
| how it moves | out and back, in sudden darts | hangs, then **dives** | **hops** and stays | wiggles in place |
| orientation | belly to rock, sometimes upside down | head up into current | upright perched on fins | upright, rocking |
| range | 6-10 L | 3-5 L | 1-3 L | 3-6 L |

### 2.9 Out of scope here

Axolotl, ADF and the herps live in their own tables (axolotl = `lie`, mostly still, gill fanning; ADF = FB2 resting). Not changed.

## 3. How the sim gets it (proposal)

### 3.1 New data: `HABIT` in `fishBehavior.ts`

One table keyed by species id plus ~12 archetype presets (`ROCKRESIDENT`, `BOLTHOVER`, `BURROWPERCH`, `HOSTPATCH`, `GRAZER`, `SCHOOLOPEN`, `PLANTHIDE`, `SURFACE`, `CLING`, `LIE`, ...) so a species row is one line. Per row:

```ts
export interface HabitSpec {
  home: 'crevice' | 'bolt' | 'burrow' | 'host' | 'plants' | 'wood' | 'open' | 'surface';
  leash: number;            // body lengths from the home anchor; Infinity = the tank
  post: 'perch' | 'hoverLow' | 'hug' | 'mid' | 'station' | 'school' | 'cling' | 'lie';
  hugGap: number;           // clearance to the rock face, in body radii (0.6 snug; 1.5 loose)
  orient: number;           // 0..1: how far the belly turns to the face (0 = upright always; 1 = any roll, incl. upside down)
  acts: Array<{ k: 'dart'|'peck'|'patrol'|'flick'|'hop'|'sift'|'graze'; rate: number; dur: [number, number] }>;
  act: number;              // 0..1 activity
}
```

`SwimmerSpec` gets `habit?: HabitSpec & { home: V3 (resolved) }`, resolved in `render/build.ts` exactly as HOVER/DIG are; absent = unchanged.

### 3.2 Sim: a thin layer over what exists

`swimSim.ts` already has per-fish `goal`, `mode` (MOVE/REST/HOP), `pickSub` styles and `hov/dig` channels. Add:

- Per fish arrays: `homeX/Y/Z`, `leash`, `post`, `actT` (next action time), `actK` (current action), `actP` (phase), `roll target`.
- **Goal picking** (`pickGoal`) gets a leash: when `leash` is finite, candidates are drawn in a disc of radius `leash*len` around home; the *nearest-valid* wins rather than farthest. That one change already makes clownfish stay put and watchman stay on its patch.
- **Action machine**, evaluated at goal arrival: draws the next action by rates (seeded `R()`), runs it as a short script on top of the normal steering:
  - `dart`: goal = home point (flush to the surface), hold N s, then goal = peek point 1-2 L out, hold, resume.
  - `peck`: goal = a point on the nearest solid at `hugGap`, snout toward it, pitch down 20-40°, 2-6 bites as a small `bite` oscillation of pitch (reuse `kick`).
  - `patrol`: two goals 3-8 L apart along the nearest surface, alternate.
  - `flick`: stay; sets a new pose channel `flick` 0..1 (dorsal fin raise; falls back to `fan` if the art lacks a dorsal rig).
  - `hop`/`sift`: goal 1-3 L away, then `mode=REST`; sift adds a head-down dip at the end (existing DIG dip).
  - `lie`/`perch`: pin `y` to `floor + rest`, speed 0, only breathing (existing BENTHIC rest channel).
- **Posture**: `hoverLow` clamps the body band to 0.5-2 L over the nearest floor or rock; `hug` takes `grad` from `field.clearance` and rolls the body so belly = −grad: roll = angle between belly and −grad, limited by `orient`. Under a ledge `grad.y < 0` so the roll goes to ~180° = upside down. Rolls are low-passed (existing `rollS` filter) so it turns, not flips.
- **Startle** (one shared timer, seeded): fish with `dart` run one immediately; firefish dive, tangs bolt to cover.
- Activity `act` multiplies the existing `pace` and the rest share, so tangs ~0.85 and watchman 0.15 get different cruise from the same code.
- Everything stays seeded and allocation-free (typed arrays), same as FB1/FB2. No new randomness calls inside existing branches (so existing freshwater tank motion does not shift when `habit` is absent).

### 3.3 How home is chosen

At sim start (and on scene change), `build.ts` hands the sim a list of **anchors** (new, optional on `SwimField`): one per hardscape / coral / plant item: `{ kind, variant, cx, cy, cz, top, hx, hz, yaw, hasOpening }` (from `swimPrims`, the same prims). Home = one anchor point for the fish, picked by `HabitSpec.home`:

| home | candidate anchors, in order | point on the anchor |
|---|---|---|
| `crevice` | cave (opening side), stone with an overhang (a point under its top edge, `clearance` above < 2 L and free to the side), wood arch, coral base | the mouth or under-ledge point at `hugGap` |
| `bolt` | a rock/coral base, or the sand beside a rock | a point 2-5 in off the base (for `hover`), bolt point = on the base |
| `burrow` | the sand edge of a stone (floor within 1.5 L of a rock) | the sand tip at the rock's foot |
| `host` | anemone/coral item (clowns, banggai); else the highest low stone top; else a corner | the item's top-centre minus a margin |
| `plants` | the biggest plant clump / wood | its base-centre |
| `wood` | a wood item or a stone top | its top |
| `surface` | a floater, else the surface under a plant | surface patch |
| `open` | none (leash = tank) | — |

Rules:
- Fish of one species/pair share a home for `host`/`open`/school; every other fish takes the **least-used** matching anchor so six mbuna spread over the rock pile, and gramma and firefish do not share.
- A species with the same home type competes: marks the anchor used; later fish fall to the next or reuse if none.
- **No cave in the tank** (a bare or plants-only tank): fall through
  `crevice → stone/wood → coral → plant clump → back corner of the tank 15 % from the glass` for `hug` fish (which then hug the back glass, upright, belly to glass if `orient>0`); for `burrow`, a patch of sand with a visible small pit (reuse the DIG dig animation) mid-rear; for `host` with no coral, a patch at the best low spot (corner, rock top); for `open`, no home. A tank with no solid at all still works (leash falls back to the open tank, fish behave as before).
- **Tank has no sand** (rock/gravel, bare glass bottom): `burrow` and `bolt` points go to the rock base; watchman then perches on the floor at the rock foot.

### 3.4 Known limits (to say up front)

- `swimField` caves are solid boxes (no swim-through) and rocks are bounding boxes, so "dart into the cave" will be "dart flush to the cave's mouth face and hold" and a rock face may sit a little proud of the visible rock (the visible mbuna/reef rocks in Nathan's picture are irregular). Suggest hugging at 0.8-1.2 radii (not tighter) and checking a real shot; if it still looks floating, add a tighter hull (a two-box approximation) later.
- Upside-down and sideways hugging needs the roll to reach ±180 on the fish mesh; the viewer already applies roll as a Euler angle, but the dorsal fin / art may look odd upside down: check royal gramma and syno on a shot.
- The `flick` pose channel needs a dorsal-fin hook in the fish shader/art (the existing `fan` is pectorals); the fallback is a small body shudder so it still reads as a flick.
- Rates are judgement; Nathan tunes by eye.

### 3.5 Phasing (after a yes)

1. `HABIT` table + archetypes + `SwimmerSpec.habit` + `swimField` anchors + home pick + leash in `pickGoal`. (Tangs graze, mbuna hold rock, gramma hold a cave; the minimum that separates the picture.)
2. Postures (`hoverLow` height, `hug` roll, `perch` hops) + `dart`/`peck`/`patrol`.
3. `flick`/`sift`/startle dive and the per-species archetype tuning.
Tests: seeded swim tests for leash (distance from home in 60 s) and for upside-down (`roll` > 120° under a ledge in a fixture), plus the existing swim tests unchanged for tanks with no `habit`.

### 3.6 Mock diagram (top = side view, per species)

```
royal gramma         firefish              watchman             ocellaris
   ____rock____        ~~> current           (eye up)             /\\/\\ host
  |  cave  <o  |        o>  (dorsal)           /o__              <o)~~~ tentacles
  |__upside__ o|         |  2-5 in         ___/__  hole(sand)     patch 3-6 L
  belly to rock         [bolt hole]
```

## 4. Questions for Nathan

1. Is "dart flush to the cave mouth and hold" (no actual disappearing) acceptable for phase 2, or do you want the cave's interior modelled?
2. Should the watchman shrimp pairing (an `alpheus` sharing the burrow) be shown? Not planned; a pistol shrimp isn't in the species list.
3. OK to leave the freshwater tables alone for now and use HABIT only where it adds (mbuna, plecos, kribs, goldfish)? Order of build: marine first.

## 5. Built (phase 2, 2026-11-18)

In: `HABIT` table (`fishBehavior.ts`: 11 marine fish, 5 mbuna, kribensis, cockatoo, GBR, Bolivian ram, rainbow and red-tail shark), `SwimmerSpec.habit`, `SwimField.anchors`, `swimHome.ts` (home picking: items first, back glass if nothing), and in `swimSim.ts` a per-fish action machine (dart / hold / peek, peck, patrol, flick, hop), leash-bound goals, belly-to-rock roll. Own random stream, so tanks without habit fish move exactly as before.
Decisions taken: dart = flush to the face and hold (answer 1); no pistol shrimp (2); freshwater otherwise untouched (3).
Not built: startle (a shared alarm that sends every darter in at once), sift, a real dorsal-flick rig (the flick is a body shudder), cave interiors, bristlenose / synodontis / peacock / goldfish / angel habits (bottom-zone upside-down needs the sim's floor rule relaxed first).
Known: with no anemone the clownfish hold at the top of the highest coral; hosts are picked from item kinds (anemone first, then any coral). Rates are first guesses for Nathan to tune live.
