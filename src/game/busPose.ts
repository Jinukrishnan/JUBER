import { PLACES_V2 } from "./data/places-v2";
import { placeSpot } from "./logic/places";
import { NETWORK } from "./world";

// Per-frame bus pose shared between Bus (writer) and CameraRig/Stops/Walkers
// (readers). Kept outside the store so 60fps updates do not trigger React renders.
export const busPose = { x: 0, z: 0, heading: 0, speed: 0, bump: false, length: 10, width: 2.6, braking: false, reversing: false };

// Where a day starts: parked at the depot's kerb on the ring road, facing along it.
export function depotPose() {
  const depot = PLACES_V2.find((p) => p.id === "depot")!;
  const spot = placeSpot(NETWORK, depot);
  return { x: spot.x, z: spot.z, heading: spot.heading, speed: 0, steerAngle: 0 };
}

export function resetBusPose() {
  const p = depotPose();
  busPose.x = p.x;
  busPose.z = p.z;
  busPose.heading = p.heading;
  busPose.speed = 0;
  busPose.bump = false;
  busPose.braking = false;
  busPose.reversing = false;
}

// A point on or around the bus, given in bus-local coordinates
// (+x forward, +z right), converted to world x/z.
export function busLocalToWorld(lx: number, lz: number): { x: number; z: number } {
  const c = Math.cos(busPose.heading);
  const s = Math.sin(busPose.heading);
  return { x: busPose.x + lx * c - lz * s, z: busPose.z + lx * s + lz * c };
}
