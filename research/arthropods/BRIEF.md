# Arthropod research brief (shared by the three research agents)

Goal: for each species below, fill ONE JSON object per species and write a JSON array to your output file. Use WebSearch/WebFetch.
Prefer care sheets from reputable hobby sources (Tarantula Collective, Josh's Frogs, Dubia Roaches, Tom Moran / Arachnoboards, Bugs in Cyberspace, Isopod/Millipede specialists like Arizona Isopod?? / Backwater Reptiles, Reptile Magazine, Kingsnake.com, Mantis Enthusiast, Phasmid Study Group, Hermit Crab Association, Invertebrate care sheets from zoos/Univ.). Prices from a retailer page (cite URL).
Every numeric field is an object {"v": <value or null>, "src": "<URL>", "status": "sourced|derived|assumption"}.
Never guess silently: if you cannot find it, give status "assumption" with your best estimate and say so in "notes".
Fields per species:
 id (lowercase slug, no spaces), name, sci, group (tarantula|scorpion|isopod|millipede|mantis|phasmid|roach|jumpingspider|hermitcrab|other),
 popularity (1-5, how commonly kept in the hobby; justify in notes; cite a source such as retailer best-sellers),
 adult_mm (body length), lifespan_yr (female / typical), temp_c [lo,hi] , humidity_pct [lo,hi], substrate_depth_mm,
 min_floor_cm [L,W], min_height_cm, lifestyle (terrestrial|arboreal|fossorial|burrower|semi-arboreal),
 diet (text), feed_interval_days (adult), fast_tolerance_days (how long a healthy adult can go without food/with a sitter),
 molt_note, group_rule (solitary|colony|pair|cannibalistic etc, with number per enclosure), venom_handling (text),
 price_usd {lo, typical, hi} each with src, colour (text: true colours of body, legs, markings for the 3D art, from reference photos: name the photo page URLs), reference_photo_urls (2+), behaviors (list: burrow, web, climb, molt-hide, threat pose, etc), notes.
Units: report mm, cm, C, % RH as above (the project converts to US units for display itself).
Write a short list of which sources you used. Return to the caller ONLY: the output file path, count of species, and the list of fields you had to mark assumption. Do not paste the data in the reply.

## ROUND 2 (stricter): the first round only read search snippets and marked nearly everything assumption.
For each species in your round-2 list: WebFetch at least 2 FULL care-sheet pages (not snippets) and take numbers from them; put the page URL in each field's src; status "sourced" only when the number is on that page, "derived" when you convert/average, "assumption" otherwise. Prices: fetch one retailer product page (cite it). Colour: fetch a species page with a photo description or Wikipedia/iNaturalist species page and describe true colours of each body part. Edit your round-1 part file IN PLACE (keep other species in it untouched), replacing the entries of your round-2 species. Fix obviously wrong sizes (e.g. dwarf white isopod ~4-5 mm is right; powder blue ~10-12 mm is right; check lobster roach). Keep replies to: path, count, remaining assumption fields.
