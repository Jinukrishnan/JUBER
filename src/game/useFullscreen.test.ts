// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFullscreen } from "./useFullscreen";

const d = document as unknown as Record<string, unknown>;
let fsElement: Element | null = null;
const lock = vi.fn(() => Promise.resolve());
const unlock = vi.fn();

function install(supported: boolean) {
  fsElement = null;
  d.fullscreenEnabled = supported;
  Object.defineProperty(document, "fullscreenElement", { configurable: true, get: () => fsElement });
  document.documentElement.requestFullscreen = vi.fn(async () => {
    fsElement = document.documentElement;
    document.dispatchEvent(new Event("fullscreenchange"));
  });
  d.exitFullscreen = vi.fn(async () => {
    fsElement = null;
    document.dispatchEvent(new Event("fullscreenchange"));
  });
  Object.defineProperty(screen, "orientation", { configurable: true, value: { lock, unlock } });
}

beforeEach(() => {
  lock.mockClear();
  unlock.mockClear();
});
afterEach(() => {
  delete d.fullscreenEnabled;
});

describe("useFullscreen", () => {
  it("reports whether the browser can do full screen", () => {
    install(true);
    expect(renderHook(() => useFullscreen()).result.current.supported).toBe(true);
    install(false);
    expect(renderHook(() => useFullscreen()).result.current.supported).toBe(false);
  });

  it("enters full screen and asks for landscape, then leaves and lets the orientation go", async () => {
    install(true);
    const { result } = renderHook(() => useFullscreen());
    expect(result.current.active).toBe(false);
    await act(async () => {
      await result.current.toggle();
    });
    expect(result.current.active).toBe(true);
    expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
    expect(lock).toHaveBeenCalledWith("landscape");
    await act(async () => {
      await result.current.toggle();
    });
    expect(result.current.active).toBe(false);
    expect(unlock).toHaveBeenCalled();
  });

  it("copes with a browser that refuses the full screen or the orientation lock", async () => {
    install(true);
    document.documentElement.requestFullscreen = vi.fn(() => Promise.reject(new Error("no")));
    const { result } = renderHook(() => useFullscreen());
    await act(async () => {
      await result.current.toggle();
    });
    expect(result.current.active).toBe(false);

    install(true);
    lock.mockImplementationOnce(() => Promise.reject(new Error("not supported")));
    const again = renderHook(() => useFullscreen());
    await act(async () => {
      await again.result.current.toggle();
    });
    expect(again.result.current.active).toBe(true);
  });
});
