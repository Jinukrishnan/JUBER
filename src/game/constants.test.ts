import { describe, expect, it } from "vitest";
import { ACCIDENT_FINE, APP_NAME, DAY_END_HOUR, DAY_REAL_SECONDS, DAY_START_HOUR, PICKUP_PATIENCE_S, SIGNAL_FINE } from "./constants";

describe("constants", () => {
  it("exposes the spec's tunable values", () => {
    expect(APP_NAME).toBe("Aanawadi");
    expect(DAY_START_HOUR).toBe(6);
    expect(DAY_END_HOUR).toBe(20);
    expect(DAY_REAL_SECONDS).toBe(480);
    expect(ACCIDENT_FINE).toBe(300);
    expect(SIGNAL_FINE).toBe(100);
    expect(PICKUP_PATIENCE_S).toBe(150);
  });
});
