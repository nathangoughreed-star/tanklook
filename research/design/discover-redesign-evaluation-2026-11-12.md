# Discover / Guided / Sandbox redesign: evaluation against the code (lane DQ6, 2026-11-12)

Answers section 16 of `discover-redesign-proposal-2026-11-12.md`. Tags follow the proposal: **[User]** = Nathan's direction, **[Assistant]** = the other AI's suggestion, not approved. Paths are under `src/`. No code changed. Things I read but did not run are marked *(read, not run)*.

## 0. Headline
The proposal is closer to the code than it looks. Underneath the A/B screen sits an older, **delta-based, lock-aware, scope-aware engine** (`scene/discover.ts` `propose`, DX2) plus a persistent lock model (`scene/locks.ts`, DX0/PS1) that already does "keep these, regenerate the rest, apply as ONE undo step". The A/B loop (`pairGen.ts`, `discoverySession.ts`, `ui/ab/*`) is a pair-chooser layered on top. Going back to iterative generation is mostly **un-layering**, not rewriting. The real work is three things:
1. The Discover screen **freezes the editor** (`Store.frozen`), so it cannot be "usable at any point inside the editor".
2. There is **no stored Guided / Sandbox mode** today, and no Like / Dislike model beyond attribute-value thumbs.
3. The candidate pipeline (`pairGen.ingest`) is welded to the pair logic and must be exposed as "top-N diverse candidates".

## 1. Reuse map
| Piece | Where | Verdict |
|---|---|---|
| Scoped delta engine: copy, generator, `confine`, `deltaBetween`, `checkProposal`, `verdictOf`, diversity pick, no-solution with smallest relaxations | `scene/discover.ts:178` `propose`, `:79` `confine`, `:240-251` | **Carries over as is.** Objectives `explore / complete / refine / solve` (`:26`) already map to Finish / Fill this section / Show alternatives / Full regeneration. |
| Locks: object / roster / tank / substrate / backdrop / gear, `held` values, `lockViolations`, `effectiveTank` | `scene/locks.ts:78, 84, 121`; `types.ts:446-449` | **As is.** This IS "Keep this". Per tank, saved, undo-safe, survives reload. |
| Proposal apply = one undo step, refuses stale rev / out-of-scope / lock break, never adds a lock | `scene/proposal.ts:55 checkProposal`, `:69 applyProposal` (`store.seal()` before and after) | **As is.** One generation = one undo step already. |
| Candidate pipeline (`ingest`: no-live swap, confine, fitGear, reconcileGear, checkProposal, roster locks, equipPlan, verdict, score, `passesHard`, `finalCheck`) and the pool (`explorePool` looks, stratified `diversify`) | `scene/pairGen.ts:409 nextPair`, `ingest`, `:341 diversify` | **Needs a change:** split "make N feasible diverse candidates" from "choose a pair / challenger". Today only `nextPair` exposes it and it returns `{a, b}` (`discoveryTypes.ts:123`). |
| Look hand-off onto an existing design | `scene/reeval.ts:188 handOff` | **Needs a change:** only `mode: 'look'` (replaces `LOOK_FIELDS` wholesale, keeps tank / gear / roster). No "fill the gaps among pieces". |
| Scoring: one policy, stated vs learned, learned capped (0.8, or 0.4 once anything is stated) | `scene/scorePolicy.ts` `scoreBreakdown` | **Reuse; retune** the learned cap for direct feedback (decision D5). `designAxes.ts` already reads a real design, so it works on partial scenes. |
| Thumbs (soft, bounded +-0.12 per value, cap 0.5, ranking only, never a filter, tested) | `scene/attrs.ts:64-91`; stored `brief.project.thumbs` (`brief.ts:167`) | **Extend** into Like / Dislike (section 3). |
| Feasibility: `verdictOf` gates (welfare / physical), hard limits, targets, advisories | `scene/verdict.ts:36, 120`; `ui/briefFeasibility.ts`, `ui/infeasibleCard.ts`, `ui/pickerStrict.ts` | **As is.** Already separates genuine failures from recommendations, which is what [Assistant] section 9 asks for. |
| Keep UI in the left panel (per-tab Keep list, Discover buttons per tab) | `ui/discover/keep.ts` `attachKeep`, `ui/discover/logic.ts:133 applyCard` | **Reuse as the seed of in-editor Discover.** Note `da-live-path-map.md` calls `ui/discover/panel.ts` legacy; `keep.ts` / `logic.ts` / `entry.ts` / `switches.ts` are live. |
| Per-tab "Discovery can change this" switches | `scene/discoverScope.ts:8`, `ui/discover/switches.ts` | **As is** (scope = tabs). Becomes the "narrow" scope. |
| A/B-only: champion / challenger state machine, pending-fresh, Like both / neither / Skip, A-vs-B attribute rows, Combine, history drawer, `session.targets` | `scene/discoverySession.ts:66 record`, `discoveryTypes.ts:102`, `ui/ab/screen.ts`, `real.ts`, `logic.ts`, `scene/attrs.ts:92-105 (AB13 rows)` | **Retire** once the replacement is live (or keep as the optional 2-3 candidate compare, [Assistant] section 11). `Combine` (`pairGen.ts:563`) is the closest thing to "copy one tab from a candidate"; keep it, it feeds "Try this planting". |
| Quick cards -> brief writer (`quickPrefs.applyQuickPrefs`, archetype catalogue) | `scene/quickPrefs.ts`, `scene/quickArchetypes.ts` | **Keep.** They are the "specify as much or as little" input; unrelated to A/B. |

