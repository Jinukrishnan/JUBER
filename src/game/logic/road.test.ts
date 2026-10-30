import { describe, expect, it } from "vitest";
import { ROUTE_V1 } from "../data/route-v1";
import { FOOTPATH_WIDTH, KERB_HEIGHT, ROAD_HALF_WIDTH, groundY, roadAngle, roadCenterZ, roadHalfWidthAt } from "./road";

const END = ROUTE_V1[ROUTE_V1.length - 1].position;

describe("roadAngle", () => {
  it("matches the slope of the centreline", () => {
    for (const x of [0, 400, 900, 1500]) {
      const slope = (roadCenterZ(x + 0.5) - roadCenterZ(x - 0.5)) / 1;
      expect(roadAngle(x)).toBeCloseTo(Math.atan(slope), 3);
    }
  });
});

describe("roadHalfWidthAt", () => {
  it("is the normal width along the route, including at every stop", () => {
    for (const s of ROUTE_V1) expect(roadHalfWidthAt(s.position)).toBe(ROAD_HALF_WIDTH);
    expect(roadHalfWidthAt(900)).toBe(ROAD_HALF_WIDTH);
  });

  it("opens into a turn-around area behind the depot and beyond the last stop", () => {
    expect(roadHalfWidthAt(-60)).toBeGreaterThanOrEqual(15);
    expect(roadHalfWidthAt(END + 60)).toBeGreaterThanOrEqual(15);
  });

  it("widens smoothly rather than in a step", () => {
    let prev = roadHalfWidthAt(END);
    for (let x = END; x <= END + 80; x += 2) {
      const w = roadHalfWidthAt(x);
      expect(w).toBeGreaterThanOrEqual(prev);
      expect(w - prev).toBeLessThan(1.5);
      prev = w;
    }
  });
});

describe("groundY", () => {
  const x = 500;
  const cz = roadCenterZ(x);
  it("is flat on the carriageway", () => {
    expect(groundY(x, cz)).toBe(0);
    expect(groundY(x, cz + ROAD_HALF_WIDTH - 0.5)).toBe(0);
  });
  it("is raised on the footpath on either side", () => {
    expect(groundY(x, cz - ROAD_HALF_WIDTH - 1)).toBe(KERB_HEIGHT);
    expect(groundY(x, cz + ROAD_HALF_WIDTH + 1)).toBe(KERB_HEIGHT);
  });
  it("drops back to the ground beyond the footpath", () => {
    expect(groundY(x, cz + ROAD_HALF_WIDTH + FOOTPATH_WIDTH + 1)).toBe(0);
  });
});
