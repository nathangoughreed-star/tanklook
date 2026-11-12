# Lane CV1: a test that catches undefined CSS custom properties (Coordinator 23, 2026-11-12)

Follow `prompts/lane-common-c20.md`. Your chat is titled "CV1: CSS Var Check". A small lane.

## Why
In HM2, `#app.collapsed #sideTab { top: calc(10px + var(--bb-h)) }` had no effect. `--bb-h` is defined only on `#view`, and `#sideTab` is outside `#view`, so the declaration is invalid at computed-value time and the browser drops it. The panel's expand arrow stayed mid-edge for hours, and no test noticed. Fixed in 1861 (`top: 10px`).

## Task
1. Add a vitest test (e.g. `test/cssvars.test.ts`) that parses `src/style.css` (and any other CSS the app ships, plus inline `style=` / `el.style.x = 'var(...)'` strings in `src/**/*.ts` if feasible). It fails when a `var(--x)` without a fallback refers to a property that is:
   - (a) never defined anywhere, or
   - (b) defined only on selectors that can't be an ancestor of (or the same element as) the element using it.
   Do (b) with the real DOM: load `index.html` in jsdom (or happy-dom, whichever the project already uses), and for each rule that uses `var(--x)`, check that every element it matches has an ancestor-or-self with `--x` set by some rule or inline style. Elements the app creates at runtime and the static DOM can't see: check them by an explicit allowlist with a comment, or a small fixture that mounts them.
2. Run it on main. Fix every real hit with the smallest change (a fallback `var(--x, 0px)` or moving the definition), each named in your report. If a hit is a false positive, allowlist it with the reason.
3. Make the failure message point at the file and line, and say why the rule is dropped.

## Done
1. Run `npm run build` and the full vitest, re-running any failing files alone.
2. Add your HANDOFF section "CV1: ...".
3. Commit on your branch and rebase on origin/main.
4. Report ONCE to the coordinator with the sha and every hit found / fixed. Never end a turn with anything running in the background.
