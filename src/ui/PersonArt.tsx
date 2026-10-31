import type { ReactElement } from "react";

// Flat cartoon people, in the same bold style as the vehicles: thick dark outlines, flat
// colours, a little highlight. Each outfit the game dresses a person in has a drawing,
// seen from the front or the back (the formal suit is drawn as the formal man). docs/design/people-cartoon-concept.html shows them all.
export type PersonOutfit =
  | "sari"
  | "churidhar"
  | "casual"
  | "formal"
  | "mundu-shirt"
  | "mundu"
  | "white-sari"
  | "school-boy"
  | "school-girl"
  | "tshirt-pants"
  | "frock";

export const PERSON_OUTFITS: PersonOutfit[] = ["sari", "churidhar", "casual", "formal", "mundu-shirt", "mundu", "white-sari", "school-boy", "school-girl", "tshirt-pants", "frock"];

const INK = "#0f172a";
const o = { stroke: INK, strokeWidth: 2.5, strokeLinejoin: "round", strokeLinecap: "round" } as const;
const thin = { ...o, strokeWidth: 1.6 } as const;

type Look = {
  skin: string;
  hair: string;
  style: "short" | "bun" | "plaits" | "long" | "thin";
  top: string;
  bottom: string;
  trim: string;
  scale: number;
  bindi?: boolean;
};

const SKIN = "#c68c64";
const WHITE = "#f5f2ea";
const GOLD = "#d4a82f";
const NAVY = "#1f2d5a";

const LOOKS: Record<PersonOutfit, Look> = {
  sari: { skin: SKIN, hair: "#1b1410", style: "bun", top: "#6a2c91", bottom: "#e0267a", trim: GOLD, scale: 1, bindi: true },
  churidhar: { skin: "#b57a52", hair: "#241a14", style: "long", top: "#2fa36b", bottom: "#3f6f7a", trim: GOLD, scale: 1, bindi: true },
  casual: { skin: "#a36a44", hair: "#1b1410", style: "short", top: "#3a7bd5", bottom: "#2f4a73", trim: "#2f4a73", scale: 1.04 },
  formal: { skin: "#d6a077", hair: "#241a14", style: "short", top: "#f4f4f0", bottom: "#2b2f3a", trim: "#2b2f3a", scale: 1.04 },
  "mundu-shirt": { skin: "#b57a52", hair: "#1b1410", style: "short", top: "#d94b4b", bottom: WHITE, trim: GOLD, scale: 1.02 },
  mundu: { skin: "#a36a44", hair: "#d8d8d8", style: "thin", top: WHITE, bottom: WHITE, trim: GOLD, scale: 0.97 },
  "white-sari": { skin: "#b57a52", hair: "#d8d8d8", style: "bun", top: WHITE, bottom: WHITE, trim: GOLD, scale: 0.92 },
  "school-boy": { skin: "#c68c64", hair: "#1b1410", style: "short", top: "#f4f4f0", bottom: NAVY, trim: NAVY, scale: 0.78 },
  "school-girl": { skin: "#d6a077", hair: "#241a14", style: "plaits", top: "#f4f4f0", bottom: NAVY, trim: NAVY, scale: 0.78 },
  "tshirt-pants": { skin: "#8d5a3a", hair: "#1b1410", style: "short", top: "#f2a33a", bottom: "#3b5b8c", trim: "#3b5b8c", scale: 0.78 },
  frock: { skin: "#c68c64", hair: "#241a14", style: "long", top: "#e86aa0", bottom: "#e86aa0", trim: GOLD, scale: 0.78, bindi: true },
};

function Head({ l, back }: { l: Look; back: boolean }) {
  return (
    <g>
      <rect x="45" y="40" width="10" height="9" rx="3" fill={l.skin} {...thin} />
      {l.style === "plaits" && [33, 67].map((x) => (
        <g key={x}>
          <path d={`M${x} 34 Q${x + (x < 50 ? -6 : 6)} 52 ${x + (x < 50 ? -3 : 3)} 62`} stroke={INK} strokeWidth="9" fill="none" strokeLinecap="round" />
          <path d={`M${x} 34 Q${x + (x < 50 ? -6 : 6)} 52 ${x + (x < 50 ? -3 : 3)} 62`} stroke={l.hair} strokeWidth="5.5" fill="none" strokeLinecap="round" />
          <circle cx={x + (x < 50 ? -3 : 3)} cy="62" r="3.2" fill="#d7263d" {...thin} />
        </g>
      ))}
      {l.style === "long" && <path d="M33 30 Q31 52 36 60 L64 60 Q69 52 67 30 Z" fill={l.hair} {...o} />}
      {l.style === "bun" && <circle cx="50" cy="14" r="7" fill={l.hair} {...o} />}
      <circle cx="50" cy="31" r="15" fill={l.skin} {...o} />
      {/* hair cap */}
      <path
        d={l.style === "thin" ? "M36 26 Q50 12 64 26 Q50 20 36 26 Z" : back ? "M35 31 Q35 14 50 14 Q65 14 65 31 Q50 42 35 31 Z" : "M35 28 Q36 14 50 14 Q64 14 65 28 Q50 20 35 28 Z"}
        fill={l.hair}
        {...thin}
      />
      {!back && (
        <g>
          <circle cx="44" cy="31" r="1.8" fill={INK} />
          <circle cx="56" cy="31" r="1.8" fill={INK} />
          <path d="M41 27 L47 26.5 M53 26.5 L59 27" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M50 33 L48.5 37 L51.5 37" stroke="#7a4a30" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M45.5 40 Q50 43 54.5 40" stroke="#8c3a3a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          {l.bindi && <circle cx="50" cy="24.5" r="1.6" fill="#c0152b" />}
        </g>
      )}
      {[35, 65].map((x) => (
        <circle key={x} cx={x} cy="32" r="3" fill={l.skin} {...thin} />
      ))}
    </g>
  );
}

