import { describe, expect, it } from "vitest";
import { cityParts } from "../cityParts";
import { gateParts, houseParts, shopParts, wallParts } from "../buildingParts";
import { NETWORK, buildScenery } from "../world";
import { cellKey, cellsAround, groupByCell } from "./cells";
import { builtRoads, pointAt } from "./network";
import type { Placement } from "./layout";

const BOX_BUDGET = 6000; // boxes in the 260 m draw range around any point of any road
const LAYOUT_BUDGET_MS = 1000;

function boxesOf(p: Placement): number {
  switch (p.kind) {
    case "city":
    case "landmark": {
      const c = cityParts(p);
      return 1 + c.roof.length + (c.podium ? 1 : 0) + (c.band ? 1 : 0);
    }
    case "house":
      return houseParts(p).boxes.length;
    case "shop":
      return shopParts(p).boxes.length;
    case "wall":
      return wallParts(p).length;
    case "gate":
      return gateParts(p).length;
    default:
      return 1; // a tree or a flower cluster (drawn as a few instances)
  }
}

describe("the scenery budget", () => {
  it("lays the whole world out well inside a second", () => {
    const t0 = performance.now();
    const layout = buildScenery();
    const ms = performance.now() - t0;
    console.log(`buildScenery: ${ms.toFixed(0)} ms, ${layout.placements.length} placements, ${layout.grass.length} grass spots`);
    expect(ms).toBeLessThan(LAYOUT_BUDGET_MS);
  }, 60000);

  it("never asks for more than the box budget in the draw range of any road point", () => {
    const layout = buildScenery();
    const cells = groupByCell(layout.placements);
    const cost = new Map<string, number>();
    for (const [key, list] of cells) cost.set(key, list.reduce((n, p) => n + boxesOf(p), 0));
    let worst = { boxes: 0, at: "" };
    for (const r of builtRoads(NETWORK)) {
      for (let s = 0; s <= r.length; s += 100) {
        const p = pointAt(r, s);
        const boxes = cellsAround(p.x, p.z).reduce((n, c) => n + (cost.get(cellKey(c.cx, c.cz)) ?? 0), 0);
        if (boxes > worst.boxes) worst = { boxes, at: `${r.road.id} s=${s} (${p.x.toFixed(0)},${p.z.toFixed(0)})` };
      }
    }
    console.log(`worst draw range: ${worst.boxes} boxes at ${worst.at}`);
    expect(worst.boxes).toBeLessThan(BOX_BUDGET);
  }, 60000);
});
