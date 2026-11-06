// The room (ambient) light, one value with one home: the little sun slider on the main viewing screen (lane UI4, Nathan 2026-11-06: "move the ambient light to a slider
// on the main viewing screen. Default it to high until a light is added to the tank."). `light.room` is what the slider stores; `light.roomAuto` says the person has not
// moved it, so the room follows the tank: HIGH while the tank has no light (the empty room, a bare tank, a light of "none"), LOW (ED1's 0.05) once it has one, so the
// tank's own light carries the look. A manual move drops `roomAuto` and the stored value is then kept whatever is added or removed. Files saved before this have no
// `roomAuto`, so they load with the value they stored. Everything that draws or reports the room light reads `roomOf`, never `light.room`.
import type { LightSettings } from './types';

/** What the slider's top is: the renderer's roomLevel is already full from 0.3 up (render/lighting.ts), so the slider stops there. */
export const ROOM_MAX = 0.3;
/** The room light while the tank has no light: the top of the slider, the room and the tank both read clearly. */
export const ROOM_HIGH = ROOM_MAX;
/** The room light once the tank has a light (Nathan's darkness check, ED1): the tank carries the look. */
export const ROOM_LOW = 0.05;

/** "A light is added": the fixture is anything but "none" (`light.type` 'flat'). Every way of adding one (Tech / Lighting, a kit that includes one, a catalogue light, a
 *  generated setup, a deal) sets `light.type`, and the renderer lights the tank from a fixture exactly when this is true (lighting.ts setLightUniforms). */
export const hasTankLight = (l: Pick<LightSettings, 'type'>) => l.type !== 'flat';

/** The room light that is drawn and shown: the stored value when the person set it, else the rule above. */
export function roomOf(l: Pick<LightSettings, 'type' | 'room' | 'roomAuto'>): number {
  return l.roomAuto ? (hasTankLight(l) ? ROOM_LOW : ROOM_HIGH) : l.room;
}

/** The slider moved: the person's value from now on (clamped to the slider's range). Mutates and returns `l`. */
export function setRoomByHand<T extends LightSettings>(l: T, v: number): T {
  l.room = Math.min(ROOM_MAX, Math.max(0, v)); delete l.roomAuto; return l;
}

/** Back to following the tank (the slider's "Auto"). Mutates and returns `l`. */
export function setRoomAuto<T extends LightSettings>(l: T): T {
  l.room = ROOM_LOW; l.roomAuto = true; return l;
}
