// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PLACES } from "@/game/data/places-v1";
import { IDLE_RIDE } from "@/game/logic/ride";
import type { Request } from "@/game/logic/requests";
import { useGame } from "@/game/state/store";
import { RequestBoard } from "./RequestBoard";

const req = (n: number, group: 1 | 2 | 3 = 1): Request => ({
  id: `r${n}`,
  customer: `Cust${n}`,
  pickup: PLACES[n],
  drop: PLACES[n + 1],
  group,
  fare: 40 + n,
  distance: 300 + n,
  expiresIn: 30,
});

beforeEach(() => {
  useGame.getState().startDay("car");
  useGame.setState({ ride: IDLE_RIDE, openRequests: [req(1), req(2, 2), req(3, 3)] });
});
afterEach(cleanup);

describe("RequestBoard", () => {
  it("shows each open request with who, where, how big a group and the fare", () => {
    render(<RequestBoard />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    const second = screen.getAllByRole("listitem")[1];
    expect(within(second).getByText(/Cust2/)).toBeInTheDocument();
    expect(within(second).getByText(PLACES[2].name)).toBeInTheDocument();
    expect(within(second).getByText(PLACES[3].name)).toBeInTheDocument();
    expect(within(second).getByText("2 passengers")).toBeInTheDocument();
    expect(within(second).getByText("Rs. 42")).toBeInTheDocument();
  });
  it("accepts the request whose button is clicked", () => {
    render(<RequestBoard />);
    fireEvent.click(within(screen.getAllByRole("listitem")[1]).getByRole("button", { name: /accept/i }));
    expect(useGame.getState().ride.request?.id).toBe("r2");
    expect(useGame.getState().ride.phase).toBe("toPickup");
  });
  it("accepts by number key", () => {
    render(<RequestBoard />);
    act(() => {
      fireEvent.keyDown(window, { code: "Digit3" });
    });
    expect(useGame.getState().ride.request?.id).toBe("r3");
  });
  it("skips a request", () => {
    render(<RequestBoard />);
    fireEvent.click(within(screen.getAllByRole("listitem")[0]).getByRole("button", { name: /skip/i }));
    expect(useGame.getState().openRequests.map((r) => r.id)).toEqual(["r2", "r3"]);
  });
  it("skips the first request with X", () => {
    render(<RequestBoard />);
    act(() => {
      fireEvent.keyDown(window, { code: "KeyX" });
    });
    expect(useGame.getState().openRequests.map((r) => r.id)).toEqual(["r2", "r3"]);
  });
  it("shows nothing while a ride is booked", () => {
    useGame.getState().accept("r1");
    render(<RequestBoard />);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
  it("says so when there are no requests", () => {
    useGame.setState({ openRequests: [] });
    render(<RequestBoard />);
    expect(screen.getByText(/waiting for a request/i)).toBeInTheDocument();
  });
  it("says 1 passenger, not 1 passengers", () => {
    render(<RequestBoard />);
    expect(screen.getByText("1 passenger")).toBeInTheDocument();
  });
});
