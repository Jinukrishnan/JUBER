// The map is data. Roads and junctions are listed here; the road meshes, signals,
// turn rules, places, routes, radar and scenery all follow.
//
// Coordinates are metres: +x east, +z south (the driver's right when facing east).
// Traffic keeps left.
//
//   Road.points        corners of the centreline, in order
//   Road.closed        true for the ring (the last point joins the first)
//   Road.cornerRadius  corners are rounded with a quarter circle of this radius
//   Junction.at        where the centrelines cross
//   Junction.roads     the roads that meet there
//   Junction.allowed   which turns an approach may take, by approach id
//                      "<roadId>:<dir>" (dir 1 = travelling in the direction the
//                      road's points run, -1 = against it). An approach that is
//                      not listed allows every turn that exists.
export type RoadId = string;
export type TurnRule = "left" | "straight" | "right";

export type SignalSpec = {
  offset?: number; // seconds into the cycle at time 0
  mainGreen?: number; // default 28
  crossGreen?: number; // default 14
  yellow?: number; // default 3
  allRed?: number; // default 2
};

export type Road = {
  id: RoadId;
  name: string;
  ml: string;
  points: [number, number][];
  closed?: boolean;
  cornerRadius: number;
  halfWidth: number;
};

export type Junction = {
  id: string;
  at: [number, number];
  roads: RoadId[];
  signal: SignalSpec | false;
  allowed: Record<string, TurnRule[]>;
};

export type Network = { roads: Road[]; junctions: Junction[] };

export const ROAD_HALF_WIDTH = 6;

export const NETWORK_V1: Network = {
  roads: [
    {
      id: "ring",
      name: "Ring Road",
      ml: "റിംഗ് റോഡ്",
      points: [
        [0, 0],
        [800, 0],
        [800, 500],
        [0, 500],
      ],
      closed: true,
      cornerRadius: 40,
      halfWidth: ROAD_HALF_WIDTH,
    },
    {
      id: "ns",
      name: "Station Road",
      ml: "സ്റ്റേഷൻ റോഡ്",
      points: [
        [400, 0],
        [400, 500],
      ],
      cornerRadius: 0,
      halfWidth: ROAD_HALF_WIDTH,
    },
    {
      id: "ew",
      name: "Temple Road",
      ml: "ക്ഷേത്ര റോഡ്",
      points: [
        [0, 250],
        [800, 250],
      ],
      cornerRadius: 0,
      halfWidth: ROAD_HALF_WIDTH,
    },
  ],
  junctions: [
    // the stem may only turn left or right; from the west no right turn (carry on round the loop)
    { id: "north", at: [400, 0], roads: ["ring", "ns"], signal: { offset: 0 }, allowed: { "ns:-1": ["left", "right"], "ring:1": ["left", "straight"] } },
    { id: "south", at: [400, 500], roads: ["ring", "ns"], signal: { offset: 12 }, allowed: {} },
    { id: "west", at: [0, 250], roads: ["ring", "ew"], signal: { offset: 24 }, allowed: {} },
    { id: "east", at: [800, 250], roads: ["ring", "ew"], signal: { offset: 36 }, allowed: {} },
    // from the south no right turn, from the north no left turn
    { id: "centre", at: [400, 250], roads: ["ns", "ew"], signal: { offset: 6 }, allowed: { "ns:-1": ["left", "straight"], "ns:1": ["straight", "right"] } },
  ],
};
