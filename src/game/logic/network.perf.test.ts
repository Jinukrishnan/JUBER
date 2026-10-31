import { describe, expect, it } from "vitest";
import { NETWORK_V2 } from "../data/network-v2";
import { builtRoads, clampToDrivable, drivable, groundY, nearest } from "./network";

// One second of game: 80 vehicles at 60 frames a second ask about four road queries each.
const QUERIES = 20000;

describe("road query cost on the big network", () => {
  it("answers a second of game's queries well inside a second", () => {
    let seed = 12345;
    const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    const pts = Array.from({ length: QUERIES / 4 }, () => ({ x: -200 + rnd() * 2800, z: -300 + rnd() * 1300 }));
    builtRoads(NETWORK_V2); // built once, like the game does
    const t0 = performance.now();
    let sink = 0;
    for (const p of pts) {
      sink += drivable(NETWORK_V2, p.x, p.z) ? 1 : 0;
      sink += nearest(NETWORK_V2, p.x, p.z).distance;
      sink += groundY(NETWORK_V2, p.x, p.z);
      sink += clampToDrivable(NETWORK_V2, p.x, p.z).x;
    }
    const ms = performance.now() - t0;
    console.log(`road queries: ${QUERIES} in ${ms.toFixed(0)} ms (${builtRoads(NETWORK_V2).reduce((n, r) => n + r.pieces.length, 0)} pieces)`);
    expect(Number.isFinite(sink)).toBe(true);
    expect(ms).toBeLessThan(400);
  }, 60000);
});
