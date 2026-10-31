// The big map: the village (the old ring road and its two cross roads) in the west, the
// tech city's street grid in the east, and Dam Road along the top of the dam in the north.
// Coordinates are metres (+x east, +z south); the village keeps its V1 coordinates.
// Junctions are not listed one by one: every crossing or T of the roads below is a junction
// (see autoJunctions). Malayalam names are invented and need a native speaker's check.
import { autoJunctions } from "../logic/junctions";
import { ROAD_HALF_WIDTH, type Network, type Road, type TurnRule } from "./network-v1";

const street = (id: string, name: string, ml: string, points: [number, number][]): Road => ({
  id,
  name,
  ml,
  points,
  cornerRadius: 0,
  halfWidth: ROAD_HALF_WIDTH,
});

const ROADS: Road[] = [
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
  // starts at the Dam Road, so a place on it is 150 m further along than it was on the old map
  street("ns", "Station Road", "സ്റ്റേഷൻ റോഡ്", [[400, -150], [400, 500]]),
  street("ew", "Tech Avenue", "ടെക് അവന്യൂ", [[0, 250], [2300, 250]]),
  // starts at Station Road: a road end that leads nowhere would collect traffic for ever
  street("dam", "Dam Road", "അണക്കെട്ട് റോഡ്", [[400, -150], [1300, -150]]),
  street("c1100", "First Street", "ഫസ്റ്റ് സ്ട്രീറ്റ്", [[1100, -150], [1100, 900]]),
  street("c1300", "Second Street", "സെക്കൻഡ് സ്ട്രീറ്റ്", [[1300, -150], [1300, 900]]),
  street("c1500", "Park West Street", "പാർക്ക് വെസ്റ്റ് സ്ട്രീറ്റ്", [[1500, 0], [1500, 900]]),
  street("c1900", "Park East Street", "പാർക്ക് ഈസ്റ്റ് സ്ട്രീറ്റ്", [[1900, 0], [1900, 900]]),
  street("c2300", "Last Street", "ലാസ്റ്റ് സ്ട്രീറ്റ്", [[2300, 0], [2300, 900]]),
  street("r0", "North Cross Road", "നോർത്ത് ക്രോസ് റോഡ്", [[1100, 0], [2300, 0]]),
  street("r550", "Middle Cross Road", "മിഡിൽ ക്രോസ് റോഡ്", [[1100, 550], [2300, 550]]),
  street("r900", "South Cross Road", "സൗത്ത് ക്രോസ് റോഡ്", [[1100, 900], [2300, 900]]),
];

// Turn rules by crossing ("x,z"); an approach that is not listed allows every turn.
export const JUNCTION_RULES: Record<string, { id?: string; allowed: Record<string, TurnRule[]> }> = {
  // from the west no right turn (carry on round the loop)
  "400,0": { id: "north", allowed: { "ring:1": ["left", "straight"] } },
  // from the south no right turn, from the north no left turn
  "400,250": { id: "centre", allowed: { "ns:-1": ["left", "straight"], "ns:1": ["straight", "right"] } },
  "400,500": { id: "south", allowed: {} },
  "0,250": { id: "west", allowed: {} },
  "800,250": { id: "east", allowed: {} },
  // city rules, so the rules can be seen: going east on the avenue no right turn at Park West Street (into the street south),
  // going south on Park East Street no right turn at the Middle Cross Road (west, the park side),
  // going west on the North Cross Road no right turn at Second Street (north, towards the dam)
  "1500,250": { allowed: { "ew:1": ["left", "straight"] } },
  "1900,550": { allowed: { "c1900:1": ["left", "straight"] } },
  "1300,0": { allowed: { "r0:-1": ["left", "straight"] } },
};

export const NETWORK_V2: Network = { roads: ROADS, junctions: autoJunctions(ROADS, JUNCTION_RULES) };
