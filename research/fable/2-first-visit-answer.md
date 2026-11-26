# Answer 2: first-visit walkthrough (Fable, 2026-11-25)

Answers `2-first-visit-brief.md`. Based on all 20 screens in `2-first-visit/`, `src/shell/start.tsx`, `logic/start.ts`, `checklist.tsx`, `logic/checklist.ts`, `shell.css` line 688, `scope.ts`, `App.tsx` (section default), `files.tsx`, `research/design/unified-setup-plan.md`, HANDOFF "Start here", and `research/competitors/SUMMARY.md` + `chatgpt-report-delta.md`. Judgment only; no code was changed.

## The short version

The product's edge over every free rival is four things at once: a living 3D tank, real gear, real prices, and a verdict you can trust. **The landing screen shows none of the four**, and the first path a newcomer is offered (Blank tank) takes about 19 interactions to reach a tank worth looking at. Meanwhile the fastest proof (a finished example, 2 clicks, about 12 s) sits behind a text card with no picture, and when opened it lands in a settings panel.

Then, at the moment the product should win the enthusiast, it loses them: a tank with neons and a pleco, a filter, no heater and no chosen light reads **"Compatible"**, difficulty "2.1 / 10 Easy", and prints a shopping list with no heater and no light (screens 08, 09, 10, 12). The competitor research says a husbandry failure cannot be averaged away by good rendering. This one is in the first ten minutes.

The Start sheet is the right shape (many ways into one project, as the unified setup plan wants). Its contents are wrong: the doors are named after the tool's features, not after the three jobs, and one of the three jobs has no door.

## What the landing screen should promise (one sentence)

> **Build your aquarium in 3D before you buy anything, and see whether the fish will thrive, what it will cost, and exactly what to buy.**

Sub-line, small: "Free, no account. Checks come from rules and sourced data, not AI." (The r/Aquascape hostility to AI planners makes that second clause worth its space.)

This is the unified plan's product definition and the ChatGPT report's "design your dream aquarium before you buy a thing", plus the three proofs no free rival combines. Screen 01 today says "Start a tank" and nothing else.

## Walkthrough 1: beginner, "what should I build?"

| Screen | What happens | Verdict |
|---|---|---|
| 01 / 17 | A modal titled "Start a tank" over a dimmed wireframe box and a settings panel. Four text cards of equal weight, no picture, no sentence about what this is. The first card is "Blank tank". | **Lost.** A beginner asking "what should I build?" is offered a blank page first. Nothing shows a fish, a price or a verdict. The header chips ($77, Habitat) are the differentiator and are dimmed and unexplained. |
| 02 / 18 | After Blank + Freshwater: "Glass, rim 3/16 in float · rimmed", "Use this one for sure", Water, Sits on, Lid. The Get started card is hidden by CSS because a panel is open. On the phone the tank is a strip about 180 px high. | **Lost.** A settings form with no next step. The one guide the product has is switched off on exactly the screen that needs it. |
| 03 | Tank picker. Good: 11 common sizes, plain names. But "finished $360 - $1,800" on a 29 gal is a 5x range with no explanation, and each row has an unlabeled padlock. | Mild confusion; survivable. |
| 04 | An empty glass box next to a grey mannequin in a beige room; a folded pill "Get started · 1 of 5". | **Bored.** This is the lowest point: about a minute in, nothing alive, and the next step is a collapsed pill. Scape It wins "a general idea in minutes" here. |
| 05-06 | Stones open before substrate (the tank stays bare-bottom unless they find the tab). Plants are graded against a light that has not been chosen ("light not set yet"), and the fix offered is "Add CO2 system + fertiliser (+$90)". | **Misled, mildly.** The cheapest right answer for a beginner is "swap the carpet plant", but the blue primary button is the $90 one. |
| 07 / 16 | First fish. This is the first moment the product looks like itself (neons schooling in the tank, about 4 clicks in if they skip everything else). Many thumbnails blank on first paint; the Cardinal tetra tile shows a silver striped fish. | The payoff arrives, but late. Blank tiles read as "broken". |
| 08-10, 12 | They press "Use" on a filter and the header goes green: "Compatible", "$277", "2.1 / 10 Easy". The pleco's heater warning is gone. The shopping list has no heater and no light. The checklist still says "Needs a light". | **Misled, seriously.** The beginner's whole reason to trust this over a pet-store employee is the green chip and the list. Both are incomplete, and they disagree with the product's own checklist. |
| 11 | Discover is the real answer to "what should I build?" It is the 8th rail item, behind the word "Discover", and opens with "1 kept, 15 open". | **Never found.** The feature built for this job is not offered on the landing screen at all. |
| 13 | If they chose Example tanks instead: the finished tank opens squeezed into a 576 x 468 viewer beside the same Tank settings form, with "Caution" (no reason shown) and "$1,295". | **The best door has the worst landing.** A house example that the house's own engine marks "Caution", with no explanation, tells a beginner either the example or the verdict is wrong. |
| 15 | "From an animal I want" is the most natural beginner door and has the clearest copy in the product. When reached from a tank with unsaved changes, "Plan a tank for these" does nothing visible (the confirm dialog is underneath). | **Dead end** on the door most likely to convert. From the Start sheet on a truly fresh visit the tank is clean, so this probably works there; it fails for anyone who poked around first. |

