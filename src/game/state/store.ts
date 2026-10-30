import { create } from "zustand";
import { VEHICLES, type VehicleKind } from "../data/vehicles";
import {
  ACCIDENT_FINE,
  SIGNAL_FINE,
  BOARD_INTERVAL_S,
  CAPACITY,
  INITIAL_WAITING_PER_STOP,
  MAX_WAITING_PER_STOP,
  EVENT_LIMIT,
  MISS_MARGIN,
  PATIENCE_S,
  SPAWN_INTERVAL_S,
  STOP_SPEED_MAX,
} from "../constants";
import { ROUTE_V1 } from "../data/route-v1";
import { firstFreeSeat } from "../logic/seats";
import { planTransfer } from "../logic/boarding";
import { advanceClock } from "../logic/clock";
import { makePassenger, type Passenger } from "../logic/fares";
import { BAY_LONG_TOL, type Bay, type Side } from "../logic/bay";
import { flipDirection, passedStop, type Direction } from "../logic/route";

// Someone the bus has hit, lying where they landed, until they are tidied away.
export type Casualty = {
  id: number;
  personKey: string; // which look to draw (see specFor)
  x: number;
  z: number;
  y: number; // height of the ground they were standing on when hit
  dx: number; // unit direction they are thrown
  dz: number;
  line: number; // which cry they shout (see logic/speech.ts)
  at: number;
};
type NewCasualty = Omit<Casualty, "id" | "at">;
const CASUALTY_LIMIT = 8;

type Phase = "idle" | "running" | "paused" | "ended";

export type GameEvent = {
  id: number;
  type: "board" | "alight";
  passengerId: string;
  stop: number;
  side: Side;
  destination: number;
  fare: number;
  slot: number;
  at: number;
};

export type GameState = {
  phase: Phase;
  dayId: number;
  vehicle: VehicleKind;
  muted: boolean;
  headlights: boolean;
  accidents: number;
  violations: number;
  signalTime: number;
  // a short on-screen message (accident fines); a new id restarts its display
  notice: { id: number; text: string } | null;
  noticeSeq: number;
  casualties: Casualty[];
  casualtySeq: number;
  net: number;
  clockElapsed: number;
  hour: number;
  direction: Direction;
  onboard: Passenger[];
  waitingByStop: Passenger[][];
  doorOpen: boolean;
  // the bay the bus is completely inside right now, if any
  parked: Bay | null;
  events: GameEvent[];
  eventSeq: number;
  busPosition: number;
  busSpeed: number;
  missedStops: number;
  expiredPassengers: number;
  harshEvents: number;
  carried: number;
  // internal timers / rng
  spawnTimer: number;
  transferTimer: number;
  seed: number;
  nextId: number;
};

type Actions = {
  startDay: (vehicle?: VehicleKind) => void;
  pause: () => void;
  resume: () => void;
  tick: (dt: number) => void;
  setBusState: (position: number, speed: number, bay?: Bay | null) => void;
  toggleDoor: () => void;
  transferStep: () => void;
  toggleMute: () => void;
  toggleHeadlights: () => void;
  registerAccident: () => void;
  registerViolation: () => void;
  injure: (c: NewCasualty) => void;
  clearCasualty: (id: number) => void;
  hitWaiting: (stop: number, passengerId: string, c: NewCasualty) => void;
  registerHarsh: () => void;
  endDay: () => void;
};

const STOP_COUNT = ROUTE_V1.length;
const LAST = STOP_COUNT - 1;
const SEED = 20261030;

