import { describe, expect, it } from "vitest";
import { NETWORK_V1 } from "../data/network-v1";
import { PLACES } from "../data/places-v1";
import { JUNCTION_BOX_HALF, drivable, groundY } from "./network";
import { roadFeatures } from "./roadside";
import { crossingPath, strollPath } from "./walks";

const N = NETWORK_V1;
const features = roadFeatures(N, PLACES);

describe("crossingPath", () => {
  it("walks along a footpath, over the zebra, and on along the other footpath, for every crossing", () => {
    for (const z of features.zebras) {
      for (const dir of [1, -1] as const) {
        const p = crossingPath(N, z, dir);
        expect(p).toHaveLength(4);
        for (const pt of [p[0], p[1], p[2], p[3]]) expect(groundY(N, pt.x, pt.z), `${z.road} ${pt.x.toFixed(0)},${pt.z.toFixed(0)}`).toBe(0.15);
        // the crossing itself runs over the stripes, square to the road
        const mid = { x: (p[1].x + p[2].x) / 2, z: (p[1].z + p[2].z) / 2 };
        expect(Math.hypot(mid.x - z.x, mid.z - z.z)).toBeLessThan(0.01);
        const across = Math.atan2(p[2].z - p[1].z, p[2].x - p[1].x);
        expect(Math.abs(Math.cos(across - z.heading))).toBeLessThan(1e-6);
      }
    }
  });

  it("starts on one side and ends on the other, both away from the junction", () => {
    const z = features.zebras[0];
    const p = crossingPath(N, z, 1);
    const q = crossingPath(N, z, -1);
    expect(Math.hypot(p[1].x - q[2].x, p[1].z - q[2].z)).toBeLessThan(0.01);
    for (const pt of [p[0], p[3]]) {
      const fx = Math.cos(z.heading);
      const fz = Math.sin(z.heading);
      expect((pt.x - z.x) * fx + (pt.z - z.z) * fz).toBeLessThan(-9); // behind the zebra, away from the junction
    }
  });
});

describe("strollPath", () => {
  it("is a walk along one footpath, clear of junctions and shelters", () => {
    let found = 0;
    for (let s = 20; s < 2400; s += 37) {
      const path = strollPath(N, PLACES, "ring", s, 1, -1, 1.5);
      if (!path) continue;
      found++;
      for (const pt of path) {
        expect(drivable(N, pt.x, pt.z)).toBe(false);
        expect(groundY(N, pt.x, pt.z)).toBe(0.15);
        for (const j of N.junctions) expect(Math.max(Math.abs(pt.x - j.at[0]), Math.abs(pt.z - j.at[1]))).toBeGreaterThan(JUNCTION_BOX_HALF + 14);
      }
    }
    expect(found).toBeGreaterThan(20);
  });

  it("refuses a walk across a junction", () => {
    expect(strollPath(N, PLACES, "ring", 360, 1, -1, 1.5)).toBeNull();
  });
});
