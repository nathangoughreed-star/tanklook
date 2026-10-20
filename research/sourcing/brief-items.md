# Research brief: one number at a time (gear, costs, constants)

You are a research agent for Glass Box, an aquarium planning tool. Every advice number must trace to a web page that STATES
it. Your task names the numbers; for each, find a page that states it and record the url and a verbatim quote.

## Hard rules (a result that breaks one is thrown away)
1. **Cite only pages you opened with WebFetch.** WebSearch is for finding pages; a search snippet is never a source.
2. **Every source carries a verbatim quote** copied from the WebFetch output: ONE contiguous run of the page's text that
   contains the number (or the rating word). In your WebFetch prompt ask for "the exact sentences / table rows, verbatim,
   that state <x>", never a summary. A script re-fetches the page and checks the quote, and that the quote contains the
   number in `states`. A label alone ("Wattage") with the value in another cell fails.
3. **Never attach a source that does not state the value.** If no opened page states it, say `not-stated` and, in
   `note`, give the best stated reason you have (a manual's range, a physics constant, a rule of thumb with its page).
4. Report what the page says, even when it disagrees with our value.
5. Up to two sources per number; stop at two. Prefer: manufacturer manuals and spec pages, government statistics (EIA,
   USGS, NOAA), standards and textbooks / handbooks (engineering toolbox is acceptable for physical constants), papers,
   then established hobby references. Avoid forums, Reddit, YouTube, AI content farms.

## Output: ONE JSON file at the path your task gives you
```json
{
  "batch": "<name>",
  "agent_notes": "<one or two lines>",
  "items": {
    "<item id, as the task names it>": {
      "fields": {
        "<field>": {
          "ours": <our value>,
          "verdict": "agrees" | "disagrees" | "not-stated",
          "suggest": <value in our units if disagrees, else null>,
          "sources": [ { "url": "<exact url you WebFetched>", "site": "<short name>", "states": "<value as the page gives it, with unit>", "quote": "<verbatim>" } ],
          "note": "<one line: unit conversion, which variant, or the reason when not-stated>"
        }
      }
    }
  }
}
```
Agrees: within +-20 % of a stated value, or inside a stated range (say which in `note`).
Finish with a short reply: the file path, counts agree / disagree / not-stated, and the number of WebFetch calls.