// mulberry32: returns [value in 0..1, next seed]
function rand(seed: number): [number, number] {
  let t = (seed + 0x6d2b79f5) | 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

function spawn(
  state: Pick<GameState, "waitingByStop" | "seed" | "nextId">,
  origin?: number,
): Pick<GameState, "waitingByStop" | "seed" | "nextId"> {
  let seed = state.seed;
  let r: number;
  [r, seed] = rand(seed);
  const o = origin ?? Math.floor(r * STOP_COUNT);
  [r, seed] = rand(seed);
  // any other stop; terminus-only origins still get a valid destination
  const others = ROUTE_V1.map((_, i) => i).filter((i) => i !== o);
  const d = others[Math.floor(r * others.length)];
  if (state.waitingByStop[o].length >= MAX_WAITING_PER_STOP) {
    return { waitingByStop: state.waitingByStop, seed, nextId: state.nextId };
  }
  const p = makePassenger(`p${state.nextId}`, o, d, PATIENCE_S);
  const waitingByStop = state.waitingByStop.map((q, i) => (i === o ? [...q, p] : q));
  return { waitingByStop, seed, nextId: state.nextId + 1 };
}

function initialState(vehicle: VehicleKind): GameState {
  let s: Pick<GameState, "waitingByStop" | "seed" | "nextId"> = {
    waitingByStop: ROUTE_V1.map(() => []),
    seed: SEED,
    nextId: 1,
  };
  for (let stop = 0; stop < STOP_COUNT; stop++) {
    for (let k = 0; k < INITIAL_WAITING_PER_STOP; k++) s = spawn(s, stop);
  }
  return {
    phase: "idle",
    dayId: 0,
    vehicle,
    muted: false,
    headlights: false,
    accidents: 0,
    violations: 0,
    signalTime: 0,
    notice: null,
    noticeSeq: 0,
    casualties: [],
    casualtySeq: 0,
    net: -VEHICLES[vehicle].rent,
    clockElapsed: 0,
    hour: advanceClock(0, 0).hour,
    direction: "forward",
    onboard: [],
    waitingByStop: s.waitingByStop,
    doorOpen: false,
    parked: { stop: 0, side: "forward" },
    events: [],
    eventSeq: 0,
    busPosition: 0,
    busSpeed: 0,
    missedStops: 0,
    expiredPassengers: 0,
    harshEvents: 0,
    carried: 0,
    spawnTimer: 0,
    transferTimer: 0,
    seed: s.seed,
    nextId: s.nextId,
  };
}

// Without a full pose (headless tests, simple callers) a bus whose centre is
// within the bay tolerance of a stop counts as parked in that direction's bay.
function defaultBay(position: number, dir: Direction): Bay | null {
  const stop = ROUTE_V1.findIndex((st) => Math.abs(st.position - position) <= BAY_LONG_TOL);
  return stop === -1 ? null : { stop, side: dir };
}

function record(s: GameState, e: Omit<GameEvent, "id" | "at">): Pick<GameState, "events" | "eventSeq"> {
  const id = s.eventSeq + 1;
  return { events: [...s.events, { ...e, id, at: Date.now() }].slice(-EVENT_LIMIT), eventSeq: id };
}

function isTerminus(stopIndex: number, dir: Direction): boolean {
  return (dir === "forward" && stopIndex === LAST) || (dir === "backward" && stopIndex === 0);
}

export const useGame = create<GameState & Actions>()((set, get) => ({
  ...initialState("auto"),

  startDay: (vehicle) => set((s) => ({ ...initialState(vehicle ?? s.vehicle), phase: "running", dayId: s.dayId + 1, muted: s.muted, headlights: s.headlights })),
  pause: () => set((s) => (s.phase === "running" ? { phase: "paused" } : {})),
  resume: () => set((s) => (s.phase === "paused" ? { phase: "running" } : {})),
  endDay: () => set({ phase: "ended", doorOpen: false }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  toggleHeadlights: () => set((s) => ({ headlights: !s.headlights })),
  registerAccident: () =>
    set((s) => ({
      net: s.net - ACCIDENT_FINE,
      accidents: s.accidents + 1,
      noticeSeq: s.noticeSeq + 1,
      notice: { id: s.noticeSeq + 1, text: `Accident! Fine Rs. ${ACCIDENT_FINE}` },
    })),
  registerViolation: () =>
    set((s) => ({
      net: s.net - SIGNAL_FINE,
      violations: s.violations + 1,
      noticeSeq: s.noticeSeq + 1,
      notice: { id: s.noticeSeq + 1, text: `Jumped a red signal! Fine Rs. ${SIGNAL_FINE}` },
    })),
  injure: (c) => {
    get().registerAccident();
    set((s) => ({
      casualtySeq: s.casualtySeq + 1,
      casualties: [...s.casualties, { ...c, id: s.casualtySeq + 1, at: Date.now() }].slice(-CASUALTY_LIMIT),
    }));
  },
  clearCasualty: (id) => set((s) => ({ casualties: s.casualties.filter((c) => c.id !== id) })),
  hitWaiting: (stop, passengerId, c) => {
    set((s) => ({
      waitingByStop: s.waitingByStop.map((q, i) => (i === stop ? q.filter((p) => p.id !== passengerId) : q)),
    }));
    get().injure(c);
  },
  registerHarsh: () => set((s) => ({ harshEvents: s.harshEvents + 1 })),

  setBusState: (position, speed, bayArg) =>
    set((s) => {
      const bay = bayArg === undefined ? defaultBay(position, s.direction) : bayArg;
      const patch: Partial<GameState> = { busPosition: position, busSpeed: speed, parked: bay };

      if (bay === null && s.doorOpen) patch.doorOpen = false;

      // clearly past a stop with someone still aboard for it = missed stop
      const missed = s.onboard.filter((p) => passedStop(ROUTE_V1, p.destination, position, s.direction, MISS_MARGIN));
      if (missed.length > 0) {
        patch.onboard = s.onboard.filter((p) => !missed.includes(p));
        patch.missedStops = s.missedStops + 1;
        patch.net = s.net - missed.reduce((sum, p) => sum + p.fare, 0);
      }
      return patch;
    }),

  toggleDoor: () =>
    set((s) => {
      if (s.doorOpen) return { doorOpen: false, transferTimer: 0 };
      if (s.parked === null || s.busSpeed > STOP_SPEED_MAX) return {};
      return { doorOpen: true, transferTimer: 0 };
    }),

  transferStep: () =>
    set((s) => {
      if (!s.doorOpen) return {};
      // people only move while the bus is completely inside the bay serving its direction
      if (s.parked === null || s.parked.side !== s.direction) return {};
      const zone = s.parked.stop;

      const terminus = isTerminus(zone, s.direction);
      const plan = planTransfer({
        stopIndex: zone,
        dir: s.direction,
        onboard: s.onboard,
        waiting: s.waitingByStop[zone],
        capacity: CAPACITY,
        isTerminus: terminus,
      });

      if (plan.alight.length > 0) {
        const gone = plan.alight[0];
        return {
          onboard: s.onboard.filter((p) => p.id !== gone.id),
          carried: s.carried + 1,
          ...record(s, { type: "alight", passengerId: gone.id, stop: zone, side: s.parked.side, destination: gone.destination, fare: gone.fare, slot: s.carried % 6 }),
        };
      }
      if (terminus) return { direction: flipDirection(s.direction) };

      if (plan.board.length > 0) {
        const p = plan.board[0];
        const seat = firstFreeSeat(s.onboard.map((o) => o.seat ?? -1));
        if (seat === null) return {};
        return {
          onboard: [...s.onboard, { ...p, seat }],
          waitingByStop: s.waitingByStop.map((q, i) =>
            i === zone ? q.filter((x) => x.id !== p.id) : q,
          ),
          net: s.net + p.fare,
          ...record(s, { type: "board", passengerId: p.id, stop: zone, side: s.parked.side, destination: p.destination, fare: p.fare, slot: 0 }),
        };
      }
      return {};
    }),

  tick: (dt) => {
    const s = get();
    if (s.phase !== "running") return;

    const clock = advanceClock(s.clockElapsed, dt);

    let expired = 0;
    const aged = s.waitingByStop.map((q) =>
      q
        .map((p) => ({ ...p, patience: p.patience - dt }))
        .filter((p) => {
          if (p.patience <= 0) {
            expired++;
            return false;
          }
          return true;
        }),
    );

    let spawned = { waitingByStop: aged, seed: s.seed, nextId: s.nextId };
    let spawnTimer = s.spawnTimer + dt;
    while (spawnTimer >= SPAWN_INTERVAL_S) {
      spawnTimer -= SPAWN_INTERVAL_S;
      spawned = spawn(spawned);
    }

    set({
      clockElapsed: clock.elapsedRealS,
      signalTime: s.signalTime + dt,
      hour: clock.hour,
      waitingByStop: spawned.waitingByStop,
      seed: spawned.seed,
      nextId: spawned.nextId,
      spawnTimer,
      expiredPassengers: s.expiredPassengers + expired,
      phase: clock.ended ? "ended" : "running",
      doorOpen: clock.ended ? false : s.doorOpen,
    });

    if (!clock.ended && get().doorOpen) {
      let timer = get().transferTimer + dt;
      while (timer >= BOARD_INTERVAL_S) {
        timer -= BOARD_INTERVAL_S;
        get().transferStep();
      }
      set({ transferTimer: timer });
    }
  },
}));
