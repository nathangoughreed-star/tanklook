// SK1 (2026-11-17): the "Starters and kits" browse screen. Full screen (DG1 fit rules: centred, 100dvh, scrolls inside), tabs Starters /
// Bundles / On sale. A deal card shows its picture, price, $ and % saved against the parts, store, checked date and what is in the box;
// one click starts a tank from it exactly as the old chooser did (files.startDeal: pin the bundle price, load the catalog tank + gear).
import { useState } from 'preact/hooks';
import type { Files } from './files';
import { examplesInScope } from '../examples';
import { pic, picUrl } from '../ui/featuredDeals';
import { KIT_TAB_LABEL, photoSrc, SORTS, SORT_LABEL, cardOf, defaultSort, entriesFor, kitsModel, type KitTab, type KitsModel } from './logic/kits';
import type { DealSort, DealEntry } from '../ui/startEntries';

/** The Tank picker asks for this screen with this event (Back then returns to the picker underneath). */
export const KITS_EVENT = 'ui2:kits';

/** The starter examples as picture cards (the Open window's Examples tab and the Starters tab share this). */
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

/** One deal tab: sort chips + cards. Stateless so it renders in a test. */
export function DealTab({ model, tab, by, onSort, files }: { model: KitsModel; tab: 'sale' | 'bundles'; by: DealSort; onSort: (s: DealSort) => void; files: Files }) {
  return <>
    <div class="dealsort" role="group" aria-label="Sort the deals">{SORTS.map(s => (
      <button type="button" class={`chip${by === s ? ' on' : ''}`} aria-pressed={by === s} onClick={() => onSort(s)}>{SORT_LABEL[s]}</button>))}</div>
    <div class="libgrid kitgrid">{entriesFor(model, tab, by).map(e => <DealCardView e={e} files={files} />)}</div>
    <p class="hint dealnote">{model.note}</p>
  </>;
}

export function KitsScreen({ files, Dialog, want, back }: { back?: 'start' | 'close'; files: Files; Dialog: (p: { title: string; onClose: () => void; children: preact.ComponentChildren; wide?: boolean; full?: boolean }) => preact.VNode; want?: KitTab }) {
  const [model] = useState(() => kitsModel(Date.now(), undefined, want));
  const [tab, setTab] = useState<KitTab>(model.land);
  const [sort, setSort] = useState<Record<'sale' | 'bundles', DealSort>>({ sale: defaultSort('sale'), bundles: defaultSort('bundles') });
  return (
    <Dialog title="Starters and kits" full onClose={() => files.close()}>
      <div class="kitwrap">
        <div class="seg full" role="tablist">{model.tabs.map(t => (
          <button type="button" role="tab" aria-selected={tab === t} class={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {KIT_TAB_LABEL[t]}{t === 'bundles' ? ` (${model.bundles.length})` : t === 'sale' ? ` (${model.sale.length})` : ''}</button>))}</div>
        {tab === 'starters' ? <ExampleGrid files={files} />
          : <DealTab model={model} tab={tab} by={sort[tab]} onSort={s => setSort({ ...sort, [tab]: s })} files={files} />}
        <div class="acts"><button type="button" class="btn ghost" onClick={() => back === 'close' ? files.close() : files.openStart()}>Back</button></div>
      </div>
    </Dialog>
  );
}
