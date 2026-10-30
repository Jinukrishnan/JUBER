import { roadAngle, roadCenterZ } from "./road";
import type { Stop } from "./route";

export const BUS_LENGTH = 10;
export const BUS_WIDTH = 2.6;
// The painted bay: the bus length plus a little slack, so "completely inside"
// is achievable. Length is along the road, width across it.
export const BAY_LENGTH = 14;
export const BAY_WIDTH = 4.6;
// Distance from the road centreline to the bay centre (left kerb of each direction).
export const BAY_OFFSET = 3.7;
export const HEADING_TOL = 0.2; // rad

// how far along the bay the bus centre may sit while still fully inside it
export const BAY_LONG_TOL = (BAY_LENGTH - BUS_LENGTH) / 2;
const LAT_TOL = (BAY_WIDTH - BUS_WIDTH) / 2;

export type Side = "forward" | "backward";
export type Bay = { stop: number; side: Side };

// Traffic keeps left: a bus heading forward (+x) pulls in on the -z kerb, a bus
// heading back on the +z kerb.
export function bayCenterZ(centerZ: number, side: Side): number {
  return side === "forward" ? centerZ - BAY_OFFSET : centerZ + BAY_OFFSET;
}

function wrap(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

// The bay the bus is completely inside, or null. All three must hold: the bus
// body lies within the bay lengthways, it sits within the painted width, and
// it is lined up with the road facing the direction that bay serves.
export function bayAt(stops: Stop[], x: number, z: number, heading: number): Bay | null {
  const stop = stops.findIndex((s) => Math.abs(s.position - x) <= BAY_LONG_TOL);
  if (stop === -1) return null;

  const rel = wrap(heading - roadAngle(x));
  let side: Side;
  if (Math.abs(rel) <= HEADING_TOL) side = "forward";
  else if (Math.abs(wrap(rel - Math.PI)) <= HEADING_TOL) side = "backward";
  else return null;

  if (Math.abs(z - bayCenterZ(roadCenterZ(x), side)) > LAT_TOL) return null;
  return { stop, side };
}
