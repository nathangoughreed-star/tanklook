# Draft: real light output (watts + light type -> PAR and brightness)

Status: draft, 2026-10-14. Nathan: Exposure knob, go ahead with calibration (results below when in). No code yet. The files it touches belong to lanes G and G2 (see "Files"), so it
should run as its own lane once those lanes finish.

## What exists now (render/lighting.ts)

- **Shape of the light is already physical.** `emitters()` places the bulbs, tubes or LED rows. `lightSum()` (JS) and
  `aqIrr()` (shader, the Light map) apply beam profile x cos of incidence x inverse square (tubes: inverse distance).
  Height, beam angle, spacing and the tank outline already change where the light lands.
- **The amount of light is not.** `setLightUniforms` normalises every fixture to the same mean at mid-height, then
  multiplies by the Brightness slider (x0.2-2.5). The Light map's unit is relative: 1 = one standard 52° bulb 300 mm
  above the surface. Nothing knows watts, lumens or photons.
- **Not modelled:** refraction at the water surface, reflection off the side glass, absorption by the water itself.
  Water `opacity` (`waterK`) is a visual haze only and does not dim the light.

So most of the work is putting **absolute units** on a model that already exists, plus three physical corrections.

## New settings (LightSettings, optional, no scene version bump)

| Field | Meaning | Default / older files |
|---|---|---|
| `watts` | Fixture power draw (W); 0 = off, the Brightness slider stays manual as now | 0 |
| `tech` | Light technology, filtered by fixture type (below) | per type |
| `mapUnit` | Light map shows `par` or `lux` (an app preference, like `beams`) | par |
| `par` | Manual override: measured or published PAR at substrate (µmol/m²/s); 0 = estimate | 0 |

Fixture **type** (spot / tube / LED bar) stays the geometry. **Tech** is what is inside it:

| Tech | Allowed on | µmol/J (PPE) | Fixture eff. η | lux per µmol | Notes |
|---|---|---|---|---|---|
| LED, white | spot, tube, LED | 1.6 | 0.90 | 70 | Typical aquarium bar. Each tech also gets a blue / green / red photon split (see Light map) |
| LED, planted RGB | spot, LED | 1.8 | 0.90 | 50 | Less green, so less lux for the same PAR |
| LED, reef (blue) | spot, LED | 2.0 | 0.90 | 25 | Looks dim on a lux meter, lots of PAR |
| T5 HO, own reflectors | tube | 1.2 | 0.75? | 74 | First check suggests η is too high (below) |
| T5 HO, bare | tube | 1.2 | 0.45 | 74 | Half the light goes up |
| T8 | tube | 0.85 | 0.50 | 74 | |
| CFL / power compact | spot, tube | 0.8 | 0.55 | 72 | |
| Metal halide pendant | spot | 1.3 | 0.75 | 71 | Strong shimmer |
| Incandescent / halogen | spot | 0.3 | 0.60 | 50 | Mostly heat |

All of these values are first guesses, to be fixed in calibration (below). η covers fixture losses only (lens,
reflector). Light that misses the tank is already handled by the geometry, so it must not be counted twice. The
Colour temp slider can shift lux per µmol a little (warmer = slightly lower).

## The calculation (new pure module, e.g. `scene/lightout.ts`, JS only, unit-tested)

