# Answer 4: load size, time-to-first-tank, frame time

Fable, 2026-11-25, from origin/main `fcca8621`. Read: the brief, `src/main.ts`, `src/art/photofish.ts`, `src/data/species.ts` (`goLive`), `src/shell/boot.tsx`, `src/uiChoice.ts`, `public/sw.js`, `vite.config.ts`. Nothing was built or timed; every number marked "est." is arithmetic from the brief's sizes.

## 1. Diagnosis
Only **time-to-first-tank** hurts a cold visitor, and the cause is boot order, not shaders or frame time. The "several perf lanes" premise is stale: they all landed in October and their numbers held through 11-12 (first part 3.2-3.8 s). What regressed is feature work with no budget, in three stacked waits in `src/main.ts`:

1. **Both UIs download.** `main.ts` statically imports the whole old UI (`panels`, `group`, `brush`, `report`, ...) although the Preact shell has been the default since 11-15; then the shell (`boot`, 173 KB gz) loads on top. Est. cold JS for a default visit: 1,175 + 173 + 88 (`photofish`) = about 1,440 KB gzip.
2. **Fish art blocks everything.** The top-level `await loadPhotoFish` fetches 221 WebPs (6.1 MB) and draws each to a canvas on the main thread before `bootShell()` is even imported. The page sits on the `gb-new` plain background the whole time (inferred from code, not measured). Est. 5 s on 10 Mbps LTE, about 30 s on slow 4G, and it grows 0.13 MB per approved fish.
3. Only then do the 3-4 s of shader link start. These three are serial today.

A second finding the brief missed: fish art lives outside `/assets/`, so `sw.js` serves it network-first with `cache: 'no-cache'`. **Every repeat visit revalidates all 221 images before boot.**

Frame time is fine (7-14 ms GPU on the reference tanks); freeze it, do not work on it.

## 2. Plan (in order)

| # | Change | Files | Owner | Expected gain | Picture risk |
|---|---|---|---|---|---|
| 1 | **Measure once**: cold trace of today's build, desktop + throttled (slow 4G, 4x CPU) + one real run on the Galaxy S24+: bytes and time to shell visible, first part, animals | `scripts/cold-ab.mjs` (add throttle flag if absent) against `Glass-Box-testfix/dist` | coordinator, 1 Sonnet agent | replaces every "est." here; sets the budgets in step 5 | none |
| 2 | **Boot never waits on fish art.** Start `bootShell()` at once. Load art only for live species **in the opened scene** (a shared tank has about 3-6: est. 0.4-0.8 MB), in parallel with shader link, and hold only PL's last reveal part (animals) on it, with a timeout that falls back to the old model. Every other live fish loads on demand (added from the picker) or on idle | `src/main.ts`, `src/art/photofish.ts` (per-look loader in place of load-all), `species.ts` `goLive`, `viewer.ts` `revealTick` | new lane LB | removes 5.3+ MB and about 200 decodes from the blocking path; est. 5 s (LTE) to 30 s (slow 4G) less blank page; cost no longer grows with approvals | final picture identical. Risk is a visible old-to-new model swap; gating the animals part prevents it. Check picker thumbnails, which key on `s.look` |
| 3 | **Old UI out of the entry**: move the `else` branch behind `import('./oldUi')` now; delete it 11-29 as already planned | `src/main.ts`, new `src/oldUi.ts` | lane LB, same commit series | est. 300-500 KB gzip off first load (step 1 confirms); also check whether `herps` (96 gz) loads at all on the aquarium-only scope | none |
| 4 | **Cache versioned art**: `?v=` fish images cache-first; bump to `tanklook-v2` | `public/sw.js` | small side lane | repeat visits drop 221 round trips | none |
| 5 | **Budget gate** in `npm run build` (so `ship.sh` enforces it): fail if the index.html preload set + `boot` exceeds the budget, or if `main.ts` gains a top-level `await`; print the table every build | new `scripts/size-budget.mjs`, `package.json` | side lane, after 2-3 land | stops the next 3.4x | none |
| 6 | **Cold-link budget in lane briefs** (PT, any VF): hardscape program <= 3 s, first part <= 4 s, checked with `cold-ab.mjs` before merge | `prompts/lane-*.md` | coordinator | protects EF1 / SG | none |

## 3. Cut and defer
**Cut:** auto quality step-down (R24 says no); half-resolution fish art (after step 2 it is off the critical path, and it risks the picture); `manualChunks` tuning before the trace (touches `vite.config.ts` and the SF guard for an unknown gain); any new shader-link work.

**Defer:** `model-sheets` 13 MB and LOD GLBs 9.2 MB in `dist/` (deploy cost only, no visitor fetches them); `dist-single` size (coworker file, not the visitor path, but expect it to have grown several times); splitting the 0.8 MB anatomy JSON per look; `plantWorker` 181 KB gz (confirm in step 1 that it starts after first frame); iPhone numbers until R155 ships.

## 4. Targets (provisional until step 1)

| Metric | Today | Target | Verified by |
|---|---|---|---|
| Fish art before shell is visible | 6.1 MB | 0 | `size-budget.mjs` + network log in `cold-ab.mjs` |
| Fish art before animals show | 6.1 MB | <= 0.8 MB (in-scene only) | same |
| JS + CSS before first tank, gzip | about 1,440 KB est. | <= 750 KB, gate at 800 | `size-budget.mjs` |
| Cold first visible part, desktop | 3.2-3.8 s plus the art wait | <= 4 s all-in | `cold-ab.mjs`, median of 3, fresh profile |
| Cold first visible part, S24+ on LTE | unmeasured | <= 5 s; <= 8 s throttled | real device + throttled run |
| GPU frame, reference tanks | 7-14 ms | no change over +0.5 ms; <= 16.7 ms at DPR 2 | `perf-baseline.mjs --ab`, alternating frames |

## 5. Conflict map
- `src/main.ts`: steps 2 and 3 and the 11-29 old-UI deletion. **One lane, serial.**
- `src/art/photofish.ts`: step 2 vs any fish-pipeline lane editing the loader (rebuilds only write JSON and images, which is safe). Serialize.
- `viewer.ts` `revealTick`: step 2 only; PT works in `items.ts` / `lighting.ts`, so parallel is fine.
- `public/sw.js` (step 4) and `scripts/size-budget.mjs` (step 5): free files, parallel.
- R155 share lane: builds on the existing `#tank=` hash in `boot.tsx`; start it after step 2 merges.

## 6. Measure first
Step 1's trace, in this order: (a) how long the plain background shows on a cold phone load; (b) which of the 50 preloads the shell actually executes before first paint; (c) transfer vs decode share of the fish-art wait. If (a) is under 1 s on LTE, my diagnosis is wrong and step 3 moves ahead of step 2.

## Summary
1. The cold visitor waits on boot order, not shaders or frames: both UIs download and 6.1 MB of fish art blocks the shell.
2. Fix `src/main.ts` in one lane: boot at once, load only in-scene fish art behind the animals reveal, move the old UI out of the entry; then cache-first art in `sw.js`.
3. Add a size gate to `npm run build` (<= 800 KB gzip, no art before the shell) after one cold phone trace sets the real numbers; leave frame time frozen.
