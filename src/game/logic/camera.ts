// Rolling backwards faster than this (m/s) counts as reversing.
export const REVERSE_SPEED = 1;
const FOLLOW_RATE = 4.5;

export function isReversing(speed: number): boolean {
  return speed < -REVERSE_SPEED;
}

export function wrapAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

// The chase/high camera sits behind the bus along `yaw`. When reversing the
// target flips by 180 degrees so the camera swings round to the front and
// looks back along the direction of travel, showing where the bus is going.
export function stepChaseYaw(yaw: number, heading: number, speed: number, dt: number): number {
  const target = heading + (isReversing(speed) ? Math.PI : 0);
  const diff = wrapAngle(target - yaw);
  return yaw + diff * Math.min(1, dt * FOLLOW_RATE);
}
