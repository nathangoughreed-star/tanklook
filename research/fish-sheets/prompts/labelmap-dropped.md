# Label-map request (dropped)

Generator: ChatGPT. Sent as an edit request to an existing sheet (oscar), twice. Both tries unusable (try 1 redrew the sheet; try 2 used code with guessed regions). Not part of the method any more.

```text
Edit panel (1) only, keeping its geometry and framing pixel-identical. Recolour it as a flat segmentation map: body mid-grey; dorsal fin red; anal fin green; tail fin blue; pectoral fin yellow; pelvic fin cyan; eye white; mouth line black. No texture, no shading, no outlines, no white bands, and nothing else changed. Leave panels (2) and (3) untouched.
```

## Retry 2026-11-20: angelfish (`B-layout` sheet), same text, sent by Nathan as an edit: it WORKED

- **Result file:** `C:\Users\nreed\fish-sheets\shapes\angelfish-d1-labelmap.webp`.
- **Silhouette:** the side-panel silhouette against the original has an IoU of 0.975 (threshold 20; the oscar tries got 0.75). Extents match within 1 px. The mean boundary offset is about 1.3 px, 0.19% of body length.
- **Other panels:** panels 2-3 are untouched (0.3% of pixels changed by more than 30).
- **Regions:** all seven are present.
  - The eye centre is within about 3 px of the photo eye.
  - The pectoral lies where the translucent fin is.
  - The tail base is at about x = 385.
- **Not yet checked:** the fin-base boundaries against Nathan's clicks or the E5 segmenter. That check is what decides whether a label map can replace clicks.
- **Status:** promising, not yet back in the method. One success against two oscar failures. Possible reasons: a cleaner sheet, simpler colours, or a newer generator.
