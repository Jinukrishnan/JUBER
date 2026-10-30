import { PLACES } from "./data/places-v1";
import type { Place } from "./data/places-v1";
import { placeSpot, placesAreValid, usablePlaces } from "./logic/places";
import type { RequestWorld } from "./logic/requests";
import { buildGraph, route } from "./logic/roadgraph";
import { JUNCTIONS } from "./world";

// What the ride logic needs to know about the world: the places, where each
// one's kerb spot is, and how far apart two places are by road.
export const spotOf = (p: Place) => placeSpot(p, JUNCTIONS);

for (const problem of placesAreValid(PLACES, JUNCTIONS)) console.warn(problem);
const USABLE = usablePlaces(PLACES, JUNCTIONS);

export const GRAPH = buildGraph(JUNCTIONS, USABLE);

export const RIDE_WORLD: RequestWorld = {
  places: USABLE,
  spot: spotOf,
  distance: (a, b) => route(GRAPH, spotOf(a), b).length,
};
