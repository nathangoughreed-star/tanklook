// What picking a catalogue size or one maker's product does to the tank besides its size (S224, 2026-10-26; was panels.ts standFor).
// Kept free of the DOM so test/tankpick.test.ts can check every library product.
import { kitById } from '../data/kits';
import { pickRimless, variantKey, type TankModel, type TankVariant } from '../data/tanks';
import type { TankSetup } from '../scene/types';

export { pickRimless };

/** Apply a library pick's rim, lid, all-in-one kit and stand to the setup (the size itself is setTank's), and record the product
 *  (Nathan 2026-10-26: "clearly distinguish if the tank being worked on is a real commercially available tank or a custom size"). */
export function applyTankPick(s: TankSetup, m: TankModel, v?: TankVariant) {
  // what was picked: a maker's product or a standard size, both ready-made (scene/integrated.ts holds the rim and size)
  s.product = v ? { model: m.id, key: variantKey(v) } : { model: m.id }; // ready-made either way (Nathan 2026-10-26)
  // a kit (an all-in-one, a starter or LED kit) is applied with its own light, lid and filter, which then stay (scene/integrated.ts):
  // what a product ships with is held (Nathan 2026-10-26); any other pick is a tank without gear of its own
  const k = v?.kit ? kitById(v.kit) : undefined;
  delete s.integrated;
  if (k) s.integrated = { kit: k.id };
  const inc = v?.includes;
  // the rim follows the product, both ways: a framed pick after a rimless one gets its rim back (Nathan 2026-10-26: rimless tanks drew a rim)
  const rimless = pickRimless(m, v);
  s.render.rim = !rimless;
  // the lid it ships with (held from here on); a rimless tank has no hood to sit on its rim either way
  if (!k && inc?.lid) s.lid = inc.lid === 'none' ? 'open' : inc.lid;
  else if (rimless && s.lid === 'hood') s.lid = 'glass';
  // a tank sold with a stand (an ensemble) shows it; any other does not add one: the stand section asks, unless the user added one
  if (v && (inc?.stand ?? /stand|ensemble/i.test(v.line ?? ''))) { s.stand.show = true; s.stand.need = undefined; }
  else if (s.stand.need !== 'added') { s.stand.show = false; s.stand.need = 'ask'; }
}

/** The way past a lock: a button beside the lock note that asks (scene/integrated.ts breakNote) and, on yes, makes the tank custom
 *  (panels.ts handles every [data-unhold] click). */
export const unholdBtn = (what: string) => ` <button type="button" class="unhold" data-unhold="${what}">Change it anyway…</button>`;
