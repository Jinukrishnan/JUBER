import { describe, expect, it } from "vitest";
import { ROUTE_V1 } from "../data/route-v1";
import {
  BAY_LENGTH,
  BAY_OFFSET,
  BAY_WIDTH,
  BUS_LENGTH,
  BUS_WIDTH,
  bayAt,
  bayCenterZ,
} from "./bay";
import { roadAngle, roadCenterZ, roadHalfWidthAt } from "./road";

const STOP = 2;
const X = ROUTE_V1[STOP].position;
const parkedZ = (side: "forward" | "backward", x = X) =>
  roadCenterZ(x) + (side === "forward" ? -BAY_OFFSET : BAY_OFFSET);
const fwd = () => roadAngle(X);
const back = () => roadAngle(X) + Math.PI;
const at = (x: number, z: number, heading: number) => bayAt(ROUTE_V1, x, z, heading);

describe("bay geometry", () => {
  it("is just longer and wider than the bus", () => {
    expect(BAY_LENGTH).toBeGreaterThan(BUS_LENGTH);
    expect(BAY_LENGTH - BUS_LENGTH).toBeLessThanOrEqual(6);
    expect(BAY_WIDTH).toBeGreaterThan(BUS_WIDTH);
  });

  it("sits on the kerb side of each direction and inside the road", () => {
    expect(bayCenterZ(0, "forward")).toBe(-BAY_OFFSET);
    expect(bayCenterZ(0, "backward")).toBe(BAY_OFFSET);
    expect(BAY_OFFSET + BAY_WIDTH / 2).toBeLessThanOrEqual(roadHalfWidthAt(X));
  });
});

describe("bayAt", () => {
  it("finds a bus parked squarely in the forward bay", () => {
    expect(at(X, parkedZ("forward"), fwd())).toEqual({ stop: STOP, side: "forward" });
  });

  it("finds a bus facing the other way in the backward bay", () => {
    expect(at(X, parkedZ("backward"), back())).toEqual({ stop: STOP, side: "backward" });
  });

  it("allows a small slop along the bay but not a bus sticking out of it", () => {
    expect(at(X + 1.5, parkedZ("forward", X + 1.5), fwd())).not.toBeNull();
    expect(at(X + 3, parkedZ("forward", X + 3), fwd())).toBeNull();
    expect(at(X - 3, parkedZ("forward", X - 3), fwd())).toBeNull();
  });

  it("needs the bus inside the lines sideways too", () => {
    expect(at(X, parkedZ("forward") + 0.8, fwd())).not.toBeNull();
    expect(at(X, parkedZ("forward") + 1.4, fwd())).toBeNull();
    expect(at(X, roadCenterZ(X), fwd())).toBeNull(); // sitting in the middle of the road
  });

  it("needs the bus lined up with the road", () => {
    expect(at(X, parkedZ("forward"), fwd() + 0.15)).not.toBeNull();
    expect(at(X, parkedZ("forward"), fwd() + 0.4)).toBeNull();
    expect(at(X, parkedZ("forward"), fwd() + Math.PI / 2)).toBeNull();
  });

  it("does not accept the wrong kerb for the way the bus is facing", () => {
    expect(at(X, parkedZ("backward"), fwd())).toBeNull();
    expect(at(X, parkedZ("forward"), back())).toBeNull();
  });

  it("is null between stops", () => {
    const mid = (ROUTE_V1[1].position + ROUTE_V1[2].position) / 2;
    expect(at(mid, parkedZ("forward", mid), roadAngle(mid))).toBeNull();
  });
});
