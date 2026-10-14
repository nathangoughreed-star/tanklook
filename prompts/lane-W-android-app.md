PARKED (2026-10-14, Nathan: "remember it for a later date"). Not opened: no worktree, branch or port yet. When it is
opened, the coordinator makes the worktree (`../Glass-Box-android` / `android`), a launch config `android` on the next
free port, and replaces this line.

Read HANDOFF.md first: the "Lane W: Android app (PARKED)" section, the "Parallel lanes (2026-10-13)" current-lanes table
(the W row) and the "Coordinator protocol" paragraph, then "Lane Q: AR view, WebXR" (AR must keep working). Memory:
shared-folder-commits.md, push-live-is-fine.md, glass-box-personal-project.md (personal accounts, not Molimo).

You are lane W: put TankLook on the Google Play Store as an Android app, and make the phone layout work sideways.

Decided (2026-10-14, see HANDOFF): a Trusted Web Activity (TWA) wrapping the live site https://tanklook.com/, NOT
Capacitor. A TWA is real Chrome, so WebXR AR (render/ar.ts, Android Chrome / ARCore) keeps working and pushes to main
update the app with no store release. Capacitor's Android WebView has no WebXR: AR would need a native ARCore plugin.
Revisit only if offline use beats AR.

Do, in order (each step is shippable on its own; show Nathan pictures before 1 is pushed):
1. Landscape phone layout. Today the layout only switches on width (style.css `@media (max-width: 760px)`: view on
   top, panel below, 50 / 50). Turned sideways, phones wider than 760 px get the desktop layout (350 px panel on the
   left, ~40 % of the width) and phones 760 px or narrower stay stacked with ~180 px per half (unusable). Add a
   short-landscape rule (e.g. `(orientation: landscape) and (max-height: 500px)`) that always puts the panel on the
   left at ~260-280 px, view filling the rest; status toast, sticky Add row, split tab vs Redo (lane P items 1-2) and
   the view map must still sit right. panels.ts reads `narrow` once at load for the view map default: make it follow
   rotation or leave it, say which. Before / after pictures at 844x390 and 740x360, plus portrait unchanged.
2. Installable PWA. index.html has no manifest and there is no service worker. Add `public/manifest.webmanifest`
   (name TankLook, `display: standalone`, `orientation: any` so the app follows the phone's rotation lock,
   theme / background colours from style.css tokens, icons 192 / 512 + maskable), the link tags, and a minimal service
   worker (cache the app shell; network-first for the aqadvisor worker so stocking advice is never stale). Vite base
   is `./`: keep paths relative. Check Chrome's install prompt on a phone and Lighthouse's installability.
3. TWA shell. Bubblewrap CLI (or PWABuilder) from the manifest; package id e.g. `com.tanklook.app`; keep the signing
   key and its passwords out of the repo (Nathan stores them). Serve `/.well-known/assetlinks.json` on tanklook.com
   with the key's SHA-256 so the app runs without the browser bar. Build an .aab; test on Nathan's S24+, including AR.
4. Play Store (Nathan does the account and every submission; you prepare the material): personal developer account
   ($25, identity check); NEW personal accounts must run a closed test with 12+ testers for 14 days in a row before
   production, so start that early. Prepare: privacy policy page on tanklook.com (what localStorage holds, what the
   aqadvisor proxy receives), Data safety answers, content rating answers, store listing text, phone screenshots and a
   1024x500 feature graphic, target API level per Play's current rule.
5. Low-end phone check before production: frame time and memory on a budget Android (or Chrome's CPU throttling as a
   stand-in), with the heaviest example tank. Report numbers; propose cuts only if it stutters.

Files: you own the landscape @media rule in src/style.css, the view-map `narrow` line in src/ui/panels.ts, new
public/manifest.webmanifest, icons and service worker, the manifest / SW tags in index.html, and a new `android/`
folder for the TWA project (gitignore its build output and any keystore). Ask the coordinator before touching anything
else.
