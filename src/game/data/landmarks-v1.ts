// The big buildings the city's named places are known for. Each stands behind the footpath on its place's
// side of the road, centred on the place; the layout slides one along the road if it does not fit.
export type LandmarkKind = "mall" | "hospital" | "stadium" | "university" | "office" | "towers" | "apartments" | "hotel" | "bank" | "market";

export type Landmark = { place: string; kind: LandmarkKind; width: number; depth: number; floors: number; color: string };

export const LANDMARKS: Landmark[] = [
  { place: "city_mall", kind: "mall", width: 60, depth: 40, floors: 4, color: "#d8c9a8" },
  { place: "city_hospital", kind: "hospital", width: 50, depth: 35, floors: 6, color: "#e9eef0" },
  { place: "stadium", kind: "stadium", width: 80, depth: 60, floors: 3, color: "#b9b2a6" },
  { place: "university", kind: "university", width: 70, depth: 40, floors: 5, color: "#c9a27e" },
  { place: "tech_office", kind: "office", width: 40, depth: 30, floors: 14, color: "#7aa6c2" },
  { place: "towers", kind: "towers", width: 30, depth: 30, floors: 30, color: "#8fb4c9" },
  { place: "apartments", kind: "apartments", width: 30, depth: 25, floors: 12, color: "#e3c9a8" },
  { place: "hotel", kind: "hotel", width: 24, depth: 20, floors: 10, color: "#d9b99a" },
  { place: "bank", kind: "bank", width: 20, depth: 18, floors: 4, color: "#b9c2c8" },
  { place: "market", kind: "market", width: 36, depth: 26, floors: 2, color: "#d96c5f" },
];
