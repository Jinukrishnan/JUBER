// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PLACES } from "@/game/data/places-v1";
import type { Request } from "@/game/logic/requests";
import { acceptRequest, arrivePickup, IDLE_RIDE } from "@/game/logic/ride";
import { useGame } from "@/game/state/store";
import { ConversationCard } from "./ConversationCard";

const req: Request = { id: "r1", customer: "Priya", pickup: PLACES[1], drop: PLACES[3], group: 2, fare: 100, distance: 600, expiresIn: 45 };

beforeEach(() => {
  useGame.getState().startDay("auto");
});
afterEach(cleanup);

describe("ConversationCard", () => {
  it("is not shown until the vehicle is at the pickup", () => {
    useGame.setState({ ride: acceptRequest(IDLE_RIDE, req) });
    render(<ConversationCard />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("shows who it is, where they want to go, the group and the fare", () => {
    useGame.setState({ ride: arrivePickup(acceptRequest(IDLE_RIDE, req)) });
    render(<ConversationCard />);
    const card = screen.getByRole("dialog");
    expect(card).toHaveTextContent("Priya");
    expect(card).toHaveTextContent(PLACES[3].name);
    expect(card).toHaveTextContent(PLACES[3].ml);
    expect(card).toHaveTextContent("2 passengers");
    expect(card).toHaveTextContent("Rs. 100");
  });
  it("starts boarding when Accept ride is clicked", () => {
    useGame.setState({ ride: arrivePickup(acceptRequest(IDLE_RIDE, req)) });
    render(<ConversationCard />);
    fireEvent.click(screen.getByRole("button", { name: /accept ride/i }));
    expect(useGame.getState().ride.phase).toBe("boarding");
  });
  it("starts boarding on Enter", () => {
    useGame.setState({ ride: arrivePickup(acceptRequest(IDLE_RIDE, req)) });
    render(<ConversationCard />);
    act(() => {
      fireEvent.keyDown(window, { code: "Enter" });
    });
    expect(useGame.getState().ride.phase).toBe("boarding");
  });
});
