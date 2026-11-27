// SK1 / SK3 (2026-11-17): two full screens (DG1 fit rules: centred, 100dvh, scrolls inside).
// EXAMPLE TANKS: finished tanks to look at or start from (own door in the Start dialog). BUNDLES AND SALES: three tabs, each hidden when empty:
// Bundles / Bundles on sale / Items on sale. A deal card shows its picture, price, $ and % saved against the parts, store, checked date and what is in the box;
// one click starts a tank from a bundle exactly as the old chooser did (files.startDeal: pin the bundle price, load the catalog tank + gear).
import { useState } from 'preact/hooks';
import type { Files } from './files';
import { examplesInScope } from '../examples';
import { pic, picUrl } from '../ui/featuredDeals';
import { KIT_TAB_LABEL, photoSrc, SORTS, SORT_LABEL, cardOf, defaultSort, entriesFor, itemCardOf, itemsFor, kitsModel, type ItemEntry, type KitTab, type KitsModel } from './logic/kits';
import type { DealSort, DealEntry } from '../ui/startEntries';

/** The Tank picker asks for this screen with this event (Back then returns to the picker underneath). */
export const KITS_EVENT = 'ui2:kits';

/** The starter examples as picture cards (the Open window's Example tanks tab and the Example tanks screen share this). */
export function ExampleGrid({ files }: { files: Files }) {
  return <div class="libgrid kitgrid">{examplesInScope().map(x => (
    <div class="card libcard"><button type="button" class="libopen" title={x.hint} onClick={() => void files.openExample(x.id)}>
      <img src={x.thumb} alt="" loading="lazy" /><b class="t">{x.name}</b><span class="m">{x.hint}</span></button></div>))}</div>;
}

/** The listing's own product photo, hotlinked from the retailer (never copied into the repo); the generic tile shows if it will not load. */
function DealPic({ e, url }: { e: DealEntry; url?: string }) {
  const tile = url ? <img src={url} alt="" loading="lazy" /> : <span dangerouslySetInnerHTML={{ __html: pic(e.deal, e.scene) }} />;
  if (!e.deal.img) return <div class="dealpic">{tile}</div>;
  // a photo that will not load is removed and the tile (hidden until then) shows instead
  const fail = (ev: Event) => { const im = ev.currentTarget as HTMLElement, box = im.parentElement as HTMLElement; box.classList.remove('photo'); im.hidden = true; box.querySelector('.dealfb')?.removeAttribute('hidden'); };
  return <div class="dealpic photo"><img class="dealphoto" src={photoSrc(e.deal.img)} alt={e.deal.name} width={400} height={250} loading="lazy" referrerpolicy="no-referrer" onError={fail} />
    <span class="dealfb" hidden>{tile}</span></div>;
}

/** What is in the box as a bulleted list in the fixed order, then the missing light / filter / heater. Shared by every deal surface. */
export function BoxList({ comes, no }: { comes: string[]; no: string[] }) {
  return <div class="dealbox"><ul class="boxlist" aria-label="Comes with">{comes.map(x => <li>{x}</li>)}</ul>
    {no.length ? <><span class="boxno">Not included</span><ul class="boxlist boxmiss">{no.map(x => <li>{x}</li>)}</ul></> : null}</div>;
}

function DealCardView({ e, files }: { e: DealEntry; files: Files }) {
  const c = cardOf(e), url = picUrl(c.id);
  return (
    <div class="card libcard dealcard" data-deal={c.id}>
      <DealPic e={e} url={url} />
      <b class="t">{c.title}</b>
      <span class="m dealstore">{c.store} · {c.gal} gal · checked {c.checked}{c.ends ? ` · sale ends ${c.ends}` : ''}</span>
      <span class="dealprice"><b>{c.price}</b>{c.was ? <> <s>{c.was}</s></> : null}{c.off ? <> <b class="off">{c.off}% off</b></> : null}</span>
      {c.saved ? <span class="dealsave">Saves {c.saved}{c.savedPct ? ` (${c.savedPct})` : ''} vs the parts</span> : <span class="m">{c.savingLine}</span>}
      <BoxList comes={c.comes} no={c.notIncluded} />
      {c.guessed.length ? <span class="m"><i>Guessed: {c.guessed.join('; ')}</i></span> : null}
      <span class="acts"><button type="button" class="btn primary sm" onClick={() => void files.startDeal(e.deal, e.scene)}>Start from this</button>
        <a class="btn ghost sm" href={c.url} target="_blank" rel="noopener" title="Opens the retailer's page in a new tab (not a sponsored link)">See it at {c.store} ↗</a></span>
    </div>
  );
}

