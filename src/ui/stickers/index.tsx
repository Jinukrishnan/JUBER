import type { ReactNode } from "react";

type P = { className?: string };

// Original, hand-drawn-style SVG stickers. Each sits on a white die-cut outline.
function Sticker({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <svg
      viewBox="0 0 120 100"
      role="img"
      aria-label={label}
      className={className}
      style={{ filter: "drop-shadow(0 2px 0 rgba(0,0,0,.18))" }}
    >
      {children}
    </svg>
  );
}

const OUTLINE = { stroke: "#fff", strokeWidth: 8, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

export function BusSticker({ className }: P) {
  return (
    <Sticker className={className} label="Bus">
      <rect x="12" y="26" width="96" height="46" rx="9" fill="#fff" {...OUTLINE} />
      <rect x="12" y="26" width="96" height="46" rx="9" fill="#c8281a" />
      <rect x="12" y="26" width="96" height="22" rx="9" fill="#f3ead6" />
      <rect x="12" y="40" width="96" height="9" fill="#f2b705" />
      {[20, 42, 64].map((x) => (
        <rect key={x} x={x} y="30" width="17" height="11" rx="2" fill="#1b2a38" />
      ))}
      <rect x="88" y="30" width="15" height="19" rx="3" fill="#26384a" />
      <circle cx="34" cy="74" r="9" fill="#111" />
      <circle cx="34" cy="74" r="3.5" fill="#ccc" />
      <circle cx="84" cy="74" r="9" fill="#111" />
      <circle cx="84" cy="74" r="3.5" fill="#ccc" />
      <rect x="40" y="56" width="32" height="9" rx="2" fill="#f3ead6" />
    </Sticker>
  );
}

export function TeaSticker({ className }: P) {
  return (
    <Sticker className={className} label="Tea glass">
      <path d="M38 36 h44 l-5 46 a6 6 0 0 1 -6 5 h-22 a6 6 0 0 1 -6 -5 z" fill="#fff" {...OUTLINE} />
      <path d="M38 36 h44 l-5 46 a6 6 0 0 1 -6 5 h-22 a6 6 0 0 1 -6 -5 z" fill="#f1e4c8" />
      <path d="M41 50 h38 l-3.4 32 a4 4 0 0 1 -4 3.5 h-23 a4 4 0 0 1 -4 -3.5 z" fill="#b5651d" />
      <ellipse cx="60" cy="50" rx="19" ry="3.5" fill="#d58a3d" />
      <path d="M50 28 q-5 -8 0 -14 M60 26 q-5 -9 0 -16 M70 28 q-5 -8 0 -14" fill="none" stroke="#9aa" strokeWidth="3" strokeLinecap="round" />
    </Sticker>
  );
}

export function TicketSticker({ className }: P) {
  return (
    <Sticker className={className} label="Ticket">
      <path d="M12 28 h96 v14 a8 8 0 0 0 0 16 v14 h-96 v-14 a8 8 0 0 0 0 -16 z" fill="#fff" {...OUTLINE} />
      <path d="M12 28 h96 v14 a8 8 0 0 0 0 16 v14 h-96 v-14 a8 8 0 0 0 0 -16 z" fill="#ffd54f" />
      <line x1="84" y1="30" x2="84" y2="72" stroke="#7a5c00" strokeWidth="2" strokeDasharray="4 3" />
      <text x="24" y="56" fontFamily="monospace" fontWeight="800" fontSize="22" fill="#3b2b00">Rs.10</text>
      <text x="90" y="55" fontFamily="monospace" fontWeight="700" fontSize="9" fill="#3b2b00">No.</text>
      <text x="90" y="66" fontFamily="monospace" fontWeight="700" fontSize="9" fill="#3b2b00">042</text>
    </Sticker>
  );
}

export function PlateSticker({ className }: P) {
  return (
    <Sticker className={className} label="KL plate">
      <rect x="10" y="30" width="100" height="40" rx="7" fill="#fff" {...OUTLINE} />
      <rect x="10" y="30" width="100" height="40" rx="7" fill="#f7f1d1" stroke="#111" strokeWidth="3" />
      <rect x="15" y="35" width="14" height="30" rx="3" fill="#1d4ed8" />
      <text x="22" y="55" textAnchor="middle" fontFamily="sans-serif" fontWeight="800" fontSize="9" fill="#fff">IND</text>
      <text x="68" y="58" textAnchor="middle" fontFamily="monospace" fontWeight="800" fontSize="22" fill="#111">KL 15</text>
    </Sticker>
  );
}

export function ChaiSticker({ className }: P) {
  return (
    <Sticker className={className} label="Chai shop sign">
      <rect x="14" y="22" width="92" height="46" rx="6" fill="#fff" {...OUTLINE} />
      <rect x="14" y="22" width="92" height="46" rx="6" fill="#1f7a4d" />
      <rect x="19" y="27" width="82" height="36" rx="3" fill="none" stroke="#f3ead6" strokeWidth="2" />
      <text x="60" y="52" textAnchor="middle" fontFamily="sans-serif" fontWeight="800" fontSize="20" fill="#f3ead6">ചായ</text>
      <rect x="28" y="68" width="4" height="14" fill="#6b4a2b" />
      <rect x="88" y="68" width="4" height="14" fill="#6b4a2b" />
    </Sticker>
  );
}

export const AVATARS = [
  { id: "bus", label: "Bus", Component: BusSticker },
  { id: "tea", label: "Tea glass", Component: TeaSticker },
  { id: "ticket", label: "Ticket", Component: TicketSticker },
  { id: "plate", label: "KL plate", Component: PlateSticker },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];
