import type { Junction, Network, Road, RoadId, TurnRule } from "../data/network-v1";
import type { Shape } from "./footprint";

// A road is a chain of straight pieces and quarter-circle arcs at its rounded
// corners. Distance `s` runs along the centreline; on a closed road it wraps.
export type Seg = { kind: "seg"; s0: number; len: number; ax: number; az: number; dx: number; dz: number };
export type Arc = { kind: "arc"; s0: number; len: number; cx: number; cz: number; r: number; a0: number; sweep: number };
export type Piece = Seg | Arc;
export type BuiltRoad = { road: Road; pieces: Piece[]; segments: Seg[]; arcs: Arc[]; length: number };

const norm = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function buildRoad(road: Road): BuiltRoad {
  const pts = road.points;
  const n = pts.length;
  const closed = !!road.closed;
  const edges = closed ? n : n - 1;
  const dir = (i: number) => {
    const [ax, az] = pts[i % n];
    const [bx, bz] = pts[(i + 1) % n];
    const len = Math.hypot(bx - ax, bz - az);
    return { dx: (bx - ax) / len, dz: (bz - az) / len, len };
  };

  // corner k sits between edge k-1 and edge k; open roads have none at their ends
  const corner = (k: number) => {
    if (!closed && (k === 0 || k === n - 1)) return null;
    const d1 = dir((k - 1 + n) % n);
    const d2 = dir(k % n);
    const cross = d1.dx * d2.dz - d1.dz * d2.dx;
    const dot = d1.dx * d2.dx + d1.dz * d2.dz;
    if (road.cornerRadius <= 0 || Math.abs(cross) < 1e-9) return null;
    const sign = cross > 0 ? 1 : -1;
    const angle = Math.atan2(Math.abs(cross), dot);
    const tangent = road.cornerRadius * Math.tan(angle / 2);
    const [px, pz] = pts[k % n];
    const t1x = px - d1.dx * tangent;
    const t1z = pz - d1.dz * tangent;
    const cx = t1x + sign * -d1.dz * road.cornerRadius;
    const cz = t1z + sign * d1.dx * road.cornerRadius;
    return { tangent, cx, cz, a0: Math.atan2(t1z - cz, t1x - cx), sweep: sign * angle };
  };

  const pieces: Piece[] = [];
  let s = 0;
  const addSeg = (i: number) => {
    const d = dir(i);
    const startTrim = corner(i)?.tangent ?? 0;
    const endTrim = corner(i + 1)?.tangent ?? 0;
    const len = d.len - startTrim - endTrim;
    const [px, pz] = pts[i % n];
    if (len > 1e-9) {
      pieces.push({ kind: "seg", s0: s, len, ax: px + d.dx * startTrim, az: pz + d.dz * startTrim, dx: d.dx, dz: d.dz });
      s += len;
    }
  };
  const addArc = (k: number) => {
    const c = corner(k);
    if (!c) return;
    const len = Math.abs(c.sweep) * road.cornerRadius;
    pieces.push({ kind: "arc", s0: s, len, cx: c.cx, cz: c.cz, r: road.cornerRadius, a0: c.a0, sweep: c.sweep });
    s += len;
  };

  for (let i = 0; i < edges; i++) {
    addSeg(i);
    if (i + 1 < edges || closed) addArc((i + 1) % n);
  }

  return {
    road,
    pieces,
    segments: pieces.filter((p): p is Seg => p.kind === "seg"),
    arcs: pieces.filter((p): p is Arc => p.kind === "arc"),
    length: s,
  };
}

export const roadLength = (r: BuiltRoad): number => r.length;

function locate(r: BuiltRoad, s: number): { piece: Piece; u: number } {
  const len = r.length;
  const d = r.road.closed ? ((s % len) + len) % len : Math.max(0, Math.min(len, s));
  for (const piece of r.pieces) {
    if (d <= piece.s0 + piece.len || piece === r.pieces[r.pieces.length - 1]) {
      return { piece, u: Math.max(0, Math.min(piece.len, d - piece.s0)) };
    }
  }
  throw new Error("road has no pieces");
}

export function pointAt(r: BuiltRoad, s: number): { x: number; z: number } {
  const { piece, u } = locate(r, s);
  if (piece.kind === "seg") return { x: piece.ax + piece.dx * u, z: piece.az + piece.dz * u };
  const a = piece.a0 + piece.sweep * (u / piece.len);
  return { x: piece.cx + piece.r * Math.cos(a), z: piece.cz + piece.r * Math.sin(a) };
}

// Direction of travel, in the vehicle-heading convention (0 faces +x).
export function headingAt(r: BuiltRoad, s: number): number {
  const { piece, u } = locate(r, s);
  if (piece.kind === "seg") return Math.atan2(piece.dz, piece.dx);
  const a = piece.a0 + piece.sweep * (u / piece.len);
  return norm(a + Math.sign(piece.sweep) * (Math.PI / 2));
}