## 2. Partial scenes: what stops Discover today
| # | Blocker | Evidence | Fix |
|---|---|---|---|
| 1 | **The editor is frozen while Discover is open**: edits and undo / redo are refused | `scene/store.ts:203-216` (`frozen`, `onBlocked`), `:310-311`; `ui/ab/screen.ts:48` | Discover must stop being a modal screen. Candidates render as a **preview overlay** (the `effTank` / `previewShot` pattern, `ui/discover/logic.ts:62`) on the live editor; nothing freezes. PS1 already made the freeze unnecessary for correctness: Discovery writes nothing to the design. |
| 2 | The A/B engine builds whole looks, then confines them back | `pairGen.fromLook`, `confine` `discover.ts:79` | Works for tab-level fill. For **item-level** Keep (keep one driftwood, regenerate the other pieces) `confine` re-adds locked items after the generator ran (`:95-104`); I did not verify overlap checks between a re-added kept piece and newly generated pieces *(not run)*. Needs a placement-aware generator pass: treat kept items as obstacles. |
| 3 | `handOff` replaces the whole look | `reeval.ts:188-215` | Add a `mode: 'fill'` that keeps existing items and adds only what a region / category lacks. |
| 4 | `propose` producers regenerate by **density stop and seed** (`discover.ts:146-150`): the variants are siblings of the current design, not different looks. Different looks only arrive via `opts.explore` (hand-off of `explorePool` scenes) | `discover.ts:145-151, 197` | For broad "Explore", route the pool through `nextPair`'s candidate pipeline (see section 1). |
| 5 | `complete` objective only adds (rejects any remove / change / tank set) | `discover.ts:210` | Good for "Fill this section". Needs a fallback when the gap cannot be filled without changing a non-kept item: say so and offer `refine`. |
| 6 | Tank tab in scope + tank not locked is the only way a new habitat is drawn | `pairGen.ts:171 habitatFree` | With an existing tank, "Finish my setup" must run with `tank` out of scope and use `adaptToTank` for the look. Already how `confine` works; keep. |
| 7 | Scoring and the cache key assume **cards + A/B history** | `pairGen.ts:112-120` (`feasibilityBrief`, `rankingSig`), `scorePolicy.ts` | Fine on partial scenes. The cache key is feasibility-only already (DQ4), so feedback changes rerank cached candidates without regenerating. |
| 8 | New-gate-only filtering: a candidate is rejected only for gates the base did not already have | `discover.ts:221-223` | **Good for partial / imperfect scenes:** an already-overcrowded tank does not block unrelated proposals. Keep. |

