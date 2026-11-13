# W1 and the A/B screen: context for Nathan (Coordinator 24, 2026-11-13)

Built from your own past words (dated, with file:line) so the two open UI2 questions have something concrete to react to. Research only.

## W1: who is the app for, and what are its jobs?

**What exists today.** UI2 §1 (`research/design/ui2-screen-map.md`) says: "someone planning a real home aquarium (first tank, or a hobbyist planning the next one) who wants to see it true to life in their own room, know the animals will be well, and know what it costs in money and time before buying anything", with 5 jobs: Start, Build, Check, Compare, Take away. The designer inferred it; **nowhere have you named the audience** (no "beginners", "stores", "friends", nothing on making money).

**What you have said** (grouped):

| Theme | Your words (date, where) |
|---|---|
| Meet people where they are | "work out where the user is (new / has gear / knows what they want), then bridge them to a successful tank. Gate what makes a tank fail, leave cosmetic choices free." (Oct, `prompts/coordinator-kits.md:8`, paraphrased) |
| Experience | "experience level shapes complexity and guidance, never a prohibition" (2026-10-28, `HANDOFF.md:42`) |
| Welfare | "a non-negotiable gate (never a toggle, never traded for price)" (2026-10-28, `HANDOFF.md:42`) |
| One brief, a build plan | the entry ways are ways of filling ONE setup brief; the product is a design AND a BUILD PLAN (buy order, reuse, setup and cycling, when to add animals, maintenance) (2026-10-28, `HANDOFF.md:42`) |
| Need-driven gear | "the tool doesn't assume you need anything until you add a species that needs it" (`prompts/lane-GV2-need-driven-gear.md:9`) |
| Budget | "give the user an upper and lower bound" (2026-10-30); "keep this style in your budget by removing the school of neon tetras and downsizing from 75g to a 40g breeder" (GV7) |
| Price of a finished tank | "a rough range of finished tank price based on the size... upper end would be a semi-professional setup" (2026-11-05, FR1) |
| Take away | "print out the report that has the quick rundown, a picture of the tank, existing equipment, shopping list, expected costs, plant/coral list... basic warnings or cautions" (GV3) |
| Real products, real room | "a model for every currently available tank, kit, or bundle" (2026-10-26); "If I get a standard 55g, I cant just take the rim off" (2026-10-26); "start with nothing in the room, with the person" (2026-11-05, ST1) |
| Deals | "is there anywhere else on the internet it would be worth looking for deals on aquarium stuff to build into the tool?" (2026-10-20); "build all five"; "yes, weekly" price sweeps |
| Yourself | "I dogfood with the main site" (2026-10-26) |
| Money | none from you; the app footer says "Links are plain, no affiliate codes" (`HANDOFF.md:477`) |

**Where UI2's draft fits and where it doesn't**
- Fits: plan a real tank in a real room, welfare, cost against limits, compare, print.
- "First tank or hobbyist" is a guess. Your words point to **every level** ("new / has gear / knows what they want"; experience never prohibits).
- Missing: **buying the real products at good prices.** You asked for deals and weekly price sweeps repeatedly; UI2's 5 jobs never mention buying or deals.
- Missing: **the build plan** (buy order, cycling, when to add animals, upkeep) as a job of its own; UI2 folds it into Print.

**Questions for you (W1)**
1. Audience: anyone from first tank to experienced (the app adapts), or mainly beginners, or mainly you and people like you?
2. Is "buy the real gear at a good price" (deals, where to buy) one of the app's main jobs, or a side feature?
3. Is the build plan (what to do, in which order, week by week) its own job, or part of "Take away"?
4. Money: any plans (affiliate links, a paid tier, a store partner), or none for now? It changes how prominent prices and links should be.

## The A/B taste screen

**What it is.** Two complete tanks side by side ("Your favourite" vs "Challenger"); Prefer A / Prefer B / Like both / Like neither / Skip; optional reason chips; Keep or Lock per row; "Make It Yours" commits. Each pick nudges a learned score that ranks Discover's ideas (capped, ranking only, with "Reset learning"). 1,123 lines, `src/ui/ab/*`. Picture: `research/screens/UI1/51-dormant-ab-screen-ab1-only.png`.

**You already decided its fate on 11-12.**
- 11-10: "A/B testing is cool and visually a great way to discover preferences, but is very costly ... 10 seconds from the user may help eliminate multiple rounds of costly A/B testing." (AB6)
- 11-12: you accepted D1: "Keep A/B running until the new loop is live, then hide the entry (not delete the code)", and "Start DQ13", which hid it behind `?ab=1` for debugging, code and tests kept.

**Does Discover still learn your taste without it?** Yes. Discover's card has Keep, Like and Dislike (per item, per category, per design); they feed the same learned score, per project, ranking only, with a Reset. "Compare 2-3" picks record a design-level Like.

**So the question is small:** UI2 now marks A/B "HIDE" (stays behind `?ab=1`, not moved to the new UI). Options:
- **Keep hidden** (the current state, matches your 11-12 decision): costs nothing now; it can be removed later.
- **Delete it at the flip** with the rest of the old UI: removes 1,123 lines and its tests; the learning model stays (Like / Dislike use it).
- **Bring it back inside Discover** as an optional "help me find my taste" game: only if you miss it.

Coordinator's recommendation: keep it hidden now and delete at the flip unless you miss it by then.

## Nathan's answers (2026-11-13)
- **User:** "the user is anyone who owns or is interested in aquariums. This is a tool to help them plan, evaluate, be inspired, or learn about aquariums. Help them design something that fits their needs, preferences, and constraints, that they like. And to explore ideas they may not have had otherwise, and to find the best tank for them."
- **Levels:** "absolutely every experience level, but the app's user experience should adapt to that so a brand new hobbyist and an experienced person with 20 tanks still feels at home and that the tool offers them something useful."
- **Experience:** "a possible constraint that the user can set if they choose to." A beginner who wants something hard does not filter; one who wants less chance of failure gates species by experience. "this should probably apply in some way to gear and plant species ... Plants can often times be harder to make thrive than animals."
- **Deals:** "keep an accurate budget, do deals sweeps, suggest equipment that would provide the equivalent function for less money, and suggest starting from or converting to a bundle if it would save the user cost on their build."
- **Build plan:** "not that important ... provide the info and experience and customizability that would be hard to replicate in an ai chatbot. How to best take care of fish does not fit that scope."
- **Money:** "nothing yet since we have no users but its something to keep in the back pocket."
- **A/B:** "The A/B screen itself is a very old feature and definitely should stay. Whether or not it stays as part of the automated process of finding the users tank-of-best-fit is still up in the air."
