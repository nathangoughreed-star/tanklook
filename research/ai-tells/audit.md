# AI tells audit (R167)

Written 2026-11-26 from origin/main `ee583d2e` and live captures the same day. Observations first; where I call something an AI habit I give the reason and a confidence (High / Medium / Low). "AI habit" means: a choice a code-writing model reaches for by default, not proof the site was AI-built. Picture paths are relative to `research/ai-tells/`.

## 0. What was captured

13 competitor products plus TankLook live, desktop 1440x900, top of page plus one scroll, headless Chrome over DevTools, fresh temp profile (deleted afterward). No sign-ups, no logins, no forms submitted, nothing downloaded. Style numbers come from a script run on each page (computed styles, top colors by painted area, class-name sniffing); raw values are summarized below, not pasted.

| Product | Pages | Notes |
|---|---|---|
| TankMates | landing, /planner/ | planner works without an account |
| Skapelab | landing | "Preview a sample plan" is a button that did nothing in headless in 9 s; planner not reached |
| AquaCompat | landing, stocking calculator | text/serif reference site |
| Impossible Aquariums | landing, /aquarium-planner | cookie bar left alone (its "Turn it off" did not match my decline rule) |
| Scapesome | landing, login page | planner is behind a sign-in wall (`shots/scapesome/tool-top.png` is the login page) |
| App-aquatic | planner page | the page is the tool |
| Scape It | landing only | editor not attempted |
| Tankfolio | landing, tank builder | builder opens without an account |
| OneShoal Scape Studio | landing, sign-up page | studio is behind sign-up (`shots/oneshoal/tool-top.png` is the sign-up page); cookie "Reject all" was clicked |
| Aquascaper Studio | landing, builder (aquarium.aquascaperstudio.com) | |
| Thorley Park Aquascape Studio | tool page | the page is the tool |
| Shrimpspin | landing (German) | German cookie banner left alone ("Nur notwendige" did not match my rule) |
| AqAdvisor (control) | landing = tool | first stats run threw an error in my script; re-run with basic stats succeeded |
| TankLook live | start sheet, editor, Habitat drawer, Animals picker, Plants | tanklook.com opens straight into the editor with a "Start a tank" sheet; there is no marketing landing page |

None was blocked. Not captured: any signed-in screen (OneShoal, Scapesome), Scape It's editor, Skapelab's planner, phone widths (TankLook phone shots already exist in `research/fable/2-first-visit/17..20`), and behaviors that need time (spinners, toasts), which a still capture cannot show. Contact sheets: `contact-sheet-1-header.png`, `contact-sheet-2-panel.png`. Overview of every landing: `shots/<product>/landing-top.png`.

## 1. Tells table

Key: TL = TankLook. "Where" in the TL column is the source that produces it.

### 1a. Color

