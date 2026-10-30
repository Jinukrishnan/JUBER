import type { Stop } from "../logic/route";

// Invented, Kerala-style stop names; positions are metres along the road.
export const ROUTE_V1: Stop[] = [
  { id: "depot", name: "Aanawadi Depot", position: 0 },
  { id: "thennalpadi", name: "Thennalpadi", position: 250 },
  { id: "mullakkunnu", name: "Mullakkunnu", position: 550 },
  { id: "karimbanam", name: "Karimbanam", position: 850 },
  { id: "vattakkulam", name: "Vattakkulam", position: 1150 },
  { id: "chembolimukku", name: "Chembolimukku", position: 1450 },
  { id: "nellimala", name: "Nellimala Junction", position: 1700 },
];
