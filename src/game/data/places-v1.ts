import { ROUTE_V1 } from "./route-v1";

// Named places where customers wait and want to go. The seven on the main road
// are the old bus-stop shelters (they keep their boards and kerb bays); the
// others stand on the side roads. Names are invented, Kerala-style.
//
// A main-road place says which kerb its customers wait on: "left" is the kerb
// for traffic heading forward (+x), "right" the one for traffic coming back.
// A side-road place sits on the left kerb of the way out, `distance` metres
// from the main road's centre line, on side -1 (left of the road) or 1 (right).
export type PlaceAt =
  | { kind: "main"; x: number; side: "left" | "right" }
  | { kind: "arm"; junctionId: string; side: -1 | 1; distance: number };

export type Place = { id: string; name: string; ml: string; at: PlaceAt };

const main: Place[] = ROUTE_V1.map((s, i) => ({
  id: s.id,
  name: s.name,
  ml: s.ml,
  at: { kind: "main", x: s.position, side: i % 2 === 0 ? "left" : "right" },
}));

const arms: Place[] = [
  { id: "panchayat", name: "Panchayat Office", ml: "പഞ്ചായത്ത് ഓഫീസ്", at: { kind: "arm", junctionId: "j400", side: -1, distance: 90 } },
  { id: "church", name: "St. Mary's Church", ml: "സെന്റ് മേരീസ് പള്ളി", at: { kind: "arm", junctionId: "j400", side: 1, distance: 110 } },
  { id: "paddy", name: "Paddy Farm", ml: "പാടശേഖരം", at: { kind: "arm", junctionId: "j700", side: -1, distance: 140 } },
  { id: "masjid", name: "Juma Masjid", ml: "ജുമാ മസ്ജിദ്", at: { kind: "arm", junctionId: "j1000", side: 1, distance: 100 } },
  { id: "hospital", name: "Govt. Hospital", ml: "ഗവ. ആശുപത്രി", at: { kind: "arm", junctionId: "j1300", side: -1, distance: 130 } },
  { id: "temple", name: "Ayyappan Temple", ml: "അയ്യപ്പ ക്ഷേത്രം", at: { kind: "arm", junctionId: "j1300", side: 1, distance: 90 } },
  { id: "school", name: "Primary School", ml: "പ്രൈമറി സ്കൂൾ", at: { kind: "arm", junctionId: "j1575", side: -1, distance: 100 } },
];

export const PLACES: Place[] = [...main, ...arms];
