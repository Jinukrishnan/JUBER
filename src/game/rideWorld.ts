import { PLACES } from "./data/places-v1";
import type { Place } from "./data/places-v1";
import { placeSpot } from "./logic/places";
import type { RequestWorld } from "./logic/requests";
import { buildGraph, route } from "./logic/roadgraph";
import { JUNCTIONS } from "./world";

// What the ride logic needs to know about the world: the places, where each
// one's kerb spot is, and how far apart two places are by road.
export const spotOf = (p: Place) => placeSpot(p, JUNCTIONS);

export const GRAPH = buildGraph(JUNCTIONS, PLACES);

export const RIDE_WORLD: RequestWorld = {
  places: PLACES,
  spot: spotOf,
  distance: (a, b) => route(GRAPH, spotOf(a), b).length,
};
