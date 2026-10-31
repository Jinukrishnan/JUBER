import { create } from "zustand";
import { ACCIDENT_FINE, PICKUP_PATIENCE_S, SIGNAL_FINE } from "../constants";
import { busPose } from "../busPose";
import { VEHICLES, type VehicleKind } from "../data/vehicles";
import { advanceClock } from "../logic/clock";
import { MAX_OPEN, nextRequest, spawnDelay, targetTimeS, type Request } from "../logic/requests";
import { isSpeeding, reviewRide, type Review } from "../logic/review";
import {
  IDLE_RIDE,
  acceptRequest,
  acceptRide,
  arriveDrop,
  arrivePickup,
  cancelRide,
  finishAlighting as payRide,
  finishBoarding as boarded,
  inZone,
  type Ride,
} from "../logic/ride";
import { offRoute, route as planRoute, type Route } from "../logic/roadgraph";
import { GRAPH, RIDE_WORLD, spotOf } from "../rideWorld";
import { resetBusPose } from "../busPose";

// Someone the vehicle has hit, lying where they landed, until they are tidied away.
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
const START_REQUESTS = 2;

// What happened during the ride in progress, for the customer's review.
export type RideCounts = { accidents: number; redLights: number; wrongTurns: number; harsh: number; speedingS: number };
const NO_COUNTS: RideCounts = { accidents: 0, redLights: 0, wrongTurns: 0, harsh: 0, speedingS: 0 };
export type LastReview = { id: number; name: string; group: number; review: Review };

// the vehicle's speed, kept out of the state so it does not wake every subscriber each frame
let vehicleSpeed = 0;

type Phase = "idle" | "running" | "paused" | "ended";

export type GameState = {
  phase: Phase;
  dayId: number;
  vehicle: VehicleKind;
  muted: boolean;
  headlights: boolean;
  accidents: number;
  violations: number;
  wrongTurns: number;
  signalTime: number;
  // a short on-screen message (fines, a customer giving up); a new id restarts its display
  notice: { id: number; text: string } | null;
  noticeSeq: number;
  casualties: Casualty[];
  casualtySeq: number;
  net: number;
  clockElapsed: number;
  hour: number;
  // rides
  ride: Ride;
  openRequests: Request[];
  ridesDone: number;
  distanceDone: number;
  expiredPickups: number;
  harshEvents: number;
  rideStats: RideCounts;
  reviews: Review[];
  lastReview: LastReview | null;
  reviewSeq: number;
  pickupLeft: number; // seconds the accepted customer will still wait
  rideElapsed: number; // seconds the customer has been in the vehicle (kept out of `ride` so that object does not change every frame)
  route: Route | null; // the way to the pickup, then to the drop
  // internal timers / rng
  spawnTimer: number;
  seed: number;
  nextId: number;
};

type Actions = {
  startDay: (vehicle?: VehicleKind) => void;
  pause: () => void;
  resume: () => void;
  tick: (dt: number) => void;
  setVehicleState: (pose: { x: number; z: number; speed: number; heading?: number }) => void;
  accept: (id: string) => void;
  skip: (id: string) => void;
  confirmRide: () => void;
  finishBoarding: () => void;
  finishAlighting: () => void;
  toggleMute: () => void;
  toggleHeadlights: () => void;
  registerAccident: () => void;
  registerViolation: () => void;
  registerWrongTurn: () => void;
  injure: (c: NewCasualty) => void;
  hitCustomer: (c: NewCasualty) => void;
  clearCasualty: (id: number) => void;
  registerHarsh: () => void;
  endDay: () => void;
  dismissReview: () => void;
};

const SEED = 20261030;

// events only count against the review while the customer is aboard
const aboard = (s: GameState) => s.ride.phase === "boarding" || s.ride.phase === "riding" || s.ride.phase === "alighting";
const bump = (s: GameState, key: Exclude<keyof RideCounts, "speedingS">): Partial<GameState> =>
  aboard(s) ? { rideStats: { ...s.rideStats, [key]: s.rideStats[key] + 1 } } : {};
const seedOf = (id: string) => [...id].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

