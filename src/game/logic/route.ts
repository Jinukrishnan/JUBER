// A main-road place as the world still knows it: a Malayalam-named shelter at a
// position along the road. Rides use these as places (see data/places-v1.ts).
export type Stop = { id: string; name: string; ml: string; position: number };

// Which way along the main road a vehicle is facing: +x is forward.
export type Direction = "forward" | "backward";
