import type { Network } from "../data/network-v1";
import type { Place } from "../data/places-v1";
import { BAY_OFFSET, BAY_WIDTH } from "./bay";
import { builtRoads, headingAt, keepOutShapes, pointAt } from "./network";
import type { RoadFeatures } from "./roadside";

// Ground footprints of things standing in the world, and the zones scenery must
// keep out of. A rect's `w` runs along `heading` (0 faces +x) and `d` across it.
export type Shape =
  | { kind: "circle"; x: number; z: number; r: number }
  | { kind: "rect"; x: number; z: number; w: number; d: number; heading: number };

type Rect = Extract<Shape, { kind: "rect" }>;
type Circle = Extract<Shape, { kind: "circle" }>;

function corners(r: Rect): [number, number][] {
  const ux = Math.cos(r.heading);
  const uz = Math.sin(r.heading);
  const vx = -uz;
  const vz = ux;
  const hw = r.w / 2;
  const hd = r.d / 2;
  return [
    [r.x - hw * ux - hd * vx, r.z - hw * uz - hd * vz],
    [r.x + hw * ux - hd * vx, r.z + hw * uz - hd * vz],
    [r.x + hw * ux + hd * vx, r.z + hw * uz + hd * vz],
    [r.x - hw * ux + hd * vx, r.z - hw * uz + hd * vz],
  ];
}

function rectRect(a: Rect, b: Rect): boolean {
  const ca = corners(a);
  const cb = corners(b);
  // separating axis test on both rectangles' edge normals
  for (const r of [a, b]) {
    const axes: [number, number][] = [
      [Math.cos(r.heading), Math.sin(r.heading)],
      [-Math.sin(r.heading), Math.cos(r.heading)],
    ];
    for (const [ax, az] of axes) {
      const pa = ca.map(([x, z]) => x * ax + z * az);
      const pb = cb.map(([x, z]) => x * ax + z * az);
      if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) return false;
    }
  }
  return true;
}

function circleRect(c: Circle, r: Rect): boolean {
  const dx = c.x - r.x;
  const dz = c.z - r.z;
  const cos = Math.cos(r.heading);
  const sin = Math.sin(r.heading);
  // circle centre in the rectangle's own frame
  const lx = dx * cos + dz * sin;
  const lz = -dx * sin + dz * cos;
  const nx = Math.max(-r.w / 2, Math.min(r.w / 2, lx));
  const nz = Math.max(-r.d / 2, Math.min(r.d / 2, lz));
  return Math.hypot(lx - nx, lz - nz) < c.r;
}

export function overlaps(a: Shape, b: Shape): boolean {
  if (a.kind === "circle" && b.kind === "circle") return Math.hypot(a.x - b.x, a.z - b.z) < a.r + b.r;
  if (a.kind === "circle" && b.kind === "rect") return circleRect(a, b);
  if (a.kind === "rect" && b.kind === "circle") return circleRect(b, a);
  return rectRect(a as Rect, b as Rect);
}

const SHELTER_EDGE = BAY_OFFSET + BAY_WIDTH / 2 + 2.2; // shelter centre, from the road centreline

// Everything scenery must stay out of: the roads with their footpaths, verges and
// junction boxes, every shelter and its sign post, every sign pole and every
// electric pole.
export function keepOutZones(n: Network, places: Place[], features: RoadFeatures): Shape[] {
  const zones = keepOutShapes(n);
  const roads = builtRoads(n);
  for (const p of places) {
    if (!p.shelter) continue;
    const r = roads.find((b) => b.road.id === p.road)!;
    const c = pointAt(r, p.s + 0.3);
    const h = headingAt(r, p.s);
    const lat = p.side * SHELTER_EDGE;
    zones.push({ kind: "rect", x: c.x - Math.sin(h) * lat, z: c.z + Math.cos(h) * lat, w: 8.6, d: 3.6, heading: h });
  }
  for (const sign of features.signs) zones.push({ kind: "circle", x: sign.x, z: sign.z, r: 0.8 });
  for (const pole of features.poles) zones.push({ kind: "circle", x: pole.x, z: pole.z, r: 0.6 });
  return zones;
}

// A coarse square grid so a shape is only compared with its neighbours instead of
// everything: the layout has thousands of shapes.
const GRID_CELL = 25;
function reach(s: Shape): number {
  return s.kind === "circle" ? s.r : Math.hypot(s.w, s.d) / 2;
}
export class ShapeGrid {
  private cells = new Map<string, Shape[]>();
  private each(s: Shape, fn: (list: Shape[] | undefined, key: string) => boolean | void): boolean {
    const r = reach(s);
    for (let cx = Math.floor((s.x - r) / GRID_CELL); cx <= Math.floor((s.x + r) / GRID_CELL); cx++) {
      for (let cz = Math.floor((s.z - r) / GRID_CELL); cz <= Math.floor((s.z + r) / GRID_CELL); cz++) {
        const key = `${cx},${cz}`;
        if (fn(this.cells.get(key), key)) return true;
      }
    }
    return false;
  }
  add(s: Shape) {
    this.each(s, (list, key) => {
      if (list) list.push(s);
      else this.cells.set(key, [s]);
    });
  }
  // true if any stored shape that could be near `s` overlaps it
  hits(s: Shape): boolean {
    return this.each(s, (list) => !!list && list.some((o) => overlaps(s, o)));
  }
}
