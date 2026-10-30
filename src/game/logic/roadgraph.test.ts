import { describe, expect, it } from "vitest";
import { PLACES, type Place } from "../data/places-v1";
import { JUNCTIONS } from "../world";
import { buildGraph, nextStep, offRoute, route } from "./roadgraph";
import { localToWorld } from "./junction";
import { placeSpot } from "./places";
import { roadAngle } from "./road";

const graph = buildGraph(JUNCTIONS, PLACES);
const place = (id: string): Place => PLACES.find((p) => p.id === id)!;
const spot = (id: string) => placeSpot(place(id), JUNCTIONS);
// a vehicle at a place, facing the way a parked vehicle there faces
const at = (id: string) => {
  const s = spot(id);
  return { x: s.x, z: s.z, heading: s.heading };
};
const turns = (r: ReturnType<typeof route>) => r.steps.map((s) => s.turn);
const j = (id: string) => JUNCTIONS.find((x) => x.id === id)!;

describe("route along the main road", () => {
  it("is about as long as the road between the two places", () => {
    const r = route(graph, at("thennalpadi"), place("karimbanam"));
    const dx = Math.abs(place("karimbanam").at.kind === "main" ? (place("karimbanam").at as { x: number }).x - 250 : 0);
    expect(r.length).toBeGreaterThanOrEqual(dx);
    expect(r.length).toBeLessThan(dx * 1.05);
  });
  it("needs no turns, only the arrival", () => {
    const r = route(graph, { ...at("thennalpadi"), heading: roadAngle(250) }, place("karimbanam"));
    expect(turns(r)).toEqual(["arrive"]);
  });
  it("ends at the place and starts where the vehicle is", () => {
    const from = at("thennalpadi");
    const r = route(graph, from, place("karimbanam"));
    const first = r.points[0];
    const last = r.points[r.points.length - 1];
    expect(Math.hypot(first.x - from.x, first.z - from.z)).toBeLessThan(8);
    const s = spot("karimbanam");
    expect(Math.hypot(last.x - s.x, last.z - s.z)).toBeLessThan(2);
  });
  it("works the other way, going back down the road", () => {
    const fwd = route(graph, at("thennalpadi"), place("karimbanam"));
    const back = route(graph, at("karimbanam"), place("thennalpadi"));
    expect(back.length).toBeCloseTo(fwd.length, 0);
  });
});

describe("turns into and out of side roads", () => {
  it("turns left into a left-hand arm when driving forward", () => {
    // paddy is on the left arm of j700
    const r = route(graph, { ...at("mullakkunnu"), heading: roadAngle(550) }, place("paddy"));
    expect(turns(r)).toEqual(["left", "arrive"]);
    const turn = r.steps[0];
    expect(turn.at.x).toBeCloseTo(j("j700").x, -1);
  });
  it("turns right into a right-hand arm when driving forward", () => {
    const r = route(graph, { ...at("karimbanam"), heading: roadAngle(850) }, place("masjid"));
    expect(turns(r)).toEqual(["right", "arrive"]);
  });
  it("reverses the turns when driving the other way", () => {
    // coming back from the north end, the left arm of j700 is on the right
    const r = route(graph, { ...at("karimbanam"), heading: roadAngle(850) + Math.PI }, place("paddy"));
    expect(turns(r)).toEqual(["right", "arrive"]);
  });
  it("turns back onto the main road in the right direction when leaving an arm", () => {
    // from the left arm of j700, going on to Karimbanam (further along +x): facing the road, +x is on the left
    const r = route(graph, at("paddy"), place("karimbanam"));
    const t = turns(r);
    expect(t.filter((x) => x === "right" || x === "left")).toEqual(["left"]);
    expect(t[t.length - 1]).toBe("arrive");
  });
  it("goes from one arm to another through the main road", () => {
    // the Panchayat spot faces out along its arm, so the first move is a U-turn
    const r = route(graph, at("panchayat"), place("masjid"));
    expect(turns(r)).toEqual(["uturn", "left", "right", "arrive"]);
    expect(r.length).toBeGreaterThan(600);
  });
  it("crosses between the two arms of one junction", () => {
    const r = route(graph, at("hospital"), place("temple"));
    // out of one arm and straight across into the other: a short ride through the junction
    expect(r.length).toBeGreaterThan(130 + 90 - 5);
    expect(r.length).toBeLessThan(130 + 90 + 30);
  });
  it("drives along an arm to a place further out without turning", () => {
    const from = { ...at("church"), heading: placeSpot(place("church"), JUNCTIONS).heading };
    const r = route(graph, from, place("church"));
    expect(r.length).toBeLessThan(5);
    expect(turns(r)).toEqual(["arrive"]);
  });
});

describe("U-turns", () => {
  it("starts with a U-turn when the vehicle faces away from the route", () => {
    const r = route(graph, { ...at("thennalpadi"), heading: roadAngle(250) + Math.PI }, place("karimbanam"));
    expect(turns(r)[0]).toBe("uturn");
  });
  it("does not when it already faces the right way", () => {
    const r = route(graph, { ...at("thennalpadi"), heading: roadAngle(250) }, place("karimbanam"));
    expect(turns(r)).not.toContain("uturn");
  });
});

describe("the arrival", () => {
  it("says which side of the road the place is on", () => {
    const left = route(graph, { ...at("depot"), heading: roadAngle(0) }, place("thennalpadi"));
    const arrive = left.steps[left.steps.length - 1];
    expect(arrive.turn).toBe("arrive");
    expect(arrive.side).toBe(place("thennalpadi").at.kind === "main" && (place("thennalpadi").at as { side: string }).side);
  });
  it("puts the arrival at the end of the route", () => {
    const r = route(graph, at("depot"), place("karimbanam"));
    const arrive = r.steps[r.steps.length - 1];
    expect(arrive.distanceFromStart).toBeCloseTo(r.length, 0);
  });
});

describe("nextStep", () => {
  it("gives the next turn and how far away it is", () => {
    const r = route(graph, { ...at("mullakkunnu"), heading: roadAngle(550) }, place("paddy"));
    const turn = r.steps[0];
    const next = nextStep(r, { x: r.points[0].x, z: r.points[0].z })!;
    expect(next.step.turn).toBe("left");
    expect(next.distance).toBeCloseTo(turn.distanceFromStart, 0);
  });
  it("counts down as the vehicle moves along", () => {
    const r = route(graph, at("depot"), place("karimbanam"));
    const mid = r.points[Math.floor(r.points.length / 2)];
    const a = nextStep(r, r.points[0])!;
    const b = nextStep(r, mid)!;
    expect(b.distance).toBeLessThan(a.distance);
    expect(b.step.turn).toBe("arrive");
  });
  it("moves on to the arrival once the turn is behind", () => {
    const r = route(graph, { ...at("mullakkunnu"), heading: roadAngle(550) }, place("paddy"));
    const armPoint = localToWorld(j("j700"), -2.5, -60);
    expect(nextStep(r, armPoint)!.step.turn).toBe("arrive");
  });
});

describe("offRoute", () => {
  it("is false on the route and true well away from it", () => {
    const r = route(graph, at("depot"), place("karimbanam"));
    const p = r.points[Math.floor(r.points.length / 2)];
    expect(offRoute(r, p)).toBe(false);
    expect(offRoute(r, { x: p.x, z: p.z + 10 })).toBe(false);
    expect(offRoute(r, { x: p.x, z: p.z + 30 })).toBe(true);
  });
});
