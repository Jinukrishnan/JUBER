import { describe, expect, it } from "vitest";
import { FLOOR_HEIGHT, cityParts, windowGeometry } from "./cityParts";
import type { CityPlacement, LandmarkPlacement } from "./logic/layout";

const city = (over: Partial<CityPlacement> = {}): CityPlacement => ({
  kind: "city", type: "tower", side: 1, x: 100, z: 50, heading: 0.4, width: 24, depth: 22, floors: 30, color: "#7aa6c2", seed: 3, ...over,
});
const landmark = (over: Partial<LandmarkPlacement> = {}): LandmarkPlacement => ({
  kind: "landmark", landmark: "mall", place: "city_mall", side: -1, x: 10, z: 20, heading: 1.2, width: 60, depth: 40, floors: 4, color: "#d8c9a8", seed: 1, ...over,
});

// the item's reach in the building's own frame (along the road, back from it)
function reach(p: { x: number; z: number; heading: number }, it: { x: number; z: number; sx: number; sz: number }) {
  const c = Math.cos(p.heading);
  const s = Math.sin(p.heading);
  const du = (it.x - p.x) * c + (it.z - p.z) * s;
  const dv = -(it.x - p.x) * s + (it.z - p.z) * c;
  return { u: Math.abs(du) + it.sx / 2, v: Math.abs(dv) + it.sz / 2 };
}

describe("cityParts", () => {
  it("makes the body floors x 3.2 m tall, standing on the ground", () => {
    for (const p of [city(), city({ floors: 3, type: "home" }), landmark()]) {
      const { body } = cityParts(p);
      expect(body.sy).toBeCloseTo(p.floors * FLOOR_HEIGHT, 6);
      expect(body.y - body.sy / 2).toBeCloseTo(0, 6);
    }
  });

  it("keeps every piece inside the footprint plus a metre", () => {
    for (const p of [city(), city({ floors: 12, type: "office" }), city({ floors: 2, type: "home", width: 11, depth: 12 }), landmark(), landmark({ floors: 30, landmark: "towers" })]) {
      const parts = cityParts(p);
      const all = [parts.body, ...parts.roof, ...(parts.podium ? [parts.podium] : []), ...(parts.band ? [parts.band] : [])];
      for (const it of all) {
        const r = reach(p, it);
        expect(r.u).toBeLessThanOrEqual(p.width / 2 + 1);
        expect(r.v).toBeLessThanOrEqual(p.depth / 2 + 1);
      }
    }
  });

  it("gives a tall tower a podium and a small home none", () => {
    expect(cityParts(city()).podium).not.toBeNull();
    expect(cityParts(city({ floors: 3, type: "home" })).podium).toBeNull();
  });

  it("has at most three roof pieces, and a plant box only on 10 floors or more", () => {
    expect(cityParts(city({ floors: 12 })).roof).toHaveLength(2);
    expect(cityParts(city({ floors: 4 })).roof).toHaveLength(1);
    expect(cityParts(city()).roof.length).toBeLessThanOrEqual(3);
  });

  it("marks a landmark's entrance with a coloured band", () => {
    expect(cityParts(landmark()).band).not.toBeNull();
    expect(cityParts(city()).band).toBeNull();
  });
});

describe("windowGeometry", () => {
  it("is made once per floor count and tiles one window row per floor", () => {
    expect(windowGeometry(12)).toBe(windowGeometry(12));
    const uv = windowGeometry(12).attributes.uv;
    let vMax = 0;
    for (let i = 0; i < 16; i++) vMax = Math.max(vMax, uv.getY(i)); // the four sides
    expect(vMax).toBeCloseTo(12, 6);
  });
});
