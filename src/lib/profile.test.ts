import { describe, expect, it } from "vitest";
import {
  clearProfile,
  loadProfile,
  recordDay,
  saveProfile,
  type Profile,
} from "./profile";

const KEY = "annawadi.profile.v1";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
    removeItem: (k: string) => {
      delete data[k];
    },
  };
}

const base: Profile = {
  name: "Ravi",
  avatar: "tea",
  bestNet: 100,
  totalEarnings: 500,
  daysPlayed: 3,
  vehicle: "auto",
};

describe("profile vehicle", () => {
  it("keeps the vehicle the driver chose", () => {
    const s = fakeStorage();
    saveProfile({ ...base, vehicle: "bike" }, s);
    expect(loadProfile(s)?.vehicle).toBe("bike");
  });
  it("gives an old profile without a vehicle an auto", () => {
    const { vehicle: _v, ...old } = base;
    void _v;
    const s = fakeStorage({ [KEY]: JSON.stringify({ v: 1, ...old }) });
    expect(loadProfile(s)?.vehicle).toBe("auto");
  });
  it("gives a profile with an unknown vehicle an auto", () => {
    const s = fakeStorage({ [KEY]: JSON.stringify({ v: 1, ...base, vehicle: "bus" }) });
    expect(loadProfile(s)?.vehicle).toBe("auto");
  });
});

describe("profile storage", () => {
  it("round-trips a saved profile", () => {
    const s = fakeStorage();
    saveProfile(base, s);
    expect(loadProfile(s)).toEqual(base);
  });

  it("returns null when nothing is stored", () => {
    expect(loadProfile(fakeStorage())).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(loadProfile(fakeStorage({ [KEY]: "{not json" }))).toBeNull();
  });

  it("returns null for the wrong schema version", () => {
    const s = fakeStorage({ [KEY]: JSON.stringify({ v: 2, ...base }) });
    expect(loadProfile(s)).toBeNull();
  });

  it("returns null when fields are missing or mistyped", () => {
    const s = fakeStorage({
      [KEY]: JSON.stringify({ v: 1, name: "Ravi", bestNet: "lots" }),
    });
    expect(loadProfile(s)).toBeNull();
  });

  it("does not throw when storage access throws", () => {
    const boom = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadProfile(boom)).toBeNull();
    expect(() => saveProfile(base, boom)).not.toThrow();
    expect(() => clearProfile(boom)).not.toThrow();
  });

  it("clearProfile removes the stored profile", () => {
    const s = fakeStorage();
    saveProfile(base, s);
    clearProfile(s);
    expect(loadProfile(s)).toBeNull();
  });
});

describe("recordDay", () => {
  it("updates best, total and days when the day beats the best", () => {
    expect(recordDay(base, 300)).toEqual({
      ...base,
      bestNet: 300,
      totalEarnings: 800,
      daysPlayed: 4,
    });
  });

  it("keeps the best when the day is lower", () => {
    const r = recordDay(base, 40);
    expect(r.bestNet).toBe(100);
    expect(r.daysPlayed).toBe(4);
    expect(r.totalEarnings).toBe(540);
  });

  it("does not mutate its input", () => {
    const copy = { ...base };
    recordDay(base, 300);
    expect(base).toEqual(copy);
  });
});