// ---- queries on a whole network ----

export const FOOTPATH_WIDTH = 3.6;
export const VERGE_WIDTH = 1.8;
export const KERB_HEIGHT = 0.15;
const KERB_RETURN = 2; // where the corners of a junction are rounded off
export const JUNCTION_BOX_HALF = 6 + KERB_RETURN; // half the side of a junction box
const EPS = 1e-6;
const MIN_JUNCTION_GAP = 150;

const cache = new WeakMap<Network, BuiltRoad[]>();

export function builtRoads(n: Network): BuiltRoad[] {
  let b = cache.get(n);
  if (!b) {
    b = n.roads.map(buildRoad);
    cache.set(n, b);
  }
  return b;
}

export type Nearest = { road: RoadId; s: number; lateral: number; side: -1 | 1; distance: number; x: number; z: number };

// The closest point on one road centreline.
export function nearestOnRoad(r: BuiltRoad, x: number, z: number): Nearest {
  let best: Nearest | null = null;
  for (const piece of r.pieces) {
    let cx: number;
    let cz: number;
    let u: number;
    if (piece.kind === "seg") {
      u = Math.max(0, Math.min(piece.len, (x - piece.ax) * piece.dx + (z - piece.az) * piece.dz));
      cx = piece.ax + piece.dx * u;
      cz = piece.az + piece.dz * u;
    } else {
      const ang = Math.atan2(z - piece.cz, x - piece.cx);
      // how far round the arc, in the direction of travel, wrapped to [0, 2pi)
      let t = ((ang - piece.a0) * Math.sign(piece.sweep)) % (2 * Math.PI);
      if (t < 0) t += 2 * Math.PI;
      const span = Math.abs(piece.sweep);
      if (t > span) t = t - span < 2 * Math.PI - t ? span : 0;
      u = t * piece.r;
      const a = piece.a0 + Math.sign(piece.sweep) * t;
      cx = piece.cx + piece.r * Math.cos(a);
      cz = piece.cz + piece.r * Math.sin(a);
    }
    const distance = Math.hypot(x - cx, z - cz);
    if (!best || distance < best.distance) {
      best = { road: r.road.id, s: piece.s0 + u, lateral: 0, side: 1, distance, x: cx, z: cz };
    }
  }
  const b = best!;
  const h = headingAt(r, b.s);
  const cross = Math.cos(h) * (z - b.z) - Math.sin(h) * (x - b.x);
  const side: -1 | 1 = cross < 0 ? -1 : 1;
  return { ...b, side, lateral: side * b.distance };
}

export function nearest(n: Network, x: number, z: number): Nearest {
  let best: Nearest | null = null;
  for (const r of builtRoads(n)) {
    const c = nearestOnRoad(r, x, z);
    if (!best || c.distance < best.distance) best = c;
  }
  return best!;
}

const inBox = (j: Junction, x: number, z: number, half: number) =>
  Math.abs(x - j.at[0]) <= half + EPS && Math.abs(z - j.at[1]) <= half + EPS;

export function drivable(n: Network, x: number, z: number): boolean {
  for (const r of builtRoads(n)) {
    if (nearestOnRoad(r, x, z).distance <= r.road.halfWidth + EPS) return true;
  }
  return n.junctions.some((j) => inBox(j, x, z, JUNCTION_BOX_HALF));
}

// Raised footpath within FOOTPATH_WIDTH of the carriageway edge, unless the spot is paved.
export function groundY(n: Network, x: number, z: number): number {
  if (drivable(n, x, z)) return 0;
  for (const r of builtRoads(n)) {
    if (nearestOnRoad(r, x, z).distance <= r.road.halfWidth + FOOTPATH_WIDTH + EPS) return KERB_HEIGHT;
  }
  return 0;
}

// The nearest paved point, for a vehicle that has driven off the road.
export function clampToDrivable(n: Network, x: number, z: number): { x: number; z: number; clamped: boolean } {
  if (drivable(n, x, z)) return { x, z, clamped: false };
  let best = { x, z };
  let bestD = Infinity;
  for (const r of builtRoads(n)) {
    const c = nearestOnRoad(r, x, z);
    const k = r.road.halfWidth / c.distance;
    const cand = { x: c.x + (x - c.x) * k, z: c.z + (z - c.z) * k };
    const d = Math.hypot(cand.x - x, cand.z - z);
    if (d < bestD) {
      bestD = d;
      best = cand;
    }
  }
  for (const j of n.junctions) {
    const cand = {
      x: Math.max(j.at[0] - JUNCTION_BOX_HALF, Math.min(j.at[0] + JUNCTION_BOX_HALF, x)),
      z: Math.max(j.at[1] - JUNCTION_BOX_HALF, Math.min(j.at[1] + JUNCTION_BOX_HALF, z)),
    };
    const d = Math.hypot(cand.x - x, cand.z - z);
    if (d < bestD) {
      bestD = d;
      best = cand;
    }
  }
  return { ...best, clamped: true };
}

