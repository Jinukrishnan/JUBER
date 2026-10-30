import { ROUTE_V1 } from "../data/route-v1";

// Gentle lateral wander of the road centreline, in metres, as a function of
// distance along the route. Zero at the depot so the bus starts on-axis.
export function roadCenterZ(x: number): number {
  return 14 * Math.sin(x / 260) + 6 * Math.sin(x / 90 + 1) - 6 * Math.sin(1);
}

// Direction of the road at x, as an angle from +x (same convention as the
// bus heading), so a bus lined up with the road has heading == roadAngle(x).
export function roadAngle(x: number): number {
  const slope = (roadCenterZ(x + 0.5) - roadCenterZ(x - 0.5)) / 1;
  return Math.atan(slope);
}

export const ROAD_HALF_WIDTH = 6;

const TURN_HALF_WIDTH = 16;
const FIRST_STOP = ROUTE_V1[0].position;
const LAST_STOP = ROUTE_V1[ROUTE_V1.length - 1].position;
const APRON_START = 10; // metres past a terminus before the road starts to open out
const APRON_RAMP = 20; // metres over which it opens to full width

// Normal width along the route; opens into a wide apron past each terminus so
// the bus has room for a U-turn.
export function roadHalfWidthAt(x: number): number {
  const past = Math.max(FIRST_STOP - APRON_START - x, x - LAST_STOP - APRON_START, 0);
  const t = Math.min(1, past / APRON_RAMP);
  const eased = t * t * (3 - 2 * t);
  return ROAD_HALF_WIDTH + (TURN_HALF_WIDTH - ROAD_HALF_WIDTH) * eased;
}

// Raised footpath on each side of the carriageway, metres wide.
export const FOOTPATH_WIDTH = 3.6;

// Height of the kerb: the footpath stands this far above the carriageway.
export const KERB_HEIGHT = 0.15;

// Ground level at a spot: raised on the footpaths, flat everywhere else, so
// anyone knocked down lands on the footpath or the road, whichever is under them.
export function groundY(x: number, z: number): number {
  const lateral = Math.abs(z - roadCenterZ(x));
  const half = roadHalfWidthAt(x);
  return lateral > half && lateral <= half + FOOTPATH_WIDTH ? KERB_HEIGHT : 0;
}
