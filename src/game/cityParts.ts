import { BoxGeometry } from "three";
import type { Item } from "./Instances";
import type { CityPlacement, LandmarkPlacement } from "./logic/layout";

// The pieces of a tech-city building as boxes in world space, turned with the road's heading like the
// village buildings (see buildingParts.ts). The body carries the windows; roof, podium and the
// landmark entrance band are plain boxes. Everything stays inside the placement's footprint.
export const FLOOR_HEIGHT = 3.2;
const PODIUM_FLOORS = 2;
const PODIUM_MIN_FLOORS = 8;
const PODIUM_COLOR = "#8d9499";
const ROOF_COLOR = "#6b7176";
const WINDOWS_ACROSS = 5; // windows along a facade, however wide it is

export type CityParts = { body: Item; roof: Item[]; podium: Item | null; band: Item | null };

const hasPodium = (p: CityPlacement | LandmarkPlacement) =>
  p.floors >= PODIUM_MIN_FLOORS && (p.kind === "landmark" || p.type === "tower" || p.type === "office");

export function cityParts(p: CityPlacement | LandmarkPlacement): CityParts {
  const c = Math.cos(p.heading);
  const s = Math.sin(p.heading);
  const box = (lu: number, y: number, lv: number, sx: number, sy: number, sz: number, color: string): Item => ({
    x: p.x + lu * c - lv * s,
    y,
    z: p.z + lu * s + lv * c,
    sx,
    sy,
    sz,
    color,
    ry: -p.heading,
  });
  const h = p.floors * FLOOR_HEIGHT;
  const podium = hasPodium(p);
  // above a podium the tower is a little narrower than the plot
  const bw = podium ? p.width * 0.8 : p.width;
  const bd = podium ? p.depth * 0.8 : p.depth;
  const roof: Item[] = [box(0, h + 0.25, 0, bw + 0.4, 0.5, bd + 0.4, ROOF_COLOR)];
  if (p.floors >= 10) roof.push(box(0, h + 1.5, 0, bw * 0.3, 2, bd * 0.3, "#9aa0a5"));
  const front = -p.side; // toward the road
  return {
    body: box(0, h / 2, 0, bw, h, bd, p.color),
    roof,
    podium: podium ? box(0, (PODIUM_FLOORS * FLOOR_HEIGHT) / 2, 0, p.width, PODIUM_FLOORS * FLOOR_HEIGHT, p.depth, PODIUM_COLOR) : null,
    band: p.kind === "landmark" ? box(0, 3.4, front * (p.depth / 2 - 0.1), p.width * 0.5, 1.2, 0.4, p.color) : null,
  };
}

const geometries = new Map<number, BoxGeometry>();

// A unit box whose side faces tile a window texture: five windows across and one row per floor. The top and
// bottom show a plain wall corner of the texture.
export function windowGeometry(floors: number): BoxGeometry {
  let g = geometries.get(floors);
  if (!g) {
    g = new BoxGeometry(1, 1, 1);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const face = Math.floor(i / 4); // +x -x +y -y +z -z
      if (face === 2 || face === 3) uv.setXY(i, 0.02, 0.02);
      else uv.setXY(i, uv.getX(i) * WINDOWS_ACROSS, uv.getY(i) * floors);
    }
    geometries.set(floors, g);
  }
  return g;
}
