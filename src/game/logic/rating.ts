export type RatingEvents = {
  missedStops: number;
  expiredPassengers: number;
  harshEvents: number;
  carried: number;
};

export function computeRating(e: RatingEvents): number {
  const raw =
    5 - 0.5 * e.missedStops - 0.25 * e.expiredPassengers - 0.1 * e.harshEvents;
  const clamped = Math.min(5, Math.max(1, raw));
  return Math.round(clamped * 2) / 2;
}
