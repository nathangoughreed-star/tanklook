import { artMeta } from '../art/fishgen';
import { FORMS, formArt, type SpeciesForms } from '../art/forms';
import { scopeSpecies, speciesInScope } from '../scope';
import { herpMeta } from '../art/herps';
import { snailAspect, snailRest } from '../art/snails';
import { sessileMeta } from '../art/sessile';
import type { Surface } from '../scene/types';
import data from './species.json';

export type Habitat = 'water' | 'land' | 'both';
/** The Animals panel's sub menus, in menu order (Nathan 2026-10-13). */
export const CATEGORIES = [
  ['fw-fish', 'Freshwater fish'], ['fw-invert', 'Freshwater inverts'], ['sw-fish', 'Saltwater fish'], ['sw-invert', 'Saltwater inverts'],
  ['amphibian', 'Amphibians'], ['reptile', 'Reptiles'], ['land-invert', 'Land inverts'],
] as const;
export type Category = typeof CATEGORIES[number][0];

export interface Species {
  id: string;
  name: string;
  sci: string;
  tl: number;     // typical adult total length, mm == card width (snails: crawling length)
  aspect: number; // card height / width (snails: the side view on the substrate)
  art: string;
  /** 'bottom': always rests on the substrate; dragging slides it along the floor. */
  zone?: 'bottom';
  /** 'snail': clings to the substrate, a glass pane or hardscape. */
  kind?: 'snail' | 'sessile';
  /** Sessile animals (kind 'sessile': anemones, later clams): the species ids that shelter in it (clownfish, porcelain crab). */
  hosts?: string[];
  /** Sessile: how far it creeps, in inches per day (0 = fixed). */
  creep?: number;
  /** Surfaces it can cling to (steers Shuffle and drags): snails and plecos anywhere, shrimp on the floor or hardscape.
   * Absent = the floor (or the water) only. */
  surfaces?: Surface[];
  /** Where it lives: 'water' (fish; hidden in a dry tank), 'land' (rests on ground above the water line), 'both' (on land, or
   * swimming where the water is deep enough for it). Snails are 'both'. */
  habitat: Habitat;
  /** Marine species (added 2026-10-13); absent = freshwater. Salt tanks list only these, fresh tanks only the rest. */
  salt?: boolean;
  /** The Animals sub menu it is listed under. */
  cat: Category;
  /** v (in widths, + down) of the lowest point of the drawing; a resting animal's centre sits this far above the floor. */
  rest: number;
  /** How a group of 3+ swims (steers Shuffle only): 'school' tight and aligned, 'shoal' loose. Absent = keeps apart. */
  group?: 'school' | 'shoal';
  /** Kept as a pair (clownfish, Banggai cardinals): Add starts at 2. */
  pair?: boolean;
  /** The part of the water column a swimmer favours (steers Shuffle only). Absent = mid water. */
  level?: 'top' | 'low';
  note?: string;
  /** 'snake': a limbless body (render/snake3d.ts); its pose family rides in `Fish.bend` and Shuffle picks its size by life stage (lane BP). */
  body?: 'snake';
  /** Texture / material cache key: the id, or `<id>~f` for the female look. */
  look: string;
  /** Set by goLive: the model this species was drawn with before its build-B look; its colour forms still repaint it. */
  formBase?: string;
  /** Sexually dimorphic species: the female look (own drawing, adult length, card aspect). The species itself is the male. */
  female?: Species;
  sex?: Sex;
  /** AL1: sold in an albino (amelanistic) form; the value is the source for that. Absent = no albino form. */
  albino?: string;
  /** AL1: the albino look of this same model (art `<art>~albino`, look `<look>~a`). Set only where `albino` is. */
  albinoForm?: Species;
  /** CM3: colour / pattern and fin forms sold within this species (src/data/forms.json). Care stays the species'. */
  forms?: SpeciesForms;
}
/** 'f' = female; absent = male (or a species drawn the same either way). */
export type Sex = 'f';

