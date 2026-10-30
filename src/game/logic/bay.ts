import type { Stop } from "./route";

// The painted bays at the main-road places, one on each kerb.
export const BAY_LENGTH = 14;
export const BAY_WIDTH = 4.6;
// Distance from the road centreline to the bay centre (left kerb of each direction).
export const BAY_OFFSET = 3.7;

export type Side = "forward" | "backward";

// Traffic keeps left: a vehicle heading forward (+x) pulls in on the -z kerb,
// one heading back on the +z kerb.
export function bayCenterZ(centerZ: number, side: Side): number {
  return side === "forward" ? centerZ - BAY_OFFSET : centerZ + BAY_OFFSET;
}

export type { Stop };
