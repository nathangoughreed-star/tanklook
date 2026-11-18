// R131 (lane PK1, 2026-11-18): "See all species": one searchable, sortable table of every animal the catalogue carries.
// Opened from the Animals picker (a row opens that animal's card there) and from Settings (a row opens the card in place).
import { useMemo, useState } from 'preact/hooks';
import type { Store } from '../scene/store';
import { getSpecies, SPECIES } from '../data/species';
import { scopeSpecies } from '../scope';
import { OK_FIT } from '../scene/pickerKind';
import { Icon } from './ui';
import { FishArt } from './animals';
import { allRows, listView, SORTS, type SortKey } from './logic/speciesList';
import { speciesDetail } from './logic/animals';

/** How many species the catalogue offers in this build (the aquarium-only build leaves out the terrarium animals). */
export const speciesCount = () => scopeSpecies(SPECIES).length;

export function SpeciesListDialog({ store, onClose, onOpen }: { store: Store; onClose: () => void; /** a row was chosen: the picker shows the card itself; absent = the dialog shows it */ onOpen?: (id: string) => void }) {
  const units = store.scene.units;
  const [q, setQ] = useState(''), [sort, setSort] = useState<SortKey>('name'), [card, setCard] = useState<string | null>(null);
  const rows = useMemo(() => allRows(units), [units]);
  const groups = listView(rows, q, sort), shown = groups.reduce((n, g) => n + g.rows.length, 0), total = rows.filter(r => !r.hidden).length, off = rows.length - total;
  const sp = card ? getSpecies(card) : undefined, det = sp ? speciesDetail(store.tank, sp, OK_FIT, units) : null;
  const head = (k: SortKey, label: string) => <th scope="col" aria-sort={sort === k ? 'ascending' : 'none'}><button type="button" class={`sortbtn${sort === k ? ' on' : ''}`} title={`Sort by ${label.toLowerCase()}`} onClick={() => setSort(k)}>{label}{sort === k ? ' ↑' : ''}</button></th>;
  return (
    <div class="scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="dlg wide species-list" role="dialog" aria-modal="true" aria-label="All species">
        <div class="sec-head"><h2>All species <span class="n">{total}</span></h2><button type="button" class="btn icon ghost" aria-label="Close" onClick={onClose}><Icon name="x" /></button></div>
        <div class="dlgbody">
          {det && sp ? (
            <div class="detail">
              <button type="button" class="btn sm ghost back" onClick={() => setCard(null)}>← Back to the list</button>
              <div class="dart"><FishArt id={det.id} look={det.look} big /></div>
              <div class="dname">{det.name}{det.tag ? <b class="tag">{det.tag}</b> : null}</div>
              <div class="m"><i>{det.sci}</i></div>
              {det.origin ? <div class="origin"><b class="tag">{det.origin.place}</b><span>{det.origin.region}</span></div> : null}
              {det.note ? <div class="hint">{det.note}</div> : null}
              <div class="rundown">{det.rows.map(([k, v]) => <div class="drow"><span>{k}</span><b>{v}</b></div>)}</div>
              <div class="hint">To add it to a tank, use Animals, then Add animals.</div>
            </div>
          ) : (<>
            <label class="search"><Icon name="search" /><input class="input" type="search" placeholder="Search name, scientific name, place or group" value={q} aria-label="Search the species list" onInput={e => setQ((e.target as HTMLInputElement).value)} /></label>
            <div class="hint">{shown === total ? `Every one of the ${total} species we carry.` : `${shown} of ${total} species match.`} Click a name to open its card.{off ? ` ${off} terrarium animals (geckos, snakes, frogs, spiders) are left out of this version.` : ''}</div>
            {groups.length ? <div class="sltable"><table>
              <thead><tr>{head('name', 'Name')}{head('sci', 'Scientific name')}{head('size', 'Adult size')}{head('care', 'Level')}{head('origin', 'Where from')}<th scope="col">Suits</th></tr></thead>
              {groups.map(g => (
                <tbody>
                  <tr class="slcat"><th colSpan={6} scope="colgroup">{g.label} <span class="n">{g.rows.length}</span></th></tr>
                  {g.rows.map(r => (
                    <tr data-sp={r.id}>
                      <td><button type="button" class="linkbtn" onClick={() => (onOpen ? onOpen(r.id) : setCard(r.id))}>{r.name}</button><span class="hint"> {r.group}</span></td>
                      <td><i>{r.sci}</i></td><td>{r.size}</td><td>{r.care || '-'}</td><td>{r.origin || '-'}</td><td>{r.suits}</td>
                    </tr>))}
                </tbody>))}
            </table></div> : <div class="hint">Nothing matches that. Try a shorter search.</div>}
            <div class="hint">Sorted by {SORTS.find(s => s[0] === sort)![1].toLowerCase()} inside each group.</div>
          </>)}
        </div>
      </div>
    </div>
  );
}
