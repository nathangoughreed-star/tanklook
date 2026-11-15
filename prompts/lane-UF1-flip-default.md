# Lane UF1: the new UI becomes the default (R65, UI2 step 12 part 1)

Nathan 2026-11-15: "yea lets go ahead and do this." (Switch the main site to the new UI.) Screen map §7 step 12: "Flip default to the new shell; `?ui=1` keeps the old for 2 weeks; then delete index.html markup, panels.ts, old style.css, dropped dormant code". This lane is the FLIP ONLY. The deletion comes in 2 weeks (around 2026-11-29), in a separate lane.

## Do
1. `src/main.ts`: boot the new shell unless `?ui=1`. `?ui=2` keeps working as a synonym, so old links and Nathan's bookmark still open it.
2. **A way back for 2 weeks:**
   - In the new UI's Settings (and the ⋯ menu), add a small "Use the old interface" link. It goes to the same URL with `?ui=1`, keeping the open file / hash.
   - In the old UI, add a matching "Use the new interface" link where the old UI already showed the new-UI door, if there is one.
   - Neither link is sticky across visits unless that's trivial; the default is the new UI.
3. **Saved work:** both UIs read the same local save, so check that a scene saved in either opens in the other, and that the first visit with no save gets the new UI's fresh tank (NT1's `freshScene`).
4. **Everything that assumed the old UI by default:**
   - shot scripts (`scratchpad`-style puppeteer / playwright scripts under `scripts/`, `research/visual/*`), e2e or headless checks, `review.html` links, the service worker's cached entry, and `README` / HANDOFF "how to open" lines.
   - Old-UI shot scripts get `?ui=1`; new-UI ones can drop `?ui=2`.
   - Grep for `ui=2` and for scripts that open `localhost` / `tanklook.com` without a ui param.
5. HANDOFF: in the UI2 section, note the flip date and the planned delete date.

## Checks
- `npm run build`; the shell boot tests plus any test that reads `main.ts` boot logic; add a test that no param and `?ui=2` boot the shell and `?ui=1` boots the old UI (the boot decision as a pure function).
- Shots: the plain URL in a fresh profile (new UI, fresh tank), `?ui=1` (old UI), and the "Use the old interface" link, at 1280 and 390. Save them in `research/screens/UF1/` and look at them yourself.
- Commit on your branch and send the coordinator (C24) the sha. Do not push to main.
