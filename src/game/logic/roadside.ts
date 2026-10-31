import type { Network, RoadId } from "../data/network-v1";
import type { Place } from "../data/places-v1";
import { FOOTPATH_WIDTH, JUNCTION_BOX_HALF, builtRoads, headingAt, pointAt } from "./network";
import { approachesOf } from "./turns";

// Where the road furniture goes on the loop: zebra crossings (one per approach),
// roadside signs and electric poles. Pure data from the network and the places.
export type SignKind = "speed40" | "crossing" | "busStop" | "direction";
export type Sign = {
  kind: SignKind;
  road: RoadId;
  x: number;
  z: number;
  facing: number; // the direction the board faces (toward the traffic it is for)
  label?: { ml: string; en: string; km: string }; // direction boards
};
export type Zebra = { x: number; z: number; heading: number; road: RoadId };
export type Pole = { x: number; z: number; road: RoadId; heading: number };
export type RoadFeatures = { zebras: Zebra[]; signs: Sign[]; poles: Pole[] };

export const ZEBRA_LENGTH = 3.5; // along the road
const SIGN_LATERAL = 0.9; // metres in from the carriageway edge
const SPEED_SIGN_AT = 60; // metres from each end of a road
const WARNING_BEFORE = 30; // crossing sign, metres before the stop line
const BOARD_BEFORE = 70; // direction board, metres before the stop line
const BUS_SIGN_BEFORE = 18;
const POLE_SPACING = 45;
const POLE_CLEAR = 14; // metres beyond a junction box

const norm = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function roadFeatures(n: Network, places: Place[]): RoadFeatures {
  const roads = builtRoads(n);
  const byId = new Map(roads.map((r) => [r.road.id, r]));
  const zebras: Zebra[] = [];
  const signs: Sign[] = [];
  const poles: Pole[] = [];

  // a point on the footpath at distance s, on one side of the road (-1 left, +1 right)
  const kerbPoint = (roadId: RoadId, s: number, side: -1 | 1, extra: number) => {
    const r = byId.get(roadId)!;
    const p = pointAt(r, s);
    const h = headingAt(r, s);
    const lat = side * (r.road.halfWidth + extra);
    return { x: p.x - Math.sin(h) * lat, z: p.z + Math.cos(h) * lat, h };
  };

  // 40 km/h on every road, on the left kerb of each direction of travel
  for (const r of roads) {
    for (const dir of [1, -1] as const) {
      const s = dir === 1 ? SPEED_SIGN_AT : r.length - SPEED_SIGN_AT;
      const side = (dir === 1 ? -1 : 1) as -1 | 1; // left of the direction of travel
      const k = kerbPoint(r.road.id, s, side, SIGN_LATERAL + 0.3);
      signs.push({ kind: "speed40", road: r.road.id, x: k.x, z: k.z, facing: norm(k.h + (dir === 1 ? Math.PI : 0)) });
    }
  }

  // every approach: a zebra at the stop line, a warning before it, a direction board further back
  for (const j of n.junctions) {
    for (const a of approachesOf(n, j.id)) {
      zebras.push({ x: a.zebraAt.x, z: a.zebraAt.z, heading: a.heading, road: a.road });
      const other = j.roads.find((id) => id !== a.road) ?? a.road;
      const ahead = byId.get(other)!.road;
      const place = (before: number, kind: SignKind) => {
        const s = a.sJunction - a.dir * (JUNCTION_BOX_HALF + 7 + before);
        const k = kerbPoint(a.road, s, (a.dir === 1 ? -1 : 1) as -1 | 1, SIGN_LATERAL + 0.3);
        return { kind, road: a.road, x: k.x, z: k.z, facing: norm(a.heading + Math.PI) };
      };
      signs.push(place(WARNING_BEFORE, "crossing"));
      signs.push({ ...place(BOARD_BEFORE, "direction"), label: { ml: ahead.ml, en: ahead.name, km: `${(byId.get(other)!.length / 1000).toFixed(1)} km` } });
    }
  }

  // a bus-stop sign before each shelter, on the kerb the customers wait on
  for (const p of places) {
    if (!p.shelter) continue;
    const dir = (p.side === -1 ? 1 : -1) as 1 | -1;
    const k = kerbPoint(p.road, p.s - dir * BUS_SIGN_BEFORE, p.side, SIGN_LATERAL + 0.3);
    signs.push({ kind: "busStop", road: p.road, x: k.x, z: k.z, facing: norm(k.h + (dir === 1 ? Math.PI : 0)) });
  }

  // electric poles along the right-hand edge of every road
  for (const r of roads) {
    for (let s = POLE_SPACING / 2; s < r.length; s += POLE_SPACING) {
      const k = kerbPoint(r.road.id, s, 1, FOOTPATH_WIDTH + 0.9);
      const near = n.junctions.some((j) => Math.max(Math.abs(k.x - j.at[0]), Math.abs(k.z - j.at[1])) < JUNCTION_BOX_HALF + POLE_CLEAR);
      if (!near) poles.push({ x: k.x, z: k.z, road: r.road.id, heading: k.h });
    }
  }

  return { zebras, signs, poles };
}
