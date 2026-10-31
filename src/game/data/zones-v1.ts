// The zones of the big map: rectangles that say what an area is, so scenery, ground and
// (later) the map screens can follow. Where zones overlap the higher priority wins; anything
// outside every zone is countryside (hills). Malayalam names are invented.
export type ZoneKind = "village" | "city" | "park" | "lake" | "dam" | "hills";

export type Zone = { id: string; kind: ZoneKind; name: string; ml: string; x0: number; z0: number; x1: number; z1: number; priority: number };

export const ZONES: Zone[] = [
  { id: "hills", kind: "hills", name: "Countryside", ml: "നാട്ടിൻപുറം", x0: -3000, z0: -3000, x1: 5400, z1: 3900, priority: 0 },
  { id: "village", kind: "village", name: "Village", ml: "ഗ്രാമം", x0: -200, z0: -100, x1: 1000, z1: 700, priority: 1 },
  { id: "city", kind: "city", name: "Tech City", ml: "ടെക് സിറ്റി", x0: 1000, z0: -100, x1: 2400, z1: 1000, priority: 1 },
  { id: "lake", kind: "lake", name: "Lake", ml: "തടാകം", x0: 100, z0: -760, x1: 1400, z1: -160, priority: 2 },
  { id: "dam", kind: "dam", name: "Dam", ml: "അണക്കെട്ട്", x0: 100, z0: -160, x1: 1300, z1: -100, priority: 3 },
  { id: "park", kind: "park", name: "Central Park", ml: "സെൻട്രൽ പാർക്ക്", x0: 1500, z0: 250, x1: 1900, z1: 550, priority: 4 },
];
