# Answer 3: strategy, ranked backlog, two-week plan, first 100 users

Fable, 2026-11-25. Answers `3-backlog-triage-brief.md`. Read in full: the brief, the six wave-1 answers (1 art, 2 first visit, 4 perf, 5 fish pipeline, 6 trust, 7 aliveness), `research/competitors/SUMMARY.md`, `chatgpt-report-delta.md`, and rows R152-R161 of `research/requests.md`. No code was opened and nothing was run; every effort figure is inherited from the answers or is my guess, and is marked.

## Two-minute summary

**Where TankLook stands.** It is a strong engine behind a weak front door. The six reviews agree on more than they disagree: a cold visitor waits on a blank page while 6.1 MB of fish art loads (answer 4, estimated), then meets a modal that shows no fish, no price and no verdict (answer 2), and if they stay, the verdict can read "Compatible" and "Easy" for a tropical tank with no heater (answer 2, from stills). None of the product's real advantages is visible in the first minute, and the one it most depends on, a verdict people can trust, has a hole in it.

**Positioning.** "Build your real aquarium in 3D before you buy anything: real tanks, real gear, real prices, and a verdict that shows its working. Free, no account." Defend three things: (1) the verdict that shows its working, (2) the real, purchasable world (tank catalogue, branded gear, priced list), (3) breadth in one free tool, with marine first because TankMates is freshwater only. Do not try to win on roster size, native apps, AR or game features.

**The call for the next two weeks.** Three lanes, none needing ChatGPT sheets from Nathan:
- **FD, front door:** boot stops waiting on fish art, old UI leaves the entry (lines up with the 11-29 deletion), then the landing screen shows a living, priced, checked example with doors named for the three jobs, and a shared link lands the same way.
- **HV, honest verdict:** no green without life support, one source of truth for "what is missing", the labelled "Room used" meter with its working, then the "How we calculate" page.
- **BR, behavior relations:** tall fish stay under water, pairs stay together, schools part around big fish, and aggression appears only where the verdict flags it; then the tap label that says why.

**Where I side against the answers.** Three of six (1, 5, 7) say behavior is the main investment. I give it one lane but rank it third: the praise for behavior comes from people who paid for a Steam game to watch; TankLook's first users will arrive with a planning question, and they must first load the page, see what it is, and not be misled. Where answers 2 and 6 conflict on the no-heater case (not green vs green "so far"), I side with 2.

**Cut or pause.** Pause new fish batches after b8, new plant families, R147 colour types, R98 gear photos, R149 polygon glass, AD, style scores, apps and AR. Close R144 (the approved fish are the style; bring the scenery to them).

**First 100 users.** Not before the three gates pass (scenario 0, cold phone load, landing shows a tank). Then: 5 watched sessions, then about 20 from people and one friendly forum, then about 80 by answering "is this stocking OK?" threads with a share link that shows the tank and its reasons. Learn which of the three jobs people actually bring, and whether they believe the verdict.

**Confidence: medium on direction, low on sizes.** The plan rests on stills, estimates and a low-confidence competitor survey. Day 1 has four cheap checks that could reorder it; they are listed in section 3.

---

## 1. Positioning and the advantages worth defending

**One sentence (internal positioning):** TankLook is the free, no-account planner where you build the real tank, in real sizes with real gear at real prices, in 3D, and get a verdict that shows its working, before you buy anything.

**The landing line** is answer 2's and I would not improve it: "Build your aquarium in 3D before you buy anything, and see whether the fish will thrive, what it will cost, and exactly what to buy." Sub-line per answer 6: "Free, no account. Calculated by fixed rules on published care data."

**Advantages worth defending, in order:**

