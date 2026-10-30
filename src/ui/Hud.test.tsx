// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ROUTE_V1 } from "@/game/data/route-v1";
import { makePassenger } from "@/game/logic/fares";
import { useGame } from "@/game/state/store";
import { Hud } from "./Hud";

beforeEach(() => {
  useGame.getState().startDay();
});
afterEach(cleanup);

describe("Hud", () => {
  it("shows net, seats and the clock", () => {
    const onboard = Array.from({ length: 12 }, (_, i) => makePassenger(`o${i}`, 0, 4, 100));
    useGame.setState({ net: -100, onboard, hour: 7.5 });
    render(<Hud />);
    expect(screen.getByText("Rs. -100")).toBeInTheDocument();
    expect(screen.getByText("12 / 40")).toBeInTheDocument();
    expect(screen.getByText("07:30")).toBeInTheDocument();
  });

  it("shows the goal", () => {
    render(<Hud />);
    expect(screen.getByText(/Goal Rs\. 800/)).toBeInTheDocument();
  });

  it("names the next stop ahead and the direction of travel", () => {
    useGame.setState({ busPosition: 100, direction: "forward" });
    render(<Hud />);
    expect(screen.getByText(ROUTE_V1[1].name)).toBeInTheDocument();
    expect(screen.getByText(/Aanawadi Depot → Nellimala Junction/)).toBeInTheDocument();
  });

  it("flips the direction label on the way back", () => {
    useGame.setState({ busPosition: 3000, direction: "backward" });
    render(<Hud />);
    expect(screen.getByText(/Nellimala Junction → Aanawadi Depot/)).toBeInTheDocument();
  });

  describe("controls", () => {
    it("puts the headlight switch on the left and toggles the lights", () => {
      render(<Hud />);
      const btn = screen.getByRole("button", { name: /headlights/i });
      expect(btn).toHaveAttribute("aria-pressed", "false");
      expect(btn.closest("[data-side]")).toHaveAttribute("data-side", "left");
      fireEvent.click(btn);
      expect(useGame.getState().headlights).toBe(true);
      expect(btn).toHaveAttribute("aria-pressed", "true");
    });

    it("puts the sound switch on the right and mutes everything", () => {
      useGame.setState({ muted: false });
      render(<Hud />);
      const btn = screen.getByRole("button", { name: /sound/i });
      expect(btn.closest("[data-side]")).toHaveAttribute("data-side", "right");
      expect(btn).toHaveAttribute("aria-pressed", "true");
      fireEvent.click(btn);
      expect(useGame.getState().muted).toBe(true);
      expect(btn).toHaveAttribute("aria-pressed", "false");
    });

    it("announces an accident and its fine", () => {
      render(<Hud />);
      expect(screen.queryByRole("alert")).toBeNull();
      act(() => useGame.getState().registerAccident());
      expect(screen.getByRole("alert")).toHaveTextContent(/accident.*300/i);
    });
  });
});
