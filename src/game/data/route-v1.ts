import type { Stop } from "../logic/route";

// Invented, Kerala-style stop names (English + Malayalam for the boards);
// positions are metres along the road.
export const ROUTE_V1: Stop[] = [
  { id: "depot", name: "Aanawadi Depot", ml: "ആനവാടി ഡിപ്പോ", position: 0 },
  { id: "thennalpadi", name: "Thennalpadi", ml: "തെന്നൽപ്പടി", position: 250 },
  { id: "mullakkunnu", name: "Mullakkunnu", ml: "മുല്ലക്കുന്ന്", position: 550 },
  { id: "karimbanam", name: "Karimbanam", ml: "കരിമ്പനം", position: 850 },
  { id: "vattakkulam", name: "Vattakkulam", ml: "വട്ടക്കുളം", position: 1150 },
  { id: "chembolimukku", name: "Chembolimukku", ml: "ചെമ്പോലിമുക്ക്", position: 1450 },
  { id: "nellimala", name: "Nellimala Junction", ml: "നെല്ലിമല ജംഗ്ഷൻ", position: 1700 },
];
