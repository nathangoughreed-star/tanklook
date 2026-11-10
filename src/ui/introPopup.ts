// AB4 (2026-11-09, Discovery v2 spec 2.2); AB6 (2026-11-10): the copy now sits on the quick-preferences screen (ui/quickPrefs.ts showQuickPrefs), which replaced the popup. The short "Let's build your habitat." popup shown on EVERY new project (New Setup, toolbar New), never on Open Existing,
// a starter, a deal or Continue your last tank. One button; Esc also dismisses; it is shown every time. Afterwards the left menus and Discover pulse briefly.
export const INTRO_TITLE = 'A few quick preferences (all optional)';
/** The body: spec 2.2 shortened to two lines (AB6). `**x**` marks bold. */
export const INTRO_LINES: readonly string[] = [
  'Add equipment, animals or ideas in the menus at the left, and **lock what you’re sure of**. Hit **Discover** when you’re ready.',
];
export const INTRO_BUTTON = 'Start building';
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
