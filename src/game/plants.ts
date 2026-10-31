import { ROUTE_V1 } from "./data/route-v1";
import type { Item } from "./Instances";
import type { FlowerPlacement, Side } from "./logic/layout";
import { FOOTPATH_WIDTH, VERGE_WIDTH, roadCenterZ, roadHalfWidthAt } from "./logic/road";
import { SLICE_LENGTH } from "./logic/slices";

// Small plants as instance data: flower clusters, grass tufts, bushes, and the
// spots along the verge where tufts and bushes grow. Pure and seeded.
function mulberry(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type FlowerParts = { stem: Item[]; head: Item[]; bush: Item[] };

const HIBISCUS = ["#d6264f", "#f0507a", "#e8303a"];
const MARIGOLD = ["#f5a31a", "#ffb92e", "#f08a10"];
const SPREAD = 0.55; // metres from the cluster centre

function inCluster(r: () => number): { dx: number; dz: number } {
  const a = r() * Math.PI * 2;
  const d = Math.sqrt(r()) * SPREAD;
  return { dx: Math.cos(a) * d, dz: Math.sin(a) * d };
}

export function flowerParts(p: FlowerPlacement): FlowerParts {
  const r = mulberry(p.seed);
  const out: FlowerParts = { stem: [], head: [], bush: [] };

  if (p.species === "sunflower") {
    // the flat axis of a head points along local z; turn it so it faces the road
    const faceRoad = p.side === 1 ? Math.PI : 0;
    for (let i = 0; i < p.count; i++) {
      const { dx, dz } = inCluster(r);
      const h = 1.4 + r() * 1.0;
      const x = p.x + dx;
      const z = p.z + dz;
      out.stem.push({ x, y: h / 2, z, sx: 0.06, sy: h, sz: 0.06, color: "#4f8a2e" });
      out.head.push({ x, y: h, z: z - p.side * 0.04, sx: 0.22, sy: 0.22, sz: 0.06, ry: faceRoad, color: "#4a2d12" });
      out.head.push({ x, y: h, z, sx: 0.38, sy: 0.38, sz: 0.04, ry: faceRoad, color: i % 2 ? "#f2b705" : "#f7c61a" });
    }
    return out;
  }

  // hibiscus and marigold: a bush for every three blooms
  const palette = p.species === "hibiscus" ? HIBISCUS : MARIGOLD;
  const bushes = Math.ceil(p.count / 3);
  const centres: { x: number; z: number }[] = [];
  for (let b = 0; b < bushes; b++) {
    const { dx, dz } = inCluster(r);
    centres.push({ x: p.x + dx * 0.7, z: p.z + dz * 0.7 });
    out.bush.push({ x: p.x + dx * 0.7, y: 0.3, z: p.z + dz * 0.7, sx: 0.38, sy: 0.32, sz: 0.38, color: b % 2 ? "#4a8a3a" : "#3e7d32" });
  }
  for (let i = 0; i < p.count; i++) {
    const c = centres[i % centres.length];
    const a = r() * Math.PI * 2;
    out.head.push({
      x: c.x + Math.cos(a) * 0.15,
      y: 0.45 + r() * 0.3,
      z: c.z + Math.sin(a) * 0.15,
      sx: 0.1, sy: 0.1, sz: 0.1,
      color: palette[i % palette.length],
    });
  }
  return out;
}

const BLADES = ["#86c452", "#96d05c", "#a6dc6a"];

// Two clumps of crossed blades, so a tuft looks like grass from any side.
export function tuftParts(seed: number, x: number, z: number): Item[] {
  const r = mulberry(seed);
  const out: Item[] = [];
  for (let clump = 0; clump < 2; clump++) {
    const cx = x + (r() - 0.5) * 1.4;
    const cz = z + (r() - 0.5) * 1.4;
    const h = 0.5 + r() * 0.4;
    for (let b = 0; b < 3; b++) {
      out.push({ x: cx, y: h / 2, z: cz, sx: 0.32, sy: h, sz: 0.02, ry: (b * Math.PI) / 3, color: BLADES[(clump + b) % BLADES.length] });
    }
  }
  return out;
}

export function bushParts(seed: number, x: number, z: number): Item[] {
  const r = mulberry(seed);
  const n = 3 + Math.floor(r() * 2);
  const out: Item[] = [];
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const d = i === 0 ? 0 : 0.35 + r() * 0.35;
    const rad = 0.5 + r() * 0.2;
    out.push({ x: x + Math.cos(a) * d, y: rad * 0.8, z: z + Math.sin(a) * d, sx: rad, sy: rad * 0.85, sz: rad, color: i % 2 ? "#2f6b2f" : "#3a7a35" });
  }
  return out;
}

export type Spot = { x: number; z: number; seed: number };

// the road is drawn from 80 m behind the depot to 100 m past the last stop
const ROAD_START = ROUTE_V1[0].position - 80;
const ROAD_END = ROUTE_V1[ROUTE_V1.length - 1].position + 100;

// Where grass and bushes grow along one side of the verge within a route slice:
// every ~3 m, just beyond the verge edge.
export function vergeSpots(slice: number, side: Side, spacing = 3): Spot[] {
  const r = mulberry(9100 + slice * 2 + (side === 1 ? 1 : 0));
  const spots: Spot[] = [];
  for (let i = 0; i * spacing < SLICE_LENGTH - spacing; i++) {
    const x = slice * SLICE_LENGTH + i * spacing + r() * spacing * 0.6;
    if (x < ROAD_START || x > ROAD_END) continue;
    const lat = roadHalfWidthAt(x) + FOOTPATH_WIDTH + VERGE_WIDTH + 0.4 + r() * 0.8;
    spots.push({ x, z: roadCenterZ(x) + side * lat, seed: Math.floor(r() * 1e9) });
  }
  return spots;
}

// The tufts and bushes of one slice, after the filter the renderer applies:
// far slices get half the tufts, and nothing grows where `isGroundFree` says no.
export function grassParts(
  slice: number,
  detail: "full" | "lite",
  isGroundFree: (x: number, z: number, radius: number) => boolean,
): { tufts: Item[]; bushes: Item[] } {
  const tufts: Item[] = [];
  const bushes: Item[] = [];
  for (const side of [-1, 1] as const) {
    vergeSpots(slice, side).forEach((s, i) => {
      if (detail === "lite" && i % 2) return;
      if (!isGroundFree(s.x, s.z, 0.6)) return;
      if (s.seed % 7 === 0) bushes.push(...bushParts(s.seed, s.x, s.z));
      else tufts.push(...tuftParts(s.seed, s.x, s.z));
    });
  }
  return { tufts, bushes };
}
