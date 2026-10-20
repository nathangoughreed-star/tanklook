# Research brief: adult length and care fields per species (source-traceability backfill)

You are a research agent for Glass Box, an aquarium planning tool. Every advice number must trace to a web page that
STATES it. Your job: for each species below, find pages that state each field, and record the exact url and a verbatim
quote for every value. You do not edit any code.

## The hard rules (a result that breaks one is thrown away)
1. **Cite only pages you opened with WebFetch.** WebSearch is for finding pages; a search snippet is never a source.
2. **Every source carries a verbatim quote** copied from the WebFetch output: the sentence or table row that states the
   number or word. In your WebFetch prompt ask for "the exact sentences / table rows, verbatim, that state <field>", never
   a summary. The quote will be checked by a script against the live page, so do not tidy, translate or merge it.
   The quote must be ONE contiguous run of the page's text. Never rebuild a table row from cells that are apart on the
   page; quote the label and its value cell where they sit together (e.g. "Care level: Easy"), or one sentence.
3. **Never attach a source that does not state the value.** If no opened page states a field, say `not-stated`.
4. Report what the page says, even when it disagrees with our value. Disagreement is useful, not a failure.
5. Two independent sources per field where you can find them (FishBase + one care sheet, or two care sheets). Stop at
   two; do not pad. Max ~12 WebFetch calls per species.

## Good sources (prefer, in this order)
- **FishBase** species summary (`https://www.fishbase.se/summary/<Genus>-<species>.html`): "Max length", with SL / TL,
  and "common length" if given. Use for `tl` only.
- **Seriously Fish** (`https://www.seriouslyfish.com/species/<genus>-<species>/`): maximum standard length, aquarium
  size, behaviour / compatibility, group size.
- **LiveAquaria** product pages (care level, temperament, maximum size, minimum tank size, "reef compatible").
- **Aquarium Co-Op** care guides, **Fishkeeping World**, **The Spruce Pets** (care sheets).
- Marine: LiveAquaria, Reef Builders, Fishbase. Inverts: Seriously Fish, Aquarium Co-Op, shrimp keeper sites.
- Reptiles, amphibians, spiders: ReptiFiles, Amphibian Care (amphibiancare.com), Josh's Frogs care guides, Tom's Big
  Spiders / Tarantula Collective, university or vet pages. `tl` here is snout-vent or total length as the page says.
Avoid: forums, AI-written content farms with no author, Pinterest, Reddit, YouTube.

## Fields (our value is given per species; units are ours)
- `tl`: typical adult total length in mm (male; `female.tl` where given). FishBase gives max length, often SL (standard
  length, no tail). Record exactly what the page says (value, unit, SL / TL / not said, max / common / typical).
  For agreement, compare in total length: an SL figure is about 1.2x shorter than TL for most small fish; say so in `note`.
- `ph`: comfortable pH range [lo, hi] (freshwater only). Agrees when each end is within 0.3 of a stated range.
- `care`: 1 beginner, 2 intermediate, 3 expert. Pages say "Care level: Easy / Moderate / Difficult / Expert only".
- `minL`: smallest tank in litres for the usual first group or one adult. Pages say gallons: 1 US gal = 3.785 L.
  Record the page's own number and unit; also the litres.
- `temper`: 0 peaceful, 1 territorial / semi-aggressive / fin-nipper (harasses slow or shy tankmates), 2 aggressive.
- `group`: smallest group it should be kept in (only where we set one).
- `solo`: we say "one per tank" (a bonded pair is fine). A source states it if it says keep singly / one per tank /
  males fight each other.
- `prey`: we say it eats animals up to N mm. Pages rarely give mm. A statement like "will eat any fish small enough to fit
  in its mouth" or "eats shrimp" is a source for the BEHAVIOUR, not the number: record it with `verdict: behaviour-only`.

## Output
Write ONE JSON file at the path your task gives you, shaped exactly so:

```json
{
  "batch": "<name>",
  "agent_notes": "<one or two lines: anything that blocked you>",
  "species": {
    "<id>": {
      "sci": "<scientific name>",
      "fields": {
        "<field>": {
          "ours": <our value>,
          "verdict": "agrees" | "disagrees" | "not-stated" | "behaviour-only",
          "suggest": <a value if disagrees, in our units, else null>,
          "sources": [
            { "url": "<exact url you WebFetched>", "site": "<short name>", "states": "<value as the page gives it, e.g. '2.2 cm SL max'>",
              "quote": "<verbatim sentence / row from the page>" }
          ],
          "note": "<optional, one line>"
        }
      }
    }
  }
}
```

Verdict guide: `tl` agrees within +-20 % of a stated adult size (say which); `minL` agrees if ours is within the span the
sources state or within +-25 % of one of them; `care`, `temper` agree when the words map onto our scale; `group` agrees
within +-2 of a stated minimum. When the sources disagree with each other, give both and say so in `note`.

Finish with a short reply: the file path, how many fields agree / disagree / not-stated, and how many WebFetch calls you made.
