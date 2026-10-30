export type Stop = { id: string; name: string; position: number };
export type Direction = "forward" | "backward";

export function flipDirection(dir: Direction): Direction {
  return dir === "forward" ? "backward" : "forward";
}

export function nextStopIndex(
  stops: Stop[],
  position: number,
  dir: Direction,
): number | null {
  if (dir === "forward") {
    const i = stops.findIndex((s) => s.position > position);
    return i === -1 ? null : i;
  }
  for (let i = stops.length - 1; i >= 0; i--) {
    if (stops[i].position < position) return i;
  }
  return null;
}

export function stopsAhead(
  fromIndex: number,
  toIndex: number,
  dir: Direction,
): boolean {
  return dir === "forward" ? toIndex > fromIndex : toIndex < fromIndex;
}

export function stopsBetween(a: number, b: number): number {
  return Math.abs(a - b);
}

export function zoneAt(
  stops: Stop[],
  position: number,
  radius: number,
): number | null {
  const i = stops.findIndex((s) => Math.abs(s.position - position) <= radius);
  return i === -1 ? null : i;
}

// True once the bus is clearly past the stop in its direction of travel, so a
// small overshoot (or reversing back in) is not treated as a missed stop.
export function passedStop(
  stops: Stop[],
  index: number,
  position: number,
  dir: Direction,
  margin: number,
): boolean {
  const at = stops[index].position;
  return dir === "forward" ? position > at + margin : position < at - margin;
}
