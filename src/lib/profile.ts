export type Profile = {
  name: string;
  avatar: string;
  bestNet: number;
  totalEarnings: number;
  daysPlayed: number;
};

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const KEY = "annawadi.profile.v1";
const VERSION = 1;

function defaultStorage(): Store | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function isProfile(x: unknown): x is Profile {
  if (typeof x !== "object" || x === null) return false;
  const p = x as Record<string, unknown>;
  return (
    typeof p.name === "string" &&
    typeof p.avatar === "string" &&
    typeof p.bestNet === "number" &&
    typeof p.totalEarnings === "number" &&
    typeof p.daysPlayed === "number"
  );
}

export function loadProfile(storage: Store | null = defaultStorage()): Profile | null {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    if ((parsed as { v?: unknown }).v !== VERSION) return null;
    if (!isProfile(parsed)) return null;
    const { name, avatar, bestNet, totalEarnings, daysPlayed } = parsed;
    return { name, avatar, bestNet, totalEarnings, daysPlayed };
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile, storage: Store | null = defaultStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify({ v: VERSION, ...p }));
  } catch {
    // storage unavailable: the game still runs with an in-memory profile
  }
}

export function clearProfile(storage: Store | null = defaultStorage()): void {
  try {
    storage?.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function recordDay(p: Profile, net: number): Profile {
  return {
    ...p,
    bestNet: Math.max(p.bestNet, net),
    totalEarnings: p.totalEarnings + net,
    daysPlayed: p.daysPlayed + 1,
  };
}
