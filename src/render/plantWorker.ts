// Builds plants at full growth off the main thread (lane GR4): plant3d runJob, results moved back as plain arrays.
import { buffersOf, runJob, type PlantJob } from './plant3d';

self.onmessage = (e: MessageEvent<PlantJob>) => {
  const out = runJob(e.data);
  (self as unknown as Worker).postMessage(out, [...buffersOf(out)]);
};
