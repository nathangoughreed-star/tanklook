# E1: seed variance (Nathan's part)

**Question:** with the prompt and photos held fixed, how much do three sheets from the same prompt differ when audited?

**Why it matters:** if draws differ more than prompts do, the method becomes "draw 3, keep the best by audit", and E2-E4 get smaller. The plan is in `research/fish-sheet-methodology-audit.md`, section 4.

## The rules (these are what make the result valid)

1. **Generator:** ChatGPT, the same model for all 9 sheets.
2. **A NEW ChatGPT chat for every sheet.** Never use "regenerate" or "try again" inside one chat. Earlier images in a chat steer the next one, and then the draws aren't independent.
3. **Same photos for all three draws of a species.** Pick 1-2 real side photos per species before you start, and attach exactly those every time. Save them as `C:\Users\nreed\fish-sheets\e1\<species>-ref1.jpg` (and `-ref2.jpg`). Note where each one came from.
4. **Paste the prompt exactly as written below.** Make no edits between draws, and don't follow up with corrections. If a draw is obviously broken (text on the image, a second fish), save it anyway. A broken draw is data too.
5. **Save each sheet** at full size, as downloaded, as `C:\Users\nreed\fish-sheets\e1\<species>-d1.png`, `-d2.png` and `-d3.png`.

Species and names: `oscar`, `clownfish`, `pleco`. That's 9 sheets and about 15 minutes.

**When you're done,** tell the coordinator chat "E1 sheets are in". Claude audits all 9 with `scripts/fish-sheet-log.py`, writes the log rows, and reports the spread for each species. No models are built in E1.

## The method block (the same for every sheet; this is prompt version B)

Paste this paragraph, then a blank line, then the species paragraph.

```text
Create a single orthographic reference sheet of one fish on a pure black background, for building a 3D model. Three panels stacked vertically, with clear black space between them so that no fin touches another panel.

(1) SIDE: the left flank, a true side elevation. Nose pointing right, body axis perfectly horizontal. All fins spread at their natural resting extent, not flared. The pelvic and anal fins hang clear of the belly with a visible dark gap.
(2) TOP: directly below panel 1, seen straight down from above. The snout and tail tip line up horizontally with panel 1, and the fish is exactly the same length. In this view the dorsal fin, anal fin and tail fin are seen edge-on: each is only a thin line along the midline, never spread flat. Pectoral fins folded flat against the body. The back's colour pattern is fully visible and evenly lit.
(3) FRONT: below panel 2, seen straight on from the snout at the same scale as panel 1. The eyes and mouth are at the same height as in panel 1. The tail is hidden behind the body; the dorsal and anal fins are seen edge-on as thin lines.

All three panels show the same individual, with identical proportions, colours and pattern, and the pattern wraps continuously around the body. Strict orthographic projection: no perspective, no tilt. Flat, even studio light with no shadows, reflections, rim light or glow. No text, labels or props. Mouth closed. The eye has a clearly separate pupil and iris. True but slightly muted colours. Photorealistic and anatomically faithful: no stylization, cartoon or film-character features, and no exaggeration of any feature. Make the fish as large as the canvas allows.
```

## Species paragraphs

### oscar (the same text as the passing sheet)
```text
Species: adult Astronotus ocellatus (oscar), common "tiger" colour form: irregular orange-red markings on a dark olive-black body, not an albino, red or lutino morph. Match the attached photos for body proportions, body thickness and fin shapes; where the photos and your own knowledge disagree, follow the photos. Features that must be right: the black eyespot ringed in orange at the base of the tail fin, and the irregular tiger markings, which are different on every fish, so do not make them symmetric or striped.
```

### clownfish
```text
Species: adult Amphiprion ocellaris (ocellaris clownfish), wild-type orange colour form, not a black, snowflake or designer morph. Match the attached photos for body proportions, body thickness and fin shapes; where the photos and your own knowledge disagree, follow the photos. Features that must be right: three white bands edged in thin black (behind the eye, mid-body, and at the base of the tail), with the middle band bulging forward at its centre; a rounded tail fin; a dorsal fin with a lower spiny front part and a taller soft rear part, joined by a notch; black edges on the fins.
```

### pleco
```text
Species: adult common pleco (Hypostomus plecostomus), standard wild-type brown-grey colouring, not a designer morph. Match the attached photos for body proportions, body thickness and fin shapes; where the photos and your own knowledge disagree, follow the photos. Features that must be right: a bottom-dwelling armoured catfish with a flat underside and a body that is wider than it is deep, especially at the head; rows of bony plates along the flank; small high-set eyes on top of the head; a tall dorsal fin with a stiff leading spine; a small adipose fin behind it; large pectoral fins with a stiff first spine; pelvic fins under the belly; a tail with a longer lower lobe; the mouth is a sucker disc on the underside, so it is hidden in the side and front views. Dark brown spots and irregular lines on a lighter olive-brown ground, continuous over the back and flanks. Do not add whiskers, tentacles or barbels.
```

The clownfish paragraph is new. It is written in the B style, and leaves out the "Nemo" naming that gave sheet 1 a cartoon face. The pleco paragraph is the `pleco-noref` one, with the "match the attached photos" line put back.
