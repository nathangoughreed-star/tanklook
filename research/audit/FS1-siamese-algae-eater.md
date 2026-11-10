# FS1 audit: Siamese algae eater (SAE) stocking (2026-11-10)

Verdict: **REAL model defect** (not a confusing UI state). Reproduced on a hand-built tank: 6 SAE + 12 CPD + 16 ember in a 36x18x16 (~40 gal) and 6 SAE in 48x13x20 returned `feasible: true`, no gates, no advisories, 85 % stocking.

## Species record (`sae`)
| Field | Value | Judgement |
|---|---|---|
| id / sci | `sae` / *Crossocheilus oblongus* (species.json) | True SAE name. aqadvisor.json carries the synonym "C. siamensis" (harmless). Chinese algae eater (*Gyrinocheilus*) and flying fox (*Epalzeorhynchus*) are separate ids/not in the roster, so no lookalike mix-up. Seriously Fish notes other Crossocheilus (*langei*, *atrilimes*) are sold as SAE: a supply risk, not a model one. |
| tl | 150 mm (5.9 in) | OK (hobby 4-6 in). bodymass fishbase-bayes a=0.00813 b=3.05. |
| activity / zone | metabolic class `active`, zone bottom, flow medium | OK. |
| temper | 0 (peaceful), care 1 | Weak: sources say semi-aggressive toward own kind (hierarchy). Handled by the group rule, not temper. |
| group bands | ok 3 / good 5 / great 6, no max, no territory | `great 6` is a judgement row ("Search rate-limited", groups-sources.md); no tank scaling anywhere. |
| tankmin red/green | 20 gal long (765 mm, derived) / 90 cm (Guidarium) | Describes ONE fish. Count never entered it: tankmin was per species, not per count. |

## Gates that ran on the reviewer's candidates, and why they passed
- stock:room / filtration (stockingOf): 85-89 %, below 100. Measures load and floor share only.
- Tank minimum (tankMinimum): 36 in / 20 gal single-fish line met.
- Group band: 6 reads "great" (it rewards the count).
- Territory/crowd warning: SAE has no `max`/`territory`, so nothing fired. (That path is advisory only anyway.)
- Net: no species-specific gate considered "6 aggressive-to-kin 6 in swimmers".

## Evidence on the correct floor (hobby guides, via search 2026-11-10; Seriously Fish has no oblongus page)
- 20 gal for one fish; 40 gal for more than one (Fishkeeping World).
- 55+ gal for a group of 3-5 (a care guide); 50 gal for 6+ (a retailer); Guidarium: 110 L and 90 cm.
- A group must be 6+ or SAE are kept singly (dominance hierarchy; subdominants harassed).
- Sources disagree, so the 5+ step (75 gal) is our conservative estimate and is marked "sourced (est)".

## Fix
`src/scene/tankMin.ts`: new optional `MinData.groupVol` (count-scaled gallon floor, a gate like `volGate`; highest step whose `from` <= n). `tankMinimum` applies it per species count. Data: `tankmin.json` sae.groupVol = 2+: 40 gal (sourced), 5+: 75 gal (est). With the usual 10 % slack the 5+ gate fails below ~67.5 gal, so both pictured candidates (42.5, 50.6 gal) are now gated: summaryOf -> `problem` -> verdictOf gate -> pair generator drops them. Nothing was hidden or re-scored.

## Not changed / open
- Whether the 5+ step should be 55 gal (guides) instead of 75 (est) is Nathan's call; one number in tankmin.json.
- A 5-fish group is itself under the "6+" advice; bands left as is.
- CPD (nano) with a 6 in active bottom fish was not gated: no source says unsafe.
- Same class of gap (count never scales a floor) may apply to other kin-aggressive schoolers; not audited here.

Tests: `test/fs1.test.ts` (6).

## Follow-up (2026-11-10): the 75 gal step is PROVISIONAL, and what else to check
Volume alone does not establish that a tank suits an active, 6 in, constantly swimming fish. The 5+ step (75 gal) is our estimate, flagged `provisional` in tankmin.json and in a code comment in `tankMinimum`.
Now gated: **tank length / swim run**. Steps carry an optional `L`: 2+ = 765 mm (the existing red line), 5+ = 900 mm (Guidarium's 90 cm, in the data already). Whichever of volume or length is further short applies, so a tall short 75 gal (30 in run) fails on length. Test: `test/fs1.test.ts`.
Still to check (not done, per scope): adult size by individual (young fish are scaled by `scaleMin`, group floors are not); group behaviour by sex/age mix (hierarchy fighting is count-driven, not size-driven); width/floor area for a bottom-oriented fish; cover to break sight lines (territory warning is advisory only); whether lookalike Crossocheilus sold as SAE (*langei*, *atrilimes*) have different needs; a sourced oblongus page (Seriously Fish has none).
