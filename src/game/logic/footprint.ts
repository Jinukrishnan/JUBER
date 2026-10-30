import { BAY_OFFSET, BAY_WIDTH } from "./bay";
import { TURN_AROUND_RADIUS, armSigns, localToWorld, type ResolvedJunction } from "./junction";
import { FOOTPATH_WIDTH, VERGE_WIDTH, roadAngle, roadCenterZ, roadHalfWidthAt } from "./road";
import { polePositions, type RoadFeatures } from "./roadside";
import type { Stop } from "./route";

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

const SEGMENT = 20; // metres of road per keep-out rectangle
const SHELTER_EDGE = BAY_OFFSET + BAY_WIDTH / 2 + 2.2; // shelter centre, from the road centreline

// Everything scenery must stay out of: the road, footpath and verge (including
// the widened turn-around areas), every shelter and its sign post, every sign
// pole and every electric pole.
export function keepOutZones(stops: Stop[], features: RoadFeatures, junctions: ResolvedJunction[] = []): Shape[] {
  const zones: Shape[] = [];
  const first = stops[0].position - 90;
  const last = stops[stops.length - 1].position + 110;
  for (let x = first; x < last; x += SEGMENT) {
    const mid = x + SEGMENT / 2;
    // the widest the road gets within the segment, plus a margin for the curve
    const half = Math.max(roadHalfWidthAt(x), roadHalfWidthAt(mid), roadHalfWidthAt(x + SEGMENT));
    zones.push({
      kind: "rect",
      x: mid,
      z: roadCenterZ(mid),
      w: SEGMENT + 1,
      d: 2 * (half + FOOTPATH_WIDTH + VERGE_WIDTH) + 0.8,
      heading: roadAngle(mid),
    });
  }
  for (const s of stops) {
    const cz = roadCenterZ(s.position);
    for (const side of [-1, 1]) {
      zones.push({ kind: "rect", x: s.position + 0.3, z: cz + side * SHELTER_EDGE, w: 8.6, d: 3.6, heading: 0 });
    }
  }
  for (const sign of features.signs) {
    const lat = roadHalfWidthAt(sign.x) + 0.9;
    zones.push({ kind: "circle", x: sign.x, z: roadCenterZ(sign.x) + (sign.side === "left" ? -lat : lat), r: 0.8 });
  }
  for (const j of junctions) {
    const across = 2 * (j.armHalfWidth + FOOTPATH_WIDTH + VERGE_WIDTH) + 0.8;
    for (const side of armSigns(j.arms)) {
      const mid = localToWorld(j, 0, side * (j.armLength / 2));
      zones.push({ kind: "rect", x: mid.x, z: mid.z, w: j.armLength + 2, d: across, heading: j.angle + Math.PI / 2 });
      const end = localToWorld(j, 0, side * j.armLength);
      zones.push({ kind: "circle", x: end.x, z: end.z, r: TURN_AROUND_RADIUS + 4 });
    }
  }
  for (const x of polePositions(stops, junctions)) {
    zones.push({ kind: "circle", x, z: roadCenterZ(x) + roadHalfWidthAt(x) + FOOTPATH_WIDTH + 0.9, r: 0.6 });
  }
  return zones;
}
