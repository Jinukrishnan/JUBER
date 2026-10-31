import type { Junction, Network, RoadId, TurnRule } from "../data/network-v1";
import { JUNCTION_BOX_HALF, builtRoads, headingAt, nearestOnRoad, pointAt, type BuiltRoad } from "./network";

// Where a vehicle can come into a junction from, where it can leave to, and
// which turns the junction allows from each approach.
export const STOP_LINE_BEFORE_BOX = 7; // metres before the box
export const ZEBRA_CENTRE_BEFORE_BOX = 3.65;
export type Turn = TurnRule | "uturn";
export type Axis = "main" | "cross";

export type Approach = {
  id: string; // "<roadId>:<dir>"
  junction: string;
  road: RoadId;
  dir: 1 | -1;
  heading: number; // direction of travel into the junction
  stopLineAt: { x: number; z: number };
  zebraAt: { x: number; z: number };
  axis: Axis;
  sJunction: number; // distance along the road where it crosses the junction
};

export type Exit = {
  id: string; // "<roadId>:<dir>" of the way out
  road: RoadId;
  dir: 1 | -1;
  heading: number;
  turn: Turn;
  exitAt: { x: number; z: number }; // where it leaves the box
};

const norm = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function classifyTurn(entry: number, exit: number): Turn {
  const d = norm(exit - entry);
  if (Math.abs(d) < Math.PI / 4) return "straight";
  if (Math.abs(d) > (3 * Math.PI) / 4) return "uturn";
  return d > 0 ? "right" : "left";
}

const junctionOf = (n: Network, id: string): Junction => {
  const j = n.junctions.find((x) => x.id === id);
  if (!j) throw new Error(`no junction ${id}`);
  return j;
};

type Leg = { road: BuiltRoad; dir: 1 | -1; s: number };

// Every way along a road through this junction that has road before it (an
// approach) or after it (an exit).
function legs(n: Network, j: Junction, kind: "in" | "out"): Leg[] {
  const out: Leg[] = [];
  const all = builtRoads(n);
  for (const id of j.roads) {
    const road = all.find((r) => r.road.id === id)!;
    const s = nearestOnRoad(road, j.at[0], j.at[1]).s;
    for (const dir of [1, -1] as const) {
      // travelling `dir`, the road before the junction is at s - dir*d, after it at s + dir*d
      const behind = dir === 1 ? s : road.length - s;
      const ahead = dir === 1 ? road.length - s : s;
      const room = kind === "in" ? behind : ahead;
      if (road.road.closed || room > 0.5) out.push({ road, dir, s });
    }
  }
  return out;
}

const headingOn = (leg: Leg) => norm(headingAt(leg.road, leg.s) + (leg.dir === -1 ? Math.PI : 0));

// main = the closed ring if there is one, else the road running more nearly east-west.
export function mainRoad(n: Network, j: Junction): RoadId {
  const all = builtRoads(n);
  const closed = j.roads.find((id) => all.find((r) => r.road.id === id)!.road.closed);
  if (closed) return closed;
  let best = j.roads[0];
  let bestV = -1;
  for (const id of j.roads) {
    const road = all.find((r) => r.road.id === id)!;
    const v = Math.abs(Math.cos(headingAt(road, nearestOnRoad(road, j.at[0], j.at[1]).s)));
    if (v > bestV + 1e-9) {
      bestV = v;
      best = id;
    }
  }
  return best;
}

const approachCache = new WeakMap<Network, Map<string, Approach[]>>();

export function approachesOf(n: Network, junctionId: string): Approach[] {
  let byJunction = approachCache.get(n);
  if (!byJunction) approachCache.set(n, (byJunction = new Map()));
  let list = byJunction.get(junctionId);
  if (!list) byJunction.set(junctionId, (list = computeApproaches(n, junctionId)));
  return list;
}

function computeApproaches(n: Network, junctionId: string): Approach[] {
  const j = junctionOf(n, junctionId);
  const main = mainRoad(n, j);
  return legs(n, j, "in").map((leg) => {
    const at = (d: number) => pointAt(leg.road, leg.s - leg.dir * d);
    return {
      id: `${leg.road.road.id}:${leg.dir}`,
      junction: j.id,
      road: leg.road.road.id,
      dir: leg.dir,
      heading: headingOn(leg),
      stopLineAt: at(JUNCTION_BOX_HALF + STOP_LINE_BEFORE_BOX),
      zebraAt: at(JUNCTION_BOX_HALF + ZEBRA_CENTRE_BEFORE_BOX),
      axis: leg.road.road.id === main ? "main" : "cross",
      sJunction: leg.s,
    };
  });
}

