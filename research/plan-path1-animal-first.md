# Build plan: path 1, "An animal I want" (Nathan 2026-10-20: build it fully, he dogfoods it before path 2)

The design is in HANDOFF.md, section "User flow: paths, budget, deals" (read all of it first). This file splits the build
into lanes, with files and order. Written by the user-flow design chat (local_eda2d645) for the coordinator.

## The flow being built
1. New menu asks "What do you have so far?" with five cards. For dogfooding only **An animal I want** and **Sandbox**
   (= today's Start from scratch) work; the other three show as "coming soon". Deals stay where they are for now.
2. **Stocking screen**: pick an animal (search by common name, 3D). Each species added starts at its recommended minimum
   group, + / - with graded band messages, separate male / female counts for species usually sexed, habitat notes
   (depth, flow). "Other animals in with them?" suggests tankmates ranked by compatibility, each with its own count.
   Meanwhile the viewer shows the animals in a bare tank that steps up through catalogue sizes as they are added, labelled
   "About a 20 gal long (76 x 30 cm)"; each step-up offers the next few good sizes, each with its cost increase and the
   space bar it would give. Live: setup cost span (cheapest to balanced build) and minutes a week.
3. **Fullness tile** on the viewer (minimizable): space and filtration bars from `stockingOf`; optional "Set my space"
   draws a dashed outline; going past it opens the fork card (make room: next sizes with cost / swap: animals with the
   same appeal).
4. **Three builds**: cheapest, least work, balanced, for this stocking and tank, with tank and gear deals.
5. **Scape**: "Live plants?" (live / artificial / mixed); suggested styles rendered in THEIR tank with THEIR animals,
   each with setup $, minutes a week, light / CO2; or scape from scratch.
6. **Make it yours** (the editor, gates hold) and **the plan** (verdict, shopping list tied to the need each item serves,
   one line "cycle the tank before adding animals; read about the nitrogen cycle").

## Shared schema (fixed now so lanes can code against it before the data lands)
New `src/data/groups.ts`, merged into `CARE` by a loop at the end of care.ts like WATER / CHEM:
```ts
export interface GroupCare {
  /** counts where each band starts: below `ok` = avoid */
  bands?: { ok: number; good: number; great: number };
  /** one line per band; defaults are generated from the numbers when absent */
  msg?: { avoid?: string; ok?: string; good?: string; great?: string };
  /** most per tank (solo species = 1; a bonded pair = 2) */
  max?: number;
  /** usually kept by sex in the hobby: recommended males : females, and why */
  sexed?: { ratio: [number, number]; note?: string };
  /** deepest comfortable water, mm (dwarf frogs surface for every breath) */
  maxDepthMm?: number;
  flow?: 'low' | 'medium' | 'high';
  zone?: 'bottom' | 'middle' | 'top' | 'all';
  /** shortest tank length for this species, mm */
  minLengthMm?: number;
  /** what keepers like about it, to rank swaps: personality, showpiece, colour, size, shoal, oddball, ... */
  appeal?: string[];
}
```
Recommended minimum = `bands.ok`, else today's `CARE.group`, else 1.

## Lanes
| Lane | Owns (new files unless noted) | Needs | Can start |
|---|---|---|---|
| **P1 group data** | `src/data/groups.ts`, the merge loop line in care.ts, `test/groups.test.ts`, `research/groups-sources.md` | nothing | now. Research by Sonnet / Haiku agents per CLAUDE.md: measure one batch, quote per-species cost and total to Nathan, wait for his yes. 84 species (`species.json`). Dwarf frog is Nathan's worked example: 1 avoid (lonely), 2-4 doable, 5-6 good, 7+ great; shallow (about 30-45 cm), gentle flow. |
| **P2 tank fit** | `src/scene/tankfit.ts`, `test/tankfit.test.ts` | schema above (defaults until P1 lands); `stockingOf` (read only: lane SE2 owns stocking.ts); `data/tanks.ts` catalogue; demand model for cost deltas | now. API: `tankFor(animals)` = smallest catalogue tank meeting the SPACE limit, floor area by zone, `minLengthMm`, `maxDepthMm`; `stepUps(animals, current, n)` = next good sizes with `{tank, costDeltaUsd, spacePct, filtrationPct}`; `buildSpan(animals, tank)` = setup $ cheapest..balanced + minutes a week. Floor area is new: SPACE is per litre today. |
| **P3 fullness tile** | `src/ui/fullnessTile.ts`, dashed space outline in the viewer, `layout.space` in the scene (no version bump without asking Nathan) | `stockingOf` | now. A new viewer overlay (lane SE's step 4, the sidebar stocking line, is already on main: 1b551b2). Minimizable tile, two bars (space, filtration) with the top contributors on hover, "Set my space". |
| **P4 artificial plants** | plant item kind `artificial` (data, items, plant3d without growth), silk vs plastic flag | the plant system; one-line hook in stocking.ts (no nitrate uptake) via SE2 | now, lower priority (needed by P6). |
| **P5 stocking screen** | New menu five cards (`index.html` #startDlg, `startEntries.ts`), `src/ui/stockPlan.ts`, its CSS, a one-line hook in panels.ts | P2's API, P1 schema, P3 tile | after P2's API is on main. The fork card lives here. |
| **P6 builds, scape, plan** | `src/scene/builds.ts`, `src/ui/buildPick.ts`, `src/ui/planSheet.ts` | P2, P5, tech catalogue, kits, `gearOffers` / deal match, starter styles, P4 for the artificial option | after P5. May split: P6a builds, P6b scape + plan. |

## Conflict to settle first: the unshipped wizard branch (checked 2026-10-20: commit dbc7aa6 with `src/ui/wizard.ts` is NOT an ancestor of origin/main; it lives only on the LOCAL branch `wizard` in the shared folder, no remote copy: do not delete that branch)
Branch `wizard` (lane KW, 6 commits, `src/ui/wizard.ts` 358 lines, not on main) builds a different flow: stage question,
goal + one budget number, bare tank vs kit, open with the kit applied. The five-path New menu replaces its stage question.
**Decided (Nathan 2026-10-20): the KW wizard is obsolete, not shipped.** Keep the local branch: P6a reuses its tank / kit picking (`tankChoices`, kit filtering) for the builds.
