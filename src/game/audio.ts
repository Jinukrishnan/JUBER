"use client";

import { beepOn, engineGain, firingHz, rpmFor, tireGain } from "./logic/engine";
import { useGame } from "./state/store";

// Synthesised bus sound. Everything runs through one master gain so the sound
// button (and pause) can silence it all at once. The audio context is created
// on the first key press or click, since browsers block sound until then.
type Engine = {
  master: GainNode;
  saw: OscillatorNode;
  sawFilter: BiquadFilterNode;
  sawGain: GainNode;
  sub: OscillatorNode;
  subGain: GainNode;
  clatterFilter: BiquadFilterNode;
  clatterGain: GainNode;
  lfo: OscillatorNode;
  lfoDepth: GainNode;
  roadFilter: BiquadFilterNode;
  roadGain: GainNode;
  beep: OscillatorNode;
  beepGain: GainNode;
  noise: AudioBuffer;
};

let ctx: AudioContext | null = null;
let eng: Engine | null = null;
let horn: { oscs: OscillatorNode[]; gain: GainNode } | null = null;
let armed = false;

function whiteNoise(c: AudioContext): AudioBuffer {
  const len = Math.floor(c.sampleRate * 2);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  let seed = 1234567;
  for (let i = 0; i < len; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    d[i] = ((seed >>> 8) / 8388608) * 2 - 1;
  }
  return buf;
}

function loopedNoise(c: AudioContext, buf: AudioBuffer): AudioBufferSourceNode {
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.start();
  return src;
}

function build(c: AudioContext): Engine {
  const master = c.createGain();
  master.gain.value = 0;
  master.connect(c.destination);
  const noise = whiteNoise(c);

  // low diesel growl: a sawtooth and a square one octave down, filtered
  const saw = c.createOscillator();
  saw.type = "sawtooth";
  const sawFilter = c.createBiquadFilter();
  sawFilter.type = "lowpass";
  const sawGain = c.createGain();
  sawGain.gain.value = 0;
  saw.connect(sawFilter);
  sawFilter.connect(sawGain);
  sawGain.connect(master);
  saw.start();

  const sub = c.createOscillator();
  sub.type = "square";
  const subGain = c.createGain();
  subGain.gain.value = 0;
  sub.connect(subGain);
  subGain.connect(master);
  sub.start();

  // diesel clatter: band-passed noise pulsed at the firing rate
  const clatter = loopedNoise(c, noise);
  const clatterFilter = c.createBiquadFilter();
  clatterFilter.type = "bandpass";
  clatterFilter.frequency.value = 1400;
  clatterFilter.Q.value = 0.8;
  const clatterGain = c.createGain();
  clatterGain.gain.value = 0;
  clatter.connect(clatterFilter);
  clatterFilter.connect(clatterGain);
  clatterGain.connect(master);
  const lfo = c.createOscillator();
  lfo.type = "square";
  const lfoDepth = c.createGain();
  lfoDepth.gain.value = 0;
  lfo.connect(lfoDepth);
  lfoDepth.connect(clatterGain.gain);
  lfo.start();

  // tyre and wind roar
  const road = loopedNoise(c, noise);
  const roadFilter = c.createBiquadFilter();
  roadFilter.type = "lowpass";
  roadFilter.frequency.value = 400;
  const roadGain = c.createGain();
  roadGain.gain.value = 0;
  road.connect(roadFilter);
  roadFilter.connect(roadGain);
  roadGain.connect(master);

  // reversing alarm
  const beep = c.createOscillator();
  beep.type = "sine";
  beep.frequency.value = 1000;
  const beepGain = c.createGain();
  beepGain.gain.value = 0;
  beep.connect(beepGain);
  beepGain.connect(master);
  beep.start();

  return { master, saw, sawFilter, sawGain, sub, subGain, clatterFilter, clatterGain, lfo, lfoDepth, roadFilter, roadGain, beep, beepGain, noise };
}

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    eng = build(ctx);
  } catch {
    ctx = null;
    eng = null;
  }
  return ctx;
}

export function armAudio(): () => void {
  if (armed) return () => {};
  armed = true;
  const wake = () => {
    const c = ensure();
    if (c && c.state === "suspended") void c.resume();
  };
  window.addEventListener("keydown", wake);
  window.addEventListener("pointerdown", wake);
  return () => {
    armed = false;
    window.removeEventListener("keydown", wake);
    window.removeEventListener("pointerdown", wake);
  };
}

