import { describe, expect, it } from "vitest";
import { ROUTE_V1 } from "../data/route-v1";
import { bayCenterZ } from "./bay";
import { stopGuidance } from "./guidance";
import { roadAngle, roadCenterZ } from "./road";

const X = ROUTE_V1[1].position;
const good = (o: Partial<Parameters<typeof stopGuidance>[0]> = {}) =>
  stopGuidance({
    stops: ROUTE_V1, direction: "forward", doorOpen: false, speed: 0,
    x: X, z: bayCenterZ(roadCenterZ(X), "forward"), heading: roadAngle(X), ...o,
  });

describe("stopGuidance", () => {
  it("says nothing far from any stop", () => {
    expect(good({ x: X - 200 })).toBeNull();
  });
  it("tells you to press E once parked in the bay", () => {
    expect(good()).toMatch(/press E/i);
  });
  it("tells you to stop first when still rolling in the bay", () => {
    expect(good({ speed: 4 })).toMatch(/stop/i);
  });
  it("says people are getting on while the door is open", () => {
    expect(good({ doorOpen: true })).toMatch(/door open/i);
  });
  it("asks to pull in to the kerb when too far from it", () => {
    expect(good({ z: roadCenterZ(X) + 1 })).toMatch(/kerb/i);
  });
  it("asks to straighten when crooked", () => {
    expect(good({ heading: roadAngle(X) + 0.5 })).toMatch(/straight/i);
  });
  it("asks to move to the middle of the bay when too far along", () => {
    expect(good({ x: X + 8 })).toMatch(/bay/i);
  });
  it("explains a bay for the other direction", () => {
    expect(good({ direction: "backward" })).toMatch(/other direction|opposite/i);
  });
});
