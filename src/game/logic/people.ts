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
  | "white-sari"; // old woman
export type BottomKind = "trousers" | "skirt" | "lungi" | "leggings" | "sari";
export type Footwear = "shoes" | "slippers" | "heels" | "sandals";
export type Extra = "tie" | "blazer" | "dupatta" | "pallu" | "goldBorder" | "bindi" | "shirtOpen";
export type HairStyle = "short" | "long" | "bun" | "thin";

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
const SARI_COLORS = ["#c0392b", "#1e8a6a", "#2c5aa0", "#8e44ad", "#d4a017", "#c2185b"];
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
    case "boy":
      return {
        ...base, outfit: "tshirt-pants", scale: 0.72 + r() * 0.1, hairStyle: "short",
        top: pick(r, BRIGHT), bottom: pick(r, JEANS), bottomKind: "trousers",
        footwear: "shoes", footwearColor: pick(r, ["#e8e8e8", "#2a2a2a", "#b0472a"]),
      };
    case "girl":
      return {
        ...base, outfit: "frock", scale: 0.72 + r() * 0.1, hairStyle: "long",
        top: pick(r, BRIGHT), bottom: pick(r, BRIGHT), bottomKind: "skirt",
        footwear: "sandals", footwearColor: pick(r, SLIPPER), extras: ["bindi"],
      };
    case "man": {
      const formal = r() < 0.45;
      return formal
        ? {
            ...base, outfit: "formal", scale: 0.95 + r() * 0.08, hairStyle: "short",
            top: pick(r, ["#f4f4f0", "#cfe0f2", "#e9e3f0"]), bottom: pick(r, TROUSERS), bottomKind: "trousers",
            footwear: "shoes", footwearColor: FOOT_DARK, extras: ["tie", "blazer"],
          }
        : {
            ...base, outfit: "casual", scale: 0.93 + r() * 0.1, hairStyle: "short",
            top: pick(r, [...BRIGHT, ...MUTED]), bottom: pick(r, JEANS), bottomKind: "trousers",
            footwear: "shoes", footwearColor: pick(r, [FOOT_BROWN, "#e8e8e8", FOOT_DARK]), extras: [],
          };
    }
    case "woman": {
      const x = r();
      if (x < 0.4) {
        return {
          ...base, outfit: "churidhar", scale: 0.88 + r() * 0.07, hairStyle: "long",
          top: pick(r, BRIGHT), bottom: pick(r, MUTED), bottomKind: "leggings",
          footwear: "sandals", footwearColor: pick(r, SLIPPER), extras: ["dupatta", "bindi"],
        };
      }
      if (x < 0.75) {
        const c = pick(r, SARI_COLORS);
        return {
          ...base, outfit: "sari", scale: 0.88 + r() * 0.07, hairStyle: "bun",
          top: c, bottom: c, bottomKind: "sari",
          footwear: "sandals", footwearColor: FOOT_BROWN, extras: ["pallu", "goldBorder", "bindi"],
        };
      }
      return {
        ...base, outfit: "formal-suit", scale: 0.9 + r() * 0.07, hairStyle: "bun",
        top: pick(r, SUIT_COLORS), bottom: pick(r, SUIT_COLORS), bottomKind: "trousers",
        footwear: "heels", footwearColor: FOOT_DARK, extras: ["blazer"],
      };
    }
    case "elderMan":
      return {
        ...base, outfit: "mundu", scale: 0.9 + r() * 0.06, hairColor: GREY_HAIR, hairStyle: "thin",
        top: WHITE, bottom: WHITE, bottomKind: "lungi",
        footwear: "slippers", footwearColor: pick(r, SLIPPER), extras: ["shirtOpen"],
      };
    case "elderWoman":
      return {
        ...base, outfit: "white-sari", scale: 0.84 + r() * 0.06, hairColor: GREY_HAIR, hairStyle: "bun",
        top: WHITE, bottom: WHITE, bottomKind: "sari",
        footwear: "slippers", footwearColor: pick(r, SLIPPER), extras: ["pallu", "goldBorder"],
      };
  }
}
