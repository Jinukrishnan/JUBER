import type { Zone, ZoneKind } from "../data/zones-v1";

// Flat colour laid on the ground under the roads for the zones that are not grass: paving in the tech city and a
// brighter lawn in the park. Each is a thin box; the park sits a hair above the city so they never flicker.
export type GroundTint = { x: number; z: number; w: number; d: number; color: string; y: number };

const TINTS: Partial<Record<ZoneKind, { color: string; y: number }>> = {
  city: { color: "#9a9d9f", y: -0.055 },
  park: { color: "#6fae48", y: -0.05 },
};

export function groundTints(zones: Zone[]): GroundTint[] {
  return zones.flatMap((z) => {
    const t = TINTS[z.kind];
    return t ? [{ x: (z.x0 + z.x1) / 2, z: (z.z0 + z.z1) / 2, w: z.x1 - z.x0, d: z.z1 - z.z0, ...t }] : [];
  });
}
