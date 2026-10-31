import { describe, expect, it } from "vitest";
import { ROUTE_V1 } from "../data/route-v1";
import { grassParts } from "../plants";
import { buildScenery, JUNCTIONS, scenePoles } from "../world";
import { armSigns, drivable, TURN_AROUND_RADIUS, worldToLocal } from "./junction";
import { FOOTPATH_WIDTH, groundY } from "./road";

const layout = buildScenery();
const TREES = ["coconut", "mango", "gulmohar", "banana", "jackfruit"];

// On a side road, its footpath or its turn-around, which is no place for a plant.
function onArm(x: number, z: number): boolean {
  for (const r of JUNCTIONS) {
    const { u, v } = worldToLocal(r, x, z);
    for (const s of armSigns(r.arms)) {
      const along = s * v;
      if (Math.abs(u) <= r.armHalfWidth + FOOTPATH_WIDTH && along >= 0 && along <= r.armLength) return true;
      if (Math.hypot(u, v - s * r.armLength) <= TURN_AROUND_RADIUS + FOOTPATH_WIDTH) return true;
    }
  }
  return false;
}

const bad = (x: number, z: number) => drivable(JUNCTIONS, x, z) || groundY(x, z) !== 0 || onArm(x, z);

describe("no plant stands on the road", () => {
  it("has junctions to test against", () => {
    expect(JUNCTIONS.length).toBeGreaterThan(0);
  });

  it("no grass tuft or bush is on tarmac, a footpath or a side road", () => {
    const first = Math.floor((ROUTE_V1[0].position - 120) / 100);
    const last = Math.floor((ROUTE_V1[ROUTE_V1.length - 1].position + 140) / 100);
    const offenders: string[] = [];
    for (let slice = first; slice <= last; slice++) {
      const { tufts, bushes } = grassParts(slice, "full", layout.isGroundFree);
      for (const it of [...tufts, ...bushes]) {
        if (bad(it.x, it.z)) offenders.push(`${it.x.toFixed(1)},${it.z.toFixed(1)}`);
      }
    }
    expect(offenders.slice(0, 10)).toEqual([]);
  });

  it("no tree or flower cluster is on tarmac, a footpath or a side road", () => {
    const offenders = layout.placements
      .filter((p) => TREES.includes(p.kind) || p.kind === "flowers")
      .filter((p) => bad(p.x, p.z))
      .map((p) => `${p.kind} ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
    expect(offenders.slice(0, 10)).toEqual([]);
  });


  it("no electric pole stands in the mouth of a side road", () => {
    const offenders = scenePoles().map((p) => p.x).filter((x) => JUNCTIONS.some((j) => Math.abs(x - j.x) < j.armHalfWidth + 6));
    expect(offenders).toEqual([]);
  });
});
