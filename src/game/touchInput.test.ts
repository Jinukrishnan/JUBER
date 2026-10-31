import { describe, expect, it } from "vitest";
import { mergeInput, releaseTouch, type TouchHeld } from "./touchInput";

const idle = { throttle: 0, steer: 0, handbrake: false, horn: false };
const pad = (p: Partial<TouchHeld> = {}): TouchHeld => ({ accel: false, brake: false, left: false, right: false, handbrake: false, horn: false, ...p });

describe("mergeInput", () => {
  it("is idle when nothing is held", () => {
    expect(mergeInput(idle, pad())).toEqual(idle);
  });

  it("maps the pad to throttle and steer", () => {
    expect(mergeInput(idle, pad({ accel: true, right: true }))).toMatchObject({ throttle: 1, steer: 1 });
    expect(mergeInput(idle, pad({ brake: true, left: true }))).toMatchObject({ throttle: -1, steer: -1 });
  });

  it("opposite buttons cancel each other", () => {
    expect(mergeInput(idle, pad({ accel: true, brake: true, left: true, right: true }))).toMatchObject({ throttle: 0, steer: 0 });
  });

  it("lets keyboard and pad work together", () => {
    expect(mergeInput({ ...idle, steer: -1 }, pad({ accel: true }))).toMatchObject({ throttle: 1, steer: -1 });
    expect(mergeInput({ ...idle, throttle: 1 }, pad())).toMatchObject({ throttle: 1 });
  });

  it("carries handbrake and horn from either source", () => {
    expect(mergeInput(idle, pad({ handbrake: true, horn: true }))).toMatchObject({ handbrake: true, horn: true });
    expect(mergeInput({ ...idle, handbrake: true }, pad())).toMatchObject({ handbrake: true });
  });
});

describe("releaseTouch", () => {
  it("lets go of everything", () => {
    const t = pad({ accel: true, left: true, horn: true });
    releaseTouch(t);
    expect(t).toEqual(pad());
  });
});