| Tell | Competitors that show it | TL | Sure it is an AI habit? |
|---|---|---|---|
| Near-black navy/slate surfaces with one saturated accent | TankMates (bg rgb 2,9,14; teal 43,195,195; `shots/tankmates/landing-top.png`), Tankfolio (14,20,22; teal), Aquascaper Studio (2,11,20; teal), Thorley Park (17,32,46; teal 63,182,201), OneShoal (oklch navy 0.19/0.028/258; blue accent oklch 0.68/0.14/250; `shots/oneshoal/landing-top.png`), Impossible Aquariums (mint 100,255,218 on 2,12,27), Shrimpspin (10,12,16; orange 232,114,42), Scapesome (13,21,18 deep green) | Yes. Surfaces `#14181f / #1b2029 / #242a35`, accent `#4f8cff`: `src/shell/tokens.css` lines 5 and 16. Picture `shots/tanklook-live/2-editor-tank.png` | Medium-High. 9 of 13 competitors are dark, and in this niche 'dark = aquarium at night' is also a reason. The *dark base plus a single bright accent plus status colors* recipe is the standard model output for a "pro tool". |
| Exact Tailwind teal-400 `rgb(45,212,191)` as the accent | Tankfolio and Aquascaper Studio both measured exactly this (`shots/tankfolio/landing-top.png`, `shots/aquascaper-studio/landing-top.png`) | No. TL blue `#4f8cff` is not a Tailwind step (blue-500 is `#3b82f6`) | High for those two; they likely share a default palette. TL escapes this one. |
| Purple or blue-to-purple gradients | None seen | No | Not observed in this set. |
| Gradient glows / gradient text on dark | TankMates 95 gradient elements, 7 gradient-text (orange on "freshwater fishkeeping", `shots/tankmates/landing-top.png`); Tankfolio 92; Aquascaper 99; Shrimpspin 59 | 0 gradient elements in all five captured states. Only inside art thumbnails and the legacy `.sg` page (`src/style.css` 738, 748) | Medium-High for glow and gradient text. TL is clean here. |
| Green / amber / red status trio | TankMates "Compatible / Not recommended" green and red chips (`shots/tankmates/tool2-top.png`), Tankfolio welfare alerts, Thorley care score | Yes. `--ok #3fb68b`, `--warn #e3a33a`, `--bad #e5565b`, `tokens.css` 18-20. Picture `shots/tanklook-live/3-habitat-drawer.png` | Low. This is plain convention for a compatibility verdict. |

### 1b. Type

| Tell | Competitors | TL | Sure? |
|---|---|---|---|
| Inter as the body face | TankMates, Tankfolio, Aquascaper Studio, OneShoal, Thorley Park, Shrimpspin (6 of 13) | No. Body is a system stack: `"Segoe UI", system-ui, -apple-system, Roboto, sans-serif`, `tokens.css` 26 | High that Inter is a default. TL's stack is the *same list of fallbacks* (Segoe UI / system-ui / -apple-system / Roboto) that appears at the tail of TankMates, Skapelab and OneShoal stacks, so on a Mac or phone TL renders as generic system UI. Medium. |
| One family for headings and body, 5 sizes | Most; TL declares it outright ("one family, five sizes", `tokens.css` 25) | Yes, h2 is 15px/700 in the same family | Low-Medium. Good practice, but it is also what removes personality. |
| Serif display plus sans body ("editorial") | Scapesome (Newsreader), OneShoal (Fraunces), App-aquatic (Playfair Display), Thorley Park (Cormorant Garamond), AquaCompat (Source Serif 4) | No | Medium. Fraunces/Newsreader/Playfair/Cormorant are the usual picks when a model is told "make it feel premium and organic". |
| Trendy grotesque display face | TankMates Sora 76px/800, Tankfolio Space Grotesk 60px/700, Skapelab Bricolage 70px/640, Impossible Archivo 121px/250 | No | Medium. |
| Huge hero heading with a highlighted word | TankMates ("freshwater" orange), Skapelab ("alive." green), Impossible ("ecology," mint), Shrimpspin ("In echtem 3D." orange) | No hero | High as a layout habit. Not applicable to TL today. |
| Small uppercase letter-spaced eyebrow labels | TankMates "TANK PLANNER", Skapelab "FRESHWATER AQUASCAPE PLANNER", OneShoal "SCAPE STUDIO · BETA", Tankfolio "TANKFOLIO BETA", AquaCompat "FRESHWATER COMPATIBILITY REFERENCE", Impossible "INDEPENDENT AQUARIUM RESEARCH", Scapesome "BEFORE YOU GLUE A SINGLE STONE", Thorley "FREE DESIGN TOOL" (all in the landing-top shots) | Yes, inside the app: "YOUR ANIMALS", "ADD ANIMALS", "WHERE FROM", "VERDICT" (`shots/tanklook-live/4-animals-picker.png`, `3-habitat-drawer.png`); `--fs-xs` "caps labels" `tokens.css` 21 | High. 8 of 13 landings open with one. |

