// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useGame } from "@/game/state/store";
import { Hud } from "./Hud";

beforeEach(() => {
  useGame.getState().startDay();
});
afterEach(cleanup);

describe("Hud", () => {
  it("shows net, the vehicle and the clock", () => {
    useGame.setState({ net: -100, hour: 7.5 });
    render(<Hud />);
    expect(screen.getByText("Rs. -100")).toBeInTheDocument();
    expect(screen.getByText("Auto-rickshaw")).toBeInTheDocument();
    expect(screen.getByText("0 / 2")).toBeInTheDocument();
    expect(screen.getByText("07:30")).toBeInTheDocument();
  });

  it("shows the goal of the chosen vehicle", () => {
    useGame.getState().startDay("bike");
    render(<Hud />);
    expect(screen.getByText(/Goal Rs. 600/)).toBeInTheDocument();
    expect(screen.getByText("0 / 1")).toBeInTheDocument();
  });

  it("shows three passenger seats for the car", () => {
    useGame.getState().startDay("car");
    render(<Hud />);
    expect(screen.getByText("0 / 3")).toBeInTheDocument();
    expect(screen.getByText(/Goal Rs. 1300/)).toBeInTheDocument();
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
