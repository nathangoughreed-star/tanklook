// Where the pet arthropods go in a terrarium (lane arthropods, 2026-10-28; research/arthropods/arthropods.json lifestyle and behaviors).
// Read only by scene/scatter.ts (Shuffle): the share that take a hide big enough for them, the share on the glass, and how big a hide
// has to be (times the body length). Judgement from the care sheets (burrowers and hide-dwellers sit in a hide most of the day; arboreal
// species rest on branches and the wall); no number here is a measured share.
export interface ArthBehavior {
  /** share that take a hide (half log, cork tube) when the tank has one that fits */
  hide: number;
  /** share on the glass (a terrestrial animal: only now and then); absent = the species' default */
  glass?: number;
  /** the smallest hide, in body lengths; absent = 3 (a tarantula backs into the mouth), a long animal needs less */
  fit?: number;
  /** what it does in life (shown nowhere; the reason for the numbers) */
  does: string;
}
export const ARTH_BEHAVIOR: Record<string, ArthBehavior> = {
  redknee: { hide: 0.7, does: 'burrows and sits at the mouth of a hide, out at night; fasts and webs itself in before a molt' },
  chileanrose: { hide: 0.6, does: 'sits for weeks in the open or a shallow burrow, then walks; fasts for months' },
  curlyhair: { hide: 0.6, does: 'a busy burrower that digs out and tunnels, walks at night' },
  pinktoe: { hide: 0.25, glass: 0.5, does: 'arboreal: rests in a silk tube on the wall or a branch, rarely on the floor' },
  emperorscorpion: { hide: 0.8, glass: 0, does: 'burrows under bark and rock, out at night; sits motionless with the claws forward' },
  africanmillipede: { hide: 0.6, glass: 0, fit: 0.4, does: 'burrows into damp substrate, surfaces at night to feed; curls into a spiral when disturbed' },
  hissingroach: { hide: 0.6, glass: 0, does: 'shelters in bark and tubes by day, walks the floor at night; cannot climb smooth glass' },
  zebraisopod: { hide: 0.7, glass: 0, does: 'a colony under leaf litter and bark, out at night; curls into a ball when threatened' },
  powderblueisopod: { hide: 0.7, glass: 0, does: 'a fast colony under litter and wood; very active, hides from light' },
  orchidmantis: { hide: 0, glass: 0.2, does: 'sits motionless on a stem or leaf waiting for flying prey; moves only to feed or molt (hangs upside down to molt)' },
  indianstick: { hide: 0, glass: 0.2, does: 'freezes or sways like a twig on bramble or the wall; feeds at night; molts hanging' },
  purplepincher: { hide: 0.5, glass: 0.15, does: 'climbs and digs; buries itself for weeks to molt; swaps shells' },
};
