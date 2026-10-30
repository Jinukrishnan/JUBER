import { beforeEach, describe, expect, it } from "vitest";
import {
  ACCIDENT_FINE,
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

describe("dayId", () => {
  it("increments on every startDay so the scene can reset", () => {
    const before = useGame.getState().dayId;
    useGame.getState().startDay();
    expect(useGame.getState().dayId).toBe(before + 1);
  });
});

describe("mute", () => {
  it("toggles and survives a new day", () => {
    expect(useGame.getState().muted).toBe(false);
    useGame.getState().toggleMute();
    useGame.getState().startDay();
    expect(useGame.getState().muted).toBe(true);
    useGame.getState().toggleMute();
  });
});

describe("headlights", () => {
  it("start off, toggle on and off, and stay as set across a new day", () => {
    expect(useGame.getState().headlights).toBe(false);
    useGame.getState().toggleHeadlights();
    expect(useGame.getState().headlights).toBe(true);
    useGame.getState().startDay();
    expect(useGame.getState().headlights).toBe(true);
    useGame.getState().toggleHeadlights();
    expect(useGame.getState().headlights).toBe(false);
  });
});

describe("accidents", () => {
  it("fine the driver, count the accident and show a notice", () => {
    const before = useGame.getState().net;
    useGame.getState().registerAccident();
    const s = useGame.getState();
    expect(s.net).toBe(before - ACCIDENT_FINE);
    expect(s.accidents).toBe(1);
    expect(s.notice?.text).toMatch(/accident/i);
  });

  it("give each notice a new id so the banner can restart", () => {
    useGame.getState().registerAccident();
    const first = useGame.getState().notice?.id;
    useGame.getState().registerAccident();
    expect(useGame.getState().notice?.id).not.toBe(first);
    expect(useGame.getState().accidents).toBe(2);
  });

  it("start from zero on a new day", () => {
    useGame.getState().registerAccident();
    useGame.getState().startDay();
    expect(useGame.getState().accidents).toBe(0);
    expect(useGame.getState().notice).toBeNull();
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
  it("forgives a small overshoot and lets the driver reverse back in", () => {
    const p = makePassenger("a", 0, 1, 100);
    useGame.setState({ onboard: [p], net: 0 });
    const stop = ROUTE_V1[1].position;
    useGame.getState().setBusState(stop, 8);
    useGame.getState().setBusState(stop + 30, 2);
    expect(useGame.getState().missedStops).toBe(0);
    useGame.getState().setBusState(stop + 1, 0);
    useGame.getState().toggleDoor();
    useGame.getState().transferStep();
    expect(useGame.getState().onboard).toEqual([]);
    expect(useGame.getState().carried).toBe(1);
  });

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

describe("bay rules", () => {
  it("keeps the door shut when the bus is not completely inside a bay", () => {
    useGame.getState().setBusState(0, 0, null);
    useGame.getState().toggleDoor();
    expect(useGame.getState().doorOpen).toBe(false);
  });

  it("opens the door when the caller reports the bus fully inside the bay", () => {
    useGame.getState().setBusState(0, 0, { stop: 0, side: "forward" });
    useGame.getState().toggleDoor();
    expect(useGame.getState().doorOpen).toBe(true);
    expect(useGame.getState().parked).toEqual({ stop: 0, side: "forward" });
  });

  it("closes the door as soon as the bus is no longer in a bay", () => {
    useGame.getState().setBusState(0, 0, { stop: 0, side: "forward" });
    useGame.getState().toggleDoor();
    useGame.getState().setBusState(0, 0, null);
    expect(useGame.getState().doorOpen).toBe(false);
    expect(useGame.getState().parked).toBeNull();
  });

  it("does not board anyone while parked in the bay for the other direction", () => {
    const p = makePassenger("a", 0, 2, 100);
    useGame.setState({ waitingByStop: [[p], ...ROUTE_V1.slice(1).map(() => [])] });
    useGame.getState().setBusState(0, 0, { stop: 0, side: "backward" });
    useGame.getState().toggleDoor();
    useGame.getState().transferStep();
    expect(useGame.getState().onboard).toEqual([]);
  });
});

describe("seats", () => {
  const boardAll = (n: number) => {
    const crowd = Array.from({ length: n }, (_, i) => makePassenger(`s${i}`, 0, 6, 100));
    useGame.setState({ waitingByStop: [crowd, ...ROUTE_V1.slice(1).map(() => [])] });
    useGame.getState().setBusState(0, 0);
    useGame.getState().toggleDoor();
    for (let i = 0; i < n; i++) useGame.getState().transferStep();
  };

  it("gives each boarding passenger their own seat", () => {
    boardAll(3);
    expect(useGame.getState().onboard.map((p) => p.seat)).toEqual([0, 1, 2]);
  });

  it("lets the next passenger take a seat that was freed", () => {
    boardAll(3);
    useGame.setState({ onboard: useGame.getState().onboard.filter((p) => p.seat !== 1) });
    const late = makePassenger("late", 0, 5, 100);
    useGame.setState({ waitingByStop: [[late], ...ROUTE_V1.slice(1).map(() => [])] });
    useGame.getState().transferStep();
    expect(useGame.getState().onboard.find((p) => p.id === "late")?.seat).toBe(1);
  });
});

describe("events", () => {
  it("records a board event with where the passenger is going", () => {
    const p = makePassenger("a", 0, 2, 100);
    useGame.setState({ waitingByStop: [[p], ...ROUTE_V1.slice(1).map(() => [])] });
    useGame.getState().setBusState(0, 0);
    useGame.getState().toggleDoor();
    useGame.getState().transferStep();
    const e = useGame.getState().events.at(-1);
    expect(e).toMatchObject({ type: "board", passengerId: "a", stop: 0, side: "forward", destination: 2, fare: p.fare, slot: 0 });
  });

  it("records an alight event and gives every event a new id", () => {
    useGame.setState({ onboard: [makePassenger("b", 0, 1, 100)] });
    useGame.getState().setBusState(ROUTE_V1[1].position, 0);
    useGame.getState().toggleDoor();
    useGame.getState().transferStep();
    const events = useGame.getState().events;
    expect(events.at(-1)).toMatchObject({ type: "alight", passengerId: "b", stop: 1 });
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
  });

  it("keeps only the most recent events", () => {
    const crowd = Array.from({ length: 40 }, (_, i) => makePassenger(`c${i}`, 0, 6, 100));
    useGame.setState({ waitingByStop: [crowd, ...ROUTE_V1.slice(1).map(() => [])] });
    useGame.getState().setBusState(0, 0);
    useGame.getState().toggleDoor();
    for (let i = 0; i < 40; i++) useGame.getState().transferStep();
    expect(useGame.getState().onboard).toHaveLength(40);
    expect(useGame.getState().events).toHaveLength(30);
  });
});
