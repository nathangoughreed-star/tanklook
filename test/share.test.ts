import { describe, expect, it } from 'vitest';
import { EXAMPLES } from '../src/examples';
import { SCENES } from '../src/examples/scenes';
import { defaultScene } from '../src/scene/defaults';
import { SHARE_PREFIX, isShareHash, readShare, shareHash, shareUrl } from '../src/scene/share';
import { SceneError, parseScene } from '../src/scene/validate';

const b64url = (b: Uint8Array) => btoa(Array.from(b, c => String.fromCharCode(c)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const bytes = (x: string | Uint8Array) => typeof x === 'string' ? new TextEncoder().encode(x) : x;
const deflate = async (x: string | Uint8Array) =>
  new Uint8Array(await new Response(new Blob([bytes(x) as BlobPart]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
const link = async (x: string | Uint8Array) => SHARE_PREFIX + b64url(await deflate(x));

describe('share links (lane N, R12)', () => {
  it('round-trips every example and the default scene: scene -> link -> the same scene', async () => {
    const scenes = [defaultScene(), ...EXAMPLES.map(x => SCENES[x.id])].map(s => parseScene(s).scene); // as Save holds them, after validate
    for (const scene of scenes) {
      const hash = await shareHash(scene);
      expect(isShareHash(hash)).toBe(true);
      expect(hash.slice(SHARE_PREFIX.length)).toMatch(/^[A-Za-z0-9_-]+$/); // nothing to escape in a URL
      const back = await readShare(hash);
      expect(back.warnings).toEqual([]);
      expect(back.scene).toEqual(scene);
      expect(JSON.stringify(back.scene)).toBe(JSON.stringify(scene)); // same file, key order too
      expect(await shareHash(back.scene)).toBe(hash);                  // and the same link again
    }
  });

  it('builds a link on the page address, replacing any old hash', async () => {
    const s = defaultScene();
    const url = await shareUrl(s, 'https://example.test/app/?x=1#tank=old');
    expect(url.startsWith('https://example.test/app/?x=1#tank=')).toBe(true);
    expect((await readShare(new URL(url).hash)).scene).toEqual(s);
  });

  it('rejects malformed links with a readable SceneError, never a crash', async () => {
    const good = await shareHash(defaultScene());
    const bad = [
      '#view=1',                                            // not a share link
      SHARE_PREFIX,                                         // empty
      SHARE_PREFIX + 'abc$%^',                              // characters a link never holds
      SHARE_PREFIX + 'A',                                   // impossible base64 length
      good.slice(0, Math.floor(good.length / 2)),           // cut short (e.g. by a chat app)
      good.slice(0, -3) + (good.endsWith('AAA') ? 'BBB' : 'AAA'), // mistyped tail: deflate checksum fails
      SHARE_PREFIX + b64url(bytes('hello')),  // not deflated
      await link('not json'),       // deflated, not JSON
      await link('{"hello":1}'),    // JSON, not a scene
      await link('[1,2]'),
      await link(new Uint8Array([0xff, 0xfe, 0x00])), // not UTF-8
      await link(new Uint8Array(6e6).fill(32)), // inflates past the size cap
    ];
    for (const h of bad) {
      const err = await readShare(h).then(() => null, e => e);
      expect(err, h.slice(0, 40)).toBeInstanceOf(SceneError);
      expect((err as Error).message.length).toBeGreaterThan(5);
    }
  });
});