### 1c. Shape

| Tell | Competitors | TL | Sure? |
|---|---|---|---|
| Large uniform card radius (16-32 px) | TankMates cards 18/22/24; Tankfolio 12-16; OneShoal 22/26; Aquascaper Studio 28.8/32; Impossible 16-20; Scapesome 14-26 | No: controls 6px, cards 10px (`tokens.css` 41) | Medium-High. TL is below the typical range. |
| Pill buttons and chips | TankMates 999px buttons, 301 pill elements on the planner; App-aquatic 126; OneShoal full-round buttons | Chips and status badges are pills: `.pill` and `.chip` `tokens.css` 85-90 (26 on the Animals picker, 48 on Plants) | Medium. Filter chips are common UI; status-as-pill-badge is the AI-typical part. |
| Cards with soft shadows | TankMates 64 shadowed elements, Tankfolio 74 | Almost none: 1-2 per screen, one `--shadow` for dialogs (`tokens.css` 42) | Medium. TL is flat. |
| Glass / translucent panels with blur | TankMates (`rgba(8,26,34,.72)` panels), Tankfolio (`rgba(14,20,22,.92)`), Shrimpspin (`rgba(30,32,36,.55)`) | Some: `--glass rgba(20,24,31,.86)` overlays (`tokens.css` 21); the Get started card uses it (`shell.css` 266) | Medium. |

### 1d. Icons and emoji

| Tell | Competitors | TL | Sure? |
|---|---|---|---|
| Lucide / Tabler / Font Awesome line icons | OneShoal Lucide (61 refs), Shrimpspin Lucide (28), Skapelab Tabler (61), Scape It Font Awesome (303) | No library: a hand-written inline-SVG set, `src/shell/icons.ts` (stroke, 24px grid) | Medium. TL imitates the Lucide/Feather look (thin stroke, rounded joins) even though the paths are its own, so a viewer cannot tell the difference. |
| Sparkle / starburst icon on an "ideas" or AI-flavored feature | TankMates "Fish identifier / Assets" icons and "ASK FINN" button (`shots/tankmates/tool2-top.png`) | Yes: the `ideas` icon (`icons.ts` 11) is an 8-ray starburst used for the Discover rail item and the "Ideas for Tank" button (`shots/tanklook-live/1-start-sheet.png`) | Medium-High. The feature is deterministic, but the icon reads as the "magic/AI" button. |
| Emoji as toolbar / section markers | Thorley Park 🌿 Freshwater, 🪸 Saltwater, 🎲 Randomize, ⬇ PNG, 🏰 🚢 (`shots/thorley-park/landing-top.png`); Scape It "Pro 🚀" | A few glyphs: ⚠ in warnings (5 places in `src/shell`, 2 in `index.html`), 🖌 on the legacy brush toggle (`index.html` 217, 286; legacy markup, hidden by the new shell) | High for 🚀 and 🎲. ⚠ is a plain symbol; Low. |
| Arrow glyphs in buttons ("→", "↗") | Shrimpspin "Planer starten →", Impossible "THE SLESS METHOD →", "Instagram↗" | "↶ Undo" in legacy `index.html` line 29 only | Medium. |

### 1e. Layout

