import { describe, expect, it } from "vitest";
import { DAY_REAL_SECONDS } from "../constants";
import { VEHICLE_KINDS, VEHICLES, type VehicleKind } from "../data/vehicles";
import { RIDE_WORLD, spotOf } from "../rideWorld";
import type { Place } from "../data/places-v1";
import { useGame } from "./store";

const g = () => useGame.getState();
const STEP = 0.5;
const TURN_FACTOR = 0.6; // average speed as a share of top speed: junctions, signals, bends
const CONVERSATION_S = 2;
const BOARD_S = 2.4;

// A competent driver: always takes the request with the best fare for the
// distance they must cover, drives at a sensible average speed, stops properly.
// Time really passes (requests spawn, age and expire), so pacing matters.
function playDay(kind: VehicleKind, seed: number, accept = true) {
  g().startDay(kind);
  useGame.setState({ seed });
  const speed = VEHICLES[kind].maxSpeed * TURN_FACTOR;
  let here: Place | null = null; // where the last ride ended (null: the depot, at the start)
  const wait = (s: number) => {
    for (let t = 0; t < s && g().phase === "running"; t += STEP) g().tick(STEP);
  };
  const park = (p: Place) => {
    const s = spotOf(p);
    g().setVehicleState({ x: s.x, z: s.z, speed: 0 });
  };

  while (accept && g().phase === "running") {
    const open = g().openRequests;
    if (open.length === 0) {
      wait(1);
      continue;
    }
    const lead = (r: (typeof open)[number]) => (here ? RIDE_WORLD.distance(here, r.pickup) : 200);
    const best = [...open].sort((a, b) => b.fare / (lead(b) + b.distance) - a.fare / (lead(a) + a.distance))[0];
    g().accept(best.id);
    wait(lead(best) / speed);
    if (g().phase !== "running") break;
    if (g().ride.phase === "online") continue; // the customer gave up
    park(best.pickup);
    wait(CONVERSATION_S);
    g().confirmRide();
    wait(BOARD_S);
    g().finishBoarding();
    wait(best.distance / speed);
    if (g().phase !== "running") break;
    park(best.drop);
    wait(BOARD_S);
    g().finishAlighting();
    here = best.drop;
  }
  return { net: g().net, rides: g().ridesDone, goal: VEHICLES[kind].goal };
}

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

describe("a day of rides", () => {
  for (const kind of VEHICLE_KINDS) {
    it(`${kind}: a competent driver reaches the goal on most days, but not on every one`, () => {
      const days = SEEDS.map((s) => playDay(kind, s));
      const hit = days.filter((d) => d.net >= d.goal).length;
      const nets = days.map((d) => d.net).sort((a, b) => a - b);
      console.log(kind, "goal", VEHICLES[kind].goal, "nets", nets.join(" "), "rides", days.map((d) => d.rides).join(" "));
      expect(hit / SEEDS.length).toBeGreaterThanOrEqual(0.5);
      expect(hit / SEEDS.length).toBeLessThan(1);
    }, 60000);
    it(`${kind}: a driver who never takes a ride ends the day owing the rent`, () => {
      const d = playDay(kind, 1, false);
      expect(d.net).toBe(-VEHICLES[kind].rent);
      expect(d.rides).toBe(0);
    });
  }
  it("takes the whole day (480 s) to play", () => {
    expect(DAY_REAL_SECONDS).toBe(480);
  });
});
