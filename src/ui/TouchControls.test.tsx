// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useGame } from "@/game/state/store";
import { releaseTouch, touchInput } from "@/game/touchInput";
import { TouchControls } from "./TouchControls";

beforeEach(() => {
  releaseTouch();
  useGame.getState().startDay();
});
afterEach(() => {
  cleanup();
  releaseTouch();
});

describe("TouchControls", () => {
  it("holds a direction while the finger is down and lets go on release", () => {
    render(<TouchControls />);
    const left = screen.getByLabelText("Steer left");
    fireEvent.pointerDown(left, { pointerId: 1 });
    expect(touchInput.left).toBe(true);
    fireEvent.pointerUp(left, { pointerId: 1 });
    expect(touchInput.left).toBe(false);
  });

  it("lets two buttons be held at once", () => {
    render(<TouchControls />);
    fireEvent.pointerDown(screen.getByLabelText("Accelerate"), { pointerId: 1 });
    fireEvent.pointerDown(screen.getByLabelText("Steer right"), { pointerId: 2 });
    expect(touchInput.accel && touchInput.right).toBe(true);
  });

  it("lets go when the pointer is cancelled or the window loses focus", () => {
    render(<TouchControls />);
    const brake = screen.getByLabelText("Brake and reverse");
    fireEvent.pointerDown(brake, { pointerId: 1 });
    fireEvent.pointerCancel(brake, { pointerId: 1 });
    expect(touchInput.brake).toBe(false);
    fireEvent.pointerDown(screen.getByLabelText("Accelerate"), { pointerId: 1 });
    act(() => {
      window.dispatchEvent(new Event("blur"));
    });
    expect(touchInput.accel).toBe(false);
  });

  it("pauses the game from the pause button and lets go when not running", () => {
    render(<TouchControls />);
    fireEvent.pointerDown(screen.getByLabelText("Horn"), { pointerId: 1 });
    expect(touchInput.horn).toBe(true);
    fireEvent.click(screen.getByLabelText("Pause"));
    expect(useGame.getState().phase).toBe("paused");
    expect(touchInput.horn).toBe(false);
  });

  it("is hidden from 1024 px up", () => {
    render(<TouchControls />);
    expect(screen.getByTestId("touch-controls").className).toContain("lg:hidden");
  });
});
