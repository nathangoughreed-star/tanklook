// The first screen of path 1, "An animal I want": before any animal is picked there is no tank to look at, only the animals. A big
// collage of every kind we carry (fish, shrimp and snails, frogs, lizards, snakes, spiders), then tile cards to browse by group or by
// search. Each picture is a still of the same 3D model the tank draws, made once on a small renderer and kept. Picking a tile hands
// the id to the stocking screen, which then shows the bare tank sized for it.
import { CARE } from '../data/care';
import { CATEGORIES, SPECIES, searchSpecies, speciesTag, type Category, type Species } from '../data/species';
import { drawFishCard } from '../art/placeholder';
import { SpeciesPreview } from '../render/preview3d';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
/** The collage: a spread of every kind, so the first look says "fish, frogs, lizards, snakes, spiders, reef, shrimp". */
const HERO = ['betta', 'regaljumper', 'ocellaris', 'axolotl', 'crestedgecko', 'discus', 'ballpython', 'dartfrog', 'cherryshrimp', 'yellowtang', 'chacogoldenknee', 'angel',
  'leopardgecko', 'treefrog', 'mandarin', 'goldfish', 'neon', 'greenanole', 'nerite', 'peapuffer', 'firetoad', 'royalgramma', 'guppy', 'hermit', 'adf', 'oscar',
  'bluetang', 'amano', 'clownloach', 'firenewt', 'banggai', 'kuhli', 'peacock', 'cleanershrimp', 'bristlenose', 'harlequin'];
const TILE = [320, 200] as const, BIG = [480, 300] as const;
const stills = new Map<string, string>(); // `${look}@${width}` -> data URL; the same still is reused for the life of the page

/** The still cropped to the animal (a snake or a spider fills little of the frame it is fitted in), with a little air round it. Reads the
 *  renderer's canvas now, in the task that drew it; falls back to the whole frame if there is nothing to read. */
function trimmed(whole: string, src: HTMLCanvasElement): string {
  const w = src.width, h = src.height, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true }); if (!g) return whole;
  g.drawImage(src, 0, 0);
  const a = g.getImageData(0, 0, w, h).data; let x0 = w, x1 = -1, y0 = h, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[(y * w + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return whole;
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.05);
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
  o.getContext('2d')!.drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
  return o.toDataURL('image/png');
}

