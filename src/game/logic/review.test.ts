import { describe, expect, it } from "vitest";
import { SPEED_LIMIT_MS, TIP_FIVE, TIP_FOUR, isSpeeding, reviewRide, type RideStats } from "./review";

const clean: RideStats = { accidents: 0, redLights: 0, wrongTurns: 0, harsh: 0, speedingS: 0, elapsedS: 60, targetS: 70 };
const MALAYALAM = /[ഀ-ൿ]/;

describe("the speed limit", () => {
  it("is the 40 km/h on the signs", () => {
    expect(SPEED_LIMIT_MS * 3.6).toBeCloseTo(40, 6);
    expect(isSpeeding(11)).toBe(false);
    expect(isSpeeding(11.3)).toBe(true);
    expect(isSpeeding(-12)).toBe(true); // reversing fast counts too
  });
});

describe("reviewRide", () => {
  it("gives five stars, thanks and a tip for a polite ride by the rules", () => {
    const r = reviewRide(clean, 1);
    expect(r.stars).toBe(5);
    expect(r.tip).toBe(TIP_FIVE);
    expect(r.chips).toEqual([]);
    expect(MALAYALAM.test(r.ml)).toBe(true);
    expect(r.en.length).toBeGreaterThan(5);
    expect(r.worst).toBe("good");
  });

  it("takes two stars off for an accident, and the customer is angry about it", () => {
    const r = reviewRide({ ...clean, accidents: 1 }, 1);
    expect(r.stars).toBe(3);
    expect(r.worst).toBe("accident");
    expect(r.chips).toContain("Accident ×1");
    expect(r.tip).toBe(0);
  });

  it("gives the lowest rating for an accident and speeding together", () => {
    const r = reviewRide({ ...clean, accidents: 2, speedingS: 30, redLights: 1 }, 1);
    expect(r.stars).toBe(1);
    expect(r.tip).toBe(0);
  });

  it("is angry about speeding, more for longer", () => {
    const brief = reviewRide({ ...clean, speedingS: 2 }, 1);
    const some = reviewRide({ ...clean, speedingS: 10 }, 1);
    const lots = reviewRide({ ...clean, speedingS: 30 }, 1);
    expect(brief.stars).toBe(5);
    expect(some.stars).toBe(4);
    expect(lots.stars).toBeLessThanOrEqual(3);
    expect(lots.worst).toBe("speeding");
    expect(lots.chips.join(" ")).toMatch(/Over the limit 30 s/);
  });

  it("takes a star for each red light and wrong turn", () => {
    expect(reviewRide({ ...clean, redLights: 1 }, 1).stars).toBe(4);
    expect(reviewRide({ ...clean, wrongTurns: 1 }, 1).stars).toBe(4);
    expect(reviewRide({ ...clean, redLights: 1, wrongTurns: 1 }, 1).stars).toBe(3);
    expect(reviewRide({ ...clean, redLights: 1 }, 1).worst).toBe("signal");
    expect(reviewRide({ ...clean, wrongTurns: 1 }, 1).worst).toBe("turn");
  });

  it("notices many scrapes and a very slow ride, a star each", () => {
    expect(reviewRide({ ...clean, harsh: 2 }, 1).stars).toBe(5);
    expect(reviewRide({ ...clean, harsh: 3 }, 1).stars).toBe(4);
    expect(reviewRide({ ...clean, elapsedS: 200, targetS: 70 }, 1).stars).toBe(4);
    expect(reviewRide({ ...clean, elapsedS: 200, targetS: 70 }, 1).chips).toContain("Slow ride");
  });

  it("tips four stars a little and anything less nothing", () => {
    expect(reviewRide({ ...clean, redLights: 1 }, 1).tip).toBe(TIP_FOUR);
    expect(reviewRide({ ...clean, redLights: 2 }, 1).tip).toBe(0);
  });

  it("never goes below one star", () => {
    expect(reviewRide({ ...clean, accidents: 9, redLights: 9, wrongTurns: 9, speedingS: 99, harsh: 9, elapsedS: 999 }, 1).stars).toBe(1);
  });

  it("always has Malayalam and English, for every outcome", () => {
    const cases: Partial<RideStats>[] = [{}, { accidents: 1 }, { speedingS: 20 }, { redLights: 1 }, { wrongTurns: 1 }, { harsh: 4 }, { elapsedS: 300 }, { redLights: 3, accidents: 1 }];
    for (const c of cases) {
      for (let seed = 0; seed < 8; seed++) {
        const r = reviewRide({ ...clean, ...c }, seed);
        expect(MALAYALAM.test(r.ml), JSON.stringify(c)).toBe(true);
        expect(r.en.length).toBeGreaterThan(3);
        expect(r.stars).toBeGreaterThanOrEqual(1);
        expect(r.stars).toBeLessThanOrEqual(5);
      }
    }
  });

  it("is the same for the same seed and varies the words across seeds", () => {
    expect(reviewRide(clean, 7)).toEqual(reviewRide(clean, 7));
    const seen = new Set(Array.from({ length: 30 }, (_, i) => reviewRide(clean, i).ml));
    expect(seen.size).toBeGreaterThan(1);
  });

  it("is polite at five stars and rude at one", () => {
    const polite = reviewRide(clean, 2);
    const rude = reviewRide({ ...clean, accidents: 2, speedingS: 40 }, 2);
    expect(polite.mood).toBe("happy");
    expect(rude.mood).toBe("furious");
  });
});
