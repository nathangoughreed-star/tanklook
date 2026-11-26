# Fable answer 6: making every verdict trustworthy

Answered 2026-11-25 from `6-trust-verdicts-brief.md`. I opened pictures 1 and 3, the `Issue` interface in `src/scene/verdict.ts` and the types in `src/data/provenance.ts`; everything else rests on the brief. Effort figures are rough guesses, not measured.

## The answer in short

1. **Split "how bad" from "how sure".** Today one colour carries both, so an unsourced judgment ("max 30 neons") shouts as loudly as a sourced fighting rule. Every verdict gets a severity (Problem / Caution / Note / OK / Not checked) and, separately, a confidence word (Sourced / Estimated / Our judgment). One hard rule ties them: **a judgment can never render red.**
2. **The % survives, but as "Room used", never as the verdict.** It is one of three labelled meters (Room, Floor, Filtration), always shown with its zones (75 and 100 marked), its binding limit, and the school maths in words. The tank's verdict stays a word, driven by the worst check, not by the number.
3. **Claim "calculated, not generated", not "no AI" and not yet "expert-calibrated".** The first is provable on the page. The second is false in spirit (the data research was AI-assisted) and r/Aquascape will check. The third currently means "fitted to published lists", which is what the page should say until real keepers have reviewed it.

Three findings in the evidence change the plan and are worth reading before the detail:

- **TankLook is not meaningfully less conservative than AqAdvisor.** The room number was fitted to 31 AqAdvisor answers at a median ratio of 1.01, and the only expert tilt is 0.8 for animals under 2 g. So the Reddit "80% for 10 cardinals in a 40 breeder" is either not AqAdvisor's stocking figure or not a figure we can reproduce: our fit implies AqAdvisor would read roughly 33% there. **Run the existing AqAdvisor Check on that exact case before writing any "where we differ" copy.** The honest difference is not "we are looser"; it is "we split room from filtration and from behaviour, and we show the working".
- **Our own number has the same non-linearity people called hocus-pocus.** 10 cardinals read 27%, 40 read 73%, not 107%. That is defensible (the school curve) but unexplained, it is the "28 chili rasboras = 100%, 8 = 46%" complaint waiting to happen. The explanation must sit on the same line as the number.
- **The bigger risk is under-warning, not over-warning.** Published expert maximums read a median 59% in our engine because temperament binds before room (8 dwarf gouramis in a 55 gal read 31%). A green "27% · Ideal" footer on a tank with a cold-water problem or a fighting problem is the one screen that could really cost trust. The word "Ideal" must describe room only, and say so.

---

## 1. Warning taxonomy

### Two axes

**Severity** (how bad if true):

| Level | Colour + non-colour cue | Triggers | What the user can still do | Feasibility | Example |
|---|---|---|---|---|---|
| **Problem** | red, filled octagon icon, word "Problem" | A welfare or physical limit is exceeded beyond its slack, and the rule is Sourced or Estimated | Everything. Nothing is blocked or removed | Gate: a generated or suggested design may not contain one; a user's own design may | Oscar with neon tetra ("would eat it"); 2 fancy goldfish in a 24 in tank that should be 30 in; room 156% |
| **Caution** | amber, triangle icon, word "Caution" | (a) a limit is close (room 75-100%, inside the 10% slack), or (b) the outcome **depends on something the app cannot see or assumed**, or (c) a real concern backed only by judgment | Everything | Does not gate; lowers rank of suggestions | Neons in a group of 6; cardinals with no heater at an assumed 70 °F room; 2 dwarf gouramis of unknown sex; a plant marked "dim" |
| **Note** | neutral grey-blue, "i" icon | Useful to know, no harm expected: growth ("fine for about N months"), an unused light, "plants are adding 12% filter capacity", a published list's usual maximum | Everything | Never gates, never ranks | "Published stocking lists for this size stop near 30 neons" (if a source exists; otherwise delete it) |
| **OK** | green, check icon, word "Compatible" | A check ran and passed | | | Five topics in picture 6 |
| **Not checked** | hollow grey, dashed outline, "?" icon | An input is missing (no filter chosen) or the species has no data for this check | Everything; a "Fix it" button supplies the input | **Never changes the overall verdict** | "Filtration: not checked, no filter chosen" |

