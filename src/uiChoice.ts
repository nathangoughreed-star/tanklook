// UF1 (2026-11-15): which interface boots. The new shell (src/shell/) is the default; `?ui=1` keeps the old one
// until it is deleted (planned 2026-11-29); `?ui=2` (the old preview address) still opens the new one.
export type UiChoice = 'shell' | 'old';

export function chooseUi(search: string): UiChoice {
  return new URLSearchParams(search).get('ui') === '1' ? 'old' : 'shell';
}

/** the same page with ?ui=1 (other params and the #hash, e.g. an open share link, kept) */
export function oldUiHref(loc: { pathname: string; search: string; hash: string }): string {
  const p = new URLSearchParams(loc.search); p.set('ui', '1');
  return `${loc.pathname}?${p}${loc.hash}`;
}

/** the same page with ?ui=1 removed (back to the default) */
export function newUiHref(loc: { pathname: string; search: string; hash: string }): string {
  const p = new URLSearchParams(loc.search); p.delete('ui');
  const q = p.toString();
  return `${loc.pathname}${q ? '?' + q : ''}${loc.hash}`;
}
