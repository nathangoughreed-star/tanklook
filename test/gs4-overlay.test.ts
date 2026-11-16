// GS4 follow-up (R110): the 3D overlay of "Where it fails": on only while the section is open, bulge = the solver's deflection x the shown exaggeration,
// nothing left behind, nothing in the pick lists.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { IN_MM } from '../src/scene/glassSolver';
import { diagnose, deflText, type Diagnosis } from '../src/scene/glassDiagnose';
import { buildOverlay, failOverlay, outwardSign, paneScale, paneVertices } from '../src/shell/failOverlay';

const T14 = 0.25 * IN_MM, L = 36 * IN_MM, H = 18 * IN_MM, D = 18 * IN_MM;
const diag = (h = H): Diagnosis => diagnose(L, h, 'none', { glass: T14, strip: T14, stripWidth: 3 * IN_MM, sf: 3.8, D });
const dims = { L, D, H, t: T14 };

function fakeViewer() {
  const scene = new THREE.Scene(), listeners = new Set<() => void>(), cam = new THREE.PerspectiveCamera(40, 1, 10, 100000);
  cam.position.set(L / 2, H, 2000); cam.lookAt(L / 2, H / 2, -D / 2); cam.updateMatrixWorld();
  const vp = { scene, cam, x: 0, y: 0, w: 400, h: 300, fishMeshes: [] as THREE.Mesh[], itemMeshes: [] as THREE.Mesh[], dotMeshes: [] as THREE.Mesh[] };
  const host = new EventTarget() as unknown as HTMLElement;
  (host as unknown as { getBoundingClientRect: () => unknown }).getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, x: 0, y: 0 });
  const viewer = { vps: [vp], host, invalidate: () => undefined, onDrawn: (fn: () => void) => { listeners.add(fn); }, drawnListeners: listeners };
  return { viewer, vp, host, draw: () => listeners.forEach(f => f()) };
}
const store = { scene: { active: 0 } } as never;

describe('GS4 overlay geometry', () => {
  it('the bulge is the solver deflection times the shown exaggeration; stress mode is flat', () => {
    const d = diag();
    for (const p of d.panes) {
      const N = paneScale(p), v = paneVertices(p, 'defl', N), sg = outwardSign(p), { nx, ny, w } = p.grid;
      for (const [i, j] of [[0, 0], [nx >> 1, ny >> 1], [nx - 1, ny - 1], [3, ny - 2]]) expect(v[(j * nx + i) * 3 + 2], `${p.id} ${i},${j}`).toBeCloseTo(sg * w[j][i] * N, 4); // stored as float32
      let top = 0; for (let k = 2; k < v.length; k += 3) top = Math.max(top, Math.abs(v[k]));
      expect(top).toBeCloseTo(p.w * N, 3); // the deepest point = the true maximum x the factor
      expect(paneVertices(p, 'stress').every((x, k) => k % 3 !== 2 || x === 0)).toBe(true);
    }
  });
  it('panes bow outward and sit on the right sides of the glass', () => {
    const d = diag(), o = buildOverlay(d, 'defl', dims, 'in'), by = (side: string) => o.panes.find(p => p.side === side)!;
    const out = (side: string) => {
      const m = by(side), p = d.panes.find(q => q.id === m.id)!, N = paneScale(p), g = m.group, { nx, ny } = p.grid;
      const a = new THREE.Vector3(p.a / 2, p.b / 2, 0), b = new THREE.Vector3(p.a / 2, p.b / 2, outwardSign(p) * p.grid.w[ny >> 1][nx >> 1] * N);
      g.updateMatrixWorld(true); return { flat: g.localToWorld(a.clone()), bowed: g.localToWorld(b.clone()) };
    };
    const f = out('front'), bk = out('back'), l = out('left'), r = out('right'), bt = out('bottom');
    expect(f.flat.z).toBeCloseTo(T14 + 0.3, 6); expect(f.bowed.z).toBeGreaterThan(f.flat.z);
    expect(bk.flat.z).toBeCloseTo(-D - T14 - 0.3, 6); expect(bk.bowed.z).toBeLessThan(bk.flat.z);
    expect(l.flat.x).toBeCloseTo(-T14 - 0.3, 6); expect(l.bowed.x).toBeLessThan(l.flat.x);
    expect(r.flat.x).toBeCloseTo(L + T14 + 0.3, 6); expect(r.bowed.x).toBeGreaterThan(r.flat.x);
    expect(bt.flat.y).toBeCloseTo(-T14 - 0.3, 6); expect(bt.bowed.y).toBeLessThan(bt.flat.y);
    const box = (m: ReturnType<typeof by>) => new THREE.Box3().setFromObject(m.mesh);
    expect(box(by('front')).max.x - box(by('front')).min.x).toBeCloseTo(L, 3); expect(box(by('left')).max.z - box(by('left')).min.z).toBeCloseTo(D, 3);
    expect(box(by('front')).max.y).toBeGreaterThan(0.99 * H);
  });
  it('labels: psi and SF in inches, MPa in metric, the true deflection in deflection mode', () => {
    const d = diag(), s = buildOverlay(d, 'stress', dims, 'in'), m = buildOverlay(d, 'stress', dims, 'cm'), f = buildOverlay(d, 'defl', dims, 'in');
    expect(s.anchors.length).toBe(3);
    expect(s.anchors.find(a => a.id === 'front')!.text).toBe(`${Math.round(d.panes[0].sigma * 145.038).toLocaleString('en-US')} psi · SF ${d.panes[0].sf.toFixed(1)}`);
    expect(m.anchors.find(a => a.id === 'front')!.text).toBe(`${d.panes[0].sigma.toFixed(2)} MPa · SF ${d.panes[0].sf.toFixed(1)}`);
    expect(f.anchors.find(a => a.id === 'front')!.text).toBe(deflText(d.panes[0].w, 'in'));
  });
});

