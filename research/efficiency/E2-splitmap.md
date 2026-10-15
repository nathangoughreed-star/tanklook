<!-- Lane E2 appendix (2026-10-15, audited a93a81f). Written by a Sonnet subagent from a static read; the top rows were re-checked by E2 against the code, see E2-code-audit.md. -->
# Split map: src/ui/panels.ts (1664 lines) and src/render/build.ts (1212 lines), commit a93a81f

Method: grep/scripts over the files. Line numbers are from commit a93a81f. Variable-use lines come from regex scans (word match, so a few may be false hits on common names; only the first ~5 uses per section are listed).

====================================================================
## A. src/ui/panels.ts
====================================================================
KEY FACT: the file is effectively ONE function. attachPanels(store, viewer) spans lines 55-1643 (1589 lines); everything in it is closure state. Only 4 tiny top-level helpers sit outside it.

### A1. Top-level outline
- 1-41 imports (see A3). Line 28 is a stray `const ARROWS` between imports (used by the item nudge keys ~1037-1055).
- 43 `$` (getElementById helper), 45 `DEBUG`, 46 `esc` (module consts; used everywhere, safe to share)
- 49-50 `export type ScapeSec`, `export scapeSec(k)` (pure)
- 53 `export growthWord(g)` (pure formatter; no importer anywhere: dead export)
- 55-1643 `export function attachPanels(store, viewer)` returns `{ status, showStart, openShared }` (line 1642)
- 1646-1650 `padlock(locked)` (pure SVG string); 1652 `slug`; 1653-1658 `download(blob, filename)`; 1660-1664 `fmtHeight(mm, units)` (all pure)

### A2. attachPanels internal sections (start-end, size)
55-65     closure prelude: G(), S(), fmt(), sel(), editSel()                      (11)
66-73     Status line: statusTimer, status()                                      (8)
74-84     File: recenter, New, Undo/Redo buttons                                  (11)
85-137    Library dialog (Open...): dlg, busy spinner, whileOpening, open(), LIB_CUR/libId/setLibId, renderLib   (53)
138-161   Examples list: renderExamples, openExample                              (24)
162-193   Start menu: startDlg, showStart                                         (32)
194-265   Save (library/file), Download, Share link (copyText, openShared), saveTank (one split tank alone)   (72)
266-334   Tank: presets, setTank, shape (rect/bow/round/poly/bowl/pie) + shapeDims, units, lid, wallFit      (69)
335-410   Background: BG buttons + uploaded pictures (PIC_SIDES/FITS, editPic, syncPics, picKey)           (76)
411-449   Room: stand finish, table stand, editTable, person, wall, ceiling       (39)
450-620   Animals: species search, categories, 3D preview tile, addPct, blocked, setCount/addOne, stocking list, delArm, fresh/salt helpers (isSalt, fitsWater, misfits)   (171, biggest wiring chunk)
621-670   Selected fish: flip/del/dup/setSex + item-button delegation              (50)
671-707   Substrate: types, custom grain/colour/mix (cust), subSet                 (37)
708-729   Custom terrain                                                          (22)
730-778   Water: level/colour/presets, Freshwater/Saltwater switch (setSalt, removeMisfits)   (49)
779-837   Lighting: lKeys, fitK/countMax/capCount, fixture, Light map (mapKey, mapKeyFor, techFor)  (59)
838-845   Viewer (camera) sliders camKeys                                         (8)
846-905   Split / display / export / panel shell: mapCb/applyMap/setMap, hideCb, secs (details.sec), saveUI, showSide, keepRule, openSec, one-section-open rule   (60)
906-970   Scape generate: fishId0, replaced, okToReplace (warn dialog), preSwamp, density sliders (showDens), Shuffle, layout   (65)
971-999   Item library + addItem (Hardscape / Plants)                             (29)
1000-1034 Growth timeline: growGoal/growRaf/growStep/growTo, Time + Feeding       (35)
1035-1096 Item edit: editItem, nudge, itemDel, itemDup, clearBtn (Remove all), PNG export button   (62)
1097-1123 Type-in values: toU, len, num, side TypeIns, `lens` / `nums` id tables, attachTypeIns call   (27)
1124-1138 sync helpers: setVal, setOut, mapHeld, listSig, jsonOpen, lastSelId, lastItem, jsonText/syncJson   (15)
1139-1200 AqAdvisor: aqDone/aqBusy/aqErr/aqQueued/aqTick/aqUp/aqLast, pollAqHealth, syncAq, aqCheck; line 1200 also declares waterKind + syncKeys, which belong to sync   (62)
1201-1512 sync(full=true): scene -> controls, 312 lines, groups gated by env / fishSet / itemSet / cam / item flags:
    1204-1212 prelude: keys[] diff, undo/redo enable
    1213-1294 env group A: scene name, units, tank size/shape/footprint, room, stand, background, pictures (1264 syncPics)
    1295      syncAq()
    1296-1330 stocking list, species results, preview (pickId, previewSex, setCount, misfits)
    1331-1338 selection / lastSelId
    1339-1385 water, substrate, terrain, growth (growGoal read 1373-1374), weight
    1386-1453 lighting (techFor 1416, mapKey 1432, FIX_SPEC ranges 1392, light output 1407-1418)
    1455-1461 camera (cam flag)
    1462-1478 item list (itemSet flag)
    1480-1508 item box (item flag)
    (sub-ranges are approximate: taken from the if-block boundaries and comment headers)
