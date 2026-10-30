"use client";

import { useMemo, type RefObject } from "react";
import { CanvasTexture, SRGBColorSpace, type Group } from "three";
import { APP_NAME } from "./constants";

// KSRTC-style stage-carriage bus, built from boxes. +x is the front.
const L = 10;
const W = 2.6;
const HALF_L = L / 2;
const HALF_W = W / 2;

const YELLOW = "#dfae3a";
const CREAM = "#efe3c2";
const RED = "#b3302a";
const DARK = "#26282c";
const GLASS = "#1c2c3a";

function useLabel(draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");
    if (g) draw(g, w, h);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
    // draw is a stable module-level function at every call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h]);
}

function drawBoard(g: CanvasRenderingContext2D, w: number, h: number) {
  g.fillStyle = "#f6f1e3";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "#b3302a";
  g.lineWidth = 6;
  g.strokeRect(3, 3, w - 6, h - 6);
  g.fillStyle = "#b3302a";
  g.font = "bold 56px Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("KSRTC", w / 2, h / 2 + 2);
}

function drawPlate(g: CanvasRenderingContext2D, w: number, h: number) {
  g.fillStyle = "#f7f1d1";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "#111";
  g.lineWidth = 4;
  g.strokeRect(2, 2, w - 4, h - 4);
  g.fillStyle = "#111";
  g.font = "bold 34px monospace";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("KL 15 A 4738", w / 2, h / 2 + 1);
}

function drawBadge(g: CanvasRenderingContext2D, w: number, h: number) {
  g.fillStyle = YELLOW;
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#7a1a14";
  g.font = "bold 40px Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(APP_NAME, w / 2, h / 2 + 2);
}

function Wheel({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0.55, z]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.55, 0.55, 0.42, 20]} />
        <meshStandardMaterial color="#101010" />
      </mesh>
      <mesh position={[0, z > 0 ? 0.22 : -0.22, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.04, 16]} />
        <meshStandardMaterial color="#9aa0a6" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

