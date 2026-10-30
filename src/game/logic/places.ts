import type { Place } from "../data/places-v1";
import { BAY_OFFSET } from "./bay";
import { armSigns, localToWorld, type ResolvedJunction } from "./junction";
import { roadAngle, roadCenterZ } from "./road";

export type { Place } from "../data/places-v1";

// Where a vehicle stops for this place: the kerbside spot, and the heading a
// vehicle faces when it is parked there.
export function placeSpot(place: Place, junctions: ResolvedJunction[]): { x: number; z: number; heading: number } {
  const at = place.at;
  if (at.kind === "main") {
    const cz = roadCenterZ(at.x);
    const angle = roadAngle(at.x);
    return at.side === "left"
      ? { x: at.x, z: cz - BAY_OFFSET, heading: angle }
      : { x: at.x, z: cz + BAY_OFFSET, heading: angle + Math.PI };
  }
  const j = junctions.find((r) => r.id === at.junctionId);
  if (!j) throw new Error(`No junction "${at.junctionId}" for place "${place.id}"`);
  // driving out along the arm, the left kerb is on the -side half of the arm's width
  const w = localToWorld(j, at.side * (j.armHalfWidth / 2), at.side * at.distance);
  return { x: w.x, z: w.z, heading: j.angle + at.side * (Math.PI / 2) };
}

const END_MARGIN = 20; // a place stays this far from the dead end, clear of the turn-around

export function placesAreValid(places: Place[], junctions: ResolvedJunction[]): string[] {
  const problems: string[] = [];
  for (const p of places) {
    if (p.at.kind !== "arm") continue;
    const at = p.at;
    const j = junctions.find((r) => r.id === at.junctionId);
    if (!j) {
      problems.push(`Place "${p.id}" is on junction "${at.junctionId}", which does not exist`);
    } else if (!armSigns(j.arms).includes(at.side)) {
      problems.push(`Place "${p.id}" is on the ${at.side === 1 ? "right" : "left"} side of "${j.id}", which has no arm on that side`);
    } else if (at.distance < 20 || at.distance > j.armLength - END_MARGIN) {
      problems.push(`Place "${p.id}" is ${at.distance} m along its arm; keep it between 20 and ${j.armLength - END_MARGIN} m`);
    }
  }
  return problems;
}
