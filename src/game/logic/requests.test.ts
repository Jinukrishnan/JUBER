import { describe, expect, it } from "vitest";
import { PLACES, type Place } from "../data/places-v1";
import { VEHICLES, VEHICLE_KINDS } from "../data/vehicles";
import { NETWORK } from "../world";
import { placeSpot } from "./places";
import { MAX_OPEN, REQUEST_TTL_S, fareFor, nextRequest, speedBonus, spawnDelay, targetTimeS } from "./requests";

const world = {
  places: PLACES,
  spot: (p: Place) => placeSpot(NETWORK, p),
  distance: (a: Place, b: Place) => {
    const sa = placeSpot(NETWORK, a);
    const sb = placeSpot(NETWORK, b);
    return Math.hypot(sa.x - sb.x, sa.z - sb.z);
  },
};
const origin = { x: 600, z: 0 };

describe("fareFor", () => {
  it("is the base fare plus the rate for every 100 m", () => {
    expect(fareFor(VEHICLES.auto, 400)).toBe(72 + 34 * 4);
    expect(fareFor(VEHICLES.bike, 400)).toBe(33 + 12 * 4);
    expect(fareFor(VEHICLES.car, 400)).toBe(74 + 37 * 4);
  });
  it("rounds to a whole rupee", () => {
    expect(Number.isInteger(fareFor(VEHICLES.auto, 333))).toBe(true);
  });
});

describe("speedBonus", () => {
  it("is nothing when the ride is as slow as the target or slower", () => {
    expect(speedBonus(100, 60, 60)).toBe(0);
    expect(speedBonus(100, 90, 60)).toBe(0);
  });
  it("is 20 percent for an instant ride and never more", () => {
    expect(speedBonus(100, 0, 60)).toBe(20);
    expect(speedBonus(100, -5, 60)).toBe(20);
  });
  it("grows as the ride gets faster", () => {
    expect(speedBonus(100, 30, 60)).toBe(10);
  });
});

describe("targetTimeS", () => {
  it("allows 8 m/s plus ten seconds", () => {
    expect(targetTimeS(400)).toBe(60);
  });
});