**Confidence** (how sure we are), three words, fixed:

| Word | Earned by (provenance status) | Share of the 10,225 values | Shown as |
|---|---|---|---|
| **Sourced** | `cited` | 5,744 (56%) | the source's name, as a link: "Seriously Fish" |
| **Estimated** | `derived`, `fitted`, `researched` (a sourced number run through our formula, or a page that states a figure without conditions) | 1,575 (15%) | "estimate" tag, with the input source: "estimate from Fishkeeping World's 20 gal" |
| **Our judgment** | `claimed`, `assumption`, unsourced | 2,906 (28%) | "our judgment" tag, dotted underline |

A verdict's confidence is the **weakest** value it used. A second, separate thing is an **assumed input** (the 70 °F room, adult size, unknown sex): that is not low confidence in the rule, it is a missing fact, and it is shown as "depends on" (section 2).

### The rules that tie the axes

- **Judgment never renders red.** A rule whose weakest value is "Our judgment" is capped at Caution, and at Note if it is only a count preference. This is the whole fix for picture 7: the neon "max 30" note is deleted, or replaced by a Sourced Note quoting a published list, and never again shares a colour with the gourami rule.
- **Conditional never renders red.** "If more than 1 of these 2 are males, expect fighting" is a Caution with "depends on: sex" until the user states the sexes; then it is Problem or OK. (Picture 8 is red today.) This is the ChatGPT report's "conditional" level, carried as a field instead of a fourth colour.
- **Estimated may render red only past its slack.** Already true for tank minimums (10%); apply the same idea to the room number (red above 100 is fine; the 156% case is far past any fitting error).
- **Not checked is not a verdict.** Today "no filter chosen" turns the whole pill grey (picture 1). The pill should be the worst of the checks that ran, with a count beside it: "Compatible · 1 not checked".

### How today's vocabularies map

| Today | Becomes |
|---|---|
| Topic levels Compatible / Caution / Problem / Not enough information | OK / Caution / Problem / Not checked (rename the last; stop it overriding the pill) |
| Bands under 75 / 75-100 / over 100 | Room meter zones "Comfortable" / "Full" / "Over". They colour the **Room row only**, and feed the Spatial fullness topic as OK / Caution / Problem. "Ideal" is retired as a footer word because it reads as the tank's verdict |
| `verdict.ts` gates | Problem (welfare and physical) |
| `verdict.ts` hard (budget, upkeep, time, space) | A separate family, "Over your limit", in its own colour (blue or violet, a ruler icon), never mixed into the Habitat check. It is the person's own rule, not the animal's; mixing them teaches people that red is negotiable |
| `verdict.ts` targets | Not warnings at all; they only rank |
| `verdict.ts` advisories | Caution (experience, caution) or Note (growth, unused gear) |
| Per-animal `warn / note / info` | Problem / Caution / Note. Today "note" is orange and "warn" red by text colour only; add the icon and the word |

Net: no new severity level, one renamed, one family split out (limits), and a new second axis.

---

## 2. The fields every verdict carries

Extend `Issue` (and `StockIssue`) rather than inventing a parallel type:

```ts
interface Issue {
  id: string; tab: VerdictTab; uids: string[];      // exists
  level: 'problem' | 'caution' | 'note';            // new: explicit, not implied by bucket
  text: string;                                     // exists: the one-line claim
  why?: { limit: string; numbers: string };         // which limit binds, the figures: "wants 30.1 in long, this tank is 24 in"
  confidence: 'sourced' | 'estimated' | 'judgment'; // weakest value used
  source?: { name: string; url?: string; says?: string }[]; // provenance src + says
  basis?: string;                                   // provenance "why", one sentence, for the audit view
  dependsOn?: string[];                             // assumed or unknown inputs: "room temperature (assumed 70 °F)", "sex"
  notModelled?: string;                             // "does not count feeding or water changes"
  relax?: string;                                   // exists: said, never applied
  fix?: Fix;                                        // exists; widen beyond limits: add heater, pick filter, set count, state sexes
  fixEffect?: string;                               // "brings room to 92%"
}
```