Against the vision: "be inspired" and "explore ideas they would not have had" are absent from the first minute. "Experience is an optional gate" is respected in the engine but the Beginner / Intermediate / Expert tags on every card are fine and should stay; they are information, not a gate.

## Walkthrough 2: owner, "what can I do with what I have?"

There is **no door for this job on screen 01**. The owner has to compose it:

1. Blank tank, Freshwater (02), then "Change..." (03) to find their tank among 812. The picker is good for this. But nothing says "I own this": the header keeps charging them for it ($89), and the padlock ("Use this one for sure") is the nearest thing, unlabeled.
2. Equipment (08): "I own: nothing yet / Add one I own (any brand)" exists per category, with the well-judged line "Owning is not the same as using". It is five rail clicks from the start and has to be repeated category by category.
3. Constraints: "No new equipment" exists, unscreened.
4. Discover (11): "Fill only the gaps" is the actual answer to their question. Nothing connects steps 1-3 to it.

So the owner job is fully built in the engine (Rev 03 designed an Equipment step with Available / Required for exactly this) and was dropped from the default path when the Guided flow was retired. The first minute gives an owner no sign the product knows they exist. **Lost at 01, bored by 08** (99 filters to buy, when they came with a filter).

What they would love if they saw it: the cost drawer (09) with "Costs most" and "Swaps that lower it", and sale items that fit their tank. That drawer is the strongest "money matters" screen in the product and is only reachable by clicking an unlabeled dollar chip.

## Walkthrough 3: enthusiast, "will this exact design work?"

The enthusiast picks Blank tank and tolerates the friction. Their first minute is a search for proof that this is smarter than AqAdvisor.

**What impresses (keep and show earlier):** 812 real tanks with dimensions (03); chemistry tags on stones, "Raises pH + hardness" (05); real filters by brand with gph and "fits 29 gal" (08); "Fits this tank · 52 held back" (16); the per-species split of the water column and the tank-minimum footprint lines (10); A/B Compare.

**Where they are lost or misled:**

- **07 to 08 to 10: the verdict goes green with no heater.** The pleco row says it "requires heating ... add a heater". Adding a *filter* turns the chip to "Compatible" and "Environment: Compatible", and the warning disappears. In the same screen 07 the header chip says "74 °F fits" while the row text says "assumed 70 °F room". An enthusiast reads this as two engines disagreeing. I cannot tell from stills which number is right; either way, green for an unheated tropical tank resting on an assumed room temperature is the "wrong husbandry rule costs trust" case from the competitor findings.
- **07: an "AqAdvisor Check" button sits inside our stocking list, above our own verdict.** It presents the tool whose numbers users call hocus-pocus as the referee. Useful as a comparison; wrong as the first thing next to the animals.
- **10: "46 % · limited by swimming room. Ideal."** This is a lone percentage with one clause of reason: the form the research says nobody trusts. The topic rows say "Compatible" five times with no reason, source or confidence. The footer says "Read-only for now", which reads as unfinished.
- **07: the Cardinal tetra tile shows the wrong fish.** For this audience a wrong picture is a wrong fact.
- **13: the example called "40 breeder" opens as "Custom 36 x 18 x 16 in · 45 gal".** A 40 breeder is 36 x 18 x 16; an enthusiast knows that and will notice the product does not.
- **15: 4 black mollies get "10 gal: smallest real tank that holds the list".** Many keepers would call that too small for a 3.3 in fish. I cannot rule on it; it should be checked against the calibration tables (brief 6 territory) because it is the headline number of the animal door.

**Where they fail to see the edge in the first minute:** nowhere do they see reasons with sources, juvenile-vs-adult size, or "outgrows it in N months": the growth-aware part that no rival has. If it shows anywhere, it did not show in this walk.

The pleco "hugging the right glass" (07, 14) may be correct behaviour (plecos rasp glass). I can't tell from stills whether it reads as behaviour or as a placement bug.

## The five changes, ranked

### 1. Make the landing screen show the product and offer the three jobs (screens 01, 17)

**Problem:** no promise, no living tank, feature-named doors, Blank first, no door for owners.

