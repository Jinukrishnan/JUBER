// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VehiclePicker } from "./VehiclePicker";

afterEach(cleanup);

describe("VehiclePicker", () => {
  it("offers the bike, auto and car with their passenger limits", () => {
    render(<VehiclePicker value="auto" onChange={vi.fn()} />);
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByText("1 passenger")).toBeInTheDocument();
    expect(screen.getByText("2 passengers")).toBeInTheDocument();
    expect(screen.getByText("3 passengers")).toBeInTheDocument();
  });
  it("marks the chosen vehicle", () => {
    render(<VehiclePicker value="car" onChange={vi.fn()} />);
    expect(screen.getByRole("radio", { name: /swift dzire/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /yamaha/i })).toHaveAttribute("aria-checked", "false");
  });
  it("reports the vehicle that was clicked", () => {
    const onChange = vi.fn();
    render(<VehiclePicker value="auto" onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: /swift dzire/i }));
    expect(onChange).toHaveBeenCalledWith("car");
  });
  it("shows the daily goal for each vehicle", () => {
    render(<VehiclePicker value="auto" onChange={vi.fn()} />);
    expect(screen.getByText(/goal Rs\. 500/i)).toBeInTheDocument();
    expect(screen.getByText(/goal Rs. 1000/i)).toBeInTheDocument();
  });
});
