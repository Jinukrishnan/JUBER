import type { Stop } from "../logic/route";

// Invented, Kerala-style stop names; positions are metres along the road.
export const ROUTE_V1: Stop[] = [
  { id: "depot", name: "Aanawadi Depot", position: 0 },
  { id: "thennalpadi", name: "Thennalpadi", position: 450 },
  { id: "mullakkunnu", name: "Mullakkunnu", position: 1000 },
  { id: "karimbanam", name: "Karimbanam", position: 1600 },
  { id: "vattakkulam", name: "Vattakkulam", position: 2200 },
  { id: "chembolimukku", name: "Chembolimukku", position: 2800 },
  { id: "nellimala", name: "Nellimala Junction", position: 3300 },
];