1513-1606 After each draw: tabSig, aqChip, view-tab labels, per-view stocking label, delegated tab click handlers   (94)
1607-1624 readout()                                                               (18)
1625-1643 autosave: saveTimer, store.subscribe(kind => sync(kind==='load'), autosave debounce 400 ms) [THE LISTENER], pagehide flush, initial renderResults()+sync(), return {...}   (19)

### A3. Imports -> which section uses them
(39 import statements; "sync" = the 312-line sync function)
- Needed by almost every module: ../scene/types (types), ../scene/physics (clamp/waterY/fmtLen/toUnit/IN), ../scene/validate (LIMITS), `$`, `esc`
- art/paint rng: species, items-lib. art/placeholder: GRAIN_LOOK (substrate + sync), SUBSTRATES (substrate), drawFishCard (species). art/snails drawSnailCard (species)
- data/species: mostly species; also selfish, water, sync, readout
- render/build: BACKGROUNDS (tank), STAND_FINISHES (room) -- the only coupling to build.ts
- render/backdrop BACKDROPS (tank); render/lighting MAP_DIV (light), MAP_STEP/emitters/mapStepOf (sync); render/lightShells darkOf/darkStats (sync); render/preview3d SpeciesPreview (species); render/plant3d clumpAuto (sync); render/viewer type Viewer (prelude, camera)
- scene/lightout (FIXTURES, TECHS, ...): light + sync + tank (fitFixture)
- scene/defaults: emptyScene (newUndo, scapegen), TANK_PRESETS (tank)
- scene/items: ANIMAL_STOPS/DENS_STOPS/DEFAULT_DENS (scapegen), KINDS/LIBRARY/makeItem (itemslib, sync), LAYOUTS (shell, sync), clampItem/itemDims (itemsedit, tank, sync)
- scene/starter handEdits/regenerate (scapegen); art/plants growthOf/isClump/isPatch (sync, itemslib)
- ./diff tankDiff (labels); ./typein (typein section only)
- scene/terrain: SWAMP_LEVEL (scapegen), groundHeight (itemsedit), nearestLand (species), sameGrid (tank), sampleTerrain (terrain)
- scene/scatter placeNew/randomSize/shuffleFish (species; randomPose imported but unused); scene/water fitFish (selfish), keepInWater (tank), setWaterLevel (water, scapegen)
- scene/weight (sync only); data/aqadvisor (aq section; AQ_PROXY/aqAdvisorUrl/aqKey/aqQuery also in labels/aqChip)
- scene/shape (tank + sync), scene/table (room + sync + typein wallGap)
- scene/growtime FEED_NAMES/setGrowTime/timeChanges (growth), setPlantGrowth (itemslib)
- scene/library (library, examples, save), ../examples EXAMPLES (examples), scene/share (save/share), scene/images (bgpics: getImage/putImage/readPicture/sidesTouch; save: sceneImageIds/withImages)

### A4. Exports and importers
- `attachPanels`, `scapeSec`: imported only by src/main.ts line 5 (used 33-35). `ScapeSec` type and `growthWord`: no importers outside panels.ts.
- No test imports panels.ts.
- panels.ts imports BACKGROUNDS, STAND_FINISHES from build.ts (src/ui/diff.ts does too).

