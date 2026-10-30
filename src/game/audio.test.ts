// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useGame } from "./state/store";
import { armAudio, playCrash, playDoor, playYelp, setHorn, stopAudio, updateEngine } from "./audio";

type Param = {
  value: number;
  targets: number[];
  setTargetAtTime: (v: number) => void;
  setValueAtTime: (v: number) => void;
  linearRampToValueAtTime: (v: number) => void;
  exponentialRampToValueAtTime: (v: number) => void;
  cancelScheduledValues: () => void;
};

const log = { gains: [] as Param[], oscillators: 0, stopped: 0, sources: 0 };

function param(initial = 0): Param {
  const p: Param = {
    value: initial,
    targets: [],
    setTargetAtTime: (v) => { p.value = v; p.targets.push(v); },
    setValueAtTime: (v) => { p.value = v; },
    linearRampToValueAtTime: (v) => { p.value = v; },
    exponentialRampToValueAtTime: (v) => { p.value = v; },
    cancelScheduledValues: () => {},
  };
  return p;
}

function node() {
  return {
    frequency: param(),
    Q: param(),
    detune: param(),
    type: "",
    buffer: null as unknown,
    loop: false,
    connect: <T,>(t: T) => t,
    disconnect: () => {},
    start: () => {},
    stop: () => { log.stopped++; },
  };
}

class FakeAudioContext {
  currentTime = 0;
  sampleRate = 8000;
  state = "running";
  destination = {};
  createOscillator = () => { log.oscillators++; return node(); };
  createGain = () => {
    const g = { ...node(), gain: param(1) };
    log.gains.push(g.gain);
    return g;
  };
  createBiquadFilter = node;
  createBuffer = (_c: number, len: number) => ({ getChannelData: () => new Float32Array(len) });
  createBufferSource = () => { log.sources++; return node(); };
  resume = async () => {};
}

let disarm: () => void;
// the audio context is created once for the whole file, so the first gain it made is always the master
const master = () => log.gains[0];

beforeEach(() => {
  log.oscillators = 0;
  log.stopped = 0;
  log.sources = 0;
  useGame.setState({ muted: false });
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
  disarm = armAudio();
  window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" })); // a user gesture creates the context
});
afterEach(() => disarm());

describe("engine sound", () => {
  it("is audible while driving", () => {
    updateEngine({ speed: 10, throttle: 1, live: true, kind: "auto" });
    expect(master().targets.at(-1)).toBeGreaterThan(0);
  });

  it("goes silent when the game is paused or over", () => {
    updateEngine({ speed: 10, throttle: 1, live: true, kind: "auto" });
    updateEngine({ speed: 10, throttle: 1, live: false, kind: "auto" });
    expect(master().targets.at(-1)).toBe(0);
  });

  it("is muted by the sound button", () => {
    useGame.setState({ muted: true });
    updateEngine({ speed: 10, throttle: 1, live: true, kind: "auto" });
    expect(master().targets.at(-1)).toBe(0);
    useGame.setState({ muted: false });
    updateEngine({ speed: 10, throttle: 1, live: true, kind: "auto" });
    expect(master().targets.at(-1)).toBeGreaterThan(0);
  });
});

describe("one-off sounds", () => {
  it("makes a door hiss and a crash", () => {
    const before = log.sources;
    playDoor();
    playCrash();
    expect(log.sources).toBeGreaterThan(before);
  });

  it("makes none of them while muted", () => {
    useGame.setState({ muted: true });
    const before = log.sources;
    playDoor();
    playCrash();
    expect(log.sources).toBe(before);
  });
});

describe("a hit person", () => {
  it("cries out, but not when muted", () => {
    const before = log.oscillators;
    playYelp();
    expect(log.oscillators).toBeGreaterThan(before);
    useGame.setState({ muted: true });
    const muted = log.oscillators;
    playYelp();
    expect(log.oscillators).toBe(muted);
  });
});

describe("stopAudio", () => {
  it("silences everything and releases a held horn", () => {
    updateEngine({ speed: 10, throttle: 1, live: true, kind: "auto" });
    setHorn(true);
    stopAudio();
    expect(master().targets.at(-1)).toBe(0);
    expect(log.stopped).toBeGreaterThanOrEqual(2); // both horn oscillators
  });
});
