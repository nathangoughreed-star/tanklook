// Explore Complete Setups, stage X3 (lane OX5): the FAVOURITES STRIP as markup, from the saved-candidate store (liked or saved records, newest first). A favourite keeps the numbers it was shown with
// (the estimate is frozen at generation); when the limits change it is relabelled "no longer fits" with the broken limit and never deleted (store.recheck). Picture: the one drawn this session, else the
// family colour. Review opens the favourite as a full card; Compare is stage X4.
import type { StoredLite } from '../../explore/candidate';
import { esc, familyColour, startupText, verdictOf, worldLabel } from './card';

/** The records the strip shows: liked or saved, none that are only passed. */
export const favouritesOf = (list: readonly StoredLite[]): StoredLite[] => list.filter(c => c.reaction.state === 'liked' || c.reaction.saved);

export function stripHtml(list: readonly StoredLite[], o: { shots: ReadonlyMap<string, string>; persisted: boolean; reviewing?: string }): string {
  const fav = favouritesOf(list);
  if (!fav.length) return `<section class="ex-strip" aria-label="Favourites"><h4>Favourites</h4><p class="hint">Setups you like or save are kept here to come back to, even after you change your limits.</p></section>`;
  const items = fav.map(c => {
    const v = verdictOf(c), shot = o.shots.get(c.id);
    return `<li class="ex-fav" data-ex-id="${esc(c.id)}" data-status="${c.status}" data-on="${o.reviewing === c.id}" style="--ex-c:${esc(familyColour(c))}">`
      + `<span class="ex-favpic">${shot ? `<img src="${shot}" alt="">` : `<span aria-hidden="true">${esc(c.identity.name)}</span>`}</span>`
      + `<span class="ex-favtxt"><b>${esc(c.identity.name)}</b><span>${esc(worldLabel(c))} · ${esc(startupText(c))}</span>${c.status === 'stale' ? `<em class="ex-stale">${esc(v.pill)}: ${esc(c.staleBecause ?? '')}</em>` : c.reaction.state === 'liked' ? '<span>Liked</span>' : '<span>Saved</span>'}</span>`
      + `<span class="ex-favb"><button type="button" data-ex="review">${o.reviewing === c.id ? 'Close' : 'Review'}</button><button type="button" class="linkbtn" data-ex="forget" aria-label="Remove ${esc(c.identity.name)} from Favourites">Remove</button></span></li>`;
  }).join('');
  return `<section class="ex-strip" aria-label="Favourites"><h4>Favourites <span class="hint">(${fav.length})</span></h4>${o.persisted ? '' : '<p class="hint">Not saved in this browser (storage is blocked or full): these last until you close the page.</p>'}<ul class="ex-favs">${items}</ul></section>`;
}