const muted = () => useGame.getState().muted;

// Call every frame. speed is signed (negative = reversing); throttle is 0..1.
export function updateEngine(state: { speed: number; throttle: number; live: boolean }) {
  if (!ctx || !eng) return;
  const { speed, throttle, live } = state;
  const t = ctx.currentTime;
  const on = live && !muted();
  eng.master.gain.setTargetAtTime(on ? 1 : 0, t, 0.06);
  if (!on) {
    eng.beepGain.gain.setTargetAtTime(0, t, 0.02);
    return;
  }

  const load = Math.max(0, throttle);
  const rpm = rpmFor(speed, load);
  const fire = firingHz(rpm);
  const level = engineGain(speed, load);

  eng.saw.frequency.setTargetAtTime(fire * 2, t, 0.08);
  eng.sawFilter.frequency.setTargetAtTime(260 + rpm * 0.3, t, 0.08);
  eng.sawGain.gain.setTargetAtTime(level, t, 0.08);
  eng.sub.frequency.setTargetAtTime(fire, t, 0.08);
  eng.subGain.gain.setTargetAtTime(level * 0.45, t, 0.08);

  eng.lfo.frequency.setTargetAtTime(fire, t, 0.08);
  eng.clatterGain.gain.setTargetAtTime(level * 0.22, t, 0.08);
  eng.lfoDepth.gain.setTargetAtTime(level * 0.2, t, 0.08);

  eng.roadFilter.frequency.setTargetAtTime(300 + Math.abs(speed) * 45, t, 0.1);
  eng.roadGain.gain.setTargetAtTime(tireGain(speed), t, 0.1);

  const beeping = beepOn(performance.now(), speed < -0.3);
  eng.beepGain.gain.setTargetAtTime(beeping ? 0.05 : 0, t, 0.01);
}

export function setHorn(on: boolean) {
  if (!ctx || !eng) return;
  if (on && !muted() && !horn) {
    const gain = ctx.createGain();
    gain.gain.value = 0.2;
    const oscs = [392, 494].map((f) => {
      const o = ctx!.createOscillator();
      o.type = "square";
      o.frequency.value = f;
      o.connect(gain);
      o.start();
      return o;
    });
    gain.connect(eng.master);
    horn = { oscs, gain };
  } else if ((!on || muted()) && horn) {
    horn.oscs.forEach((o) => o.stop());
    horn.gain.disconnect();
    horn = null;
  }
}

// A burst of filtered noise that fades out: door air hiss, crash scrape.
function burst(freq: number, q: number, seconds: number, peak: number) {
  if (!ctx || !eng) return;
  const src = ctx.createBufferSource();
  src.buffer = eng.noise;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = ctx.createGain();
  const t = ctx.currentTime;
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + seconds);
  src.connect(filter);
  filter.connect(g);
  g.connect(eng.master);
  src.start(t);
  src.stop(t + seconds);
}

// Pneumatic door hiss.
export function playDoor() {
  if (muted()) return;
  burst(3200, 0.7, 0.45, 0.35);
}

// Heavy thump plus a scrape, for hitting someone.
export function playCrash() {
  if (muted() || !ctx || !eng) return;
  const t = ctx.currentTime;
  const thump = ctx.createOscillator();
  thump.type = "sine";
  thump.frequency.setValueAtTime(140, t);
  thump.frequency.exponentialRampToValueAtTime(40, t + 0.35);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.9, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  thump.connect(g);
  g.connect(eng.master);
  thump.start(t);
  thump.stop(t + 0.4);
  burst(900, 0.6, 0.6, 0.5);
}

// Silence everything. Call when the game scene unmounts so an engine drone or
// held horn cannot keep playing on other pages.
export function stopAudio() {
  if (ctx && eng) {
    const t = ctx.currentTime;
    eng.master.gain.setTargetAtTime(0, t, 0.03);
    eng.beepGain.gain.setTargetAtTime(0, t, 0.01);
  }
  if (horn) {
    horn.oscs.forEach((o) => o.stop());
    horn.gain.disconnect();
    horn = null;
  }
}
