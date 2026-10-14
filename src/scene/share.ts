// Shareable scene links (lane N, review item R12, 2026-10-14): the saved scene (the same JSON as Save / Download),
// deflated with the browser's CompressionStream and base64url-encoded into the URL hash. No server: the hash never
// leaves the browser, so the link holds the tank and nothing else. Opening one goes through parseScene like a file.
import type { Scene } from './types';
import { SceneError, parseScene } from './validate';

/** Hash prefix of a share link: `#tank=<base64url of the deflated scene JSON>`. */
export const SHARE_PREFIX = '#tank=';
/** Above this a link may be cut short by some chat apps (Discord's message limit, old SMS gateways). */
export const LONG_LINK = 2000;
/** A scene inflates to well under this; anything bigger is not a tank (a deflate bomb or junk). */
const MAX_JSON = 5e6;

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream, limit = Infinity): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream).getReader();
  const parts: Uint8Array[] = [];
  let n = 0;
  for (;;) {
    const { done, value } = await out.read();
    if (done) break;
    n += value.length;
    if (n > limit) { await out.cancel(); throw new SceneError('That share link is too large to be a tank.'); }
    parts.push(value);
  }
  const all = new Uint8Array(n);
  let at = 0;
  for (const p of parts) { all.set(p, at); at += p.length; }
  return all;
}

function toB64url(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) throw new SceneError('That share link is damaged (it has characters a link never holds).');
  let bin: string;
  try { bin = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - text.length % 4) % 4)); }
  catch { throw new SceneError('That share link is damaged (cut short or mistyped).'); }
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

/** The hash part of a share link for `scene` (starts with `#tank=`). */
export async function shareHash(scene: Scene): Promise<string> {
  const bytes = await pipe(new TextEncoder().encode(JSON.stringify(scene)), new CompressionStream('deflate'));
  return SHARE_PREFIX + toB64url(bytes);
}

/** A full link: `base` (the page's own address, without its hash) plus the scene's hash. */
export async function shareUrl(scene: Scene, base: string): Promise<string> {
  return base.replace(/#.*$/, '') + await shareHash(scene);
}

/** Whether a location hash is a share link (then `readShare` opens it). */
export const isShareHash = (hash: string) => hash.startsWith(SHARE_PREFIX);

/** The scene in a share link's hash, validated like an opened file. Throws SceneError with a readable message. */
export async function readShare(hash: string): Promise<{ scene: Scene; warnings: string[] }> {
  if (!isShareHash(hash)) throw new SceneError('Not a share link.');
  const body = hash.slice(SHARE_PREFIX.length).trim();
  if (!body) throw new SceneError('That share link is empty (the tank part is missing).');
  let json: string;
  try { json = new TextDecoder('utf-8', { fatal: true }).decode(await pipe(fromB64url(body), new DecompressionStream('deflate'), MAX_JSON)); }
  catch (e) { throw e instanceof SceneError ? e : new SceneError('That share link is damaged (cut short or mistyped).'); }
  return parseScene(json);
}