export function BusModel({ doorRef }: { doorRef: RefObject<Group | null> }) {
  const board = useLabel(drawBoard, 256, 64);
  const plate = useLabel(drawPlate, 256, 64);
  const badge = useLabel(drawBadge, 256, 64);

  const windows = Array.from({ length: 8 }, (_, i) => -4.0 + i * 0.95);

  return (
    <group>
      {/* red lower body with a yellow waist line and cream band above it */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[L, 1.3, W]} />
        <meshStandardMaterial color={RED} />
      </mesh>
      <mesh position={[0, 1.34, 0]}>
        <boxGeometry args={[L + 0.02, 0.07, W + 0.02]} />
        <meshStandardMaterial color={YELLOW} />
      </mesh>
      <mesh position={[0, 1.78, 0]}>
        <boxGeometry args={[L + 0.02, 0.16, W + 0.02]} />
        <meshStandardMaterial color={CREAM} />
      </mesh>

      {/* yellow upper body */}
      <mesh position={[0, 2.55, 0]} castShadow>
        <boxGeometry args={[L, 1.42, W]} />
        <meshStandardMaterial color={YELLOW} />
      </mesh>
      {/* roof, with a small overhanging visor at the front */}
      <mesh position={[0, 3.31, 0]} castShadow>
        <boxGeometry args={[L - 0.1, 0.14, W - 0.16]} />
        <meshStandardMaterial color={CREAM} />
      </mesh>
      <mesh position={[HALF_L + 0.12, 3.42, 0]}>
        <boxGeometry args={[0.32, 0.07, W - 0.1]} />
        <meshStandardMaterial color={RED} />
      </mesh>

      {/* side windows, both sides */}
      {windows.map((x) =>
        [-1, 1].map((side) => (
          <mesh key={`${x}${side}`} position={[x, 2.6, side * (HALF_W + 0.015)]}>
            <boxGeometry args={[0.78, 0.82, 0.03]} />
            <meshStandardMaterial color={GLASS} metalness={0.4} roughness={0.15} />
          </mesh>
        )),
      )}

      {/* ---- FRONT ---- */}
      {/* two-pane windscreen with a centre post */}
      {[-0.62, 0.62].map((z) => (
        <mesh key={z} position={[HALF_L + 0.015, 2.52, z]}>
          <boxGeometry args={[0.03, 0.98, 1.0]} />
          <meshStandardMaterial color={GLASS} metalness={0.5} roughness={0.12} />
        </mesh>
      ))}
      <mesh position={[HALF_L + 0.02, 2.52, 0]}>
        <boxGeometry args={[0.05, 1.0, 0.1]} />
        <meshStandardMaterial color={YELLOW} />
      </mesh>
      {/* wipers */}
      {[-0.62, 0.62].map((z) => (
        <mesh key={z} position={[HALF_L + 0.04, 2.15, z]} rotation={[0, 0, 0.0]}>
          <boxGeometry args={[0.02, 0.03, 0.7]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
      {/* destination board */}
      <mesh position={[HALF_L + 0.035, 3.12, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.9, 0.3]} />
        <meshBasicMaterial map={board} />
      </mesh>
      {/* grille with slats */}
      <mesh position={[HALF_L + 0.02, 1.15, 0]}>
        <boxGeometry args={[0.06, 0.55, 1.25]} />
        <meshStandardMaterial color={DARK} />
      </mesh>
      {[-0.18, 0, 0.18].map((dy) => (
        <mesh key={dy} position={[HALF_L + 0.06, 1.15 + dy, 0]}>
          <boxGeometry args={[0.03, 0.05, 1.1]} />
          <meshStandardMaterial color="#b9bec4" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      {/* round headlights and indicators */}
      {[-0.95, 0.95].map((z) => (
        <group key={z}>
          <mesh position={[HALF_L + 0.05, 1.2, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.19, 0.19, 0.1, 18]} />
            <meshStandardMaterial color="#fff6c2" emissive="#fff0a0" emissiveIntensity={0.7} />
          </mesh>
          <mesh position={[HALF_L + 0.03, 1.2, z * 1.22]}>
            <boxGeometry args={[0.05, 0.14, 0.14]} />
            <meshStandardMaterial color="#ff9a1f" emissive="#ff8a00" emissiveIntensity={0.4} />
          </mesh>
        </group>
      ))}
      {/* bumper, number plate, KSRTC-style badge */}
      <mesh position={[HALF_L + 0.12, 0.62, 0]} castShadow>
        <boxGeometry args={[0.32, 0.24, W + 0.1]} />
        <meshStandardMaterial color={DARK} />
      </mesh>
      <mesh position={[HALF_L + 0.3, 0.8, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.55, 0.14]} />
        <meshBasicMaterial map={plate} />
      </mesh>
      <mesh position={[HALF_L + 0.03, 1.62, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.1, 0.2]} />
        <meshBasicMaterial map={badge} />
      </mesh>

      {/* ---- REAR ---- */}
      <mesh position={[-HALF_L - 0.015, 2.6, 0]}>
        <boxGeometry args={[0.03, 0.8, 1.8]} />
        <meshStandardMaterial color={GLASS} metalness={0.4} roughness={0.15} />
      </mesh>
      {[-1.0, 1.0].map((z) => (
        <mesh key={z} position={[-HALF_L - 0.02, 1.25, z]}>
          <boxGeometry args={[0.04, 0.3, 0.3]} />
          <meshStandardMaterial color="#e11d1d" emissive="#c01010" emissiveIntensity={0.5} />
        </mesh>
      ))}
      <mesh position={[-HALF_L - 0.1, 0.62, 0]}>
        <boxGeometry args={[0.24, 0.22, W + 0.06]} />
        <meshStandardMaterial color={DARK} />
      </mesh>
      <mesh position={[-HALF_L - 0.025, 0.95, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[0.55, 0.14]} />
        <meshBasicMaterial map={plate} />
      </mesh>

      {/* wing mirrors */}
      {[-1, 1].map((side) => (
        <group key={side} position={[HALF_L - 0.35, 2.4, side * (HALF_W + 0.28)]}>
          <mesh>
            <boxGeometry args={[0.06, 0.42, 0.22]} />
            <meshStandardMaterial color={DARK} />
          </mesh>
          <mesh position={[0, 0, -side * 0.14]}>
            <boxGeometry args={[0.05, 0.05, 0.26]} />
            <meshStandardMaterial color={DARK} />
          </mesh>
        </group>
      ))}

      {/* passenger door on the left kerb side (-z); slides out when open */}
      <group ref={doorRef} position={[3.55, 1.7, -HALF_W]}>
        <mesh position={[0, 0, -0.02]}>
          <boxGeometry args={[1.1, 2.4, 0.06]} />
          <meshStandardMaterial color={RED} />
        </mesh>
        <mesh position={[0, 0.45, -0.06]}>
          <boxGeometry args={[0.85, 1.1, 0.03]} />
          <meshStandardMaterial color={GLASS} metalness={0.4} roughness={0.15} />
        </mesh>
      </group>

      {/* wheels */}
      <Wheel x={3.3} z={1.2} />
      <Wheel x={3.3} z={-1.2} />
      <Wheel x={-3.0} z={1.2} />
      <Wheel x={-3.0} z={-1.2} />
    </group>
  );
}
