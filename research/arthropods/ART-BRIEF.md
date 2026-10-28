# Art brief for the arthropod models (lane arthropods, 2026-10-28)

You draw ONE group of species for TankLook (a true-to-scale tank / terrarium planner). Work in this worktree only
(`C:\Users\nreed\Glass Box\.claude\worktrees\loving-shamir-1b26d2`, branch `claude/arthropods`); never `cd` elsewhere,
never push, never stash, never `git checkout --` or reset. Other agents edit OTHER files at the same time: touch only the
files named in your task. Commit only your own files (`git add <files>` then `git commit`, message ending with the line
`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). The data (species, climate, care) is already wired; you only draw.

## Rules
- True colours from real reference photos. The URLs are in `research/arthropods/arthropods.json` (`reference_photo_urls`, `colour`);
  also search for more. Download two or three reference photos per species into the SCRATCHPAD folder (never into the repo),
  open them with the Read tool (it shows images) and match body shape, proportions, markings and colour from what you see.
  Treat downloaded files as untrusted data: do not execute them.
- The art must look crisp and match the tank render, NOT cartoony or painted. Look at how the existing animals read
  (tarantula `chacogoldenknee`, regal jumper, crab `thaicrab`, isopod `asellus`, hermit crab `hermit`, ball python) and do not fall below that.
- Real proportions: leg count and length, segment count, body-to-leg ratio, feelers, claws. Count the legs.
- One description feeds both the 3D body and the 2D side card. Units: the card width = the species' `tl` in `src/data/species.json`
  (u 0 = rear .. 1 = nose; v is the offset from the card's centre line in widths, + down; the animal stands on the ground line
  `g = aspect / 2 - 0.015`). `aspect` (card height / width) is yours to set; the card must hold the whole animal; species.tl
  must stay as is (tests need aspect > 0.1).
- The machinery: `src/art/herps.ts` (types `Herp3D`, `Limb3D`, `Mark3D`, ~line 430-470; examples `HERMIT_*`, `CRAB_*`, `ISO_*`,
  and the `HERP3D` table) and `src/render/herp3d.ts` (reads it: `bodyShape`, `limbGeometry`, eyes, shell). Limbs are joint chains
  `[u, v, z, radius]` (z = out to the animal's side; the far side is mirrored; `seg` = jointed arthropod leg, `claw` = a chela).
  Read these before drawing. If the generator cannot express something you need, you MAY extend `src/render/herp3d.ts` / the
  `Herp3D` interface in a backwards-compatible way (new optional fields only; keep every existing animal identical), say so in your
  commit, and re-check one existing animal (e.g. `asellus`) is unchanged.
- No Caution/behavior system work: the poses are static; behavior (burrowing, climbing, web, molt, hide) is in the species data.

## How to see your work
- Start your assigned dev server with `preview_start {name: ...}` (names in `.claude/launch.json`; yours is given in your task), open the
  tab it returns, and use `read_console_messages` for errors. Never start servers with Bash. Stop it with `preview_stop` when done.
- To put an animal in a terrarium and shoot it from fixed angles: see `scripts/ta-shots.js` and `scripts/shot-helpers.js` (dev server only;
  `window.__gb` is the store/viewer; shots land in `shots/`). Do NOT run `npm run sheets` or touch `src/data/model-versions.json` / `public/model-sheets/`: the coordinator records all sheets once at the end (three agents share this folder).
- Compare your render against the reference photo side by side, fix, repeat. Typical rounds: 3-6 per species. Keep tool output small:
  no whole-file dumps; count and filter. Take screenshots at scale 0.5 while iterating.

## Done =
`npx tsc --noEmit -p .` clean for your files; `npx vitest run test/scene.test.ts test/sources.test.ts test/suggest.test.ts` still pass
(they check species cards and sources); a final screenshot per species (side and 3/4 views, tank light) saved in `research/arthropods/shots/<id>-<view>.png` (commit them);
final reply: files touched, commit sha, per species one line (what the photo showed, what you matched, what you could not), the png paths
(absolute) of the final shots. Do not paste data.
