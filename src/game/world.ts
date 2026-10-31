import { NETWORK_V2 } from "./data/network-v2";
import { PLACES_V2 } from "./data/places-v2";
import { validateNetwork } from "./logic/network";
import { usablePlaces } from "./logic/places";
import { layoutScenery } from "./logic/layout";
import { roadFeatures } from "./logic/roadside";



// The map the game uses: the configured network with any bad part left out (and
// a message in the console saying why).
export const NETWORK = (() => {
  const { problems, valid } = validateNetwork(NETWORK_V2, PLACES_V2);
  for (const p of problems) console.warn(p);
  return valid;
})();

// The places that fit this map (one that does not is left out, with a message).
export const ACTIVE_PLACES = (() => {
  const usable = usablePlaces(NETWORK, PLACES_V2);
  for (const p of PLACES_V2) if (!usable.includes(p)) console.warn(`Place "${p.id}" does not fit the map and is left out`);
  return usable;
})();

export const FEATURES = roadFeatures(NETWORK, ACTIVE_PLACES);

export const SCENERY_SEED = 20261030;

// The roadside layout the scene draws, built against the validated network.
export function buildScenery() {
  return layoutScenery(SCENERY_SEED, NETWORK, ACTIVE_PLACES, FEATURES);
}