**Fixed looks like:**
- Zero clicks to moving fish: the first paint behind the Start sheet is a stocked example (Planted community or a cheaper one) in a full-width viewer with no section panel open, its real header chips lit ("$… · $…/mo · … min/wk", verdict). If live load is too slow on a real GPU (I can't judge that; see brief 4), a poster image of the same tank that swaps to live.
- The promise sentence above is the sheet's headline; "Start a tank" goes.
- Doors renamed and reordered by job, each with a small picture:
  1. "Show me tanks I could build" (examples now; Discover's whole-tank explore once it is verified good),
  2. "Start from a fish I want",
  3. "I already have a tank or gear" (see change 4),
  4. "Build my own from scratch".
  "Bundles and sales" becomes a link under the doors, not a door: deals are a reason to stay, not a way to start.
- Check: a stranger shown screen 01 for five seconds can say what the product does and names a door for their own situation.

`App.tsx` line 214 opens the Tank section by default on desktop; on a first visit it should open nothing.

### 2. Never show green, "Easy", or a finished shopping list for a tank that is missing life support (screens 07, 08, 09, 10, 11, 12, 20)

**Problem (defect cluster):** "Compatible" with no heater; the heater warning vanishing when a filter is added; 74 °F chip vs "assumed 70 °F" text; checklist says "Needs a light" while the info card says "Generic light" and the verdict says nothing; the shopping list omits heater and light; the cost drawer advertises a sale heater for a tank with none selected but never says one is needed.

**Fixed looks like:**
- Scripted case (use it as benchmark scenario 0): 29 gal, 8 neon tetra, 1 bristlenose pleco, one hang-on-back filter, nothing else. Header chip is **not** green; it names the gap ("Needs a heater") with a "Fix it" button, the pattern screen 20 already uses for the missing filter.
- One source of truth for "what is missing" feeds the checklist, the Habitat drawer, the cost drawer and the Print list. They cannot disagree.
- The shopping list either includes a heater and light line, or opens with a block "Not chosen yet: heater, light. This list is not complete." above the total.
- The temperature chip and the row warning quote the same number.
- A value that rests on an assumption (room temperature) is labelled as assumed and can never by itself produce green. This is Rev 03's own rule: a skipped constraint is UNKNOWN, not fine.

Ranked second only because every visitor meets change 1 first. In risk terms it is first: with no users yet, the first enthusiast screenshot of "Compatible, no heater" posted to a forum becomes the product's reputation.

### 3. Every door lands on the thing to look at or the next thing to do, never on a settings form (screens 02, 04, 13, 15, 18)

**Problem:** examples open in a 576 x 468 viewer beside glass-thickness settings; Blank lands on the same form with the checklist hidden; the animal door's confirm dialog is under its own dialog; on the phone the tank is a strip.

**Fixed looks like:**
- Opening an example (13) or a planned tank from the animal door: section panel closed, tank at full width, one card over the viewer: name, size, "$1,295 to set up · $48/mo", the verdict **with its reason**, and two buttons: "Make it mine" / "See another". The house examples either pass their own check or say why they are "Caution" in one line. The "40 breeder" is a real 40 breeder model, not "Custom ... 45 gal".
- Blank + Freshwater lands directly on "Choose a tank" (03), not on 02.
- The next step is visible while a panel is open: drop `shell.css` line 688 and dock the checklist as one line in the panel header ("Step 1 of 5: Pick a tank. Next: Hardscape"), with Done advancing to the next step. The collapsed pill on 04 opens unfolded on a new tank (`useState(true)` in `checklist.tsx`).
- The "Replace your project?" dialog appears above the animal dialog (15). Cheapest fix in this whole answer: close the first dialog before asking, or raise the second's stacking order.
- Phone (18): after any door, the tank gets at least half the screen until the user opens a section.

### 4. Give owners a door: "I already have a tank or gear" (screens 01, 03, 08, Constraints, 11)

**Problem:** one of the three jobs has no entry; its parts are spread over four sections.

**Fixed looks like:**
- The door opens the tank picker with a labeled "I own this" choice (the padlock gets words), then one short screen: "What else do you have?" with filter / heater / light / stand as tick rows ("any brand" is enough), then lands on Discover's "Fill only the gaps" results.
- Header shows what is left to buy, with the owned value alongside: "$84 to buy · you already own about $190".
- Check: from screen 01, an owner with a 29 gal and a filter reaches a stocked proposal priced at only the missing items in 6 clicks or fewer, with the tank and filter at $0.

All the parts exist (owned gear, "No new equipment", Fill only the gaps, Available vs Required). This is routing and copy, not an engine. I can't judge from stills how good Fill-only-the-gaps results are; the walk never completed a Discover run, and this change is only worth doing if they are.

### 5. Let our own verdict speak first, in reasons, and demote AqAdvisor to a comparison (screens 07, 09, 10)

**Problem:** warnings are one long orange sentence; the drawer is a lone percentage plus five identical "Compatible" pills; the rival's checker is the most prominent action in our stocking list; the best money screen hides behind an unlabeled chip.

**Fixed looks like:**
- Each warning has three short parts: what ("Bristlenose pleco needs 72 to 81 °F"), why ("No heater; water estimated from an assumed 70 °F room"), fix (button: "Add a heater, about $22"). Tier shown as hard / conditional / preference.
- Habitat drawer (10): every topic row has a one-line reason, and the "46 %" line expands to its factors (it already lists the per-species split; add adult size used, and plants' effect if counted). "Read-only for now" is removed or replaced by links that jump to the section.
- "AqAdvisor Check" moves into the Habitat drawer as "Compare with AqAdvisor", under our reasons, ideally with one line on where and why we differ (R152).
- The dollar chip in the header gets a visible affordance, and sale lines appear where the item is chosen, not only in the drawer.
- Check: an enthusiast can answer "why 46 %?" and "why Compatible?" without leaving the drawer.

## Defects vs design choices

**Defects (fix regardless of the five; cheapest first):**

| Defect | Screen | Cost |
|---|---|---|
| "Replace your project?" dialog hidden under the animal dialog | 15 | Tiny (stacking / close order) |
| Phone status strip clipped ("Not") | 17 | Tiny (CSS) |
| "Land" toggle shown in aquarium-only scope | 15 | Tiny (`scope.ts` check) |
| "colour" / "fertiliser" spellings in a US-units product | 05, 06 | Tiny |
| Get started card covers the tank and the print preview | 11, 12 | Small |
| Example "40 breeder" opens as "Custom 36 x 18 x 16 · 45 gal" | 13 | Small (data) |
| Cardinal tetra tile shows the wrong fish; blank tiles on first paint | 07, 16 | Small to medium |
| Toast overlaps Done; "Bigger" overlaps the tank on phone | 18 | Small |
| Temperature chip 74 °F vs warning text 70 °F | 07 | Unknown until diagnosed |
| Verdict green with no heater; list without heater or light; checklist / verdict / info card disagree | 08-12 | Medium; this is change 2 |
| "Fits this tank" offers an animal whose row then warns | 07 | Part of change 2. Arguably correct (the tank fits; the equipment is missing), but then the filter should be named for what it tests |

**Design choices (deliberate, and I would change them):** settings-first Tank panel on entry (02, 13); checklist hidden while a panel is open and folded by default (02, 04); Blank tank as the first door; feature-named doors; stones before substrate (05); bare-bottom default with no prompt; the $90 CO2 fix as the primary button (06).

**Design choices to keep:** the Start sheet as a single sheet with several ways in; "Fits this tank" on by default; experience tags as information with the gate off; "Owning is not the same as using"; "Nothing changes until you press Apply"; Undo-backed toasts; no account.

## Why not other things in the top five

- **Share links and a gallery** are the top growth gap in the competitor ranking, and "Share link" already exists in the file menu. But sharing matters after someone has a tank they like; these five are about getting them there. Brief 4 covers the shared-link cold load.
- **Species behaviour and live status** is the most-loved thing in the category and cannot be judged from stills (brief 7).
- **Renaming "Discover" and explaining "1 kept, 15 open"** matters, but is absorbed if change 1 routes beginners into it by a plain-language door.

## What I cannot judge from this evidence

- Animation quality, schooling, and whether the tank feels alive: stills only.
- Real-GPU load times; all timings are software GL. Change 1 depends on a stocked tank loading acceptably as the first paint.
- **The quality of Discover's output.** The walk never completed an Explore run. That is the largest gap in this evidence: it decides whether the beginner door should lead to Discover or to the six examples. Someone should run it once and look before change 1 is built.
- The Bundles and sales door, Preferences and Constraints: not screenshotted.
- The old Guided flow (`?ui=1`): not walked, so I cannot say whether anything it did better should come back beyond the owned-equipment step.
- Whether 74 °F is a sound estimate, whether 10 gal is right for 4 mollies, and why the Planted community example is "Caution": engine questions for brief 6.
- Returning users with many saved tanks; real touch behaviour on a phone.

## Summary

1. The landing screen should show a living, priced, checked tank at zero clicks under one promise ("Build your aquarium in 3D before you buy anything, and see whether the fish will thrive, what it will cost, and exactly what to buy"), with doors named for the three jobs, including a new one for owners.
2. Before anything else reaches users, stop the verdict, the "Easy" score and the shopping list from certifying a tank with no heater or light; that single defect cluster undoes the product's main advantage over AqAdvisor.
3. Every door should land on the tank or the next step, never a settings form; then let the verdict explain itself in reasons and move the AqAdvisor button below it.
