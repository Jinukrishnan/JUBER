// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { busPose } from "@/game/busPose";
import { PLACES } from "@/game/data/places-v1";
import type { Request } from "@/game/logic/requests";
import { acceptRequest, acceptRide, arriveDrop, arrivePickup, finishBoarding, IDLE_RIDE } from "@/game/logic/ride";
import { RIDE_WORLD } from "@/game/rideWorld";
import { useGame } from "@/game/state/store";
import { RideStrip } from "./RideStrip";

const req: Request = { id: "r1", customer: "Priya", pickup: PLACES[1], drop: PLACES[3], group: 2, fare: 100, distance: 600, expiresIn: 45 };

beforeEach(() => {
  vi.useFakeTimers();
  useGame.getState().startDay("auto");
  const p = RIDE_WORLD.spot(req.pickup);
  busPose.x = p.x - 120;
  busPose.z = p.z;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const show = (ride: typeof IDLE_RIDE) => {
  useGame.setState({ ride });
  render(<RideStrip />);
  act(() => {
    vi.advanceTimersByTime(300);
  });
};

describe("RideStrip", () => {
  it("shows nothing when no ride is booked", () => {
    show(IDLE_RIDE);
    expect(screen.queryByTestId("ride-strip")).toBeNull();
  });
  it("shows who to pick up, where, and how far", () => {
    show(acceptRequest(IDLE_RIDE, req));
    const strip = screen.getByTestId("ride-strip");
    expect(strip).toHaveTextContent("Pickup");
    expect(strip).toHaveTextContent("Priya");
    expect(strip).toHaveTextContent(PLACES[1].name);
    expect(strip).toHaveTextContent("120 m");
  });
  it("says the customer is waiting once there", () => {
    show(arrivePickup(acceptRequest(IDLE_RIDE, req)));
    expect(screen.getByTestId("ride-strip")).toHaveTextContent(/waiting/i);
  });
  it("says they are getting in while boarding", () => {
    show(acceptRide(arrivePickup(acceptRequest(IDLE_RIDE, req))));
    expect(screen.getByTestId("ride-strip")).toHaveTextContent(/getting in/i);
  });
  it("shows the drop place and its distance while riding", () => {
    const d = RIDE_WORLD.spot(req.drop);
    busPose.x = d.x - 250;
    busPose.z = d.z;
    show(finishBoarding(acceptRide(arrivePickup(acceptRequest(IDLE_RIDE, req)))));
    const strip = screen.getByTestId("ride-strip");
    expect(strip).toHaveTextContent("Drop");
    expect(strip).toHaveTextContent(PLACES[3].name);
    expect(strip).toHaveTextContent("250 m");
  });
  it("says they are getting out at the drop", () => {
    show(arriveDrop(finishBoarding(acceptRide(arrivePickup(acceptRequest(IDLE_RIDE, req))))));
    expect(screen.getByTestId("ride-strip")).toHaveTextContent(/getting out/i);
  });
});

import { GRAPH } from "@/game/rideWorld";
import { route as planRoute } from "@/game/logic/roadgraph";
import { roadAngle } from "@/game/logic/road";

describe("RideStrip directions", () => {
  it("tells the driver the next turn or the arrival", () => {
    busPose.heading = roadAngle(busPose.x);
    const ride = acceptRequest(IDLE_RIDE, req);
    useGame.setState({ ride, route: planRoute(GRAPH, { x: busPose.x, z: busPose.z, heading: busPose.heading }, req.pickup) });
    render(<RideStrip />);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByTestId("ride-directions")).toHaveTextContent(/Thennalpadi.* in 1\d\d m/);
  });
  it("shows no directions without a route", () => {
    useGame.setState({ ride: acceptRequest(IDLE_RIDE, req), route: null });
    render(<RideStrip />);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByTestId("ride-directions")).toBeNull();
  });
});

describe("RideStrip details", () => {
  it("does not show the last target's distance right after the target changes", () => {
    busPose.x = RIDE_WORLD.spot(req.pickup).x - 120;
    show(acceptRequest(IDLE_RIDE, req));
    expect(screen.getByTestId("ride-strip")).toHaveTextContent("120 m");
    act(() => {
      useGame.setState({ ride: arrivePickup(acceptRequest(IDLE_RIDE, req)) });
      useGame.setState({ ride: finishBoarding(acceptRide(arrivePickup(acceptRequest(IDLE_RIDE, req)))) });
    });
    // the drop is far away; until the strip has measured it, it must not claim 120 m
    expect(screen.getByTestId("ride-strip")).not.toHaveTextContent("120 m");
  });
  it("warns when the customer is about to give up waiting", () => {
    useGame.setState({ pickupLeft: 20 });
    show(acceptRequest(IDLE_RIDE, req));
    expect(screen.getByTestId("ride-strip")).toHaveTextContent(/leaves in 20 s/i);
  });
  it("says nothing about waiting while there is plenty of time", () => {
    useGame.setState({ pickupLeft: 120 });
    show(acceptRequest(IDLE_RIDE, req));
    expect(screen.getByTestId("ride-strip")).not.toHaveTextContent(/leaves in/i);
  });
});
