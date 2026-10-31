// The three vehicles a driver can take out. Every number that tunes the game
// for a vehicle lives here: handling, size, fares, rent and the daily goal.
export type VehicleKind = "bike" | "auto" | "car";

export type Vehicle = {
  kind: VehicleKind;
  name: string;
  capacity: 1 | 2 | 3; // most passengers in one booking
  length: number; // metres
  width: number;
  wheelbase: number;
  maxSpeed: number; // m/s forward
  accel: number; // m/s^2
  maxSteer: number; // radians at a crawl
  maxLateralAccel: number; // m/s^2 of sideways pull before it slides: bikes lean, autos tip
  riderSeats: [number, number, number][]; // where each passenger sits: forward, seat height, right
  eye: [number, number, number]; // driver's eye: forward, up, right of the vehicle's centre
  headRoom: number; // how high a seated head may reach: just under the roof (no limit on a bike)
  baseFare: number; // Rs
  farePer100m: number; // Rs per 100 m of route
  rent: number; // Rs taken at the start of the day
  goal: number; // Rs net to reach by the end of the day
};

export const VEHICLES: Record<VehicleKind, Vehicle> = {
  bike: {
    kind: "bike",
    name: "Yamaha R15",
    capacity: 1,
    length: 2.1,
    width: 0.8,
    wheelbase: 1.4,
    maxSpeed: 22,
    accel: 7,
    maxSteer: 0.7,
    maxLateralAccel: 6,
    riderSeats: [[-0.6, 1.03, 0]],
    eye: [0.2, 1.45, 0],
    headRoom: 9,
    baseFare: 33,
    farePer100m: 12,
    rent: 100,
    goal: 600,
  },
  auto: {
    kind: "auto",
    name: "Auto-rickshaw",
    capacity: 2,
    length: 2.7,
    width: 1.4,
    wheelbase: 2.0,
    maxSpeed: 14,
    accel: 3.5,
    maxSteer: 0.55,
    maxLateralAccel: 2.5,
    riderSeats: [
      [-0.7, 0.78, 0.28],
      [-0.7, 0.78, -0.28],
    ],
    eye: [0.5, 1.4, 0.3],
    headRoom: 1.72,
    baseFare: 72,
    farePer100m: 34,
    rent: 200,
    goal: 850,
  },
  car: {
    kind: "car",
    name: "Maruti Swift Dzire",
    capacity: 3,
    length: 4.4,
    width: 1.8,
    wheelbase: 2.5,
    maxSpeed: 18,
    accel: 5,
    maxSteer: 0.6,
    maxLateralAccel: 3.5,
    riderSeats: [
      [-0.75, 0.97, 0.45],
      [-0.75, 0.97, 0],
      [-0.75, 0.97, -0.45],
    ],
    eye: [0.35, 1.25, 0.4],
    headRoom: 1.42,
    baseFare: 74,
    farePer100m: 37,
    rent: 300,
    goal: 1300,
  },
};

export const VEHICLE_KINDS: VehicleKind[] = ["bike", "auto", "car"];

export function isVehicleKind(x: unknown): x is VehicleKind {
  return x === "bike" || x === "auto" || x === "car";
}
