import type { Network } from "../data/network-v1";
import type { Place } from "../data/places-v1";
import { BAY_OFFSET } from "./bay";
import { FOOTPATH_WIDTH, JUNCTION_BOX_HALF, builtRoads, headingAt, pointAt } from "./network";

export type { Place } from "../data/places-v1";

const MIN_FROM_JUNCTION = 30; // metres from the edge of a junction box
const MIN_FROM_PLACE = 40;
const GROUP_SPACING = 0.9; // metres between people in a group
const KERB_STANDING = 1.8; // how far onto the footpath they stand, from the road edge

function roadOf(n: Network, place: Place) {
  const r = builtRoads(n).find((b) => b.road.id === place.road);
  if (!r) throw new Error(`No road "${place.road}" for place "${place.id}"`);
  return r;
}

// the point `lateral` metres to the right of the direction the road runs, at s
function beside(n: Network, place: Place, s: number, lateral: number) {
  const r = roadOf(n, place);
  const p = pointAt(r, s);
  const h = headingAt(r, s);
  return { x: p.x - Math.sin(h) * lateral, z: p.z + Math.cos(h) * lateral };
}

// Where a vehicle stops for this place: the kerbside spot, and the heading a
// vehicle faces when parked there (keeping left: against the road for a place
// on its right-hand side).
export function placeSpot(n: Network, place: Place): { x: number; z: number; heading: number } {
  const h = headingAt(roadOf(n, place), place.s);
  const at = beside(n, place, place.s, place.side * BAY_OFFSET);
  return { ...at, heading: place.side === -1 ? h : Math.atan2(Math.sin(h + Math.PI), Math.cos(h + Math.PI)) };
}

// Where the k-th member of a group waits (and is dropped): on the footpath on the
// place's side, spread out along it.
export function customerSpot(n: Network, place: Place, k: number): { x: number; z: number } {
  const r = roadOf(n, place);
  const off = r.road.halfWidth + Math.min(KERB_STANDING, FOOTPATH_WIDTH - 0.5);
  return beside(n, place, place.s + (k - 1) * GROUP_SPACING, place.side * off);
}

export function placesAreValid(n: Network, places: Place[]): string[] {
  const problems: string[] = [];
  const spots = new Map<string, { x: number; z: number }>();
  for (const p of places) {
    const r = builtRoads(n).find((b) => b.road.id === p.road);
    if (!r) {
      problems.push(`Place "${p.id}" is on road "${p.road}", which does not exist`);
      continue;
    }
    if (p.s < 0 || p.s > r.length) {
      problems.push(`Place "${p.id}" is ${p.s} m along road "${p.road}", beyond its end (${r.length.toFixed(0)} m)`);
      continue;
    }
    const spot = placeSpot(n, p);
    const near = n.junctions.find(
      (j) => Math.max(Math.abs(spot.x - j.at[0]), Math.abs(spot.z - j.at[1])) - JUNCTION_BOX_HALF < MIN_FROM_JUNCTION,
    );
    if (near) {
      problems.push(`Place "${p.id}" is less than ${MIN_FROM_JUNCTION} m from the junction "${near.id}"`);
      continue;
    }
    for (const [id, other] of spots) {
      if (Math.hypot(spot.x - other.x, spot.z - other.z) < MIN_FROM_PLACE) {
        problems.push(`Place "${p.id}" is less than ${MIN_FROM_PLACE} m from place "${id}"`);
        break;
      }
    }
    spots.set(p.id, spot);
  }
  return problems;
}

// The places that are valid on this network. One that is not (its road was dropped
// or its distance is off) is left out instead of throwing later.
export function usablePlaces(n: Network, places: Place[]): Place[] {
  return places.filter((p) => placesAreValid(n, [p]).length === 0);
}
