# GS1: glass thickness solver and eurobrace optimizer (2026-11-13; request R30; Coordinator 24)

Engine only: `src/scene/glassSolver.ts`, tests `test/gs1-glass.test.ts`. No UI (custom tank maker = shell step 3).
`glassThickness()` in `physics.ts` is unchanged.

## 1. What it answers
`solveGlass(spec, opts)` takes a rectangular tank (interior L x D x H, water depth, default H - 1 in) and returns, per pane
(front, back, two ends, bottom): the smallest continuous thickness, the stock thickness it rounds up to, the bending
stress, deflection and achieved safety factor at that thickness, and whether stress or deflection governs.
Two modes: `uniform` (one thickness for every pane) and `perPane` (front = back; ends usually come out thinner).
`optimizeBrace(spec, opts)` tries brace geometries and returns three rows: no brace, best perimeter brace,
best perimeter + cross brace(s), each with per-pane thickness, glass weight, cost index and SF.

## 2. Method

**Each wall is a thin elastic plate (Kirchhoff, small deflection).**
- Span `a` = the pane's horizontal length (L for front / back, D for the ends), height `b` = H.
- Vertical edges and bottom edge: **simply supported** (silicone joints carry shear but little moment; this is the usual
  conservative assumption and the one the hobby calculators make).
- Top edge: **free** with no brace; with a eurobrace it is a free edge **carried by an edge beam** (the brace strip,
  spanning corner to corner); cross braces add **ties** that hold the top edge at zero deflection at their location.
- Load: hydrostatic, `p(y) = gamma (h - y)` below the water line, zero above. `gamma` = 9.81e-6 N/mm^3 fresh
  (62.4 lb/ft^3), 1.025x for salt.

**Solution: Levy series, exact for this plate.** With the two vertical edges simply supported,
`w(x, y) = sum_m Y_m(y) sin(m pi x / a)`, and each `Y_m` solves
`D (Y'''' - 2 a_m^2 Y'' + a_m^4 Y) = p_m(y)`, `a_m = m pi / a`, `p_m = (4 / m pi) p(y)` for odd m.
The load is piecewise linear in y, so each term is closed form: `(A + B y) e^{a y} + (C + D y) e^{-a y}` plus
`p_m / (D a_m^4)`. Boundary conditions per term:
- bottom (simply supported): `Y = 0`, `Y'' = 0`;
- water line: Y, Y', Y'', Y''' continuous;
- top, free with edge beam of stiffness `EI_b`:  `M_y = 0` -> `Y'' - nu a^2 Y = 0`;
  Kirchhoff shear `D (Y''' - (2 - nu) a^2 Y') - EI_b a^4 Y = -f_m` (f_m = tie line load). `EI_b = 0` is a free edge.
- top, simply supported (reference case): `Y = 0`, `Y'' = 0`.

`D = E t^3 / 12 (1 - nu^2)`. The stress is the largest principal bending stress `6 |M_1| / t^2` from
`M_x, M_y, M_xy` on a grid over the pane (61 terms, 33 x 25 points; converged to 4 digits, checked to 201 terms).
Cross-brace ties: superposition. Solve the water load, solve a unit tie load (spread over the brace width), pick tie
forces that make the top-edge deflection zero at each tie.

