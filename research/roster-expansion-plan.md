# Roster expansion plan (R139, Nathan 2026-11-18)

Source: Nathan pasted a roster review on 11-18 (an outside write-up based on species-list.md). Starting point: 115 species at build 2360. Target: about 150–170. Choose additions by how many good, feasible, welfare-appropriate tank designs they enable, not by count.

## Already in the app (check before building)
- **Varieties:** src/data/forms.json (CM3) already has colour and fin forms for betta, guppy, platy, molly, swordtail, angel, discus, danio, tiger barb, goldfish, cherry shrimp and black skirt. Phase 3 extends this system rather than building a new one.
- **Corals:** src/scene/items.ts and src/render/coral3d.ts already have corals as placeable plants. Phase 2's coral list is a gap check against what's there.

## Phase 1: freshwater gaps (15, in priority order)
1. Endler's livebearer
2. Three-spot gourami (blue, gold and opaline forms)
3. Common pleco (welfare: true adult size)
4. Glowlight tetra
5. Convict cichlid
6. Electric blue acara
7. Clown killifish (first killifish)
8. Peacock gudgeon
9. False julii corydoras
10. Neon dwarf rainbowfish
11. Firemouth cichlid
12. Salt-and-pepper corydoras
13. Clown pleco
14. Yoyo loach
15. Glass catfish

Secondary: black neon tetra, lemon tetra, Congo tetra, emerald dwarf rasbora, *Neolamprologus multifasciatus*.

## Phase 2: marine
- **Fish:** tailspot blenny, yellowtail blue damselfish, pajama cardinalfish, orchid dottyback, lawnmower blenny, flame angelfish, foxface rabbitfish, kole tang.
- **Next:** percula clownfish, Midas blenny, yellow coris wrasse, clown gobies.
- **Invertebrates:** trochus, nassarius and cerith snails; emerald crab; peppermint shrimp; pistol shrimp.
- **Coral gap check:** zoanthids, mushrooms, green star polyps, toadstool leather, Duncan, hammer, torch. Each needs light, flow, placement, growth, sting reach and chemistry.

## Phase 3: varieties
Base species → variety → look, plus a biological override only where the variety really changes care (for example, fancy goldfish body forms).
- **Guppy:** cobra, mosaic, dumbo-ear.
- **Betta:** halfmoon, crowntail, plakat.
- **Goldfish:** fantail, oranda, ranchu, black moor.
- **Neocaridina:** blue dream, yellow, orange.
- **GloFish:** colours.
- **Three-spot gourami:** forms, as in Phase 1.

## Phase 4: specialty tanks
- **Shell-dweller colony:** *N. multifasciatus*.
- **Predator / primitive:** Senegal bichir, black ghost knifefish.

## Phase 5: data consistency
Audit the generic labels (Peacock cichlid, Fancy goldfish, Black molly). Attach care and compatibility rules at the right level: species, group, hybrid or variety.

## How each species gets built
Each species needs a species.json row with sources (the ratchet must not go up), stock and compat data, fish art in the crisp tank-render style (not cartoony), behavior or habits (FB3 tables), and picker group and origin.

Art for every species follows `research/species-art-method.md`: real reference photos first, a written look, a side-by-side check.
