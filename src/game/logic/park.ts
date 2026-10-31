import type { Zone } from "../data/zones-v1";
import { TREE_RADIUS } from "./layout";

// The central park, laid out inside its zone: a lawn kept clear of the streets, two crossing paths, a fountain
// where they cross, a playground, benches beside the paths and trees on the grass. Pure and seeded.
type Rect = { x: number; z: number; w: number; d: number };
export type ParkTree = { kind: "mango" | "gulmohar" | "coconut"; x: number; z: number; scale: number };
export type ParkLayout = {
  lawn: Rect;
  paths: (Rect & { heading: number })[];
  fountain: { x: number; z: number; r: number };
  playground: Rect;
  benches: { x: number; z: number; heading: number }[];
  trees: ParkTree[];
};

const PATH_WIDTH = 3;
const FOUNTAIN_R = 5;
const PLAYGROUND = { w: 24, d: 18 };
const BENCH_SIDE = 2.5; // from the path's centreline
const BENCH_STRIDE = 34;
const BENCH_FIRST = 14;
const TREE_COUNT = 90;
const TREE_KINDS: ParkTree["kind"][] = ["mango", "gulmohar", "coconut", "mango", "gulmohar"];

function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const circleHitsRect = (cx: number, cz: number, r: number, b: Rect) => {
  const dx = Math.max(0, Math.abs(cx - b.x) - b.w / 2);
  const dz = Math.max(0, Math.abs(cz - b.z) - b.d / 2);
  return Math.hypot(dx, dz) < r;
};

export function layoutPark(zone: Zone, seed: number, inset = 14): ParkLayout {
  const r = mulberry32(seed);
  const lawn: Rect = { x: (zone.x0 + zone.x1) / 2, z: (zone.z0 + zone.z1) / 2, w: zone.x1 - zone.x0 - 2 * inset, d: zone.z1 - zone.z0 - 2 * inset };
  const paths = [
    { x: lawn.x, z: lawn.z, w: lawn.w, d: PATH_WIDTH, heading: 0 },
    { x: lawn.x, z: lawn.z, w: PATH_WIDTH, d: lawn.d, heading: Math.PI / 2 },
  ];
  const fountain = { x: lawn.x, z: lawn.z, r: FOUNTAIN_R };
  const playground: Rect = { x: lawn.x - lawn.w / 4, z: lawn.z + lawn.d / 4, ...PLAYGROUND };

  // benches alternate sides along each path, first one 14 m from the fountain
  const benches: ParkLayout["benches"] = [];
  let flip = 1;
  for (let off = BENCH_FIRST; off < lawn.w / 2 - 6; off += BENCH_STRIDE) {
    for (const dir of [-1, 1]) benches.push({ x: lawn.x + dir * off, z: lawn.z + flip * BENCH_SIDE, heading: 0 });
    flip = -flip;
  }
  for (let off = BENCH_FIRST; off < lawn.d / 2 - 6; off += BENCH_STRIDE) {
    for (const dir of [-1, 1]) benches.push({ x: lawn.x + flip * BENCH_SIDE, z: lawn.z + dir * off, heading: Math.PI / 2 });
    flip = -flip;
  }

  // trees scattered on the grass, crowns clear of the paths, fountain, playground and each other
  const trees: ParkTree[] = [];
  for (let tries = 0; tries < 6000 && trees.length < TREE_COUNT; tries++) {
    const kind = TREE_KINDS[Math.floor(r() * TREE_KINDS.length)];
    const scale = 0.85 + r() * 0.4;
    const rad = TREE_RADIUS[kind] * scale;
    const x = lawn.x - lawn.w / 2 + rad + r() * (lawn.w - 2 * rad);
    const z = lawn.z - lawn.d / 2 + rad + r() * (lawn.d - 2 * rad);
    if (paths.some((p) => circleHitsRect(x, z, rad + 1.5, p))) continue;
    if (Math.hypot(x - fountain.x, z - fountain.z) < rad + fountain.r + 4) continue;
    if (circleHitsRect(x, z, rad + 1, playground)) continue;
    if (benches.some((b) => Math.hypot(x - b.x, z - b.z) < rad + 1.5)) continue;
    if (trees.some((t) => Math.hypot(x - t.x, z - t.z) < (rad + TREE_RADIUS[t.kind] * t.scale) * 0.6)) continue;
    trees.push({ kind, x, z, scale });
  }
  return { lawn, paths, fountain, playground, benches, trees };
}
