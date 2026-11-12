// Evaluated first by test/anchorbase.test.ts: the anchor baseline predates fx embed (VF-C2, on by default), so it is pinned off before anything else loads.
import { setFx } from '../src/render/fx';
setFx({ embed: false });
