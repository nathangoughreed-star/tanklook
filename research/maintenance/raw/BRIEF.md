# Brief for maintenance research agents (lane C6, 2026-10-27)
Goal: SOURCED figures about recurring care tasks for an aquarium / terrarium planner. Rules (Nathan's):
- A small set of trustworthy sourced numbers beats a long speculative list. Never invent time or dollar benefits.
- Every figure: {value, unit, source url, verbatim quote (<=25 words, copied from a page you actually opened with WebFetch), accessed date 2026-10-27}.
  If no opened page states it, write status "assumption", give basis (what it was derived from) and NO fake quote.
  Pages usually state INTERVALS (every N days), rarely minutes; report minutes only when a page states them.
- Use WebSearch (standard) then WebFetch to open pages. Prefer care sheets from vets, university extension, zoos/aquaria, manufacturers (Eheim, Python, Hydor), LiveAquaria, Reef2Reef/Aquarium Co-Op, reptile societies; avoid pages you cannot open.
- US units in prose (gal, in, F); keep source units as quoted.
- Do NOT touch any file except the output file named in your task. Output: one JSON file, shape
  { "lane": "<name>", "items": [ { "id": "...", "applies_to": "...", "field": "cadence|minutes|neglect_tolerance|setup_hours|cycling_weeks|cost|power|water|failure_mode|not_saved",
    "value": ..., "unit": "...", "status": "sourced|assumption", "basis": "...", "sources": [ { "url": "", "quote": "", "accessed": "2026-10-27" } ] } ],
    "gaps": [ "honest list of what you could not find" ] }
- Final reply to me: 3 lines only (file path, counts sourced/assumption, biggest gaps).
