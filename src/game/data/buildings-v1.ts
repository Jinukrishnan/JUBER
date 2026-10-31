// The kinds of building the tech city is made of. Each has ranges for its size and number of floors, a
// weight (how common it is) and a palette its colour is picked from. Heights follow the distance from
// the city centre (see logic/catalogue.ts): towers and offices in the middle, homes and arcades outside.
export type BuildingTypeId = "tower" | "office" | "apartment" | "home" | "arcade";

export type BuildingType = {
  id: BuildingTypeId;
  width: [number, number]; // metres along the road
  depth: [number, number]; // metres back from it
  floors: [number, number];
  weight: number;
  palette: string[];
};

export const CITY_CENTRE = { x: 1700, z: 450 };

export const CITY_TYPES: BuildingType[] = [
  { id: "tower", width: [20, 28], depth: [20, 28], floors: [14, 30], weight: 2, palette: ["#7aa6c2", "#8fb4c9", "#6f8fa6", "#9aa7b0"] },
  { id: "office", width: [24, 34], depth: [18, 24], floors: [6, 12], weight: 3, palette: ["#a9b7c0", "#b9c2c8", "#8f9da6", "#c4cbd0"] },
  { id: "apartment", width: [18, 26], depth: [16, 22], floors: [5, 10], weight: 4, palette: ["#e3c9a8", "#d9b99a", "#e8d5b5", "#cfae93"] },
  { id: "home", width: [10, 14], depth: [10, 14], floors: [2, 3], weight: 3, palette: ["#f0d9b5", "#e6b8a2", "#c9d8b6", "#f2e2a4"] },
  { id: "arcade", width: [14, 20], depth: [12, 16], floors: [2, 4], weight: 3, palette: ["#e9a23b", "#d96c5f", "#5aa9a1", "#8e7cc3"] },
];
