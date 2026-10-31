import type { Junction, Network, TurnRule } from "../data/network-v1";
import { builtRoads } from "./network";
import { resolvePlan, redAge, signalAt, untilChange, type Light, type Plan } from "./signals";
import { allowedTurns, approachesOf, type Axis } from "./turns";

// Signals and the red-light rule for the loop network. Each junction runs one
// cycle (signals.ts); its approaches are grouped into a `main` and a `cross` axis.
export const VEHICLE_HALF_LENGTH = 5;
export const RED_GRACE_S = 0.4; // a light that has only just turned red does not fine
export const SIGNAL_SIGHT = 250; // metres at which the HUD starts showing a signal
const MIN_ALIGNMENT = 0.5; // how squarely the vehicle must face the approach (cosine)
const LANE_REACH = 8; // how far off an approach axis still counts as being on it

export type Pose = { x: number; z: number; heading: number };

export function planOfJunction(j: Junction): Plan | null {
  return j.signal === false ? null : resolvePlan(j.signal);
}

export function lightFor(j: Junction, t: number, axis: Axis): Light {
  const plan = planOfJunction(j);
  return plan ? signalAt(plan, t)[axis] : "green";
}

// Seconds until this axis light next changes colour.
export function untilChangeFor(j: Junction, t: number, axis: Axis): number {
  const plan = planOfJunction(j);
  return plan ? untilChange(plan, t, axis) : 0;
}

const frontOf = (p: Pose, half: number) => ({ x: p.x + Math.cos(p.heading) * half, z: p.z + Math.sin(p.heading) * half });

// Distance of the vehicle front past the approach stop line (negative = before it),
// and the offset across the approach axis.
function against(n: Network, junctionId: string, approachId: string, p: Pose, half: number) {
  const a = approachesOf(n, junctionId).find((x) => x.id === approachId)!;
  const f = frontOf(p, half);
  const ux = Math.cos(a.heading);
  const uz = Math.sin(a.heading);
  const dx = f.x - a.stopLineAt.x;
  const dz = f.z - a.stopLineAt.z;
  return { a, past: dx * ux + dz * uz, across: -dx * uz + dz * ux };
}

// The front crossed this approach stop line between two frames while its light was red.
export function redViolationAt(
  n: Network,
  junctionId: string,
  approachId: string,
  prev: Pose,
  next: Pose,
  t: number,
  half = VEHICLE_HALF_LENGTH,
): boolean {
  const j = n.junctions.find((x) => x.id === junctionId);
  const plan = j ? planOfJunction(j) : null;
  if (!j || !plan) return false;
  const before = against(n, junctionId, approachId, prev, half);
  const after = against(n, junctionId, approachId, next, half);
  if (!(before.past < 0 && after.past >= 0)) return false;
  const road = builtRoads(n).find((r) => r.road.id === after.a.road)!;
  if (Math.abs(after.across) > road.road.halfWidth) return false;
  if (Math.cos(next.heading - after.a.heading) < MIN_ALIGNMENT) return false;
  return signalAt(plan, t)[after.a.axis] === "red" && redAge(plan, t, after.a.axis) >= RED_GRACE_S;
}

export type SignalAhead = {
  id: string; // junction
  approachId: string;
  distance: number;
  light: Light;
  seconds: number;
  turns: TurnRule[];
};

// The nearest signal still ahead on the road being driven, for the HUD.
export function nextSignalAhead(n: Network, p: Pose, t: number, half = VEHICLE_HALF_LENGTH): SignalAhead | null {
  let best: SignalAhead | null = null;
  for (const j of n.junctions) {
    if (j.signal === false) continue;
    for (const a of approachesOf(n, j.id)) {
      if (Math.cos(p.heading - a.heading) < MIN_ALIGNMENT) continue;
      const { past, across } = against(n, j.id, a.id, p, half);
      const distance = -past;
      if (distance < 0 || distance > SIGNAL_SIGHT || Math.abs(across) > LANE_REACH) continue;
      if (best && distance >= best.distance) continue;
      best = {
        id: j.id,
        approachId: a.id,
        distance,
        light: lightFor(j, t, a.axis),
        seconds: untilChangeFor(j, t, a.axis),
        turns: allowedTurns(n, j.id, a.id),
      };
    }
  }
  return best;
}
