import { MAX_FORWARD_SPEED } from "./vehicle";

// A simple diesel-bus model for the sound: gearbox, revs and loudness as
// functions of road speed and throttle. Pure, so the audio layer only has to
// turn these numbers into noise.
export const IDLE_RPM = 700;
const GEAR_TOPS = [3, 6.5, 10, 13.5, 17]; // m/s at which each gear tops out
const MAX_GEAR = GEAR_TOPS.length;

export function gearFor(speed: number): number {
  const v = Math.abs(speed);
  for (let i = 0; i < MAX_GEAR; i++) if (v < GEAR_TOPS[i]) return i + 1;
  return MAX_GEAR;
}

// Revs climb through each gear, then fall back as the next one engages.
export function rpmFor(speed: number, throttle: number): number {
  const v = Math.abs(speed);
  if (v < 0.3) return IDLE_RPM;
  const g = gearFor(v);
  const lo = g === 1 ? 0 : GEAR_TOPS[g - 2];
  const hi = GEAR_TOPS[g - 1];
  const frac = Math.min(1, (v - lo) / (hi - lo));
  return 1000 + frac * 1400 + Math.min(1, Math.abs(throttle)) * 100;
}

// Firing frequency of a six-cylinder four-stroke: three firings per revolution.
export function firingHz(rpm: number): number {
  return (rpm / 60) * 3;
}

export function engineGain(speed: number, throttle: number): number {
  const rpm = rpmFor(speed, throttle);
  return 0.05 + 0.1 * Math.min(1, Math.abs(throttle)) + (0.05 * (rpm - IDLE_RPM)) / 1800;
}

// Road and tyre roar, growing with speed.
export function tireGain(speed: number): number {
  const f = Math.min(1, Math.abs(speed) / MAX_FORWARD_SPEED);
  return Math.min(0.12, 0.12 * Math.pow(f, 1.2));
}

// The reversing alarm: on for 400 ms, off for 400 ms.
export function beepOn(timeMs: number, reversing: boolean): boolean {
  return reversing && Math.floor(timeMs / 400) % 2 === 0;
}
