import { describe, expect, it } from "vitest";
import { NETWORK_V1 } from "../data/network-v1";
import { PLACES } from "../data/places-v1";
import { LANE, KINDS, TRAFFIC_COUNT, agentPose, createTraffic, inRange, trafficMix, type Agent } from "./traffic";
import { builtRoads, drivable, nearestOnRoad, roadLength } from "./network";
import { placeSpot } from "./places";

const N = NETWORK_V1;
const depot = placeSpot(N, PLACES.find((p) => p.id === "depot")!);

describe("createTraffic", () => {
  const agents = createTraffic(N, 1, depot);

  it("makes the whole mix, with unique ids", () => {
    const count = (list: typeof agents, k: string) => list.filter((a) => a.kind === k).length;
    expect(agents).toHaveLength(TRAFFIC_COUNT);
    expect(new Set(agents.map((a) => a.id)).size).toBe(TRAFFIC_COUNT);
    expect(count(agents, "car")).toBeGreaterThan(count(agents, "auto"));
    for (const k of ["car", "auto", "bike", "bus"]) expect(count(agents, k), k).toBeGreaterThan(0);
    for (const total of [14, 30, 45, 50]) expect(trafficMix(total)).toHaveLength(total);
    expect(createTraffic(N, 1, depot, 14)).toHaveLength(14);
  });

  it("is repeatable for a seed and different for another", () => {
    expect(createTraffic(N, 1, depot)).toEqual(agents);
    expect(createTraffic(N, 2, depot)).not.toEqual(agents);
  });

  it("keeps clear of the depot and of each other", () => {
    for (const a of agents) {
      const p = agentPose(N, a);
      expect(Math.hypot(p.x - depot.x, p.z - depot.z)).toBeGreaterThanOrEqual(40);
    }
    for (const a of agents) {
      for (const b of agents) {
        if (a.id >= b.id || a.road !== b.road || a.dir !== b.dir) continue;
        const L = roadLength(builtRoads(N).find((r) => r.road.id === a.road)!);
        let d = Math.abs(a.s - b.s);
        if (a.road === "ring") d = Math.min(d, L - d);
        expect(d).toBeGreaterThanOrEqual(25);
      }
    }
  });

  it("starts each agent still with a cruise speed near its kind's", () => {
    for (const a of agents) {
      expect(a.speed).toBe(0);
      expect(a.cruise).toBeGreaterThanOrEqual(KINDS[a.kind].cruise * 0.85 - 1e-9);
      expect(a.cruise).toBeLessThanOrEqual(KINDS[a.kind].cruise * 1.1 + 1e-9);
    }
  });
});

describe("agentPose", () => {
  const roads = builtRoads(N);

  it("keeps to the left lane, on the road, on both directions, all round the ring", () => {
    const ring = roads.find((r) => r.road.id === "ring")!;
    for (const dir of [1, -1] as const) {
      for (let s = 0; s < ring.length; s += 7) {
        const a = { road: "ring", dir, s } as Agent;
        const p = agentPose(N, a);
        expect(drivable(N, p.x, p.z)).toBe(true);
        expect(nearestOnRoad(ring, p.x, p.z).distance).toBeCloseTo(LANE, 4);
      }
    }
  });

  it("faces the way it travels: east on the top edge one way, west the other", () => {
    const east = agentPose(N, { road: "ring", dir: 1, s: 300 } as Agent);
    const west = agentPose(N, { road: "ring", dir: -1, s: 300 } as Agent);
    expect(east.heading).toBeCloseTo(0, 6);
    expect(Math.abs(west.heading)).toBeCloseTo(Math.PI, 6);
    // left of east is north (-z); left of west is south (+z)
    expect(east.z).toBeCloseTo(-LANE, 6);
    expect(west.z).toBeCloseTo(LANE, 6);
  });
});

describe("inRange", () => {
  it("says which agents are close enough to draw", () => {
    const agents = createTraffic(N, 1, depot);
    const near = agents.filter((a) => inRange(N, a, depot.x, depot.z, 260));
    for (const a of agents) {
      const p = agentPose(N, a);
      expect(inRange(N, a, depot.x, depot.z, 260)).toBe(Math.hypot(p.x - depot.x, p.z - depot.z) <= 260);
    }
    expect(near.length).toBeLessThan(agents.length);
    expect(near.length).toBeGreaterThan(0);
  });
});
