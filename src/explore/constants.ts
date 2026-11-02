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
