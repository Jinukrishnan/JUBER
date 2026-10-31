import type { Network } from "../data/network-v1";
import type { Place } from "../data/places-v1";
import { builtRoads, headingAt, nearestOnRoad, pointAt, type BuiltRoad } from "./network";
import { placeSpot } from "./places";
import { allowedTurns, approachesOf, exitsOf } from "./turns";

// Routes on the loop. The graph's nodes are "arrived at a junction by this road,
// travelling this way"; its edges are the stretches of road to the next junction,
// one per turn the junction allows. Dijkstra over those nodes finds the shortest
// way that never makes a turn the junction forbids. The only U-turn is the one a
// route may open with, when the vehicle starts out facing away from it.

export type Graph = {
  network: Network;
  places: Place[];
  roads: Map<string, BuiltRoad>;
  junctionS: Map<string, number>; // `${junction}|${road}` -> distance along that road
};
export type Position = { x: number; z: number; heading?: number };

export type Turn = "left" | "right" | "straight" | "uturn" | "arrive";
export type Step = {
  turn: Turn;
  at: { x: number; z: number };
  distanceFromStart: number;
  side?: "left" | "right"; // for "arrive": which side of the road the place is on
};
// a junction passed on the way, for checking the turn against the junction rules
export type Move = { junction: string; approachId: string; turn: "left" | "right" | "straight" };
export type Route = { points: { x: number; z: number }[]; length: number; steps: Step[]; moves: Move[] };

const SAMPLE_M = 12;
const UTURN_COST = 20; // metres, a U-turn on the spot costs about this much time
const OPENING_UTURN_M = 12; // the starting U-turn is still due until the vehicle has moved this far

export function buildGraph(network: Network, places: Place[]): Graph {
  const roads = new Map(builtRoads(network).map((r) => [r.road.id, r]));
  const junctionS = new Map<string, number>();
  for (const j of network.junctions) {
    for (const id of j.roads) junctionS.set(`${j.id}|${id}`, nearestOnRoad(roads.get(id)!, j.at[0], j.at[1]).s);
  }
  return { network, places, roads, junctionS };
}

type Dir = 1 | -1;

// metres to travel from s0 to s1 going `dir` along the road (round the loop if it is closed)
function along(r: BuiltRoad, s0: number, s1: number, dir: Dir): number {
  const d = (s1 - s0) * dir;
  if (r.road.closed) return ((d % r.length) + r.length) % r.length;
  return d >= -1e-6 ? Math.max(0, d) : Infinity;
}

type Leg = { road: BuiltRoad; dir: Dir; s0: number; len: number };

function nextJunction(g: Graph, r: BuiltRoad, s: number, dir: Dir, exclude: string | null): { id: string; s: number; d: number } | null {
  let best: { id: string; s: number; d: number } | null = null;
  for (const j of g.network.junctions) {
    if (j.id === exclude) continue;
    const sj = g.junctionS.get(`${j.id}|${r.road.id}`);
    if (sj === undefined) continue;
    const d = along(r, s, sj, dir);
    if (d < Infinity && (!best || d < best.d)) best = { id: j.id, s: sj, d };
  }
  return best;
}

type Prev = { from: string; leg: Leg; move?: Move };

function search(
  g: Graph,
  start: { road: BuiltRoad; s: number; dir: Dir },
  target: { road: BuiltRoad; s: number },
): { cost: number; legs: Leg[]; moves: Move[] } | null {
  const dist = new Map<string, number>();
  const prev = new Map<string, Prev>();
  const done = new Set<string>();
  const relax = (key: string, cost: number, p: Prev) => {
    if (cost < (dist.get(key) ?? Infinity)) {
      dist.set(key, cost);
      prev.set(key, p);
    }
  };

  const leave = (from: string, base: number, road: BuiltRoad, s: number, dir: Dir, exclude: string | null, move?: Move) => {
    const k = nextJunction(g, road, s, dir, exclude);
    const dt = target.road === road ? along(road, s, target.s, dir) : Infinity;
    if (dt < (k ? k.d : Infinity)) relax("target", base + dt, { from, leg: { road, dir, s0: s, len: dt }, move });
    if (k) relax(`${k.id}|${road.road.id}|${dir}`, base + k.d, { from, leg: { road, dir, s0: s, len: k.d }, move });
  };

  leave("start", 0, start.road, start.s, start.dir, null);

  for (;;) {
    let key: string | null = null;
    let best = Infinity;
    for (const [k, d] of dist) {
      if (!done.has(k) && d < best) {
        best = d;
        key = k;
      }
    }
    if (key === null) return null;
    if (key === "target") break;
    done.add(key);
    const [jid, rid, ds] = key.split("|");
    const dir = Number(ds) as Dir;
    const approachId = `${rid}:${dir}`;
    const from = approachesOf(g.network, jid).find((a) => a.id === approachId);
    if (!from) continue;
    const allowed = allowedTurns(g.network, jid, approachId);
    for (const e of exitsOf(g.network, jid, from)) {
      if (e.turn === "uturn" || !allowed.includes(e.turn)) continue;
      const road = g.roads.get(e.road)!;
      const sj = g.junctionS.get(`${jid}|${e.road}`)!;
      leave(key, best, road, sj, e.dir, jid, { junction: jid, approachId, turn: e.turn });
    }
  }

  const legs: Leg[] = [];
  const moves: Move[] = [];
  let k = "target";
  while (k !== "start") {
    const p = prev.get(k)!;
    legs.unshift(p.leg);
    if (p.move) moves.unshift(p.move);
    k = p.from;
  }
  return { cost: dist.get("target")!, legs, moves };
}

