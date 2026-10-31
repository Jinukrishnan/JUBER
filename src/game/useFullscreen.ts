"use client";

import { useCallback, useEffect, useState } from "react";

type Orientation = { lock?: (o: string) => Promise<void>; unlock?: () => void };
const orientation = (): Orientation | undefined => (typeof screen === "undefined" ? undefined : (screen.orientation as unknown as Orientation | undefined));

const canFullscreen = () => typeof document !== "undefined" && !!document.documentElement.requestFullscreen && document.fullscreenEnabled !== false;

// Full screen, like a video player's button: the page fills the display, and where the browser allows
// it the screen is locked to landscape (Android Chrome does; iPhone Safari has no full screen at all).
// Every call can be refused by the browser, so each failure is swallowed.
export function useFullscreen() {
  const [supported] = useState(canFullscreen);
  const [active, setActive] = useState(() => typeof document !== "undefined" && !!document.fullscreenElement);

  useEffect(() => {
    const onChange = () => {
      const on = !!document.fullscreenElement;
      setActive(on);
      if (!on) orientation()?.unlock?.();
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    } catch {
      return; // refused: stay as we are
    }
    try {
      await orientation()?.lock?.("landscape");
    } catch {
      // not supported here: the rotate prompt still asks the player to turn the phone
    }
  }, []);

  return { supported, active, toggle };
}
