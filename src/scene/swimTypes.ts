// Free-roam swimming (lane FX1, part 3): the contract between the three pieces, so they can be built apart.
//   swimField.ts (SW1)  builds a SwimField from a tank: glass, floor, water surface, hardscape, plants.
//   swimSim.ts   (SW2)  moves every fish (roam, school, graze) against a SwimField, in plain numbers; no three.js.
//   viewer / build (FX1) apply the sim's poses to the fish meshes each frame and own the Reset button.
// World units are the viewer's: millimetres, x along the tank, y up, z = -depth (z <= 0), as `m.position.set(x, y, -depth)`.

export type V3 = [number, number, number];

/** What a fish may not swim into. Built once per tank change (it may take tens of ms); every query after is cheap and allocation-free. */
export interface SwimField {
  /** Box the whole tank water volume lies in (x 0..L, y 0..waterTop, z -D..0). The glass shape (bowl, corner) is inside `clearance`, not here. */
  min: V3; max: V3;
  /** Water surface height (mm). */
  waterTop: number;
  /** Ground height at (x, z): the substrate or terrain surface (mm). */
  floorAt(x: number, z: number): number;
  /**
   * Distance (mm) from p to the nearest thing solid: glass, water surface, ground, hardscape, plants. Negative inside a solid.
   * `grad` (optional, written in place) = the unit direction pointing away from it. Capped: anything beyond `cap` mm returns `cap`.
   */
  clearance(x: number, y: number, z: number, grad?: V3, cap?: number): number;
}

/** What the sim needs to know about one animal. */
export interface SwimmerSpec {
  id: number;
  /** Total length (mm); the radius of its body for collision is about len * 0.12 (the sim chooses). */
  len: number;
  /** 'bottom' = a bottom dweller (grazes the substrate); otherwise swims in the water column. */
  zone: 'bottom' | 'water';
  /** Preferred band of the water column as fractions of the free water height above the ground (0 floor .. 1 surface). */
  band: [number, number];
  /** Cruise-speed multiplier (default 1); below 1 also means longer hovers and shorter, calmer trips (labyrinth fish, see swimPace.ts). */
  pace?: number;
  /** Same school / shoal = same key (species id + split index); undefined = loner. `tight` = a school (aligned), else a shoal (loose). */
  group?: { key: string; tight: boolean };
  /** Where it was placed: its Reset pose. yaw/pitch/roll in degrees as in the scene's Fish. */
  home: { x: number; y: number; z: number; yaw: number; pitch: number; roll: number };
}

/** One animal's pose this frame, same conventions as the scene (position mm; yaw about y, pitch about z, roll about x, degrees; applied 'YXZ' order roll, yaw, pitch as the build does). */
export interface SwimPose { x: number; y: number; z: number; yaw: number; pitch: number; roll: number }

export interface SwimSim {
  /** Advance by dt seconds (the caller clamps dt to about 0.1). Writes into the poses returned by `pose`. */
  step(dt: number): void;
  /** Current pose of fish `id` (a stable object, updated in place); null if unknown. */
  pose(id: number): SwimPose | null;
  /** Put these fish (all if omitted) back at their placed spots. */
  reset(ids?: number[]): void;
}

export type MakeSwimSim = (fish: SwimmerSpec[], field: SwimField, seed: number) => SwimSim;
