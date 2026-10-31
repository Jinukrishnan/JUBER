import { describe, expect, it } from "vitest";
import { NETWORK_V1, type Network } from "../data/network-v1";
import { PLACES } from "../data/places-v1";
import { grassParts } from "../plants";
import { FEATURES, NETWORK, buildScenery } from "../world";
import { footprintOf, layoutScenery } from "./layout";
import { JUNCTION_BOX_HALF, drivable, groundY } from "./network";
import { roadFeatures } from "./roadside";

// The rule behind the owner's "grass in the middle of the road" report: nothing
// grows, stands or is built on the road, a footpath, a junction or a crossing.
const TREES = ["coconut", "mango", "gulmohar", "banana", "jackfruit"];

function check(n: Network, layout: ReturnType<typeof layoutScenery>, features: ReturnType<typeof roadFeatures>) {
  const bad = (x: number, z: number) => drivable(n, x, z) || groundY(n, x, z) !== 0;
  const offenders: string[] = [];
  const { tufts, bushes } = grassParts(layout.grass, "full", layout.isGroundFree);
  for (const it of [...tufts, ...bushes]) if (bad(it.x, it.z)) offenders.push(`grass ${it.x.toFixed(1)},${it.z.toFixed(1)}`);
  for (const p of layout.placements) if (bad(p.x, p.z)) offenders.push(`${p.kind} ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
  for (const p of features.poles) if (drivable(n, p.x, p.z)) offenders.push(`pole ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
  return offenders;
}

describe("no plant stands on the road", () => {
  const layout = buildScenery();

  it("has a grass layer and trees to test", () => {
    expect(layout.grass.length).toBeGreaterThan(1000);
    expect(layout.placements.filter((p) => TREES.includes(p.kind)).length).toBeGreaterThan(200);
  });

  it("nothing is on tarmac, a footpath or a junction, anywhere on the map", () => {
    expect(check(NETWORK, layout, FEATURES).slice(0, 10)).toEqual([]);
  });

  it("the same holds for a moved junction", () => {
    const moved: Network = {
      ...NETWORK_V1,
      roads: NETWORK_V1.roads.map((r) => (r.id === "ns" ? { ...r, points: [[500, 0], [500, 500]] as [number, number][] } : r)),
      junctions: NETWORK_V1.junctions.map((j) => {
        if (j.id === "north" || j.id === "south") return { ...j, at: [500, j.at[1]] as [number, number] };
        if (j.id === "centre") return { ...j, at: [500, 250] as [number, number] };
        return j;
      }),
    };
    const f = roadFeatures(moved, PLACES);
    const l = layoutScenery(7, moved, PLACES, f);
    expect(check(moved, l, f).slice(0, 10)).toEqual([]);
  });

  it("no pole or sign stands in a junction box or a zebra crossing", () => {
    for (const s of [...FEATURES.signs, ...FEATURES.poles]) {
      for (const j of NETWORK.junctions) {
        expect(Math.max(Math.abs(s.x - j.at[0]), Math.abs(s.z - j.at[1]))).toBeGreaterThan(JUNCTION_BOX_HALF);
      }
    }
    for (const z of FEATURES.zebras) {
      for (const s of FEATURES.signs) expect(Math.hypot(s.x - z.x, s.z - z.z)).toBeGreaterThan(2.5);
    }
  });


  it("no placement's whole footprint touches tarmac or a junction: every corner of every building and wall, the rim of every tree", () => {
    const offenders: string[] = [];
    for (const p of layout.placements) {
      const f = footprintOf(p);
      const pts: [number, number][] = [];
      if (f.kind === "circle") {
        for (const a of [0, 1, 2, 3, 4, 5, 6, 7]) pts.push([f.x + Math.cos((a * Math.PI) / 4) * f.r, f.z + Math.sin((a * Math.PI) / 4) * f.r]);
      } else {
        const hw = f.w / 2;
        const hd = f.d / 2;
        for (const [u, v] of [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]]) {
          pts.push([f.x + u * Math.cos(f.heading) - v * Math.sin(f.heading), f.z + u * Math.sin(f.heading) + v * Math.cos(f.heading)]);
        }
      }
      for (const [x, z] of pts) if (drivable(NETWORK, x, z)) offenders.push(`${p.kind} at ${x.toFixed(1)},${z.toFixed(1)}`);
    }
    expect(offenders.slice(0, 10)).toEqual([]);
  });
});
