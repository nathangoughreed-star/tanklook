// R208 BH-S1: the URL switches of the behavior work. `?bh` turns the new behavior system on for review (later steps), `&places`
// draws the affordance map as coloured dots, `?scene=bh1` opens the review tank. Nothing here changes a visitor's tank.
export interface BhParams { on: boolean; places: boolean; scene: string }
export function bhParams(search: string = typeof location === 'undefined' ? '' : location.search): BhParams {
  const q = new URLSearchParams(search);
  const scene = q.get('scene') ?? '';
  return { on: q.has('bh') || scene === 'bh1', places: q.has('places'), scene };
}
