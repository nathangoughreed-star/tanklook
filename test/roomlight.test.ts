// Lane UI4 (2026-11-06): the room light follows the tank until the person moves the slider (src/scene/roomlight.ts).
import { describe, expect, it } from 'vitest';
import { getTankModel } from '../src/data/tanks';
import { emptyBuild } from '../src/scene/builds';
import { emptyScene } from '../src/scene/defaults';
import { DEFAULT_ENVIRONMENT } from '../src/scene/defaultEnvironment';
import { applyKitLight } from '../src/scene/kitlight';
import { ROOM_HIGH, ROOM_LOW, ROOM_MAX, hasTankLight, roomOf, setRoomAuto, setRoomByHand } from '../src/scene/roomlight';
import { sandboxRoomScene } from '../src/scene/sandboxRoom';
import { roomLevel } from '../src/render/lighting';
import { parseScene } from '../src/scene/validate';
import { Store } from '../src/scene/store';
import type { TankSetup } from '../src/scene/types';

const M40 = getTankModel('g40b')!;
const withLight = (S: TankSetup) => applyKitLight(S, { light: { type: 'led', tech: 'led-white', count: 1, watts: 20, spec: 'listing' }, lid: 'open' } as never);

describe('the room light rule', () => {
  it('high is the slider\'s top, where the renderer is already full; low is ED1\'s 0.05', () => {
    expect(ROOM_HIGH).toBe(ROOM_MAX); expect(roomLevel(ROOM_HIGH)).toBe(1);
    expect(ROOM_LOW).toBe(DEFAULT_ENVIRONMENT.room); expect(ROOM_LOW).toBe(0.05);
  });
  it('no light (the empty Sandbox room, a bare tank, any light of "none") -> high', () => {
    for (const S of [sandboxRoomScene('freshwater').tanks[0], sandboxRoomScene('terrarium').tanks[0], emptyScene().tanks[0]]) {
      expect(hasTankLight(S.light)).toBe(false); expect(roomOf(S.light)).toBe(ROOM_HIGH);
    }
  });
  it('a light added -> low, and removed -> high again, with no stored change', () => {
    const S = sandboxRoomScene('freshwater').tanks[0];
    expect(roomOf(S.light)).toBe(ROOM_HIGH);
    const L = withLight(S);
    expect(hasTankLight(L.light)).toBe(true); expect(roomOf(L.light)).toBe(ROOM_LOW);
    expect(roomOf({ ...L.light, type: 'flat' })).toBe(ROOM_HIGH);
  });
  it('a generated setup (it has a light) comes in at the low default', () => {
    const S = emptyBuild(M40).setup;
    expect(hasTankLight(S.light)).toBe(true); expect(roomOf(S.light)).toBe(ROOM_LOW);
  });
  it('a value the person set is kept when a light is added or removed', () => {
    const S = sandboxRoomScene('freshwater').tanks[0];
    setRoomByHand(S.light, 0.2);
    expect(S.light.roomAuto).toBeUndefined();
    const L = withLight(S);
    expect(roomOf(L.light)).toBe(0.2);
    expect(roomOf({ ...L.light, type: 'flat' })).toBe(0.2);
    setRoomByHand(L.light, 0); expect(roomOf(L.light)).toBe(0);   // a dark room is a choice too
    setRoomByHand(L.light, 5); expect(roomOf(L.light)).toBe(ROOM_MAX);
  });
  it('Auto hands the room back to the tank', () => {
    const L = withLight(emptyScene().tanks[0]); setRoomByHand(L.light, 0.2); setRoomAuto(L.light);
    expect(roomOf(L.light)).toBe(ROOM_LOW); expect(roomOf({ ...L.light, type: 'flat' })).toBe(ROOM_HIGH);
  });
  it('the slider move is one undoable edit that survives a save and load', () => {
    const st = new Store(sandboxRoomScene('freshwater'));
    st.edit(s => { setRoomByHand(s.light, 0.12); });
    expect(roomOf(st.tank.light)).toBe(0.12);
    const back = parseScene(JSON.parse(JSON.stringify(st.scene))).scene.tanks[0];
    expect(back.light.roomAuto).toBeUndefined(); expect(roomOf(back.light)).toBe(0.12);
    st.undo(); expect(roomOf(st.tank.light)).toBe(ROOM_HIGH);
  });
  it('the auto flag survives a save and load', () => {
    const s = parseScene(JSON.parse(JSON.stringify(sandboxRoomScene('freshwater')))).scene.tanks[0];
    expect(s.light.roomAuto).toBe(true); expect(roomOf(s.light)).toBe(ROOM_HIGH);
  });
  it('older saves (no roomAuto) load with the room light they stored, light or no light', () => {
    for (const [type, room] of [['flat', 0.15], ['led', 0.15], ['flat', 0.05], ['spot', 0.4], ['led', 0]] as const) {
      const raw = JSON.parse(JSON.stringify(emptyScene())); delete raw.tanks[0].light.roomAuto; raw.tanks[0].light.room = room; raw.tanks[0].light.type = type;
      const S = parseScene(raw).scene.tanks[0];
      expect(S.light.roomAuto).toBeUndefined(); expect(roomOf(S.light)).toBe(room);
    }
  });
});
