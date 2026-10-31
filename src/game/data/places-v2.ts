import { PLACES, type Place } from "./places-v1";

// The places of the big map: the village's fourteen (Station Road now starts 150 m further north,
// at the Dam Road, so places on it are 150 m further along), then the dam and the tech city.
// Malayalam names are invented and need a native speaker's check. Keep a place 30 m from a
// junction box and 40 m from another place; the places test says when one is wrong.
const village: Place[] = PLACES.map((p) => (p.road === "ns" ? { ...p, s: p.s + 150 } : p));

const dam: Place[] = [
  { id: "jetty", name: "Boat Jetty", ml: "ബോട്ട് ജെട്ടി", road: "dam", s: 160, side: -1 },
  { id: "dam_view", name: "Dam View Point", ml: "ഡാം വ്യൂ പോയിന്റ്", road: "dam", s: 700, side: -1 },
  { id: "fishing_pier", name: "Fishing Pier", ml: "മീൻപിടുത്ത തുറ", road: "dam", s: 850, side: -1 },
  { id: "control_room", name: "Dam Control Room", ml: "ഡാം കൺട്രോൾ റൂം", road: "dam", s: 1100, side: 1 },
];

const city: Place[] = [
  // Tech Avenue
  { id: "city_mall", name: "City Mall", ml: "സിറ്റി മാൾ", road: "ew", s: 1200, side: 1 },
  { id: "tech_office", name: "Tech Park Office", ml: "ടെക് പാർക്ക് ഓഫീസ്", road: "ew", s: 1400, side: -1 },
  { id: "central_park_n", name: "Central Park North", ml: "സെൻട്രൽ പാർക്ക് നോർത്ത്", road: "ew", s: 1700, side: 1 },
  { id: "university", name: "Technical University", ml: "ടെക്നിക്കൽ യൂണിവേഴ്സിറ്റി", road: "ew", s: 2100, side: -1 },
  { id: "apartments", name: "Skyline Apartments", ml: "സ്കൈലൈൻ അപ്പാർട്ട്മെന്റ്സ്", road: "ew", s: 2200, side: 1 },
  // First Street
  { id: "city_hospital", name: "General Hospital", ml: "ജനറൽ ആശുപത്രി", road: "c1100", s: 275, side: 1, shelter: true },
  { id: "school_city", name: "International School", ml: "ഇന്റർനാഷണൽ സ്കൂൾ", road: "c1100", s: 550, side: 1, shelter: true },
  { id: "bus_terminal", name: "Bus Terminal", ml: "ബസ് ടെർമിനൽ", road: "c1100", s: 875, side: -1, shelter: true },
  // Second Street
  { id: "hotel", name: "Grand Hotel", ml: "ഗ്രാൻഡ് ഹോട്ടൽ", road: "c1300", s: 275, side: 1 },
  { id: "market", name: "City Market", ml: "സിറ്റി മാർക്കറ്റ്", road: "c1300", s: 550, side: -1, shelter: true },
  { id: "bank", name: "Federal Bank", ml: "ഫെഡറൽ ബാങ്ക്", road: "c1300", s: 875, side: -1 },
  // Park West Street
  { id: "tech_hub", name: "Tech Hub", ml: "ടെക് ഹബ്", road: "c1500", s: 125, side: 1 },
  { id: "park_w", name: "Central Park West Gate", ml: "സെൻട്രൽ പാർക്ക് പടിഞ്ഞാറൻ കവാടം", road: "c1500", s: 400, side: -1 },
  { id: "towers", name: "Twin Towers", ml: "ട്വിൻ ടവേഴ്സ്", road: "c1500", s: 725, side: 1 },
  // Park East Street
  { id: "offices_a", name: "Office Plaza", ml: "ഓഫീസ് പ്ലാസ", road: "c1900", s: 125, side: -1 },
  { id: "park_e", name: "Central Park East Gate", ml: "സെൻട്രൽ പാർക്ക് കിഴക്കൻ കവാടം", road: "c1900", s: 400, side: 1 },
  { id: "stadium", name: "City Stadium", ml: "സിറ്റി സ്റ്റേഡിയം", road: "c1900", s: 725, side: -1 },
  // Last Street
  { id: "homes_b", name: "Lake Homes", ml: "ലേക്ക് ഹോംസ്", road: "c2300", s: 125, side: -1 },
  { id: "homes_a", name: "Green Homes", ml: "ഗ്രീൻ ഹോംസ്", road: "c2300", s: 400, side: 1 },
  { id: "fire", name: "Fire Station", ml: "ഫയർ സ്റ്റേഷൻ", road: "c2300", s: 725, side: -1 },
  // the cross roads
  { id: "cinema", name: "Multiplex Cinema", ml: "മൾട്ടിപ്ലക്സ് സിനിമ", road: "r0", s: 100, side: 1 },
  { id: "cafe", name: "Cafe Street", ml: "കഫേ സ്ട്രീറ്റ്", road: "r550", s: 300, side: 1 },
  { id: "shops_a", name: "Shopping Arcade", ml: "ഷോപ്പിംഗ് ആർക്കേഡ്", road: "r550", s: 1000, side: -1 },
  { id: "warehouse", name: "Logistics Hub", ml: "ലോജിസ്റ്റിക്സ് ഹബ്", road: "r900", s: 600, side: 1 },
];

export const PLACES_V2: Place[] = [...village, ...dam, ...city];
