// The Sandbox's first screen (lane ST1, Nathan 2026-11-05): "start with nothing in the room, with the person". A scene of the chosen kind with Nathan's default
// environment (scene/defaultEnvironment.ts: person, back wall, low room light, camera) and no stand. The scene still holds a stand-in tank (a saved scene always has
// one); the viewer draws none of it while `tankView.empty` is set, and the picker (ui/tankDock.ts) puts the real one in.
import { emptyScene } from './defaults';
import { withDefaultEnvironment } from './defaultEnvironment';
import { applyKind, type SetupKind } from './pickerKind';
import { putOnFloor } from './placement';
import type { Scene } from './types';

/** The empty room of a kind: a bare scene with the default environment, the stand-in tank on the floor. */
export function sandboxRoomScene(kind: SetupKind): Scene {
  const s = emptyScene(); s.name = 'New tank';
  const T = s.tanks[0];
  applyKind(T, kind);
  withDefaultEnvironment(T);
  putOnFloor(T);
  return s;
}