1. **Photons out:** Φ = watts x PPE x η (µmol/s), split evenly across the emitters (a tube's per mm of its length).
2. **Beam into units:** integrate the existing profile (`smoothstep(cos outer, cos inner)`) over the sphere once per
   cone, so I(θ) = Φ_e x profile(θ) / ∫profile dΩ (µmol/s/sr). Tubes use the 2D equivalent. This is the step that turns
   the relative Light map into µmol/m²/s with no change to its shape.
3. **Through the air:** nothing extra (air absorption is negligible over a metre). A glass canopy x0.90; a hood keeps
   its LAMP_Y height.
4. **Into the water:** surface reflection about 3% (x0.97). **Refraction:** rays bend toward vertical (n = 1.33),
   which concentrates the beam. Paraxial approximation: a lamp at height a above the surface and a point at depth w
   behave like distance a + w/1.33 instead of a + w. Deep tanks come out noticeably brighter at the bottom than the
   current straight-line model gives.
5. **Side glass:** light hitting the glass from inside at a shallow angle is mostly reflected back in (total internal
   reflection at the glass-air face). Model it as one mirror image of each emitter across each wall, weight about 0.7.
   Rectangular tanks only to begin with; for round / poly / bowl, skip it (slightly low estimate) or treat the walls as
   a 0.7 x a cylinder correction.
6. **Through the water:** Beer-Lambert. Clear water about 0.12 /m averaged over PAR, plus a share of the existing water
   `opacity` (`waterK`), so the tint/clarity setting dims the light too. Path length = depth / cos(refracted angle).
7. **Sample the substrate:** a 24 x 24 grid over the footprint at the substrate surface (corner depths fl/fr/bl/br, with
   its slope and facing). Gives PAR mean / min / max, plus PAR at the water surface under the brightest point.

Output: `{ surface, mean, min, max, luxMean, band }`, where band is low < 30, medium 30-50, high 50-80,
very high > 80 µmol at the substrate.

## Readout (Lighting panel, lane G)

Under the new Watts and Tech rows:

> PAR at substrate ≈ 35-60 µmol (medium-high) · surface ≈ 140 · ≈ 2,900 lux · estimate

- The range is the ±50% uncertainty band around the mean, or min-max across the substrate if that is wider.
- With `par` set: "PAR at substrate 45 µmol (yours)", and the estimate is scaled to match it (the map keeps its shape).
## Light map: PAR or lux, plus a hover readout (Nathan 2026-10-14)

- **A PAR / Lux switch** next to the Light map checkbox, shown when watts is set. Without watts the map stays relative,
  as now.
- **Two separate quantities, one look.** Same false-colour log ramp and contour per doubling. The surface is
  recomputed for whichever is shown, not relabelled, because the two are calculated differently:
  - **PAR** counts photons 400-700 nm equally, with water absorption averaged over that band.
  - **Lux** weights by the eye's response. Water absorbs red far more than blue (pure water about 0.35 /m at 650 nm,
    about 0.01 /m at 450 nm), so the spectrum shifts bluer with depth. Lux and PAR therefore fall off at different
    rates, and the lux-per-µmol ratio varies across the substrate (deeper spots, and long slanted paths near the
    walls, have proportionally less lux).
  - Implementation: carry the light as three spectral bands (blue ~400-500, green ~500-600, red ~600-700). Each tech
    gives its photon split across the bands. Each band has its own water absorption k and its own lux weight. PAR =
    sum of the bands; lux = weighted sum. The shader does the same three-band sum (cheap: three exponentials per
    emitter), and a uniform picks PAR or lux.
- **Legend in real units:** PAR steps 5, 10, 20, 40, 80, 160, 320 µmol; lux steps 250 ... 16,000. Each ramp is anchored
  so its middle sits on that unit's "medium" band. The planted-tank bands (low / medium / high) are marked on the PAR
  legend.
- **Hover readout:** with the Light map on, the pointer is raycast onto the substrate mesh (lane G2's pointer code
  already picks surfaces). The JS model is evaluated at that exact point: the same function as the shader, so the
  numbers match the colours. A small tooltip follows the cursor, e.g. "62 µmol PAR · 3,400 lux · 31 cm deep". It
  shows both values whichever map is displayed, and is hidden off the substrate. Throttled to one evaluation per
  animation frame (48 emitters x a few image walls is microseconds in JS).
- **One source of truth:** `scene/lightout.ts` holds the model. The shader is a port of it. A test samples a few points
  through both (JS, plus a GPU readback in the browser check) and requires them to agree within 2%.

## Driving the render brightness (needs Nathan's call)

