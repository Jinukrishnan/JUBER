import type { Item } from "./Instances";
import type { BuildingPlacement, GatePlacement, WallPlacement } from "./logic/layout";

// The pieces that make up each building, as boxes in world space. Every piece
// turns with the building's heading (the road's direction), and the front is
// always the side facing the road: `f` below is the sign of that direction
// across the road (u runs along the road, v across it toward +z).
export type BuildingParts = { boxes: Item[]; sign: Item | null };

const WALLS = ["#efe3c2", "#e9c9a6", "#cfe3c8", "#e8d27a", "#bcd0e0", "#efb9b0", "#f3efe4"];
const SHUTTERS = ["#2f6db5", "#2f9a5a", "#c0392b", "#d4a017"];
const TILE = "#a8432b";
const PITCH = 0.45; // roof slope, radians
const FLOOR_H = 3.2;

type Frame = { x: number; z: number; heading: number };

function boxer(fr: Frame) {
  const c = Math.cos(fr.heading);
  const s = Math.sin(fr.heading);
  return (lu: number, y: number, lv: number, sx: number, sy: number, sz: number, color: string, rx?: number): Item => ({
    x: fr.x + lu * c - lv * s,
    y,
    z: fr.z + lu * s + lv * c,
    sx, sy, sz, color, rx,
    ry: -fr.heading,
  });
}

export function houseParts(b: BuildingPlacement): BuildingParts {
  const box = boxer(b);
  const f = -b.side;
  const wall = WALLS[b.seed % WALLS.length];
  const wallTop = 3.5;
  const out: Item[] = [];
  out.push(box(0, 0.25, 0, b.width + 0.6, 0.5, b.depth + 0.6, "#b9b4a8")); // plinth
  out.push(box(0, 2.0, 0, b.width, 3.0, b.depth, wall)); // walls
  // veranda: a floor slab in front, and four pillars along its edge
  out.push(box(0, 0.58, f * (b.depth / 2 + 0.8), b.width, 0.15, 1.6, "#c9c3b4"));
  for (let k = 0; k < 4; k++) {
    const lu = -b.width / 2 + 0.5 + (k * (b.width - 1)) / 3;
    // 2.0 m tall so they stop under the veranda roof instead of poking through the tiles
    out.push(box(lu, 0.65 + 1.0, f * (b.depth / 2 + 1.4), 0.25, 2.0, 0.25, "#efe6cf"));
  }
  // pitched clay-tile roof: two slabs meeting at the ridge, overhanging all round
  const ridge = wallTop + (b.depth / 2) * Math.tan(PITCH);
  const slab = (reach: number, dir: 1 | -1) =>
    box(0, ridge - (reach / 2) * Math.tan(PITCH), dir * f * (reach / 2), b.width + 1.2, 0.14, reach / Math.cos(PITCH), TILE, dir * f * PITCH);
  out.push(slab(b.depth / 2 + 1.8, 1)); // front, over the veranda
  out.push(slab(b.depth / 2 + 0.7, -1)); // back
  // framed door and windows on the front wall
  const face = f * (b.depth / 2 + 0.04);
  out.push(box(0, 0.5 + 1.05, face, 1.0, 2.1, 0.1, "#5a3a22"));
  for (const lu of [-b.width / 3, b.width / 3]) {
    out.push(box(lu, 0.5 + 1.7, face - f * 0.02, 1.4, 1.2, 0.08, "#f3efe4"));
    out.push(box(lu, 0.5 + 1.7, face, 1.2, 1.0, 0.1, "#28425a"));
  }
  return { boxes: out, sign: null };
}

export function shopParts(b: BuildingPlacement): BuildingParts {
  const box = boxer(b);
  const f = -b.side;
  const wall = WALLS[b.seed % WALLS.length];
  const out: Item[] = [];
  for (let i = 0; i < b.floors; i++) out.push(box(0, 0.4 + FLOOR_H * i + FLOOR_H / 2, 0, b.width, FLOOR_H, b.depth, wall));
  // a balcony slab with a railing on each upper floor
  for (let i = 1; i < b.floors; i++) {
    const y = 0.4 + FLOOR_H * i + 0.075;
    out.push(box(0, y, f * (b.depth / 2 + 0.65), b.width * 0.8, 0.15, 1.3, "#cfc9b9"));
    out.push(box(0, y + 0.55, f * (b.depth / 2 + 1.25), b.width * 0.8, 0.9, 0.06, "#444444"));
  }
  // ground-floor shutters, roof slab, rooftop water tank
  out.push(box(0, 0.4 + 1.2, f * (b.depth / 2 + 0.05), b.width * 0.8, 2.4, 0.1, SHUTTERS[b.seed % SHUTTERS.length]));
  const top = 0.4 + FLOOR_H * b.floors;
  out.push(box(0, top + 0.1, 0, b.width + 0.4, 0.2, b.depth + 0.4, "#9a958a"));
  out.push(box(b.width / 4, top + 0.2 + 0.8, 0, 1.6, 1.6, 1.6, "#3b6fb5"));
  // the signboard sits between the shutters and the first-floor balcony slab, so the
  // balcony cannot hide it; 4:1 to match the lettering cells in the atlas
  const sign = box(0, 3.15, f * (b.depth / 2 + 0.1), 2.4, 0.6, 0.08, "#ffffff");
  return { boxes: out, sign };
}

export function wallParts(w: WallPlacement): Item[] {
  const box = boxer(w);
  return [
    box(0, 0.5, 0, w.length, 1.0, 0.3, "#d8d0bd"), // the wall
    box(0, 1.05, 0, w.length + 0.06, 0.1, 0.4, "#b9b4a8"), // coping along the top
  ];
}

export function gateParts(g: GatePlacement): Item[] {
  const box = boxer(g);
  const out: Item[] = [];
  for (const lu of [-1.4, 1.4]) {
    out.push(box(lu, 0.9, 0, 0.5, 1.8, 0.5, "#d8d0bd"));
    out.push(box(lu, 1.86, 0, 0.6, 0.12, 0.6, "#b9b4a8"));
  }
  out.push(box(0, 0.8, 0, 2.2, 1.0, 0.08, "#2b2b2b")); // the gate leaf
  return out;
}
