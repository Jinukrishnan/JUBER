import { stopsBetween } from "./route";

export type Passenger = {
  id: string;
  origin: number;
  destination: number;
  fare: number;
  patience: number;
  // place in the bus once aboard (see logic/seats.ts)
  seat?: number;
};

const BASE_FARE = 10;
const PER_EXTRA_STOP = 5;

export function fareFor(stopsTravelled: number): number {
  return BASE_FARE + PER_EXTRA_STOP * Math.max(0, stopsTravelled - 1);
}

export function makePassenger(
  id: string,
  origin: number,
  destination: number,
  patience: number,
): Passenger {
  return {
    id,
    origin,
    destination,
    fare: fareFor(stopsBetween(origin, destination)),
    patience,
  };
}