## 3. Feedback model
**Two stores, never conflated ([Assistant] architecture D):**
- **Keep (hard) = the existing `locks`.** No new field. Extend `ObjectLock.props` use for attribute-level keep (it already holds property groups: position / size / pose / look; `FISH_PROPS` species / position / size / sex, `locks.ts:10-22`) and roster modes `exact / atLeast / speciesOnly` (count vs identity). That already answers open question 2 in data terms.
- **Like / Dislike (soft) = one list of `Feedback` entries in `brief.project`** (next to `thumbs`, `lean`, `quick`; saved with the tank, undo-safe, in share links).

```ts
// proposed, brief.project.feedback (replaces thumbs; thumbs migrate to level:'attr' entries)
interface Feedback {
  v: 1 | -1;                     // like / dislike (0 = take back: delete the entry)
  level: 'design' | 'category' | 'item' | 'attr';
  cat?: AttrKey;                 // 'hardscape' | 'plants' | 'stocking' | 'substrate' | ... (attrs.ts ATTRS)
  target?: string;               // item uid or species id (level 'item')
  attr?: 'identity' | 'count' | 'placement' | 'material' | 'size' | 'style';  // what was liked
  elements?: string[];           // the value's parts (thumb elements: variants, species, 'layout:<id>')
  at: number;                    // revision or counter, newest wins; FIFO bound like MAX_THUMBS
}
```
- **Whole design** = a `design` entry holding the design's feature keys (`explore/aspects.ts featuresOf`); scored through the existing aspect weights.
- **Category** = a `category` entry on one of the 10 attributes of `scene/attrs.ts ATTRS`.
- **Item** = an `item` entry on a uid / species; scored by its `variant` / species element (the thumb mechanism). **Placement of one specific rock is not a thumb-able value today** (thumbs are on element sets, `attrs.ts:82-91`): to dislike a *placement* (the proposal's own example) a `layout:<archetype>` element (already a feature key and `ATTR_TAGS.hardscape = ['layout']`, `attrs.ts:108`) must be the target; dislike of an individual position steers away from the layout archetype only, never bans rocky scapes. Say this plainly in the UI copy.
- **Not mutually exclusive:** an item can hold a lock AND a feedback entry (keep driftwood, dislike placement = lock props `['look','size']`, not `position`, plus a placement dislike).

**Mapping onto DQ1-DQ3 (today's vocabulary):**
| Today | New | Note |
|---|---|---|
| firm: brief item `status:'hard'`, `quick.sizeFirm`, passesHard (`quickPrefs.ts`) | unchanged | constraints, not feedback |
| `preference` status, `Pref{strength:'prefer'}`, told keys (cards) | unchanged | "stated" in `scorePolicy` |
| attribute thumbs (`attrs.ts setThumb`), AB13 A / B picks | **become Like / Dislike `attr` entries** | same scoring (`thumbBonus`), same bound |
| aspect events from A/B votes (`explore/aspects.ts pairEvents`) | **stop being written**; Like / Dislike write tagged events only where `ATTR_TAGS` has a tag | an A/B vote taught "what differs"; a direct Like says exactly what |
| `lean` (cost practical lean) | keep as is | cost reasons, not taste |
| `session.targets` (ComponentPref), `championId` | retired with A/B | |
| Like both / neither / Skip | no equivalent | |

**Where it lives (open question 4):** Keep = the tank (`TankSetup.locks`, already per tank); Like / Dislike = `brief.project` (per project, saved). `DiscoverySession` is **browser-local and not saved or shared** (`discoverySession.ts:146`): none of the new feedback may live there. A "design branch" does not exist as a concept in the code (a scene holds `tanks[]`); do not invent one for v1.

**Evidence / reset:** DQ4's `resetLearning()` (clears events, thumbs, lean, targets; keeps locks and stated) extends to the new list with no change in behavior.

## 4. Regeneration scope and breadth
- **Scope** is already modelled: `DiscoveryRequest { scope: Tab[]; objective; focus?: { tab, uids?, region?, text? } }` (`discover.ts:28-29`). `Region` (9 cells) and uid focus exist and `narrow()` (`:121`) enforces them. Map [Assistant] actions: **Finish my setup** = `complete` over all tabs with content gaps; **Fill this section** = `complete` + one tab (or region); **Show alternatives** = `refine` + `focus`; **Full regeneration** = `explore` over all unlocked tabs. Question 1 (every unkept element vs the area being worked on) is therefore a **default-choice**, not a capability limit: both are supported.
- **Never touching Keep** is enforced twice: `confine` (`:95-111`) and `checkProposal` -> `lockViolations` (`proposal.ts:55`). A conflict returns `noSolution` with named conflicts and smallest relaxations (`:240-251`) and never applies anything. That covers [Assistant] section 10 (20 gal + Oscar) already.
- **Feasible space vs breadth stay separate by construction:** feasibility = `confine` + `checkProposal` + `verdictOf` + `passesHard` (what is allowed); breadth = `scene/breadth.ts` `breadthOf` (`explore | refine`, `targetDistance`) + `strategySchedule` + `diversify` / `distance` (`discover.ts:159`) (how far candidates sit from each other and from the current design). One control, two derived knobs: `{ breadth: 0..1 }` -> `objective` (refine / explore), `targetDistance`, variants `n`, and the producer offsets. [Assistant] Explore / Remix / Refine are three presets of that number. I recommend a 3-step control (D3); a free slider adds no behavior the code can honour.
- **Narrowing as Keep accumulates** needs no code: the more locks, the fewer candidates pass `confine`. What is missing is feedback to the user: show "N designs fit" / "Only this one fits" (the single-record case exists, `PairResult.single`, `discoveryTypes.ts:125`).

## 5. Guided / Sandbox integration
**What exists:** there is **no stored mode** (`ui/startMode.ts:1-4`: "No mode is stored any more"; `SANDBOX_BAR = false`, `:59`). "Sandbox" today = a new empty tank of a kind (`ui/panels.ts:180, 321`) plus brief items switched **off** ("Guardrails", `startMode.ts:5, 24`) so their checks stop; welfare Problems always show red as "not a valid tradeoff" (`startMode.ts:43 sandboxFlags`, the strip itself retired). The Checks strip (DX1, `verdictOf`) is the one verdict.

**Gated vs informational today:**
| Check | Behavior |
|---|---|
| `verdictOf` gates (welfare + physical) and hard limits | **Gate for Discover candidates** (a candidate that adds a new gate is dropped, `discover.ts:221-223`); **informational for manual edits** (Checks strip, never blocks) |
| `pickerStrict` (species picker grays a species that would add a Caution / Problem) | **Gate in the manual picker** (`ui/panels.ts:791`); I found no mode switch around it *(read, not run)* |
| Brief `off` items | The only existing "relax this check" switch; per item, saved |
| `targets` / `advisories` | Ranking / informational only |

**Proposal on a shared design:**
- Introduce one saved field, `brief.project.rules: 'guided' | 'sandbox'` (default `guided`), read by exactly three places: the picker gate (`pickerStrict`), the Discover candidate filter (gates on for `guided`; for `sandbox` see D7), the Checks strip wording. **Nothing else changes between modes**, the design, locks and feedback are shared by construction because they all live on the same `TankSetup` / brief.
- **Overcrowded Sandbox tank switched to Guided:** `verdictOf` already returns the gates (`stock:room`, `stock:filter`, `cat:*`, `verdict.ts:57-66`) with `uids` and a `relax` text. On the switch, show the Checks strip and offer `solve` (`discover.ts:224`, "nothing to solve" guard `:224`) as the fix action: it proposes fixes as deltas and **nothing is deleted until the user applies** (`applyProposal` is the only write). No new machinery.
- **Discover launched from Sandbox ([Assistant] section 10 open question):** see D7.

## 6. Not breaking manual editing
| Concern | State | Action |
|---|---|---|
| **Undo: one generation = one undo step?** | **Yes today** (`applyProposal`, `proposal.ts:69`; PS1 verified Undo / Redo restores held copies with locks) | Keep this the only commit path. **Regenerate-while-previewing writes nothing**, so repeated Regenerate adds no undo steps, only Apply does. Locks / feedback changes while Discover is open should also not land in the undo stack (PS1: requirement-only updates). |
| Already-chosen gear and animals | Gear: `confine` + `reconcileGear` + `equipPlan` keep owned gear, gear locks hold light / filter / heater / stand (`locks.ts:36`); `No new equipment` and Must-use tank are enforced (`discover.ts:215-220`). Animals: roster locks (exact / at least / species). **But unlocked animals ARE regenerated** under `explore` | The UI must say what is open vs kept before Generate. Recommendation: a one-tap "Keep everything I added by hand" default (D2). |
| Saved designs | Locks, brief, `project` extras are saved; session is not | Feedback in `brief.project` is saved free. Old saves load unchanged (thumbs migrate by read). |
| **AB9 / PS1 preview isolation** | Discovery writes **nothing** to the design; locks carry `held` values; `effTank` lays them over for Discovery (`locks.ts:84`); Make It Yours is the one commit (`ui/ab/screen.ts:345`) | **This is the foundation to keep.** The in-editor Discover must preview via `effTank` / `previewShot`, not by editing the live store. Risk: *removing* `frozen` (blocker 1) while PS1's held locks exist, a hand edit can land while a proposal is stale; `applyProposal` already refuses stale `baseRev` (`proposal.ts:69`), so show "design changed, regenerate" instead of applying. |
| Mid-generation edit | A stale proposal is refused by rev | UI: auto-dismiss the previews on any scene change (existing 'scene' kind in `Store.subscribe`). |

## 7. Decisions for Nathan before building
Only decisions that change what gets built. "Blocks" = blocks the first build lane (DQ7).

| # | Question (proposal section 14) | Recommended answer | Cost of the alternatives | Blocks? |
|---|---|---|---|---|
| D1 | **Remove A/B?** (3, 11, Q10) | **Keep A/B running until the new loop is live, then hide the entry (not delete the code).** Optional 2-3 candidate compare stays as a "Show alternatives" view; no mandatory voting. Internal learning (aspects, thumbs, lean, cost) is kept and fed by direct feedback. | Delete at once: loses the only working Discover UI during the build and a working fallback for 3 lanes. Keep forever: two Discover doors, two feedback semantics. | No (it shapes lane order). |
| D2 | **Regeneration default scope** (Q1) | **Everything not kept, within the checked tabs**, with a one-tap "Fill only the gaps" (`complete`) and a region / tab narrowing. Hand-added items are *not* auto-kept. Show a count "3 kept, 12 open" before generating. | Area-only default: weak first generation, needs focus picking every time. Auto-keep everything: Discover can never change what you have, so it cannot improve it. | **Yes** (UI, copy) |
| D3 | **Breadth control** (Q5) | **3 presets** (Explore / Remix / Refine) over one `breadth` number; no slider in v1; inferred breadth only as the *initial* preset (more kept -> Refine). | Slider: no extra behavior behind it. Inferred only: invisible control, unexplainable. | No |
| D4 | **Keep semantics** (Q2) | **Two-tier Keep:** default = identity + count (piece / species stays, may move; a piece's position stays only if "Pin position"), because the lock model already has `props` groups and roster modes. Show a small badge (padlock; hover says what is held). | Always "exactly as placed": over-constrains, shrinks the space to nothing fast. Identity only: users feel their placement was ignored. | **Yes** (lock UI + `props` default) |
| D5 | **Like / Dislike strength** (Q3) | **Direct feedback gets its own capped term** in `scorePolicy` (cap 0.8, separate from the A/B-learned cap 0.4-0.8), still ranking only, never a filter; Dislike on one item steers off that *element*, never bans a category. Copy says what was learned ("fewer pieces like this rock"). | Reuse the 0.4 cap: a Dislike barely moves results, users repeat it. Hard-ban on Dislike: the proposal explicitly rejects it. | No (tunable after first build) |
| D6 | **Persistence** (Q4) | **Per project** (`brief.project.feedback`) with Reset. No cross-project profile until asked for. | User profile: needs an account / storage the app does not have for tanks; cross-contamination between a reef and a terrarium. Branch: no branch concept in code. | **Yes** (data model) |
| D7 | **Discover in Sandbox** (Q7, section 10) | **Sandbox Discover is always welfare-defensible** (same gates as Guided; it may ignore *budget / care / experience* limits). "Unrealistic" is a manual-edit privilege, not a generated one. Offer an explicit "Wild ideas" toggle later. | Unrealistic allowed: the generator's output reads as a recommended setup for real animals; breaks the "not a valid tradeoff" promise. | **Yes** (candidate filter) |
| D8 | **Replace vs compare vs recoverable version** (Q6) | **Preview, then Apply (one undo step); Regenerate replaces the preview; the previous previews stay in a short "back" list for the session.** Applied designs are recoverable by ordinary Undo. | Always-compare = A/B again. No back list = a good candidate lost on the next click. | No |
| D9 | **Conflict resolution when one fix needs several changes** (Q8) | **Reuse `noSolution`:** list the conflicts + the smallest relaxations each as one button, applied in order **one at a time**, each re-checked; never auto-apply a bundle. | Auto-bundle: silently breaks a kept decision. | No |
| D10 | **Where Keep / Like / Dislike appear** (Q9) | **On the item** (selection popover and Animals / Plants / Hardscape lists), **on the category header** and **on the preview card for the whole design**; 3 icons everywhere. | Only a side panel (today's `ui/discover/keep.ts`): not discoverable. | **Yes** (UI lane) |
| D11 | **Stored Guided / Sandbox switch** | **Add `brief.project.rules`** (section 5); default `guided`. A toggle in the header. | Keep it implicit via Guardrails: Discover cannot know which gate set to apply. | **Yes** |

Q3 (which characteristic caused a Like) is resolved by D5's `attr` field plus a one-tap "what do you like?" chip row (material / count / placement / look) shown only on request, not by default.

## 8. Migration path
Rule: A/B stays reachable and unchanged until DQ13. Lanes are a few days each, Sonnet.

| Lane | What | Files (owner) | Ships visibly | Needs |
|---|---|---|---|---|
| **DQ7 Candidate API** | Extract `nextCandidates(project, brief, {objective, scope, focus, breadth, n})` from `nextPair` (`ingest` + pool + `diversify`), A/B calls it; `handOff mode:'fill'` (partial scenes) | `scene/pairGen.ts`, `scene/reeval.ts`, new `scene/candidates.ts` | Nothing (A/B identical, tests prove it) | D2 |
| **DQ8 Feedback model** | `brief.project.feedback`, migration from `thumbs`, scoring term + cap (D5), `resetLearning` covers it, tests | `scene/attrs.ts`, `scene/scorePolicy.ts`, `scene/brief.ts`, `scene/validate.ts` | A/B attribute picks now write Like entries (same behavior) | D5, D6 |
| **DQ9 Rules switch** | `brief.project.rules`, header toggle, picker gate + Checks wording by mode, "switch to Guided: show violations, offer `solve`" | `scene/brief.ts`, `ui/startMode.ts`, `ui/panels.ts` (picker call only), `ui/pickerStrict.ts` | Guided / Sandbox toggle | D7, D11 |
| **DQ10 In-editor preview** | Discover as a non-freezing preview overlay on the live editor via `effTank` / `previewShot`; Generate / Regenerate / Apply; stale-rev handling; no `frozen` | new `ui/discover/inline.ts`, `ui/discover/logic.ts`, `scene/store.ts` (read only) | "Finish my setup" and "Fill this section" in the editor, one undo step | DQ7 |
| **DQ11 Keep / Like / Dislike UI** | The three icons on item, category and card; badges; "N kept, M open"; Pin position | `ui/discover/keep.ts`, selection popover, list renderers, `style.css` block | Visible feedback + Keep everywhere | DQ8, DQ10, D4, D10 |
| **DQ12 Breadth + conflicts** | Explore / Remix / Refine presets, "N designs fit", conflict card with one-click relaxations | `scene/breadth.ts`, `ui/discover/inline.ts`, `ui/infeasibleCard.ts` (hook) | Breadth control, readable "no design fits" | DQ10 |
| **DQ13 Retire A/B entry** | Hide the A/B door, optional "Compare 2-3" kept, docs + tests | `ui/ab/*`, `ui/discover/entry.ts`, header | A/B gone from the toolbar | DQ11 + Nathan's yes |

**Parallelism (no shared files):** DQ7 and DQ9 can run together (pairGen / reeval vs brief / startMode); DQ8 touches `brief.ts` / `attrs.ts` / `scorePolicy.ts` and so collides with DQ9 on `brief.ts` (one-line field each; sequence DQ9 after DQ8, or have DQ9 add only its own field in a separate type block). DQ10 needs DQ7; DQ11 needs DQ8 and DQ10; DQ12 needs DQ10; DQ13 last. Suggested waves: **{DQ7, DQ8}**, then **{DQ9, DQ10}**, then **{DQ11, DQ12}**, then DQ13.
`src/ui/panels.ts` (2.4k lines, picker + startup) is touched by DQ9 only; `style.css` blocks per lane (`.dq-*`).

## 9. Risks (where the proposal fights the architecture)
1. **A/B owns the entry point and the freeze.** The old Discover button opens a modal that freezes the editor (`store.frozen`); the proposal's "usable at any point" contradicts that. Mitigated by PS1's isolation but it means DQ10 is the real risk lane, not the generator.
2. **Item-level Keep vs a regenerating layout.** Generators place by layer and seed (`regenerate`, `shuffleHard`), then `confine` puts kept pieces back; kept pieces can overlap new ones and a layout generator does not know about them *(not run; check in DQ7)*. Plants parent to hardscape (`confine` rejects orphaned parents, `discover.ts:114`): keeping a plant while regenerating rock can null the candidate.
3. **Soft-feedback granularity.** Thumbs are bounded (60 entries FIFO, 0.5 cap) and per value; "dislike this placement" and per-item attribute feedback are finer than the model. D5 / section 3 scope it honestly; do not promise per-rock placement learning.
4. **"Never silently drop" vs `explore`.** Unkept hand-added animals will be replaced by design. Needs the D2 count and a clear preview diff (`diffRows`, `ui/discover/logic.ts:75`) before Apply.
5. **Two sources of "mode".** `startMode.ts` documents that no mode is stored on purpose (DX5, "ONE project"). A saved rules switch reintroduces a mode; keep it to rules only (gates), never to data (D11).
6. **Learned preferences must not outweigh stated limits** (DQ1: learned total capped). A separate direct-feedback cap (D5) must stay below hard / stated terms; add a test like the existing "thumbs never filter".
7. **Cost of candidates.** First pair cold 1.0-1.7 s (DQ2); a Regenerate every click at ~1 s is acceptable but breadth `explore` with 4 families can reach the 2.2 s soft deadline. Cache split (DQ4) means feedback re-ranks cached candidates for free, so Like / Dislike should rerank instantly and only Regenerate pays.
8. **Tests are tied to A/B.** `ab1`, `ab13`, `ab-integration`, `dq1`-`dq5` drive `nextPair` through the real engine; DQ7 must keep them green unchanged, which is why it ships nothing visible.