When watts is set, Brightness becomes computed instead of a free slider: bright = (lux / Lref)^0.5, clamped to
0.2-2.5. Lref is the lux the default scene gives at bright = 1 (about 2,000 lux at mid-depth, to be set in
calibration). The square root works like eyes and cameras adapting: 4x the light looks about 2x brighter, so a
reasonable range of real fixtures stays on screen instead of blowing out or going black. A strictly linear mapping
would be more "honest" and less usable.

Options for the slider while watts is set:
- (a) it becomes a read-only output, or
- (b) it becomes "Exposure" (x0.5-2 on top of the computed value), which works like a camera and keeps an artistic
  knob. **Decided (Nathan 2026-10-14): b, Exposure.**

## Calibration (before trusting the numbers)

- Gather 5-8 published PAR-at-depth charts covering at least one each of white LED, planted RGB, reef LED, T5 HO with
  reflectors, and T8. Manufacturers publish these, and so do hobbyist PAR-meter threads. Enter each as a test fixture.
  Tune PPE and η until most land within ±30%; record the residuals in a test.
- `test/lightout.test.ts`: units (doubling watts doubles PAR), inverse-square sanity, refraction (deeper tank loses
  less than straight-line inverse-square), wall images (a narrow tank holds more light at the edges), the calibration
  fixtures within tolerance.

## Calibration, first pass (2026-10-14)

Data: `reference/par-calibration-data.md` (9 datasets, each graded A = read on the page, B = secondhand, C = vendor
estimate; only 2 are grade A). Hand checks against the table above, before the model exists:

- **AI Hydra 32 HD (reef LED, 90.5 W, Apogee MQ-510, in air, centre).** Point source with a ~100° beam:
  Φ = 90.5 x 2.0 x 0.9 ≈ 163 µmol/s, I ≈ 73 µmol/s/sr. Predicts 2,520 / 532 / 224 at 17 / 37 / 57 cm against measured
  1,908 / 462 / 197, so 15-30% high. Inverse-square holds, as the model assumes. PPE 2.0 for reef LED is probably a
  little high; 1.7-1.8 would fit.
- **T5 HO over planted tanks (grade B/C).** Hobby readings give about 0.4-0.55 PAR per watt at the substrate. That is
  far below what η 0.75 predicts, so the reflector / ballast / lamp-ageing losses are larger than assumed. Expect η
  about 0.4-0.5 with reflectors.
- **Lux factors** (Apogee, after Thimijan & Heins 1982): sunlight 54, cool-white fluorescent 74, metal halide 71,
  HPS 82 lux per µmol. These replace the guesses above. No published LED or incandescent factors; LED values stay
  estimates from spectrum (white LED ~ 65-75).
- **PPE** (Nelson & Bugbee 2014): horticultural LED 1.66-1.70, fluorescent 0.95, ceramic metal halide 1.46.
- **Air to water:** JBL shows only 4-9% loss across the surface, in line with the 3% Fresnel + ripple assumption.
- **Watch:** Fluval's published lux column is exactly PAR x 54, so it is computed, not measured. Many vendor figures
  are in air at 12 in, not at the substrate; the tests must compare like with like.
- **Gaps:** no clean T5 per-reflector table, no bare T5, no T8, metal halide or CFL dataset; no PPE for aquarium white
  or blue LEDs. With what exists, LED estimates look like ±30%; fluorescent ±50% until better data turns up. A user's
  own PAR-meter reading (the override) is the fix for the rest.

## Files

- `scene/types.ts`, `scene/defaults.ts`, `scene/validate.ts`: three optional fields (lane G2's area).
- New `scene/lightout.ts` + test: the model. Shares the cone/emitter helpers with `render/lighting.ts` (export
  `beam()`).
- `render/lighting.ts`: brightness from lux when watts is set; `aqIrr` refraction / walls / absorption; map legend
  units (lane G2).
- `src/ui/panels.ts`, `index.html`: Watts, Tech, PAR override rows and the readout (lane G).
- `ui/diff.ts`: A/B lines for watts / tech.

## Effort

Model + tests: about one session. Shader + UI + calibration research: one more. The calibration research is the part
that decides whether the estimate holds within ±50% or ±30%.
