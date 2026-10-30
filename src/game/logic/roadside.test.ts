import { describe, expect, it } from "vitest";
import { ROUTE_V1 } from "../data/route-v1";
import { BAY_LENGTH } from "./bay";
import { isSolidAt, roadFeatures, ZEBRA_LENGTH } from "./roadside";

const features = roadFeatures(ROUTE_V1);
const END = ROUTE_V1[ROUTE_V1.length - 1].position;

describe("zebra crossings", () => {
  it("has one just past every stop except the last", () => {
    expect(features.zebras).toHaveLength(ROUTE_V1.length - 1);
    expect(features.zebras).toEqual([...features.zebras].sort((a, b) => a - b));
  });

  it("never overlaps a bus bay", () => {
    for (const z of features.zebras) {
      for (const s of ROUTE_V1) {
        expect(Math.abs(z - s.position)).toBeGreaterThan(BAY_LENGTH / 2 + ZEBRA_LENGTH / 2 + 2);
      }
    }
  });

  it("stays on the normal-width road, clear of the turn-around areas", () => {
    for (const z of features.zebras) {
      expect(z).toBeGreaterThan(0);
      expect(z).toBeLessThan(END - 10);
    }
  });
});

describe("signs", () => {
  const near = (kind: string, side: string, x: number, within: number) =>
    features.signs.some((s) => s.kind === kind && s.side === side && Math.abs(s.x - x) <= within);

  it("puts a bus-stop sign on each kerb at every stop", () => {
    for (const s of ROUTE_V1) {
      expect(near("busStop", "left", s.position, 25)).toBe(true);
      expect(near("busStop", "right", s.position, 25)).toBe(true);
    }
  });

  it("warns of every zebra crossing from both directions", () => {
    for (const z of features.zebras) {
      expect(near("crossing", "left", z, 40)).toBe(true);
      expect(near("crossing", "right", z, 40)).toBe(true);
    }
  });

  it("has a speed limit and a direction board", () => {
    expect(features.signs.some((s) => s.kind === "speed40")).toBe(true);
    expect(features.signs.some((s) => s.kind === "direction")).toBe(true);
  });

  it("is ordered along the road and never stacks two poles on top of each other", () => {
    const xs = features.signs.map((s) => s.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    for (const side of ["left", "right"]) {
      const onSide = features.signs.filter((s) => s.side === side).map((s) => s.x);
      for (let i = 1; i < onSide.length; i++) expect(onSide[i] - onSide[i - 1]).toBeGreaterThanOrEqual(6);
    }
  });
});

describe("centre line", () => {
  it("is solid through every zebra crossing and dashed in open road", () => {
    for (const z of features.zebras) expect(isSolidAt(features, z)).toBe(true);
    expect(isSolidAt(features, 130)).toBe(false);
  });

  it("has ordered, non-overlapping solid stretches", () => {
    const r = features.solidRanges;
    for (let i = 0; i < r.length; i++) {
      expect(r[i][0]).toBeLessThan(r[i][1]);
      if (i > 0) expect(r[i][0]).toBeGreaterThan(r[i - 1][1]);
    }
  });
});
