# Maintenance rhythm research (lane C6, 2026-10-27)

Research only. Nothing here is wired into the app and no engine data file was changed.
Feeds the Discover "care rhythm / away-days / setup time" inputs in research/design/start-flow.md (section d).

Files
- [cadence-by-class.md](cadence-by-class.md): cadence and neglect tolerance, per animal class and tank type.
- [setup-and-automation.md](setup-and-automation.md): cycling weeks, setup, automatic water changer, automatic feeder, ATO.
- [cadence.json](cadence.json): everything above, machine-readable, with the verbatim quote, URL and access date per source; plus `model_chores`.
- raw/: the three lane outputs and build.py that merges them (rerun from this folder: `python raw/build.py`).

Counts: 131 researched items, 114 sourced, 17 assumption; plus 9 `model_chores` rows (all assumption: they are the existing weekly means with an interval added).

## What the sources do and do not give
**Sourced: intervals and tolerance** (feeding every N days, water change % and interval, filter rinse interval, misting, bulb replacement, days without food, cycling weeks). **Not sourced anywhere: minutes per task.** Only one page states any (springtail culture, under 1 min a week). Same finding as the MW lane (research/minutes-a-week.md): pages state frequency, never minutes. So every minutes-per-session number below is an assumption, the weekly mean is the existing one in `src/data/demand-defaults.json`, and only the cadence is new.

## "5 minutes daily" vs "35 minutes weekly": the chore table (assumption minutes, cited intervals)
Weekly means are exactly today's demand-defaults values (no number moves). `everyDays` and minutes per session are the split.

| chore | every N days | min per session | weekly mean (existing) | interval source | minutes |
|---|---|---|---|---|---|
| water change, fresh | 7 | 12 + 0.5/gal (bucket), 8 + 0.2/gal (hose) | by tank | sourced (10-20 % weekly) | assumption |
| testing, established | 14 | 6 | 3 | model 2-4 wk (FishyHub); this lane found 1-2 wk goldfish, weekly reef | assumption |
| filter rinse | 14 (canister about 28) | 4 (canister 8) | 2 | sourced (JBL) | assumption |
| feeding trip, by hand | 1 | 0.5 | 3.5 | sourced (once a day) | assumption |
| glass wipe | 7 (reef: 2-7) | 1-4 | 1-4 | sourced | assumption |
| yearly jobs | 365 | 208 | 4 | none | assumption |
| salt work | mixed, daily to weekly | n/a | 15 | sourced intervals, cannot split minutes | assumption |
| terrarium misting + spot clean | 1 | about 1.3 | 9 (auto mister 7) | sourced (daily) | assumption |
| dry terrarium spot clean | 1 | about 0.7 | 5 | sourced (daily) | assumption |

Consequence: a fresh 20 gal community tank is about one 14 min water-change day a week plus 0.5 min feeding every day (the "daily" part is under 1 min, but it cannot be skipped); a salt tank adds daily top-off unless an ATO exists; a gecko or frog terrarium is a daily 1-2 min mist plus feeding every 2 days to 2 weeks.

## Away-days (neglect tolerance), sourced, ranges as the pages state them
| animal | days without feeding or help | note |
|---|---|---|
| healthy adult freshwater fish | 3-5 days (comfortable); 2-7 alone, sitter over 4 | 40-50 % water change the day before; auto feeder over 5 days |
| goldfish | up to 14 days unfed | tetras 7; angelfish-type cichlids only a few days |
| betta | 5-10 survivable, 4-5 recommended max | |
| marine fish | a few days to about 1 week | tangs, butterflyfish tolerate less |
| neocaridina shrimp juveniles | point of no return 9-16 days (paper) | adult tolerance ASSUMPTION |
| leopard gecko | 1-2 days with no helper; 10-14 days unfed "not ideal" | |
| tarantula | weeks to months unfed | |
| crested gecko, anole, tree frogs, dart frogs | daily misting is the binding chore (automatic misters raise this, no page states by how much) | |

Binding chore sets the away-days: fresh fish about 3-5 d (feeding), salt about 1 d without an ATO (top-off), misted terrariums about 1-2 d without an auto mister.

