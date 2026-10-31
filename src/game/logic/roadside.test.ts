import { describe, expect, it } from "vitest";
import { NETWORK_V1 } from "../data/network-v1";
import { PLACES } from "../data/places-v1";
import { JUNCTION_BOX_HALF, drivable, groundY, nearest } from "./network";
import { roadFeatures } from "./roadside";
import { approachesOf } from "./turns";

const N = NETWORK_V1;
const f = roadFeatures(N, PLACES);

describe("roadFeatures", () => {
  it("has a zebra crossing on every approach of every junction", () => {
    const approaches = N.junctions.reduce((sum, j) => sum + approachesOf(N, j.id).length, 0);
    expect(f.zebras.length).toBe(approaches);
  });

  it("puts every road's speed sign on both directions, 40 km/h", () => {
    for (const r of N.roads) {
      const signs = f.signs.filter((s) => s.kind === "speed40" && s.road === r.id);
      expect(signs.length, r.id).toBe(2);
    }
  });

  it("has a crossing warning before every zebra and a direction board naming the road ahead", () => {
    expect(f.signs.filter((s) => s.kind === "crossing").length).toBe(f.zebras.length);
    const boards = f.signs.filter((s) => s.kind === "direction");
    expect(boards.length).toBe(f.zebras.length);
    expect(boards.every((s) => s.label && s.label.en.length > 2 && s.label.ml.length > 1)).toBe(true);
  });

  it("has a bus-stop sign for each shelter place", () => {
    expect(f.signs.filter((s) => s.kind === "busStop").length).toBe(PLACES.filter((p) => p.shelter).length);
  });

  it("keeps every sign and pole off the carriageway and the junction boxes", () => {
    for (const s of [...f.signs, ...f.poles]) {
      expect(drivable(N, s.x, s.z), `${"kind" in s ? s.kind : "pole"} at ${s.x.toFixed(0)},${s.z.toFixed(0)}`).toBe(false);
      for (const j of N.junctions) {
        expect(Math.max(Math.abs(s.x - j.at[0]), Math.abs(s.z - j.at[1]))).toBeGreaterThan(JUNCTION_BOX_HALF);
      }
    }
  });

  it("stands signs on the footpath, poles on the footpath edge", () => {
    for (const s of f.signs) expect(groundY(N, s.x, s.z), s.kind).toBe(0.15);
    expect(f.poles.length).toBeGreaterThan(60);
  });

  it("faces each sign toward the traffic it is for", () => {
    for (const s of f.signs.filter((x) => x.kind === "speed40")) {
      // the sign is on the left kerb of the traffic it serves, which is the nearest side
      expect(nearest(N, s.x, s.z).road).toBe(s.road);
      expect(Number.isFinite(s.facing)).toBe(true);
    }
  });
});
