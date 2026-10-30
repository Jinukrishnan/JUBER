import { beforeEach, describe, expect, it } from "vitest";
import { CAPACITY } from "../constants";
import { ROUTE_V1 } from "../data/route-v1";
import { useGame } from "./store";

const g = () => useGame.getState();

// Park at a stop, open the door, let the boarding timer run until the bus
// stops changing, then close the door and pull away.
function serveStop(index: number) {
  g().setBusState(ROUTE_V1[index].position, 0);
  g().toggleDoor();
  let guard = 0;
  let last = "";
  while (guard++ < 200) {
    g().tick(0.7);
    const sig = `${g().onboard.length}|${g().waitingByStop[index].length}|${g().direction}`;
    if (sig === last) break;
    last = sig;
  }
  g().toggleDoor();
  g().setBusState(ROUTE_V1[index].position + 100, 8);
}

describe("a full shift", () => {
  beforeEach(() => g().startDay());

  it("runs the route out and back, boarding many passengers and flipping at each terminus", () => {
    let peak = 0;
    const order = [0, 1, 2, 3, 4, 5, 6];
    for (const i of order) {
      serveStop(i);
      peak = Math.max(peak, g().onboard.length);
    }
    // at the far terminus every outbound rider got off; whoever is aboard now
    // boarded there for the return trip, and the bus heads back
    const last = ROUTE_V1.length - 1;
    expect(g().onboard.every((p) => p.origin === last && p.destination < last)).toBe(true);
    expect(g().direction).toBe("backward");
    expect(peak).toBeGreaterThan(1); // many passengers at once, unlike the auto
    expect(peak).toBeLessThanOrEqual(CAPACITY);

    for (const i of [...order].reverse().slice(1)) serveStop(i);
    expect(g().direction).toBe("forward");
    expect(g().carried).toBeGreaterThan(0);
    expect(g().missedStops).toBe(0);
    expect(g().net).toBeGreaterThan(-250);
  });

  it("counts every skipped stop and still ends the day cleanly", () => {
    serveStop(0);
    const aboard = g().onboard.length;
    expect(aboard).toBeGreaterThan(0);
    // drive the whole line without ever opening the door again
    for (const i of [1, 2, 3, 4, 5, 6]) {
      g().setBusState(ROUTE_V1[i].position, 8);
      g().setBusState(ROUTE_V1[i].position + 100, 8);
    }
    expect(g().missedStops).toBeGreaterThan(0);
    g().tick(1000);
    expect(g().phase).toBe("ended");
    expect(g().doorOpen).toBe(false);
  });
});