### A5. SHARED STATE that blocks a pure move (closure vars of attachPanels)
Universal prelude (every section uses it; must go in a ctx object or be re-created per module):
- G() 56, S() 57, fmt 58, sel 59, editSel 61; store, viewer (function params)
- `status(msg,bad)` @68 + statusTimer @67: used by library (104,107,111,120), examples/start (155,158,187,190), save/share (8 uses, 205-247), tank (307,311), bgpics (347-368), species (575-618), water (736,766,776), shell (847), scapegen (940,948,965), itemsedit (1080,1093), synchelp (1136), labels (1598,1605), returned at 1642
- `sync(full)` @1204: called from tank (307), species (577), terrain (711,718,724), water (733), synchelp (1124), autosave (1628,1641). It reads variables from nearly all sections (below)
- setVal @1125 / setOut @1126: used by scapegen (925,930), species (515,554) and 90+ times inside sync
Cross-section mutable state:
- busy @91 / busyArmed @92: library (93-98), aq (1163,1166,1168,1193), labels (1522,1526,1531). whileOpening @95: library 110, examples 151/183, save 246. `open()` (@94-98 definition): file 74, library 85/90/107/111, examples 158/190, save 243/247
- libId/setLibId @126-127 (localStorage current-tank id): newUndo 83, library 117/119, examples 154/177/186, save 197/204/248
- renderLib @129: library 87, examples 177; renderExamples @139: library 87, start 168; dlg @86: library, examples 146/182
- pickId @459: species + sync 1314; cat/cats/search/results (460-463): species only; preview @520, previewId @521, preview3d @521, previewSex @522, previewArt @520: species + sync 1314
- renderResults @474: species (6), water 737, sync 1314/1329/1386, autosave 1640
- setCount @573: species 597, sync 1315-1318; misfits @458: species, water 765/773, sync 1322/1378; isSalt/fitsWater @454-456: species, aq 1162, sync (7 uses)
- setSalt @755: species 498, water. removeMisfits @772: water, sync 1326. delArm @608: species only
- picKey @382 / syncPics @383 / editPic @358: bgpics + sync 1264. shapeDims @294: tank only
- mapKeyFor @808, mapKey @809: light + sync 1432; techFor @836: light + sync 1416; lKeys @780: light + sync 1395; fitK @785: tank 323 + light; countMax @786: light + sync 1391; camKeys @839: camera + sync 1457
- preSwamp @927, fishId0 @908, replaced @909, okToReplace @914, dropGoneFish @910, showDens @925: scapegen only
- growGoal/growRaf/growHeld/growLast/growN/growSeen @1004-1005, growStep/growTo: growth only, except sync reads growGoal (1373,1374)
- editItem @994: selfish 660/661, itemslib, growth (8 uses), itemsedit 1037; itemDel/itemDup @1056/1061: selfish 655/659; nudge @1037: selfish 662; addItem @979
- mapHeld @1127: sync 1353 + mapCb section; listSig/jsonOpen/lastSelId/lastItem/jsonDetails @1128-1130: sync (1305,1306,1332,1333,1482,1483,1510)
- aq* maps/sets @1142-1148, aqLast @1174: aq section + labels (1522,1526,1529,1530,1592); syncAq called from sync 1295
- waterKind @1200, syncKeys @1200: sync only (declared in the aq block)
- tabSig @1514: labels only; saveTimer @1626: autosave only
- Panel shell: secs @871, saveUI @872, showSide @877 (labels 1586-1587), sideHidden @884, keepRule @888, openSec @895 (water 771, itemslib 991, sync 1332/1482), setMap @861, applyMap @855 + mapCb @855 (sync 1353), narrow @858 (labels 1552/1563), hideCb @866
- Shadowed names to watch in a mechanical move: `open`, `del` (@624 plus locals at 173, 364, 393, 1602), `sp` (parameter in ~41 places), `side` @1102 (TypeIn helper, 13 uses in bgpics, 6 in room), `step` (@1037 plus many locals), `sec`, `at`.
Design implication: sections are NOT independent. The unavoidable shared surface is {store, viewer, G, S, fmt, sel, status, sync, setVal, setOut, busy/whileOpening/open, libId, renderResults, editSel, editItem/itemDel/itemDup/nudge, openSec, showSide, syncAq, renderLib/renderExamples}. A workable pattern: attachPanels builds a `ctx` ({store, viewer, G, S, fmt, sel, status, setVal, setOut, editSel, ...}) and calls mountFile(ctx), mountTank(ctx), ... each returning a sync slice (`syncTank(s, full)`) so the central sync() just calls the slices in order. The sync() body (1204-1509) is the hard part: it reads ~25 variables from all sections; split it along the existing env/fishSet/itemSet/cam/item groups plus the syncKeys diff (1204-1212).

