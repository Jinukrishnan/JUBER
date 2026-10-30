import { beforeEach, describe, expect, it } from "vitest";
import {
  BOARD_INTERVAL_S,
  CAPACITY,
  DAY_REAL_SECONDS,
  RENT,
} from "../constants";
import { ROUTE_V1 } from "../data/route-v1";
import { makePassenger, type Passenger } from "../logic/fares";
import { useGame } from "./store";

const LAST = ROUTE_V1.length - 1;
const emptyQueues = (): Passenger[][] => ROUTE_V1.map(() => []);

beforeEach(() => {
  useGame.getState().startDay();
  useGame.setState({ waitingByStop: emptyQueues(), onboard: [] });
});

describe("startDay", () => {
  it("owes the rent and starts running forward at the depot", () => {
    const s = useGame.getState();
    expect(s.net).toBe(-RENT);
    expect(s.phase).toBe("running");
    expect(s.direction).toBe("forward");
    expect(s.busPosition).toBe(0);
  });
});

describe("toggleDoor", () => {
  it("stays closed when the bus is moving", () => {
    useGame.getState().setBusState(0, 5);
    useGame.getState().toggleDoor();
    expect(useGame.getState().doorOpen).toBe(false);
  });
  it("stays closed outside a stop zone", () => {
    useGame.getState().setBusState(700, 0);
    useGame.getState().toggleDoor();
    expect(useGame.getState().doorOpen).toBe(false);
  });
  it("opens when stationary inside a zone, and closes again", () => {
    useGame.getState().setBusState(0, 0);
    useGame.getState().toggleDoor();
    expect(useGame.getState().doorOpen).toBe(true);
    useGame.getState().toggleDoor();
    expect(useGame.getState().doorOpen).toBe(false);
  });
  it("closes by itself when the bus leaves the zone", () => {
    useGame.getState().setBusState(0, 0);
    useGame.getState().toggleDoor();
    useGame.getState().setBusState(300, 5);
    expect(useGame.getState().doorOpen).toBe(false);
  });
});

describe("transferStep", () => {
  it("boards one passenger per step and collects the fare", () => {
    const p = makePassenger("a", 0, 2, 100);
    useGame.setState({ waitingByStop: [[p], ...ROUTE_V1.slice(1).map(() => [])] });
    useGame.getState().setBusState(0, 0);
    useGame.getState().toggleDoor();
    useGame.getState().transferStep();
    const s = useGame.getState();
    expect(s.onboard.map((x) => x.id)).toEqual(["a"]);
    expect(s.waitingByStop[0]).toEqual([]);
    expect(s.net).toBe(-RENT + p.fare);
  });

  it("leaves waiting passengers queued when the bus is full", () => {
    const full = Array.from({ length: CAPACITY }, (_, i) =>
      makePassenger(`o${i}`, 0, LAST, 100),
    );
    const w = makePassenger("w", 1, 4, 100);
    const queues = emptyQueues();
    queues[1] = [w];
    useGame.setState({ onboard: full, waitingByStop: queues });
    useGame.getState().setBusState(ROUTE_V1[1].position, 0);
    useGame.getState().toggleDoor();
    useGame.getState().transferStep();
    const s = useGame.getState();
    expect(s.onboard).toHaveLength(CAPACITY);
    expect(s.waitingByStop[1]).toEqual([w]);
  });

  it("does nothing when the door is closed", () => {
    const p = makePassenger("a", 0, 2, 100);
    useGame.setState({ waitingByStop: [[p], ...ROUTE_V1.slice(1).map(() => [])] });
    useGame.getState().setBusState(0, 0);
    useGame.getState().transferStep();
    expect(useGame.getState().onboard).toEqual([]);
  });

  it("empties the bus at the terminus, then flips direction", () => {
    const riders = [makePassenger("a", 0, LAST, 100), makePassenger("b", 2, LAST, 100)];
    useGame.setState({ onboard: riders });
    useGame.getState().setBusState(ROUTE_V1[LAST].position, 0);
    useGame.getState().toggleDoor();
    useGame.getState().transferStep();
    useGame.getState().transferStep();
    expect(useGame.getState().onboard).toEqual([]);
    expect(useGame.getState().carried).toBe(2);
    useGame.getState().transferStep();
    expect(useGame.getState().direction).toBe("backward");
  });
});

describe("tick", () => {
  it("drives transfers while the door is open", () => {
    const p = makePassenger("a", 0, 2, 100);
    useGame.setState({ waitingByStop: [[p], ...ROUTE_V1.slice(1).map(() => [])] });
    useGame.getState().setBusState(0, 0);
    useGame.getState().toggleDoor();
    useGame.getState().tick(BOARD_INTERVAL_S + 0.01);
    expect(useGame.getState().onboard.map((x) => x.id)).toEqual(["a"]);
  });

  it("ends the day when the real-time budget is spent", () => {
    useGame.getState().tick(DAY_REAL_SECONDS + 1);
    expect(useGame.getState().phase).toBe("ended");
  });

  it("does not advance while paused", () => {
    useGame.getState().pause();
    const before = useGame.getState().clockElapsed;
    useGame.getState().tick(10);
    expect(useGame.getState().clockElapsed).toBe(before);
    useGame.getState().resume();
    expect(useGame.getState().phase).toBe("running");
  });

  it("removes passengers whose patience runs out and counts them", () => {
    const queues = emptyQueues();
    queues[3] = [makePassenger("w", 3, 5, 1)];
    useGame.setState({ waitingByStop: queues });
    useGame.getState().tick(2);
    expect(useGame.getState().waitingByStop[3].find((x) => x.id === "w")).toBeUndefined();
    expect(useGame.getState().expiredPassengers).toBe(1);
  });
});

describe("missed stops", () => {
  it("counts a miss and refunds the fare when the bus drives past a destination", () => {
    const p = makePassenger("a", 0, 1, 100);
    useGame.setState({ onboard: [p], net: 0 });
    useGame.getState().setBusState(ROUTE_V1[1].position, 8);
    useGame.getState().setBusState(ROUTE_V1[1].position + 200, 8);
    const s = useGame.getState();
    expect(s.missedStops).toBe(1);
    expect(s.onboard).toEqual([]);
    expect(s.net).toBe(-p.fare);
  });

  it("does not count a miss when the passenger got off", () => {
    useGame.setState({ onboard: [makePassenger("a", 0, 1, 100)] });
    useGame.getState().setBusState(ROUTE_V1[1].position, 0);
    useGame.getState().toggleDoor();
    useGame.getState().transferStep();
    useGame.getState().setBusState(ROUTE_V1[1].position + 200, 8);
    expect(useGame.getState().missedStops).toBe(0);
  });
});
