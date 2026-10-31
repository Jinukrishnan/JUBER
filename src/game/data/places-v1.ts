import type { RoadId } from "./network-v1";

// Named places where customers wait and want to go. Each stands on a road, `s`
// metres along it (see network-v1.ts for which way a road runs), on the left
// (-1) or right (+1) of that direction. The vehicle stops at the kerb on that
// side and the customers wait on the footpath behind it. Names are invented,
// Kerala-style.
//
// Keep a place at least 30 m from a junction box and 40 m from another place.
export type Place = { id: string; name: string; ml: string; road: RoadId; s: number; side: -1 | 1 };

export const PLACES: Place[] = [
  // the ring, east along the top, south down the right, west along the bottom, north up the left
  { id: "depot", name: "Aanawadi Depot", ml: "ആനവാടി ഡിപ്പോ", road: "ring", s: 100, side: -1 },
  { id: "thennalpadi", name: "Thennalpadi", ml: "തെന്നൽപ്പടി", road: "ring", s: 250, side: 1 },
  { id: "mullakkunnu", name: "Mullakkunnu", ml: "മുല്ലക്കുന്ന്", road: "ring", s: 520, side: -1 },
  { id: "karimbanam", name: "Karimbanam", ml: "കരിമ്പനം", road: "ring", s: 880, side: 1 },
  { id: "vattakkulam", name: "Vattakkulam", ml: "വട്ടക്കുളം", road: "ring", s: 1100, side: -1 },
  { id: "chembolimukku", name: "Chembolimukku", ml: "ചെമ്പോലിമുക്ക്", road: "ring", s: 1400, side: 1 },
  { id: "nellimala", name: "Nellimala Junction", ml: "നെല്ലിമല ജംഗ്ഷൻ", road: "ring", s: 1800, side: -1 },
  { id: "panchayat", name: "Panchayat Office", ml: "പഞ്ചായത്ത് ഓഫീസ്", road: "ring", s: 2130, side: 1 },
  { id: "church", name: "St. Mary's Church", ml: "സെന്റ് മേരീസ് പള്ളി", road: "ring", s: 2400, side: -1 },
  // Station Road, north to south
  { id: "hospital", name: "Govt. Hospital", ml: "ഗവ. ആശുപത്രി", road: "ns", s: 120, side: -1 },
  { id: "temple", name: "Ayyappan Temple", ml: "അയ്യപ്പ ക്ഷേത്രം", road: "ns", s: 380, side: 1 },
  // Temple Road, west to east
  { id: "school", name: "Primary School", ml: "പ്രൈമറി സ്കൂൾ", road: "ew", s: 200, side: -1 },
  { id: "paddy", name: "Paddy Farm", ml: "പാടശേഖരം", road: "ew", s: 330, side: 1 },
  { id: "masjid", name: "Juma Masjid", ml: "ജുമാ മസ്ജിദ്", road: "ew", s: 600, side: 1 },
];