### A6. Machinery vs wiring vs pure helpers
- sync()/store machinery: prelude 56-65; sync 1201-1512 with syncKeys/waterKind 1200, syncAq 1159, setVal/setOut 1125-1126, listSig/jsonOpen/lastSelId/lastItem 1127-1134; labels/tabs refresh 1513-1606; store.subscribe listener + autosave debounce 1627-1634; pagehide flush 1637; closing renderResults()+sync() 1640-1641.
- Section wiring (event handlers, `$('id').oninput = ...`): 66-1123 plus 1139-1200 (AqAdvisor) -- see A2.
- Pure helpers: top-level scapeSec 50, growthWord 53, padlock 1646, slug 1652, download 1653, fmtHeight 1660. Inside the function and nearly pure: isSalt/fitsWater/misfits 454-458, sizeLabel 553, blocked 558 (reads S()), startCount 566, inRow 568, rowName 600, when 128, countMax/capCount/fitK 785-787, mapKey 809, stopName 954, libHtml 974, toU/len/num/side 1098-1102, jsonText 1133, aqWaitText 1158.

### A7. Commits per section
`git log --since=2026-10-08 -- src/ui/panels.ts` = 121 commits (111 non-merge). The date filter excludes nothing: the whole history is after 10-08. Counts are keyword-assigned from subjects; one commit can count in several buckets, so totals exceed 111:
- Tank shape / size / room / stand / wall / background (tank, bgpics, room): 36  <- top conflict magnet
- Camera / viewer / pan / zoom / "view": 30 (loose keyword; true camera-only is far fewer)
- Split / panel shell / sections / undo / phone layout: 26
- Aquascape items / scape generate / density / plants / coral / starter: 23
- Animals / species / preview / stocking list: 23
- Lighting (fixture, lamp, light map, beams, dark spots): 22
- File / Save / Open / Share / Examples / Start menu: 22
- Stocking / AqAdvisor: 19
- Type-in / units / labels / audit wording: 14
- Substrate / terrain: 14
- Water / salt: 11
- Growth timeline: 2 (GR1, GR3; lane GR still active)
- Perf / sync(): 1 (646feea); other: 2
Latest commits touch: AqAdvisor health (57399b1), scape warn + density (8f6bfa8, f3a1859), light mount (7faa8f1), 3D wall (9f32fac), growth (c9d615a, 050e2d9), light map / shells / dark spots (7f4b645, a8ac3ad, d4b7c7c, c529796), 3D back wall (ef828aa). Conclusion: Lighting, scape/density/growth, Tank/Room/Background and AqAdvisor are where parallel lanes collide, and sync() is touched by nearly all of them (each new control adds lines to sync()).

====================================================================
## B. src/render/build.ts (1212 lines)
====================================================================
All top-level functions; the only giant closure is addContents (1037-1143, ~107 lines). Module-level state is a handful of consts/caches (no module-level `let`).