## Reconciliation with existing demand rows (extended, not contradicted, except as noted)
- Water-change floor 10 % and weekly interval: agrees (cited rows).
- Testing: the model has 3 min/wk (6 min every 2 weeks, "established tank"). This lane found sources saying every 1-2 weeks for goldfish and weekly full tests for reef (BRS). The 2-week figure fits freshwater only; salt may deserve weekly. Not changed; flagged for Nathan.
- Planted tank water change: JBL says about 1/3 every 2 weeks, Aquarium Gardens (UK retailer, high-tech) 50 % weekly. These disagree with each other and with the nitrogen-derived fraction; the model's nitrogen-derived value is not contradicted by either, but no source backs a planted-specific change.
- Shrimp: 25 % every 2 weeks (one page opened); other snippets said 10-20 % weekly, unopened.
- Feeding: the model's flat 3.5 min/wk is a daily feed. Sources: goldfish daily, crayfish daily, ADF daily/every other day, but also crested gecko 1-2 times a WEEK, ball python every 10-14 DAYS, leopard gecko every 2 days, tree frog every other day. The reptile animal row (`mins` 2/wk flat) hides that daily-vs-fortnightly difference; it matters for the rhythm model.
- Misting rows (9 and 7 min/wk, est): intervals now cited (daily); minutes remain assumption.

## Setup and cycling (details in setup-and-automation.md)
- Cycling weeks, sourced: freshwater 4-6 weeks (pages range 2-8; wait at least 4 before fish); reef about 6 weeks then 2 more before first frags (several pages: 3-8); bioactive vivarium 4-8 weeks to establish the cleanup crew, 2-4 before the animal; paludarium aquatic part 2 weeks minimum before animals.
- Planted grow-in: ASSUMPTION only (a vendor "about 2 weeks dark start"; forum advice 6-12 weeks before livestock, not opened).
- **Hands-on setup HOURS: no opened page states them for any tank type (assumption, none usable).** Do not put a number in the app from this lane.

## Automatic water changer (what the sources support)
- Replaces: the buckets and carrying (Python No Spill Clean and Fill, 75 ft kit, $119.99 listing). Freshwater refill only; for salt the new water is mixed in a separate container and pumped, so mixing is not saved. Install: 4-step faucet hookup, no hours stated. Manufacturer limit: no more than 1/3 of the tank at once, wait a week before repeating.
- Drip / automatic systems: running cost under $1 a month (two pages), gravity works in a power outage; inspection: check flow weekly, replace inline carbon every 1-2 months; failure modes: drain clog overflows (add a float valve), non-code plumbing can flood.
- Does NOT save: filter cleaning, glass, testing, trimming, salt mixing, feeding. It does not replace filtration.
- Not found: Neptune / Genesis / Octopus automated-system price and install time (a search snippet said "$300-800+", unverified, assumption).
- The MW lane's hose row (8 min fixed + 0.2/gal vs 12 + 0.5) remains an assumption; one retailer page gives a whole-change total (20 min for a 55 gal, 25 %) that is consistent but not a rate.

## Automatic feeder (what the sources support)
- Daily trips go away; weekly refill and inspection remain. Load 3-5 days of food at a time (one page), Eheim 3581 capacity about 100 ml, retailer says battery about every 6 months (manufacturer silent, so refill interval unsourced and the model's "every 2 weeks, 0.3 min/wk" stays an assumption).
- Failure modes (two pages): humidity clumps food and jams or dumps the hopper (Eheim has a ventilator for it). Advice: test run 3 days before leaving. Not a substitute for observing fish daily; overfeeding risk.
- Effect on the rhythm: removes the daily feeding obligation, not the need to look at the tank; for away-days it extends feeding cover, but healthy adults already tolerate 3-5 days unfed, so it matters over about 5 days.
- ATO (salt): wipe sensor pins about monthly, impeller monthly; failure modes overflow, back-siphon, pump run dry. Reservoir refill interval: not stated by any opened page.

## Gaps (honest list)
1. Minutes per task: no source, anywhere. Every minute figure is an assumption.
2. Hands-on setup hours per tank type: none found.
3. Planted grow-in weeks and the reef cycle: weak (several pages 403; reef rests on a few anecdotal pages, one article at 8 weeks).
4. Species not covered by a sourced figure: cichlid feeding, snails, shrimp feeding and adult fasting, corals (feeding and neglect), isopod feeding, ball python fasting/vacation (forum only), red-eyed tree frog (snippet only), dart frog automatic mister tolerance, ADF vacation, millipede/tarantula substrate schedule.
5. Neptune/Genesis/Octopus price and install; Eheim manufacturer refill interval; ATO reservoir refill interval; Python install hours.
6. Source quality: mostly retailer care guides (PetSmart for the herp lane, gensou.sg for setup); few vet / extension / zoo pages. RSPCA Australia and OFI are the best. Disagreements are recorded rather than averaged.
7. Species the app models but this lane did not reach: most of the 96 species (only classes and representative animals were researched), the fw-invert class beyond neocaridina and crayfish, sw-invert (corals) beyond cycling.
