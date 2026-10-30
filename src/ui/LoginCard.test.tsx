// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadProfile, saveProfile, type Profile } from "@/lib/profile";
import { LoginCard } from "./LoginCard";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const type = (value: string) =>
  fireEvent.change(screen.getByLabelText("Driver name"), { target: { value } });
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Start the day" }));

describe("LoginCard", () => {
  it("rejects an empty name with a message and does not submit", () => {
    const onSubmit = vi.fn();
    render(<LoginCard onSubmit={onSubmit} />);
    submit();
    expect(screen.getByRole("alert")).toHaveTextContent(/enter your driver name/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a whitespace-only name", () => {
    const onSubmit = vi.fn();
    render(<LoginCard onSubmit={onSubmit} />);
    type("   ");
    submit();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a trimmed name with a fresh record", () => {
    const onSubmit = vi.fn();
    render(<LoginCard onSubmit={onSubmit} />);
    type("  Ravi  ");
    submit();
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Ravi",
      avatar: expect.any(String),
      bestNet: 0,
      totalEarnings: 0,
      daysPlayed: 0,
      vehicle: "auto",
    });
  });

  it("uses the avatar the driver picked", () => {
    const onSubmit = vi.fn();
    render(<LoginCard onSubmit={onSubmit} />);
    type("Ravi");
    fireEvent.click(screen.getByRole("radio", { name: "Tea glass" }));
    submit();
    expect(onSubmit.mock.calls[0][0].avatar).toBe("tea");
  });

  it("starts with the vehicle the driver picked", () => {
    const onSubmit = vi.fn();
    render(<LoginCard onSubmit={onSubmit} />);
    type("Ravi");
    fireEvent.click(screen.getByRole("radio", { name: /yamaha r15/i }));
    submit();
    expect(onSubmit.mock.calls[0][0].vehicle).toBe("bike");
  });

  describe("with a saved profile", () => {
    const saved: Profile = { name: "Ravi", avatar: "tea", bestNet: 120, totalEarnings: 400, daysPlayed: 2, vehicle: "car" };

    it("continues as the saved driver, keeping their records", () => {
      const onSubmit = vi.fn();
      render(<LoginCard existing={saved} onSubmit={onSubmit} />);
      fireEvent.click(screen.getByRole("button", { name: /continue as ravi/i }));
      expect(onSubmit).toHaveBeenCalledWith(saved);
    });

    it("lets them switch vehicle when they continue", () => {
      const onSubmit = vi.fn();
      render(<LoginCard existing={saved} onSubmit={onSubmit} />);
      fireEvent.click(screen.getByRole("radio", { name: /auto-rickshaw/i }));
      fireEvent.click(screen.getByRole("button", { name: /continue as ravi/i }));
      expect(onSubmit).toHaveBeenCalledWith({ ...saved, vehicle: "auto" });
    });

    it("logging out clears the stored profile", () => {
      saveProfile(saved);
      const onLogout = vi.fn();
      render(<LoginCard existing={saved} onSubmit={vi.fn()} onLogout={onLogout} />);
      fireEvent.click(screen.getByRole("button", { name: /log out/i }));
      expect(loadProfile()).toBeNull();
      expect(onLogout).toHaveBeenCalled();
    });
  });
});