| Tell | Competitors | TL | Sure? |
|---|---|---|---|
| Hero plus a row of three feature cards | OneShoal "Try it. Turn it. Make it yours." with three cards (`shots/oneshoal/landing-top.png`); Scapesome four steps with icons; App-aquatic "How the aquascape planner works"; Skapelab step strip | No landing page. The nearest thing is the Start sheet: four cards in a 3+1 grid (`src/shell/start.tsx` 24-33; `shots/tanklook-live/1-start-sheet.png`) | High for hero + cards. TL's Start sheet is a card grid but functional. |
| Sidebar of icon-over-label buttons | Aquascaper Studio (icon left of label, `shots/aquascaper-studio/tool-top.png`), Shrimpspin (icon + label list), OneShoal "My Shoal" nav | Yes: 64px rail, icon stacked over a 10.5px label, active item gets a left accent bar and a tinted fill (`tokens.css` 124-129; `shell.css` 36-40; `src/shell/App.tsx` 106) | Medium. The left bar + tinted active state is the shadcn-sidebar look. |
| Header strip of status chips | TankMates planner header (XP pill, icon buttons), Aquascaper Studio centered pill group "Tank 90 x 45 x 45 cm / Grid 1 cm / Morning" | Yes: "Habitat / No animals", "$77 · $0/mo · 25 min/wk", "75 °F / no data", "Notes 0" (`shots/tanklook-live/2-editor-tank.png`) | Low-Medium. Useful content; the chip styling is the habit. |
| Centered narrow column | Scape It, Skapelab form column | "How we calculate" is a single narrow column (`public/how-we-calculate.html` 27) | Low. |
| Two-pane planner: 3D left, library right | TankMates, App-aquatic, Thorley | Yes | Low. Forced by the task. |

### 1f. Copy (competitors)

| Tell | Examples (from the pages) | TL | Sure? |
|---|---|---|---|
| Rhythmic triplet of short imperatives | Scapesome "Scape it. See it real. Know it'll work."; OneShoal "Try it. Turn it. Make it yours."; TankMates "Plan a tank / Identify a fish / Check tank mates" | None as slogan. Triplet *lists* appear in help text (see section 2) | High. Two competitors use the same cadence. |
| "X, not Y" contrast headline | Impossible "run on ecology, not chemicals" | None | Medium. |
| Hype words | Scape It "Tailored", "Welcome to Scape It", "Discover Now", "It's That Easy"; TankMates "Unlock your rewards"; AquaCompat "robust" | 0 of my 11-word list in `src/shell` and `how-we-calculate.html` | Medium. Counts on the captured pages were low; most competitors read plainly. |
| Em dashes in marketing copy | Shrimpspin 12, Tankfolio 6, Thorley 5, Scape It 1, Skapelab 1; all other pages 0 | 0 in `src/shell` and `how-we-calculate.html` (colons used instead) | High as a model habit; TL is clean. |
| Title Case headings | Scape It "Your Aquascaping Design Tool", AquaCompat "Which Freshwater Fish Can Share a Tank, and Why" | No: sentence case ("Start a tank", "Habitat check") | Medium. |
| Generic CTA labels | "Start designing" (Skapelab), "Start planning" (Scapesome), "Open Builder" (Aquascaper), "Discover Now" (Scape It), "Sign up / Sign in" everywhere | "Get started" checklist card and menu item (`src/shell/checklist.tsx` 21-24), "Done" (editor), "Just look around" (`start.tsx` 33) | Medium. "Get started" is the textbook model label; "Just look around" is not. |

### 1g. Behavior and naming

| Tell | Competitors | TL | Sure? |
|---|---|---|---|
| Mascot / chatbot helper | TankMates "ASK FINN" fish button plus "Fry, 40 XP" level badge (`shots/tankmates/tool2-top.png`) | None | Medium. Gamified XP and a mascot are the "AI product" kit. |
| Generic ring spinner and dimmed overlay | Not observable in stills | Yes: `.busy` + `.spin` (blue top border, `src/style.css` 422-426) | Low. Not captured on competitors. |
| Toast and modal | Not captured on competitors | Toast: raised card, 1px line, 10px radius (`tokens.css` 154); dialog: `.dlg` panel with 1px border and shadow (`shell.css` 160) | Low. Both are ordinary. |
| Product and feature naming | "Scapesome", "Skapelab", "Scape It", "Tankfolio", "OneShoal", "My Shoal", "Aquascaper Studio" | "TankLook", "Discover", "Surprise me", "Ideas for Tank", "Habitat check", "Get started" | Medium for "Discover" and "Surprise me" (assistant-style verbs for a feature that is rule-based). "Habitat check" and "Constraints" are plain nouns. |

