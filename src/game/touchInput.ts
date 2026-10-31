import type { HeldKeys } from "./useKeys";

// What the on-screen pad holds down right now. Plain numbers, read inside useFrame,
// so a thumb on the glass never causes a React re-render.
export type TouchHeld = { accel: boolean; brake: boolean; left: boolean; right: boolean; handbrake: boolean; horn: boolean };

export const touchInput: TouchHeld = { accel: false, brake: false, left: false, right: false, handbrake: false, horn: false };

export function releaseTouch(t: TouchHeld = touchInput): void {
  t.accel = t.brake = t.left = t.right = t.handbrake = t.horn = false;
}

const axis = (plus: boolean, minus: boolean) => (plus ? 1 : 0) - (minus ? 1 : 0);

// Keyboard and pad work together: the stronger push wins on each axis, and opposite
// buttons cancel each other as opposite keys do.
export function mergeInput(keys: HeldKeys, t: TouchHeld): HeldKeys {
  const pick = (a: number, b: number) => (Math.abs(a) >= Math.abs(b) ? a : b);
  return {
    throttle: pick(keys.throttle, axis(t.accel, t.brake)),
    steer: pick(keys.steer, axis(t.right, t.left)),
    handbrake: keys.handbrake || t.handbrake,
    horn: keys.horn || t.horn,
  };
}
