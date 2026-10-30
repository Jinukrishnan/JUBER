import { describe, expect, it } from "vitest";
import { PLACES } from "../data/places-v1";
import type { Request } from "./requests";
import {
  IDLE_RIDE,
  ZONE_RADIUS,
  acceptRequest,
  acceptRide,
  arriveDrop,
  arrivePickup,
  cancelRide,
  finishAlighting,
  finishBoarding,
  inZone,
  tickRide,
  type Ride,
} from "./ride";

const req: Request = {
  id: "r1",
  customer: "Priya",
  pickup: PLACES[1],
  drop: PLACES[3],
  group: 2,
  fare: 100,
  distance: 400, // target 60 s
  expiresIn: 45,
};

const riding = (): Ride => finishBoarding(acceptRide(arrivePickup(acceptRequest(IDLE_RIDE, req))));

describe("the ride, step by step", () => {
  it("starts online with nothing booked", () => {
    expect(IDLE_RIDE).toEqual({ phase: "online", request: null, elapsed: 0 });
  });
  it("goes through every phase and pays once at the end", () => {
    let r = acceptRequest(IDLE_RIDE, req);
    expect(r.phase).toBe("toPickup");
    expect(r.request).toBe(req);
    r = arrivePickup(r);
    expect(r.phase).toBe("atPickup");
    r = acceptRide(r);
    expect(r.phase).toBe("boarding");
    r = finishBoarding(r);
    expect(r.phase).toBe("riding");
    r = arriveDrop(tickRide(r, 90)); // slower than the 60 s target: no bonus
    expect(r.phase).toBe("alighting");
    const done = finishAlighting(r);
    expect(done.paid).toBe(100);
    expect(done.ride).toEqual(IDLE_RIDE);
  });
  it("adds the speed bonus for a quick ride", () => {
    const r = arriveDrop(tickRide(riding(), 30)); // half the target time: 10 percent
    expect(finishAlighting(r).paid).toBe(110);
  });
  it("counts ride time only while riding", () => {
    let r = acceptRequest(IDLE_RIDE, req);
    expect(tickRide(r, 5).elapsed).toBe(0);
    r = arrivePickup(r);
    expect(tickRide(r, 5).elapsed).toBe(0);
    expect(tickRide(riding(), 5).elapsed).toBe(5);
  });
});

describe("illegal steps are ignored", () => {
  const all: Ride[] = [
    IDLE_RIDE,
    acceptRequest(IDLE_RIDE, req),
    arrivePickup(acceptRequest(IDLE_RIDE, req)),
    acceptRide(arrivePickup(acceptRequest(IDLE_RIDE, req))),
    riding(),
    arriveDrop(riding()),
  ];
  const steps: [string, (r: Ride) => Ride, Ride["phase"]][] = [
    ["acceptRequest", (r) => acceptRequest(r, req), "online"],
    ["arrivePickup", arrivePickup, "toPickup"],
    ["acceptRide", acceptRide, "atPickup"],
    ["finishBoarding", finishBoarding, "boarding"],
    ["arriveDrop", arriveDrop, "riding"],
  ];
  for (const [name, step, from] of steps) {
    it(`${name} only works from ${from}`, () => {
      for (const r of all) {
        if (r.phase !== from) expect(step(r)).toBe(r);
      }
    });
  }
  it("pays nothing, and changes nothing, if alighting is finished from another phase", () => {
    for (const r of all.filter((x) => x.phase !== "alighting")) {
      const out = finishAlighting(r);
      expect(out.paid).toBe(0);
      expect(out.ride).toBe(r);
    }
  });
  it("pays only once if alighting is finished twice", () => {
    const first = finishAlighting(arriveDrop(riding()));
    expect(first.paid).toBeGreaterThan(0);
    expect(finishAlighting(first.ride).paid).toBe(0);
  });
});

describe("cancelRide", () => {
  it("lets the customer walk away before they are in the vehicle", () => {
    expect(cancelRide(acceptRequest(IDLE_RIDE, req))).toEqual(IDLE_RIDE);
    expect(cancelRide(arrivePickup(acceptRequest(IDLE_RIDE, req)))).toEqual(IDLE_RIDE);
  });
  it("never abandons a customer who is on board", () => {
    const r = riding();
    expect(cancelRide(r)).toBe(r);
    const b = acceptRide(arrivePickup(acceptRequest(IDLE_RIDE, req)));
    expect(cancelRide(b)).toBe(b);
  });
});

describe("inZone", () => {
  const spot = { x: 100, z: 0 };
  it("is true close to the spot and nearly stopped", () => {
    expect(inZone({ x: 103, z: 0, speed: 1 }, spot)).toBe(true);
    expect(inZone({ x: 103, z: 0, speed: -1 }, spot)).toBe(true);
  });
  it("is false too far away or too fast", () => {
    expect(inZone({ x: 100 + ZONE_RADIUS + 1, z: 0, speed: 0 }, spot)).toBe(false);
    expect(inZone({ x: 100 + ZONE_RADIUS - 1, z: 0, speed: 3 }, spot)).toBe(false);
    expect(inZone({ x: 103, z: 0, speed: 1.5 }, spot)).toBe(false);
  });
  it("is true right on the edge of the zone when stopped", () => {
    expect(inZone({ x: 100 + ZONE_RADIUS, z: 0, speed: 0 }, spot)).toBe(true);
  });
});

import { targetPlace } from "./ride";
describe("targetPlace", () => {
  it("is the pickup until the customer is in, then the drop", () => {
    expect(targetPlace(IDLE_RIDE)).toBeNull();
    expect(targetPlace(acceptRequest(IDLE_RIDE, req))?.id).toBe(req.pickup.id);
    expect(targetPlace(arrivePickup(acceptRequest(IDLE_RIDE, req)))?.id).toBe(req.pickup.id);
    expect(targetPlace(acceptRide(arrivePickup(acceptRequest(IDLE_RIDE, req))))?.id).toBe(req.pickup.id);
    expect(targetPlace(riding())?.id).toBe(req.drop.id);
    expect(targetPlace(arriveDrop(riding()))?.id).toBe(req.drop.id);
  });
});

describe("the stop zone is generous across the road", () => {
  it("counts a vehicle in the far lane, about 7 m from the kerb spot", () => {
    expect(inZone({ x: 100, z: 6.7, speed: 0 }, { x: 100, z: 0 })).toBe(true);
  });
  it("still refuses 9 m", () => {
    expect(inZone({ x: 100, z: 9, speed: 0 }, { x: 100, z: 0 })).toBe(false);
  });
});
