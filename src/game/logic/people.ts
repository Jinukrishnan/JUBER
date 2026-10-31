// Deterministic passenger appearance, chosen from the passenger id so the same
// person looks the same wherever they are drawn. Kerala-style dress by age and
// gender; rendering lives in Person.tsx.

export type Kind = "boy" | "girl" | "man" | "woman" | "elderMan" | "elderWoman";
export type Outfit =
  | "tshirt-pants" // boy
  | "frock" // girl
  | "casual" // man
  | "formal" // man
  | "mundu" // old man: short white lungi
  | "churidhar" // woman
  | "sari" // woman
  | "formal-suit" // woman
  | "white-sari" // old woman
  | "school-boy" // white shirt, navy trousers, tie
  | "school-girl" // white blouse, navy pinafore skirt, plaits
  | "mundu-shirt"; // man in a coloured shirt and a white mundu with a border
export type BottomKind = "trousers" | "skirt" | "lungi" | "leggings" | "sari";
export type Footwear = "shoes" | "slippers" | "heels" | "sandals";
export type Extra = "tie" | "blazer" | "dupatta" | "pallu" | "goldBorder" | "bindi" | "shirtOpen";
export type HairStyle = "short" | "long" | "bun" | "thin" | "plaits";

export type PersonSpec = {
  kind: Kind;
  outfit: Outfit;
  scale: number;
  skin: string;
  hairColor: string;
  hairStyle: HairStyle;
  top: string;
  bottom: string;
  bottomKind: BottomKind;
  trim: string; // the border of a sari or mundu
  footwear: Footwear;
  footwearColor: string;
  extras: Extra[];
};

const WHITE = "#f5f2ea";
const GREY_HAIR = "#d8d8d8";
const SKIN = ["#c68c64", "#b57a52", "#a36a44", "#d6a077", "#8d5a3a"];
const HAIR = ["#1b1410", "#241a14", "#2e2018"];
const BRIGHT = ["#d94b4b", "#3a7bd5", "#2fa36b", "#f2a33a", "#7e57c2", "#14a3a3", "#e86aa0"];
const MUTED = ["#4a6fa5", "#6b8e5a", "#8c6d4f", "#5a5a6e", "#9a4d4d", "#3f6f7a"];
const TROUSERS = ["#2b2f3a", "#3a3f4b", "#4a4033", "#1f3a5f"];
const JEANS = ["#2f4a73", "#3b5b8c", "#26364f"];
const SARI_COLORS = ["#e0267a", "#1e8a6a", "#2c5aa0", "#c2185b", "#d4281e", "#e8641e"];
// a blouse that contrasts with the sari
const BLOUSE_COLORS = ["#6a2c91", "#1d3f8a", "#0f7a6a", "#f2c200", "#f4f4f0", "#2f2f6e"];
const GOLD = "#d4a82f";
const NAVY = "#1f2d5a";
const SCHOOL_WHITE = "#f4f4f0";
const SUIT_COLORS = ["#2a2f3d", "#3c3341", "#243b4a", "#4a3a3a"];
const FOOT_DARK = "#1c1a18";
const FOOT_BROWN = "#4a3426";
const SLIPPER = ["#2a6fb0", "#b0472a", "#3f3f3f"];

