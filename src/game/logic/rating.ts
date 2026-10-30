export type RatingEvents = {
  harshEvents: number; // scrapes against the kerb
  expiredPickups: number; // accepted customers who gave up waiting
  accidents: number;
  violations: number; // red lights
};

const EXPIRED_PICKUP_WEIGHT = 0.25;
const EXPIRED_PICKUP_MAX = 1;

// Five stars, less a penalty for each thing that went wrong, in half-star steps.
export function computeRating(e: RatingEvents): number {
  const raw =
    5 -
    e.accidents -
    0.5 * e.violations -
    Math.min(EXPIRED_PICKUP_MAX, EXPIRED_PICKUP_WEIGHT * e.expiredPickups) -
    0.1 * e.harshEvents;
  const clamped = Math.min(5, Math.max(1, raw));
  return Math.round(clamped * 2) / 2;
}
