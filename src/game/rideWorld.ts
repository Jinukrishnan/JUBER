import type { Place } from "./data/places-v1";
import { placeSpot } from "./logic/places";
import type { RequestWorld } from "./logic/requests";
import { buildGraph, route } from "./logic/roadgraph";
import { ACTIVE_PLACES, NETWORK } from "./world";

// What the ride logic needs to know about the world: the places, where each
// one's kerb spot is, and how far one place is from another by road, starting
// parked at the first one and facing the way its kerb traffic goes.
export const spotOf = (p: Place) => placeSpot(NETWORK, p);

export const GRAPH = buildGraph(NETWORK, ACTIVE_PLACES);

export const RIDE_WORLD: RequestWorld = {
  places: ACTIVE_PLACES,
  spot: spotOf,
  distance: (a, b) => route(GRAPH, spotOf(a), b).length,
};
