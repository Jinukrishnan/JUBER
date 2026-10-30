export type RatingEvents = {
  missedStops: number;
  expiredPassengers: number;
  harshEvents: number;
  carried: number;
  accidents?: number;
};

// Passengers who give up waiting are mostly down to the timetable, not the
// driver, so they weigh far less than a stop the driver actually skipped.
const EXPIRED_WEIGHT = 0.02;
const EXPIRED_MAX = 0.5; // even a long day of unserved queues costs at most half a star

export function computeRating(e: RatingEvents): number {
  const raw =
    5 -
    0.5 * e.missedStops -
    Math.min(EXPIRED_MAX, EXPIRED_WEIGHT * e.expiredPassengers) -
    0.1 * e.harshEvents -
    (e.accidents ?? 0);
  const clamped = Math.min(5, Math.max(1, raw));
  return Math.round(clamped * 2) / 2;
}