Sizes of the overlap: of the tell families above TL clearly shows, the widest across competitors are, in order: (1) dark slate base with one saturated accent, (2) the system/Inter sans stack and caps eyebrow labels, (3) pill chips and status badges, (4) a 64px left rail of stroked icons with a tinted active item, (5) sparkle-style "ideas" icon and generic "Get started"/"Discover" labels.

## 2. TankLook's own copy

Scan covered `src/shell/*.tsx`, `src/shell/logic/*.ts`, `public/how-we-calculate.html`, `index.html` for: hype words, "not just X but Y", em dashes, emoji, generic CTA labels, triplet lists, loading ellipses. Results: hype words 0, "not just/more than just" 0, em dashes 0, emoji/symbol glyphs 9, plus the feature-name and list hits below. About 93 hits in all; 45 listed (cap 60 not hit by choice, the rest are repeats), 48 more are repeats of the same phrases (14 "Discover", 26 triplet lists, 3 ellipsis labels, 5 "Ideas for").

| # | Hit | File:line |
|---|---|---|
| 1 | "Get started" card title | `src/shell/checklist.tsx:21` |
| 2 | `<b>Get started</b> · n of 5` | `src/shell/checklist.tsx:23` |
| 3 | "Hide Get started" | `src/shell/checklist.tsx:24` |
| 4 | "Get started checklist" menu item | `src/shell/files.tsx:186` |
| 5 | "Surprise me. Skip the choosing: Discover shows a wide mix" | `src/shell/prefs.tsx:28` |
| 6 | "Open Discover with a broad mix of looks" | `src/shell/prefs.tsx:27` |
| 7 | "The looks you like ... These steer Discover and Suggest" | `src/shell/prefs.tsx:24` |
| 8 | "Mark the ones that catch your eye; Discover leans toward them." | `src/shell/prefs.tsx:39` |
| 9 | Discover section title and aria-label | `src/shell/App.tsx:174-175` |
| 10 | "Apply, and lock what was added so Discover never changes it" | `src/shell/discover.tsx:144` |
| 11 | "The tank stays as it is." (Discover scope hint) | `src/shell/discover.tsx:133` |
| 12 | "Looking for designs that fit..." (loading text) | `src/shell/discover.tsx:134` |
| 13 | "Looking for two designs..." | `src/shell/discover.tsx:190` |
| 14 | "Ideas for ..." header button (feature name) | `src/shell/discover.tsx:202` |
| 15 | "Ideas for Hardscape" extra button | `src/shell/workspace.tsx:19` |
| 16 | "Kept: Discover will not change it." | `src/shell/scape.tsx:111` |
| 17 | "Used for sure: Discover and Suggest keep this" | `src/shell/equipment.tsx:64` |
| 18 | "Use this one for sure: Discover and Suggest..." | `src/shell/tank.tsx:118` |
| 19 | "Animals, plants and gear rated harder than ..." (triplet) | `src/shell/constraints.tsx:98` |
| 20 | "Working it out..." | `src/shell/glassSolve.tsx:55` |
| 21 | "Looking for a brace..." | `src/shell/glassSolve.tsx:88` |
| 22 | "Working it out..." | `src/shell/glassSolve.tsx:152` |
| 23 | "Working out the glass..." | `src/shell/maker.tsx:309` |
| 24 | "⚠ These sizes pass on glass strength, but a silicone joint..." | `src/shell/glassSolve.tsx:60` |
| 25 | "⚠ A silicone joint is over its design stress" | `src/shell/glassSolve.tsx:94` |
| 26 | ⚠ glyph in a cell | `src/shell/glassSolve.tsx:58` |
| 27 | ⚠ warning icon, "This replaces your current scape" | `index.html:67` |
| 28 | ⚠ warning icon, "Start a new project?" | `index.html:73` |
| 29 | 🖌 on the scatter brush toggle (legacy markup) | `index.html:217` |
| 30 | 🖌 same, second copy | `index.html:286` |
| 31 | "Undo everything since you opened this workspace, in one click" | `src/shell/workspace.tsx:33` |
| 32 | "...we simply..." (How we calculate) | `public/how-we-calculate.html:74` |
| 33 | "Ready-made tanks to look at or start from" | `index.html:105` |
| 34 | "Ready-made starter and example tanks" | `index.html:47` |
| 35 | "Open a saved tank or a ready-made starter tank" | `index.html:38` |
| 36 | "...group size, the mix of males and females, pairs" (triplet) | `public/how-we-calculate.html:38` |
| 37 | "cover, lid, and the gear the animals need" (triplet) | `public/how-we-calculate.html:39` |
| 38 | "who eats, nips or fights whom" (triplet) | `public/how-we-calculate.html:40` |
| 39 | "what is counted, how much it counts as, and how many more..." | `public/how-we-calculate.html:63` |
| 40 | "with sizes, levels and where they are from" (triplet) | `src/shell/animals.tsx:217` |
| 41 | "Your animals, plants and hardscape do not..." (triplet) | `src/shell/drawers.tsx:96` |
| 42 | "the rules, the numbers and how sure we are of them" | `src/shell/drawers.tsx:216` |
| 43 | "Choose a file..." (menu ellipsis, convention) | `src/shell/files.tsx:228` |
| 44 | "Make a custom tank from this..." (menu ellipsis) | `src/shell/tank.tsx:117` |
| 45 | "Add picture..." (menu ellipsis) | `src/shell/tank.tsx:356` |

