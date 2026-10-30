import { describe, expect, it } from "vitest";
import { planTransfer } from "./boarding";
import { makePassenger } from "./fares";

const p = (id: string, origin: number, destination: number) =>
  makePassenger(id, origin, destination, 30);

describe("planTransfer", () => {
  it("alights passengers whose destination is this stop", () => {
    const onboard = [p("a", 0, 2), p("b", 0, 3)];
    const r = planTransfer({
      stopIndex: 2,
      dir: "forward",
      onboard,
      waiting: [],
      capacity: 40,
      isTerminus: false,
    });
    expect(r.alight.map((x) => x.id)).toEqual(["a"]);
    expect(r.board).toEqual([]);
  });

  it("boards only passengers heading ahead in the current direction", () => {
    const waiting = [p("fwd", 2, 4), p("back", 2, 0)];
    const r = planTransfer({
      stopIndex: 2,
      dir: "forward",
      onboard: [],
      waiting,
      capacity: 40,
      isTerminus: false,
    });
    expect(r.board.map((x) => x.id)).toEqual(["fwd"]);
  });

  it("boards nobody when the bus is full and does not mutate the waiting list", () => {
    const onboard = Array.from({ length: 40 }, (_, i) => p(`o${i}`, 0, 6));
    const waiting = [p("w1", 2, 4), p("w2", 2, 5), p("w3", 2, 6)];
    const copy = [...waiting];
    const r = planTransfer({
      stopIndex: 2,
      dir: "forward",
      onboard,
      waiting,
      capacity: 40,
      isTerminus: false,
    });
    expect(r.board).toEqual([]);
    expect(waiting).toEqual(copy);
  });

  it("frees seats from alighting before boarding", () => {
    const onboard = [
      p("x", 0, 2),
      ...Array.from({ length: 38 }, (_, i) => p(`o${i}`, 0, 6)),
    ];
    const waiting = Array.from({ length: 5 }, (_, i) => p(`w${i}`, 2, 5));
    const r = planTransfer({
      stopIndex: 2,
      dir: "forward",
      onboard,
      waiting,
      capacity: 40,
      isTerminus: false,
    });
    expect(r.alight.map((a) => a.id)).toEqual(["x"]);
    expect(r.board).toHaveLength(2);
    expect(r.board.map((b) => b.id)).toEqual(["w0", "w1"]);
  });

  it("alights everyone at a terminus and boards nobody heading the old way", () => {
    const onboard = [p("a", 0, 6), p("b", 2, 5)];
    const r = planTransfer({
      stopIndex: 6,
      dir: "forward",
      onboard,
      waiting: [p("w", 6, 3)],
      capacity: 40,
      isTerminus: true,
    });
    expect(r.alight).toHaveLength(2);
    expect(r.board).toEqual([]);
  });
});
