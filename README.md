# TankLook

Vivarium visualizer: plan an aquarium, paludarium or terrarium with true-to-scale animals, seen in real perspective through the glass.

Fish are flat illustrated cards in a 3D tank (Three.js). All scene data is in millimetres. The viewer's eye sits a
fixed physical distance from the front glass for every tank, and zoom only crops, so sizes compare fairly between
tanks.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (perspective rule, physics, scene validation, undo/redo)
npm run build      # typecheck + production build into dist/
npm run build:single  # one self-contained file: dist-single/tanklook.html (opens from disk, emailable)
```

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`. The workflow runs the tests first.

## Layout

| Path | What |
|---|---|
| `src/scene/` | Scene types, physical rules (`physics.ts`), defaults, JSON validation + migration, store with undo/redo and autosave |
| `src/render/` | Tank, glass, substrate, cards (`build.ts`), lighting shader, camera rule, viewer (viewports, picking, PNG export) |
| `src/interact/` | Pointer: pick, drag on a view-dependent plane, orbit, wheel |
| `src/ui/` | Sidebar panels |
| `src/data/species.json` | Species list (card width = adult total length) |
| `src/art/placeholder.ts` | Procedural placeholder art |
| `reference/aquarium-poc.html` | Phase 1 single-file prototype (reference only) |

Saved scenes are JSON with a `version` field; older versions are migrated on load (`src/scene/validate.ts`).
