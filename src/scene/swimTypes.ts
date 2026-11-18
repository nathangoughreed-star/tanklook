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
  /** FB1: hovering habit (fishBehavior.ts HOVER): w = how much of its time, pec = how wide the pectorals fan, caudal = share of the tail beat kept while hovering. Absent = the old rest (no fanning). */
  hover?: { w: number; pec: number; caudal: number };
  /** FB1 part 2 (R106): burst-and-coast swimming (fishBehavior.ts STYLE): pulses per second, glide decay time constant (s), heading change per pulse (+- degrees). Absent = steady swimming. Water-column swimmers only. */
  style?: { rate: number; tau: number; turn: number; /** FB2: share of time in [pulse-glide, slow steady cruise, hover with fin sculling]; the fish (a school together) switches between them every 5-15 s. Absent = all pulse-glide. */ mix?: [number, number, number] };
  /** FB2: share of its time a bottom dweller sits still (resting, breathing) between short foraging trips, 0..1; absent = the old mix (about 70 %). Bottom dwellers only. */
  rest?: number;
  /** FB1: digging / hiding habit (fishBehavior.ts DIG) already resolved for this tank: `k` = how well the bed suits it (0 = no dig, hides still), `dark` 0..1 = the tank is dark (more digging), `rest` = height of the body centre above the ground when it lies (mm). Bottom dwellers only. */
  dig?: { rate: number; depth: number; pitch: number; hold: [number, number]; hide: number; hideT: [number, number]; k: number; dark: number; rest: number };
  /** Same school / shoal = same key (species id + split index); undefined = loner. `tight` = a school (aligned), else a shoal (loose). */
  group?: { key: string; tight: boolean };
  /** Where it was placed: its Reset pose. yaw/pitch/roll in degrees as in the scene's Fish. */
  home: { x: number; y: number; z: number; yaw: number; pitch: number; roll: number };
}

/** One animal's pose this frame, same conventions as the scene (position mm; yaw about y, pitch about z, roll about x, degrees; applied 'YXZ' order roll, yaw, pitch as the build does). */
export interface SwimPose { x: number; y: number; z: number; yaw: number; pitch: number; roll: number;
  /** FB1: pectoral fanning 0..1 (0 = folded, for swimming), tail-beat strength (1 = the usual beat, near 0 = still, above 1 = a wriggle) and how deep the body is sunk into the bed (mm, already taken off `y`). Absent = 0, 1, 0. */
  fan?: number; calm?: number; dig?: number;
  /** FB2: for a burst-and-coast species, which style it is in now: 0 pulse-glide, 1 slow steady cruise, 2 hover. Absent for every other fish. */
  sub?: number;
  /** FB2: gill / mouth breathing 0..1 of a bottom dweller sitting still (the shader swells the head); absent = 0. */
  breath?: number }

export interface SwimSim {
  /** Advance by dt seconds (the caller clamps dt to about 0.1). Writes into the poses returned by `pose`. */
  step(dt: number): void;
  /** Current pose of fish `id` (a stable object, updated in place); null if unknown. */
  pose(id: number): SwimPose | null;
  /** Put these fish (all if omitted) back at their placed spots. */
  reset(ids?: number[]): void;
}

export type MakeSwimSim = (fish: SwimmerSpec[], field: SwimField, seed: number) => SwimSim;
