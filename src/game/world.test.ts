import { describe, expect, it } from "vitest";
import { NETWORK_V2 } from "./data/network-v2";
import { PLACES_V2 } from "./data/places-v2";
import { depotPose } from "./busPose";
import { drivable } from "./logic/network";
import { ACTIVE_PLACES, NETWORK, buildScenery } from "./world";

describe("the world the game uses", () => {
  it("is the whole big network, with nothing dropped", () => {
    expect(NETWORK.roads).toHaveLength(NETWORK_V2.roads.length);
    expect(NETWORK.junctions).toHaveLength(NETWORK_V2.junctions.length);
    expect(ACTIVE_PLACES).toHaveLength(PLACES_V2.length);
  });

  it("starts the day at the depot, on the road", () => {
    const d = depotPose();
    expect(drivable(NETWORK, d.x, d.z)).toBe(true);
    expect(d.x).toBeLessThan(800);
  });

  it("lays out the scenery quickly enough to start", () => {
    const t0 = performance.now();
    const scenery = buildScenery();
    const ms = performance.now() - t0;
    console.log(`buildScenery: ${ms.toFixed(0)} ms`);
    expect(scenery).toBeTruthy();
    expect(ms).toBeLessThan(3000);
  }, 60000);
});