/** One individual item on sale: its photo (hotlinked) or the catalogue still of its look, price, what it saves, store, date, a plain link. */
function ItemCardView({ e }: { e: ItemEntry }) {
  const c = itemCardOf(e), base = import.meta.env.BASE_URL;
  const fail = (ev: Event) => { const im = ev.currentTarget as HTMLElement, box = im.parentElement as HTMLElement; im.hidden = true; box.classList.remove('photo'); box.querySelector('.dealfb')?.removeAttribute('hidden'); };
  const fb = c.still ? <img src={`${base}${c.still}`} alt="" loading="lazy" onError={ev => { (ev.currentTarget as HTMLElement).hidden = true; }} /> : <span class="itemkind">{c.kind}</span>;
  return (
    <div class="card libcard dealcard itemcard" data-item={c.id}>
      {c.img ? <div class="dealpic photo"><img class="dealphoto" src={photoSrc(c.img)} alt={c.title} width={400} height={250} loading="lazy" referrerpolicy="no-referrer" onError={fail} /><span class="dealfb" hidden>{fb}</span></div>
        : <div class="dealpic"><span class="dealfb">{fb}</span></div>}
      <b class="t">{c.title}</b>
      <span class="m dealstore">{c.store} · {c.kind}{c.size ? ` · ${c.size}` : ''} · checked {c.checked}{c.ends ? ` · sale ends ${c.ends}` : ''}</span>
      <span class="dealprice"><b>{c.price}</b> <s>{c.was}</s> <b class="off">{c.off}% off</b></span>
      <span class="dealsave">Saves {c.saved}</span>
      <span class="acts"><a class="btn ghost sm" href={c.url} target="_blank" rel="noopener" title="Opens the retailer's page in a new tab (not a sponsored link)">See it at {c.store} ↗</a></span>
    </div>
  );
}

/** One deal tab: Sort by dropdown + cards. Stateless so it renders in a test. */
export function DealTab({ model, tab, by, onSort, files }: { model: KitsModel; tab: KitTab; by: DealSort; onSort: (s: DealSort) => void; files: Files }) {
  return <>
    <label class="dealsort">Sort by <select class="select" value={by} onChange={ev => onSort((ev.currentTarget as HTMLSelectElement).value as DealSort)}>{SORTS.map(s => (
      <option value={s} selected={by === s}>{SORT_LABEL[s]}</option>))}</select></label>
    <div class="libgrid kitgrid">{tab === 'items' ? itemsFor(model, by).map(e => <ItemCardView e={e} />) : entriesFor(model, tab, by).map(e => <DealCardView e={e} files={files} />)}</div>
    <p class="hint dealnote">{model.note}</p>
  </>;
}

type DialogC = (p: { title: string; onClose: () => void; children: preact.ComponentChildren; wide?: boolean; full?: boolean }) => preact.VNode;

/** Bundles and sales: Bundles / Bundles on sale / Items on sale, each shown only when it has something. */
export function DealsScreen({ files, Dialog, want, back }: { back?: 'start' | 'close'; files: Files; Dialog: DialogC; want?: KitTab }) {
  const [model] = useState(() => kitsModel(Date.now(), undefined, want));
  const [tab, setTab] = useState<KitTab>(model.land);
  const [sort, setSort] = useState<Record<KitTab, DealSort>>({ bundles: defaultSort('bundles'), bundlesSale: defaultSort('bundlesSale'), items: defaultSort('items') });
  const n: Record<KitTab, number> = { bundles: model.bundles.length, bundlesSale: model.bundlesSale.length, items: model.items.length };
  return (
    <Dialog title="Bundles and sales" full onClose={() => files.close()}>
      <div class="kitwrap">
        {model.tabs.length ? <>
          <div class="seg full" role="tablist">{model.tabs.map(t => (
            <button type="button" role="tab" aria-selected={tab === t} class={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{KIT_TAB_LABEL[t]} ({n[t]})</button>))}</div>
          <DealTab model={model} tab={tab} by={sort[tab]} onSort={s => setSort({ ...sort, [tab]: s })} files={files} />
        </> : <p class="hint">No bundles or sales have been checked in the last 30 days. Check back soon.</p>}
        <div class="acts"><button type="button" class="btn ghost" onClick={() => back === 'close' ? files.close() : files.openStart()}>Back</button></div>
      </div>
    </Dialog>
  );
}

/** Example tanks: finished tanks to look at or start from. */
export function ExamplesScreen({ files, Dialog }: { files: Files; Dialog: DialogC }) {
  return (
    <Dialog title="Example tanks" full onClose={() => files.close()}>
      <div class="kitwrap">
        <p class="hint">Finished tanks to look at, or to start from and change.</p>
        <ExampleGrid files={files} />
        <div class="acts"><button type="button" class="btn ghost" onClick={() => files.openStart()}>Back</button></div>
      </div>
    </Dialog>
  );
}
