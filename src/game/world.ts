import { JUNCTIONS_V1 } from "./data/junctions-v1";
import { ROUTE_V1 } from "./data/route-v1";
import { validateJunctions } from "./logic/junction";
import { roadFeatures } from "./logic/roadside";

// The junctions the game actually uses: the configured list with any bad entry
// left out (and a message in the console saying why).
export const JUNCTIONS = (() => {
  const { problems, valid } = validateJunctions(JUNCTIONS_V1, ROUTE_V1, roadFeatures(ROUTE_V1));
  for (const p of problems) console.warn(p);
  return valid;
})();
