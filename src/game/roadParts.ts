import type { Network } from "./data/network-v1";
import type { Item } from "./Instances";
import {
  FOOTPATH_WIDTH,
  JUNCTION_BOX_HALF,
  KERB_HEIGHT,
  VERGE_WIDTH,
  builtRoads,
  headingAt,
  nearestOnRoad,
  pointAt,
  roadArms,
  type BuiltRoad,
} from "./logic/network";
import { mainRoad } from "./logic/turns";

// The built pieces of every road as plain data (the components turn them into
// meshes): asphalt, footpaths, verges, kerb walls, edge lines, centre dashes and
// the paved "mouths" where a side road opens through a footpath.
//
// One road owns each junction corner: the main one (the ring, or Temple Road). Its
// footpath runs through and is cut only where the other road opens; the other
// road's footpath stops short of the owner's, so footpaths never overlap.
export type P = { x: number; z: number };
export type Strip = { road: string; a: P[]; b: P[]; y: number };
export type Wall = { road: string; pts: P[]; y0: number; y1: number };
export type RoadParts = {
  asphalt: Strip[];
  footpaths: Strip[];
  verges: Strip[];
  edgeLines: Strip[];
  kerbs: Wall[];
  dashes: Item[];
  mouths: Item[];
};

const STEP = 3; // metres between samples along a road
const DASH_PERIOD = 9;
const DASH_LENGTH = 3;
const DASH_CLEAR = 8; // dashes stop this far before a junction box
const MOUTH_COLOR = "#3e4044";
const Y = { verge: 0.005, asphalt: 0.01, mouth: 0.012, foot: KERB_HEIGHT, edge: 0.03, dash: 0.03 };

type Range = [number, number];

function subtract(full: Range, cuts: Range[], closed: boolean, length: number): Range[] {
  // a cut that runs past either end of a closed road wraps round to the other end
  const all: Range[] = [];
  for (const [a, b] of cuts) {
    all.push([a, b]);
    if (closed && a < 0) all.push([a + length, b + length]);
    if (closed && b > length) all.push([a - length, b - length]);
  }
  all.sort((p, q) => p[0] - q[0]);
  const out: Range[] = [];
  let from = full[0];
  for (const [a, b] of all) {
    if (b <= from) continue;
    if (a > from) out.push([from, Math.min(a, full[1])]);
    from = Math.max(from, b);
    if (from >= full[1]) break;
  }
  if (from < full[1]) out.push([from, full[1]]);
  return out.filter(([a, b]) => b - a > 1e-6);
}

function samples(r: BuiltRoad, a: number, b: number): number[] {
  const n = Math.max(1, Math.ceil((b - a) / STEP));
  return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
}

const rightOf = (r: BuiltRoad, s: number, off: number): P => {
  const p = pointAt(r, s);
  const h = headingAt(r, s);
  return { x: p.x - Math.sin(h) * off, z: p.z + Math.cos(h) * off };
};

function strip(r: BuiltRoad, range: Range, offA: number, offB: number, y: number): Strip {
  const ss = samples(r, range[0], range[1]);
  return { road: r.road.id, a: ss.map((s) => rightOf(r, s, offA)), b: ss.map((s) => rightOf(r, s, offB)), y };
}

export function roadParts(n: Network): RoadParts {
  const roads = builtRoads(n);
  const parts: RoadParts = { asphalt: [], footpaths: [], verges: [], edgeLines: [], kerbs: [], dashes: [], mouths: [] };
  const sOf = (r: BuiltRoad, x: number, z: number) => nearestOnRoad(r, x, z).s;

  for (const r of roads) {
    const hw = r.road.halfWidth;
    const full: Range = [0, r.length];
    const closed = !!r.road.closed;
    parts.asphalt.push(strip(r, full, -hw, hw, Y.asphalt));

    // per side (-1 left, +1 right of the direction the road runs): where the footpath and
    // kerb must stop for a road that opens on that side
    const footCuts: Record<number, Range[]> = { [-1]: [], [1]: [] };
    const kerbCuts: Record<number, Range[]> = { [-1]: [], [1]: [] };

    for (const j of n.junctions) {
      if (!j.roads.includes(r.road.id)) continue;
      const sj = sOf(r, j.at[0], j.at[1]);
      const owner = mainRoad(n, j) === r.road.id;
      const h = headingAt(r, sj);
      const right = { x: -Math.sin(h), z: Math.cos(h) };
      for (const bId of j.roads) {
        if (bId === r.road.id) continue;
        const other = roads.find((b) => b.road.id === bId)!;
        for (const side of [-1, 1] as const) {
          const opens = roadArms(n, j, bId).some((v) => v.x * right.x * side + v.z * right.z * side > 0.5);
          if (!opens) continue;
          kerbCuts[side].push([sj - JUNCTION_BOX_HALF, sj + JUNCTION_BOX_HALF]);
          if (owner) {
            footCuts[side].push([sj - JUNCTION_BOX_HALF, sj + JUNCTION_BOX_HALF]);
            const c = rightOf(r, sj, side * (hw + FOOTPATH_WIDTH / 2));
            parts.mouths.push({
              x: c.x,
              y: Y.mouth,
              z: c.z,
              sx: 2 * JUNCTION_BOX_HALF,
              sy: 0.02,
              sz: FOOTPATH_WIDTH + 0.05,
              color: MOUTH_COLOR,
              ry: -h,
            });
          } else {
            const reach = other.road.halfWidth + FOOTPATH_WIDTH;
            footCuts[side].push([sj - reach, sj + reach]);
          }
        }
      }
    }

    for (const side of [-1, 1] as const) {
      for (const range of subtract(full, footCuts[side], closed, r.length)) {
        const from = side * hw;
        const to = side * (hw + FOOTPATH_WIDTH);
        parts.footpaths.push(strip(r, range, Math.min(from, to), Math.max(from, to), Y.foot));
        const vFrom = side * (hw + FOOTPATH_WIDTH);
        const vTo = side * (hw + FOOTPATH_WIDTH + VERGE_WIDTH);
        parts.verges.push(strip(r, range, Math.min(vFrom, vTo), Math.max(vFrom, vTo), Y.verge));
      }
      for (const range of subtract(full, kerbCuts[side], closed, r.length)) {
        const ss = samples(r, range[0], range[1]);
        parts.kerbs.push({ road: r.road.id, pts: ss.map((s) => rightOf(r, s, side * hw)), y0: 0, y1: KERB_HEIGHT });
        const e = [side * (hw - 0.37), side * (hw - 0.22)].sort((u, v) => u - v);
        parts.edgeLines.push(strip(r, range, e[0], e[1], Y.edge));
      }
    }

    // centre dashes, clear of every junction box
    for (let s = DASH_PERIOD / 2; s < r.length; s += DASH_PERIOD) {
      const p = pointAt(r, s);
      const near = n.junctions.some(
        (j) => Math.max(Math.abs(p.x - j.at[0]), Math.abs(p.z - j.at[1])) < JUNCTION_BOX_HALF + DASH_CLEAR + DASH_LENGTH / 2,
      );
      if (near) continue;
      parts.dashes.push({ x: p.x, y: Y.dash, z: p.z, sx: DASH_LENGTH, sy: 0.02, sz: 0.15, color: "#f4f1e6", ry: -headingAt(r, s) });
    }
  }
  return parts;
}
