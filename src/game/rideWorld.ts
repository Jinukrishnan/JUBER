import { PLACES, type Place } from "./data/places-v1";
import { placeSpot } from "./logic/places";
import type { RequestWorld } from "./logic/requests";
import { JUNCTIONS } from "./world";

// What the ride logic needs to know about the world: the places, where each
// one's kerb spot is, and how far apart two places are by road.
export const spotOf = (p: Place) => placeSpot(p, JUNCTIONS);

export const RIDE_WORLD: RequestWorld = {
  places: PLACES,
  spot: spotOf,
  // straight-line for now; the road graph replaces this with the route length
  distance: (a, b) => {
    const sa = spotOf(a);
    const sb = spotOf(b);
    return Math.hypot(sa.x - sb.x, sa.z - sb.z);
  },
};
