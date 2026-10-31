import { describe, expect, it } from "vitest";
import { ZONES } from "../data/zones-v1";
import { groundTints } from "./groundZones";

describe("groundTints", () => {
  const tints = groundTints(ZONES);

  it("tints the city and the park, and nothing else", () => {
    expect(tints).toHaveLength(2);
    const city = ZONES.find((z) => z.id === "city")!;
    const park = ZONES.find((z) => z.id === "park")!;
    expect(tints.some((t) => t.x === (city.x0 + city.x1) / 2 && t.w === city.x1 - city.x0)).toBe(true);
    expect(tints.some((t) => t.x === (park.x0 + park.x1) / 2 && t.w === park.x1 - park.x0)).toBe(true);
  });

  it("lays the park tint inside the city tint and above it", () => {
    const [city, park] = tints[0].w > tints[1].w ? [tints[0], tints[1]] : [tints[1], tints[0]];
    expect(Math.abs(park.x - city.x) + park.w / 2).toBeLessThanOrEqual(city.w / 2);
    expect(Math.abs(park.z - city.z) + park.d / 2).toBeLessThanOrEqual(city.d / 2);
    expect(park.y).toBeGreaterThan(city.y);
  });

  it("leaves the village, the dam, the lake and the countryside alone", () => {
    expect(groundTints(ZONES.filter((z) => ["village", "dam", "lake", "hills"].includes(z.kind)))).toEqual([]);
  });
});
