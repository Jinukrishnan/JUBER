import { describe, expect, it } from "vitest";
import { NETWORK_V1 } from "../data/network-v1";
import { PLACES } from "../data/places-v1";
import { drivable } from "./network";
import { placeSpot, type Place } from "./places";
import { buildGraph, nextStep, offRoute, route } from "./roadgraph";
import { isWrongTurn } from "./turns";

const N = NETWORK_V1;
const g = buildGraph(N, PLACES);
const place = (id: string): Place => PLACES.find((p) => p.id === id)!;
const from = (id: string) => placeSpot(N, place(id));

describe("routes on the ring", () => {
  it("goes straight on through the junction along the top edge", () => {
    const r = route(g, from("depot"), place("mullakkunnu"));
    expect(r.length).toBeGreaterThan(415);
    expect(r.length).toBeLessThan(425);
    expect(r.steps.map((s) => s.turn)).toEqual(["straight", "arrive"]);
    expect(r.steps[0].at).toEqual({ x: 400, z: 0 });
  });

  it("a place just behind is reached by a U-turn first, the short way", () => {
    const r = route(g, from("mullakkunnu"), place("depot"));
    expect(r.steps[0].turn).toBe("uturn");
    expect(r.length).toBeLessThan(440);
  });

  it("with no heading known there is no opening U-turn", () => {
    const p = from("mullakkunnu");
    const r = route(g, { x: p.x, z: p.z }, place("depot"));
    expect(r.steps[0].turn).not.toBe("uturn");
    expect(r.length).toBeLessThan(440);
  });

  it("goes round the loop the other way when that is shorter", () => {
    const a = route(g, from("karimbanam"), place("chembolimukku"));
    const b = route(g, from("chembolimukku"), place("karimbanam"));
    for (const r of [a, b]) {
      expect(r.length).toBeLessThan(1300);
      expect(r.steps[r.steps.length - 1].turn).toBe("arrive");
    }
  });

  it("ends at the kerb spot of the place, on the side of the road it is on", () => {
    const r = route(g, from("depot"), place("thennalpadi"));
    const spot = placeSpot(N, place("thennalpadi"));
    expect(r.points[r.points.length - 1]).toEqual({ x: spot.x, z: spot.z });
    const arrive = r.steps[r.steps.length - 1];
    expect(arrive.side).toBe("right"); // heading east, the place is on the south kerb
    expect(route(g, from("depot"), place("mullakkunnu")).steps.slice(-1)[0].side).toBe("left");
  });
});

describe("routes into the cross roads", () => {
  it("turns off the ring at the right junction", () => {
    // heading west along the bottom edge at x=600, Station Road is a right turn at the south junction
    const r = route(g, { x: 600, z: 496.3, heading: Math.PI }, place("temple"));
    expect(r.moves[0]).toEqual({ junction: "south", approachId: "ring:1", turn: "right" });
    expect(r.steps[0]).toMatchObject({ turn: "right", at: { x: 400, z: 500 } });
  });

  it("detours by a longer legal way when the direct turn is forbidden", () => {
    // heading north on Station Road below the centre, the masjid is east of the centre:
    // a right turn at the centre is not allowed from the south
    const r = route(g, { x: 396.3, z: 420, heading: -Math.PI / 2 }, place("masjid"));
    expect(r.moves.some((m) => m.junction === "centre" && m.approachId === "ns:-1" && m.turn === "right")).toBe(false);
    expect(r.length).toBeGreaterThan(900);
    expect(r.steps[r.steps.length - 1].turn).toBe("arrive");
  });

  it("opens with a U-turn when the vehicle faces away from the route", () => {
    const r = route(g, { x: 200, z: 250 - 3.7, heading: Math.PI }, place("masjid"));
    expect(r.steps[0].turn).toBe("uturn");
    expect(r.length).toBeLessThan(500);
  });
});

describe("every route is legal", () => {
  it("never makes a forbidden turn, over every ordered pair of places", () => {
    let n = 0;
    for (const a of PLACES) {
      for (const b of PLACES) {
        if (a === b) continue;
        const r = route(g, from(a.id), b);
        expect(Number.isFinite(r.length)).toBe(true);
        expect(r.steps[r.steps.length - 1].turn).toBe("arrive");
        for (const m of r.moves) {
          expect(isWrongTurn(N, m.junction, m.approachId, m.turn), `${a.id}->${b.id} at ${m.junction} ${m.approachId} ${m.turn}`).toBe(false);
        }
        n++;
      }
    }
    expect(n).toBe(PLACES.length * (PLACES.length - 1));
  });

  it("keeps the route points on the road", () => {
    const r = route(g, from("depot"), place("temple"));
    for (const p of r.points.slice(1, -1)) expect(drivable(N, p.x, p.z)).toBe(true);
  });
});

describe("nextStep and offRoute", () => {
  const r = route(g, from("depot"), place("mullakkunnu"));

  it("gives the next turn with its distance", () => {
    const s = nextStep(r, { x: 300, z: -3.7 })!;
    expect(s.step.turn).toBe("straight");
    expect(s.distance).toBeGreaterThan(80);
    expect(s.distance).toBeLessThan(100);
  });

  it("moves on to the arrival after the junction", () => {
    expect(nextStep(r, { x: 450, z: -3.7 })!.step.turn).toBe("arrive");
  });

  it("keeps the opening U-turn due until the vehicle has turned round", () => {
    const back = route(g, from("mullakkunnu"), place("depot"));
    const p = from("mullakkunnu");
    expect(nextStep(back, p, p.heading)!.step.turn).toBe("uturn");
    expect(nextStep(back, { x: p.x - 30, z: p.z + 7 }, Math.PI)!.step.turn).not.toBe("uturn");
  });

  it("says when the vehicle has left the road of the route", () => {
    expect(offRoute(r, { x: 300, z: -3.7 })).toBe(false);
    expect(offRoute(r, { x: 300, z: 200 })).toBe(true);
  });
});
