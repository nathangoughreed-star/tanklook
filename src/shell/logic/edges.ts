// GS3 (2026-11-16; Nathan: "include an edge treatment like raw / flat polish / beveled and ground"): the finish of the glass edges, for the whole tank.
// Recorded with the custom tank and shown in its summary. It does NOT change the safety factor: no independent test data compares the strength of
// raw, ground, polished and beveled edges on annealed glass (aquarium makers claim polish is stronger; that is a vendor claim).
import type { EdgeFinish } from '../../scene/customTanks';

export const EDGE_OPTS: [EdgeFinish, string][] = [['raw', 'Raw'], ['ground', 'Ground'], ['polish', 'Polish'], ['bevel', 'Bevel']];
export const EDGE_WORD: Record<EdgeFinish, string> = { raw: 'raw', ground: 'ground', polish: 'flat polished', bevel: 'beveled' };
export const EDGE_HELP: Record<EdgeFinish, string> = {
  raw: 'as cut: sharp and chipped, not for an edge anyone can touch',
  ground: 'seamed: the sharp arris sanded off, safe to handle, a frosted look',
  polish: 'flat polished: a clear, glossy edge, the usual finish on a rimless tank',
  bevel: 'beveled: an angled polish, a decorative edge, needs 1/4 in (6 mm) glass or thicker',
};
/** What a tank has when nothing was picked: a rimless tank shows its edges, so they are polished; a rimmed tank's trim hides them, so ground. */
export const defaultEdge = (rim: boolean): EdgeFinish => rim ? 'ground' : 'polish';
export const edgeOf = (e: EdgeFinish | undefined, rim: boolean): EdgeFinish => e ?? defaultEdge(rim);
export const edgeSummary = (e: EdgeFinish): string => `${EDGE_WORD[e]} edges`;

/** Plain-words warnings for the finish in use (glass thickness in mm). */
export function edgeWarnings(e: EdgeFinish, glassMm: number, rim: boolean): string[] {
  const out: string[] = [];
  if (e === 'raw') out.push(rim ? 'A raw edge is only for a part hidden in the trim: it is sharp and chips easily.' : 'A raw edge is sharp and chipped as cut. On a rimless tank every top edge shows and gets handled: have it ground or polished.');
  if (e === 'bevel' && glassMm < 6.3) out.push('A bevel needs 1/4 in (6 mm) glass or thicker; a glass shop will not cut one on thinner glass.');
  return out;
}
