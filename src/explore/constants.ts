// Explore Complete Setups, stage X1 (lane OX3, 2026-11-02; research/design/open-to-anything-reconcile.md section 11): every tunable of the Explore pipeline in ONE file,
// as the reconcile decision asks ("keep the thresholds as constants in one file"). Nathan dogfoods these and tells us what to change; no other file carries a magic number.

/** A figure that rests on a stated estimate (conf 'provisional') and whose upper bound lands within this share of a firm cap is not certified: the candidate goes to the provisional strip (Q1). */
export const NEAR_CAP = 0.10;
/** Setup hours have no listing behind them (effort.ts, every part an assumption): the range shown is the point estimate x these, and a firm setup-time cap certifies on the upper end (Q1). */
export const SETUP_HOURS_SPREAD = { lo: 0.75, hi: 1.5 } as const;
/** Catalogue tank sizes tried per look: the smallest that holds a sensible roster, then the sizes nearest these multiples of that smallest size (gallons). */
export const SIZE_MULTIPLES = [2, 4] as const;
/** Set by later stages (X2-X3): candidates per batch, the share of a batch reserved for exploration, saved candidates kept in the browser (likes and saves never evicted). */
export const BATCH_SIZE = 6, EXPLORE_SHARE = 0.25, STORE_CAP = 60;
/** Terrarium and paludarium figures do not come from the aquarium cost / care model yet: those candidates are provisional until they do (Q2, Nathan 2026-11-02). */
export const WORLD_MODEL_READY = { aquarium: true, terrarium: false, paludarium: false } as const;
/** Brackish needs a roster with brackish support, and none exists (Q3): no brackish candidate is made until this is true. */
export const BRACKISH_ROSTER_READY = false;
/** The reference keeper difficulty is rated for (Q4): never the viewer's own skill, so the label does not change with the person looking at it. Skill 0 on every domain, tap water. */
export const REFERENCE_KEEPER = 'a first-time keeper';

// ---- stage X2 (lane OX4): the batch, the saved store and the preference profile ----
/** Cards per batch on a machine that renders in software (SwiftShader / llvmpipe / Basic Render): about 4.5-21 s a card there, so three, text first (research/design/explore-cost-spike.md). */
export const BATCH_SIZE_SOFTWARE_GL = 3;
/** Preference events kept in the brief (the oldest fall off, like taste.ts MAX_EVENTS), and how much an older event is worth after each later one (taste.ts DECAY is 0.8; a profile that explains WHY needs a longer memory). */
export const ASPECT_EVENTS = 50, ASPECT_DECAY = 0.92;
/** What one event is worth on each feature it speaks for. A Like / Pass with no tags is unattributed: weak evidence spread over the candidate's features, never a world or a look family on the negative side. */
export const ASPECT_STEP = { tagged: 1, unattributed: 0.3, save: 0.15, mine: 1.5 } as const;
/** Uncertainty: a feature's learned weight is scaled by n / (n + CONFIDENCE_K), n = events that spoke for it, so one signal moves ranking a little and several move it more. */
export const CONFIDENCE_K = 2;
/** Tunnel-vision cap: no single learned feature adds more than this to a score (a Like never takes over a batch), and a person's own "You told us" setting is worth TOLD_WEIGHT without the fade. */
export const ASPECT_CAP = 0.8, TOLD_WEIGHT = 1;
/** A world's weight never goes under this, so a Pass or a world tag can lower a world but never remove it from the pool or from the exploration slots. */
export const WORLD_FLOOR = -0.35;
/** Ranking: how much distance to what is already chosen is worth against the aspect score, and the aspect score under which a candidate is not picked as a "surprise". */
export const DIVERSITY_WEIGHT = 0.6, EXPLORE_MIN_SCORE = -0.15;
/** Animal size classes by adult length, mm (about 2 in and 6 in), and group sizes. */
export const SIZE_SMALL_MM = 50, SIZE_LARGE_MM = 150, NUMBER_FEW = 3, NUMBER_MANY = 8;
/** Ownership classes from the estimate: care minutes a week (low / high cut), and tank gallons under which the water needs the most attention. */
export const CARE_LOW_MIN = 40, CARE_HIGH_MIN = 90, SMALL_TANK_GAL = 15;
/** Plant pieces in the scene: under SOME_PLANTS = none-ish, over LUSH_PLANTS = lush. */
export const SOME_PLANTS = 1, LUSH_PLANTS = 6;