`provenance.ts` already holds `status`, `basis`, `says`, `src` and `why` per rule, so the content exists. **Do not ship the 10k-row table.** Verdicts cite rules, not values: add a build step that writes a small `provenanceLite.json` keyed by rule family (status, source name, URL, the `says` line), plus per-species rows only where the row already carries its own URL (tank minimums do). Load it lazily when the drawer or a "Why?" opens. I expect tens of KB, but measure it.

**Beginner default (one line plus one button):**

> ⚠ Caution · Cardinal tetras want 73-84 °F and there is no heater. **[Add a heater]** · Seriously Fish · depends on room temperature

So: icon and level word, the claim, the fix, then a quiet trailing strip with the source name (or the "estimate" / "our judgment" tag) and any "depends on". Sourced verdicts show the name; the tags appear only when confidence is weaker, so a beginner sees a tag as an exception, which is what it is.

**Audit view (one "Why?" disclosure, no deeper nesting):**

- the numbers and the binding limit;
- the source's own words (`says`) with the link;
- our step from source to rule (`basis`): "total length = 1.2 x the stated standard length";
- what it does not model;
- a link to the matching section of "How we calculate".

**Unknown fields:** no source means the tag "our judgment" is shown, never a blank; no fix means no button, and the line says what would change the verdict; a check with no data becomes a "Not checked" row that names the species, not only a count ("Not checked: water hardness for 2 species").

---

## 3. The headline %

**It survives, demoted and renamed.** Killing it would throw away the one thing forum users cite (AqAdvisor is still "a sat nav"), and experts audit a number faster than a word. But it stops being the headline:

- The headline is the **word pill** (Compatible / Caution / Problem), set by the worst check. This already exists in the top bar; keep it there and never put a bare % next to it.
- The % is labelled for what it is: **"Room used 27%"**, not "Stocking 27%", "Water column" or "Spatial fullness" (three names for one number today; pick "Room").
- It is drawn as a bar with **ticks at 75 and 100 and the zone words under it**: "Comfortable · Full, tread carefully · Over". The 75/100 scale is Nathan's and is fine; it is just invisible today.
- It sits in a set of **three meters, no blended total**: Room (swimming), Floor, Filtration. The binding one is marked "limits this tank". Filtration returns to the drawer as its own meter, which is also where plants become visible (R153).
- It always carries **the working in words**: "40 cardinal tetras count as 27 for room: schooling fish share space, so each one past 10 adds less." And **headroom**: "Room for about 1 more before 75%, about 22 more before 100%" (computed by the engine; numbers here are illustrative). Headroom is the most checkable thing we can show: a keeper compares it with experience in one glance.
- Behaviour limits are **never expressed as a percent**. The temperament cap that room-only misses is a rule row under Behavior with its own source, e.g. a Sourced Note "Published lists for a 55 gal stop at about N dwarf gouramis; this is about fighting, not room". The 73 expert count points already collected (`research/expert-curve.md`, 17 species) are the data for exactly this, and they are a better use of that survey than tuning the room constant further.

**The two failure modes:**

- *Arbitrary ("hocus-pocus")*: answered by the per-species share (exists), the "count as" line, the labelled zones, and the methodology page stating the formula in two sentences: bigger and more active fish need more room; schools share it.
- *Too conservative*: answered by the cardinal case itself reading right, by headroom, and by not letting filtration or missing gear drag the room number or the pill.

**How the cardinal case should read:** pill "Compatible so far · 2 to check" (no filter, no heater); Room 27%, "Comfortable"; "10 cardinal tetras · room for about 30 more before the tank is full"; at 40, Room 73%, still "Comfortable", "count as 27 for room". Not "Ideal", because with no heater the tank is not ideal, and the word would be read as the verdict.

**"Why this differs from other calculators":** one collapsed line under the Room meter, "Other calculators may show a different number", opening to: "Our room number is fitted to match AqAdvisor's on 31 test tanks (middle case within 1%), then eased 20% for fish under 2 g to match published stocking lists. The main difference is that we show room, floor and filtration separately instead of one blended figure." Do not print a specific rival number unless the AqAdvisor Check has just returned it for this tank.

---

## 4. Mockups per screen

**(a) Habitat check, 10 cardinals in a 40 breeder**

