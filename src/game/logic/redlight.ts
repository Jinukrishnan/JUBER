import { ROAD_HALF_WIDTH } from "./road";
import { armStopDistance, stopLineDistance, worldToLocal, type ResolvedJunction } from "./junction";
import { groupOf, redAge, signalAt, type Approach } from "./signals";

export const BUS_HALF_LENGTH = 5;
export const RED_GRACE_S = 0.4; // a light that has only just turned red does not fine
const MIN_ALIGNMENT = 0.5; // how squarely the bus must face the approach (cosine)

export type Pose = { x: number; z: number; heading: number };

// Direction of travel into the junction, in the junction's local frame (u, v).
const INTO: Record<Approach, [number, number]> = {
  mainForward: [1, 0],
  mainBackward: [-1, 0],
  armLeft: [0, 1],
  armRight: [0, -1],
};

// Where the bus front is on this approach: `f` grows toward the junction and
// `across` is the offset from the approach's own axis.
function frontOn(r: ResolvedJunction, a: Approach, p: Pose, half: number): { f: number; across: number } {
  const { u, v } = worldToLocal(r, p.x + Math.cos(p.heading) * half, p.z + Math.sin(p.heading) * half);
  switch (a) {
    case "mainForward": return { f: u, across: v };
    case "mainBackward": return { f: -u, across: v };
    case "armLeft": return { f: v, across: u };
    case "armRight": return { f: -v, across: u };
  }
}

// True when the bus front moved across this approach's stop line, heading into
// the junction, between two frames.
export function stopLineCrossed(r: ResolvedJunction, a: Approach, prev: Pose, next: Pose, half = BUS_HALF_LENGTH): boolean {
  const line = -(a.startsWith("main") ? stopLineDistance(r) : armStopDistance());
  const before = frontOn(r, a, prev, half);
  const after = frontOn(r, a, next, half);
  if (!(before.f < line && after.f >= line)) return false;
  const reach = a.startsWith("main") ? ROAD_HALF_WIDTH : r.armHalfWidth + 1;
  if (Math.abs(after.across) > reach) return false;
  const rel = next.heading - r.angle;
  const [du, dv] = INTO[a];
  return Math.cos(rel) * du + Math.sin(rel) * dv >= MIN_ALIGNMENT;
}

// Crossing the line while this approach's light is red (and has been for a moment).
export function redViolation(r: ResolvedJunction, a: Approach, prev: Pose, next: Pose, t: number, half = BUS_HALF_LENGTH): boolean {
  if (!r.plan) return false;
  if (!stopLineCrossed(r, a, prev, next, half)) return false;
  const g = groupOf(a);
  return signalAt(r.plan, t)[g] === "red" && redAge(r.plan, t, g) >= RED_GRACE_S;
}
