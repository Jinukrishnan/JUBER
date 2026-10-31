import type { Network } from "./data/network-v1";
import type { Item } from "./Instances";
import { builtRoads } from "./logic/network";
import { ZEBRA_LENGTH } from "./logic/roadside";
import { allowedTurns, approachesOf, type Approach } from "./logic/turns";

// The paint at one junction as instance data in world coordinates: a zebra
// crossing and a stop line on every approach, and an arrow for each turn the
// approach allows, painted in the lane just behind the stop line.
const WHITE = "#f7f5ec";
const Y = 0.045; // paint sits above the asphalt (0.01) and the edge lines (0.03)
const ARROW_BEHIND = 5.5; // metres behind the stop line
const ARROW_SPACING = 1.7;
const ARROW_WIDTH = 0.28;

const TURN_ORDER = ["left", "straight", "right"];

export type JunctionPaint = { zebra: Item[]; stopLines: Item[]; turnArrows: Item[] };

// how many painted bars an arrow is made of
export const ARROW_ITEMS = { straight: 3, left: 4, right: 4 } as const;

type Seg = [number, number, number, number]; // forward/lateral start and end, in metres

// bars of one arrow in the lane's own frame (forward, lateral; lateral + is right)
function arrowSegments(turn: "left" | "straight" | "right"): Seg[] {
  const head = (f: number, l: number, df: number, dl: number): Seg[] => {
    const a = Math.atan2(dl, df);
    return [Math.PI * 0.8, -Math.PI * 0.8].map((d): Seg => [f, l, f + Math.cos(a + d) * 0.7, l + Math.sin(a + d) * 0.7]);
  };
  if (turn === "straight") return [[-1.4, 0, 1.4, 0], ...head(1.4, 0, 1, 0)];
  const s = turn === "left" ? -1 : 1;
  return [[-1.4, 0, 0, 0], [0, 0, 0.9, s * 0.9], ...head(0.9, s * 0.9, 1, s)];
}

function arrowItems(a: Approach, lateral: number, turn: "left" | "straight" | "right", base: { x: number; z: number }): Item[] {
  const fx = Math.cos(a.heading);
  const fz = Math.sin(a.heading);
  const rx = -fz;
  const rz = fx;
  const at = (f: number, l: number) => ({ x: base.x + fx * f + rx * (lateral + l), z: base.z + fz * f + rz * (lateral + l) });
  return arrowSegments(turn).map(([f0, l0, f1, l1]) => {
    const p0 = at(f0, l0);
    const p1 = at(f1, l1);
    return {
      x: (p0.x + p1.x) / 2,
      y: Y,
      z: (p0.z + p1.z) / 2,
      sx: Math.hypot(p1.x - p0.x, p1.z - p0.z),
      sy: 0.02,
      sz: ARROW_WIDTH,
      color: WHITE,
      ry: -Math.atan2(p1.z - p0.z, p1.x - p0.x),
    };
  });
}

export function junctionParts(n: Network, junctionId: string): JunctionPaint {
  const roads = builtRoads(n);
  const zebra: Item[] = [];
  const stopLines: Item[] = [];
  const turnArrows: Item[] = [];
  for (const a of approachesOf(n, junctionId)) {
    const hw = roads.find((r) => r.road.id === a.road)!.road.halfWidth;
    const fx = Math.cos(a.heading);
    const fz = Math.sin(a.heading);
    const rx = -fz;
    const rz = fx;
    // the crossing: stripes along the road, side by side across it
    for (let l = -(hw - 0.9); l <= hw - 0.9 + 1e-6; l += 1.0) {
      zebra.push({ x: a.zebraAt.x + rx * l, y: Y, z: a.zebraAt.z + rz * l, sx: ZEBRA_LENGTH, sy: 0.02, sz: 0.5, color: WHITE, ry: -a.heading });
    }
    // the stop line, across this approach's own lane (traffic keeps left)
    const lane = -((hw - 0.5) / 2 + 0.2);
    stopLines.push({ x: a.stopLineAt.x + rx * lane, y: Y, z: a.stopLineAt.z + rz * lane, sx: 0.4, sy: 0.02, sz: hw - 0.7, color: WHITE, ry: -a.heading });
    // arrows for the allowed turns
    const turns = [...allowedTurns(n, junctionId, a.id)].sort((p, q) => TURN_ORDER.indexOf(p) - TURN_ORDER.indexOf(q));
    const base = { x: a.stopLineAt.x - fx * ARROW_BEHIND, z: a.stopLineAt.z - fz * ARROW_BEHIND };
    turns.forEach((turn, i) => {
      const lateral = -hw / 2 + (i - (turns.length - 1) / 2) * ARROW_SPACING;
      turnArrows.push(...arrowItems(a, lateral, turn, base));
    });
  }
  return { zebra, stopLines, turnArrows };
}
