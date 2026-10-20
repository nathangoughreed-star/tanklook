# Sourcing fleet plan (2026-10-20, waits on Nathan's yes)

## Pilot measured (pilot-01: 10 species, adult length + care fields)
- 1 Sonnet agent, 100.7 k tokens, 54 tool calls (~37 page fetches), 3.7 min.
- 49 fields: 36 agree, 10 disagree, 2 behaviour only (prey), 1 not stated (betta female length). 95 sources on 27 pages.
- **Opened-page check** (scripts/verify-quotes.mjs re-fetches every url and looks for the quote): 92 of 95 quotes are on the
  live page (69 verbatim, 23 the same characters split by markup, e.g. Seriously Fish's "~54<small>litres</small>").
  The 3 others are one Fishkeeping World table row the agent rebuilt from cells that are apart on the page; the values
  (Easy, Semi-aggressive, 30 gallons) are on the page. No invented page or number. The brief now forbids rebuilt rows.
- Integrated: provenance.ts reads research/sourcing/*.json + *.verify.json; 36 values cited, 2 prey lengths labelled
  assumptions (behaviour cited). Unsourced on main 1302 -> 1264. The 10 disagreements wait in decisions.md.
- **Per-item cost: ~10 k Sonnet tokens per species (~2 k per field, ~1 k per checked source).** The checker costs no model tokens.

## Fleet (14 Sonnet agents, ~1.6 M Sonnet tokens; two waves of 7, ~5 min each)
| lane | items | agents | est. tokens |
|---|---|---|---|
| A1-A7 species care + tl + pH (brief-care-tl.md) | 59 fish and inverts, 9 per batch: tetras / rasboras; barbs, livebearers, goldfish; gouramis + S. American cichlids; African cichlids + syno; cories, loaches, oto, puffer; FW + marine inverts; marine fish | 7 | 650 k |
| A8 amphibians (same brief) | dartfrog treefrog firetoad firenewt adf axolotl crestedgecko | 1 | 80 k |
| A9 reptiles + spiders, with AIR climate for the 5 land animals | crestedharlequin greenanole greenanolebrown brownanole leopardgecko regaljumper ballpython chacogoldenknee; AIR c / warm / rh / tol / rhTol | 1 | 120 k |
| C gear upkeep (tech.json) | minutes, watts, hours, pack life per gear kind (26 kinds): manufacturer manuals and care guides | 1 | 150 k |
| D cost defaults (demand-defaults, factors) | fit the per-category price bands to the listings already cited in demand-items / gear-catalog / tanks (a script, status derived); time and risk points stay assumptions with reasons | 1 | 150 k |
| E1 open fixes 2 + 3 + marine pH | BRS coral PAR page; EIA average residential USD/kWh (url, value, month); natural seawater pH 8.0-8.4 | 1 | 60 k |
| E2 open fix 4 | DENSITY, NWATER and optics, lamp tables, SUB_ALBEDO, MET_CLASS, SALT_LOAD, NITRATE_TARGET_N: one opened page or a stated reason each | 1 | 150 k |
| E3 open fix 1 | LU_PER_L checked against the nitrogen budget (scene/nitrogen.ts, research/filtration/) and AqAdvisor's filtration probes; a note, no engine edit | 1 | 150 k |
| **total** | | **14** | **~1.5-1.7 M** |

Margin: the pilot ran 100 k for 10; herps and marine pages are thinner (more searching), so +15 % is priced in.
Usage at quote time (2026-10-20 ~15:00): 5-hour 40 % at 70 % elapsed, weekly all-models 28 % at 50 % elapsed: behind pace.

## Run order and integration (this session, Opus)
1. Wave 1: A1-A7. Each writes research/sourcing/<lane>.json; the agents edit no code.
2. Per batch, here: `node scripts/verify-quotes.mjs research/sourcing/<lane>.json`, by-hand look at misses and nofetch
   rows only, append disagreements to decisions.md, re-run the audit.
3. Wave 2: A8, A9, C, D, E1-E3 (E and C write notes / JSON; the FORMULAS and RULES edits are done here).
4. Nathan decides decisions.md in one sitting; changed numbers become cited, kept ones get an assumption with the reason.
5. `GEN_SOURCES=1 npx vitest run test/sources.test.ts`, set the baseline to the committed state only (other lanes'
   uncommitted data moves the count: the tanks.json edits in this folder were worth 55 when this was written).
