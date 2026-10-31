import type { ReactElement } from "react";
import type { VehicleKind } from "@/game/data/vehicles";

// Flat cartoon pictures of the three vehicles: bold colours, thick dark outlines,
// a white glint on the glass. Each has a side, a front and a back view. The
// picker uses the side view; docs/design/vehicle-cartoon-concept.html shows all nine.
export type VehicleView = "side" | "front" | "back";

const INK = "#0f172a";
const GLASS = "#475569";
const GLINT = "rgba(255,255,255,0.5)";
const outline = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round", strokeLinecap: "round" } as const;
const thin = { ...outline, strokeWidth: 2 } as const;

function Wheel({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#1e293b" {...outline} />
      <circle cx={cx} cy={cy} r={r * 0.52} fill="#cbd5e1" {...thin} />
      <circle cx={cx} cy={cy} r={r * 0.16} fill={INK} />
    </g>
  );
}

// a tall tyre seen end-on, for the front and back views
function Tyre({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return <rect x={x} y={y} width={w} height={h} rx={Math.min(w, h) / 3} fill="#1e293b" {...outline} />;
}

const shadow = (cx: number, rx: number, y = 98) => <ellipse cx={cx} cy={y} rx={rx} ry={5} fill={INK} opacity={0.3} />;

// ---- orange sports car ----
const ORANGE = "#f97316";
const ORANGE_DARK = "#ea580c";
const RED = "#dc2626";
const YELLOW = "#facc15";

function CarSide() {
  return (
    <>
      {shadow(102, 90)}
      <path d="M14 50 L46 46 L48 55 L16 59 Z" fill={RED} {...outline} />
      <path d="M31 55 L31 66" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <path
        d="M12 80 Q12 66 28 63 L52 58 Q62 40 94 38 L124 38 Q146 41 158 58 L182 64 Q194 68 194 80 L194 86 Q194 90 188 90 L18 90 Q12 90 12 84 Z"
        fill={ORANGE}
        {...outline}
      />
      <path d="M14 80 L192 80 L194 86 Q194 90 188 90 L18 90 Q12 90 12 84 Z" fill={ORANGE_DARK} />
      <path d="M62 58 Q70 44 94 42 L112 42 L112 58 Z" fill={GLASS} {...thin} />
      <path d="M118 42 L126 42 Q142 46 150 58 L118 58 Z" fill={GLASS} {...thin} />
      <path d="M72 55 L88 45" stroke={GLINT} strokeWidth={3} strokeLinecap="round" />
      <path d="M124 52 L134 46" stroke={GLINT} strokeWidth={3} strokeLinecap="round" />
      <polygon points="76,66 108,66 100,75 130,71 98,88 104,77 72,77" fill={YELLOW} {...thin} />
      <path d="M185 65 L194 68 L194 75 L183 75 Z" fill="#fef08a" {...thin} />
      <rect x="11" y="66" width="7" height="9" rx="2" fill="#ef4444" {...thin} />
      <Wheel cx={50} cy={88} r={17} />
      <Wheel cx={152} cy={88} r={17} />
    </>
  );
}

function CarFront({ back }: { back?: boolean }) {
  return (
    <>
      {shadow(70, 62)}
      {back && <rect x="18" y="13" width="104" height="9" rx="3" fill={RED} {...outline} />}
      <path d="M30 42 Q34 20 70 18 Q106 20 110 42 Z" fill={ORANGE} {...outline} />
      <path d="M39 42 Q43 27 70 25 Q97 27 101 42 Z" fill={GLASS} {...thin} />
      <path d="M50 38 L60 30" stroke={GLINT} strokeWidth={3} strokeLinecap="round" />
      <rect x="14" y="40" width="112" height="44" rx="14" fill={ORANGE} {...outline} />
      <rect x="16" y="72" width="108" height="10" rx="5" fill={ORANGE_DARK} />
      {back ? (
        <>
          <rect x="22" y="52" width="24" height="12" rx="3" fill="#ef4444" {...thin} />
          <rect x="94" y="52" width="24" height="12" rx="3" fill="#ef4444" {...thin} />
          <rect x="54" y="52" width="32" height="12" rx="2" fill="#f8fafc" {...thin} />
          <circle cx="42" cy="82" r="5" fill="#94a3b8" {...thin} />
          <circle cx="98" cy="82" r="5" fill="#94a3b8" {...thin} />
        </>
      ) : (
        <>
          <rect x="21" y="50" width="22" height="13" rx="4" fill="#fef08a" {...thin} />
          <rect x="97" y="50" width="22" height="13" rx="4" fill="#fef08a" {...thin} />
          <rect x="48" y="54" width="44" height="14" rx="3" fill={INK} />
          {[58, 62, 66].map((y) => (
            <line key={y} x1="51" x2="89" y1={y - 2} y2={y - 2} stroke="#64748b" strokeWidth={1.5} />
          ))}
          <polygon points="66,72 76,72 72,78 80,76 70,86 72,80 64,80" fill={YELLOW} {...thin} transform="translate(0,-2)" />
        </>
      )}
      <Tyre x={6} y={68} w={14} h={30} />
      <Tyre x={120} y={68} w={14} h={30} />
    </>
  );
}

// ---- blue sports bike ----
const BLUE = "#0284c7";
const BLUE_LIGHT = "#0ea5e9";

function BikeSide() {
  return (
    <>
      {shadow(100, 92)}
      <path d="M150 38 L160 78" stroke={INK} strokeWidth={6} strokeLinecap="round" />
      <path d="M150 38 L160 78" stroke="#94a3b8" strokeWidth={2.5} strokeLinecap="round" />
      <rect x="82" y="62" width="38" height="16" rx="4" fill="#334155" {...outline} />
      <path d="M32 50 L52 44 L55 54 L36 58 Z" fill={BLUE} {...outline} />
      <path d="M52 44 L80 42 L84 52 L55 56 Z" fill="#111827" {...outline} />
      <path d="M72 46 Q98 30 128 42 L130 62 L80 68 Z" fill={BLUE_LIGHT} {...outline} />
      <path d="M112 40 L144 40 L162 56 L148 74 L112 70 L100 52 Z" fill={BLUE} {...outline} />
      <path d="M128 40 L142 20 L152 25 L142 44 Z" fill="#7dd3fc" opacity={0.85} {...thin} />
      <path d="M118 48 L126 44" stroke={GLINT} strokeWidth={3} strokeLinecap="round" />
      <ellipse cx="154" cy="55" rx="6" ry="5" fill="#fef08a" {...thin} />
      <path d="M42 74 L100 82" stroke={INK} strokeWidth={9} strokeLinecap="round" />
      <path d="M42 74 L100 82" stroke="#cbd5e1" strokeWidth={5} strokeLinecap="round" />
      <Wheel cx={40} cy={78} r={22} />
      <Wheel cx={160} cy={78} r={22} />
    </>
  );
}

function BikeFront({ back }: { back?: boolean }) {
  return (
    <>
      {shadow(70, 40)}
      <Tyre x={58} y={58} w={24} h={42} />
      {back ? (
        <>
          <rect x="52" y="14" width="36" height="8" rx="3" fill="#111827" {...outline} />
          <path d="M44 22 L96 22 L90 62 L50 62 Z" fill={BLUE} {...outline} />
          <rect x="56" y="30" width="28" height="10" rx="3" fill="#ef4444" {...thin} />
          <rect x="18" y="62" width="28" height="9" rx="4" fill="#cbd5e1" {...outline} />
          <rect x="94" y="62" width="28" height="9" rx="4" fill="#cbd5e1" {...outline} />
        </>
      ) : (
        <>
          <rect x="14" y="20" width="22" height="9" rx="4" fill={INK} transform="rotate(-20 25 24)" />
          <rect x="104" y="20" width="22" height="9" rx="4" fill={INK} transform="rotate(20 115 24)" />
          <path d="M52 14 L70 6 L88 14 L84 28 L56 28 Z" fill="#7dd3fc" opacity={0.85} {...thin} />
          <path d="M34 30 Q70 20 106 30 L96 74 Q70 82 44 74 Z" fill={BLUE} {...outline} />
          <ellipse cx="54" cy="46" rx="11" ry="8" fill="#fef08a" {...thin} />
          <ellipse cx="86" cy="46" rx="11" ry="8" fill="#fef08a" {...thin} />
          <path d="M46 62 L94 62" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        </>
      )}
    </>
  );
}

// ---- yellow and green auto-rickshaw ----
const GREEN = "#16a34a";
const GREEN_DARK = "#15803d";
const CANOPY = "#facc15";

function AutoSide() {
  return (
    <>
      {shadow(104, 88)}
      <path d="M32 26 Q92 6 150 28 L152 42 L32 42 Z" fill={CANOPY} {...outline} />
      <path d="M44 42 L44 56 M130 42 L130 56" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <path d="M150 28 L168 56 L152 56 Z" fill="#bae6fd" opacity={0.85} {...thin} />
      <path d="M26 48 L130 48 L134 58 L164 62 Q178 64 178 78 L178 88 L26 88 Z" fill={GREEN} {...outline} />
      <path d="M28 78 L176 78 L178 88 L26 88 Z" fill={GREEN_DARK} />
      <rect x="46" y="54" width="70" height="30" rx="5" fill={INK} />
      <rect x="52" y="68" width="34" height="14" rx="3" fill="#fde047" {...thin} />
      <path d="M140 60 L166 64 Q178 66 178 80 L178 88 L140 88 Z" fill="#1e293b" {...outline} />
      <circle cx="176" cy="74" r="5" fill="#fef08a" {...thin} />
      <path d="M156 38 L164 30 M156 38 L168 40" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <path d="M24 56 L24 70" stroke="#ef4444" strokeWidth={5} strokeLinecap="round" />
      <Wheel cx={58} cy={88} r={14} />
      <Wheel cx={156} cy={88} r={13} />
    </>
  );
}

function AutoFront({ back }: { back?: boolean }) {
  return (
    <>
      {shadow(70, 56)}
      <rect x="18" y="8" width="104" height="44" rx="18" fill={CANOPY} {...outline} />
      {back ? (
        <>
          <rect x="30" y="18" width="80" height="22" rx="6" fill="#1e293b" {...thin} />
          <rect x="22" y="50" width="96" height="40" rx="8" fill={GREEN} {...outline} />
          <rect x="30" y="58" width="22" height="12" rx="3" fill="#ef4444" {...thin} />
          <rect x="88" y="58" width="22" height="12" rx="3" fill="#ef4444" {...thin} />
          <rect x="56" y="62" width="28" height="12" rx="2" fill="#f8fafc" {...thin} />
          <Tyre x={14} y={72} w={18} h={28} />
          <Tyre x={108} y={72} w={18} h={28} />
        </>
      ) : (
        <>
          <rect x="30" y="17" width="80" height="26" rx="8" fill="#bae6fd" opacity={0.9} {...thin} />
          <path d="M42 36 L58 22" stroke={GLINT} strokeWidth={3} strokeLinecap="round" />
          <rect x="24" y="50" width="92" height="38" rx="9" fill={GREEN} {...outline} />
          <rect x="50" y="56" width="40" height="26" rx="9" fill="#1e293b" {...outline} />
          <circle cx="70" cy="69" r="8" fill="#fef08a" {...thin} />
          <rect x="6" y="30" width="14" height="8" rx="3" fill={INK} />
          <rect x="120" y="30" width="14" height="8" rx="3" fill={INK} />
          <Tyre x={58} y={74} w={24} h={26} />
        </>
      )}
    </>
  );
}

const ART: Record<VehicleKind, Record<VehicleView, () => ReactElement>> = {
  car: { side: () => <CarSide />, front: () => <CarFront />, back: () => <CarFront back /> },
  bike: { side: () => <BikeSide />, front: () => <BikeFront />, back: () => <BikeFront back /> },
  auto: { side: () => <AutoSide />, front: () => <AutoFront />, back: () => <AutoFront back /> },
};

export function VehicleArt({ kind, view = "side", className }: { kind: VehicleKind; view?: VehicleView; className?: string }) {
  return (
    <svg viewBox={view === "side" ? "0 0 200 104" : "0 0 140 104"} className={className} aria-hidden="true">
      {ART[kind][view]()}
    </svg>
  );
}
