# Research brief: tank-geometry minimums per species (lane MX, 2026-10-21)

You are a research agent for Glass Box, an aquarium / vivarium planning tool. The tool is moving from "minimum gallons" to
GEOMETRY: footprint (length x width), length, width and water depth, each checked on its own. Your job: for each species
below, find what credible pages STATE about the minimum tank, measure by measure, with the exact url and a verbatim quote.
You do not edit any code. Reply in your final message with ONLY the JSON object described at the end (no prose around it).

## Hard rules (a result that breaks one is thrown away)
1. **Cite only pages you opened with WebFetch.** WebSearch finds pages; a search snippet is never a source.
2. **Every source carries a verbatim quote** copied from the WebFetch output: ONE contiguous run of the page's text, under
   15 words, that contains the number. Ask WebFetch for "the exact sentences / table rows, verbatim, that state the minimum
   tank size, tank length / dimensions, footprint, water depth or tank height". Never rebuild a row from cells apart on the page.
   A script re-fetches every url and checks the quote; `states` must contain the number exactly as the quote writes it.
3. **Never attach a source that does not state the value.** No opened page states a measure = leave that measure out.
4. Record what the page says, even when it disagrees with our current value. Disagreement is useful.
5. Budget: at most ~8 WebFetch calls per species. Stop a measure at two agreeing credible sources. Start from the `prior`
   urls in your input (pages already opened for the gallon figure); re-open them looking for dimensions, then search.

## The measures (one field each; keep them separate, never merge or average)
- `footprint`: a stated length x width (e.g. "120 x 30 cm", "30 x 12 in", "36 by 18 inches") or a floor area.
- `length`: a stated tank length alone ("a tank at least 4 ft long", "base dimensions of 80 cm").
  Seriously Fish writes "Aquarium Size: An aquarium with base dimensions of 80 x 30 cm": that is a footprint.
- `width`: a stated front-to-back width alone (rare).
- `water_depth`: a stated minimum WATER depth / water level ("water no deeper than 30 cm" is a MAXIMUM: put it here with
  `kind: "max"`).
- `tank_height`: a recommended TANK height ("a tall tank, at least 18 in high", "taller aquaria are preferred").
- `volume`: a gallon / litre minimum. Always record its conditions if the page states them.

For every source record its CONDITIONS when stated: group size assumed (`group`), life stage (adult / juvenile / grow-out),
sex or pair, single specimen, "or equivalent". Unstated conditions = write `"est": true` (the value counts as estimated).

## Credibility (rank by credibility, then applicability, then specificity; NOT by site name)
Credible: species-level care pages with stated reasoning or authorship: Seriously Fish, FishBase (aquarium notes),
LiveAquaria / Diver's Den species pages, Aquarium Co-Op care guides, Fishkeeping World, Tropical Fish Hobbyist,
Practical Fishkeeping, Reef Builders, ReptiFiles, Amphibian Care, Josh's Frogs, Tom's Big Spiders, university / vet / zoo
pages, published husbandry manuals (AZA). Weak: retailer one-liners without reasoning, generic listicles, AI-written content
farms. Never: forums, Reddit, YouTube, Quora (they may point you to a page, never be one).
Applicability: adult animal, the usual viable group, the aquarium (not wild habitat). Specificity: footprint with stated
group > length > gallons.

## Special cases
- **Depth for tall-bodied / vertical species** (angelfish, discus, others): look hard for a stated tank height or water
  depth. If none is stated, say so in `notes`; do NOT invent one. You may record the species' adult body HEIGHT (fin tip to
  fin tip) from a page that states it, as field `body_height` (it feeds an estimated advisory, never a failure).
- **Surface / gas-breathing species** (betta, gourami, kuhli? axolotl, ADF): record any stated MAXIMUM water depth.
- **Land animals** (geckos, anoles, frogs, python, spiders): enclosure dimensions are the norm (e.g. "18 x 18 x 24 in");
  put L x W in `footprint` and H in `tank_height`. Note arboreal species' "height matters more than floor".
- **Invertebrates** (shrimp, snails, hermit): gallon figures only, usually; record them; no invented grazing-area minimum.

## Output: ONE JSON object, nothing else
{
  "batch": "<batch name>",
  "species": {
    "<id>": {
      "sci": "<Genus species>",
      "fields": {
        "footprint": { "verdict": "sourced" | "not-stated", "sources": [
          { "url": "...", "site": "Seriously Fish", "states": "80 x 30 cm", "quote": "base dimensions of 80 ∗ 30 cm",
            "value": [80, 30], "unit": "cm", "group": "6-8" | null, "stage": "adult" | null, "kind": "min" | "max" | "rec",
            "est": true | false, "credibility": "high" | "medium" | "low", "conditions": "short free text" } ],
          "note": "one line: agreement, conflicts in %, what was checked" },
        "length": { ... }, "width": { ... }, "water_depth": { ... }, "tank_height": { ... }, "volume": { ... },
        "body_height": { ... }
      },
      "pick": { "<measure>": { "source": <index into that measure's sources>, "why": "short" } },
      "conflict": "measures whose credible sources differ by more than ~25 %, with the numbers, else null",
      "checked": ["every url you opened, including ones that stated nothing"]
    }
  },
  "agent_notes": "anything the coordinator should know"
}
`value` is a number (length, depth, height, volume) or [L, W] (footprint) in the page's own unit (`unit`: cm, in, ft, mm,
gal, L). Leave out a measure no page states, or include it with `"verdict": "not-stated"` and empty sources when you looked
specifically (always do this for footprint and water_depth so absence is on record).
