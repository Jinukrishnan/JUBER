import { describe, expect, it } from "vitest";
import { NETWORK_V1 } from "./data/network-v1";
import { ARROW_ITEMS, junctionParts } from "./junctionParts";
import { allowedTurns, approachesOf } from "./logic/turns";

const N = NETWORK_V1;
const STRIPES = 11; // across a 12 m road

describe("junctionParts", () => {
  it("has one stop line and one zebra crossing per approach, at every junction", () => {
    for (const j of N.junctions) {
      const approaches = approachesOf(N, j.id);
      const p = junctionParts(N, j.id);
      expect(p.stopLines.length, j.id).toBe(approaches.length);
      expect(p.zebra.length, j.id).toBe(approaches.length * STRIPES);
    }
  });

  it("puts each stop line at its approach and zebra stripes between it and the box", () => {
    const p = junctionParts(N, "centre");
    const a = approachesOf(N, "centre").find((x) => x.id === "ew:1")!;
    const line = p.stopLines.find((s) => Math.abs(s.x - a.stopLineAt.x) < 0.01)!;
    expect(line).toBeDefined();
    const stripe = p.zebra.find((s) => Math.abs(s.x - a.zebraAt.x) < 0.01)!;
    expect(stripe).toBeDefined();
    expect(stripe.x).toBeGreaterThan(line.x);
  });

  it("paints an arrow for each allowed turn and none for a forbidden one", () => {
    for (const j of N.junctions) {
      const expected = approachesOf(N, j.id).reduce(
        (sum, a) => sum + allowedTurns(N, j.id, a.id).reduce((t, turn) => t + ARROW_ITEMS[turn], 0),
        0,
      );
      expect(junctionParts(N, j.id).turnArrows.length, j.id).toBe(expected);
    }
    // from the south at the centre only left and straight are allowed
    const south = approachesOf(N, "centre").find((a) => a.id === "ns:-1")!;
    expect(allowedTurns(N, "centre", south.id)).toEqual(expect.arrayContaining(["left", "straight"]));
    expect(allowedTurns(N, "centre", south.id)).not.toContain("right");
  });

  it("keeps the paint above the asphalt", () => {
    const p = junctionParts(N, "centre");
    for (const it of [...p.zebra, ...p.stopLines, ...p.turnArrows]) expect(it.y).toBeGreaterThan(0.03);
  });
});
