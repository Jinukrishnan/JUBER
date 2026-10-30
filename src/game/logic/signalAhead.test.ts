import { describe, expect, it } from "vitest";
import { resolveJunction, stopLineDistance } from "./junction";
import { nextSignalAhead } from "./signalAhead";

const a = resolveJunction({ id: "a", x: 400, arms: "both", signal: { offset: 0 } });
const b = resolveJunction({ id: "b", x: 700, arms: "left", signal: false });
const c = resolveJunction({ id: "c", x: 1000, arms: "right", signal: { offset: 24 } });
const d = resolveJunction({ id: "d", x: 800, arms: "right", signal: { offset: 24 } });

describe("nextSignalAhead", () => {
  it("finds the next signalled junction in the direction of travel", () => {
    const s = nextSignalAhead([a, b, c], 200, "forward", 0)!;
    expect(s.id).toBe("a");
    expect(s.distance).toBeCloseTo(400 - stopLineDistance(a) - 200);
    expect(s.light).toBe("green");
    expect(s.seconds).toBeCloseTo(28);
  });
  it("skips junctions without a signal", () => {
    expect(nextSignalAhead([a, b, d], 600, "forward", 0)!.id).toBe("d");
  });
  it("looks the other way when heading back", () => {
    expect(nextSignalAhead([a, b, c], 520, "backward", 0)!.id).toBe("a");
  });
  it("ignores a junction once the bus is past its stop line", () => {
    expect(nextSignalAhead([a], 395, "forward", 0)).toBeNull();
  });
  it("shows nothing when the signal is far off", () => {
    expect(nextSignalAhead([c], 100, "forward", 0)).toBeNull();
  });
});
