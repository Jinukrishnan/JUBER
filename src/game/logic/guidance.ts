import { BAY_LONG_TOL, BAY_WIDTH, BUS_WIDTH, HEADING_TOL, bayAt, bayCenterZ, type Side } from "./bay";
import { roadAngle, roadCenterZ } from "./road";
import type { Direction, Stop } from "./route";

const APPROACH_RANGE = 40; // metres from a stop's bay centre where hints start
const STOP_SPEED = 1; // matches STOP_SPEED_MAX in the store

export type GuidanceArgs = {
  stops: Stop[];
  direction: Direction;
  doorOpen: boolean;
  speed: number;
  x: number;
  z: number;
  heading: number;
};

function wrap(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

// A one-line hint for the driver while near a stop: what to do next, or why the
// bay is not green yet. Null when no stop is close.
export function stopGuidance(a: GuidanceArgs): string | null {
  const near = a.stops.find((s) => Math.abs(s.position - a.x) <= APPROACH_RANGE);
  if (!near) return null;

  const bay = bayAt(a.stops, a.x, a.z, a.heading);
  if (bay) {
    if (bay.side !== a.direction) return "This bay is for the other direction - use the one on the opposite kerb";
    if (a.doorOpen) return "Door open - passengers are getting on and off";
    if (a.speed > STOP_SPEED) return "Stop the bus (Space) to open the door";
    return "Press E to open the door";
  }

  const side: Side = a.direction;
  const rel = wrap(a.heading - roadAngle(a.x));
  const target = side === "forward" ? 0 : Math.PI;
  if (Math.abs(wrap(rel - target)) > HEADING_TOL) return "Straighten the bus along the road";
  if (Math.abs(a.z - bayCenterZ(roadCenterZ(a.x), side)) > (BAY_WIDTH - BUS_WIDTH) / 2) {
    return "Pull in to the kerb, inside the yellow bay";
  }
  if (Math.abs(near.position - a.x) > BAY_LONG_TOL) return "Park in the middle of the yellow bay";
  return null;
}