function Arms({ l, sleeve, longSleeves = false }: { l: Look; sleeve: string; longSleeves?: boolean }) {
  return (
    <g>
      {[-1, 1].map((d) => {
        const x = 50 + d * 22;
        return (
          <g key={d}>
            <path d={`M${50 + d * 16} 52 L${x + d * 3} 84 L${x + d * 1} 112`} stroke={INK} strokeWidth="11" fill="none" strokeLinecap="round" />
            <path d={`M${50 + d * 16} 52 L${x + d * 3} 84`} stroke={sleeve} strokeWidth="8" fill="none" strokeLinecap="round" />
            <path d={`M${x + d * 3} 84 L${x + d * 1} 112`} stroke={longSleeves ? sleeve : l.skin} strokeWidth="8" fill="none" strokeLinecap="round" />
            <circle cx={x + d * 1} cy="114" r="5" fill={l.skin} {...thin} />
          </g>
        );
      })}
    </g>
  );
}

function Legs({ color, y = 118, shoe = "#2a2a2a" }: { color: string; y?: number; shoe?: string }) {
  return (
    <g>
      {[-1, 1].map((d) => (
        <g key={d}>
          <rect x={d < 0 ? 38 : 51} y={y} width="11" height={186 - y} rx="4" fill={color} {...o} />
          <path d={`M${d < 0 ? 36 : 50} 189 L${d < 0 ? 50 : 64} 189 L${d < 0 ? 50 : 64} 194 L${d < 0 ? 33 : 47} 194 Z`} fill={shoe} {...thin} />
        </g>
      ))}
    </g>
  );
}

