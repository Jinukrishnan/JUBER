import { JUNCTIONS_V1 } from "./data/junctions-v1";
import { ROUTE_V1 } from "./data/route-v1";
import { validateJunctions } from "./logic/junction";
import { layoutScenery } from "./logic/layout";
import { polePositions, roadFeatures } from "./logic/roadside";

// The junctions the game actually uses: the configured list with any bad entry
// left out (and a message in the console saying why).
export const JUNCTIONS = (() => {
  const { problems, valid } = validateJunctions(JUNCTIONS_V1, ROUTE_V1, roadFeatures(ROUTE_V1));
  for (const p of problems) console.warn(p);
  return valid;
})();

export const SCENERY_SEED = 20261030;

// The roadside layout the scene draws: built against the validated junctions,
// so nothing is laid out on a side road.
export function buildScenery() {
  return layoutScenery(SCENERY_SEED, ROUTE_V1, roadFeatures(ROUTE_V1), JUNCTIONS);
}

// Electric pole positions, kept out of the mouths of the side roads.
export function scenePoles(): { x: number }[] {
  return polePositions(ROUTE_V1, JUNCTIONS).map((x) => ({ x }));
}
