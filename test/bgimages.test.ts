import { describe, expect, it } from 'vitest';
import { defaultScene } from '../src/scene/defaults';
import { getImage, imageId, putImage, sidesTouch, withImages } from '../src/scene/images';
import { parseScene } from '../src/scene/validate';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('background pictures', () => {
  it('sides must touch round the tank', () => {
    expect(sidesTouch(['back'])).toBe(true);
    expect(sidesTouch(['left', 'back'])).toBe(true);
    expect(sidesTouch(['left', 'back', 'right'])).toBe(true);
    expect(sidesTouch(['front', 'left'])).toBe(true); // wraps round
    expect(sidesTouch(['left', 'right'])).toBe(false);
    expect(sidesTouch(['back', 'front'])).toBe(false);
    expect(sidesTouch(['back', 'left', 'right', 'front'])).toBe(true);
  });

  it('a file carries its pictures and opens with them', () => {
    const sc = defaultScene(), { id } = putImage(PNG);
    sc.tanks[0].render.bgImages = [{ img: id, fit: 'fit', sides: ['back', 'left'], scale: 50 }];
    const file = JSON.parse(JSON.stringify(withImages(sc)));
    expect(file.images[id]).toBe(PNG);
    const { scene } = parseScene(file);
    expect(scene.tanks[0].render.bgImages).toEqual([{ img: id, fit: 'fit', sides: ['back', 'left'], scale: 50 }]);
    expect((scene as unknown as { images?: unknown }).images).toBeUndefined();
    expect(getImage(imageId(PNG))).toBe(PNG);
  });

  it('untrusted picture lists are cleaned', () => {
    const sc = JSON.parse(JSON.stringify(defaultScene()));
    sc.tanks[0].render.bgImages = [
      { img: 'abc', fit: 'zoom', sides: ['left', 'right'], scale: 999 }, // sides apart: keeps the first
      { img: 'def', fit: 'tile', sides: ['left', 'back'], scale: 30 },   // left already taken
      { img: '../x', sides: ['front'] },
    ];
    const r = parseScene(sc).scene.tanks[0].render.bgImages;
    expect(r).toEqual([{ img: 'abc', fit: 'fill', sides: ['left'], scale: 200 }, { img: 'def', fit: 'tile', sides: ['back'], scale: 30 }]);
    delete sc.tanks[0].render.bgImages;
    expect(parseScene(sc).scene.tanks[0].render.bgImages).toEqual([]);
  });
});