### B1. Top-level outline (start-end)
1-22      imports
23-31     `export BACKGROUNDS` (background options)
32        `basic` (MeshBasicMaterial factory); 33-41 `lines`; 43-48 `bgMaterial`; 50 `export FROST`; 53 `penEnd`
56        `at(p,y)`; 59-82 `class Tris`; 83 `wallGeometry`; 96 `prismGeometry`; 104 `flatGeometry`; 111 `ringLines`; 115 `glassLine`; 122-152 `silhouetteMaterial`   (geom helpers 53-153)
154       `interface BgSheet`; 157-163 `clockwise`; 165 `BOWL_BANDS/BOWL_SEG`; 171-221 `addBowl` (51); 222-323 `addTank` (102: glass, rim, background sheets + pictures, outlines); 324-342 `addWater` (19)
343       `export STAND_FINISHES`; 350 `shadedBox`; 363 `inkMats` + 364 `ink`; 382 `shadedPrism`; 387 `shadedSolid`; 399-415 `addStand` (dispatcher); 416-433 `edgeRuns`; 434-452 `addDoors`; 453 `DOOR_T, HANDLE`; 456 `proud`; 469-483 `addTableStand`; 484 `TUBE`; 491-519 `addFrameStand`; 520-542 `addBowlFrame`   (stand 343-542, ~200 lines)
543       `export HOOD_H`; 550-593 `addHood`; 594-614 `addLid`; 615 `clipRing`; 630 `CANOPY_MAX`; 639-671 `addShapedCanopy`   (hood/lid/canopy 543-671, 129 lines)
672-711   person: `export PERSON_ASPECT` 672, `PERSON_GAP` 674, `export straightOnEye` 676, `export personSpot` 683, `export personPlacement` 684, `addPerson` 704
712-757   `ROOM_SPAN` 712, `addFloor` 714, `addWall` 724
758-833   `flare` 758, `addSubstrate` 764-833 (70)
834-856   `BlendUniforms`, `blendUniforms` 835, `blendGrains` 841 (custom-blend shader patch)
857-882   contact shadow: `shadowTex` 857 (IIFE), `shadowGeo` 868, `contactShadow` 873
883-908   `export cardGeometry` 883, `outline` 893, `boxOutline` 900
910-931   `interface Part` 910, `export interface BuiltTank` 912
933-963   `export envKey` 933, `export lookKey` 940, `surfaceLook` 943, `export patchLook` 946
965-1006  `addTerrainDots` (42)
1007-1029 `export buildTank` (orchestrator, 23)
1030-1035 `export patchTank`
1037-1143 `addContents` (items + animals; builds Parts, pool, reuse)
1144-1149 `HIDDEN` 1144, `UP`/`MAX_TILT` 1147, `PANE_GAP` 1149
1155-1170 `onGlass`; 1171-1205 `snailMeshes`; 1206-1212 `export disposeScene`
addContents internals: pool/part/take 1038-1042; bare + itemParts 1045-1057; solids/hardKey 1058-1059; rests/top/base 1061-1068; restOn 1072-1088; animal 1090-1120; fishPart 1121-1125; fishParts 1126; cleanup + child ordering 1133-1139.

### B2. Parts/patch machinery vs mesh builders
- Machinery (candidate build/patch.ts): `Part` 910, `BuiltTank` 912-931 (contentAt), `envKey` 933, `lookKey` 940, `surfaceLook` 943 (shared with addWater 326), `patchLook` 946 (needs blendUniforms 835 + blendTexture), `buildTank` 1007, `patchTank` 1030, `addContents` 1037-1143 (part keys: `'i'+JSON(item)+(selected?'*')`, `'f'+JSON(fish)+...`; hardKey 1059 couples animal keys to the hard pieces; contentAt ordering 1135), `disposeScene` 1206.
- Mesh builders by theme (`(sc, S, T)` -> add to scene, no shared locals):
  * tank glass/frame/background/water: addTank 222, addBowl 171, addWater 324, bgMaterial 43, BACKGROUNDS 23, FROST 50, wall/prism/flat geometry 83-110
  * stand: addStand 399 + edgeRuns/addDoors/proud/addTableStand/addFrameStand/addBowlFrame, STAND_FINISHES 343
  * lid/hood/canopy: 543-671
  * substrate + terrain edit dots: addSubstrate 764, blendUniforms/blendGrains 834-856, flare 758, addTerrainDots 965
  * room: addFloor 714, addWall 724, addPerson 704 + personPlacement/personSpot/straightOnEye
  * lights/beams: NOT in this file (./lighting: addFixture/addBeams/applyLighting, called in buildTank 1013-1018)
  * items: NOT in this file (itemMesh in ./items, called in addContents)
  * animals: inside addContents (animal 1090, restOn 1072, top 1063, fishPart 1121) + onGlass 1155 + snailMeshes 1171 + contactShadow 873 + shadowTex/shadowGeo 857-871
- Shared helpers (must live in a common module): `basic` 32, `lines` 33, `at` 56, `P` type (from scene/shape), `Tris` 59, `wallGeometry/prismGeometry/flatGeometry` 83-110, `ringLines` 111, `glassLine` 115, `silhouetteMaterial` 122, `outline` 893, `boxOutline` 900, `shadedBox/shadedPrism/shadedSolid/ink/inkMats` 350-398 (used by stand, frame, hood/lid, canopy, wall), `cardGeometry` 883 (also used by preview3d, addContents, snail/onGlass).