// where the vehicle is on the network: the road it is driving along, and which
// way it is facing along it. Where roads cross, the one it is lined up with wins.
function snap(g: Graph, p: Position): { road: BuiltRoad; s: number; facing: Dir | null } {
  const cands = [...g.roads.values()].map((r) => ({ r, n: nearestOnRoad(r, p.x, p.z) })).sort((a, b) => a.n.distance - b.n.distance);
  let pick = cands[0];
  if (p.heading !== undefined) {
    const near = cands.filter((c) => c.n.distance <= cands[0].n.distance + 8 && c.n.distance <= c.r.road.halfWidth + 4);
    const align = (c: (typeof cands)[number]) => Math.abs(Math.cos(p.heading! - headingAt(c.r, c.n.s)));
    if (near.length > 1) pick = near.reduce((a, b) => (align(b) > align(a) + 1e-9 ? b : a));
  }
  const facing: Dir | null = p.heading === undefined ? null : Math.cos(p.heading - headingAt(pick.r, pick.n.s)) >= 0 ? 1 : -1;
  return { road: pick.r, s: pick.n.s, facing };
}

const sideOf = (place: Place, dir: Dir): "left" | "right" => (place.side * dir === -1 ? "left" : "right");

function legPoints(l: Leg): { x: number; z: number }[] {
  const pts: { x: number; z: number }[] = [];
  const n = Math.max(1, Math.ceil(l.len / SAMPLE_M));
  for (let i = 1; i <= n; i++) pts.push(pointAt(l.road, l.s0 + l.dir * l.len * (i / n)));
  return pts;
}

// The way from where the vehicle is to a place: the points to draw, the length,
// the turns on the way (ending with the arrival) and the junction moves it makes.
export function route(g: Graph, from: Position, to: Place): Route {
  const here = snap(g, from);
  const target = { road: g.roads.get(to.road)!, s: to.s };
  const options: { dir: Dir; cost: number; found: NonNullable<ReturnType<typeof search>> }[] = [];
  for (const dir of [1, -1] as Dir[]) {
    const found = search(g, { road: here.road, s: here.s, dir }, target);
    if (!found) continue;
    // the way against the vehicle's heading starts with a U-turn
    options.push({ dir, found, cost: found.cost + (here.facing !== null && dir !== here.facing ? UTURN_COST : 0) });
  }
  if (options.length === 0) throw new Error(`No route to "${to.id}"`);
  const pick = options.reduce((a, b) => (b.cost < a.cost ? b : a));
  const { legs, moves } = pick.found;

  const points: { x: number; z: number }[] = [{ x: from.x, z: from.z }];
  const steps: Step[] = [];
  let length = 0;

  if (here.facing !== null && pick.dir !== here.facing) {
    steps.push({ turn: "uturn", at: { x: from.x, z: from.z }, distanceFromStart: 0 });
  }
  legs.forEach((leg, i) => {
    for (const p of legPoints(leg)) points.push(p);
    length += leg.len;
    const move = moves[i];
    if (move && i < legs.length - 1) {
      const j = g.network.junctions.find((x) => x.id === move.junction)!;
      steps.push({ turn: move.turn, at: { x: j.at[0], z: j.at[1] }, distanceFromStart: length });
    }
  });

  const spot = placeSpot(g.network, to);
  points.push({ x: spot.x, z: spot.z });
  const last = legs[legs.length - 1];
  steps.push({ turn: "arrive", at: { x: spot.x, z: spot.z }, distanceFromStart: length, side: sideOf(to, last.dir) });

  return { points, length, steps, moves };
}

// where the vehicle is along a route: the distance travelled and how far it is off the line
function project(r: Route, p: { x: number; z: number }): { along: number; off: number } {
  let best = { along: 0, off: Infinity };
  let cum = 0;
  for (let i = 1; i < r.points.length; i++) {
    const a = r.points[i - 1];
    const b = r.points[i];
    const sx = b.x - a.x;
    const sz = b.z - a.z;
    const len = Math.hypot(sx, sz);
    const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * sx + (p.z - a.z) * sz) / (len * len)));
    const off = Math.hypot(a.x + sx * t - p.x, a.z + sz * t - p.z);
    if (off < best.off) best = { along: cum + len * t, off };
    cum += len;
  }
  return best;
}

// The next turn (or the arrival) still ahead, and how far away it is. With the
// vehicle's heading, the U-turn that opens a route stays due until it faces the
// way of the route.
export function nextStep(r: Route, p: { x: number; z: number }, heading?: number): { step: Step; distance: number } | null {
  const { along: a } = project(r, p);
  const first = r.points.length > 1 ? { x: r.points[1].x - r.points[0].x, z: r.points[1].z - r.points[0].z } : null;
  const facingAway =
    heading !== undefined && first !== null && Math.cos(heading) * first.x + Math.sin(heading) * first.z < -0.3 * Math.hypot(first.x, first.z);
  const step = r.steps.find(
    (s) => s.turn === "arrive" || s.distanceFromStart > a + 1 || (s.turn === "uturn" && s.distanceFromStart === 0 && facingAway && a < OPENING_UTURN_M),
  );
  if (!step) return null;
  return { step, distance: Math.max(0, step.distanceFromStart - a) };
}

// Has the vehicle left the road the route follows?
export function offRoute(r: Route, p: { x: number; z: number }, limit = 25): boolean {
  return project(r, p).off > limit;
}