function initialState(vehicle: VehicleKind): GameState {
  const spec = VEHICLES[vehicle];
  let seed = SEED;
  let nextId = 1;
  const openRequests: Request[] = [];
  for (let i = 0; i < START_REQUESTS; i++) {
    const r = nextRequest({ seed, nextId }, spec, { x: busPose.x, z: busPose.z }, RIDE_WORLD);
    openRequests.push(r.request);
    seed = r.seed;
    nextId = r.nextId;
  }
  const first = spawnDelay(seed);
  return {
    phase: "idle",
    dayId: 0,
    vehicle,
    muted: false,
    headlights: false,
    accidents: 0,
    violations: 0,
    wrongTurns: 0,
    signalTime: 0,
    notice: null,
    noticeSeq: 0,
    casualties: [],
    casualtySeq: 0,
    net: -spec.rent,
    clockElapsed: 0,
    hour: advanceClock(0, 0).hour,
    ride: IDLE_RIDE,
    openRequests,
    ridesDone: 0,
    distanceDone: 0,
    expiredPickups: 0,
    harshEvents: 0,
    rideStats: NO_COUNTS,
    reviews: [],
    lastReview: null,
    reviewSeq: 0,
    pickupLeft: 0,
    rideElapsed: 0,
    route: null,
    spawnTimer: first.delay,
    seed: first.seed,
    nextId,
  };
}

// Two new requests chosen from where the vehicle is now, for when it goes back online
// (the old ones were picked for somewhere else and have been standing still).
function freshRequests(s: GameState): Pick<GameState, "openRequests" | "seed" | "nextId"> {
  let seed = s.seed;
  let nextId = s.nextId;
  const openRequests: Request[] = [];
  for (let i = 0; i < START_REQUESTS; i++) {
    const r = nextRequest({ seed, nextId }, VEHICLES[s.vehicle], { x: busPose.x, z: busPose.z }, RIDE_WORLD);
    openRequests.push(r.request);
    seed = r.seed;
    nextId = r.nextId;
  }
  return { openRequests, seed, nextId };
}

const notice = (s: GameState, text: string): Pick<GameState, "noticeSeq" | "notice"> => ({
  noticeSeq: s.noticeSeq + 1,
  notice: { id: s.noticeSeq + 1, text },
});

