import { speedBonus, targetTimeS, type Request } from "./requests";

// One ride from request to payment, as pure steps. Every step returns the same
// ride untouched when it is called from a phase where it makes no sense.
export type RidePhase = "online" | "toPickup" | "atPickup" | "boarding" | "riding" | "alighting";
export type Ride = { phase: RidePhase; request: Request | null; elapsed: number };

export const IDLE_RIDE: Ride = { phase: "online", request: null, elapsed: 0 };

// Close enough to the kerb spot (a vehicle on the far side of the road is not)
// and slow enough to be stopping.
export const ZONE_RADIUS = 6;
export const ZONE_MAX_SPEED = 1.5;

export function inZone(vehicle: { x: number; z: number; speed: number }, spot: { x: number; z: number }): boolean {
  return Math.hypot(vehicle.x - spot.x, vehicle.z - spot.z) <= ZONE_RADIUS && Math.abs(vehicle.speed) < ZONE_MAX_SPEED;
}

export function acceptRequest(r: Ride, request: Request): Ride {
  return r.phase === "online" ? { phase: "toPickup", request, elapsed: 0 } : r;
}

export function arrivePickup(r: Ride): Ride {
  return r.phase === "toPickup" ? { ...r, phase: "atPickup" } : r;
}

export function acceptRide(r: Ride): Ride {
  return r.phase === "atPickup" ? { ...r, phase: "boarding" } : r;
}

export function finishBoarding(r: Ride): Ride {
  return r.phase === "boarding" ? { ...r, phase: "riding", elapsed: 0 } : r;
}

export function arriveDrop(r: Ride): Ride {
  return r.phase === "riding" ? { ...r, phase: "alighting" } : r;
}

// Gets the fare, plus the speed bonus, and goes back online.
export function finishAlighting(r: Ride): { ride: Ride; paid: number } {
  if (r.phase !== "alighting" || !r.request) return { ride: r, paid: 0 };
  const { fare, distance } = r.request;
  return { ride: IDLE_RIDE, paid: fare + speedBonus(fare, r.elapsed, targetTimeS(distance)) };
}

// The customer gives up before they are in the vehicle. Never once they are on board.
export function cancelRide(r: Ride): Ride {
  return r.phase === "toPickup" || r.phase === "atPickup" ? IDLE_RIDE : r;
}

// Ride time counts only while the customer is in the vehicle.
export function tickRide(r: Ride, dt: number): Ride {
  return r.phase === "riding" ? { ...r, elapsed: r.elapsed + dt } : r;
}
