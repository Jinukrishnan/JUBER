import type { Place } from "../data/places-v1";
import { armSigns, localToWorld, onSideRoad, worldToLocal, type ResolvedJunction } from "./junction";
import { placeSpot } from "./places";
import { roadAngle, roadCenterZ } from "./road";

// Routes along the roads. Every side road joins the main road at a junction,
// so the road network is a spine (the main road) with arms hanging off it, and
// the way between two points is always: out of the arm you are on, along the
// spine, into the arm you want. No search is needed.

export type Graph = { junctions: ResolvedJunction[]; places: Place[] };
export type Position = { x: number; z: number; heading?: number };

export type Turn = "left" | "right" | "uturn" | "arrive";
export type Step = {
  turn: Turn;
  at: { x: number; z: number };
  distanceFromStart: number;
  side?: "left" | "right"; // for "arrive": which side of the road the place is on
};
export type Route = { points: { x: number; z: number }[]; length: number; steps: Step[] };

const STRAIGHT_LIMIT = (25 * Math.PI) / 180;
const UTURN_LIMIT = (150 * Math.PI) / 180;
const SAMPLE_M = 15;

export function buildGraph(junctions: ResolvedJunction[], places: Place[]): Graph {
  return { junctions, places };
}

// where something is on the road network: on the main road at x, or on an arm
type Loc =
  | { kind: "main"; x: number }
  | { kind: "arm"; j: ResolvedJunction; s: -1 | 1; d: number };

type Leg =
  | { kind: "main"; x0: number; x1: number }
  | { kind: "arm"; j: ResolvedJunction; s: -1 | 1; d0: number; d1: number };

function locateAt(g: Graph, x: number, z: number): Loc {
  if (onSideRoad(g.junctions, x, z)) {
    let best: Loc | null = null;
    let bestScore = Infinity;
    for (const j of g.junctions) {
      const { u, v } = worldToLocal(j, x, z);
      for (const s of armSigns(j.arms)) {
        // distance to this arm's axis, measured along the arm (clamped to its length)
        const d = Math.max(0, Math.min(j.armLength, s * v));
        const score = Math.abs(u) + Math.abs(s * v - d);
        if (score < bestScore) {
          bestScore = score;
          best = { kind: "arm", j, s, d };
        }
      }
    }
    if (best) return best;
  }
  return { kind: "main", x };
}

function locatePlace(g: Graph, p: Place): Loc {
  const at = p.at;
  if (at.kind === "main") return { kind: "main", x: at.x };
  const j = g.junctions.find((r) => r.id === at.junctionId);
  if (!j) throw new Error(`No junction "${at.junctionId}" for place "${p.id}"`);
  return { kind: "arm", j, s: at.side, d: at.distance };
}

// length of the (gently curving) main road between two x positions
function mainLength(x0: number, x1: number): number {
  const a = Math.min(x0, x1);
  const b = Math.max(x0, x1);
  let len = 0;
  let px = a;
  let pz = roadCenterZ(a);
  for (let x = a + 5; x < b + 5; x += 5) {
    const cx = Math.min(x, b);
    const cz = roadCenterZ(cx);
    len += Math.hypot(cx - px, cz - pz);
    px = cx;
    pz = cz;
  }
  return len;
}

const legLength = (l: Leg) => (l.kind === "main" ? mainLength(l.x0, l.x1) : Math.abs(l.d1 - l.d0));

// unit direction of travel along a leg, at its start or its end
function legDir(l: Leg, end: "start" | "end"): { x: number; z: number } {
  if (l.kind === "main") {
    const x = end === "start" ? l.x0 : l.x1;
    const a = roadAngle(x);
    const sign = l.x1 >= l.x0 ? 1 : -1;
    return { x: Math.cos(a) * sign, z: Math.sin(a) * sign };
  }
  // the arm's own axis in the world, pointing out from the main road
  const out = { x: -Math.sin(l.j.angle) * l.s, z: Math.cos(l.j.angle) * l.s };
  const sign = l.d1 >= l.d0 ? 1 : -1;
  return { x: out.x * sign, z: out.z * sign };
}

function legPoints(l: Leg): { x: number; z: number }[] {
  const pts: { x: number; z: number }[] = [];
  const n = Math.max(1, Math.ceil(legLength(l) / SAMPLE_M));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (l.kind === "main") {
      const x = l.x0 + (l.x1 - l.x0) * t;
      pts.push({ x, z: roadCenterZ(x) });
    } else {
      const d = l.d0 + (l.d1 - l.d0) * t;
      pts.push(localToWorld(l.j, 0, l.s * d));
    }
  }
  return pts;
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

