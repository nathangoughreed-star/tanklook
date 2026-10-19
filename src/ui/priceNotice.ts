// A short notice over the view when an edit costs the user a starting price (a bundle or a preset tank on sale), with Undo.
// One at a time; it closes itself after a while, on OK, or on Undo.
let box: HTMLDivElement | null = null, timer = 0;

export function showPriceNotice(html: string, onUndo?: () => void) {
  if (!box) {
    box = document.createElement('div');
    box.className = 'pricenote'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
    document.body.append(box);
  }
  const b = box;
  b.innerHTML = `<span>${html}</span>${onUndo ? '<button type="button" data-k="undo">Undo</button>' : ''}<button type="button" data-k="ok">OK</button>`;
  b.hidden = false;
  b.onclick = e => {
    const k = (e.target as HTMLElement).closest<HTMLButtonElement>('button')?.dataset.k;
    if (!k) return;
    hidePriceNotice();
    if (k === 'undo') onUndo?.();
  };
  clearTimeout(timer); timer = window.setTimeout(hidePriceNotice, 12000);
}

export function hidePriceNotice() { clearTimeout(timer); if (box) box.hidden = true; }
