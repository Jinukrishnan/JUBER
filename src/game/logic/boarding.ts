import type { Passenger } from "./fares";
import { stopsAhead, type Direction } from "./route";

export type TransferArgs = {
  stopIndex: number;
  dir: Direction;
  onboard: Passenger[];
  waiting: Passenger[];
  capacity: number;
  isTerminus: boolean;
};

export function planTransfer(args: TransferArgs): {
  alight: Passenger[];
  board: Passenger[];
} {
  const { stopIndex, dir, onboard, waiting, capacity, isTerminus } = args;

  const alight = onboard.filter(
    (p) => isTerminus || p.destination === stopIndex,
  );
  if (isTerminus) return { alight, board: [] };

  const free = capacity - (onboard.length - alight.length);
  const board = waiting
    .filter((p) => stopsAhead(stopIndex, p.destination, dir))
    .slice(0, Math.max(0, free));

  return { alight, board };
}