### B3. Shared module-level state / blockers
- `inkMats` Map @363: used only inside ink() (364-380), so it moves with ink(); ink/shadedBox/shadedPrism/shadedSolid are called from stand (399-542), hood/lid/canopy (611,647,660,662) and wall (732) -> shared file.
- `shadowTex` @857 / `shadowGeo` @868 (singletons): used in contactShadow 876 only; contactShadow called from addContents (1094, 1119). Move together into the animals module.
- `HIDDEN` @1144: addContents (1100,1177,1191); `UP`/`MAX_TILT` @1147: addContents (1070,1071,1079,1080); `PANE_GAP` @1149: onGlass 1157, snailMeshes 1188; BOWL_BANDS/BOWL_SEG @165: addBowl only; TUBE @484: addFrameStand only; DOOR_T/HANDLE @453: addDoors; CANOPY_MAX @630: canopy; ROOM_SPAN @712: floor/wall; PERSON_GAP @674: person. All single-section, easy moves.
- `surfaceLook` @943: addWater 326 and patchLook 947 -> export from water or patch module.
- `blendUniforms`/`blendGrains` @835-841: addSubstrate + patchLook 956 -> substrate module exports blendUniforms; patch imports it.
- `flare` @758: addSubstrate 775 and addTerrainDots -> same module (substrate/terrain).
- addContents closure locals (sc, pool, built, part, take, bare, hard, solids, hardKey, rests, down/from/DOWN, top, base, restOn, animal, fishPart): used only inside that function; to move the animal builder out, `part/take/built/pool` become a small ctx object, and top/restOn/animal need solids/rests passed in.
- Public types Part/BuiltTank flow to viewer.ts (type BuiltTank): keep them re-exported.

### B4. Imports -> who uses them
- three: everything. art/placeholder: SUBSTRATES/blendTile/maskQuantile -> substrate (patch uses blendTile). art/snails snailAspect -> snailMeshes. data/species fishTL/needsWater/speciesOf -> addContents, onGlass/snail. scene/water: glassBand (onGlass/snail), restsOnGround (addContents). scene/physics: D2R/clamp/waterY in animals + substrate + tank; IN/glassThickness/RIM_H in addTank; RIM_DROP/tankUnderside in stand/hood; ceilingH/floorY in addFloor/addWall/buildTank. scene/shape: tank, stand, substrate, dots (heavy). scene/table: stand, person, floor/wall. scene/terrain: groundHeight (tank, substrate, dots, addContents, animals), pieSegs/terrainDisc/terrainPoints (dots). scene/images getImage -> addTank. ./lighting: waterVolumeMaterial (addWater), addBeams/addFixture/applyLighting (buildTank). ./items itemMesh -> addContents. ./backdrop addBackdrop -> buildTank. ./fish3d: drapedCard/fish3d/fishBody/has3D (addContents), hullMaterial (stand/hood). ./herp3d: addContents. ./snail3d: snailMeshes. ./textures: blendTexture (substrate, patchLook), cardMaterial (person, animals), pictureTexture (addTank), substrateTexture/MaskTexture (substrate), personTexture (person), fishTexture/fishBodyTexture/snailTexture (animals), gradientTexture (bgMaterial).

### B5. Exports and importers
- src/render/viewer.ts:10: HOOD_H, buildTank, disposeScene, envKey, lookKey, patchLook, patchTank, personSpot, type BuiltTank
- src/render/preview3d.ts:6: cardGeometry
- src/ui/diff.ts:5 and src/ui/panels.ts:7: BACKGROUNDS, STAND_FINISHES
- test/incremental.test.ts:6: envKey, lookKey; test/perspective.test.ts:4: personPlacement, personSpot; test/table.test.ts:2: personSpot
- No outside importers: FROST, PERSON_ASPECT, straightOnEye (internal only). Keeping build.ts as a barrel re-exporting from the new modules leaves all 7 importers unchanged.

### B6. Commits per section
`git log --since=2026-10-08 -- src/render/build.ts` = 76 commits (72 non-merge); keyword-assigned, overlaps possible:
- Bowl / shape / pie / round / canopy (addBowl, addTank, bowl frame, canopy): 27 (loose keyword)
- Animals (fish/snail/amphibian placement, clinging, resting, contact shadow; addContents + onGlass + snailMeshes): 21
- Stand / cabinet / frame / table / room / wall / ceiling / zoom / person / doors: 20
- Lighting / beams / light map / shells / dark spots (buildTank calls; changes mostly in lighting.ts): 20
- Glass / silhouette / ink / outline: 18
- Substrate / terrain (addSubstrate, dots, blend): 14
- Water: 7; Plants/growth/items/coral: 6; Background (pictures, 3D backdrop, frost): 6; Patch/incremental/perf: 3; AR: 1
Conflict magnets: addContents / animal code (21), the addTank/addBowl/addStand cluster (shape + stand + room ~47 combined but in separate functions, so a split by function separates them), substrate/terrain (14). New content kinds (growth, 3D wall) touch buildTank/addContents machinery.