describe('GS4 overlay lifecycle', () => {
  it('is on only while shown, adds one group to the viewport scene, and leaves nothing behind', () => {
    const f = fakeViewer(); failOverlay.attach(() => f.viewer as never, store, f.host);
    expect(failOverlay.on).toBe(false); expect(f.vp.scene.children.length).toBe(0);
    failOverlay.show(diag(), 'stress', dims, 'in');
    expect(failOverlay.on).toBe(true); expect(f.vp.scene.children.length).toBe(1); expect(f.vp.scene.children[0].name).toBe('fail-overlay');
    failOverlay.show(diag(), 'defl', dims, 'in'); // a mode change rebuilds, never stacks
    expect(f.vp.scene.children.length).toBe(1);
    failOverlay.hide();
    expect(failOverlay.on).toBe(false); expect(f.vp.scene.children.length).toBe(0); expect(failOverlay.anchors).toEqual([]);
    failOverlay.show(diag(), 'stress', dims, 'in'); failOverlay.detach(); // closing the maker removes it too
    expect(f.vp.scene.children.length).toBe(0); expect(failOverlay.on).toBe(false);
    f.draw(); expect(f.vp.scene.children.length).toBe(0);
  });
  it('is never in a pick list, and a rebuilt scene gets it back on the next draw', () => {
    const f = fakeViewer(); failOverlay.attach(() => f.viewer as never, store, f.host); failOverlay.show(diag(), 'stress', dims, 'in');
    failOverlay.root!.traverse(o => { for (const list of [f.vp.fishMeshes, f.vp.itemMeshes, f.vp.dotMeshes]) expect(list.includes(o as THREE.Mesh)).toBe(false); });
    f.vp.scene = new THREE.Scene(); // the viewer rebuilt the tank scene
    expect(f.vp.scene.children.length).toBe(0); f.draw(); expect(f.vp.scene.children.length).toBe(1);
    failOverlay.detach();
  });
  it('hovering a pane lights it and fades the others; hiding clears the highlight', () => {
    const f = fakeViewer(); failOverlay.attach(() => f.viewer as never, store, f.host); failOverlay.show(diag(), 'stress', dims, 'in');
    let got: string | null = 'none'; const off = failOverlay.onHot(h => { got = h; });
    failOverlay.setHot('ends');
    const op = (id: string) => failOverlay.root!.children.map(g => g.children[0] as THREE.Mesh).filter(m => m.userData.failPane === id).map(m => (m.material as THREE.MeshBasicMaterial).opacity);
    expect(got).toBe('ends'); expect(op('ends')[0]).toBeGreaterThan(op('front')[0]); expect(op('front')[0]).toBeLessThan(0.3);
    failOverlay.hide(); expect(failOverlay.hovered).toBeNull(); off(); failOverlay.detach();
  });
});