Reading: the copy is the cleanest part of TankLook. No hype words, no em dashes, sentence case throughout, and the triplets are working lists of real inputs, not slogans. The real tells are feature names ("Discover", "Surprise me", "Ideas for Tank", "Get started") and the "Looking for designs that fit..." progress phrasing, which sound like an assistant at work even though the feature is a rule-based search.

## 3. Contact sheets

- `contact-sheet-1-header.png`: TankLook editor header and panel top, over OneShoal, Tankfolio, TankMates. Shared: dark base, single accent, caps labels, pill chips, top bar with a status cluster.
- `contact-sheet-2-panel.png`: TankLook Animals picker over Aquascaper Studio's builder and Thorley Park. Shared: left rail of icon + label with a tinted active item, a caps-label library panel with filter chips, a 3D view with a lit tank.

Visible differences: TL's panel is denser, flat, with 1px lines and no card shadows; TankMates and Tankfolio use gradient glows and 18-24px rounded cards.

## 4. What already looks hand-made (keep)

TankLook:
1. Numbers in the header: "$77 · $0/mo · 25 min/wk", "75 °F no data". Specific, with units, no marketing gloss (`shots/tanklook-live/2-editor-tank.png`).
2. Flat surfaces: 0 gradients in all five captured UI states, 1-2 shadows per screen, 6/10px radii. Competitors measured 59-99 gradient elements and 18-32px radii.
3. Copy with caveats and reasons: "No animals in the water yet: the check fills in as you add them." (`src/shell/drawers.tsx:40`); "Read-only for now: each setting is changed in its own section." (Habitat drawer). Competitor copy reads as benefit statements.
4. `public/how-we-calculate.html`: a page of rules, sources and "How sure we are of each rule", and "What it does not do". None of the captured competitors has an equivalent on a landing (AquaCompat has an explainer, closest). It also states "no AI model runs when you use TankLook; sources were gathered with AI assistance".
5. Verdict vocabulary Compatible / Caution / Problem and "not checked" as a state of its own (`how-we-calculate.html` 43).
6. US units with a switch in the header (units control is part of the shell).
7. Odd, concrete domain objects: glass thickness and silicone-joint stress solver (`glassSolve.tsx`), "Sits on: The floor", "Lid and top", 812 tank models, bundles and sales. Nobody generates those by default.
8. Hand-written icon paths (`icons.ts`): the icons are the owner's, even if the style is Lucide-like.
9. Two-line section titles that state what the pane is for: "Model, water, stand, lid, background" under "Tank".

