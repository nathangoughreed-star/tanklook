// Lane HB1 part 2 (R62): the View menu's Room light slider writes light.room, drops roomAuto, one undo step per drag; Auto restores it.
import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/examples/scenes';
import { parseScene } from '../src/scene/validate';
import { Store } from '../src/scene/store';
import { ROOM_MAX, ROOM_LOW } from '../src/scene/roomlight';
import { roomRead, roomByHand, roomAuto } from '../src/shell/logic/view';

const mk = () => { const st = new Store(parseScene(JSON.parse(SCENES[Object.keys(SCENES)[0]])).scene); st.edit(t => { t.light.roomAuto = true; }); st.seal(); return st; };
describe('View > Room light', () => {
  it('moving it writes light.room and clears roomAuto; Auto brings it back', () => {
    const st = mk(); expect(roomRead(st).auto).toBe(true);
    roomByHand(st, 0.1); const l = st.tank.light;
    expect(l.room).toBe(0.1); expect(l.roomAuto).toBeUndefined(); expect(roomRead(st)).toMatchObject({ value: 0.1, auto: false });
    roomAuto(st); expect(st.tank.light.roomAuto).toBe(true); expect(st.tank.light.room).toBe(ROOM_LOW); expect(roomRead(st).auto).toBe(true);
  });
  it('clamps to 0..ROOM_MAX, words Dark / Dim / Bright, and a drag is one undo step', () => {
    const st = mk(); roomByHand(st, 5); expect(st.tank.light.room).toBe(ROOM_MAX); expect(roomRead(st).word).toBe('Bright');
    roomByHand(st, -1); expect(st.tank.light.room).toBe(0); expect(roomRead(st).word).toBe('Dark');
    roomByHand(st, 0.15); expect(roomRead(st).word).toBe('Dim');
    st.seal(); roomByHand(st, 0.02); roomByHand(st, 0.04); roomByHand(st, 0.06); st.undo();
    expect(st.tank.light.room).toBe(0.15);
  });
});
