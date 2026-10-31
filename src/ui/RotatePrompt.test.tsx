// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGame } from "@/game/state/store";
import { RotatePrompt } from "./RotatePrompt";

function screenSize(width: number, height: number, touch = true) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
  window.matchMedia = vi.fn((q: string) => ({ matches: touch && q.includes("coarse"), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
}
const turn = (w: number, h: number) =>
  act(() => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: w });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: h });
    window.dispatchEvent(new Event("resize"));
  });

beforeEach(() => {
  useGame.getState().startDay();
});
afterEach(cleanup);

describe("RotatePrompt", () => {
  it("asks a phone held upright to turn, in two languages, and pauses the game", () => {
    screenSize(390, 844);
    render(<RotatePrompt />);
    expect(screen.getByText(/rotate your phone/i)).toBeInTheDocument();
    expect(screen.getByText(/ഫോൺ/)).toBeInTheDocument();
    expect(useGame.getState().phase).toBe("paused");
  });

  it("goes away and resumes the game when the phone is turned sideways", () => {
    screenSize(390, 844);
    render(<RotatePrompt />);
    turn(844, 390);
    expect(screen.queryByText(/rotate your phone/i)).toBeNull();
    expect(useGame.getState().phase).toBe("running");
  });

  it("does not resume a game the player paused themselves", () => {
    screenSize(844, 390);
    useGame.getState().pause();
    render(<RotatePrompt />);
    turn(390, 844);
    turn(844, 390);
    expect(useGame.getState().phase).toBe("paused");
  });

  it("never shows on a desktop, however narrow the window", () => {
    screenSize(500, 900, false);
    render(<RotatePrompt />);
    expect(screen.queryByText(/rotate your phone/i)).toBeNull();
    expect(useGame.getState().phase).toBe("running");
  });

  it("offers full screen where the browser can, and a home-screen tip where it cannot", () => {
    screenSize(390, 844);
    document.documentElement.requestFullscreen = vi.fn(async () => {});
    Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: true });
    const first = render(<RotatePrompt />);
    expect(screen.getByRole("button", { name: /full screen/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /full screen/i }));
    expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
    first.unmount();
    Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: false });
    render(<RotatePrompt />);
    expect(screen.queryByRole("button", { name: /full screen/i })).toBeNull();
    expect(screen.getByText(/add to home screen/i)).toBeInTheDocument();
  });
});
