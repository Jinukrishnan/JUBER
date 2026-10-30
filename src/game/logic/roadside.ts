import type { ResolvedJunction } from "./junction";
import type { Stop } from "./route";

// Where the road furniture goes: zebra crossings, roadside signs and the
// stretches of centre line that are solid (no overtaking) rather than dashed.
// left = -z, the kerb forward traffic keeps to; right = +z.
export type SignKind = "speed40" | "crossing" | "busStop" | "direction";
export type SignSide = "left" | "right";
export type Sign = { x: number; side: SignSide; kind: SignKind };
export type RoadFeatures = {
  zebras: number[];
  signs: Sign[];
  solidRanges: [number, number][];
};

export const ZEBRA_LENGTH = 3.5; // along the road
const ZEBRA_AFTER_STOP = 24; // metres past a stop
const SOLID_REACH = 35; // solid centre line this far either side of a crossing

export function roadFeatures(stops: Stop[]): RoadFeatures {
  const first = stops[0].position;
  const last = stops[stops.length - 1].position;

  // a crossing just past every stop but the last (the last is the turn-around)
  const zebras = stops.slice(0, -1).map((s) => s.position + ZEBRA_AFTER_STOP);

  const signs: Sign[] = [
    { x: first + 40, side: "left", kind: "speed40" },
    { x: first + 120, side: "left", kind: "direction" },
    { x: last - 40, side: "right", kind: "speed40" },
    { x: last - 120, side: "right", kind: "direction" },
  ];
  for (const s of stops) {
    // approaching the stop on each kerb
    signs.push({ x: s.position - 18, side: "left", kind: "busStop" });
    signs.push({ x: s.position + 18, side: "right", kind: "busStop" });
  }
  for (const z of zebras) {
    signs.push({ x: z - 30, side: "left", kind: "crossing" });
    signs.push({ x: z + 30, side: "right", kind: "crossing" });
  }
  signs.sort((a, b) => a.x - b.x);

  const solidRanges: [number, number][] = [];
  for (const z of zebras) {
    const from = z - SOLID_REACH;
    const to = z + SOLID_REACH;
    const prev = solidRanges[solidRanges.length - 1];
    if (prev && from <= prev[1]) prev[1] = Math.max(prev[1], to);
    else solidRanges.push([from, to]);
  }

  return { zebras, signs, solidRanges };
}

export function isSolidAt(f: RoadFeatures, x: number): boolean {
  return f.solidRanges.some(([a, b]) => x >= a && x <= b);
}

// x of every electric pole along the route: every 45 m, from 10 m past the depot to the last stop.
export function polePositions(stops: Stop[], junctions: ResolvedJunction[] = []): number[] {
  const first = stops[0].position;
  const last = stops[stops.length - 1].position;
  const xs: number[] = [];
  for (let x = first + 10; x <= last; x += 45) {
    // no pole in the mouth of a side road
    if (junctions.some((j) => Math.abs(x - j.x) < j.armHalfWidth + 6)) continue;
    xs.push(x);
  }
  return xs;
}
