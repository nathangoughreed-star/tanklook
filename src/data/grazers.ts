// Grazers (Nathan 2026-10-21): an algae eater needs algae to eat, so past what a tank grows it starves. The limit is the most generous
// stocking guideline an opened page states (per litre); over it the advice is to feed or keep fewer. Feeding never raises the limit:
// no page states by how much it would. Sources, quotes and the species left out (bristlenose, SAE: no density stated; trumpet
// snails: their guideline is about numbers, they eat detritus and do not starve) are in research/sourcing/R5-grazers.json.
const GAL = 3.785;
export interface Grazer { perL: number; per: string; feed: string }
export const GRAZE: Record<string, Grazer> = {
  turbo: { perL: 3 / (20 * GAL), per: '2-3 per 20-30 gal', feed: 'nori or algae wafers' },
  nerite: { perL: 1 / (5 * GAL), per: '1 per 5 gal', feed: 'blanched vegetables or algae wafers a few times a week' },
  oto: { perL: 6 / (20 * GAL), per: '3-6 in a 20 gal', feed: 'algae wafers and blanched vegetables daily' },
  amano: { perL: 1 / (2 * GAL), per: '1 per 2 gal', feed: 'a pellet or algae wafer' },
};

/** The most of a grazer a tank of `litres` feeds on its algae (at least 1), or undefined for an animal that is not on the list. */
export const grazersFed = (id: string, litres: number) => GRAZE[id] ? Math.max(1, Math.floor(GRAZE[id].perL * litres + 1e-9)) : undefined;

/** Advice when `n` of a grazer is more than the tank's algae feeds, else null. */
export function grazerShort(id: string, n: number, litres: number): string | null {
  const g = GRAZE[id], most = grazersFed(id, litres);
  if (!g || !most || n <= most) return null;
  return `algae: this tank grows enough for about ${most} (the guideline is ${g.per}); ${n} will run out, so feed ${g.feed}, or keep ${most}`;
}
