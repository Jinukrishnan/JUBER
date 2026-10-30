// Junctions are data. Add, remove or move one by editing this list: the side
// road, its markings, the signals and the scenery clearance all follow.
//
//   x          metres along the route (the bus stops are at 0, 250, 550, ...)
//   arms       which side the side road goes: "left", "right" or "both"
//   armLength  metres to the dead end, which has a turn-around area (default 200)
//   signal     traffic light timings in seconds, or false for no signal
//
// Keep a junction at least 90 m from a bus stop, 45 m from a zebra crossing and
// 150 m from another junction. Bad ones are ignored with a message in the console.
export type ArmSide = "left" | "right" | "both";

export type SignalSpec = {
  offset?: number; // seconds into the cycle at time 0
  mainGreen?: number; // default 28
  crossGreen?: number; // default 14
  yellow?: number; // default 3
  allRed?: number; // default 2
};

export type Junction = {
  id: string;
  x: number;
  arms: ArmSide;
  armLength?: number;
  armHalfWidth?: number;
  signal?: SignalSpec | false;
};

export const JUNCTIONS_V1: Junction[] = [
  { id: "j400", x: 400, arms: "both", signal: { offset: 0 } },
  { id: "j700", x: 700, arms: "left", signal: { offset: 12 } },
  { id: "j1000", x: 1000, arms: "right", signal: { offset: 24 } },
  { id: "j1300", x: 1300, arms: "both", signal: { offset: 36 } },
  { id: "j1575", x: 1575, arms: "left", signal: { offset: 6 } },
];
