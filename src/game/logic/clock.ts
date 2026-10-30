import {
  DAY_END_HOUR,
  DAY_REAL_SECONDS,
  DAY_START_HOUR,
} from "../constants";

export function advanceClock(
  elapsedRealS: number,
  dtS: number,
): { elapsedRealS: number; hour: number; ended: boolean } {
  const elapsed = elapsedRealS + dtS;
  const t = Math.min(1, elapsed / DAY_REAL_SECONDS);
  const hour = DAY_START_HOUR + t * (DAY_END_HOUR - DAY_START_HOUR);
  return { elapsedRealS: elapsed, hour, ended: elapsed >= DAY_REAL_SECONDS };
}

export function formatClock(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.floor((hour - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
