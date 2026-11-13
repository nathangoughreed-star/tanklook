// UI2 shell: the small shared components of screen map §5 (tokens.css classes). One style each.
import type { ComponentChildren } from 'preact';
import { ICONS, type IconName } from './icons';
import type { Tone } from './logic/checks';

export const Icon = ({ name }: { name: IconName }) => (
  <svg class="i" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[name] }} />
);

export const Pill = ({ tone, children, title }: { tone: Tone; children: ComponentChildren; title?: string }) => (
  <span class={`pill${tone === 'neutral' ? '' : ' ' + tone}`} title={title}>{children}</span>
);

/** A read-only meter (tokens.css .bar): fill 0-100, coloured by tone. */
export const Meter = ({ fill, tone, label }: { fill: number; tone: Tone; label: string }) => (
  <div class="bar" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fill)}>
    <i class={tone === 'bad' ? 'bad' : tone === 'warn' ? 'warn' : ''} style={{ width: `${Math.max(0, Math.min(100, fill))}%` }} />
  </div>
);

/** A group that folds to a one-line summary (§5 "Panel, section head, group"). */
export function Group({ title, sum, open, onToggle, children }: { title: string; sum?: string; open: boolean; onToggle: () => void; children: ComponentChildren }) {
  return (
    <div class={`group${open ? ' open' : ''}`}>
      <button type="button" class="gh" aria-expanded={open} onClick={onToggle}>{title}{sum ? <span class="sum">{sum}</span> : null}</button>
      {open ? <div class="gb">{children}</div> : null}
    </div>
  );
}