1. **A verdict that shows its working.** Growth-aware, split into room / floor / filtration, each warning with a reason, a source and a fix. This is the one thing the category's users complain about everywhere (AqAdvisor "hocus-pocus", My Aquarium Guide "off") and the thing a chatbot cannot be trusted for. It is also **not yet true on screen**: today it is a lone percentage, five identical "Compatible" pills and at least one false green. This advantage has to be built before it can be defended. Answer 6's finding matters here: the engine is fitted to AqAdvisor at a median 1.01, so the claim is "we show the working", never "we are less conservative".
2. **The real, purchasable world.** 812 real tanks, branded gear with fit rules, a priced list, owned-gear tracking. This is what turns a picture into a purchase (the Scape It user who took a layout to a shop). TankMates now also shows prices, so the defensible part is depth: owned gear, "what is left to buy", cheaper equivalents. Prices need the same honesty as verdicts: a visible "checked on" date.
3. **Breadth in one free tool, marine first.** TankMates, App-aquatic and most planners are freshwater. Marine is live; herps are built but hidden, so do not claim them yet. "Free, no account" is a real edge today, but it is a policy, not a moat.

**What I would not defend:**
- *Orbitable 3D by itself.* TankMates, OneShoal and Shrimpspin have it. It is the price of entry.
- *Behavior against the Steam games.* They have years of head start and a different audience. What is unique is answer 7's idea: **behavior as evidence for the verdict** (the angelfish rushes the neons, and tapping it quotes the rule). That belongs to advantage 1.
- *Roster size.* 917 and 932 are data rows. Answer 5's 250-300 modelled fish is a sensible long-run ceiling, not a two-week goal.

**On TankMates:** it has no audience found, and neither do we. The race is not features; it is who first gets believed by a few hundred real keepers. One hour hands-on with it (section 4) is worth more than any further desk research.

---

## 2. All open work, ranked by value to users divided by effort

Value is judged against the vision and the first 100 users. Effort: S under a day, M a few days, L a week or more. "Src" is where the item comes from (A1-A7 = wave-1 answers).

### Tier 1: do in the next two weeks

| # | Item | Src | Effort | Why it ranks here / the factor |
|---|---|---|---|---|
| 1 | No green, "Easy" or finished list without life support; one "what is missing" source for checklist, drawer, cost drawer, print | A2 change 2 | M | Trust. A false green is the one screenshot that can sink a product with no reputation |
| 2 | Verdict basics: not-checked stops greying the pill, "Room used" with ticks and zones, judgment never red, "count as N" and headroom | A6 items 1-4; R161 thresholds; R152 first half | about 2 days (guess) | Trust per hour is the best in the backlog; no data plumbing |
| 3 | Boot never waits on fish art; old UI out of the entry, then deleted | A4 steps 1-3; R146 load; `?ui=1` removal | M | Every visitor pays it; grows with each approved fish; the 11-29 deletion is already promised |
| 4 | The tiny defects: hidden "Replace your project?" dialog, wrong Cardinal tetra tile, "40 breeder" opening as Custom 45 gal, clipped phone strip, UK spellings, Land toggle | A2 defect table | S each | Cheap; each one reads as "broken" or "does not know fish" |
| 5 | Landing: the promise, a stocked example at first paint, four doors named by job; every door lands on the tank, not a settings form | A2 changes 1 and 3 | M | The four advantages are invisible today; depends on item 3 |
| 6 | Tall fish under water, pair formers share a home, schools of different species stay apart | A7 phase 0 | 1.5 days | A fin above the water line costs more belief than any new behavior adds |
| 7 | Reactions: give way, startle, verdict-driven chase and flee, guard | A7 phase 1; R154 | 3 days | Top category complaint; the only version of it no rival can copy; chatbot-hard |
| 8 | "How we calculate" page at a real URL, drawer footer link | A6 item 5; R152 second half | 1-1.5 days | The link people paste into a forum reply; answers the AI hostility |
| 9 | Share link: verify it cold, land it full-width with the result card, PNG export carries the URL | R155 part 1; A2; A4 | S-M (link reported to exist; unverified) | No sharing, no growth loop; the outreach plan in section 4 runs on it |
| 10 | Plant colour: find why lime renders when the atlas is olive; fix | A1 row 2; R151 close-out | S | Biggest pixel share of the first-impression still; may already be fixed |
| 11 | Example tanks use only approved fish, pass their own check or say why, one neutral room | A1 rows 1 and 6; A2 screen 13 | S | The examples are the landing screen after item 5 |
| 12 | Tap label with a why line | A7 phase 2 | 1.5 days | Fish Game's most praised feature, nearly free here, and it carries the verdict |
| 13 | `sw.js` cache-first for versioned art; size budget gate in `npm run build` | A4 steps 4-5 | S | Stops the next regression; repeat visits stop revalidating 221 images |
| 14 | b8 review by Nathan, with minutes and rounds logged; back up `C:/Users/nreed/fish-sheets` | A5 section 4, change 4 | Nathan's time; S | The pipeline's only missing measurement; the sheets are unbacked source data |
| 15 | Deals sweep once before outreach; show the "checked on" date | brief; deals pillar | S | Stale deals undercut advantage 2 on first contact |