function hash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(id: string): () => number {
  let a = hash(id) ^ 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(r: () => number, list: readonly T[]): T {
  return list[Math.floor(r() * list.length)];
}

function kindFor(r: () => number): Kind {
  const x = r();
  if (x < 0.12) return "boy";
  if (x < 0.24) return "girl";
  if (x < 0.5) return "man";
  if (x < 0.78) return "woman";
  if (x < 0.89) return "elderMan";
  return "elderWoman";
}

export function personFor(id: string): PersonSpec {
  const r = rng(id);
  const kind = kindFor(r);
  const skin = pick(r, SKIN);
  const hairColor = pick(r, HAIR);
  const base = { kind, skin, hairColor, extras: [] as Extra[] };

  switch (kind) {
    case "boy": {
      const school = r() < 0.55;
      return school
        ? {
            ...base, outfit: "school-boy", scale: 0.72 + r() * 0.1, hairStyle: "short",
            top: SCHOOL_WHITE, bottom: NAVY, bottomKind: "trousers", trim: NAVY,
            footwear: "shoes", footwearColor: FOOT_DARK, extras: ["tie"],
          }
        : {
            ...base, outfit: "tshirt-pants", scale: 0.72 + r() * 0.1, hairStyle: "short",
            top: pick(r, BRIGHT), bottom: pick(r, JEANS), bottomKind: "trousers", trim: "#2f4a73",
            footwear: "shoes", footwearColor: pick(r, ["#e8e8e8", "#2a2a2a", "#b0472a"]),
          };
    }
    case "girl": {
      const school = r() < 0.55;
      return school
        ? {
            ...base, outfit: "school-girl", scale: 0.72 + r() * 0.1, hairStyle: "plaits",
            top: SCHOOL_WHITE, bottom: NAVY, bottomKind: "skirt", trim: NAVY,
            footwear: "shoes", footwearColor: FOOT_DARK, extras: ["tie"],
          }
        : {
            ...base, outfit: "frock", scale: 0.72 + r() * 0.1, hairStyle: "long",
            top: pick(r, BRIGHT), bottom: pick(r, BRIGHT), bottomKind: "skirt", trim: GOLD,
            footwear: "sandals", footwearColor: pick(r, SLIPPER), extras: ["bindi"],
          };
    }
    case "man": {
      const x = r();
      if (x < 0.3) {
        return {
          ...base, outfit: "formal", scale: 0.95 + r() * 0.08, hairStyle: "short",
          top: pick(r, ["#f4f4f0", "#cfe0f2", "#e9e3f0"]), bottom: pick(r, TROUSERS), bottomKind: "trousers", trim: "#2b2f3a",
          footwear: "shoes", footwearColor: FOOT_DARK, extras: ["tie", "blazer"],
        };
      }
      if (x < 0.55) {
        return {
          ...base, outfit: "mundu-shirt", scale: 0.93 + r() * 0.08, hairStyle: "short",
          top: pick(r, [...BRIGHT, ...MUTED]), bottom: WHITE, bottomKind: "lungi", trim: pick(r, [GOLD, "#8c1d2c", "#1f5f3a"]),
          footwear: "slippers", footwearColor: pick(r, SLIPPER), extras: [],
        };
      }
      return {
        ...base, outfit: "casual", scale: 0.93 + r() * 0.1, hairStyle: "short",
        top: pick(r, [...BRIGHT, ...MUTED]), bottom: pick(r, JEANS), bottomKind: "trousers", trim: "#2f4a73",
        footwear: "shoes", footwearColor: pick(r, [FOOT_BROWN, "#e8e8e8", FOOT_DARK]), extras: [],
      };
    }
    case "woman": {
      const x = r();
      if (x < 0.4) {
        return {
          ...base, outfit: "churidhar", scale: 0.88 + r() * 0.07, hairStyle: "long",
          top: pick(r, BRIGHT), bottom: pick(r, MUTED), bottomKind: "leggings", trim: GOLD,
          footwear: "sandals", footwearColor: pick(r, SLIPPER), extras: ["dupatta", "bindi"],
        };
      }
      if (x < 0.75) {
        const c = pick(r, SARI_COLORS);
        return {
          ...base, outfit: "sari", scale: 0.88 + r() * 0.07, hairStyle: "bun",
          top: pick(r, BLOUSE_COLORS), bottom: c, bottomKind: "sari", trim: GOLD,
          footwear: "sandals", footwearColor: FOOT_BROWN, extras: ["pallu", "goldBorder", "bindi"],
        };
      }
      return {
        ...base, outfit: "formal-suit", scale: 0.9 + r() * 0.07, hairStyle: "bun",
        top: pick(r, SUIT_COLORS), bottom: pick(r, SUIT_COLORS), bottomKind: "trousers", trim: "#2a2f3d",
        footwear: "heels", footwearColor: FOOT_DARK, extras: ["blazer"],
      };
    }
    case "elderMan":
      return {
        ...base, outfit: "mundu", scale: 0.9 + r() * 0.06, hairColor: GREY_HAIR, hairStyle: "thin",
        top: WHITE, bottom: WHITE, bottomKind: "lungi", trim: GOLD,
        footwear: "slippers", footwearColor: pick(r, SLIPPER), extras: ["shirtOpen"],
      };
    case "elderWoman":
      return {
        ...base, outfit: "white-sari", scale: 0.84 + r() * 0.06, hairColor: GREY_HAIR, hairStyle: "bun",
        top: WHITE, bottom: WHITE, bottomKind: "sari", trim: GOLD,
        footwear: "slippers", footwearColor: pick(r, SLIPPER), extras: ["pallu", "goldBorder"],
      };
  }
}
