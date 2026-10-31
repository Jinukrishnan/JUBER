import { describe, expect, it } from "vitest";
import { NETWORK_V1, type Network } from "../data/network-v1";
import { VEHICLES } from "../data/vehicles";
import { createJunctionWatch } from "./driveRules";
import { builtRoads, clampToDrivable, headingAt, pointAt, type BuiltRoad } from "./network";
import { stepVehicle, type VehicleState } from "./vehicle";

const N = NETWORK_V1;
const spec = VEHICLES.car;
const LANE = 3.7; // keep left, in the middle of the left lane

// the waypoints of one lap in the left lane, every 10 m, in the direction of travel
function lane(r: BuiltRoad, dir: 1 | -1, from: number, to: number): [number, number][] {
  const out: [number, number][] = [];
  const n = Math.ceil(Math.abs(to - from) / 10);
  for (let i = 0; i <= n; i++) {
    const s = from + ((to - from) * i) / n;
    const p = pointAt(r, s);
    const h = headingAt(r, s) + (dir === -1 ? Math.PI : 0);
    out.push([p.x + Math.sin(h) * LANE, p.z - Math.cos(h) * LANE]);
  }
  return out;
}

// the same map with the lights off: a lap checks the road and the turn rules, and a
// scripted driver that never stops would otherwise run every red (the signals have their own tests)
const OPEN: Network = { ...N, junctions: N.junctions.map((j) => ({ ...j, signal: false as const })) };

function lap(waypoints: [number, number][], t: number) {
  const watch = createJunctionWatch(OPEN);
  const [x0, z0] = waypoints[0];
  const [x1, z1] = waypoints[1];
  let s: VehicleState = { x: x0, z: z0, heading: Math.atan2(z1 - z0, x1 - x0), speed: 0, steerAngle: 0 };
  let wi = 1;
  let edges = 0;
  let wrong = 0;
  let red = 0;
  for (let i = 0; i < 40000 && wi < waypoints.length; i++) {
    const [wx, wz] = waypoints[wi];
    if (Math.hypot(wx - s.x, wz - s.z) < 8) {
      wi++;
      continue;
    }
    let err = Math.atan2(wz - s.z, wx - s.x) - s.heading;
    err = Math.atan2(Math.sin(err), Math.cos(err));
    const r = stepVehicle(s, { throttle: s.speed < 8 ? 1 : 0, steer: Math.max(-1, Math.min(1, err * 2)), handbrake: false }, 1 / 30, 6, 0, (x, z) => clampToDrivable(N, x, z), spec);
    const seen = watch.step(s, r.state, t, spec.length / 2);
    wrong += seen.wrongTurns;
    red += seen.redLights;
    if (r.hitEdge) edges++;
    s = r.state;
  }
  return { finished: wi >= waypoints.length, edges, wrong, red };
}

describe("a drive round the whole loop with the real physics", () => {
  const roads = builtRoads(N);
  const ring = roads.find((r) => r.road.id === "ring")!;

  it("goes all the way round the ring, east-about, without leaving the road or a wrong turn", () => {
    const r = lap(lane(ring, 1, 0, ring.length), 0);
    expect(r).toEqual({ finished: true, edges: 0, wrong: 0, red: 0 });
  });

  it("goes all the way round the ring the other way", () => {
    const r = lap(lane(ring, -1, ring.length, 0), 0);
    expect(r).toEqual({ finished: true, edges: 0, wrong: 0, red: 0 });
  });

  for (const id of ["ns", "ew"]) {
    const road = roads.find((r) => r.road.id === id)!;
    it(`drives the length of ${id} both ways, straight through the centre, without leaving the road`, () => {
      // stop short of the ring, where the cross road ends
      const a = lap(lane(road, 1, 20, road.length - 20), 0);
      const b = lap(lane(road, -1, road.length - 20, 20), 0);
      for (const r of [a, b]) {
        expect(r.finished).toBe(true);
        expect(r.edges).toBe(0);
        expect(r.wrong).toBe(0);
      }
    });
  }
});
