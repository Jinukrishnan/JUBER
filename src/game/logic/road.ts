// Gentle lateral wander of the road centreline, in metres, as a function of
// distance along the route. Zero at the depot so the bus starts on-axis.
export function roadCenterZ(x: number): number {
  return 14 * Math.sin(x / 260) + 6 * Math.sin(x / 90 + 1) - 6 * Math.sin(1);
}

export const ROAD_HALF_WIDTH = 6;