interface RawSpecies { albino?: string; id: string; cat?: string; name: string; sci: string; tl: number; art: string; aspect?: number; zone?: string; kind?: string; hosts?: string[]; creep?: number; group?: string; pair?: boolean; level?: string; habitat?: string; cling?: string; note?: string; body?: string; female?: { art: string; tl: number } }

function resolve(r: RawSpecies): Species {
  const kind = r.kind === 'snail' ? 'snail' as const : r.kind === 'sessile' ? 'sessile' as const : undefined, zone = r.zone === 'bottom' ? 'bottom' as const : undefined;
  const meta = kind === 'snail' ? { aspect: snailAspect(r.art, 'side'), rest: snailRest(r.art) } : kind === 'sessile' ? sessileMeta(r.art) : artMeta(r.art) ?? herpMeta(r.art);
  const aspect = r.aspect ?? meta?.aspect ?? 0.4, rest = meta?.rest ?? aspect / 2;
  const habitat: Habitat = kind === 'snail' ? 'both' : r.habitat === 'land' || r.habitat === 'both' ? r.habitat : 'water';
  const group = r.group === 'school' || r.group === 'shoal' ? r.group : undefined, level = r.level === 'top' || r.level === 'low' ? r.level : undefined;
  const surfaces: Surface[] | undefined = kind === 'sessile' ? ['floor', 'hardscape'] : kind || r.cling === 'any' ? (habitat === 'land' ? ['floor', 'glass', 'hardscape'] : ['floor', 'glass', 'hardscape', 'under']) : // land climbers (frogs, geckos, spiders) do not hang under aquatic leaves
     r.cling === 'hangs' ? ['floor', 'hardscape', 'under'] : r.cling === 'hardscape' ? ['floor', 'hardscape']
    : r.cling === 'top' ? ['floor', 'top', 'hardscape'] : undefined; // 'top': perches on the bottom, on hardscape or leaves, or floats at the water surface, never on glass (dwarf frog)
  const sp: Species = { id: r.id, name: r.name, sci: r.sci, tl: r.tl, art: r.art, aspect, rest, zone, kind, surfaces, habitat, cat: CATEGORIES.some(c => c[0] === r.cat) ? r.cat as Category : 'fw-fish', group, level, note: r.note, look: r.id, ...(r.pair ? { pair: true } : {}), ...(r.hosts ? { hosts: r.hosts } : {}), ...(r.creep !== undefined ? { creep: r.creep } : {}), ...(r.body === 'snake' ? { body: 'snake' as const } : {}) };
  if ((r as { salt?: unknown }).salt === true) sp.salt = true; // marine (lane B hook 2026-10-13; absent = freshwater)
  if (r.female) {
    const m = (artMeta(r.female.art) ?? herpMeta(r.female.art))!;
    sp.female = { ...sp, art: r.female.art, tl: r.female.tl, aspect: m.aspect, rest: m.rest, look: r.id + '~f', sex: 'f', female: undefined };
  }
  if (FORMS[r.id]) { sp.forms = FORMS[r.id]; if (sp.female) sp.female.forms = FORMS[r.id]; }
  if (typeof r.albino === 'string' && !kind) {
    const al = (s: Species): Species => ({ ...s, art: s.art + '~albino', look: s.look + '~a', albinoForm: undefined, female: undefined });
    sp.albino = r.albino;
    sp.albinoForm = al(sp);
    if (sp.female) { sp.female.albino = r.albino; sp.female.albinoForm = al(sp.female); }
  }
  return sp;
}