### Tier 2: next (weeks 3 to 6), in this order

| # | Item | Src | Effort | Factor |
|---|---|---|---|---|
| 16 | Fix buttons with stated effect; juvenile vs adult on the row; filtration meter with the plant credit shown | A6 items 7, 8, 10; R153; R156 | 2-3 days together | Each closes a named category complaint from existing engine data. Start in week 2 if lane HV has room |
| 17 | Confidence and source on every Issue, "Why?" disclosure | A6 item 6; ChatGPT report | 2-3 days | Makes the method page true row by row; merge "pair ratings with reason + fix" and the useful part of R142/R143 (needs lines) into it |
| 18 | Owner door: "I already have a tank or gear" | A2 change 4 | M (routing) | One of three jobs has no entry. Only after someone has looked at a "Fill only the gaps" result |
| 19 | Yourarium rename | brief | S-M | Do it **before** the first public post or accept the old name for good; renaming after links exist throws them away. Nathan's call |
| 20 | Watch mode, thin | A7 phase 3; R158 | 1 day | Cheap; gives the share link something to show; no sound |
| 21 | Reef rock and coral colour and light | A1 row 3 | S-M | Marine is advantage 3; do it before any reef-forum outreach |
| 22 | Fish build gate (printed checks block), fin map test on the 81 stored sheets | A5 changes 1-2 | M, no Nathan time | Precondition for any batch after b8 |
| 23 | Search pages ("20 gallon stocking", "40 breeder builds") built from example tanks, linking into the planner | ChatGPT report | M | Slow channel; start once the method page and share landing exist |
| 24 | Behavior data pass, 13 uncovered fish, air gulping | A7 phase 4; R145 | 2 days | Nathan asked for R145; it is data, not a phase |
| 25 | Sourced behavior caps as Notes (the under-warning risk) | A6 item 9 | 1-2 days, data | 8 gouramis in a 55 gal reading 31% is the next false-comfort case |
| 26 | Growth preview at month 0 / 3 / 6 / 12 | R157 | S if the landed growth timeline (GR3) already does it; verify | The survey lists growth as gap 3, but the brief says a growth timeline exists. Probably a surfacing job |
| 27 | Sand, gear finish, room, stone mid-detail | A1 rows 4-7 | S-M each | After behavior, in A1's order; gear finish replaces most of R98 |
| 28 | R150 yellow lab roll | brief | S | Built; needs Nathan's look on live. Close or reopen |

### Tier 3: defer (no date)

