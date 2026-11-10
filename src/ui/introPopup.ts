// AB4 (2026-11-09, Discovery v2 spec 2.2): the short "Let's build your habitat." popup shown on EVERY new project (New Setup, toolbar New), never on Open Existing,
// a starter, a deal or Continue your last tank. One button; Esc also dismisses; it is shown every time. Afterwards the left menus and Discover pulse briefly.
export const INTRO_TITLE = "Let's build your habitat.";
/** The body, spec 2.2 verbatim. `**x**` marks bold. */
export const INTRO_LINES: readonly string[] = [
  'If you already have equipment or ideas in mind, add them using the tabs on the left. **Lock anything you’re sure about.**',
  'When you’re ready, hit **Discover** to explore setups built around your choices. If you’re starting from scratch, you can jump straight into Discover!',
];
export const INTRO_BUTTON = 'Start Building';
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
export const introHtml = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

/** Which doors show the intro: a brand-new project only. */
export type StartDoor = 'new-setup' | 'toolbar-new' | 'open-existing' | 'starter' | 'deal' | 'continue' | 'open-file';
export const showsIntro = (door: StartDoor): boolean => door === 'new-setup' || door === 'toolbar-new';

/** Highlight the left menus and the Discover button for a few seconds (CSS class `intro-spot`). */
export function spotlight(root: Document = document, ms = 5000) {
  const els = [...root.querySelectorAll<HTMLElement>('details.sec > summary, #discoverBtn')];
  for (const e of els) e.classList.add('intro-spot');
  setTimeout(() => { for (const e of els) e.classList.remove('intro-spot'); }, ms);
}

/** Show the popup; resolves when dismissed (button or Esc). */
export function showIntro(root: Document = document): Promise<void> {
  return new Promise(res => {
    const d = root.createElement('dialog'); d.id = 'introDlg'; d.className = 'libdlg introdlg'; d.setAttribute('aria-labelledby', 'introTitle');
    d.innerHTML = `<h2 id="introTitle">${esc(INTRO_TITLE)}</h2>${INTRO_LINES.map(l => `<p>${introHtml(l)}</p>`).join('')}<div class="btns"><button type="button" class="primary" id="introOk">${INTRO_BUTTON}</button></div>`;
    root.body.append(d);
    const close = () => { if (d.open) d.close(); };
    d.addEventListener('close', () => { d.remove(); spotlight(root); res(); });
    d.querySelector<HTMLElement>('#introOk')!.onclick = close;
    d.showModal(); d.querySelector<HTMLElement>('#introOk')!.focus();
  });
}