AqAdvisor (control, `shots/aqadvisor/landing-top.png`):
1. Comic Sans headings on a gray-teal ground (`rgb(85,136,136)`), Arial body, default blue underlined links, a table-and-listbox layout. No hero, no icon library, no radii, 0 gradients, 0 shadows.
2. Link text in square brackets: "[Add a filter] [Remove a filter] | [Display in cm]", a UI idiom nobody generates now.
3. Product-specific names in the tank list: "3g Eclipse System 3", "6g Fluval EDGE", "24g D-D Nano Cube 24", "34g Red Sea Max 130". Real market knowledge as data.
4. One screen, everything visible, no onboarding. The page title says exactly what it is: "Intelligent Freshwater Aquarium Stocking Calculator ..."
5. Uneven density and local vocabulary ("Stocking", "Filter 1 / Filter 2", "Fish Food"). What marks it as made by a person is irregularity, not polish.

Lesson for a redesign: hand-made here comes from specifics, unevenness and plain words, not from decoration. Removing a gradient is not the same as adding character.

## 5. Open questions for Nathan

1. You said TankLook shares "similarities that didn't have to be that way". I could not see which ones you meant. Which competitor screens, and which elements? That decides whether the list above is the right one.
2. The live site has no landing page: tanklook.com is the editor with a "Start a tank" sheet. Is that deliberate? It removes the hero-plus-three-cards tell, but a first-time visitor sees nothing explaining the product (`research/fable/2-first-visit/01-cold-load-start-sheet.png`).
3. The Discover / "Ideas for X" starburst icon and the "Surprise me" name read as AI-assistant features, while the feature is deterministic. Rename and redraw, or keep because the function is valuable?
4. Typeface: TL uses the system stack, so each visitor sees a different face (Segoe UI on Windows, SF on Mac, Roboto on Android). Do you want one chosen, bundled face with some character? A bundled font adds download weight; the perf work (EF3) is in tension.
5. Accent: `#4f8cff` blue is clear of Tailwind defaults, but "dark slate + blue" is the most common shape of all. Is a warmer or more specific palette on the table, say from the fish art (water greens, wood browns)?
6. The how-we-calculate page discloses AI assistance in sources. For an "artisan" positioning, do you want that statement kept as is (honest, differentiating) or reframed?
7. "Hand-made" signals I found most credible are specifics (named products, units, caveats). Do you want to push those (more owner-voiced notes, real tank names, your own photos) over visual changes?
8. I did not capture phone widths of competitors or any signed-in screens (OneShoal, Scapesome). Your own dogfood pass (`research/competitors/dogfood-sheet.md`) will see more; please note any competitor behavior (loading states, toasts, empty states) that struck you as machine-made, since stills cannot show those.

## Appendix: method notes

- Colors are top painted areas on the first viewport; transparent overlays (e.g. `rgba(0,0,0,.55)` behind TL's Start sheet) show up in the top list.
- Icon library detection is by class-name and attribute sniffing, so inline-SVG libraries with no class names (shadcn/Lucide copied as SVG) can be missed. OneShoal shows `data-state` attributes and Radix ids (shadcn/Radix pattern); Tankfolio, Aquascaper Studio, OneShoal have 280-600 Tailwind-style utility class hits (Next.js on TankMates, Tankfolio, Scapesome, Aquascaper).
- Em dash counts are of visible text on the captured page, not the whole site.
- Capture scripts were kept outside the repo and the temp browser profile was deleted.
