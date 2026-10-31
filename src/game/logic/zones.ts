import { ZONES, type Zone, type ZoneKind } from "../data/zones-v1";

export type { Zone, ZoneKind } from "../data/zones-v1";

// The zone a point is in: the highest priority rectangle that contains it.
export function zoneAt(zones: Zone[], x: number, z: number): Zone {
  let best: Zone | null = null;
  for (const zone of zones) {
    if (x >= zone.x0 && x <= zone.x1 && z >= zone.z0 && z <= zone.z1 && (!best || zone.priority > best.priority)) best = zone;
  }
  return best ?? zones[0];
}

export const zoneKindAt = (x: number, z: number): ZoneKind => zoneAt(ZONES, x, z).kind;