const RAW = data.species as RawSpecies[];
// A bare row (id, name, sci, tl, art, aspect only) is a model, not an onboarded species: a build-B review look for a fish
// that has a full row (angelb, cardinalc, bluetangd...: scripts/fish-new.py), or a new fish whose model landed behind
// ?photoart before its care data (clownknife, bambooshark and bichirb were, until R194 onboarded them as bichir). It stays out of SPECIES (the pickers, catalogue,
// stocking, and the every-species data tests) except with dogfood ?photoart, where Nathan adds it to a tank to judge it.
// getSpecies still finds it (review page, goLive, saved tanks). Found 2026-11-24: the bare rows were listed in freshwater
// pickers on tanklook.com with a stand-in card, and their missing care data failed CI, so nothing deployed from 11-23 on.
const BARE = new Set(['id', 'name', 'sci', 'tl', 'art', 'aspect']);
const isReviewLook = (r: RawSpecies) => Object.keys(r).every(k => BARE.has(k));
const dogfood = typeof location !== 'undefined' && new URLSearchParams(location.search).has('photoart');
const ALL: Species[] = RAW.map(resolve);
/** The species offered anywhere in the app (build-B review looks only with ?photoart). */
export const SPECIES: Species[] = ALL.filter((_s, i) => dogfood || !isReviewLook(RAW[i]));
/** The model-only rows left out of SPECIES (the review page lists them). */
export const REVIEW_LOOKS: Species[] = ALL.filter((_s, i) => isReviewLook(RAW[i]));
const byId = new Map(ALL.map(s => [s.id, s]));

export const getSpecies = (id: string) => byId.get(id);
export const hasSpecies = (id: string) => byId.has(id);
/**
 * An approved build-B fish goes live (src/data/fishLive.json, applied by main.ts once its images loaded): the species is drawn
 * and sized with the build-B row's art and look from then on. Its albino and female forms keep their own art.
 */
export function goLive(id: string, look: string): boolean {
  const s = byId.get(id), l = byId.get(look);
  if (!s || !l || s === l) return false;
  s.formBase ??= s.art;   // colour forms keep repainting the old model until each form has its own sheet (formSpecies)
  s.art = l.art; s.aspect = l.aspect; s.rest = l.rest;
  s.look = l.look;   // the look keys the baked picker still (public/gallery/<look>.webp, else drawn from the art) and the texture caches
  return true;
}
/** The look a fish is drawn and sized with: the species, or its female for a female of a dimorphic species. */
export const speciesOf = (f: { species: string; sex?: Sex; albino?: boolean; form?: string; finForm?: string }) => {
  const sp = byId.get(f.species), s = sp && f.sex === 'f' && sp.female ? sp.female : sp;
  if (s && f.albino && s.albinoForm) return s.albinoForm;   // AL1: the albino look of the same model
  return s && (f.form || f.finForm) ? formSpecies(s, f.form, f.finForm) : s;
};
/** CM3: the GloFish colour a species is added in from the GloFish group (electric green, else its first glo- colour); undefined = not sold as a GloFish. */
export const gloForm = (sp: Species) => { const c = sp.forms?.colour.filter(x => x.id.startsWith('glo-')); return c?.length ? (c.find(x => x.id === 'glo-green') ?? c[0]).id : undefined; };
/** CM3: is this a colour (`axis` 'colour') or fin form of the species? */
export const hasForm = (species: string, axis: 'colour' | 'fin', id: string) => !!FORMS[species]?.[axis].some(x => x.id === id);
const formCache = new Map<string, Species>();
/** CM3: the species drawn in a colour and / or fin form: the same model repainted (art `<art>~f:<colour>:<fin>`), sized by the new outline. */
function formSpecies(s: Species, form?: string, fin?: string): Species {
  const c = form && hasForm(s.id, 'colour', form) ? form : undefined, t = fin && hasForm(s.id, 'fin', fin) ? fin : undefined;
  if (!c && !t) return s;
  // a species gone live on a build-B look (goLive) has no form plans of its own: its forms repaint the old model (formBase),
  // whose plans fishgen registered at load; without this the form asked for '<look>~f:...', which has no plan (2026-11-25)
  const base = s.formBase ?? s.art, art = formArt(base, c, t), k = s.look + '|' + art;
  let r = formCache.get(k);
  if (!r) { const m = artMeta(art); r = { ...s, art, look: formArt(s.look, c, t), aspect: s.formBase ? m?.aspect ?? s.aspect : s.aspect === artMeta(s.art)?.aspect ? m?.aspect ?? s.aspect : s.aspect, rest: m?.rest ?? s.rest, albinoForm: undefined, female: undefined }; formCache.set(k, r); }
  return r;
}
/** This fish's total length (mm): its custom size if set, else the adult length of its sex. */
export const fishTL = (f: { tl?: number; sex?: Sex }, sp: Species) => f.tl ?? (f.sex === 'f' && sp.female ? sp.female.tl : sp.tl);
/** Always rests on the ground or hardscape (bottom dwellers, land animals and snails not on glass); 'both' animals depend on the water at their spot. */
export const restsOnFloor = (sp: Species, surface?: string) => surface !== 'glass' && surface !== 'top' && (sp.zone === 'bottom' || sp.habitat === 'land' || sp.kind === 'snail' || sp.kind === 'sessile');
/** Can it cling to this surface? */
export const clingsTo = (sp: Species, surface: Surface) => !!sp.surfaces?.includes(surface);
/** May sit on the top of a plant leaf: a water or snail animal that uses hardscape (not land climbers, which perch on dry wood). */
export const onLeaves = (sp: Species) => sp.habitat !== 'land' && clingsTo(sp, 'hardscape');
/** How level a leaf must be for it to sit there (the y of its normal): a perching animal (dwarf frog: no glass) needs a fairly flat
 *  one, one that clings (snail, shrimp, oto: they hang under leaves too) a steeper one. 0 = not on leaves. */
