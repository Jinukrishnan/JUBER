// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { armAudio, setEngine, setHorn, stopAudio } from "./audio";

type Param = { value: number; setTargetAtTime: (v: number) => void };
const log = { engineGain: [] as number[], stopped: 0 };

function node() {
  const gain: Param = { value: 0, setTargetAtTime: (v) => { gain.value = v; log.engineGain.push(v); } };
  return {
    gain,
    frequency: { value: 0, setTargetAtTime: () => {} },
    type: "",
    connect: <T,>(t: T) => t,
    disconnect: () => {},
    start: () => {},
    stop: () => { log.stopped++; },
  };
}

class FakeAudioContext {
  currentTime = 0;
  state = "running";
  destination = {};
  createOscillator = node;
  createGain = node;
  resume = async () => {};
}

let disarm: () => void;
beforeEach(() => {
  log.engineGain = [];
  log.stopped = 0;
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
  disarm = armAudio();
  window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" })); // user gesture creates the context
});
afterEach(() => disarm());

describe("stopAudio", () => {
  it("silences the engine and releases a held horn", () => {
    setEngine(1);
    setHorn(true);
    expect(log.engineGain.at(-1)).toBeGreaterThan(0);

    stopAudio();

    expect(log.engineGain.at(-1)).toBe(0);
    expect(log.stopped).toBeGreaterThanOrEqual(2); // both horn oscillators
  });
});
