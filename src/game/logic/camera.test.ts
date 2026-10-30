import { describe, expect, it } from "vitest";
import { REVERSE_SPEED, isReversing, stepChaseYaw, wrapAngle } from "./camera";

const settle = (yaw: number, heading: number, speed: number, seconds = 3) => {
  let y = yaw;
  for (let t = 0; t < seconds; t += 1 / 60) y = stepChaseYaw(y, heading, speed, 1 / 60);
  return y;
};

describe("isReversing", () => {
  it("is true only when rolling backwards faster than the threshold", () => {
    expect(isReversing(-2)).toBe(true);
    expect(isReversing(-0.5)).toBe(false);
    expect(isReversing(0)).toBe(false);
    expect(isReversing(8)).toBe(false);
    expect(REVERSE_SPEED).toBe(1);
  });
});

describe("stepChaseYaw", () => {
  it("settles behind the bus when driving forward", () => {
    const yaw = settle(2, 0.4, 8);
    expect(Math.abs(wrapAngle(yaw - 0.4))).toBeLessThan(0.01);
  });

  it("swings round to the front when reversing", () => {
    const yaw = settle(0, 0, -3);
    expect(Math.abs(wrapAngle(yaw - Math.PI))).toBeLessThan(0.01);
  });

  it("swings back behind the bus once forward again", () => {
    const yaw = settle(Math.PI, 0, 5);
    expect(Math.abs(wrapAngle(yaw))).toBeLessThan(0.01);
  });

  it("takes the short way round instead of spinning through the long arc", () => {
    // yaw just under +pi, target just over -pi (same direction): should barely move
    const next = stepChaseYaw(Math.PI - 0.1, 0, -3, 1 / 60);
    expect(Math.abs(wrapAngle(next - (Math.PI - 0.1)))).toBeLessThan(0.1);
  });

  it("does not move the camera at all for a zero time step", () => {
    expect(stepChaseYaw(1.2, 0, -3, 0)).toBe(1.2);
  });
});
