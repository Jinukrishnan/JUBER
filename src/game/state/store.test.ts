import { beforeEach, describe, expect, it } from "vitest";
import { ACCIDENT_FINE, DAY_REAL_SECONDS, PICKUP_PATIENCE_S } from "../constants";
import { VEHICLES } from "../data/vehicles";
import { MAX_OPEN, REQUEST_TTL_S, type Request } from "../logic/requests";
import { RIDE_WORLD } from "../rideWorld";
import { useGame } from "./store";

const g = () => useGame.getState();
const spotOf = (r: Request, which: "pickup" | "drop") => RIDE_WORLD.spot(r[which]);
// the vehicle parked right on a spot
const park = (r: Request, which: "pickup" | "drop") => {
  const s = spotOf(r, which);
  g().setVehicleState({ x: s.x, z: s.z, speed: 0 });
};
const first = () => g().openRequests[0];

beforeEach(() => g().startDay("auto"));

describe("startDay", () => {
  it("owes the rent, runs, and goes online with a couple of requests waiting", () => {
    const s = g();
    expect(s.phase).toBe("running");
    expect(s.net).toBe(-VEHICLES.auto.rent);
    expect(s.ride.phase).toBe("online");
    expect(s.openRequests.length).toBeGreaterThanOrEqual(1);
    expect(s.openRequests.length).toBeLessThanOrEqual(MAX_OPEN);
  });
  it("starts every counter at zero", () => {
    const s = g();
    expect([s.ridesDone, s.distanceDone, s.accidents, s.violations, s.expiredPickups, s.harshEvents]).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe("dayId", () => {
  it("increments on every startDay so the scene can reset", () => {
    const a = g().dayId;
    g().startDay();
    expect(g().dayId).toBe(a + 1);
  });
});

describe("mute", () => {
  it("toggles and survives a new day", () => {
    expect(g().muted).toBe(false);
    g().toggleMute();
    expect(g().muted).toBe(true);
    g().startDay();
    expect(g().muted).toBe(true);
    g().toggleMute();
  });
});

describe("headlights", () => {
  it("start off, toggle on and off, and stay as set across a new day", () => {
    expect(g().headlights).toBe(false);
    g().toggleHeadlights();
    expect(g().headlights).toBe(true);
    g().startDay();
    expect(g().headlights).toBe(true);
    g().toggleHeadlights();
    expect(g().headlights).toBe(false);
  });
});

describe("choosing a vehicle", () => {
  it("takes that vehicle's rent off the day's takings", () => {
    g().startDay("bike");
    expect(g().vehicle).toBe("bike");
    expect(g().net).toBe(-100);
    g().startDay("car");
    expect(g().net).toBe(-300);
  });
  it("keeps the previous vehicle when none is given", () => {
    g().startDay("bike");
    g().startDay();
    expect(g().vehicle).toBe("bike");
  });
  it("only ever offers a group the vehicle can hold", () => {
    for (const kind of ["bike", "auto", "car"] as const) {
      g().startDay(kind);
      for (let i = 0; i < 40; i++) g().tick(1);
      for (const r of g().openRequests) expect(r.group).toBeLessThanOrEqual(VEHICLES[kind].capacity);
    }
  });
});

describe("accidents", () => {
  it("fine the driver, count the accident and show a notice", () => {
    const before = g().net;
    g().registerAccident();
    expect(g().net).toBe(before - ACCIDENT_FINE);
    expect(g().accidents).toBe(1);
    expect(g().notice?.text).toMatch(/accident/i);
  });
  it("give each notice a new id so the banner can restart", () => {
    g().registerAccident();
    const a = g().notice!.id;
    g().registerAccident();
    expect(g().notice!.id).not.toBe(a);
  });
});

describe("casualties", () => {
  const c = { personKey: "p1", x: 5, z: 1, y: 0.15, dx: 1, dz: 0, line: 3 };
  it("are recorded with an id and fine the driver", () => {
    const before = g().net;
    g().injure(c);
    expect(g().casualties).toHaveLength(1);
    expect(g().net).toBe(before - ACCIDENT_FINE);
  });
  it("can be cleared once they have been seen", () => {
    g().injure(c);
    g().clearCasualty(g().casualties[0].id);
    expect(g().casualties).toHaveLength(0);
  });
  it("keep only the most recent few", () => {
    for (let i = 0; i < 20; i++) g().injure({ ...c, personKey: `p${i}` });
    expect(g().casualties.length).toBeLessThanOrEqual(8);
  });
  it("are cleared on a new day", () => {
    g().injure(c);
    g().startDay();
    expect(g().casualties).toHaveLength(0);
  });
});

describe("red-light violations", () => {
  it("fine the driver, count it and show a notice", () => {
    const before = g().net;
    g().registerViolation();
    expect(g().net).toBe(before - 100);
    expect(g().violations).toBe(1);
    expect(g().notice?.text).toBe("Jumped a red signal! Fine Rs. 100");
  });
  it("start again at zero on a new day", () => {
    g().registerViolation();
    g().startDay();
    expect(g().violations).toBe(0);
    expect(g().signalTime).toBe(0);
  });
});

describe("signal clock", () => {
  it("advances while the day runs and holds while paused", () => {
    g().tick(0.5);
    g().tick(0.5);
    expect(g().signalTime).toBeCloseTo(1);
    g().pause();
    g().tick(0.5);
    expect(g().signalTime).toBeCloseTo(1);
  });
});

describe("request board", () => {
  it("fills up over time but never beyond three", () => {
    for (let i = 0; i < 300; i++) {
      g().tick(0.5);
      expect(g().openRequests.length).toBeLessThanOrEqual(MAX_OPEN);
    }
  });
  it("withdraws a request nobody takes after 45 seconds", () => {
    g().startDay();
    const id = first().id;
    for (let i = 0; i < REQUEST_TTL_S + 2; i++) g().tick(1);
    expect(g().openRequests.some((r) => r.id === id)).toBe(false);
  });
  it("lets the driver skip a request", () => {
    const id = first().id;
    g().skip(id);
    expect(g().openRequests.some((r) => r.id === id)).toBe(false);
    expect(g().ride.phase).toBe("online");
  });
  it("does not age or add requests while paused", () => {
    const before = g().openRequests;
    g().pause();
    for (let i = 0; i < 100; i++) g().tick(1);
    expect(g().openRequests).toBe(before);
  });
});

describe("a ride", () => {
  it("is accepted from the board, the others stay open", () => {
    g().tick(30);
    const others = g().openRequests.length - 1;
    const r = first();
    g().accept(r.id);
    expect(g().ride.phase).toBe("toPickup");
    expect(g().ride.request?.id).toBe(r.id);
    expect(g().openRequests.some((x) => x.id === r.id)).toBe(false);
    expect(g().openRequests).toHaveLength(others);
  });
  it("cannot take a second ride while one is booked", () => {
    g().tick(30);
    const [a, b] = g().openRequests;
    g().accept(a.id);
    g().accept(b.id);
    expect(g().ride.request?.id).toBe(a.id);
  });
  it("goes from pickup to drop and pays the fare once", () => {
    const r = first();
    g().accept(r.id);
    park(r, "pickup");
    expect(g().ride.phase).toBe("atPickup");
    g().confirmRide();
    expect(g().ride.phase).toBe("boarding");
    g().finishBoarding();
    expect(g().ride.phase).toBe("riding");
    g().tick(200); // far slower than the target: no bonus
    park(r, "drop");
    expect(g().ride.phase).toBe("alighting");
    const before = g().net;
    g().finishAlighting();
    g().finishAlighting();
    expect(g().net).toBe(before + r.fare);
    expect(g().ridesDone).toBe(1);
    expect(g().distanceDone).toBe(r.distance);
    expect(g().ride.phase).toBe("online");
  });
  it("does not start the conversation when the vehicle drives through the pickup", () => {
    const r = first();
    g().accept(r.id);
    const s = spotOf(r, "pickup");
    g().setVehicleState({ x: s.x, z: s.z, speed: 8 });
    expect(g().ride.phase).toBe("toPickup");
  });
  it("does not start the conversation when stopped just outside the zone", () => {
    const r = first();
    g().accept(r.id);
    const s = spotOf(r, "pickup");
    g().setVehicleState({ x: s.x + 9, z: s.z, speed: 0 });
    expect(g().ride.phase).toBe("toPickup");
  });
  it("does not drop anyone anywhere but the drop place", () => {
    const r = first();
    g().accept(r.id);
    park(r, "pickup");
    g().confirmRide();
    g().finishBoarding();
    park(r, "pickup");
    expect(g().ride.phase).toBe("riding");
  });
  it("keeps the ride going after a crash or a red light, with the fines", () => {
    const r = first();
    g().accept(r.id);
    park(r, "pickup");
    g().confirmRide();
    g().finishBoarding();
    const before = g().net;
    g().registerAccident();
    g().registerViolation();
    expect(g().ride.phase).toBe("riding");
    expect(g().net).toBe(before - ACCIDENT_FINE - 100);
  });
  it("cancels the booking if the waiting customer is hit", () => {
    const r = first();
    g().accept(r.id);
    g().hitCustomer({ personKey: "c1", x: 0, z: 0, y: 0.15, dx: 1, dz: 0, line: 1 });
    expect(g().ride.phase).toBe("online");
    expect(g().accidents).toBe(1);
  });
  it("lets the customer give up if the driver takes too long to arrive", () => {
    const r = first();
    g().accept(r.id);
    for (let i = 0; i < PICKUP_PATIENCE_S + 5; i++) g().tick(1);
    expect(g().ride.phase).toBe("online");
    expect(g().expiredPickups).toBe(1);
  });
  it("never abandons a customer who is on board, however long the ride takes", () => {
    const r = first();
    g().accept(r.id);
    park(r, "pickup");
    g().confirmRide();
    g().finishBoarding();
    for (let i = 0; i < PICKUP_PATIENCE_S + 50; i++) g().tick(1);
    expect(g().ride.phase === "riding" || g().phase === "ended").toBe(true);
    expect(g().expiredPickups).toBe(0);
  });
});

describe("tick", () => {
  it("ends the day when the real-time budget is spent", () => {
    g().tick(DAY_REAL_SECONDS + 1);
    expect(g().phase).toBe("ended");
  });
  it("leaves a ride in progress unpaid when the day ends", () => {
    const r = first();
    g().accept(r.id);
    park(r, "pickup");
    g().confirmRide();
    g().finishBoarding();
    const before = g().net;
    g().tick(DAY_REAL_SECONDS + 1);
    expect(g().phase).toBe("ended");
    expect(g().net).toBe(before);
    expect(g().ridesDone).toBe(0);
    g().finishAlighting();
    expect(g().net).toBe(before);
  });
  it("does not advance while paused", () => {
    g().pause();
    const t = g().clockElapsed;
    g().tick(10);
    expect(g().clockElapsed).toBe(t);
  });
});

describe("navigation route", () => {
  it("has none until a ride is accepted", () => {
    expect(g().route).toBeNull();
  });
  it("leads to the pickup once accepted", () => {
    const r = first();
    g().accept(r.id);
    const route = g().route!;
    const s = spotOf(r, "pickup");
    const end = route.points[route.points.length - 1];
    expect(Math.hypot(end.x - s.x, end.z - s.z)).toBeLessThan(2);
  });
  it("switches to the drop once the customer is in", () => {
    const r = first();
    g().accept(r.id);
    park(r, "pickup");
    g().confirmRide();
    g().finishBoarding();
    const route = g().route!;
    const s = spotOf(r, "drop");
    const end = route.points[route.points.length - 1];
    expect(Math.hypot(end.x - s.x, end.z - s.z)).toBeLessThan(2);
  });
  it("is cleared when the ride is paid", () => {
    const r = first();
    g().accept(r.id);
    park(r, "pickup");
    g().confirmRide();
    g().finishBoarding();
    park(r, "drop");
    g().finishAlighting();
    expect(g().route).toBeNull();
  });
  it("is cleared when the customer gives up", () => {
    g().accept(first().id);
    for (let i = 0; i < PICKUP_PATIENCE_S + 5; i++) g().tick(1);
    expect(g().route).toBeNull();
  });
  it("is worked out again when the vehicle leaves the road it follows", () => {
    const r = first();
    g().accept(r.id);
    const before = g().route!;
    const p = before.points[Math.floor(before.points.length / 2)];
    g().setVehicleState({ x: p.x, z: p.z + 6, speed: 5 }); // still near the line
    expect(g().route).toBe(before);
    g().setVehicleState({ x: p.x, z: p.z + 40, speed: 5 }); // well off it
    expect(g().route).not.toBe(before);
    expect(g().route!.points[0].z).toBeCloseTo(p.z + 40);
  });
});
