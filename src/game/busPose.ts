import { bayCenterZ } from "./logic/bay";
import { roadAngle, roadCenterZ } from "./logic/road";

// Per-frame bus pose shared between Bus (writer) and CameraRig/Stops/Walkers
// (readers). Kept outside the store so 60fps updates do not trigger React renders.
export const busPose = { x: 0, z: 0, heading: 0, speed: 0, bump: false, length: 10, width: 2.6 };

// Where a day starts: parked square in the depot's bay, facing down the road.
export function depotPose() {
  return { x: 0, z: bayCenterZ(roadCenterZ(0), "forward"), heading: roadAngle(0), speed: 0, steerAngle: 0 };
}

export function resetBusPose() {
  const p = depotPose();
  busPose.x = p.x;
  busPose.z = p.z;
  busPose.heading = p.heading;
  busPose.speed = 0;
  busPose.bump = false;
}

// A point on or around the bus, given in bus-local coordinates
// (+x forward, +z right), converted to world x/z.
export function busLocalToWorld(lx: number, lz: number): { x: number; z: number } {
  const c = Math.cos(busPose.heading);
  const s = Math.sin(busPose.heading);
  return { x: busPose.x + lx * c - lz * s, z: busPose.z + lx * s + lz * c };
}
