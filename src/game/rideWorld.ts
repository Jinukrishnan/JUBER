import { PLACES } from "./data/places-v1";
import type { Place } from "./data/places-v1";
import { placeSpot, placesAreValid, usablePlaces } from "./logic/places";
import type { RequestWorld } from "./logic/requests";
import { buildGraph, route } from "./logic/roadgraph";
import { NETWORK } from "./world";

// What the ride logic needs to know about the world: the places, where each
// one's kerb spot is, and how far one place is from another by road, starting
// parked at the first one and facing the way its kerb traffic goes.
export const spotOf = (p: Place) => placeSpot(NETWORK, p);

for (const problem of placesAreValid(NETWORK, PLACES)) console.warn(problem);
const USABLE = usablePlaces(NETWORK, PLACES);

export const GRAPH = buildGraph(NETWORK, USABLE);

export const RIDE_WORLD: RequestWorld = {
  places: USABLE,
  spot: spotOf,
  distance: (a, b) => route(GRAPH, spotOf(a), b).length,
};