**Bottom.** Default (`bottomSupport: 'full'`): the tank sits on a flat, level stand or mat, so the glass carries almost
no bending; the uniform-load model would allow very thin glass, which is wrong in practice. Rule: **the bottom matches the
thickest wall** (common builder practice and Stillwell's article: "a bottom uniformly supported ... can use the same
thickness as the largest side"; it also has to survive point loads from rock, a stand that is not flat, and lifting).
`'perimeter'`: a framed tank on a rim; the bottom is solved as a plate simply supported on four edges under uniform
`gamma h`, same Levy solver.

**Brace strip check.** The brace strip is a horizontal glass beam (depth = strip width `w_b`, thickness `t_b`,
`I = t_b w_b^3 / 12`), simply supported at the corners, loaded by the wall's top-edge reaction. Its stress
`6 M / (t_b w_b^2)` must meet the same safety factor. Rotational restraint from the brace is ignored (conservative).
Cross braces are treated as rigid ties; the tie force (lbf) is reported so the silicone joint can be checked.

**Glass.** Annealed float (low-iron the same).
- Modulus of rupture **19.3 MPa (2800 psi)**: the value behind the hobby calculators (Stillwell / Hiscocks article,
  "tensile strength 19.3 to 28.4 MPa for sustained load"; the article's worked example uses 19.2). It is a
  long-duration value, far below the short-term strength of annealed glass, because glass loses strength under
  sustained load (static fatigue).
- Safety factor **3.8** default (the hobby value; user-settable). Allowable stress = 19.3 / 3.8 = 5.08 MPa (737 psi).
- E = 71.7 GPa (10.4e6 psi), nu = 0.22: ASTM E1300. (The hobby article uses 69 GPa; it changes deflection only.)
- Density 2500 kg/m^3 (156 lb/ft^3) for weights.

**Deflection limit:** largest deflection <= **1.0 x thickness** (settable). Reason: the small-deflection plate theory
used here is valid up to about one thickness (Timoshenko & Woinowsky-Krieger, *Theory of Plates and Shells*, ch. 1 and
13); beyond that membrane action changes the answer. The hobby article states no limit. In every case below the stress
governs: deflection at the chosen thickness is 0.2 to 2 mm (0.01 to 0.08 in).

**Stock rounding:** up to US 1/4, 5/16, 3/8, 1/2, 5/8, 3/4, 1 in or metric 4, 5, 6, 8, 10, 12, 15, 19, 25 mm. A pane
that needs more than the list is reported as "over stock" (`ok: false`), never capped.

## 3. The key finding: the hobby table assumes a held top edge

The beta / alpha table in the hobby calculators (Stillwell / Hiscocks: beta 0.085, 0.1156, 0.16, 0.26, 0.32, 0.35, 0.37
for L/H = 0.5 ... 3) matches the GS1 solver for a plate **simply supported on all four edges** under hydrostatic
load, within 1 to 3 % (test `four edges simply supported`), not a plate with a free top:

| L/H | hobby beta | GS1, top held | GS1, top free | hobby alpha | GS1 held | GS1 free |
|---|---|---|---|---|---|---|
| 0.5 | 0.085 | 0.084 | 0.085 | 0.003 | 0.0037 | 0.0038 |
| 1.0 | 0.16 | 0.162 | 0.201 | 0.022 | 0.0224 | 0.040 |
| 1.5 | 0.26 | 0.258 | 0.358 | 0.042 | 0.0424 | 0.168 |
| 2.0 | 0.32 | 0.317 | 0.473 | 0.056 | 0.0555 | 0.401 |
| 3.0 | 0.37 | 0.367 | 0.677 | 0.067 | 0.0669 | 1.163 |

(nu = 0.3 for this comparison, as in Roark / Timoshenko tables.) So the hobby calculators are right for a tank whose top
is held (a framed tank with a trim and center brace, or a stiff eurobrace) and **unconservative for a rimless tank**:
a 48 in long, 21 in tall front with a free top needs about 20 % more thickness than they say. With a free top the
largest stress sits near the top of the pane, partly from twisting near the end joints; the deflection of a long free
edge is 2 to 17 times larger (L/H 1 to 3). A perimeter brace turns the free edge into an elastically supported one, and a cross
brace pins it at mid-length; that is why a brace allows thinner walls.

Also checked: simply supported plate under uniform load against Timoshenko Table 8 (w = 0.00406 q a^4 / D,
M = 0.0479 q a^2 for a square; 0.01013 / 0.1017 for b/a = 2): exact to the table's digits.

## 4. Validation table (SF 3.8, fresh water to 1 in below the top; inches; front pane unless noted)

Calculators: **A** = Stillwell / Hiscocks hobby formula `t = sqrt(beta gamma h^3 SF / MOR)` (reproduced in code as
`hiscocksThickness`; matches the article's worked example: 950 mm, ratio 3 -> 25.07 mm). **B** = calculate.co.nz
(`t = b sqrt(0.75 p / (40 MPa / 3.8))`, b = water height). **C** = Pilkington Aquaria Ready Reckoner (2006) chart,
only in range for two sizes. **GS1 held** = solver with the top held (to compare like with like). **GS1 rimless** =
solver with a free top, front / end. **GS1 best brace** = optimizer, per-pane, US stock.

| Tank (L x D x H in) | A | B | C | GS1 held | GS1 rimless front / end -> US (metric) | GS1 best brace | Real tank |
|---|---|---|---|---|---|---|---|
| 10 gal 20x10x12 | 0.141 | 0.154 | - | 0.141 | 0.160 / 0.104 -> 1/4 / 1/4 (5 / 4 mm) | none helps (min stock) | not found |
| 20 long 30x12x12 | 0.155 | 0.154 | - | 0.158 | 0.194 / 0.116 -> 1/4 / 1/4 (5 / 4 mm) | none helps (min stock) | not found |
| 40 breeder 36x18x16 | 0.242 | 0.245 | - | 0.243 | 0.290 / 0.197 -> 5/16 / 1/4 (8 / 5 mm) | 2 in perimeter: 1/4 all, cost 91 | not found |
| 55 gal 48x13x21 | 0.372 | 0.377 | 10 mm (0.39) | 0.373 | 0.449 / 0.213 -> 1/2 / 1/4 (12 / 6 mm) | 2 in + 1 cross: 3/8 / 1/4, cost 82 | 5/16 framed, center brace (forum, Aqueon) |
| 75 gal 48x18x21 | 0.372 | 0.377 | 10 mm (0.39) | 0.373 | 0.449 / 0.257 -> 1/2 / 5/16 (12 / 8 mm) | 2 in + 1 cross: 3/8 / 1/4, cost 80 | 3/8 framed (forum); 10 mm (all-glass maker) |
| 125 gal 72x18x21 | 0.386* | 0.377 | - | 0.394 | 0.560 / 0.257 -> 5/8 / 5/16 (15 / 8 mm) | 2 in + 2 cross: 1/2 / 1/4, cost 83 | 3/8 framed (forum); 14 mm (all-glass maker) |
| 180 gal 72x24x25 | 0.508 | 0.496 | - | 0.507 | 0.670 / 0.360 -> 3/4 / 3/8 (19 / 10 mm) | 2 in + 2 cross: 5/8 / 3/8, cost 88 | not found |
| Tall 48x24x36 | 0.711 | 0.873 | 19 mm (0.75) | 0.697 | 0.798 / 0.509 -> 1 / 5/8 (25 / 15 mm) | 2.5 in + 2 cross: 3/4 / 1/2, cost 78 | not found |
| Waterbox CLEAR 4820, 47.2x19.7x19.7, rimless | 0.340 | 0.341 | - | 0.341 | 0.417 / 0.254 -> 1/2 / 5/16 (**12** / 8 mm) | 2 in + 1 cross: 3/8 / 1/4 | **12 mm** rimless (maker spec) |
| Waterbox CLEAR 7225, 72.3x25.3x23.6, rimless | 0.464 | 0.454 | - | 0.468 | 0.633 / 0.352 -> 3/4 / 3/8 (**19** / 10 mm) | 2.5 in + 2 cross: 1/2 / 3/8 | **19 mm** rimless (maker spec) |

\* the 125's L/H = 3.4 is past the hobby table's last row (3.0), so A clamps it.

**Agreement.** With the top held, GS1 is within 3 % of calculators A and B on every size (B differs on the tall build
because it uses a single-span formula with a different strength, 40 MPa / 3.8). With the top free, GS1 rounds to
exactly the glass Waterbox uses on both of its rimless tanks (12 mm and 19 mm), which the supported-top calculators
would under-call (A: 0.340 in = 8.6 mm -> 10 mm; 0.464 in = 11.8 mm -> 12 mm), i.e. **2 stock steps thin for the 7225**.

**Gaps over one stock step, explained.**
- Rimless front vs calculators A / B (55, 75, 125, 180, Waterbox 7225): one to two steps thicker, because A and B
  assume a held top (section 3). The gap is the method, not an error.
- Standard framed tanks (55 at 5/16, 125 at 3/8) are **thinner than any SF 3.8 answer**: at their real thickness GS1
  gives SF 2.7 (55) and 3.5 (125) with the top held, and 1.7 to 1.8 if the top were free. Mass-market framed tanks
  rely on the plastic trim and center brace and run a lower safety factor than the hobby 3.8; tempered panes (some
  makers) would explain the rest. The 75 at 3/8 lands exactly on SF 3.8 with the top held.
- Commercial thickness data is thin: no manufacturer publishes Aqueon / Marineland glass thickness; the framed-tank
  numbers above are forum measurements and are labeled so. Waterbox is the only maker spec found.

## 5. Eurobrace optimizer

Search: perimeter brace width 2, 2.5, 3, 3.5, 4 in; brace glass from 1/4 in up to the unbraced wall thickness;
0, 1 or 2 cross braces evenly spaced. Constraints: clear opening at least 6 in front-to-back and between cross braces
(settable `minOpening`), brace strip SF >= the target. Objective: **cost index** = total glass volume (walls + bottom
+ brace strips) relative to the unbraced tank = 100 (float glass is priced by area and roughly in proportion to
thickness; edge work and labor are not in it). Ties: wider opening wins.

Example, 75 gal 48 x 18 x 21 in, SF 3.8, per pane:

| Option | Front / end / bottom | Brace | Glass | Cost index | SF front / end / brace |
|---|---|---|---|---|---|
| No brace | 1/2 / 5/16 / 1/2 | - | 151 lb | 100 | 4.7 / 5.6 / - |
| Perimeter 4 in | 3/8 / 1/4 / 3/8 | 4 in x 5/16 | 128 lb | 84 | 3.9 / 4.4 / 4.0 |
| Perimeter 2 in + 1 cross | 3/8 / 1/4 / 3/8 | 2 in x 1/4 | 121 lb | 80 | 3.8 / 4.3 / 4.0 (64 lbf tie) |

6 ft tanks (125, 180): no perimeter-only brace within 2-4 in width passes; the strip spans 72 in corner to corner and
is itself over-stressed. One or two cross braces fix that (it is why 6 ft tanks get center braces).

## 6. Assumptions and limits
Simple supports at every joint (real silicone joints are a little stiffer: conservative); linear elastic small
deflection; static water load only (no seismic, impact, sloshing, point loads, or heat); annealed glass; rectangular
tanks only (bow, corner, cylinder not covered); the brace's own twisting restraint ignored; cross braces rigid;
silicone itself not designed (tie force reported).

## 7. Hook-up
- The custom tank maker calls `solveGlass(spec, opts)` and `optimizeBrace(spec, opts)`.
- `GlassBuild` (`panes: Record<PaneId, mm>`, `brace`, `safetyFactor`) and `toGlassBuild()` are the shape P9's custom
  tank spec can carry for per-pane thickness + brace. GS1 did not touch `customTanks.ts` (P9's file; not on main yet).
- `physics.ts glassThickness()` is unchanged. Later, `'auto'` could call `solveGlass` for the tank (uniform mode, US
  stock) instead of the height table; that would make existing tanks look thicker (rimless answer), so it needs a
  decision first.

## 8. Disclaimer to show in the app
"These thicknesses are an estimate from a standard engineering model (an elastic plate under water pressure, with the
safety factor you chose). They are not an engineering approval. Real tanks also depend on glass quality, edge finish,
silicone work, the stand, and loads this model does not include. Have a qualified builder or engineer check any tank
before you fill it."
