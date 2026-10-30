"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { InstancedMesh, Object3D, type Group } from "three";
import { APP_NAME } from "./constants";
import { useCanvasTexture, type Draw } from "./canvasTex";
import { OnboardPassengers } from "./OnboardPassengers";
import { SEATS } from "./logic/seats";

// KSRTC-style stage-carriage bus built from boxes, with a visible interior.
// +x is the front, -z the passenger-door (left, kerb) side.
const L = 10;
const W = 2.6;
const HALF_L = L / 2;
const HALF_W = W / 2;
export const FLOOR_Y = 0.79; // top of the interior floor

const YELLOW = "#dfae3a";
const CREAM = "#efe3c2";
const RED = "#b3302a";
const DARK = "#26282c";
const GLASS = "#1c2c3a";
const SEAT = "#2c5a8c";

const drawBoard: Draw = (g, w, h) => {
  g.fillStyle = "#f6f1e3";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = RED;
  g.lineWidth = 6;
  g.strokeRect(3, 3, w - 6, h - 6);
  g.fillStyle = RED;
  g.font = "bold 56px Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("KSRTC", w / 2, h / 2 + 2);
};

const drawPlate: Draw = (g, w, h) => {
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
};

const drawBadge: Draw = (g, w, h) => {
  g.fillStyle = YELLOW;
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#7a1a14";
  g.font = "bold 40px Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(APP_NAME, w / 2, h / 2 + 2);
};

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

// Seat bases and backrests for every seated place, drawn as two instanced meshes.
function Seats() {
  const base = useRef<InstancedMesh>(null);
  const back = useRef<InstancedMesh>(null);
  const seated = SEATS.filter((s) => !s.standing);

  useLayoutEffect(() => {
    const o = new Object3D();
    seated.forEach((s, i) => {
      o.position.set(s.x, FLOOR_Y + 0.4, s.z);
      o.updateMatrix();
      base.current?.setMatrixAt(i, o.matrix);
      o.position.set(s.x - 0.2, FLOOR_Y + 0.72, s.z);
      o.updateMatrix();
      back.current?.setMatrixAt(i, o.matrix);
    });
    if (base.current) base.current.instanceMatrix.needsUpdate = true;
    if (back.current) back.current.instanceMatrix.needsUpdate = true;
  }, [seated]);

  return (
    <>
      <instancedMesh ref={base} args={[undefined, undefined, seated.length]}>
        <boxGeometry args={[0.44, 0.1, 0.42]} />
        <meshStandardMaterial color={SEAT} />
      </instancedMesh>
      <instancedMesh ref={back} args={[undefined, undefined, seated.length]}>
        <boxGeometry args={[0.08, 0.5, 0.42]} />
        <meshStandardMaterial color={SEAT} />
      </instancedMesh>
    </>
  );
}

const WINDOW_XS = Array.from({ length: 8 }, (_, i) => -4.0 + i * 0.95);
const PILLAR_XS = Array.from({ length: 9 }, (_, i) => -4.475 + i * 0.95);