function Figure({ outfit, back }: { outfit: PersonOutfit; back: boolean }) {
  const l = LOOKS[outfit];
  const body: Record<PersonOutfit, () => ReactElement> = {
    sari: () => (
      <>
        <Legs color={l.skin} y={150} shoe="#4a3426" />
        <path d="M31 92 L69 92 L77 186 L23 186 Z" fill={l.bottom} {...o} />
        {[44, 50, 56].map((x) => (
          <path key={x} d={`M${x} 98 L${x + (x - 50) * 0.6} 184`} stroke={INK} strokeWidth="1" opacity="0.35" />
        ))}
        <rect x="23" y="176" width="54" height="10" fill={l.trim} {...thin} />
        <rect x="24" y="170" width="52" height="3" fill={l.trim} />
        <rect x="35" y="82" width="30" height="12" fill={l.skin} {...thin} />
        <path d="M34 50 L66 50 L64 84 L36 84 Z" fill={l.top} {...o} />
        <Arms l={l} sleeve={l.top} />
        {/* the pallu over the shoulder */}
        <path d={back ? "M36 52 L66 52 L70 138 L52 140 Z" : "M62 50 L72 56 L40 132 L30 124 Z"} fill={l.bottom} {...o} />
        {!back && <path d="M66 54 L40 129" stroke={l.trim} strokeWidth="3" strokeLinecap="round" />}
      </>
    ),
    churidhar: () => (
      <>
        <Legs color={l.bottom} y={120} shoe="#2a6fb0" />
        <path d="M33 50 L67 50 L72 134 L28 134 Z" fill={l.top} {...o} />
        <rect x="28" y="128" width="44" height="6" fill={l.trim} {...thin} />
        <Arms l={l} sleeve={l.top} longSleeves />
        <path d="M34 54 Q50 70 66 56 L70 120 L60 122 Q50 90 40 84 Z" fill="#f2c200" {...thin} opacity="0.95" />
      </>
    ),
    casual: () => (
      <>
        <Legs color={l.bottom} y={104} />
        <path d="M33 50 L67 50 L66 108 L34 108 Z" fill={l.top} {...o} />
        <Arms l={l} sleeve={l.top} />
        <path d="M50 50 L50 108" stroke={INK} strokeWidth="1.4" />
      </>
    ),
    formal: () => (
      <>
        <Legs color={l.bottom} y={106} />
        <path d="M31 50 L69 50 L68 114 L32 114 Z" fill={l.bottom} {...o} />
        <path d="M43 50 L50 70 L57 50 Z" fill={l.top} {...thin} />
        {!back && <path d="M50 54 L47 62 L50 90 L53 62 Z" fill="#a3262a" {...thin} />}
        <Arms l={l} sleeve={l.bottom} longSleeves />
      </>
    ),
    "mundu-shirt": () => (
      <>
        <Legs color={l.skin} y={150} shoe="#2a6fb0" />
        <path d="M32 98 L68 98 L74 168 L26 168 Z" fill={l.bottom} {...o} />
        <rect x="26" y="160" width="48" height="8" fill={l.trim} {...thin} />
        <path d="M33 50 L67 50 L66 104 L34 104 Z" fill={l.top} {...o} />
        <Arms l={l} sleeve={l.top} />
        <path d="M50 50 L50 104" stroke={INK} strokeWidth="1.4" />
      </>
    ),
    mundu: () => (
      <>
        <Legs color={l.skin} y={150} shoe="#2a6fb0" />
        <path d="M32 98 L68 98 L74 160 L26 160 Z" fill={l.bottom} {...o} />
        <rect x="26" y="152" width="48" height="8" fill={l.trim} {...thin} />
        <path d="M33 50 L67 50 L66 100 L34 100 Z" fill={l.top} {...o} />
        <path d="M47 50 L50 78 L53 50 Z" fill={l.skin} {...thin} />
        <Arms l={l} sleeve={l.top} />
      </>
    ),
    "white-sari": () => (
      <>
        <Legs color={l.skin} y={150} shoe="#2a6fb0" />
        <path d="M31 92 L69 92 L76 186 L24 186 Z" fill={l.bottom} {...o} />
        <rect x="24" y="176" width="52" height="10" fill={l.trim} {...thin} />
        <path d="M34 50 L66 50 L64 94 L36 94 Z" fill={l.top} {...o} />
        <Arms l={l} sleeve={l.top} />
        <path d={back ? "M36 52 L66 52 L70 138 L52 140 Z" : "M62 50 L72 56 L40 132 L30 124 Z"} fill={l.bottom} {...o} />
        {!back && <path d="M66 54 L40 129" stroke={l.trim} strokeWidth="3" strokeLinecap="round" />}
      </>
    ),
    "school-boy": () => (
      <>
        <Legs color={l.bottom} y={106} />
        <path d="M33 50 L67 50 L66 110 L34 110 Z" fill={l.top} {...o} />
        {!back && <path d="M50 54 L47 62 L50 92 L53 62 Z" fill="#8c1d2c" {...thin} />}
        <Arms l={l} sleeve={l.top} />
        <rect x="34" y="104" width="32" height="5" fill="#2a2a2a" />
      </>
    ),
    "school-girl": () => (
      <>
        <Legs color={l.skin} y={140} shoe="#2a2a2a" />
        <path d="M34 50 L66 50 L65 84 L35 84 Z" fill={l.top} {...o} />
        <path d="M31 84 L69 84 L77 148 L23 148 Z" fill={l.bottom} {...o} />
        <path d="M37 52 L63 52 L64 86 L36 86 Z" fill={l.bottom} {...thin} />
        {!back && <path d="M50 54 L47 62 L50 82 L53 62 Z" fill="#8c1d2c" {...thin} />}
        <Arms l={l} sleeve={l.top} />
      </>
    ),
    "tshirt-pants": () => (
      <>
        <Legs color={l.bottom} y={106} shoe="#e8e8e8" />
        <path d="M33 50 L67 50 L66 110 L34 110 Z" fill={l.top} {...o} />
        <Arms l={l} sleeve={l.top} />
        <circle cx="50" cy="76" r="5" fill="#ffffff" opacity="0.7" />
      </>
    ),
    frock: () => (
      <>
        <Legs color={l.skin} y={142} shoe="#2a6fb0" />
        <path d="M34 50 L66 50 L64 84 L36 84 Z" fill={l.top} {...o} />
        <path d="M33 84 L67 84 L80 148 L20 148 Z" fill={l.bottom} {...o} />
        <rect x="20" y="142" width="60" height="6" fill={l.trim} {...thin} />
        <Arms l={l} sleeve={l.top} />
      </>
    ),
  };
  return (
    <g transform={`translate(${50 - 50 * l.scale} ${200 - 200 * l.scale}) scale(${l.scale})`}>
      <ellipse cx="50" cy="196" rx="30" ry="4" fill={INK} opacity="0.28" />
      {body[outfit]()}
      <Head l={l} back={back} />
    </g>
  );
}

export function PersonArt({ outfit, back = false, className }: { outfit: PersonOutfit; back?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 100 200" className={className} aria-hidden="true">
      <Figure outfit={outfit} back={back} />
    </svg>
  );
}
