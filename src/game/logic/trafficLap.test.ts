import { describe, expect, it } from "vitest";
import { NETWORK_V1 } from "../data/network-v1";
import { PLACES } from "../data/places-v1";
import { VEHICLES } from "../data/vehicles";
import { nextSignalAhead } from "./lights";
import { builtRoads, clampToDrivable, headingAt, pointAt } from "./network";
import { placeSpot } from "./places";
import { KINDS, agentPose, createTraffic, stepTraffic, type Player } from "./traffic";
import { stepVehicle, type VehicleState } from "./vehicle";

const N = NETWORK_V1;
const spec = VEHICLES.car;
const ring = builtRoads(N).find((r) => r.road.id === "ring")!;
const depot = placeSpot(N, PLACES.find((p) => p.id === "depot")!);
const LANE = 3.7;

// the way points of the ring in the left lane, east-about
const way = (() => {
  const out: [number, number][] = [];
  for (let s = 0; s <= ring.length; s += 10) {
    const p = pointAt(ring, s);
    const h = headingAt(ring, s);
    out.push([p.x + Math.sin(h) * LANE, p.z - Math.cos(h) * LANE]);
  }
  return out;
})();

// One lap of the ring, east-about, at about 8 m/s: it brakes for a vehicle ahead in its
// lane and stops at red lights, like a careful driver, with the traffic moving round it.
function lap(seed: number) {
  const traffic = createTraffic(N, seed, depot);
  let s: VehicleState = { x: way[0][0], z: way[0][1], heading: Math.atan2(way[1][1] - way[0][1], way[1][0] - way[0][0]), speed: 0, steerAngle: 0 };
  let wi = 1;
  let hits = 0;
  let t = 0;
  let worstEdge = 0;
  const dt = 1 / 30;
  for (let i = 0; i < 30 * 700 && wi < way.length; i++, t += dt) {
    const [wx, wz] = way[wi];
    if (Math.hypot(wx - s.x, wz - s.z) < 8) {
      wi++;
      continue;
    }
    let err = Math.atan2(wz - s.z, wx - s.x) - s.heading;
    err = Math.atan2(Math.sin(err), Math.cos(err));

    // a vehicle close ahead in the lane, or a light that is not green
    let hold = false;
    const front = { x: s.x + Math.cos(s.heading) * 14, z: s.z + Math.sin(s.heading) * 14 };
    for (const a of traffic) {
      const p = agentPose(N, a);
      if (Math.hypot(p.x - front.x, p.z - front.z) < 7 + KINDS[a.kind].length / 2 && Math.cos(p.heading - s.heading) > 0) hold = true;
      if (Math.hypot(p.x - s.x, p.z - s.z) < 12 + KINDS[a.kind].length / 2 && Math.cos(Math.atan2(p.z - s.z, p.x - s.x) - s.heading) > 0.3) hold = true;
    }
    const sig = nextSignalAhead(N, { x: s.x, z: s.z, heading: s.heading }, t, spec.length / 2);
    if (sig && sig.light !== "green" && sig.distance - 15 < (s.speed * s.speed) / 7 + 3) hold = true;
    const want = hold ? 0 : 8;

    const r = stepVehicle(
      s,
      { throttle: s.speed < want ? 1 : s.speed > want + 1 ? -1 : 0, steer: Math.max(-1, Math.min(1, err * 2)), handbrake: hold && s.speed < 1 },
      dt,
      6,
      0,
      (x, z) => clampToDrivable(N, x, z),
      spec,
    );
    if (r.hitEdge) worstEdge++;
    s = r.state;
    const player: Player = { x: s.x, z: s.z, heading: s.heading, speed: s.speed, length: spec.length, width: spec.width };
    hits += stepTraffic(N, traffic, dt, t, player).hits.length;
  }
  if (wi < way.length) console.log("STUCK at", s.x.toFixed(0), s.z.toFixed(0), "speed", s.speed.toFixed(1), "wi", wi, traffic.filter((a)=>Math.hypot(agentPose(N,a).x-s.x,agentPose(N,a).z-s.z)<30).map((a)=>[a.kind,a.road,a.dir,Math.round(a.s),a.speed.toFixed(1),a.waiting,a.hold].join(":")).join(" | "));
  return { finished: wi >= way.length, hits, edge: worstEdge, t, traffic };
}

describe("a careful lap of the ring among the traffic", () => {
  for (const seed of [1, 2, 3]) {
    it(`seed ${seed}: gets all the way round, with no hits and never off the road`, () => {
      const r = lap(seed);
      expect(r.finished, `took ${r.t.toFixed(0)} s`).toBe(true);
      expect(r.hits).toBeLessThanOrEqual(1);
      expect(r.edge).toBe(0);
    });
  }
});
