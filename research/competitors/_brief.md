# Competitor research brief (2026-11-25)

Nathan's product is **YourArium** (code name Glass Box / TankLook, live at tanklook.com). Each research agent
covers one competitor and writes `research/competitors/NN-<slug>.md` in the template below.
Prior notes worth a grep (do not read whole): `research/research-sims.md`, `research/feature-ideas.md`,
`research/aq-compare.md` (our stocking engine vs AqAdvisor).

## What YourArium does today
- Web app (desktop + phone), plus an Android PWA/TWA. Free, no accounts, no monetization yet.
- Real-time 3D tank you orbit: glass, stand, substrate, rock, wood, plants, animated fish/inverts/herps,
  equipment drawn in the real product's colours (filters, heaters, lights, pumps). Fish drawn from reference photos.
- Worlds: freshwater, brackish, marine/reef (corals), plus terrariums / vivariums / paludariums (geckos, frogs, snakes, isopods).
- Real tank catalogue (standard US sizes, popular brands like Petco Imagitarium rimless) or custom size; sumps.
- Stocking engine: space %, filtration %, group sizes, sex ratios, compatibility gates (temperament, water,
  size, predation), calibrated against AqAdvisor and an expert-stocking curve. "Fine now, outgrows it in N months".
- Guided setup: Animals First, Look First, or "Open to anything / Explore complete setups"; one persistent setup brief;
  owned gear marked Available vs Required; budget / limits; optional experience-level gate (animals, plants, gear).
- Generator: archetypes and scape styles (e.g. Overflowing Garden, Malawi, biotopes), density recipes,
  Budget vs Luxury version of the same look, taste discovery by example images.
- Money: priced shopping list from real products, scheduled price/deal sweeps, cheaper-equivalent and bundle suggestions.
- A/B split compare of two setups; printable report; rock weight budget; light/CO2/ferts needs for plants;
  maintenance minutes a week; undo/redo, multi-select, scatter brush.

## Planned / in progress
Plant growth over time + growth timeline, emersed/floating plants, better plant leaf textures, AR view (Android, iPhone),
progressive loading / single-file build, more fish models, herp expansion.

## Deliberately out of scope
Care guides / build plans (cycling schedules, when to add animals, upkeep reminders): Nathan's view is that
AI chatbots cover that; YourArium focuses on what a chatbot can't (seeing it, customizing it, honest numbers, prices).

## Output template (keep each file under ~1,200 words; cite a URL for every claim from a source)
```
# NN. <Product> (<platform>)
Researched 2026-11-25. Confidence: high / medium / low (how much real user feedback was found).

## Snapshot
URL, maker, platform, price / model, status (active? last update), rough audience size (reviews, downloads, followers).

## What it does
Bullets of real features (from its own site / store page).

## What users love
Bullets, each with source link (store reviews, Steam reviews, Reddit, forums, YouTube comments).

## Complaints and weak spots
Bullets with sources: bugs, missing features, accuracy, price, performance, UX.

## What users wish it had
Feature requests, roadmap asks, "I wish..." posts, with sources.

## vs YourArium
- They have, we lack:
- We have, they lack:
- Ideas worth taking (ranked, one line each):
- Threat level (low / medium / high) and why, one line.
```
If almost no user feedback exists, say so plainly instead of padding; describe the product from its own pages.
