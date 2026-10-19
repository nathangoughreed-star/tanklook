You are lane TM (Tech menu: the owner picks the tank's tech level, Walstad to full high-tech / SPS reef). Worktree
../Glass-Box-techmenu, branch techmenu, port 5823. Fast-forward to origin/main first. Run on Opus for the design steps;
subagents on Sonnet (price research, Haiku for greps).

Nathan's ask (2026-10-19, verbatim intent): a Tech menu where the user decides the tank's tech level: what filter(s) and
how large, the lighting (moved INTO this menu), heater(s) if they want them, CO2, ferts, saltwater gear (protein skimmer
etc.). Range: Walstad (super low tech) to very high tech. For every choice it must be clear (a) the cost, immediate AND
recurring, (b) the maintenance it adds, (c) how the tech looks in THEIR tank (lane TG draws it), (d) what they get out
of it: better plant growth, healthier / happier fish, more stocking options, etc.

Read first: HANDOFF.md "Start here" and the 2026-10-19 sections "Generic filter / heater models" and the demand model
(Phases 2-5, in HANDOFF or HANDOFF-archive.md "Lane KK"); src/data/gear-models.json, src/demand/gear.ts, engine.ts (the
`add(...)` gear rows: filter, heater, skimmer, co2, ferts), swaps.ts, fit.ts; src/scene/growtime.ts (GrowFeed), plantfit.ts,
lightneeds.ts, lightcheck.ts, kitlight.ts; src/ui/parGuide.ts and the Lighting section in index.html / ui/panels.ts; the
Plant care slider; src/data/aqadvisor.ts (AqAdvisor's form takes the filter: stocking % depends on it); src/data/climate.ts
(room temperature) and species temperature ranges; the archived Lane PG section (plant / coral light and care gating).

Design (decided by the opening chat 2026-10-19; change only with Nathan):
- Data: `TankSetup.tech?: TechSetup`, optional, NO version bump. Absent = today's inferred gear (default filter / heater by
  gallons, CO2 / ferts from grow.feed, skimmer when salt), and the demand numbers for an old file must not change (lock
  this with a test on the five examples).
- Rows (each a choice, "none" allowed where real): Filtration (none / Walstad, sponge + air pump, internal, HOB,
  canister, sump for salt or large tanks; sized from gear-models.json, auto-picked for the tank, step up / down, shows
  turnover x/hour); Heating (none, or heater(s) sized from the tank's heat loss: glass + open-water surface area, the
  target tank temperature (from the stocked species' range) minus the room temperature (climate.ts), lid or no lid; the
  same heat-loss figure gives the heater's duty cycle and so its kWh; two heaters offered on big tanks; chiller optional
  for reef when the room runs warmer than the target. Nathan 2026-10-19: area + tank temp + room temp, not gallons);
  Lighting (the whole current Lighting section moves in, no feature lost); CO2 (none, liquid carbon, DIY yeast,
  pressurized with solenoid / drop checker); Ferts (none, root tabs, all-in-one liquid, EI, dosing pump); Aeration (air
  pump / airstone); Water (conditioner, RO/DI, auto top-off); UV sterilizer; salt only: protein skimmer, return pump,
  powerheads / wavemaker, two-part / dosing pump, refractometer, salt mix. Keep the list data-driven (one JSON file you own,
  e.g. src/data/tech.json) so adding gear is a data edit.
- Presets ladder, one click each, then rows edit freely ("Custom"): freshwater Walstad / Low-tech / Planted mid /
  High-tech; salt FOWLR / Soft coral / LPS / SPS. Walstad needs soil substrate and heavy planting: say so when missing.
- One source of truth: grow.feed (low / ferts / co2) is DERIVED from the CO2 + ferts rows; the Plant care slider becomes
  a shortcut that sets those rows. Lane PG / plantfit then work unchanged.
- Each option shows: setup $ (p10-p90 from demand rows), $/month (consumables + kWh at the profile's rate), minutes per
  week (filter cleaning by kind, CO2 refills, dosing, skimmer cup), and "what you get" chips computed from the model, not
  prose: plant growth (feed x light band), stocking (AqAdvisor % with this filter; Walstad / no-filter caps), species
  access (no heater = only species whose range fits the room temperature, tropical ones flagged; salt corals by light /
  flow / dosing tier), risk change (CO2 gassing, heater failure, Walstad stability), algae risk when light and care do not
  match. Hovering / focusing an option previews the change in the four demand numbers before it is picked (reuse swaps.ts).
- Every number is for THIS tank (Nathan 2026-10-19), never a flat per-option figure: gear price by the size class the tank
  needs; kWh from the real watts x hours (light photoperiod, heater duty cycle from heat loss, pumps 24 h) at the profile's
  rate; consumables by volume (CO2 refill rate, fert doses, salt mix and RO water per water change); minutes by kind AND
  size (a canister on a 75 gal vs a sponge on a 10 gal). Test: the same option on a 10 gal and a 75 gal gives different
  setup, monthly and minutes numbers, and a colder room raises the heater's kWh.
- Where it lives: a "Tech" section in the panel (next to Water), the Lighting section folded into it.

Work unit (push each step on its own):
1. Types + tech.json + pure model (src/scene/tech.ts or similar): presets, defaults-from-old-files, derived grow.feed,
   per-option effects. Tests. Push early: lane TG builds against the type.
2. Price / power / minutes rows for gear the demand data lacks (air pump, UV, powerhead, wavemaker, return pump, sump,
   ATO, dosing pump, refractometer, chiller, root tabs, liquid carbon, DIY CO2, regulator, drop checker). Same format as
   demand-items.json (lo / mode / hi, unit note, one source url, est flag). Measure one Sonnet batch and quote cost to
   Nathan before the fan-out.
3. Engine: demand rows come from `tech` when present. Lane DS owns src/demand/* right now: put your logic in a new
   src/demand/tech.ts with a one-line hook in engine.ts, and coordinate via the coordinator if DS is still open.
4. The Tech menu UI with the Lighting section moved in, the presets ladder, per-option cost / maintenance / benefit and
   the hover preview. Pictures (Walstad, low-tech, high-tech planted, SPS reef on the same tank) BEFORE shipping; wait
   for Nathan's verdict.
5. Benefits wired: stocking % with the chosen filter, the heater / room-temperature species gate in Animals, salt tier
   gating corals. Pictures again.
Later hooks (not this lane): the start wizard (lane KW) asking tech level; setup sheet listing the tech.

Files you own: src/data/tech.json, src/scene/tech.ts, src/demand/tech.ts, src/ui/techMenu.ts, the Tech / Lighting section
in index.html, tech CSS appended to style.css; one-line hooks in ui/panels.ts, engine.ts, scene/types.ts (the optional
field). Lane TG owns the 3D gear (src/render/gear3d.ts): agree the placement fields (side, which wall) with it through the
type in step 1.

Ship per the lane rules: git fetch + merge origin/main, tsc + the tests you touched (suite: 120 s test timeout, about 90 s),
commit by path only (never -a), git push origin HEAD:main. Do NOT use git stash (shared across worktrees). The main
checkout holds other chats' uncommitted edits: never commit, pull, reset or stash there. Pictures of anything visible
BEFORE shipping, via SendUserFile, and wait for Nathan's verdict. No scene version bump. Fill in your stub section under
"Lane sections (current)" in HANDOFF.md. Subagents on Sonnet only; before any fan-out over 3 subagents or about 1 M tokens,
measure one batch and quote it to Nathan. Keep out of files you do not own; one-line hooks only in shared files, keep both
sides on merge. preview_stop when done. preview_start serves the folder the chat was opened in: run this chat inside its
worktree. If this chat gets long, hand off to a fresh chat at a work-unit boundary after writing your state into your
HANDOFF section.

Coordinator protocol: message the coordinator local_408aa124-ce91-4651-abaf-a221f0ceac82 ("Lanes coordinator 4") with
send_message when work lands on main and when you are done: commit hash, what landed, what is still open, which files are
free. Step 1 landing unblocks lane TG's wiring: say so. Questions for Nathan stay in your own chat, with pictures. The
coordinator cannot relay approvals.
