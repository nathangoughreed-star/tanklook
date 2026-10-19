// Bundle-deal pricing (lane KD): a retailer's tank+stand (or kit-with-stand) price stands in for the parts it includes.
import { dealAsKit, dealsFor, type Deal } from '../data/deals';
import { standAsked, type TankSetup } from '../scene/types';
import { volume } from '../scene/physics';
import { demandOf, type DemandOpts } from './engine';
import type { UserProfile } from './types';

export interface DealOffer { deal: Deal; /** setup $ with the deal's price in place of the parts it covers */ withDealUsd: number; /** setup $ buying the parts separately (the app's own estimate) */ partsUsd: number; /** partsUsd - withDealUsd; negative = the parts are cheaper */ savingUsd: number; /** list price minus sale price, when the listing shows both */ saleOffUsd?: number }

/** Deals that fit this build (tank size, stand) with what each saves against buying the parts, best saving first. */
export function dealOffers(S: TankSetup, P: UserProfile, opts: DemandOpts = {}, deals?: Deal[]): DealOffer[] {
  const gal = volume(S.tank).gallons, base = demandOf(S, P, { ...opts, kit: undefined }).totals.setupUsd;
  return dealsFor(gal, S.stand.show || standAsked(S.stand), opts.now, undefined, deals).map((deal) => {
    const withDealUsd = demandOf(S, P, { ...opts, kit: dealAsKit(deal) }).totals.setupUsd;
    return { deal, withDealUsd, partsUsd: base, savingUsd: base - withDealUsd, saleOffUsd: deal.price.regularUsd ? deal.price.regularUsd - deal.price.usd : undefined };
  }).sort((a, b) => b.savingUsd - a.savingUsd);
}