export const useGame = create<GameState & Actions>()((set, get) => ({
  ...initialState("auto"),

  startDay: (vehicle) =>
    set((s) => {
      // a new day starts at the depot, so requests are chosen from there
      resetBusPose();
      vehicleSpeed = 0;
      return { ...initialState(vehicle ?? s.vehicle), phase: "running", dayId: s.dayId + 1, muted: s.muted, headlights: s.headlights };
    }),
  pause: () => set((s) => (s.phase === "running" ? { phase: "paused" } : {})),
  resume: () => set((s) => (s.phase === "paused" ? { phase: "running" } : {})),
  endDay: () => set({ phase: "ended" }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  toggleHeadlights: () => set((s) => ({ headlights: !s.headlights })),

  registerAccident: () =>
    set((s) => ({
      net: s.net - ACCIDENT_FINE,
      accidents: s.accidents + 1,
      ...bump(s, "accidents"),
      ...notice(s, `Accident! Fine Rs. ${ACCIDENT_FINE}`),
    })),
  registerViolation: () =>
    set((s) => ({
      net: s.net - SIGNAL_FINE,
      violations: s.violations + 1,
      ...bump(s, "redLights"),
      ...notice(s, `Jumped a red signal! Fine Rs. ${SIGNAL_FINE}`),
    })),
  registerWrongTurn: () =>
    set((s) => ({
      net: s.net - SIGNAL_FINE,
      wrongTurns: s.wrongTurns + 1,
      ...bump(s, "wrongTurns"),
      ...notice(s, `Turn not allowed here! Fine Rs. ${SIGNAL_FINE}`),
    })),
  injure: (c) => {
    get().registerAccident();
    set((s) => ({
      casualtySeq: s.casualtySeq + 1,
      casualties: [...s.casualties, { ...c, id: s.casualtySeq + 1, at: Date.now() }].slice(-CASUALTY_LIMIT),
    }));
  },
  // the customer waiting at the pickup was hit: they are hurt and the booking is off
  hitCustomer: (c) => {
    get().injure(c);
    set((s) => {
      const ride = cancelRide(s.ride);
      if (ride === s.ride) return {};
      return { ride, route: null, ...freshRequests(s), ...notice(s, `Accident! Fine Rs. ${ACCIDENT_FINE} - the booking is cancelled`) };
    });
  },
  clearCasualty: (id) => set((s) => ({ casualties: s.casualties.filter((c) => c.id !== id) })),
  registerHarsh: () => set((s) => ({ harshEvents: s.harshEvents + 1, ...bump(s, "harsh") })),
  dismissReview: () => set({ lastReview: null }),

  // Called every frame with where the vehicle is: arriving and stopping at the
  // pickup or the drop moves the ride on.
  setVehicleState: (pose) => {
    vehicleSpeed = pose.speed;
    set((s) => {
      if (s.phase !== "running" || !s.ride.request) return {};
      if (s.ride.phase === "toPickup" && inZone(pose, spotOf(s.ride.request.pickup))) {
        return { ride: arrivePickup(s.ride) };
      }
      if (s.ride.phase === "riding" && inZone(pose, spotOf(s.ride.request.drop))) {
        return { ride: arriveDrop({ ...s.ride, elapsed: s.rideElapsed }) };
      }
      // left the road the route follows: work out the way again from here
      const heading = pose.heading ?? busPose.heading;
      if (s.route && (s.ride.phase === "toPickup" || s.ride.phase === "riding") && offRoute(s.route, pose)) {
        const to = s.ride.phase === "toPickup" ? s.ride.request.pickup : s.ride.request.drop;
        return { route: planRoute(GRAPH, { x: pose.x, z: pose.z, heading }, to) };
      }
      return {};
    });
  },

  accept: (id) =>
    set((s) => {
      const request = s.openRequests.find((r) => r.id === id);
      if (!request || s.ride.phase !== "online" || s.phase !== "running") return {};
      return {
        ride: acceptRequest(s.ride, request),
        openRequests: s.openRequests.filter((r) => r.id !== id),
        pickupLeft: PICKUP_PATIENCE_S,
        route: planRoute(GRAPH, { x: busPose.x, z: busPose.z, heading: busPose.heading }, request.pickup),
      };
    }),
  skip: (id) => set((s) => (s.phase === "running" && s.ride.phase === "online" ? { openRequests: s.openRequests.filter((r) => r.id !== id) } : {})),
  confirmRide: () => set((s) => (s.phase === "running" ? { ride: acceptRide(s.ride), rideStats: NO_COUNTS } : {})),
  finishBoarding: () =>
    set((s) => {
      const ride = boarded(s.ride);
      if (ride === s.ride || !ride.request) return {};
      return { ride, rideElapsed: 0, route: planRoute(GRAPH, { x: busPose.x, z: busPose.z, heading: busPose.heading }, ride.request.drop) };
    }),
  finishAlighting: () =>
    set((s) => {
      const done = payRide(s.ride);
      if (done.paid === 0 || !s.ride.request) return {};
      // the customer says what they thought of the ride, and tips for a good one
      const review = reviewRide({ ...s.rideStats, elapsedS: s.rideElapsed, targetS: targetTimeS(s.ride.request.distance) }, seedOf(s.ride.request.id));
      return {
        ride: done.ride,
        route: null,
        ...freshRequests(s),
        net: s.net + done.paid + review.tip,
        reviews: [...s.reviews, review],
        lastReview: { id: s.reviewSeq + 1, name: s.ride.request.customer, group: s.ride.request.group, review },
        reviewSeq: s.reviewSeq + 1,
        rideStats: NO_COUNTS,
        ridesDone: s.ridesDone + 1,
        distanceDone: s.distanceDone + s.ride.request.distance,
      };
    }),

  tick: (dt) => {
    const s = get();
    if (s.phase !== "running") return;
    const clock = advanceClock(s.clockElapsed, dt);
    const patch: Partial<GameState> = {
      clockElapsed: clock.elapsedRealS,
      hour: clock.hour,
      signalTime: s.signalTime + dt,
      phase: clock.ended ? "ended" : "running",
    };

    let ride = s.ride;
    // ride time is counted apart from `ride` so that object only changes when the ride moves on
    if (ride.phase === "riding") {
      patch.rideElapsed = s.rideElapsed + dt;
      if (isSpeeding(vehicleSpeed)) patch.rideStats = { ...s.rideStats, speedingS: s.rideStats.speedingS + dt };
    }

    if (ride.phase === "online") {
      // requests age, and a new one turns up every so often
      let open = s.openRequests.map((r) => ({ ...r, expiresIn: r.expiresIn - dt })).filter((r) => r.expiresIn > 0);
      let { seed, nextId, spawnTimer } = s;
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        if (open.length < MAX_OPEN) {
          const n = nextRequest({ seed, nextId }, VEHICLES[s.vehicle], { x: busPose.x, z: busPose.z }, RIDE_WORLD);
          open = [...open, n.request];
          seed = n.seed;
          nextId = n.nextId;
        }
        const d = spawnDelay(seed);
        spawnTimer = d.delay;
        seed = d.seed;
      }
      Object.assign(patch, { openRequests: open, seed, nextId, spawnTimer });
    } else if (ride.phase === "toPickup") {
      // the customer waits only so long
      const left = s.pickupLeft - dt;
      if (left <= 0) {
        ride = IDLE_RIDE;
        Object.assign(patch, { ride, route: null, ...freshRequests(s), expiredPickups: s.expiredPickups + 1, ...notice(s, "Customer got tired of waiting and left") });
      } else {
        patch.pickupLeft = left;
      }
    }

    set(patch);
  },
}));