```
Habitat check                                        ×
[✓ Compatible so far]   2 not checked
Tank 36 × 18 in · 44.9 gal of water

ROOM USED                                  27%
[█████░░░░░░░░░░|░░░░░|░░]     ticks at 75 and 100
 Comfortable         Full     Over
 • 10 Cardinal tetras · all of it
 Room for about 30 more cardinals before "Full".
 Why this number? ▸          Other calculators may differ ▸

FLOOR                                       0%   (no bottom dwellers)
FILTRATION                       ? Not checked   [Choose a filter]
TANK MINIMUM                 ✓ Meets recommended
 • Cardinal tetra: at least 23.6 × 11.8 in, 20 gal · estimate ▸

BY TOPIC
 Tank minimums   ✓ Compatible
 Social needs    ✓ Compatible
 Environment     ⚠ Caution
   • Cardinals want 73-84 °F; no heater, room assumed 70 °F
     [Add a heater]  · Seriously Fish · depends on room temperature
 Behavior        ✓ Compatible
 Room            ✓ Compatible

Fixed rules on published care data. No AI writes these verdicts.
How we calculate ▸
```

Changes from picture 1: the pill is green not grey; the amber "No filter chosen" banner becomes a Not checked meter row with its button; the heater caution from the Animals panel also appears here (today the drawer shows Environment as "Not enough information" for the filter only; verify whether the heater concern reaches `stockSummary`); "Ideal." is gone; headroom and the footer are new. "Why this number?" opens the two-sentence formula, the "count as" line and the confidence ("estimate: fitted, see How we calculate").

**(b) Habitat check, the overstock case (pictures 3-4)**

- Pill "✖ Problem · 3 problems, 2 cautions, 1 not checked". The same goldfish sentence currently appears twice (top red box and under Tank minimums); keep the top box as a **list of the problems, one line each, each with its fix**, and let the topic rows hold the detail.
- Top list: "✖ Oscar would eat the neon tetras · estimate from adult sizes · [Remove one]"; "✖ Fancy goldfish need a 30 in tank, this is 24 in · estimate from Fishkeeping World's 20 gal · [See tanks that fit]"; "✖ Room 156% · needs about 31 gal of water or fewer animals".
- Room meter 156%, bar full and red past the 100 tick, shares listed (goldfish 70%, neon 20%, oscar 11%), "limits this tank" badge.
- Tank minimum rows: replace "(est. from gallons)" with the tag "estimate ▸" opening to "Fishkeeping World gives 20 gal with no dimensions; we used the smallest 20 gal tank's footprint". The oscar's 59.1 × 23.6 in row has no marker today: it must show its source or "our judgment".
- Social needs: "⚠ Neons: group of 6, usually kept in 8 or more · [source or 'our judgment'] · [Make it 8]" with the effect "room becomes 160%".

**(c) Animals panel row**

```
Cardinal tetra   × 10   [−][+]                         ⚠
  ⚠ Wants 73-84 °F, no heater  [Add a heater]  · Seriously Fish
  ⓘ Sold at about 0.8 in, adult 1.8 in (R156)
  ⓘ Fine for about 14 months, then: tank minimum          (growth line, when it applies)
  AqAdvisor: [Check]   →  after it runs: "AqAdvisor 31% · ours 27% (room only)"
```

One icon at the row's right edge is the worst level for that animal. Count notes: the grey "(at the most one tank takes: 30)" and the red "More than 30" both go, unless a published list backs a number, in which case it is a Note with the list's name. The gourami line becomes amber: "⚠ Males fight: this tank takes one male. Are both male? [1 male] [2 males] [Don't know]" and only "2 males" turns it red.

**(d) Plant row with a light verdict and a CO2 requirement**

```
Dwarf baby tears   × 6 pots                                  ⚠
  ⚠ Dim: wants strong light, this light gives about 35 PAR at the floor
    [Use a stronger light]  · estimate (PAR from the light's rated output and tank depth)
  ✖ Needs injected CO2; none in this tank  [Add CO2]  · source name
```

"Recommended" CO2 is a Note, "required" is a Problem, matching `gearFit` (required forces it, recommended never does). The PAR figure is always tagged "estimate": it is computed, not measured, and experts know that.

**(e) Gear card**

