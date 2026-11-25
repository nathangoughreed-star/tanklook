# Glass Box / TankLook (Yourarium): rules for every chat

## Commit your own work immediately (Nathan, 2026-11-12)
Every chat commits its own finished work itself, right away. You don't need a coordinator for this. Never end with "left uncommitted" or "left for the coordinator".

- **In the shared folder `C:/Users/nreed/Glass Box`:**
  1. Run `npm run build` (it includes tsc) and the tests for what you touched.
  2. Then run `scripts/ship.sh -m "<what and why>" <your files>`. It commits only the named files and pushes to main without touching other chats' edits.
  3. If a file you changed also has another chat's uncommitted edit, ship it anyway and name that in the message.
  4. Direct push, pull, stash and reset are blocked there (`scripts/git_guard.py`); `ship.sh` is the way.
- **In a worktree (`.claude/worktrees/*` or `../Glass-Box-*`):** commit on your branch. If your brief says a coordinator merges, send them the sha.
- **Not finished, or Nathan said not to commit?** Say that plainly in your last reply.

A Stop hook (`scripts/commit_check.py`) checks for files you edited that are still uncommitted, and stops you once to commit them.

## Fish art starts from reference photos (Nathan, 2026-11-18)
Every new species and every look change is drawn from real photos (two or more per look, one per sex), not from memory. Write the look down, render it beside the photo, record the photo URLs. Full method: `research/species-art-method.md`. A look with no reference noted is unreviewed.

**Fish 3D models from a 3-view reference sheet** (the orchid dottyback method, Nathan 2026-11-19): read `research/fish-model-sheet-method.md` first, run its section 4 checklist before showing Nathan, and record every correction he makes there in the same commit.

## Fish models: "the model" means build B (Nathan, 2026-11-25)
When Nathan reports a problem with a fish model, assume he means its **build-B** model (he also calls it "version B" or "the new model") unless he says otherwise. Don't assume the older procedural model.
- **Which fish have one:** `src/data/fishLive.json` lists the approved fish (species id -> build-B look id, usually `<id>b`, a few `<id>c`). It is loaded for every visitor. `?photoart` shows every built build-B fish, approved or not. The review page takes `?q=id1,id2`.
- **How a fish is drawn:** `src/art/photofish.ts` reads `src/data/fishart/<look>.anatomy.json` (`render.photo` block) and the images in `public/art/fish/`. `species.ts` `goLive` swaps the species' art. Albino and female forms keep their old art.
- **How a fish is built:** **start at `research/fish-sheets/PIPELINE.md` (one runbook, species pick to live, every step with its gate); the links below are history and method.** a 5-row ChatGPT sheet becomes a model through `scripts/fish-new.py` / `fish-build.py` / `fish-batch.py`. Fix a model through its spec (`research/fish-specs/<look>.json`) and a rebuild, never by hand-editing the generated files. Pipeline, known fixes and "never again" incidents: `research/fish-sheets/HANDOFF-batch-b6.md`; the latest batch: `HANDOFF-batch-b7.md`; history: `research/fish-model-history.md`. The request is R146 in `research/requests.md`.
- A fish that isn't in `fishLive.json` still draws with its old model on the live site. Ask before assuming which model he is looking at.

## Other house rules
- **Nathan's asks outside your task are forwarded at once (2026-11-15).** If Nathan asks you for anything that is not your own lane's task (a bug he noticed, a feature, a fix in another area), send it to the coordinator chat right away with his exact words and any picture path, before doing anything else, and tell him you did. Never hold it or answer "noted". The coordinator logs every ask in `research/requests.md`; an ask that never reaches it gets lost (R81 sat in a lane chat for four hours).
- End replies with "Build N", the commit count on origin/main.
- Use US units.
- Project state lives in `HANDOFF.md` ("Start here"). Grep it by section; never read it whole.
