import type { Place } from "../data/places-v1";
import type { Vehicle } from "../data/vehicles";

// Ride requests: a customer (or a group) at one place who wants to go to another.
export type Request = {
  id: string;
  customer: string; // the name they give
  pickup: Place;
  drop: Place;
  group: 1 | 2 | 3;
  fare: number; // Rs for the whole group
  distance: number; // metres of road from pickup to drop
  expiresIn: number; // seconds until the request is withdrawn
};

export const REQUEST_TTL_S = 45;
export const MAX_OPEN = 3;
const NEAR_PICKUP_M = 700; // pickups are chosen within this of the vehicle when possible
const MIN_RIDE_M = 150;
const NOT_ON_TOP_M = 30; // never a pickup this close to where the vehicle already is
const TARGET_SPEED = 8; // m/s the speed bonus is measured against
const TARGET_SLACK_S = 10;

const NAMES = ["Priya", "Anil", "Sreeja", "Rahul", "Meera", "Biju", "Lakshmi", "Suresh", "Divya", "Gopan", "Asha", "Vishnu"];

// mulberry32: a value in 0..1 and the next seed
function rand(seed: number): [number, number] {
  let t = (seed + 0x6d2b79f5) | 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

export function fareFor(vehicle: Vehicle, distance: number): number {
  return Math.round(vehicle.baseFare + (vehicle.farePer100m * distance) / 100);
}

// The ride's expected time: 8 m/s plus ten seconds to get going and stop.
export function targetTimeS(distance: number): number {
  return Math.round(distance / TARGET_SPEED + TARGET_SLACK_S);
}

// Up to 20 percent extra for a ride finished well inside the target time.
export function speedBonus(fare: number, actualS: number, targetS: number): number {
  if (actualS >= targetS) return 0;
  const quicker = Math.min(1, (targetS - actualS) / targetS);
  return Math.round(fare * 0.2 * quicker);
}

export type RequestState = { seed: number; nextId: number };

export type RequestWorld = {
  places: Place[];
  spot: (p: Place) => { x: number; z: number };
  distance: (a: Place, b: Place) => number;
};

// The next request, chosen from the seed. `from` is where the vehicle is now.
export function nextRequest(
  state: RequestState,
  vehicle: Vehicle,
  from: { x: number; z: number },
  world: RequestWorld,
): { request: Request; seed: number; nextId: number } {
  let seed = state.seed;
  const pick = <T>(list: T[]): T => {
    const [v, s] = rand(seed);
    seed = s;
    return list[Math.min(list.length - 1, Math.floor(v * list.length))];
  };

  const away = (p: Place) => {
    const s = world.spot(p);
    return Math.hypot(s.x - from.x, s.z - from.z);
  };
  const candidates = world.places.filter((p) => away(p) > NOT_ON_TOP_M);
  const near = candidates.filter((p) => away(p) <= NEAR_PICKUP_M);
  const pickup = pick(near.length > 0 ? near : candidates);

  const farEnough = world.places.filter((p) => p.id !== pickup.id && world.distance(pickup, p) >= MIN_RIDE_M);
  const drop = pick(farEnough);
  const group = (1 + Math.floor(rand(seed)[0] * vehicle.capacity)) as 1 | 2 | 3;
  seed = rand(seed)[1];
  const customer = pick(NAMES);
  const distance = Math.round(world.distance(pickup, drop));

  return {
    request: {
      id: `r${state.nextId}`,
      customer,
      pickup,
      drop,
      group,
      fare: fareFor(vehicle, distance),
      distance,
      expiresIn: REQUEST_TTL_S,
    },
    seed,
    nextId: state.nextId + 1,
  };
}

// Seconds until the next request appears: 8 to 15.
export function spawnDelay(seed: number): { delay: number; seed: number } {
  const [v, s] = rand(seed);
  return { delay: 8 + v * 7, seed: s };
}