```
[photo]  Brand Model 30 filter                  $34 · price estimate ▸
✓ Fits this tank: rated 30 gal, yours is 29.8 gal · maker's rating
Filtration would read 62%
```

"Fits" always states the two numbers compared and whose rating it is ("maker's rating" is a Sourced value, and saying so also signals that we know maker ratings are optimistic). An owned-gear note stays a one-time popup, written as a Note: "ⓘ Your 100 W heater is now small for this tank: 44.9 gal wants about 150 W · [Open My equipment]".

**(f) Printed report**

- Top: the word pill, then the three meters with their zone ticks (a printed bare "27%" is the easiest thing to quote out of context).
- A "Checks" table: level, claim, fix, source as a numbered footnote. Footnotes list the source name and URL; "estimate" and "our judgment" rows say so in the same column.
- A closing "Not checked" list, and one line: "Calculated by TankLook's published rules on [date]; method at tanklook.com/how".

**(g) "How we calculate" page** (a real URL, linkable from forums, not only an overlay)

1. *What this is*: "Every verdict is computed by fixed rules from the numbers on this page. The same tank always gets the same answer. No AI model runs when you use TankLook."
2. *The three meters*, two sentences each, with the cardinal case worked: 10 → 27%, 40 → 73%, and why.
3. *Where the numbers come from*: live counts from `research/source-baseline.json` (56% sourced, 15% estimated, 28% our judgment), the rule "our judgment never makes a red warning", and the publishers' names.
4. *What is fitted*: the 31 AqAdvisor comparisons as a table (ours, theirs, ratio; median 1.01, 8 higher by over 10%, 11 lower), and the 37 published stocking lists with their sources.
5. *What we do not model*: feeding, water-change habits, individual temperament, juvenile sales size unless set, plants beyond a capped 25% filtration credit ("a documented guess", say exactly that).
6. *Per-species table* (from `research/reasonableness.md`): minimum tank, the limiting measure, the source.
7. *Found a wrong number?* A contact link. This is the cheapest way to get real expert review, and corrections can be credited on the page.

---

## 5. Showing "rules and data, not generative AI"

**Say the provable thing.** Three claims are available; only one is safe today:

| Claim | Verdict |
|---|---|
| "Calculated by fixed rules; same tank, same answer; every number traceable to a source or marked as ours" | True and checkable on the page. **Use this.** |
| "No AI" (unqualified) | Avoid. The verdict path has no model call, but the care data was researched with AI assistance, and the repo history shows it. A hostile sub will find that, and a caught overclaim costs more than the claim earns. Say "No AI model runs when you use TankLook" and, on the method page, "Sources were gathered with AI assistance and each quoted figure was re-fetched from the page named". (Confirm the re-fetch is true for all cited rows before printing it; the provenance notes say so for tank minimums.) |
| "Expert-calibrated" | Not yet. No expert has answered the survey; the calibration is to published lists. Say "matched to 37 published stocking lists from Aquarium Co-Op, Fishkeeping World and others". Earn the stronger word by getting three to five experienced keepers to mark up the method page, then name them. |

**Placement:**

- Footer of the Habitat check drawer and of the printed report: "Fixed rules on published care data. No AI writes these verdicts. How we calculate ▸"
- Beside every "Suggest" / "Generate" / starter button (the Reddit-derived idea): "Built by rules from your tank size, your limits and species data, not by generative AI."
- The method page, section 1, as above.
- Nowhere else. A badge on every row would read as protesting too much.

**The honest sentence for fits and assumptions:** "The room number is an estimate: our formula, fitted to AqAdvisor on 31 tanks and to 37 published lists. About 3 in 10 of our stored values are our own judgment or not yet sourced; those are marked, and they can never produce a red warning." That last clause is the trade that makes the admission a strength, so the "judgment never red" rule has to ship before the sentence does.

---

## 6. Ranked changes (trust gained per unit of effort)

