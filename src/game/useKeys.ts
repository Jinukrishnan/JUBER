"use client";

import { useEffect, useRef, type RefObject } from "react";

export type HeldKeys = {
  throttle: number;
  steer: number;
  handbrake: boolean;
  horn: boolean;
};

// Returns a ref that is updated on key events; read it inside useFrame so
// 60fps input never causes a React re-render.
export function useHeldKeys(): RefObject<HeldKeys> {
  const held = useRef<HeldKeys>({ throttle: 0, steer: 0, handbrake: false, horn: false });

  useEffect(() => {
    const down = new Set<string>();
    const recompute = () => {
      const h = held.current;
      h.throttle = (down.has("KeyW") || down.has("ArrowUp") ? 1 : 0) - (down.has("KeyS") || down.has("ArrowDown") ? 1 : 0);
      h.steer = (down.has("KeyD") || down.has("ArrowRight") ? 1 : 0) - (down.has("KeyA") || down.has("ArrowLeft") ? 1 : 0);
      h.handbrake = down.has("Space");
      h.horn = down.has("KeyH");
    };
    const onDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
      down.add(e.code);
      recompute();
    };
    const onUp = (e: KeyboardEvent) => {
      down.delete(e.code);
      recompute();
    };
    const onBlur = () => {
      down.clear();
      recompute();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return held;
}

// Fires once per physical key press (ignores auto-repeat).
export function useKeyPress(codes: string[], handler: (code: string) => void) {
  const fn = useRef(handler);
  useEffect(() => {
    fn.current = handler;
  });
  const key = codes.join("|");
  useEffect(() => {
    const set = new Set(key.split("|"));
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat || !set.has(e.code)) return;
      fn.current(e.code);
    };
    window.addEventListener("keydown", onDown);
    return () => window.removeEventListener("keydown", onDown);
  }, [key]);
}
