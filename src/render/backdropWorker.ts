// The 3D backdrop's texture bake off the page (BD1, R199): render/backdrop.ts posts a job, gets the pixels back (transferred).
import { bakeData, type BakeJob } from './backdropField';

self.onmessage = (e: MessageEvent<{ id: number; job: BakeJob }>) => {
  const out = bakeData(e.data.job);
  (self as unknown as Worker).postMessage({ id: e.data.id, out }, [out.alb.buffer, out.nrm.buffer]);
};