| Item | Reason |
|---|---|
| R147 colour types | L and fed by Nathan's sheets; wait for the gate and lazy loading. The interim repaint stands |
| New fish batches after b8, roster growth | A5: pause until gate + lazy art exist. I agree |
| New plant texture families (R151 batch 3+) | Finish the colour fix first; A1 says small leaves gain nothing from texture at default framing |
| AD plant advice + "expected plant outcomes" + R160 click-a-spot | **Merge into one lane** (one data model). L. Valuable and chatbot-hard, but it is a second verdict system; finish making the first one trusted |
| Generate vs build-it-yourself Look brief; R69 Discover modes | L design question. The door renaming in item 5 absorbs the urgent part; let the first users show which job dominates before redesigning |
| R98 gear photo models | Token-costly (10-16% of a weekly bucket); A1's finish and bevel fix gets most of the gain |
| R149 polygon glass check | M for the few who reach the custom maker. Nathan asked on 11-25, so this is his to overrule; my ranking says wait |
| LB length bonus; global expert re-fit | A6: more fitting does not buy trust, visible reasoning does |
| Android TWA, native iOS, AR unhide | Store presence matters after there is something people return to. AR stays hidden |
| Herps / terrarium | Stays hidden by Nathan's choice. Unhide later as a second launch |
| Level readout, `shy` field, sound, day and night | A7 phase 5 and beyond; none before a user asks |
| Rule-of-thirds overlay, layout variants, follow-a-fish camera, photo overlay, reef-safe flags, equipment sizing, R161 filter quiz | S each, none moves a first visit. Reef-safe: verify whether it exists |
| Audit items not started (nitrogen budget, BL1 three builds, constraint fields...) | Already "only on his request". Leave |
| Hard-limit colour family, printed report footnotes | A6 items 11 and deferred list; after item 17 |

### Cut or close

| Item | Action |
|---|---|
| R144 fish art style | **Close.** A1's finding settles it: the approved build-B fish are the target style, and what looks out of place is the scenery. Restyling would redo 45 live models |
| E-GEN generated models | No lane, no Hugging Face purchase. Allow A5's single blind A/B (existing oscar GLB vs today's `oscarb` at tank distance, with file size). Unless Nathan still picks it and it fits about 400 KB, close |
| R159 per-style design score | **Cut.** An unsourced score out of 100 is exactly the lone number the trust work removes |
| Time-based sim (nitrogen, algae) | Cut, as already noted: it changes what the tool is |
| Sim-measured "activity" score | Cut (A7) |
| Per-species AqAdvisor side-by-side as a feature | Cut (A6); keep the Check button, moved under our own reasons (A2 change 5) |
| Placeholder / re-skin fish tiers, half-resolution fish art, auto quality step-down, `manualChunks` tuning | Cut (A5, A4) |
| R7, R9, R148 | Close: answered or landed; the table is stale |
| R124 kit lid | Nathan answers in one line, or close |
| Photo fish ID, logging, reminders, care guides, game loop | Out of scope by decision. Keep it that way |

### Where the answers conflict, and my side

- **Behavior first (A1, A5, A7) vs trust and front door first (A2, A6, A4).** I side with the second group on order, and still give behavior a full lane. Reason: the audience. Behavior praise is from Steam buyers who came to watch. Planner users came with a question; if the page is blank for 5 to 30 seconds, or the answer is wrong, they never see the fish move.
- **No-heater tank: "not green, names the gap" (A2) vs "Compatible so far · 2 to check" in green (A6).** A2 wins. A6's own rule says an outcome that depends on an assumed input is a Caution, and its own mockup shows Environment as Caution under a green pill, which contradicts "the pill is the worst check". The rule I would give lane HV: a missing input that a stocked animal needs (heat for tropical fish, a filter) is a **Caution with a fix button**; "Not checked" is only for missing data, never greys the pill, and never appears beside the plain word "Compatible".
- **Stylization lane now (A1) vs three lanes already full.** I split A1's three fixes instead of giving them a lane: plant colour goes to the running PT lane as its closing task, example-tank species go to FD, reef rock waits for week 3. A1 itself says the plant gap may already be closed by atlas batch 2.
- **Share link: "top growth gap" (survey) vs "already exists in the file menu" (A2) and "builds on the `#tank=` hash" (A4).** I take it as mostly built and untested cold. That makes it S-M and puts it in FD's second week, after the boot fix, as A4 asks.
- **"92 species on default roam" (brief 7) vs 13 (A7).** A7 read the code; I take 13, and so the behavior data pass drops to tier 2.

