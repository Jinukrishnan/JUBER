import { describe, expect, it } from "vitest";
import {
  APP_NAME,
  BOARD_INTERVAL_S,
  CAPACITY,
  DAY_END_HOUR,
  DAY_REAL_SECONDS,
  DAY_START_HOUR,
  GOAL,
  RENT,
  STOP_SPEED_MAX,
} from "./constants";

describe("constants", () => {
  it("exposes the spec's tunable values", () => {
    expect(APP_NAME).toBe("Aanawadi");
    expect(CAPACITY).toBe(40);
    expect(RENT).toBe(250);
    expect(GOAL).toBe(800);
    expect(DAY_START_HOUR).toBe(6);
    expect(DAY_END_HOUR).toBe(20);
    expect(DAY_REAL_SECONDS).toBe(480);
    expect(BOARD_INTERVAL_S).toBe(0.6);
    expect(STOP_SPEED_MAX).toBe(1);
  });
});
