# Lane GL notes (2026-10-27): reef and fill-in lights

STATUS: BLOCKED on data. Nothing added to gear-catalog.json yet.

Amazon product pages (/dp/ASIN) now redirect to a sign-in page (after a "Continue shopping" interstitial). I do not sign in,
so exact dimensions, brackets, controller and spec tables cannot be read there. Search-result pages still load; they give
title (watts), price, rating count, "bought in past month" and a thumbnail, but never dimensions or fit range.

## Read from search results, 2026-10-27 (price, ratings, bought/month)

| ASIN | Product | Price | Ratings | Bought |
|---|---|---|---|---|
| B0DBHD2V1W | NICREW HyperReef 100 Gen 2, 100 W, 5-channel | $199.99 | 92 | 100+ |
| B0DBHCDPPZ | NICREW HyperReef 150 Gen 2, 150 W | $249.99 | 84 | 50+ |
| B0DBHFBHQ2 | NICREW HyperReef 200 Gen 2, 200 W | $319.99 | 122 | 50+ |
| B0DR82CYHW | NICREW NavaReef 65 W (Soft/LPS, 90 deg lens, built-in timer, rim mount) | $95.99 | 115 | 100+ |
| B0DR2W9MPP | NICREW NavaReef 135 W (LPS/SPS, 90 deg lens) | $165.99 | 62 | none shown |
| B0BZYQ78WF | 60 W programmable reef light | $89.96 | 250 | 50+ |
| B0DR5KX2W5 | PopBloom 65 W WiFi (not on the lane list) | $99.00 | 235 | 100+ |
| B0G5L7S7NY | 60 W generic reef light, 20-36 in tanks | $98.99 | 12 | none |
| B0DLSMLF64 | hygger 36 W saltwater light, 16-20 in | $45.99 | 131 | 100+ |
| B09V4M7CHW | 100 W 5-channel sunrise/moonlight generic | $138.99 | 209 | none |

Outside source (retailer listings, not Amazon): HyperReef 100 Gen 2 body 9.8 x 6.3 x 1.4 in, 100-240 V, 120 deg, max
coverage 24 x 24 in. No published PAR at a stated depth found for any.

## Why this needs a decision, not just more reading

1. The HyperReef and NavaReef are compact hanging / rim-mount fixtures (about 10 in), not slim bars with a fit range. The
   catalogue's mounts (bar, rim-legs, gooseneck, submersible) and `lightsFor(length)` (fitMin..fitMax) do not describe them:
   they need a new `hanging` mount (own height, coverage in inches, several units per long tank). That is a model change in
   lightproduct.ts / gearCatalog.ts (shared helper: separate small commit first).
2. No PAR at a stated depth is published, so every reef row stays `par` absent ("unknown") and the check keeps using the
   model's estimate from watts (led-reef tech).

Needs spec (not readable without product pages): dimensions, brackets, controller, photo colours for all ~20 lane products,
plus AquaIllumination Prime 16 HD and Kessil A80 (not on search pages).

## Update 2026-10-27 (after Nathan signed in): product pages load; spec tables give PACKAGE size, not the fixture's
Read from product pages (price, ratings, bought/month, listing size; package size in brackets):
- B0DBHD2V1W HyperReef 100 Gen 2: $199.99, 92, 100+; listing 9.8x9.8x9.8 in [16.14x11.02x7.09 in, 7.5 lb]; retailer body 9.8x6.3x1.4
- B0DBHCDPPZ HyperReef 150 Gen 2: $249.99, 84, 50+; [16.1x10.8x6.8 in, 8.4 lb]
- B0DBHFBHQ2 HyperReef 200 Gen 2: $319.99, 122, 50+; [16.1x12.6x6.8 in, 9.8 lb]
- B0DR82CYHW NavaReef 65 W: $95.99, 115, 100+; B0DR2W9MPP NavaReef 135 W: $165.99, 62 (a buyer measured ~135 W draw)
- B0BZYQ78WF is SMATFARM 60 W programmable (not NICREW): page timed out, not read
ASINs found: NICREW ClassicLED Marine 48 W B08Q378RBY ($89.99, 48-60 in tanks); 36 W B0899BVX9Q already in.
Pane hidden -> browser scripts time out; keep the Browser pane visible while GL runs. Still to read: VIPARSPECTRA, Pawfly 48 W,
95 W / 140 W generics, AI Prime 16 HD, Kessil A80, 12 freshwater rows. Nothing added to gear-catalog.json yet.
