// Explore Complete Setups, stage X3 (lane OX5): what a click on a card WRITES (pure; the screen only calls these). Two writers, kept apart:
//   the saved-candidate store (explore/store.ts): the record's reaction (like / pass / unrated, and Favourites separately);
//   the preference profile (brief item `preferences.aspects`, explore/aspects.ts): what the reaction teaches the ranking.
// Neither is a limit and neither can become one: a reaction never calls anything in scene/project.ts (`setConstraint`, `applyChange`); only the screen's explicit "Adjust constraints" does that, elsewhere.
// Unrated is no event at all. A Pass is evidence about THIS candidate (aspects.ts keeps a world / look family from being lowered by an unattributed Pass). Save is a weak positive and commits nothing.
import { clearItem, setItem, type Brief } from '../../scene/brief';
import { aspectsOf, recordAspect, undoAspectsOf, type Aspects, type AspectTag } from '../../explore/aspects';
import type { ExploreStore } from '../../explore/store';
import type { StoredCandidate, StoredLite } from '../../explore/candidate';

export type Action = 'like' | 'pass' | 'save' | 'unsave' | 'unrated';
export interface Outcome { brief: Brief; /** the record after the click (undefined when the store could not keep it) */ record?: StoredLite }

const rewrite = (b: Brief, a: Aspects | undefined): Brief => a && (a.events.length || (a.told && Object.keys(a.told).length)) ? setItem(b, 'preferences.aspects', a, 'preference') : clearItem(b, 'preferences.aspects');
/** Take back this candidate's Favourites event only (its like / pass / tags stay). */
const withoutSave = (b: Brief, id: string): Brief => { const p = aspectsOf(b); return p ? rewrite(b, { ...p, events: p.events.filter(e => !(e.c === id && e.k === 'save')) }) : b; };

/** A click on Like / Pass / Save / Unrated. The record is put in the store on its first reaction (an unrated card is never stored); clicking the reaction already on a card takes it back. */
export function reactTo(db: ExploreStore, st: StoredCandidate | StoredLite, brief: Brief, action: Action, now = Date.now()): Outcome {
  const id = st.id;
  if (!db.has(id)) {
    if (action === 'unrated' || action === 'unsave') return { brief };
    const full = 'snapshot' in st ? st : db.get(id);
    if (!full || !db.put(full).stored) return { brief };
  }
  const cur = db.list().find(x => x.id === id)!, features = cur.features, state = cur.reaction.state, saved = cur.reaction.saved;
  let b = brief;
  const back = action === 'unrated' || (action === 'like' && state === 'liked') || (action === 'pass' && state === 'passed');
  if (action === 'save' || action === 'unsave') {
    const on = action === 'save' && !saved;
    if (on) b = recordAspect(b, { kind: 'save', c: id, features }); else b = withoutSave(b, id);
    return { brief: b, record: db.react(id, { saved: on }, now) };
  }
  // like / pass / unrated: this candidate's earlier like / pass / tags are replaced (a changed mind), its Favourites event kept
  b = undoAspectsOf(b, id); if (saved) b = recordAspect(b, { kind: 'save', c: id, features });
  if (back) return { brief: b, record: db.react(id, { state: 'unrated' }, now) };
  b = recordAspect(b, { kind: action === 'like' ? 'like' : 'pass', c: id, features });
  return { brief: b, record: db.react(id, { state: action === 'like' ? 'liked' : 'passed' }, now) };
}

/** The "What caught your eye?" / "What would you change?" panel's Done: the tags chosen speak for the aspects of this candidate under them (a Like's tags are what caught the eye, a Pass's what put the person off). */
export function tagReaction(brief: Brief, st: Pick<StoredLite, 'id' | 'features'>, mode: 'like' | 'pass', tags: readonly AspectTag[]): Brief {
  if (!tags.length) return brief;
  return recordAspect(brief, { kind: 'tag', c: st.id, features: st.features, ...(mode === 'like' ? { on: tags } : { off: tags }) });
}
