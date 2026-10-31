import { describe, expect, it } from "vitest";
import { VEHICLES, VEHICLE_KINDS } from "../data/vehicles";
import { PERSON_HEIGHT, squashFor } from "./seating";

describe("squashFor", () => {
  it("leaves someone alone when their head is already under the roof", () => {
    expect(squashFor(0, 0.9, 2)).toBe(1);
  });

  it("shrinks a seated person until their head is just under the roof", () => {
    const s = squashFor(0.19, 0.9, 1.42);
    expect(s).toBeLessThan(1);
    expect(0.19 + PERSON_HEIGHT * 0.9 * s).toBeLessThanOrEqual(1.42 + 1e-9);
    expect(0.19 + PERSON_HEIGHT * 0.9 * s).toBeGreaterThan(1.3);
  });

  it("never squashes below a believable seated height", () => {
    expect(squashFor(0.19, 1.0, 0.5)).toBeGreaterThanOrEqual(0.6);
  });

  it("keeps every passenger of every vehicle under its roof", () => {
    for (const k of VEHICLE_KINDS) {
      const v = VEHICLES[k];
      for (const seat of v.riderSeats) {
        for (const scale of [0.72, 0.84, 0.95, 1.03]) {
          const feet = seat[1] - 0.78;
          const s = squashFor(feet, scale, v.headRoom);
          expect(feet + PERSON_HEIGHT * scale * s, `${k} seat ${seat.join(",")} scale ${scale}`).toBeLessThanOrEqual(v.headRoom + 1e-9);
        }
      }
    }
  });
});
