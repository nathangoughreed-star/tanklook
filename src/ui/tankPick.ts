// What picking a catalogue size or one maker's product does to the tank besides its size (S224, 2026-10-26; was panels.ts standFor).
// Kept free of the DOM so test/tankpick.test.ts can check every library product.
import { kitById } from '../data/kits';
import type { TankModel, TankVariant } from '../data/tanks';
import type { TankSetup } from '../scene/types';

/** Rimless when the product says so (a variant's own flag wins over its size's). */
export const pickRimless = (m: TankModel, v?: TankVariant) => !!(v ? v.rimless ?? m.rimless : m.rimless);

/** Apply a library pick's rim, lid, all-in-one kit and stand to the setup (the size itself is setTank's). */
export function applyTankPick(s: TankSetup, m: TankModel, v?: TankVariant) {
  // an all-in-one (Fluval Flex and the like) is applied with its own light, lid and filter, which then stay (scene/integrated.ts); any other pick is an ordinary tank
  if (v?.kit && kitById(v.kit)) s.integrated = { kit: v.kit }; else delete s.integrated;
  // the rim follows the product, both ways: a framed pick after a rimless one gets its rim back (Nathan 2026-10-26: rimless tanks drew a rim)
  const rimless = pickRimless(m, v);
  s.render.rim = !rimless;
  // a rimless tank has no hood to sit on its rim: it ships with a glass top (Imagitarium: glass top with clips) or none
  if (rimless && s.lid === 'hood') s.lid = 'glass';
  // a tank sold with a stand (an ensemble) shows it; any other does not add one: the stand section asks, unless the user added one
  if (v && /stand|ensemble/i.test(v.line ?? '')) { s.stand.show = true; s.stand.need = undefined; }
  else if (s.stand.need !== 'added') { s.stand.show = false; s.stand.need = 'ask'; }
}
