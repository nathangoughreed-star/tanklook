# PV1: Plumbing view mockups (R100)

Open the `.html` files in a browser. All are self-contained (inline SVG, CSS, a few lines of JS). Mockups only, nothing in `src/` changes. `build.mjs` generates the HTML, `shoot.sh` makes the PNGs (headless Chrome).

## Files and shots (`research/screens/PV1/`)
| Mockup | HTML | 1280 shot | 1280 + losses | 390 shot |
|---|---|---|---|---|
| 1 HOB planted 20 long | `01-hob-20-long.html` | `01-hob-20-long-1280.png` | `...-1280-losses.png` | none (landscape only) |
| 2a Canister 40, side cutaway | `02a-canister-40-cutaway.html` | `02a-canister-40-cutaway-1280.png` | `...-1280-losses.png` | `...-390.png`, `...-390-losses.png` |
| 2b Canister 40, flat | `02b-canister-40-flat.html` | `02b-canister-40-flat-1280.png` | `...-1280-losses.png` | `...-390.png`, `...-390-losses.png` (own portrait drawing) |
| 3 Reef 75 | `03-reef-75.html` | `03-reef-75-1280.png` | `...-1280-losses.png` | none |

Each page shows the app frame (header, rail, a **Tank | Plumbing** switch at the top left of the viewer, Pause and "Show losses" at the bottom right). The page respects `prefers-reduced-motion` (starts paused). `#losses` or `#pause` in the URL pre-sets those two.

## Layout pick for mockup 2: **flat (2b)**
- It is the only one that works at 390 px. The cutaway shrinks to unreadable text on a phone (see `02a-...-390.png`); the flat one has a real portrait layout where the same loop reads top to bottom.
- It keeps the part Nathan finds cool in one glance: canister, then CO2 joins, then heat joins, then clean water goes back to the tank. Each box has room for its label and GPH / watts.
- The cutaway is prettier and tells "the canister lives in the stand", and it matches the 3D view more. **Open idea:** flat as the default, cutaway as a desktop-only "Realistic" toggle. That is double the drawing work, so build flat first.
- Mockup 1 and 3 use the cutaway because a HOB on the rim and a sump with sections are physical places; a flat sump with sections would also work if we only build flat.

## Legend
- Blue dashed, bright = clean water. Duller grey-blue = dirty water on its way to the filter (and the tank circulation arrow fades from bright to dull).
- Green dots = CO2. Joins the water at the reactor, rides the return as dots. Out again through two small faint green arrows: plant uptake (down into the plants) and off-gassing (up at the surface).
- Red dots = heat. Joins at the heater, rides the return. "Show losses" adds faint red arrows out through the surface and the glass.
- Amber-brown = skimmate. Cyan = cooling (optional chiller). Dashed outline = optional gear.
- Chips at the top give the plain sums: turnover = rated GPH / net gallons, heater W/gal, return GPH vs the overflow's rating (green / amber pill). Gear labels use real catalogue names and numbers (AquaClear 50 200 GPH 9 W, Fluval 307 303 GPH 16 W, Eheim Jäger, Sicce Voyager 2 800 GPH). Net gallons (18 / 38 / 95 system) are my estimates; the build would use the tank model.

## Notes on what I invented
- The in-line CO2 reactor and in-line heater are generic boxes (no catalogue entry yet; R99 / IL1 builds the real gear). Heater 200 W and the 5 lb CO2 cylinder are placeholders.
- Mockup 3's return (800 GPH) is deliberately over the overflow's 700 GPH rating so the amber badge shows. A passing case would be green.
- The real app has no tab strip over the viewer today (the header has a View menu). I drew a Tank | Plumbing segmented control in the app's `.seg` style at the viewer's top left; where it really goes is a question below.

## Open questions for Nathan
1. **Flat or cutaway for the build?** (pictures: `02b-canister-40-flat-1280.png` vs `02a-canister-40-cutaway-1280.png`, and the phone pair `02b-...-390.png` vs `02a-...-390.png`.) My pick is flat first.
2. **Heat losses: keep the toggle or drop it?** (`02a-canister-40-cutaway-1280-losses.png` vs `02a-canister-40-cutaway-1280.png`.) They look busy when on; I left them off by default.
3. **Where does the Plumbing switch live?** Over the viewer top left as drawn, as an item inside the View menu, or as a rail section. (`03-reef-75-1280.png`)
4. **Cooling:** the chiller is drawn as optional cyan in mockup 3. Is that wanted, or heat only? (`03-reef-75-1280.png`)
5. **Real flow vs rated GPH:** a canister delivers well under its rating once media loads and hoses add head. Show only "rated" (as drawn) or also an "about 60 % real" estimate? (chips in `02a-...-1280.png`)
6. **Reef amber badge:** is "return GPH over the overflow's rating" the right warning to show, or should the badge speak in turnover terms only? (`03-reef-75-1280.png`)
