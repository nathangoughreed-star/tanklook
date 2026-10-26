// What picking a catalogue size or one maker's product does to the tank besides its size (S224, 2026-10-26; was panels.ts standFor).
// Kept free of the DOM so test/tankpick.test.ts can check every library product.
import { kitById } from '../data/kits';
import { namedModel, pickRimless, variantKey, type TankModel, type TankVariant } from '../data/tanks';
import { applyKit } from '../scene/integrated';
import type { TankSetup } from '../scene/types';

export { pickRimless };

/** Apply a library pick's rim, lid, all-in-one kit and stand to the setup (the size itself is setTank's), and record the product
 *  (Nathan 2026-10-26: "clearly distinguish if the tank being worked on is a real commercially available tank or a custom size"). */
export function applyTankPick(s: TankSetup, m: TankModel, v?: TankVariant) {
  // what was picked: a maker's product, or a catalogue size with no maker (scene/integrated.ts holds the first, releases the second on a resize)
  if (v) s.product = { model: m.id, key: variantKey(v) }; else if (!namedModel(m)) s.product = { model: m.id }; else delete s.product;
  // an all-in-one (Fluval Flex and the like) is applied with its own light, lid and filter, which then stay (scene/integrated.ts);
  // a starter kit's gear is applied once and stays editable; any other pick is an ordinary tank
  const k = v?.kit ? kitById(v.kit) : undefined;
  delete s.integrated;
  if (k && k.kind !== 'starter') s.integrated = { kit: k.id };
  // the rim follows the product, both ways: a framed pick after a rimless one gets its rim back (Nathan 2026-10-26: rimless tanks drew a rim)
  const rimless = pickRimless(m, v);
  s.render.rim = !rimless;
  // a rimless tank has no hood to sit on its rim: it ships with a glass top (Imagitarium: glass top with clips) or none
  if (rimless && s.lid === 'hood') s.lid = 'glass';
  // a tank sold with a stand (an ensemble) shows it; any other does not add one: the stand section asks, unless the user added one
  if (v && /stand|ensemble/i.test(v.line ?? '')) { s.stand.show = true; s.stand.need = undefined; }
  else if (s.stand.need !== 'added') { s.stand.show = false; s.stand.need = 'ask'; }
  if (k?.kind === 'starter') applyKit(s, k);
}

/** The way past a lock: a button beside the lock note that asks (scene/integrated.ts breakNote) and, on yes, makes the tank custom
 *  (panels.ts handles every [data-unhold] click). */
export const unholdBtn = (what: string) => ` <button type="button" class="unhold" data-unhold="${what}">Change it anyway…</button>`;
