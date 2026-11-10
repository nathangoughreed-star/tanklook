// AB4: one plain picture per habitat answer (inline SVG, calm colours, no cartoon animals): the tank in section, the world in it.
import type { HabitatDirection } from '../scene/discoveryTypes';
const frame = (inner: string) => `<svg viewBox="0 0 150 100" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice"><rect width="150" height="100" fill="#dfe8ee"/>${inner}<rect x="14" y="16" width="122" height="68" rx="3" fill="none" stroke="#5b6b75" stroke-width="3"/></svg>`;
const sand = (y: number, c: string) => `<rect x="15" y="${y}" width="120" height="${84 - y - 1}" fill="${c}"/>`;
const plant = (x: number, h: number, c: string) => `<path d="M${x} 83 q-4 -${h / 2} 0 -${h} q4 ${h / 2} 0 ${h}z" fill="${c}"/>`;
export const HABITAT_PICS: Record<HabitatDirection, string> = {
  freshwater: frame(`<rect x="15" y="17" width="120" height="66" fill="#7fc3d9"/>${sand(72, '#c9b48a')}${plant(40, 34, '#3f8f4f')}${plant(52, 26, '#5aa860')}${plant(108, 30, '#3f8f4f')}<ellipse cx="80" cy="46" rx="9" ry="3.5" fill="#d9822b"/><ellipse cx="92" cy="38" rx="7" ry="3" fill="#d9822b"/>`),
  saltwater: frame(`<rect x="15" y="17" width="120" height="66" fill="#3f8fc0"/>${sand(74, '#e6dcc4')}<path d="M35 74 q4 -22 10 -4 q4 -18 10 4z" fill="#d9577a"/><path d="M90 74 q6 -26 12 -6 q6 -20 12 6z" fill="#e28a3c"/><ellipse cx="70" cy="44" rx="9" ry="3.5" fill="#f2c230"/>`),
  terrarium: frame(`<rect x="15" y="17" width="120" height="66" fill="#eef3ee"/>${sand(66, '#7a5a3a')}<rect x="28" y="56" width="34" height="11" rx="4" fill="#8a8f93"/>${plant(100, 30, '#4f8a45')}${plant(112, 22, '#6aa65a')}<ellipse cx="80" cy="60" rx="9" ry="3" fill="#6b8e3a"/>`),
  paludarium: frame(`<rect x="15" y="17" width="120" height="66" fill="#eef3ee"/><rect x="15" y="56" width="62" height="27" fill="#7fc3d9"/>${sand(76, '#8a6f4a')}<rect x="77" y="52" width="58" height="31" fill="#7a5a3a"/>${plant(100, 28, '#4f8a45')}${plant(118, 22, '#6aa65a')}${plant(32, 20, '#3f8f4f')}<ellipse cx="50" cy="66" rx="8" ry="3" fill="#d9822b"/>`),
  unsure: frame(`<rect x="15" y="17" width="120" height="66" fill="#e9eef1"/><text x="75" y="64" text-anchor="middle" font-size="44" font-family="system-ui,sans-serif" font-weight="600" fill="#6b7b86">?</text>`),
};
