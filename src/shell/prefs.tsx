// UI2 shell step 5 (lane S5, 2026-11-14): the Preferences section (screen map §2a, R26): style cards with "Surprise me", Browse looks, the don't-want list.
// Draws logic/prefs.ts; writes through the old UI's `setBrief`. Looks are a taste, never a constraint: nothing here switches a limit on.
import { useEffect, useState } from 'preact/hooks';
import type { Store } from '../scene/store';
import { bindBriefStore, setBrief } from '../ui/setupBrief';
import { Group } from './ui';
import { directionFor, styleCards, cycleCard, avoidRows, toggleAvoid, browseLooks, toggleLook, prefsSummary, STATE_WORD } from './logic/prefs';

const KEY = 'tanklook.ui2.prefs';
const loadOpen = (): Record<string, boolean> => { try { return { looks: true, browse: false, avoid: true, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return { looks: true, browse: false, avoid: true }; } };

export function PreferencesSection({ store, onSurprise }: { store: Store; onSurprise: () => void }) {
  const [, bump] = useState(0);
  const [open, setOpen] = useState(loadOpen);
  useEffect(() => { bindBriefStore(store); }, [store]);
  useEffect(() => store.subscribe(k => { if (k !== 'view' && k !== 'select') bump(n => n + 1); }), [store]);
  bindBriefStore(store);
  const flip = (k: string) => { const n = { ...open, [k]: !open[k] }; setOpen(n); try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* lasts this visit */ } };
  const brief = store.tank.brief, d = directionFor(brief, store.tank);
  const cards = styleCards(brief, d), avoid = avoidRows(brief, d), looks = open.browse ? browseLooks(brief, d) : [], s = prefsSummary(brief, d);
  const write = (fn: (b: typeof brief) => NonNullable<typeof brief>) => setBrief(fn(store.tank.brief));
  return (
    <>
      <div class="hint limintro">The looks you like and the things you do not want. These steer Discover and Suggest; they never block anything.</div>
      <Group title="Looks" sum={open.looks ? undefined : s.looks} open={open.looks} onToggle={() => flip('looks')}>
        <div class="hint">Press a card: Interested, then Avoid, then clear.</div>
        <button type="button" class="card surprise" onClick={onSurprise} title="Open Discover with a broad mix of looks">
          <b>Surprise me</b><span>Skip the choosing: Discover shows a wide mix, one look from each family.</span></button>
        <div class="stylecards" role="group" aria-label="Looks you like">
          {cards.map(c => { const k = c.state ?? 'none'; return (
            <button type="button" class={`card style ${k}`} data-key={c.key} aria-pressed={c.state === 'interested' ? true : c.state === 'avoid' ? 'mixed' : false}
              aria-label={`${c.label}: ${STATE_WORD[k]}. ${c.blurb}`} onClick={() => write(b => cycleCard(b, c.key))}>
              <span class={`sthumb t-${c.key}`} aria-hidden="true"><img src={`${import.meta.env.BASE_URL}art/quick/${c.key}.webp`} alt="" loading="lazy" onError={e => ((e.target as HTMLElement).style.display = 'none')} /><i>{c.label.split(/[ /&]/)[0]}</i></span>
              <span class="sname">{c.label}</span><span class="sblurb">{c.blurb}</span><span class={`pill${k === 'interested' ? ' good' : k === 'avoid' ? ' bad' : ''} sst`}>{STATE_WORD[k]}</span>
            </button>); })}
        </div>
      </Group>
      <Group title="Browse looks" sum={open.browse ? undefined : 'every look we can build'} open={open.browse} onToggle={() => flip('browse')}>
        <div class="hint">Mark the ones that catch your eye; Discover leans toward them.</div>
        {looks.map(l => <button type="button" class={`card pick look${l.liked ? ' on' : ''}`} aria-pressed={l.liked} onClick={() => write(b => toggleLook(b, l.id))}>
          <span class="pbody"><span class="t"><b>{l.name}</b></span><span class="range">{l.tagline}</span></span><span class={`pill${l.liked ? ' good' : ''}`}>{l.liked ? 'Liked' : 'Like'}</span></button>)}
      </Group>
      <Group title="Do not want" sum={open.avoid ? undefined : s.avoid} open={open.avoid} onToggle={() => flip('avoid')}>
        <div class="hint">Left out of every suggestion.</div>
        <div class="avoidchips" role="group" aria-label="Things I do not want">
          {avoid.map(r => <button type="button" class={`btn sm${r.on ? ' on' : ''}`} aria-pressed={r.on} onClick={() => write(b => toggleAvoid(b, r.id))}>{r.label}</button>)}
        </div>
      </Group>
    </>
  );
}