---

## 3. The next two weeks (11-26 to 12-09): three lanes

Lane IDs FD, HV and BR do not appear in the brief's appendix; the coordinator may rename them. All three are autonomous: **none needs ChatGPT sheets**. Nathan's own inputs are listed after the lanes. I cannot support token figures from this evidence; each lane is about two M-sized work units, so measure the first unit and quote before continuing, per the usage rule.

### Day 1, before the lanes start (coordinator plus one Sonnet agent)

1. **State sweep.** In `research/requests.md`: close R7, R9, R148; add a row for every tier 1 item and for A2's defect table (Nathan's rule: everything he would point at is tracked to live); map R152 / R153 / R156 / R161 onto lane HV, R154 onto BR, R155 onto FD. Refresh HANDOFF "Start here".
2. **Four checks that could reorder this plan:**
   - Cold trace per A4 step 1 (desktop, throttled, one real Galaxy S24+ run). If the blank page is under 1 second on LTE, A4's diagnosis is wrong and FD starts with the old-UI split instead.
   - Reproduce scenario 0 on the live build: 29 gal, 8 neons, 1 bristlenose, one hang-on-back filter, nothing else. A2 saw it in stills only.
   - Run one Discover Explore and one "Fill only the gaps" to the end and look at the results (A2's largest gap; decides where the beginner door leads).
   - Run the existing AqAdvisor Check on 10 cardinals in a 40 breeder (A6: all "where we differ" copy waits on it).
3. **PT lane closing task:** re-shoot A1's picture 06 on a build with atlas batch 2; if rendered green is still above S 0.60 or L 0.45, apply A1 row 2's fix in `src/render/items.ts`. Then PT stops; no new families for two weeks.
4. Back up `C:/Users/nreed/fish-sheets` (outside the repo, unbacked).

### Lane FD: front door

**Goal:** a cold visitor sees a living, priced, checked tank within a few seconds and can name a door for their situation. **Week 1 (A4 steps 2-5):** in `src/main.ts`, start `bootShell()` at once; replace load-all in `src/art/photofish.ts` with a per-look loader that fetches only the live species in the opened scene, in parallel with shader link, holding only the animals reveal in `viewer.ts` `revealTick` with a timeout that falls back to the old model (check `species.ts` `goLive` and the picker thumbnails); move the old UI behind `import('./oldUi')`, then delete it on 11-29 as promised; make versioned fish art cache-first in `public/sw.js`; add `scripts/size-budget.mjs` to `npm run build`. **Week 2 (A2 changes 1 and 3, R155 part 1):** in `src/shell/start.tsx` and `logic/start.ts`, put the promise line as the sheet headline and four doors by job with a picture each ("Show me tanks I could build", "Start from a fish I want", "I already have a tank or gear" as a plain route to the tank picker for now, "Build my own from scratch"; bundles become a link); first paint behind the sheet is a stocked example with no panel open (`App.tsx` near line 214); examples and animal-door results open full-width with one card (name, cost, verdict with reason, "Make it mine" / "See another"); Blank lands on the tank picker; dock the checklist line in the panel header (`checklist.tsx`, `shell.css` near line 688); fix the dialog stacking, the "40 breeder" example data, and make the house examples use approved fish only. Then verify the existing share link on a cold load (`boot.tsx` `#tank=`), land it the same full-width way, and put the URL on the PNG export. **Done when:** on a named live build, a cold S24+ load on LTE shows the first tank part in 5 seconds or less (8 throttled), no fish art is fetched before the shell, JS + CSS before first tank is at most 800 KB gzip (targets are provisional until the day-1 trace), a screenshot of the landing screen shows moving fish, a price and a verdict at zero clicks, and a share link opened in a fresh profile shows the same tank. **Must not touch:** `swimSim.ts` and the swim files, `stockSummary.ts` / `verdict.ts` / `stocking.ts`, `items.ts`, the fish build scripts. It consumes lane HV's "what is missing" function in the checklist; it does not write its own.

### Lane HV: honest verdict

**Goal:** no screen certifies a tank it has not checked, and every number says what it is. **Week 1:** first reproduce scenario 0 and diagnose the 74 °F chip against the "assumed 70 °F" text. Build one "missing life support" function and make the header chip, Habitat drawer, checklist (`src/shell/logic/checklist.ts`), cost drawer and print list (`planSheet` / `buildPlanSheet`) all read it; a missing heater or filter that a stocked animal needs is a Caution with a "Fix it" button, never green, never "Easy", and the print list opens with "Not chosen yet" when incomplete. Then A6 items 1-4 in `stockSummary.ts`, `stocking.ts`, `src/scene/verdict.ts`, `animalfit.ts`, `territory.ts` and the drawer UI: "Not checked" never greys the pill; one name "Room used" with ticks at 75 and 100 and zone words; "Ideal." retired; the "count as N for room" line and headroom; unsourced count notes (the neon "max 30") deleted or demoted; the gourami line amber until sexes are stated; the AqAdvisor Check button moved into the drawer under our own reasons. **Week 2:** the static "How we calculate" page at a real URL (A6 mockup g), counts generated from `research/source-baseline.json`, wording "Calculated by fixed rules; no AI model runs when you use TankLook; sources were gathered with AI assistance" (not "no AI", not "expert-calibrated"), drawer footer link; then, as time allows, fix buttons with stated effect, juvenile vs adult size on the animal row (R156), and the filtration meter with the plant credit visible (R153, tagged "our judgment"). **Done when:** on a named live build, scenario 0 shows an amber chip naming the heater with a working fix, the checklist / drawer / print list agree, 10 cardinals in a 40 breeder opens with a non-grey pill and a labelled Room meter, a test asserts that no unsourced rule can render red and that an unheated tropical tank cannot be green, the method page loads from a pasted link, and screenshots of each are in the report. **Must not touch:** `main.ts`, `start.tsx`, `photofish.ts`, the swim files. It must keep the exported pair rule in `animalfit.ts` stable, because lane BR calls it; any signature change goes through the coordinator.

### Lane BR: behavior relations

**Goal:** animals notice each other, and unfriendly behavior appears only where the plan has a flagged pair. **Week 1 (A7 phases 0 and 1):** in `swimTypes.ts`, `swimSim.ts`, `swimHome.ts` and `build.ts`: add `tall` (half body height) to the spec and use it in the surface clamp, the band and `pickGoal`; let `PAIR_FORMERS` (`groups.ts`) share one home when exactly two are present; add soft separation between groups of different species. Then, in this order: give way to fish 2.5 times longer, startle (seeded, plus a click on open water outside edit mode), chase and flee driven by a foe list that `build.ts` builds by **calling** the same pair rule `animalfit.ts` uses (never copying thresholds), and guard for home keepers. First confirm with a 10-line script how many real species are still on plain roam (A7 estimates 13). **Week 2 (phase 2, then phase 3 if time):** `SwimPose.act`, a hover / tap label from the fixed word list in A7, the why line quoting the verdict's sentence with a link to its chip (`roam.ts`, one small shell component; no pause on tap outside edit mode); then thin Watch mode beside Full screen (sway, wake lock, no sound). **Done when:** on a named live build, re-shot contact sheets show no fin above the water line in 60 seconds, both ocellaris within 3 lengths in every frame, and neons and harlequins readable as two groups; a 20 gal with a betta and guppies shows a rush within 2 minutes; the planted example with no flagged pair shows zero chases in 10 minutes; a test asserts every flagged pair yields a foe entry and no unflagged pair does; the steering step is measured at 50, 200 and 500 fish with A/B alternated per frame; tapping ten fish gives a word that matches what each is doing. **Must not touch:** `animalfit.ts` (read only), `stockSummary.ts`, the shell start files, `main.ts`, any art or shader file. No feeding, hunger, health, damage or death.

### What Nathan feeds (hours, not sheets)

- Review the 21 built b8 fish with a timer; record minutes and rounds per fish in `build.json` (A5's baseline). Royal gramma and blackskirt still need work.
- One hour hands-on with TankMates and App-aquatic (section 4).
- Five watched sessions (section 4).
- Decisions: rename before launch or not; a cookie-free visit counter or none; close R144; R124; whether R149 jumps the queue.

### After two weeks

The next three in line are tier 2 items 17 (source on every Issue), 18 (owner door) and 21-22 (reef rock; fish gate), unless the first sessions say otherwise.

---

## 4. The first 100 real users, and what to learn from them

### Gates before anyone outside is invited

1. Scenario 0 passes on live (no green without a heater).
2. Cold phone load meets the target.
3. The landing screen shows a tank, a price and a verdict.
4. The method page is live.
5. The name is settled.

Posting earlier spends the one first impression a new product gets in each community.

### Stage 0 (during the two weeks): 5 watched sessions

People Nathan can sit beside or screen-share with: at least one who has never kept fish, one who owns a tank, one experienced keeper. Give them only the URL and one sentence ("plan a tank you might actually set up"). Do not help. Note where they stop, what they click first, and whether they believe the verdict. This costs two or three hours and will correct this document more than any further review.

### Stage 1 (about 20 users): people and one friendly room

- Fishkeepers Nathan knows, a local aquarium club, a local fish shop (a shop that can open a customer's planned tank on a phone is also a later channel).
- One "I built this, tell me what is wrong" post on a forum that welcomes it (Fishlore, the Aquarium Co-Op forum, r/PlantedTank or r/Aquariums on their self-promotion terms). Read each community's rules first.
- **Say how it was made, first, in the post:** built by one person with AI coding help; the verdicts are fixed rules on published sources, and no AI model runs when you use it; here is the method page. r/Aquascape is hostile to AI planners, and being found out later costs far more than saying it up front. I would leave r/Aquascape until there are other users vouching.
- Ask three to five experienced keepers to mark up the method page and credit them on it (A6 item 12). That is how "expert-reviewed" gets earned, and each reviewer is also a user with a reason to share.

### Stage 2 (about 80 users): be the answer to a question people already ask

- The commonest post in every fishkeeping community is "is this stocking OK for my tank?". The reply TankLook makes possible is a link that opens their exact tank, moving, with the verdict and its reasons. That is the growth loop: the share link is the content. Answer as a helpful member first and a builder second, a few times a week, never pasted.
- Marine: Reef2Reef and r/ReefTank, after the reef rock fix. TankMates and most planners cannot follow there.
- A 20-second clip of a flagged tank (the angelfish rushing the neons, the tap label saying why) is the one piece of media no rival can make. Use it for the single "show" post.
- Search pages come after: slow, and they need the share landing to convert.

### Competitor benchmark, in this order

1. **Scenario 0 on ourselves** (the heater case). Must pass before the rest means anything.
2. **Scenario 1, the 40 breeder beginner on $400**, against AqAdvisor, App-aquatic and TankMates. It tests all three of our advantages at once (verdict, priced list, real gear) and includes the cardinal case A6 needs.
3. **Scenario 2, existing tank with owned gear.** I expect no rival handles it; if so, the owner door moves up.
4. **Scenario 4, a deliberate conflict after a lock:** the direct test of warnings with reason and fix.
5. **Scenario 6, marine,** against whoever has one (TankMates cannot).

Score with the report's rule: a husbandry failure cannot be averaged away. Record the TankMates run in most detail: whether its 932 species and local prices are real, how fast its first tank appears, and what its share link looks like.

### What to measure

At 100 users, numbers are thin; count a few things and read everything.
- **Activation:** share of first visits that reach a stocked tank, and time to first fish. Needs a counter; a cookie-free one (page view plus three or four named events, no personal data) keeps the no-account promise. Nathan's decision; without it, stage 0 and 1 conversations must carry the load.
- **Which door** they take (the three jobs).
- **Share links created**, and visits that arrive through one.
- **Return within 7 days.**
- **"Found a wrong number?" reports:** count, and whether we were wrong. The most valuable metric here.
- **Deal and price clicks.** Deals are a stated pillar with a recurring manual cost; this is the first evidence of whether anyone uses them.

### What to learn, with decision rules

- **Which job do people bring?** If owners dominate, build the owner door and "what is left to buy" next. If beginners, Discover and examples. If enthusiasts, sources on every Issue and numeric controls.
- **Do they believe the verdict?** If distrusted, fix data and reasons before anything else (the report's rule). If believed but ignored, the fix buttons matter more than more reasons.
- **Do they watch or plan?** If people sit in Watch mode and share clips, behavior moves up and the Steam-style audience is real for us. If they plan and leave, behavior stays a supporting act.
- **Loved but no action?** Then the problem is procurement: the list, prices, where to buy.
- **Slow to a first tank?** Then fix generation and doors, not features.

---

## 5. What this answer cannot support

- **No user has ever used the product.** Every value judgment in the table is inference from rivals' reviews, mostly of Steam games with a different audience. The ranking is a starting bet; stage 0 exists to replace it.
- **The no-heater green verdict** was read from stills (A2), and A6 could not confirm whether the heater caution reaches `stockSummary`. It anchors lane HV; reproduce it on day 1.
- **All load numbers are arithmetic** (A4 built and timed nothing). The 5 to 30 second blank page is inferred from code. The day-1 trace can reorder lane FD.
- **Whether a usable share link already exists.** A2 and A4 both say so in passing; nobody opened one cold. If it does not round-trip, R155 is M, not S, and takes most of FD's second week.
- **Discover's output quality** was never seen. It decides where the beginner and owner doors lead.
- **Plant colour** may already be fixed by atlas batch 2 (A1 could not tell which build its pictures came from).
- **Effort figures** are the answers' own guesses (A6 says so; A7's days assume a lane that knows the sim). Token costs: none measured. I gave none.
- **TankMates** claims (932 species, local prices, 111 templates) come from its own pages. Nobody has used it.
- **Status gaps inherited from the brief:** R142 / R143, the generate-vs-build lane, the 106 "cited" lanes, whether feature-ideas 1-10 exist, whether R157's growth preview is already there, whether deals show a check date, whether top / side views exist.
- **A1's spec ranges** are fitted to five fish; A5 lacks Nathan's review time, the one cost that matters; A7's coverage count is a regex pass.
- **The audience argument** behind ranking behavior third is my judgment. If stage 0 testers light up at the fish and shrug at the verdict, swap BR and HV in the order of what ships next.

## Summary

1. Positioning: build your real aquarium in 3D before you buy, with a verdict that shows its working; defend the explained verdict, the real purchasable world, and marine breadth, not 3D, roster size or apps.
2. The six answers converge on one fact: the first minute hides every advantage and the verdict has a false green, so trust and the front door outrank behavior, which still gets a lane.
3. Two weeks, three autonomous lanes: FD (boot order, landing, share landing), HV (no green without life support, labelled Room meter, method page), BR (tall fish, pairs, give way, verdict-driven chase, tap label).
4. Pause new fish batches, plant families, R147, R98, R149 and AD; close R144 and R159; allow one blind A/B before closing E-GEN.
5. First 100 users only after five gates pass: 5 watched sessions, then about 20 by invitation, then about 80 by answering stocking threads with share links; learn which job they bring and whether they believe the verdict.
