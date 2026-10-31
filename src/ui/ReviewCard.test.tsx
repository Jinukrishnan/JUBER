// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reviewRide } from "@/game/logic/review";
import { useGame } from "@/game/state/store";
import { ReviewCard } from "./ReviewCard";

const show = (stats: Partial<Parameters<typeof reviewRide>[0]>) => {
  const review = reviewRide({ accidents: 0, redLights: 0, wrongTurns: 0, harsh: 0, speedingS: 0, elapsedS: 50, targetS: 60, ...stats }, 3);
  act(() => useGame.setState({ lastReview: { id: 1, name: "Lakshmi", group: 2, review } }));
  return review;
};

beforeEach(() => {
  vi.useFakeTimers();
  useGame.getState().startDay();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("ReviewCard", () => {
  it("shows nothing until a ride has been reviewed", () => {
    const { container } = render(<ReviewCard />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the customer, five stars, their Malayalam and English words and the tip for a good ride", () => {
    render(<ReviewCard />);
    const r = show({});
    expect(screen.getByText("Lakshmi")).toBeInTheDocument();
    expect(screen.getByLabelText("5 stars out of 5")).toBeInTheDocument();
    expect(screen.getByText(r.ml)).toBeInTheDocument();
    expect(screen.getByText(r.en)).toBeInTheDocument();
    expect(screen.getByText(/Tip Rs. 20/)).toBeInTheDocument();
  });

  it("lists what went wrong, with fewer stars and no tip", () => {
    render(<ReviewCard />);
    show({ accidents: 1, speedingS: 25 });
    expect(screen.getByLabelText("1 star out of 5")).toBeInTheDocument();
    expect(screen.getByText("Accident ×1")).toBeInTheDocument();
    expect(screen.getByText("Over the limit 25 s")).toBeInTheDocument();
    expect(screen.queryByText(/Tip Rs./)).not.toBeInTheDocument();
  });

  it("closes with the button, with Enter, and by itself after a few seconds", () => {
    render(<ReviewCard />);
    show({});
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(useGame.getState().lastReview).toBeNull();

    show({});
    fireEvent.keyDown(window, { code: "Enter" });
    expect(useGame.getState().lastReview).toBeNull();

    show({});
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(useGame.getState().lastReview).toBeNull();
  });
});