export const leafUp = (sp: Species) => !onLeaves(sp) ? 0 : clingsTo(sp, 'under') ? 0.3 : 0.6;
/** Needs water: hidden in a dry tank. */
export const needsWater = (sp: Species) => sp.habitat === 'water';
/** Short list tag: snail, bottom, land or amphibious. */
export const speciesTag = (sp: Species) => sp.kind === 'sessile' ? 'sessile' : sp.kind === 'snail' ? 'snail' : sp.zone === 'bottom' ? 'bottom' : sp.habitat === 'land' ? 'land' : sp.habitat === 'both' ? 'amphibious' : '';

/** Case- and accent-insensitive search over common and scientific names; prefix matches rank first. */
/** The Animals categories offered in this scope. */
export const categoriesInScope = () => CATEGORIES.filter(([k]) => speciesInScope({ cat: k, habitat: 'water' }));
/** AL1 part 3: does the search ask for the albino form ("albino cory", "albino pleco", just "albino")? Such a search lists the species sold in that form. */
export const wantsAlbino = (q: string) => /\balbinos?\b/i.test(q);
export function searchSpecies(q0: string, cat?: Category): Species[] {
  const albino = wantsAlbino(q0), q = albino ? q0.replace(/\balbinos?\b/gi, ' ') : q0;
  const pool = scopeSpecies((cat ? SPECIES.filter(s => s.cat === cat) : SPECIES).filter(s => !albino || s.albino));   // AQ1: aquarium scope hides herps (src/scope.ts)
  const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return [...pool].sort((a, b) => a.name.localeCompare(b.name));
  const scored: [number, Species][] = [];
  for (const s of pool) {
    const tags = ' ' + speciesTag(s);
    const hay = norm(s.name + ' ' + s.sci + ' ' + s.id + tags), words = hay.split(/\s+/);
    if (!terms.every(t => hay.includes(t))) continue;
    const prefix = terms.filter(t => words.some(w => w.startsWith(t))).length;
    scored.push([prefix + (terms.includes(norm(s.id)) ? 1 : 0), s]); // an id typed whole ranks first (S238: 'neon' is the neon tetra, not the green neon)
  }
  return scored.sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name)).map(x => x[1]);
}