describe("nextRequest", () => {
  it("never makes a group bigger than the vehicle holds", () => {
    for (const kind of VEHICLE_KINDS) {
      let state = { seed: 1, nextId: 1 };
      for (let i = 0; i < 500; i++) {
        const r = nextRequest(state, VEHICLES[kind], origin, world);
        state = { seed: r.seed, nextId: r.nextId };
        expect(r.request.group).toBeGreaterThanOrEqual(1);
        expect(r.request.group).toBeLessThanOrEqual(VEHICLES[kind].capacity);
      }
    }
  });
  it("always asks a bike for exactly one passenger", () => {
    let state = { seed: 7, nextId: 1 };
    for (let i = 0; i < 100; i++) {
      const r = nextRequest(state, VEHICLES.bike, origin, world);
      state = { seed: r.seed, nextId: r.nextId };
      expect(r.request.group).toBe(1);
    }
  });
  it("sometimes asks a car for two or three", () => {
    let state = { seed: 3, nextId: 1 };
    const sizes = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const r = nextRequest(state, VEHICLES.car, origin, world);
      state = { seed: r.seed, nextId: r.nextId };
      sizes.add(r.request.group);
    }
    expect([...sizes].sort()).toEqual([1, 2, 3]);
  });
  it("picks up and drops at different places at least 150 m apart", () => {
    let state = { seed: 11, nextId: 1 };
    for (let i = 0; i < 300; i++) {
      const r = nextRequest(state, VEHICLES.auto, origin, world);
      state = { seed: r.seed, nextId: r.nextId };
      expect(r.request.pickup.id).not.toBe(r.request.drop.id);
      expect(r.request.distance).toBeGreaterThanOrEqual(150);
    }
  });
  it("prices the ride from its distance and gives it the full time to live", () => {
    const r = nextRequest({ seed: 5, nextId: 1 }, VEHICLES.car, origin, world).request;
    expect(r.fare).toBe(fareFor(VEHICLES.car, r.distance));
    expect(r.expiresIn).toBe(REQUEST_TTL_S);
    expect(REQUEST_TTL_S).toBe(45);
  });
  it("prefers a pickup within 700 m of the vehicle", () => {
    let near = 0;
    let state = { seed: 21, nextId: 1 };
    for (let i = 0; i < 100; i++) {
      const r = nextRequest(state, VEHICLES.auto, origin, world);
      state = { seed: r.seed, nextId: r.nextId };
      const s = world.spot(r.request.pickup);
      if (Math.hypot(s.x - origin.x, s.z - origin.z) <= 700) near++;
    }
    expect(near).toBe(100);
  });
  it("does not start a ride on top of the vehicle", () => {
    const here = world.spot(PLACES[2]);
    let state = { seed: 9, nextId: 1 };
    for (let i = 0; i < 100; i++) {
      const r = nextRequest(state, VEHICLES.auto, here, world);
      state = { seed: r.seed, nextId: r.nextId };
      expect(r.request.pickup.id).not.toBe(PLACES[2].id);
    }
  });
  it("is the same for the same seed and different for another", () => {
    const a = nextRequest({ seed: 42, nextId: 1 }, VEHICLES.auto, origin, world);
    const b = nextRequest({ seed: 42, nextId: 1 }, VEHICLES.auto, origin, world);
    expect(a).toEqual(b);
    const c = nextRequest({ seed: 43, nextId: 1 }, VEHICLES.auto, origin, world);
    expect(c.request.pickup.id + c.request.drop.id + c.request.group).not.toBe(a.request.pickup.id + a.request.drop.id + a.request.group);
  });
  it("numbers requests and names a customer", () => {
    const r = nextRequest({ seed: 1, nextId: 9 }, VEHICLES.auto, origin, world);
    expect(r.request.id).toBe("r9");
    expect(r.nextId).toBe(10);
    expect(r.request.customer.length).toBeGreaterThan(1);
  });
});

describe("spawnDelay", () => {
  it("is between 8 and 15 seconds", () => {
    let seed = 1;
    for (let i = 0; i < 200; i++) {
      const d = spawnDelay(seed);
      seed = d.seed;
      expect(d.delay).toBeGreaterThanOrEqual(8);
      expect(d.delay).toBeLessThanOrEqual(15);
    }
  });
  it("allows at most three open requests", () => {
    expect(MAX_OPEN).toBe(3);
  });
});

describe("short rides are preferred", () => {
  it("keeps rides to 900 m or less when the world allows it", () => {
    let state = { seed: 31, nextId: 1 };
    for (let i = 0; i < 200; i++) {
      const r = nextRequest(state, VEHICLES.auto, origin, world);
      state = { seed: r.seed, nextId: r.nextId };
      expect(r.request.distance).toBeLessThanOrEqual(900);
    }
  });
  it("still finds a ride when no other place is within 900 m", () => {
    const far = { ...world, distance: () => 1500 };
    expect(nextRequest({ seed: 3, nextId: 1 }, VEHICLES.auto, origin, far).request.distance).toBe(1500);
  });
  it("prefers a pickup within 400 m of the vehicle when there is one", () => {
    const here = world.spot(PLACES[3]);
    let state = { seed: 17, nextId: 1 };
    const nearby = PLACES.filter((p) => {
      const s = world.spot(p);
      return p.id !== PLACES[3].id && Math.hypot(s.x - here.x, s.z - here.z) <= 400 && Math.hypot(s.x - here.x, s.z - here.z) > 30;
    }).map((p) => p.id);
    expect(nearby.length).toBeGreaterThan(0);
    for (let i = 0; i < 100; i++) {
      const r = nextRequest(state, VEHICLES.auto, here, world);
      state = { seed: r.seed, nextId: r.nextId };
      expect(nearby).toContain(r.request.pickup.id);
    }
  });
});
