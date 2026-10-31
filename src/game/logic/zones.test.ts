import { describe, expect, it } from "vitest";
import { ZONES } from "../data/zones-v1";
import { ACTIVE_PLACES, NETWORK } from "../world";
import { builtRoads, pointAt } from "./network";
import { placeSpot } from "./places";
import { zoneAt, zoneKindAt } from "./zones";

describe("zones", () => {
  it("tell where a point is", () => {
    expect(zoneKindAt(300, 100)).toBe("village");
    expect(zoneKindAt(1700, 700)).toBe("city");
    expect(zoneKindAt(1700, 400)).toBe("park");
    expect(zoneKindAt(700, -500)).toBe("lake");
    expect(zoneKindAt(400, -150)).toBe("dam");
    expect(zoneKindAt(5000, 5000)).toBe("hills");
  });

  it("let the park win over the city, and the dam over the lake", () => {
    expect(zoneAt(ZONES, 1700, 400).id).toBe("park");
    expect(zoneAt(ZONES, 700, -150).id).toBe("dam");
  });

  it("have unique ids", () => {
    expect(new Set(ZONES.map((z) => z.id)).size).toBe(ZONES.length);
  });

  it("keep every road out of the lake", () => {
    const bad: string[] = [];
    for (const r of builtRoads(NETWORK)) {
      for (let s = 0; s <= r.length; s += 20) {
        const p = pointAt(r, s);
        const k = zoneKindAt(p.x, p.z);
        if (k === "lake" || k === "hills") bad.push(`${r.road.id} s=${s} ${p.x},${p.z} is ${k}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("put every place in the village, the city or on the dam", () => {
    for (const p of ACTIVE_PLACES) {
      const s = placeSpot(NETWORK, p);
      expect(["village", "city", "dam", "park"], p.id).toContain(zoneKindAt(s.x, s.z));
    }
  });
});
