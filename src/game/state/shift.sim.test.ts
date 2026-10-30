import { beforeEach, describe, expect, it } from "vitest";
import { BOARD_INTERVAL_S, GOAL } from "../constants";
import { ROUTE_V1 } from "../data/route-v1";
import { computeRating } from "../logic/rating";
import { nextStopIndex } from "../logic/route";
import { useGame } from "./store";

const g = () => useGame.getState();

const CRUISE = 12; // m/s average between stops (the bus tops out at 16)
const STEP = 0.1;
const BRAKE_S = 4; // slowing into a stop
const PULL_AWAY_S = 3; // getting going again

// A competent driver: stops at every stop, keeps the door open until nobody is
// moving, never misses one. Time really passes, so spawn pacing, patience and
// the day clock all matter, unlike the teleporting integration test.
function driveGoodShift() {
  g().startDay();
  let guard = 0;
  while (g().phase === "running" && guard++ < 20000) {
    const target = nextStopIndex(ROUTE_V1, g().busPosition, g().direction);
    if (target === null) break;
    const goal = ROUTE_V1[target].position;
    const sign = Math.sign(goal - g().busPosition);
    while (g().phase === "running" && Math.abs(goal - g().busPosition) > 0.01) {
      const step = Math.min(CRUISE * STEP, Math.abs(goal - g().busPosition));
      g().setBusState(g().busPosition + sign * step, CRUISE);
      g().tick(STEP);
    }
    if (g().phase !== "running") break;

    g().setBusState(goal, 0);
    g().tick(BRAKE_S);
    g().toggleDoor();
    let quiet = 0;
    let last = "";
    while (g().phase === "running" && quiet < 2) {
      g().tick(BOARD_INTERVAL_S + 0.01);
      const sig = `${g().onboard.length}|${g().carried}|${g().direction}`;
      quiet = sig === last ? quiet + 1 : 0;
      last = sig;
    }
    g().toggleDoor();
    g().tick(PULL_AWAY_S);
  }
}

describe("a realistic good shift", () => {
  beforeEach(() => driveGoodShift());

  it("reaches the daily goal", () => {
    expect(g().phase).toBe("ended");
    expect(g().net).toBeGreaterThanOrEqual(GOAL);
  });

  it("earns a high rating for clean driving", () => {
    expect(g().missedStops).toBe(0);
    const rating = computeRating({
      missedStops: g().missedStops,
      expiredPassengers: g().expiredPassengers,
      harshEvents: g().harshEvents,
      carried: g().carried,
    });
    expect(rating).toBeGreaterThanOrEqual(4);
  });
});