// The ways out of the junction from an approach, without turning back on itself.
export function exitsOf(n: Network, junctionId: string, from: Approach): Exit[] {
  const j = junctionOf(n, junctionId);
  const out: Exit[] = [];
  for (const leg of legs(n, j, "out")) {
    const heading = headingOn(leg);
    const turn = classifyTurn(from.heading, heading);
    if (turn === "uturn") continue;
    out.push({ id: `${leg.road.road.id}:${leg.dir}`, road: leg.road.road.id, dir: leg.dir, heading, turn, exitAt: pointAt(leg.road, leg.s + leg.dir * JUNCTION_BOX_HALF) });
  }
  return out;
}

export function allowedTurns(n: Network, junctionId: string, approachId: string): TurnRule[] {
  const from = approachesOf(n, junctionId).find((a) => a.id === approachId);
  if (!from) return [];
  const exist = [...new Set(exitsOf(n, junctionId, from).map((e) => e.turn as TurnRule))];
  const rule = junctionOf(n, junctionId).allowed[approachId];
  return rule ? exist.filter((t) => rule.includes(t)) : exist;
}

// U-turns are not judged here (the box has no rule for them).
export function isWrongTurn(n: Network, junctionId: string, approachId: string, turn: Turn): boolean {
  if (turn === "uturn") return false;
  return !allowedTurns(n, junctionId, approachId).includes(turn);
}

export type Pose = { x: number; z: number; heading: number };
export type Move = { junction: string; approach: Approach; exit: Exit; turn: Turn };

const inBox = (j: Junction, p: { x: number; z: number }) =>
  Math.abs(p.x - j.at[0]) <= JUNCTION_BOX_HALF && Math.abs(p.z - j.at[1]) <= JUNCTION_BOX_HALF;

// Tracks a vehicle across a junction box. `state` is the approach it came in by
// (null when it is outside); feed it each frame. A move is reported once, when
// the vehicle leaves the box by a different way than it came in: coming back
// out the way it entered (reversing, or only touching the edge) is no move.
export function moveAt(
  n: Network,
  junctionId: string,
  state: Approach | null,
  prev: Pose,
  next: Pose,
): { state: Approach | null; move: Move | null } {
  const j = junctionOf(n, junctionId);
  const was = inBox(j, prev);
  const now = inBox(j, next);

  if (!was && now) {
    let best: Approach | null = null;
    let bestDot = 0.5; // must lie toward the approach side of the box
    for (const a of approachesOf(n, junctionId)) {
      const sx = a.stopLineAt.x - j.at[0];
      const sz = a.stopLineAt.z - j.at[1];
      const len = Math.hypot(sx, sz);
      const dx = next.x - j.at[0];
      const dz = next.z - j.at[1];
      const dl = Math.hypot(dx, dz) || 1;
      const dot = (sx * dx + sz * dz) / (len * dl);
      const facing = Math.cos(next.heading - a.heading);
      if (dot > bestDot && facing > 0) {
        bestDot = dot;
        best = a;
      }
    }
    return { state: best, move: null };
  }

  if (was && !now && state) {
    let best: { exit: Exit; d: number } | null = null;
    const reverse = approachesOf(n, junctionId).find((a) => a.id === state.id)!;
    for (const e of exitsOf(n, junctionId, reverse)) {
      const d = Math.hypot(next.x - e.exitAt.x, next.z - e.exitAt.z);
      if (!best || d < best.d) best = { exit: e, d };
    }
    // leaving by the side it came in: the way back, not a move
    const backAt = { x: reverse.stopLineAt.x, z: reverse.stopLineAt.z };
    const dBack = Math.hypot(next.x - backAt.x, next.z - backAt.z);
    if (!best || dBack < best.d) return { state: null, move: null };
    return { state: null, move: { junction: j.id, approach: state, exit: best.exit, turn: best.exit.turn } };
  }

  return { state: now ? state : null, move: null };
}
