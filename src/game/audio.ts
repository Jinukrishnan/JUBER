"use client";

import { useGame } from "./state/store";

// Tiny WebAudio engine hum + horn. The context is created lazily on the first
// key press (browsers block audio until a user gesture) and everything is a
// no-op when audio is unavailable or muted.
let ctx: AudioContext | null = null;
let engine: { osc: OscillatorNode; gain: GainNode } | null = null;
let horn: { oscs: OscillatorNode[]; gain: GainNode } | null = null;
let armed = false;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    const e = ctx.createOscillator();
    const eg = ctx.createGain();
    e.type = "sawtooth";
    e.frequency.value = 40;
    eg.gain.value = 0;
    e.connect(eg).connect(ctx.destination);
    e.start();
    engine = { osc: e, gain: eg };
  } catch {
    ctx = null;
  }
  return ctx;
}

export function armAudio(): () => void {
  if (armed) return () => {};
  armed = true;
  const onKey = () => {
    const c = ensure();
    if (c && c.state === "suspended") void c.resume();
  };
  window.addEventListener("keydown", onKey);
  return () => {
    armed = false;
    window.removeEventListener("keydown", onKey);
  };
}

// speedNorm: 0..1 of max speed
export function setEngine(speedNorm: number) {
  if (!ctx || !engine) return;
  const muted = useGame.getState().muted;
  const t = ctx.currentTime;
  engine.osc.frequency.setTargetAtTime(38 + speedNorm * 60, t, 0.1);
  engine.gain.gain.setTargetAtTime(muted ? 0 : 0.02 + speedNorm * 0.03, t, 0.1);
}

export function setHorn(on: boolean) {
  if (!ctx) return;
  const muted = useGame.getState().muted;
  if (on && !muted && !horn) {
    const gain = ctx.createGain();
    gain.gain.value = 0.08;
    const oscs = [392, 494].map((f) => {
      const o = ctx!.createOscillator();
      o.type = "square";
      o.frequency.value = f;
      o.connect(gain);
      o.start();
      return o;
    });
    gain.connect(ctx.destination);
    horn = { oscs, gain };
  } else if ((!on || muted) && horn) {
    horn.oscs.forEach((o) => o.stop());
    horn.gain.disconnect();
    horn = null;
  }
}

// Silence everything. Call when the game scene unmounts so an engine drone or
// held horn cannot keep playing on other pages.
export function stopAudio() {
  setEngine(0);
  if (engine && ctx) {
    engine.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
  }
  if (horn) {
    horn.oscs.forEach((o) => o.stop());
    horn.gain.disconnect();
    horn = null;
  }
}