/** Tiny seeded random, so each scene keeps its look from one visit to the next. */
const seeded = (n: number) => () => { n = (n + 0x6d2b79f5) | 0; let t = Math.imul(n ^ (n >>> 15), 1 | n); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const SCENE_BG: Record<string, [string, string]> = {
  'fw-fish': ['#2f6f86', '#173e50'], 'fw-invert': ['#3f7d6c', '#1a4238'], 'sw-fish': ['#1f78a8', '#0d3552'], 'sw-invert': ['#2a8aa0', '#0f3e55'],
  amphibian: ['#4d7a3c', '#22381c'], reptile: ['#8a6a3a', '#3b2a15'], 'land-invert': ['#6b5a46', '#2a2119'],
};
/** A little hardscape for one scene, drawn in SVG: rocks, driftwood, slate, a log or a bit of branch, on a strip of substrate. Not the tank's models; a picture. */
function hardscape(r: () => number, land: boolean): string {
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)], rock = pick(['#7b8088', '#8d8577', '#6c7077', '#9a8f7c']), dark = '#00000040';
  const sub = pick(land ? ['#a98c5e', '#7d6a48', '#5f6b3c'] : ['#cdb98c', '#a89a7a', '#8a8f94']);
  const flip = r() < 0.5 ? -1 : 1, pole = (x: number, y: number, a: number, w: number, c: string) => `<path d="M${x} ${y} q${a} ${-w * 0.5} ${a * 0.6} ${-w}" stroke="${c}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
  const kinds: (() => string)[] = [
    () => `<ellipse cx="62" cy="86" rx="38" ry="22" fill="${rock}"/><ellipse cx="62" cy="80" rx="30" ry="12" fill="#fff" opacity=".12"/><ellipse cx="128" cy="92" rx="28" ry="15" fill="${rock}"/><ellipse cx="108" cy="97" rx="16" ry="8" fill="${rock}"/><ellipse cx="62" cy="104" rx="46" ry="6" fill="${dark}"/>`,
    () => `<path d="M10 100 C40 84 62 98 96 74 S150 66 190 36" stroke="#5a4129" stroke-width="13" fill="none" stroke-linecap="round"/>${pole(96, 74, 14, 38, '#6b4d30')}${pole(150, 62, -10, 30, '#6b4d30')}<path d="M10 100 C40 84 62 98 96 74 S150 66 190 36" stroke="#8a6a46" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6" transform="translate(0 -3)"/>`,
    () => `<polygon points="40,104 52,52 96,60 112,104" fill="${rock}"/><polygon points="52,52 96,60 84,46 62,44" fill="#fff" opacity=".18"/><polygon points="110,104 124,70 158,78 168,104" fill="${rock}"/><polygon points="124,70 158,78 146,64" fill="#fff" opacity=".16"/>`,
    () => `<rect x="30" y="74" width="120" height="26" rx="13" fill="#6a5238"/><ellipse cx="150" cy="87" rx="9" ry="13" fill="#2a1d10"/><path d="M40 80 q40 -5 90 0" stroke="#fff" opacity=".15" stroke-width="3" fill="none"/><ellipse cx="60" cy="102" rx="44" ry="5" fill="${dark}"/>`,
    () => `<path d="M20 102 q22 -50 44 -34 q14 -34 46 -10 q30 -22 62 20 l16 24z" fill="${rock}"/><path d="M64 68 q14 -34 46 -10" stroke="#fff" opacity=".2" stroke-width="3" fill="none"/>`,
  ];
  const body = kinds[Math.floor(r() * kinds.length)]();
  return `<svg viewBox="0 0 200 110" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><g transform="${flip < 0 ? 'translate(200 0) scale(-1 1)' : ''}">${body}</g><path d="M0 104 Q50 98 100 103 T200 100 V110 H0z" fill="${sub}"/></svg>`;
}

