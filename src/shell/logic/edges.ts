// GS3 (2026-11-16; Nathan: "include an edge treatment like raw / flat polish / beveled and ground"): the finish of the glass edges, per pane group.
// Recorded with the custom tank and shown in its summary. It does NOT change the safety factor: no independent test data compares the strength of
// raw, ground, polished and beveled edges on annealed glass (aquarium makers claim polish is stronger; that is a vendor claim).
import type { EdgeFinish, EdgeSpec } from '../../scene/customTanks';

export const EDGE_OPTS: [EdgeFinish, string][] = [['raw', 'Raw'], ['ground', 'Ground'], ['polish', 'Polish'], ['bevel', 'Bevel']];
export const EDGE_WORD: Record<EdgeFinish, string> = { raw: 'raw', ground: 'ground', polish: 'flat polished', bevel: 'beveled' };
export const EDGE_HELP: Record<EdgeFinish, string> = {
  raw: 'as cut: sharp and chipped, not for an edge anyone can touch',
  ground: 'seamed: the sharp arris sanded off, safe to handle, a frosted look',
  polish: 'flat polished: a clear, glossy edge, the usual finish on a rimless tank',
  bevel: 'beveled: an angled polish, a decorative edge, needs 1/4 in (6 mm) glass or thicker',
};
export const EDGE_PANES: [keyof EdgeSpec, string][] = [['front', 'Front and back'], ['ends', 'Ends'], ['bottom', 'Bottom']];

/** What a tank has when nothing was picked: a rimless tank shows its edges, so they are polished; a rimmed tank's trim hides them, so ground. */
export const defaultEdges = (rim: boolean): EdgeSpec => { const f: EdgeFinish = rim ? 'ground' : 'polish'; return { front: f, ends: f, bottom: f }; };
export const edgesOf = (e: EdgeSpec | undefined, rim: boolean): EdgeSpec => e ?? defaultEdges(rim);
/** The one finish every pane group has, or null when they differ. */
export const sameEdge = (e: EdgeSpec): EdgeFinish | null => e.front === e.ends && e.ends === e.bottom ? e.front : null;
export const edgeSummary = (e: EdgeSpec): string => { const s = sameEdge(e); return s ? `${EDGE_WORD[s]} edges` : `edges ${EDGE_WORD[e.front]} / ${EDGE_WORD[e.ends]} / ${EDGE_WORD[e.bottom]}`; };

/** Plain-words warnings for the finish in use (glass thickness in mm). */
export function edgeWarnings(e: EdgeSpec, glassMm: number, rim: boolean): string[] {
  const out: string[] = [], vals = Object.values(e);
  if (!rim && vals.includes('raw')) out.push('A raw edge is sharp and chipped as cut. On a rimless tank every top edge shows and gets handled: have it ground or polished.');
  if (rim && vals.includes('raw')) out.push('A raw edge is only for a part hidden in the trim: it is sharp and chips easily.');
  if (vals.includes('bevel') && glassMm < 6.3) out.push('A bevel needs 1/4 in (6 mm) glass or thicker; a glass shop will not cut one on thinner glass.');
  return out;
}