// Ground scenery must keep out of: carriageway, footpath, verge and every junction box.
export function keepOutShapes(n: Network): Shape[] {
  const shapes: Shape[] = [];
  for (const r of builtRoads(n)) {
    const across = 2 * (r.road.halfWidth + FOOTPATH_WIDTH + VERGE_WIDTH) + 0.8;
    for (const piece of r.pieces) {
      if (piece.kind === "seg") {
        shapes.push({
          kind: "rect",
          x: piece.ax + (piece.dx * piece.len) / 2,
          z: piece.az + (piece.dz * piece.len) / 2,
          w: piece.len + 1,
          d: across,
          heading: Math.atan2(piece.dz, piece.dx),
        });
      } else {
        const steps = Math.max(2, Math.ceil(Math.abs(piece.sweep) / (Math.PI / 18)));
        for (let i = 0; i < steps; i++) {
          const mid = piece.s0 + ((i + 0.5) / steps) * piece.len;
          const p = pointAt(r, mid);
          shapes.push({ kind: "rect", x: p.x, z: p.z, w: (piece.len / steps) * 1.3 + 1, d: across, heading: headingAt(r, mid) });
        }
      }
    }
  }
  for (const j of n.junctions) {
    const side = 2 * (JUNCTION_BOX_HALF + FOOTPATH_WIDTH + VERGE_WIDTH) + 0.8;
    shapes.push({ kind: "rect", x: j.at[0], z: j.at[1], w: side, d: side, heading: 0 });
  }
  return shapes;
}

// Check a network (and optionally the places on it). Bad parts are dropped from
// `valid`, with a message each, the way junctions were checked before.
export function validateNetwork(
  n: Network,
  places: { id: string; road: string; s: number }[],
): { problems: string[]; valid: Network } {
  const problems: string[] = [];
  const dropRoads = new Set<RoadId>();

  for (const r of n.roads) {
    const pts = r.points;
    const edges = r.closed ? pts.length : pts.length - 1;
    const lens: number[] = [];
    for (let i = 0; i < edges; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      lens.push(Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    const shortest = Math.min(...lens);
    if (r.cornerRadius > shortest / 2 + EPS) {
      problems.push(`road ${r.id}: corner radius ${r.cornerRadius} is more than half its shortest side (${shortest} m)`);
      dropRoads.add(r.id);
    }
  }

  const roads = n.roads.filter((r) => !dropRoads.has(r.id));
  const byId = new Map(builtRoads({ roads, junctions: [] }).map((b) => [b.road.id, b]));

  const keep: Junction[] = [];
  for (const j of n.junctions) {
    const gone = j.roads.find((id) => dropRoads.has(id));
    if (gone) {
      problems.push(`junction ${j.id}: it needs road ${gone}, which was left out`);
      continue;
    }
    const missing = j.roads.find((id) => {
      const b = byId.get(id);
      return !b || nearestOnRoad(b, j.at[0], j.at[1]).distance > 0.5;
    });
    if (missing) {
      problems.push(`junction ${j.id}: road ${missing} does not pass through (${j.at[0]}, ${j.at[1]})`);
      continue;
    }
    const allowed: Record<string, TurnRule[]> = {};
    for (const [key, turns] of Object.entries(j.allowed)) {
      const [road, dir] = key.split(":");
      if (!j.roads.includes(road) || (dir !== "1" && dir !== "-1")) {
        problems.push(`junction ${j.id}: rule for approach ${key}, which is not there`);
        continue;
      }
      allowed[key] = turns;
    }
    // two junctions on one road must be 150 m apart (round the loop if it is closed)
    let tooClose: string | null = null;
    for (const id of j.roads) {
      const b = byId.get(id)!;
      const s = nearestOnRoad(b, j.at[0], j.at[1]).s;
      for (const o of keep) {
        if (!o.roads.includes(id)) continue;
        const so = nearestOnRoad(b, o.at[0], o.at[1]).s;
        let gap = Math.abs(s - so);
        if (b.road.closed) gap = Math.min(gap, b.length - gap);
        if (gap < MIN_JUNCTION_GAP - EPS) tooClose = `${o.id} on road ${id} (${gap.toFixed(0)} m)`;
      }
    }
    if (tooClose) {
      problems.push(`junction ${j.id}: closer than ${MIN_JUNCTION_GAP} m to ${tooClose}`);
      continue;
    }
    keep.push({ ...j, allowed });
  }

  for (const p of places) {
    const b = byId.get(p.road);
    if (!b) problems.push(`place ${p.id}: road ${p.road} does not exist`);
    else if (p.s < 0 || p.s > b.length) problems.push(`place ${p.id}: ${p.s} m is beyond the end of road ${p.road} (${b.length.toFixed(0)} m)`);
  }

  return { problems, valid: { roads, junctions: keep } };
}
