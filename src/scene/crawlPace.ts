// How the invertebrates crawl (R90), per species id: walking speed in inches per second (real behaviour: a cherry shrimp
// walks about 0.4-1 in/s, a nerite ~0.1), the share of time stopped to graze, and short hops per minute (shrimp only).
// FB2 (Nathan 2026-11-17): shrimp sit still (feeding with the front claws) about 88 % of the time and walk slowly (no darting hops) to a new spot; the dwarf frog rests 95 % and goes up for air about 7 times an hour (real frogs surface every 15-20 min, so about 3-4 an hour; doubled so the dive shows).
// A species not listed here does not crawl. Speeds are cruising walking speed, not bursts.
export type CrawlKind = 'shrimp' | 'snail' | 'crab' | 'frog';
export interface CrawlPace { kind: CrawlKind; inPerSec: number; graze: number; hopPerMin: number; /** frog: mean seconds between breathing trips */ tripS?: number }
export const CRAWL: Record<string, CrawlPace> = {
  cherryshrimp: { kind: 'shrimp', inPerSec: 0.2, graze: 0.88, hopPerMin: 0 },
  cajundwarf: { kind: 'shrimp', inPerSec: 0.2, graze: 0.88, hopPerMin: 0 },
  amano: { kind: 'shrimp', inPerSec: 0.25, graze: 0.88, hopPerMin: 0 },
  cpo: { kind: 'shrimp', inPerSec: 0.18, graze: 0.88, hopPerMin: 0 },
  cleanershrimp: { kind: 'shrimp', inPerSec: 0.22, graze: 0.88, hopPerMin: 0 },
  rswcrayfish: { kind: 'crab', inPerSec: 0.8, graze: 0.5, hopPerMin: 0 },
  redclaw: { kind: 'crab', inPerSec: 1, graze: 0.5, hopPerMin: 0 },
  thaicrab: { kind: 'crab', inPerSec: 0.9, graze: 0.55, hopPerMin: 0 },
  hermit: { kind: 'crab', inPerSec: 0.7, graze: 0.55, hopPerMin: 0 },
  // African dwarf frog (R93): lies still on the substrate, now and then leg-walks a few inches, and every few minutes kicks up to the surface for air and darts back down
  adf: { kind: 'frog', inPerSec: 0.25, graze: 0.95, hopPerMin: 0, tripS: 480 },
  nerite: { kind: 'snail', inPerSec: 0.1, graze: 0.35, hopPerMin: 0 },
  mystery: { kind: 'snail', inPerSec: 0.25, graze: 0.3, hopPerMin: 0 },
  ramshorn: { kind: 'snail', inPerSec: 0.2, graze: 0.3, hopPerMin: 0 },
  trumpet: { kind: 'snail', inPerSec: 0.2, graze: 0.4, hopPerMin: 0 },
  turbo: { kind: 'snail', inPerSec: 0.3, graze: 0.35, hopPerMin: 0 },
};
export const crawlPace = (speciesId: string): CrawlPace | undefined => CRAWL[speciesId];