export function BusModel({ doorRef }: { doorRef: RefObject<Group | null> }) {
  const board = useCanvasTexture(256, 64, drawBoard);
  const plate = useCanvasTexture(256, 64, drawPlate);
  const badge = useCanvasTexture(256, 64, drawBadge);

  return (
    <group>
      {/* ---- body shell ---- */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[L, 1.0, W]} />
        <meshStandardMaterial color={RED} />
      </mesh>
      <mesh position={[0, 0.98, 0]}>
        <boxGeometry args={[L + 0.02, 0.06, W + 0.02]} />
        <meshStandardMaterial color={YELLOW} />
      </mesh>
      <mesh position={[0, 1.46, 0]}>
        <boxGeometry args={[L + 0.02, 0.12, W + 0.02]} />
        <meshStandardMaterial color={CREAM} />
      </mesh>

      {/* interior floor, ceiling, and the pillars between the open side windows */}
      <mesh position={[0, FLOOR_Y - 0.03, 0]}>
        <boxGeometry args={[L - 0.4, 0.06, W - 0.2]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      <mesh position={[0, 2.55, 0]}>
        <boxGeometry args={[L - 0.3, 0.05, W - 0.2]} />
        <meshStandardMaterial color="#d8cfb4" />
      </mesh>
      {PILLAR_XS.map((x) =>
        [-1, 1].map((side) => (
          <mesh key={`${x}${side}`} position={[x, 2.04, side * (HALF_W - 0.05)]}>
            <boxGeometry args={[0.15, 1.04, 0.1]} />
            <meshStandardMaterial color={YELLOW} />
          </mesh>
        )),
      )}
      {[-1, 1].map((side) => (
        <group key={side}>
          {/* rails above and below the windows */}
          <mesh position={[-0.9, 2.55, side * (HALF_W - 0.05)]}>
            <boxGeometry args={[8.4, 0.1, 0.1]} />
            <meshStandardMaterial color={YELLOW} />
          </mesh>
          {/* cab-side panel (door side keeps a plain panel above the door) */}
          <mesh position={[4.05, 2.04, side * (HALF_W - 0.05)]}>
            <boxGeometry args={[1.9, 1.04, 0.1]} />
            <meshStandardMaterial color={YELLOW} />
          </mesh>
        </group>
      ))}
      {/* see-through side glass, so seated passengers show from outside */}
      {WINDOW_XS.map((x) =>
        [-1, 1].map((side) => (
          <mesh key={`${x}${side}`} position={[x, 2.04, side * (HALF_W - 0.02)]}>
            <boxGeometry args={[0.8, 0.96, 0.02]} />
            <meshStandardMaterial color={GLASS} transparent opacity={0.28} depthWrite={false} metalness={0.3} roughness={0.1} />
          </mesh>
        )),
      )}
      {/* roof with a front visor */}
      <mesh position={[0, 2.64, 0]} castShadow>
        <boxGeometry args={[L - 0.1, 0.14, W - 0.16]} />
        <meshStandardMaterial color={CREAM} />
      </mesh>
      <mesh position={[HALF_L + 0.12, 2.8, 0]}>
        <boxGeometry args={[0.32, 0.07, W - 0.1]} />
        <meshStandardMaterial color={RED} />
      </mesh>

      {/* ---- FRONT ---- */}
      <mesh position={[HALF_L - 0.07, 2.04, 0]}>
        <boxGeometry args={[0.14, 1.04, W]} />
        <meshStandardMaterial color={YELLOW} />
      </mesh>
      {[-0.62, 0.62].map((z) => (
        <mesh key={z} position={[HALF_L + 0.015, 2.0, z]}>
          <boxGeometry args={[0.03, 0.84, 1.0]} />
          <meshStandardMaterial color={GLASS} metalness={0.5} roughness={0.12} />
        </mesh>
      ))}
      <mesh position={[HALF_L + 0.02, 2.0, 0]}>
        <boxGeometry args={[0.05, 0.86, 0.1]} />
        <meshStandardMaterial color={YELLOW} />
      </mesh>
      <mesh position={[HALF_L + 0.035, 2.52, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.9, 0.24]} />
        <meshBasicMaterial map={board} />
      </mesh>
      {/* grille, round headlights, indicators */}
      <mesh position={[HALF_L + 0.02, 0.85, 0]}>
        <boxGeometry args={[0.06, 0.5, 1.25]} />
        <meshStandardMaterial color={DARK} />
      </mesh>
      {[-0.17, 0, 0.17].map((dy) => (
        <mesh key={dy} position={[HALF_L + 0.06, 0.85 + dy, 0]}>
          <boxGeometry args={[0.03, 0.05, 1.1]} />
          <meshStandardMaterial color="#b9bec4" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      {[-0.95, 0.95].map((z) => (
        <group key={z}>
          <mesh position={[HALF_L + 0.05, 0.9, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.19, 0.19, 0.1, 18]} />
            <meshStandardMaterial color="#fff6c2" emissive="#fff0a0" emissiveIntensity={0.7} />
          </mesh>
          <mesh position={[HALF_L + 0.03, 0.9, z * 1.22]}>
            <boxGeometry args={[0.05, 0.14, 0.14]} />
            <meshStandardMaterial color="#ff9a1f" emissive="#ff8a00" emissiveIntensity={0.4} />
          </mesh>
        </group>
      ))}
      <mesh position={[HALF_L + 0.12, 0.52, 0]} castShadow>
        <boxGeometry args={[0.32, 0.22, W + 0.1]} />
        <meshStandardMaterial color={DARK} />
      </mesh>
      <mesh position={[HALF_L + 0.3, 0.76, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.55, 0.14]} />
        <meshBasicMaterial map={plate} />
      </mesh>
      <mesh position={[HALF_L + 0.03, 1.25, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.1, 0.2]} />
        <meshBasicMaterial map={badge} />
      </mesh>

      {/* ---- REAR ---- */}
      <mesh position={[-HALF_L + 0.07, 2.04, 0]}>
        <boxGeometry args={[0.14, 1.04, W]} />
        <meshStandardMaterial color={YELLOW} />
      </mesh>
      <mesh position={[-HALF_L - 0.015, 2.05, 0]}>
        <boxGeometry args={[0.03, 0.7, 1.8]} />
        <meshStandardMaterial color={GLASS} metalness={0.4} roughness={0.15} />
      </mesh>
      {[-1.0, 1.0].map((z) => (
        <mesh key={z} position={[-HALF_L - 0.02, 0.95, z]}>
          <boxGeometry args={[0.04, 0.3, 0.3]} />
          <meshStandardMaterial color="#e11d1d" emissive="#c01010" emissiveIntensity={0.5} />
        </mesh>
      ))}
      <mesh position={[-HALF_L - 0.1, 0.52, 0]}>
        <boxGeometry args={[0.24, 0.22, W + 0.06]} />
        <meshStandardMaterial color={DARK} />
      </mesh>
      <mesh position={[-HALF_L - 0.025, 0.78, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[0.55, 0.14]} />
        <meshBasicMaterial map={plate} />
      </mesh>

      {/* wing mirrors */}
      {[-1, 1].map((side) => (
        <group key={side} position={[HALF_L - 0.35, 1.95, side * (HALF_W + 0.28)]}>
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

      {/* passenger door (left kerb side): a dark doorway the red door slides clear of */}
      <mesh position={[3.55, 1.45, -HALF_W - 0.012]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.1, 2.1]} />
        <meshBasicMaterial color="#0b0b0b" />
      </mesh>
      <group ref={doorRef} position={[3.55, 1.45, -HALF_W]}>
        <mesh position={[0, 0, -0.02]}>
          <boxGeometry args={[1.1, 2.1, 0.06]} />
          <meshStandardMaterial color={RED} />
        </mesh>
        <mesh position={[0, 0.5, -0.06]}>
          <boxGeometry args={[0.85, 0.9, 0.03]} />
          <meshStandardMaterial color={GLASS} metalness={0.4} roughness={0.15} />
        </mesh>
      </group>

      {/* interior */}
      <Seats />
      <OnboardPassengers />

      {/* wheels */}
      <Wheel x={3.3} z={1.2} />
      <Wheel x={3.3} z={-1.2} />
      <Wheel x={-3.0} z={1.2} />
      <Wheel x={-3.0} z={-1.2} />
    </group>
  );
}