| # | Change | Effort (guess) | Files | Answers | Needs |
|---|---|---|---|---|---|
| 1 | **"Not checked" stops overriding the verdict**; pill = worst check that ran, plus "N not checked" | 2-4 h | `stockSummary.ts`, drawer UI | Picture 1: the best-case tank opens grey; AqAdvisor's "0% filtration with no filter" complaint | nothing |
| 2 | **Label the number**: one name "Room used", ticks and zone words at 75 / 100, drop "Ideal." as footer, mark the binding meter | 3-5 h | drawer UI, `stockSummary.ts` | "hocus-pocus"; R161 thresholds (this closes the threshold half of R161) | nothing |
| 3 | **Judgment never red; conditional never red**: delete or demote the neon "max 30" notes, gourami line amber until sexes known | 0.5-1 day | count-note code, `territory.ts`, `animalfit.ts` | Picture 7's own annotation; "a wrong care rule costs trust" | a pass listing which count rules have a source |
| 4 | **The working, in words**: "count as N for room" line and headroom ("room for about N more") | 0.5-1 day | `stocking.ts` reasons, drawer | The non-linearity complaint (28 vs 8 chili rasboras); "too conservative"; R152 first half | a bisect on count per species |
| 5 | **Method page v1**, static, counts generated from `source-baseline.json`, the 31-row table, the list of published sources, the "calculated, not generated" wording, drawer footer link | 1-1.5 days | new page, a small build script, drawer footer | r/Aquascape's AI hostility; AquaCompat's methodology page; R152 second half ("where we differ") | run the AqAdvisor Check on the cardinal case first |
| 6 | **Confidence and source on every Issue**; "Why?" disclosure; start with tank minimums (source already inline), then chemistry, temperature, groups | 2-3 days | `verdict.ts`, `StockIssue`, `provenanceLite` build step, drawer and Animals panel | Impossible Aquariums / ChatGPT report: reason, source, confidence, fix | the lite provenance file, lazily loaded; measure its size |
| 7 | **Filtration meter back in the drawer, with the plant credit visible** ("plants add 12% capacity") | 0.5-1 day | `stocking.ts capacityOf` reason, drawer | R153; "ignores live plants" | nothing; tag the credit "our judgment" |
| 8 | **Fix buttons with stated effect** on the common cases (add heater, choose filter, set group to minimum, see tanks that fit) | 1-2 days | `Issue.fix` widened, drawer | "each warning gives ... a fix"; picture 1's lone "Fix it" | nothing |
| 9 | **Sourced behaviour caps as Notes** from the 73 expert count points | 1-2 days, mostly data | new per-species rule, `animalfit.ts` | The under-warning risk (gourami 8 in 55 gal reads 31%) | review of `expert-curve.md` per species |
| 10 | **Juvenile vs adult size on the row** (R156) | 0.5-1 day | Animals panel, `growth.ts` | My Aquarium Guide idea | exists in growth data |
| 11 | **Printed report with footnoted sources** | 1 day | report | forum sharing; "show the % with its reasons, never alone" | after 6 |
| 12 | **Real expert review** of the method page, names credited | calendar time, little code | page | earns "expert-calibrated" | 3-5 keepers; Nathan's outreach |

**Defer:**

- *Per-species AqAdvisor side-by-side as a feature* (the rest of R152). The proxy is unreliable and the two engines agree at 1.01, so it is not a differentiator. Keep the existing Check button; show both numbers when it has run.
- *"Which filter fits" quiz* (the other half of R161). It is an acquisition idea, not a trust fix.
- *The global expert re-fit* of the room constant. More fitting will not buy trust; visible reasoning will. Spend the expert data on item 9.
- *Hard-limit colour family* ("Over your limit"): right in principle, but it only matters once budget and upkeep limits are in common use.

**Sequence:** items 1-4 are about two days together, need no data plumbing and no new claims, and remove the three screens most likely to be screenshotted against us (grey pill on a good tank, unexplained 73%, red unsourced note). Ship them first, as one lane. Item 5 next, because it is the link people will paste into a forum reply. Item 6 is the largest and is what makes the page's claims true row by row.

## What I did not verify

- Whether the heater caution reaches `stockSummary` (picture 1 suggests it does not); item 1's lane should check.
- What AqAdvisor actually returns for 10 cardinals in a 40 breeder. Everything in section 3 about "where we differ" depends on it.
- The size of a lite provenance file, and whether every `cited` row's quote was re-fetched (section 5's wording depends on it).
- Pictures 2, 4-8 were taken from the brief's descriptions, not opened.
