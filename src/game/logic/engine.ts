import type { VehicleKind } from "../data/vehicles";
import { MAX_FORWARD_SPEED } from "./vehicle";

// A simple engine model for the sound: gearbox, revs and loudness as functions
// of road speed and throttle. Pure, so the audio layer only has to turn these
// numbers into noise. Each vehicle has its own profile.
export type EngineProfile = {
  gearTops: number[]; // m/s at which each gear tops out
  idleRpm: number;
  baseRpm: number; // revs at the bottom of a gear
  span: number; // how far revs climb through a gear
  firingPerRev: number; // combustion pulses per revolution
  tone: number; // multiplier from firing rate to the main tone
  gain: number; // overall loudness
  // the timbre
  wave: "sawtooth" | "square" | "triangle"; // main oscillator
  subWave: "sawtooth" | "square" | "triangle" | "sine"; // the one an octave down
  filterBase: number; // low-pass cutoff at idle, Hz
  filterPerRpm: number; // how much the cutoff opens as the revs climb
  subMix: number; // share of the low octave
  rasp: number; // share of the buzzing exhaust noise
  pulse: number; // depth of the beat at the firing rate (the putter)
  crackle: boolean; // pops when the throttle is lifted at high revs
};

const BUS_ENGINE: EngineProfile = {
  gearTops: [3, 6.5, 10, 13.5, 17],
  idleRpm: 700,
  baseRpm: 1000,
  span: 1400,
  firingPerRev: 3, // six cylinders, four-stroke
  tone: 2,
  gain: 1,
  wave: "sawtooth",
  subWave: "square",
  filterBase: 260,
  filterPerRpm: 0.3,
  subMix: 0.45,
  rasp: 0.22,
  pulse: 0.2,
  crackle: false,
};

const PROFILES: Record<VehicleKind | "bus", EngineProfile> = {
  bus: BUS_ENGINE,
  // sports bike: high, buzzy and revvy, with a raspy exhaust that pops off the throttle
  bike: {
    gearTops: [4, 8, 12, 16, 19, 22], idleRpm: 1400, baseRpm: 3500, span: 6500, firingPerRev: 1, tone: 2, gain: 0.8,
    wave: "sawtooth", subWave: "sawtooth", filterBase: 900, filterPerRpm: 0.55, subMix: 0.3, rasp: 0.9, pulse: 0.1, crackle: true,
  },
  // auto-rickshaw: a two-stroke putter, a low lumpy beat
  auto: {
    gearTops: [3.5, 7, 10.5, 14], idleRpm: 700, baseRpm: 1100, span: 1300, firingPerRev: 0.5, tone: 8, gain: 1.1,
    wave: "square", subWave: "square", filterBase: 420, filterPerRpm: 0.2, subMix: 0.6, rasp: 0.25, pulse: 0.9, crackle: false,
  },
  // car: a smooth, quiet four-cylinder hum
  car: {
    gearTops: [4, 8, 12, 16, 18], idleRpm: 850, baseRpm: 1100, span: 2600, firingPerRev: 2, tone: 2, gain: 0.55,
    wave: "triangle", subWave: "sine", filterBase: 180, filterPerRpm: 0.12, subMix: 0.5, rasp: 0.12, pulse: 0.05, crackle: false,
  },
};

export function engineProfile(kind: VehicleKind | "bus"): EngineProfile {
  return PROFILES[kind];
}

export const IDLE_RPM = BUS_ENGINE.idleRpm;

export function gearFor(speed: number, p: EngineProfile = BUS_ENGINE): number {
  const v = Math.abs(speed);
  for (let i = 0; i < p.gearTops.length; i++) if (v < p.gearTops[i]) return i + 1;
  return p.gearTops.length;
}

// Revs climb through each gear, then fall back as the next one engages.
export function rpmFor(speed: number, throttle: number, p: EngineProfile = BUS_ENGINE): number {
  const v = Math.abs(speed);
  if (v < 0.3) return p.idleRpm;
  const g = gearFor(v, p);
  const lo = g === 1 ? 0 : p.gearTops[g - 2];
  const hi = p.gearTops[g - 1];
  const frac = Math.min(1, (v - lo) / (hi - lo));
  return p.baseRpm + frac * p.span + Math.min(1, Math.abs(throttle)) * (p.span / 14);
}

// Firing frequency from the revs.
export function firingHz(rpm: number, p: EngineProfile = BUS_ENGINE): number {
  return (rpm / 60) * p.firingPerRev;
}

export function engineGain(speed: number, throttle: number, p: EngineProfile = BUS_ENGINE): number {
  const rpm = rpmFor(speed, throttle, p);
  const range = p.baseRpm + p.span + p.span / 14 - p.idleRpm;
  return p.gain * (0.05 + 0.1 * Math.min(1, Math.abs(throttle)) + (0.05 * (rpm - p.idleRpm)) / range);
}

// Road and tyre roar, growing with speed.
export function tireGain(speed: number, maxSpeed: number = MAX_FORWARD_SPEED): number {
  const f = Math.min(1, Math.abs(speed) / maxSpeed);
  return Math.min(0.12, 0.12 * Math.pow(f, 1.2));
}

// The reversing alarm: on for 400 ms, off for 400 ms.
export function beepOn(timeMs: number, reversing: boolean): boolean {
  return reversing && Math.floor(timeMs / 400) % 2 === 0;
}
