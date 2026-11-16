// How the invertebrates crawl (R90), per species id: walking speed in inches per second (real behaviour: a cherry shrimp
// walks about 0.4-1 in/s, a nerite ~0.1), the share of time stopped to graze, and short hops per minute (shrimp only).
// A species not listed here does not crawl. Speeds are cruising walking speed, not bursts.
export type CrawlKind = 'shrimp' | 'snail' | 'crab' | 'frog';
export interface CrawlPace { kind: CrawlKind; inPerSec: number; graze: number; hopPerMin: number; /** frog: mean seconds between breathing trips */ tripS?: number }
export const CRAWL: Record<string, CrawlPace> = {
  cherryshrimp: { kind: 'shrimp', inPerSec: 0.7, graze: 0.5, hopPerMin: 1.5 },
  cajundwarf: { kind: 'shrimp', inPerSec: 0.7, graze: 0.5, hopPerMin: 1.5 },
  amano: { kind: 'shrimp', inPerSec: 0.9, graze: 0.45, hopPerMin: 1 },
  cpo: { kind: 'shrimp', inPerSec: 0.6, graze: 0.5, hopPerMin: 1 },
  cleanershrimp: { kind: 'shrimp', inPerSec: 0.8, graze: 0.4, hopPerMin: 1.5 },
  rswcrayfish: { kind: 'crab', inPerSec: 0.8, graze: 0.5, hopPerMin: 0 },
  redclaw: { kind: 'crab', inPerSec: 1, graze: 0.5, hopPerMin: 0 },
  thaicrab: { kind: 'crab', inPerSec: 0.9, graze: 0.55, hopPerMin: 0 },
  hermit: { kind: 'crab', inPerSec: 0.7, graze: 0.55, hopPerMin: 0 },
  // African dwarf frog (R93): lies still on the substrate, now and then leg-walks a few inches, and every few minutes kicks up to the surface for air and darts back down
  adf: { kind: 'frog', inPerSec: 0.5, graze: 0.85, hopPerMin: 0, tripS: 150 },
  nerite: { kind: 'snail', inPerSec: 0.1, graze: 0.35, hopPerMin: 0 },
  mystery: { kind: 'snail', inPerSec: 0.25, graze: 0.3, hopPerMin: 0 },
  ramshorn: { kind: 'snail', inPerSec: 0.2, graze: 0.3, hopPerMin: 0 },
  trumpet: { kind: 'snail', inPerSec: 0.2, graze: 0.4, hopPerMin: 0 },
  turbo: { kind: 'snail', inPerSec: 0.3, graze: 0.35, hopPerMin: 0 },
};
export const crawlPace = (speciesId: string): CrawlPace | undefined => CRAWL[speciesId];