export function attachStockGallery(view: HTMLElement, pick: (id: string) => void) {
  const el = document.createElement('section');
  el.className = 'sg'; el.hidden = true; el.setAttribute('aria-label', 'Animals to choose from');
  view.append(el);
  let cat: Category | '' = '', q = '', built = false, tool: SpeciesPreview | null | undefined;
  const queue: (() => void)[] = []; let pumping = false;

  /** Make one still (or reuse it), then set it on every <img> waiting for it. Stills are made a few per frame so the page never stalls. */
  const want = (img: HTMLImageElement, sp: Species, size: readonly [number, number]) => {
    const key = `${sp.look}@${size[0]}`, have = stills.get(key);
    if (have) { img.src = have; img.classList.add('ready'); return; }
    queue.push(() => {
      let url = stills.get(key);
      if (!url) {
        if (tool === undefined) { try { tool = new SpeciesPreview(1); } catch { tool = null; } }
        try { url = tool ? trimmed(tool.snapshot(sp, size[0], size[1]), tool.canvas) : drawFishCard(sp.art, sp.aspect, size[0]).toDataURL(); } catch { url = ''; }
        stills.set(key, url);
      }
      if (url) { img.src = url; img.classList.add('ready'); }
    });
    if (!pumping) { pumping = true; requestAnimationFrame(pump); }
  };
  const pump = () => {
    for (let i = 0; i < 3 && queue.length; i++) queue.shift()!();
    if (queue.length) requestAnimationFrame(pump); else pumping = false;
  };

  const tile = (sp: Species) => {
    const c = CARE[sp.id], min = c?.bands?.ok ?? c?.group, tag = speciesTag(sp);
    const bits = [min && min > 1 ? `group of ${min}+` : c?.solo ? 'kept alone' : '', tag].filter(Boolean).join(' · ');
    return `<li><button type="button" class="sgTile" data-id="${sp.id}"><span class="sgImg"><img alt="" data-look="${sp.id}"></span><b>${esc(sp.name)}</b><i>${esc(sp.sci)}</i>${bits ? `<span class="sgBits">${esc(bits)}</span>` : ''}</button></li>`;
  };

  const list = () => {
    const found = q.trim() ? searchSpecies(q) : SPECIES;
    const rows = found.filter(s => !s.id.includes('~') && (!cat || s.cat === cat));
    if (!rows.length) return '<p class="sgNone">No animal by that name.</p>';
    const groups = CATEGORIES.filter(([k]) => !cat || k === cat).map(([k, label]) => [label, rows.filter(s => s.cat === k)] as const).filter(([, r]) => r.length);
    return groups.map(([label, r]) => `<h3>${label}</h3><ul class="sgGrid">${r.map(tile).join('')}</ul>`).join('');
  };

  const fillImages = (root: ParentNode, size: readonly [number, number]) =>
    root.querySelectorAll<HTMLImageElement>('img[data-look]').forEach(img => { const sp = SPECIES.find(s => s.id === img.dataset.look); if (sp) want(img, sp, size); });
  const drawList = () => { const w = el.querySelector('.sgList'); if (w) { w.innerHTML = list(); fillImages(w, TILE); } };

  const build = () => {
    built = true;
    const hero = HERO.map(id => SPECIES.find(s => s.id === id)).filter((s): s is Species => !!s);
    el.innerHTML = `<div class="sgHero" aria-hidden="true">${hero.map((s, i) => {
      const r = seeded(i * 97 + 13), [top, bot] = SCENE_BG[s.cat] ?? SCENE_BG['fw-fish'], wide = r() < 0.28, tall = !wide && r() < 0.2;
      const turn = (r() < 0.5 ? -1 : 1) * 1, tilt = Math.round((r() - 0.5) * (s.cat === 'fw-fish' || s.cat === 'sw-fish' ? 22 : 8));
      const sink = s.habitat === 'water' && s.zone !== 'bottom' && s.kind !== 'snail';
      return `<div class="sgScene${wide ? ' w2' : ''}${tall ? ' h2' : ''}" style="background:linear-gradient(${top}, ${bot});--tx:${turn};--tilt:${tilt}deg;--lift:${sink ? 24 + Math.round(r() * 22) : 12}%">${hardscape(r, s.habitat !== 'water')}<img alt="" data-look="${s.id}"></div>`;
    }).join('')}</div>
<div class="sgIntro"><h1>Which animal do you have in mind?</h1><p>Look around, then pick one. The tank it needs, what it costs and how much care it takes show up next. Your first pick can be joined by others later.</p></div>
<div class="sgChips" role="group" aria-label="Kinds of animal"><button type="button" data-cat="" class="on">Everything</button>${CATEGORIES.map(([k, l]) => `<button type="button" data-cat="${k}">${l}</button>`).join('')}</div>
<div class="sgList">${list()}</div>`;
    fillImages(el.querySelector('.sgHero')!, BIG);
    fillImages(el.querySelector('.sgList')!, TILE);
  };

  el.onclick = e => {
    const t = e.target as HTMLElement, chip = t.closest<HTMLElement>('[data-cat]'), card = t.closest<HTMLElement>('.sgTile');
    if (chip) {
      cat = chip.dataset.cat as Category | ''; el.querySelectorAll('.sgChips button').forEach(b => b.classList.toggle('on', b === chip)); drawList(); el.scrollTop = 0;
    } else if (card) pick(card.dataset.id!);
  };

  return {
    /** Show or hide the gallery; the first show builds it. */
    show(on: boolean) { el.hidden = !on; if (on && !built) build(); },
    /** The panel's search box filters the tiles too. */
    search(text: string) { if (text === q) return; q = text; if (built) drawList(); },
  };
}