function legsBetween(a: Loc, b: Loc): Leg[] {
  const legs: Leg[] = [];
  if (a.kind === "main" && b.kind === "main") {
    legs.push({ kind: "main", x0: a.x, x1: b.x });
  } else if (a.kind === "arm" && b.kind === "arm" && a.j.id === b.j.id && a.s === b.s) {
    legs.push({ kind: "arm", j: a.j, s: a.s, d0: a.d, d1: b.d });
  } else {
    if (a.kind === "arm") legs.push({ kind: "arm", j: a.j, s: a.s, d0: a.d, d1: 0 });
    const xs = a.kind === "main" ? a.x : a.j.x;
    const xe = b.kind === "main" ? b.x : b.j.x;
    if (Math.abs(xe - xs) > 0.01) legs.push({ kind: "main", x0: xs, x1: xe });
    if (b.kind === "arm") legs.push({ kind: "arm", j: b.j, s: b.s, d0: 0, d1: b.d });
  }
  return legs.filter((l) => legLength(l) > 0.01);
}

// The way from where the vehicle is to a place: the points to draw, the length,
// and the turns on the way (ending with the arrival).
export function route(g: Graph, from: Position, to: Place): Route {
  const a = locateAt(g, from.x, from.z);
  const b = locatePlace(g, to);
  const legs = legsBetween(a, b);

  const points: { x: number; z: number }[] = [{ x: from.x, z: from.z }];
  const steps: Step[] = [];
  let length = 0;

  if (legs.length > 0 && from.heading !== undefined) {
    const d = legDir(legs[0], "start");
    // facing more than about 107 degrees away from the first leg
    if (Math.cos(from.heading) * d.x + Math.sin(from.heading) * d.z < -0.3) {
      steps.push({ turn: "uturn", at: { x: from.x, z: from.z }, distanceFromStart: 0 });
    }
  }

  legs.forEach((leg, i) => {
    if (i > 0) {
      const d1 = legDir(legs[i - 1], "end");
      const d2 = legDir(leg, "start");
      const turn = wrap(Math.atan2(d2.z, d2.x) - Math.atan2(d1.z, d1.x));
      const at = points[points.length - 1];
      if (Math.abs(turn) > UTURN_LIMIT) steps.push({ turn: "uturn", at, distanceFromStart: length });
      else if (turn > STRAIGHT_LIMIT) steps.push({ turn: "right", at, distanceFromStart: length });
      else if (turn < -STRAIGHT_LIMIT) steps.push({ turn: "left", at, distanceFromStart: length });
    }
    for (const p of legPoints(leg).slice(1)) points.push(p);
    length += legLength(leg);
  });

  // end at the kerb spot itself (the last few metres across the lane are not counted in the length)
  const spot = placeSpot(to, g.junctions);
  const last = points[points.length - 1];
  points.push({ x: spot.x, z: spot.z });

  // which side of the road the place is on, as seen travelling in
  let side: "left" | "right" | undefined;
  if (legs.length > 0) {
    const d = legDir(legs[legs.length - 1], "end");
    const cross = d.x * (spot.z - last.z) - d.z * (spot.x - last.x);
    side = cross > 0 ? "right" : "left";
  } else if (from.heading !== undefined) {
    const cross = Math.cos(from.heading) * (spot.z - last.z) - Math.sin(from.heading) * (spot.x - last.x);
    side = cross > 0 ? "right" : "left";
  }
  steps.push({ turn: "arrive", at: { x: spot.x, z: spot.z }, distanceFromStart: length, side });

  return { points, length, steps };
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

// The next turn (or the arrival) still ahead, and how far away it is.
export function nextStep(r: Route, p: { x: number; z: number }): { step: Step; distance: number } | null {
  const { along } = project(r, p);
  const step = r.steps.find((s) => s.distanceFromStart > along + 1 || s.turn === "arrive");
  if (!step) return null;
  return { step, distance: Math.max(0, step.distanceFromStart - along) };
}

// Has the vehicle left the road the route follows?
export function offRoute(r: Route, p: { x: number; z: number }, limit = 25): boolean {
  return project(r, p).off > limit;
}
