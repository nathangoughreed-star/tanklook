/// <reference types="webxr" />
// AR photo (Nathan 2026-10-14): the camera image with the tank drawn over it, as the phone shows it, saved as a JPEG.
// The page never sees the composited AR view, so it rebuilds it: WebXR raw camera access ('camera-access', Android
// Chrome) hands over the camera frame as a GL texture; that is drawn full frame into an offscreen target, the tank
// scene on top with the view's own camera, then the result is read back. The DOM overlay (buttons, hints) is not in it.
import * as THREE from 'three';

// a render target stays linear (three converts to sRGB only on the way to the screen), so the camera frame is decoded
// on the way in and the result encoded on the way out; the tank renders in between in half float, with no banding
const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const quad = (frag: string) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { tex: { value: null } }, vertexShader: VERT, fragmentShader: frag, depthTest: false, depthWrite: false,
  }));
  m.frustumCulled = false;
  return m;
};
const DECODE = `uniform sampler2D tex; varying vec2 vUv;
void main() { vec3 c = texture2D(tex, vUv).rgb; gl_FragColor = vec4(mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)), 1.0); }`;
const ENCODE = `uniform sampler2D tex; varying vec2 vUv;
void main() { vec3 c = clamp(texture2D(tex, vUv).rgb, 0.0, 1.0); gl_FragColor = vec4(mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)), 1.0); }`;

let parts: { cam: THREE.Mesh; enc: THREE.Mesh; ortho: THREE.Camera } | undefined;

/**
 * Draw camera frame + scene into a w x h canvas. Call inside the XR frame, after that frame's render (the XR camera
 * `view` is then up to date). `glTex` is the frame's camera image (XRWebGLBinding.getCameraImage).
 */
export function composePhoto(r: THREE.WebGLRenderer, glTex: WebGLTexture, w: number, h: number, scene: THREE.Scene, view: THREE.Camera) {
  parts ??= { cam: quad(DECODE), enc: quad(ENCODE), ortho: new THREE.Camera() };
  const camTex = new THREE.Texture(); // wraps the XR-owned GL texture: version 0, so three binds it and never uploads
  (r.properties.get(camTex) as { __webglTexture?: WebGLTexture }).__webglTexture = glTex;
  const hdr = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType });
  const out = new THREE.WebGLRenderTarget(w, h);
  const cam = new THREE.PerspectiveCamera(); cam.matrixAutoUpdate = false; cam.matrixWorldAutoUpdate = false;
  cam.projectionMatrix.copy(view.projectionMatrix); cam.projectionMatrixInverse.copy(view.projectionMatrixInverse);
  cam.matrixWorld.copy(view.matrixWorld); cam.matrixWorldInverse.copy(view.matrixWorldInverse);
  const px = new Uint8Array(w * h * 4), xr = r.xr.enabled, auto = r.autoClear;
  try {
    r.xr.enabled = false; // render with this camera into the target, not the XR views into the XR framebuffer
    (parts.cam.material as THREE.ShaderMaterial).uniforms.tex.value = camTex;
    r.setRenderTarget(hdr); r.autoClear = true; r.render(parts.cam, parts.ortho);
    r.autoClear = false; r.clearDepth(); r.render(scene, cam);
    (parts.enc.material as THREE.ShaderMaterial).uniforms.tex.value = hdr.texture;
    r.setRenderTarget(out); r.autoClear = true; r.render(parts.enc, parts.ortho);
    r.readRenderTargetPixels(out, 0, 0, w, h, px);
  } finally {
    r.setRenderTarget(null); r.xr.enabled = xr; r.autoClear = auto;
    r.properties.remove(camTex); hdr.dispose(); out.dispose();
    (parts.cam.material as THREE.ShaderMaterial).uniforms.tex.value = null; (parts.enc.material as THREE.ShaderMaterial).uniforms.tex.value = null;
  }
  // GL rows run bottom-up
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!, img = g.createImageData(w, h), row = w * 4;
  for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * row, (h - y) * row), y * row);
  g.putImageData(img, 0, 0);
  return c;
}

/** File name for a photo taken now: tanklook-ar-2026-10-14-153012.jpg (local time). */
export function photoName(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `tanklook-ar-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.jpg`;
}

/** Save the canvas as a JPEG download (to the phone's Downloads; the share sheet would leave the AR session). */
export async function savePhoto(c: HTMLCanvasElement, name = photoName()) {
  const blob = await new Promise<Blob | null>(done => c.toBlob(done, 'image/jpeg', 0.92));
  if (!blob) throw new Error('could not encode the photo');
  const a = document.createElement('a'), url = URL.createObjectURL(blob);
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
