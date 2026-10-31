import { describe, expect, it } from "vitest";
import { NETWORK_V1 } from "./data/network-v1";
import { FOOTPATH_WIDTH, JUNCTION_BOX_HALF, builtRoads, nearestOnRoad } from "./logic/network";
import { roadParts } from "./roadParts";

const N = NETWORK_V1;
const parts = roadParts(N);

const mid = (a: { x: number; z: number }, b: { x: number; z: number }) => ({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 });

describe("roadParts", () => {
  it("has an asphalt strip for every road", () => {
    expect(parts.asphalt.map((s) => s.road).sort()).toEqual(["ew", "ns", "ring"]);
  });

  it("closes the ring without a gap", () => {
    const ring = parts.asphalt.find((s) => s.road === "ring")!;
    const n = ring.a.length;
    expect(Math.hypot(ring.a[0].x - ring.a[n - 1].x, ring.a[0].z - ring.a[n - 1].z)).toBeLessThan(1e-6);
    expect(Math.hypot(ring.b[0].x - ring.b[n - 1].x, ring.b[0].z - ring.b[n - 1].z)).toBeLessThan(1e-6);
  });

  it("samples finely enough on a corner: no step longer than 4 m", () => {
    const ring = parts.asphalt.find((s) => s.road === "ring")!;
    for (let i = 1; i < ring.a.length; i++) {
      expect(Math.hypot(ring.a[i].x - ring.a[i - 1].x, ring.a[i].z - ring.a[i - 1].z)).toBeLessThan(4.6);
    }
  });

  it("keeps every footpath out of every other road's carriageway", () => {
    const roads = builtRoads(N);
    for (const strip of parts.footpaths) {
      for (let i = 0; i < strip.a.length; i++) {
        const m = mid(strip.a[i], strip.b[i]);
        for (const r of roads) {
          if (r.road.id === strip.road) continue;
          expect(nearestOnRoad(r, m.x, m.z).distance, `${strip.road} footpath at ${m.x.toFixed(0)},${m.z.toFixed(0)} vs ${r.road.id}`).toBeGreaterThan(
            r.road.halfWidth - 1e-6,
          );
        }
      }
    }
  });

  it("cuts the ring's footpath where Station Road joins, only on the south side at the north T", () => {
    const ring = parts.footpaths.filter((s) => s.road === "ring");
    const at = (x: number, z: number) =>
      ring.some((s) => s.a.some((p, i) => Math.abs(mid(p, s.b[i]).x - x) < 1.6 && Math.abs(mid(p, s.b[i]).z - z) < 1));
    expect(at(400, 7.8)).toBe(false); // south side, where the stem leaves
    expect(at(400, -7.8)).toBe(true); // north side, unbroken
  });

  it("starts the stem's footpath beyond the ring's footpath", () => {
    const ns = parts.footpaths.filter((s) => s.road === "ns");
    const minZ = Math.min(...ns.flatMap((s) => s.a.map((p, i) => mid(p, s.b[i]).z)));
    expect(minZ).toBeGreaterThanOrEqual(6 + FOOTPATH_WIDTH - 1e-6);
  });

  it("leaves no kerb across a junction opening", () => {
    const wallsNear = parts.kerbs.filter((w) => w.pts.some((p) => Math.abs(p.x - 400) < 5 && Math.abs(p.z - 250) < JUNCTION_BOX_HALF - 1));
    expect(wallsNear).toEqual([]);
  });

  it("stops the centre dashes 8 m before a junction box", () => {
    for (const d of parts.dashes) {
      for (const j of N.junctions) {
        const gap = Math.max(Math.abs(d.x - j.at[0]), Math.abs(d.z - j.at[1]));
        expect(gap).toBeGreaterThanOrEqual(JUNCTION_BOX_HALF + 8 - 1.6);
      }
    }
    expect(parts.dashes.length).toBeGreaterThan(100);
  });

  it("paves a mouth where a road opens in the footpath, one per opening side", () => {
    // north T: one opening (south side of the ring); centre four-way: two (both sides of Temple Road)
    const near = (cx: number, cz: number) => parts.mouths.filter((m) => Math.abs(m.x - cx) < 1 && Math.abs(m.z - cz) < 12).length;
    expect(near(400, 0)).toBe(1);
    expect(near(400, 250)).toBe(2);
  });
});
