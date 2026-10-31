import type { Step, Turn } from "./roadgraph";

// Distances as a driver would hear them: to the nearest 5 m up to 100 m, then 10 m.
export function roundDistance(m: number): number {
  return m < 100 ? Math.round(m / 5) * 5 : Math.round(m / 10) * 10;
}

const NOW_M = 10; // closer than this, it is "now" or "here"

// The words for the next step: "Turn left in 80 m", "Paddy Farm on the left in 120 m".
export function describeStep(step: Step, distance: number, placeName: string): string {
  const d = roundDistance(distance);
  const near = d <= NOW_M;
  switch (step.turn) {
    case "left":
    case "right":
      return near ? `Turn ${step.turn} now` : `Turn ${step.turn} in ${d} m`;
    case "straight":
      return near ? "Straight on through the junction" : `Straight on through the junction in ${d} m`;
    case "uturn":
      return near ? "Make a U-turn" : `Make a U-turn in ${d} m`;
    case "arrive": {
      const side = step.side ? ` on the ${step.side}` : "";
      return near ? `${placeName} is here${side}` : `${placeName}${side} in ${d} m`;
    }
  }
}

const ARROWS: Record<Turn, string> = { left: "↰", right: "↱", straight: "↑", uturn: "↶", arrive: "⚑" };

export function arrowFor(turn: Turn): string {
  return ARROWS[turn];
}
