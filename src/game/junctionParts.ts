import type { Item } from "./Instances";
import { TURN_AROUND_RADIUS, armSigns, armStopDistance, stopLineDistance, type ResolvedJunction } from "./logic/junction";
import { FOOTPATH_WIDTH, KERB_HEIGHT, ROAD_HALF_WIDTH } from "./logic/road";
import { ZEBRA_LENGTH } from "./logic/roadside";

// The painted and built pieces of one junction as instance data in the
// junction's own frame: x runs along the main road, z across it (+z right).
const WHITE = "#f7f5ec";
const Y = 0.045; // paint sits above the arm asphalt (0.02)
const HALF = ROAD_HALF_WIDTH;
export const ZEBRA_OFFSET = 3.65; // zebra centre, measured from the stop line's side of the junction

export type JunctionParts = { zebra: Item[]; stopLines: Item[]; dashes: Item[]; kerbs: Item[] };

export function junctionParts(r: ResolvedJunction): JunctionParts {
  const zebra: Item[] = [];
  const stopLines: Item[] = [];
  const dashes: Item[] = [];
  const kerbs: Item[] = [];
  const paint = (sx: number, sz: number, x: number, z: number): Item => ({ x, y: Y, z, sx, sy: 0.02, sz, color: WHITE });
  const a = r.armHalfWidth;

  // main road: a crossing and a stop line on each side of the junction
  const mainStop = stopLineDistance(r);
  for (const side of [-1, 1]) {
    const cx = side * (a + ZEBRA_OFFSET);
    for (let z = -(HALF - 0.9); z <= HALF - 0.9 + 1e-6; z += 1.0) zebra.push(paint(ZEBRA_LENGTH, 0.5, cx, z));
    // forward traffic (coming from -x) keeps to the -z lane, the other way to +z
    stopLines.push(paint(0.4, HALF - 0.7, side * mainStop, side * ((HALF - 0.5) / 2 + 0.2) * -1));
  }

  for (const s of armSigns(r.arms)) {
    // a crossing across the arm and a stop line in the lane that drives toward the main road
    const cv = s * (HALF + ZEBRA_OFFSET);
    for (let u = -(a - 0.9); u <= a - 0.9 + 1e-6; u += 1.0) zebra.push(paint(0.5, ZEBRA_LENGTH, u, cv));
    // traffic keeps left: coming from +z (s = 1) its left is -x, from -z it is +x
    stopLines.push(paint(a - 0.6, 0.4, -s * (a / 2), s * armStopDistance()));
    // centre dashes
    for (let v = HALF + 10; v < r.armLength - 6; v += 8) dashes.push(paint(0.15, 3, 0, s * v));
    // kerbs along both sides of the arm, from the main kerb out
    const len = r.armLength - TURN_AROUND_RADIUS - HALF; // the kerb ends where the turn-around opens out
    for (const side of [-1, 1]) {
      kerbs.push({ x: side * a, y: KERB_HEIGHT / 2, z: s * (HALF + len / 2), sx: 0.1, sy: KERB_HEIGHT, sz: len, color: "#b9b4a8" });
    }
  }
  return { zebra, stopLines, dashes, kerbs };
}

// Footpath along an arm (one per side of the arm), starting beyond the main footpath.
export function armFootpath(r: ResolvedJunction, s: -1 | 1, side: -1 | 1): { x: number; z: number; w: number; len: number } {
  const from = HALF + FOOTPATH_WIDTH;
  const len = r.armLength - TURN_AROUND_RADIUS - from;
  return { x: side * (r.armHalfWidth + FOOTPATH_WIDTH / 2), z: s * (from + len / 2), w: FOOTPATH_WIDTH, len };
}
