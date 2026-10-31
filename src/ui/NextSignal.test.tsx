// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);
import { NextSignal } from "./NextSignal";

const base = { id: "centre", approachId: "ns:-1", distance: 84.4, light: "red" as const, seconds: 11.2 };

describe("NextSignal", () => {
  it("shows the lamp, distance and seconds with an arrow for each allowed turn", () => {
    render(<NextSignal signal={{ ...base, turns: ["left", "straight"] }} />);
    expect(screen.getByLabelText("Signal is red")).toBeInTheDocument();
    expect(screen.getByText("84 m")).toBeInTheDocument();
    expect(screen.getByText("changes in 12 s")).toBeInTheDocument();
    expect(screen.getByLabelText("Left turn allowed")).toBeInTheDocument();
    expect(screen.getByLabelText("Straight on allowed")).toBeInTheDocument();
    expect(screen.queryByLabelText("Right turn allowed")).not.toBeInTheDocument();
  });

  it("shows left and right only", () => {
    render(<NextSignal signal={{ ...base, turns: ["left", "right"] }} />);
    expect(screen.getByLabelText("Left turn allowed")).toBeInTheDocument();
    expect(screen.getByLabelText("Right turn allowed")).toBeInTheDocument();
    expect(screen.queryByLabelText("Straight on allowed")).not.toBeInTheDocument();
  });

  it("shows all three", () => {
    render(<NextSignal signal={{ ...base, turns: ["left", "straight", "right"] }} />);
    expect(screen.getAllByLabelText(/allowed$/)).toHaveLength(3);
  });

  it("shows nothing when there is no signal ahead", () => {
    const { container } = render(<NextSignal signal={null} />);
    expect(container.firstChild).toBeNull();
  });
});
