"use client";

import { useFrame } from "@react-three/fiber";
import { memo, useRef, type RefObject } from "react";
import type { Group } from "three";
import type { PersonSpec } from "./logic/people";

// Low-poly person, feet at y=0, facing local +z. Pass a phase ref to animate a
// walking cycle (legs and arms swing); leave it off for someone standing still.
const GOLD = "#d4a82f";
const LONG_SLEEVES = new Set(["churidhar", "formal", "formal-suit"]);

function Shoe({ spec }: { spec: PersonSpec }) {
  const c = spec.footwearColor;
  switch (spec.footwear) {
    case "slippers":
      return (
        <group position={[0, -0.9, 0.06]}>
          <mesh>
            <boxGeometry args={[0.12, 0.025, 0.27]} />
            <meshStandardMaterial color={c} />
          </mesh>
          <mesh position={[0, 0.03, 0.02]}>
            <boxGeometry args={[0.1, 0.03, 0.07]} />
            <meshStandardMaterial color={c} />
          </mesh>
        </group>
      );
    case "heels":
      return (
        <group position={[0, -0.89, 0.05]}>
          <mesh>
            <boxGeometry args={[0.1, 0.05, 0.24]} />
            <meshStandardMaterial color={c} />
          </mesh>
          <mesh position={[0, -0.03, -0.09]}>
            <boxGeometry args={[0.04, 0.05, 0.04]} />
            <meshStandardMaterial color={c} />
          </mesh>
        </group>
      );
    case "sandals":
      return (
        <mesh position={[0, -0.9, 0.06]}>
          <boxGeometry args={[0.11, 0.03, 0.26]} />
          <meshStandardMaterial color={c} />
        </mesh>
      );
    default:
      return (
        <mesh position={[0, -0.87, 0.06]}>
          <boxGeometry args={[0.13, 0.09, 0.28]} />
          <meshStandardMaterial color={c} />
        </mesh>
      );
  }
}

// Hair around a head centred on the origin.
export function Hair({ spec }: { spec: PersonSpec }) {
  const c = spec.hairColor;
  return (
    <group>
      {spec.hairStyle === "thin" ? (
        <mesh position={[0, 0.03, -0.045]} scale={[1, 0.55, 0.9]}>
          <sphereGeometry args={[0.13, 10, 8]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ) : (
        <mesh position={[0, 0.045, -0.01]} scale={[1, 0.8, 1]}>
          <sphereGeometry args={[0.132, 12, 10]} />
          <meshStandardMaterial color={c} />
        </mesh>
      )}
      {spec.hairStyle === "long" && (
        <mesh position={[0, -0.12, -0.08]}>
          <boxGeometry args={[0.24, 0.34, 0.08]} />
          <meshStandardMaterial color={c} />
        </mesh>
      )}
      {spec.hairStyle === "bun" && (
        <mesh position={[0, 0.07, -0.13]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color={c} />
        </mesh>
      )}
    </group>
  );
}

export const Person = memo(function Person({ spec, phase }: { spec: PersonSpec; phase?: RefObject<number> }) {
  const legL = useRef<Group>(null);
  const legR = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const body = useRef<Group>(null);

  useFrame(() => {
    if (!phase) return;
    const s = Math.sin(phase.current);
    if (legL.current) legL.current.rotation.x = s * 0.6;
    if (legR.current) legR.current.rotation.x = -s * 0.6;
    if (armL.current) armL.current.rotation.x = -s * 0.5;
    if (armR.current) armR.current.rotation.x = s * 0.5;
    if (body.current) body.current.position.y = Math.abs(s) * 0.03;
  });

  const { outfit, bottomKind, top, bottom, skin, extras } = spec;
  const longSleeves = LONG_SLEEVES.has(outfit);
  const legColor = bottomKind === "trousers" || bottomKind === "leggings" ? bottom : skin;
  const blazer = extras.includes("blazer");
  const blazerColor = outfit === "formal" ? bottom : top;

  return (
    <group scale={spec.scale}>
      <group ref={body}>
        {/* legs */}
        {[
          { ref: legL, x: -0.1 },
          { ref: legR, x: 0.1 },
        ].map(({ ref, x }) => (
          <group key={x} ref={ref} position={[x, 0.92, 0]}>
            <mesh position={[0, -0.42, 0]}>
              <cylinderGeometry args={[0.072, 0.062, 0.84, 8]} />
              <meshStandardMaterial color={legColor} />
            </mesh>
            <Shoe spec={spec} />
          </group>
        ))}

        {/* lower garment */}
        {bottomKind === "skirt" && (
          <mesh position={[0, 0.76, 0]}>
            <cylinderGeometry args={[0.17, 0.3, 0.45, 12]} />
            <meshStandardMaterial color={bottom} />
          </mesh>
        )}
        {bottomKind === "lungi" && (
          <mesh position={[0, 0.72, 0]}>
            <cylinderGeometry args={[0.19, 0.25, 0.52, 12]} />
            <meshStandardMaterial color={bottom} />
          </mesh>
        )}
        {bottomKind === "sari" && (
          <>
            <mesh position={[0, 0.52, 0]}>
              <cylinderGeometry args={[0.19, 0.27, 0.9, 12]} />
              <meshStandardMaterial color={bottom} />
            </mesh>
            {extras.includes("goldBorder") && (
              <mesh position={[0, 0.1, 0]}>
                <cylinderGeometry args={[0.272, 0.272, 0.07, 12]} />
                <meshStandardMaterial color={GOLD} />
              </mesh>
            )}
          </>
        )}
        {outfit === "churidhar" && (
          <mesh position={[0, 0.85, 0]}>
            <cylinderGeometry args={[0.2, 0.26, 0.62, 12]} />
            <meshStandardMaterial color={top} />
          </mesh>
        )}

        {/* torso */}
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.2, 0.17, 0.56, 12]} />
          <meshStandardMaterial color={top} />
        </mesh>
        {blazer && (
          <mesh position={[0, 1.18, 0]}>
            <boxGeometry args={[0.46, 0.52, 0.3]} />
            <meshStandardMaterial color={blazerColor} />
          </mesh>
        )}
        {outfit === "formal" && (
          <>
            <mesh position={[0, 1.2, 0.152]}>
              <boxGeometry args={[0.1, 0.46, 0.02]} />
              <meshStandardMaterial color={top} />
            </mesh>
            <mesh position={[0, 1.18, 0.165]}>
              <boxGeometry args={[0.045, 0.32, 0.02]} />
              <meshStandardMaterial color="#a3262a" />
            </mesh>
          </>
        )}
        {extras.includes("pallu") && (
          <group position={[0, 1.2, 0.19]} rotation={[0, 0, -0.5]}>
            <mesh>
              <boxGeometry args={[0.17, 0.72, 0.04]} />
              <meshStandardMaterial color={bottom} />
            </mesh>
            {extras.includes("goldBorder") && (
              <mesh position={[0.07, 0, 0.022]}>
                <boxGeometry args={[0.025, 0.72, 0.01]} />
                <meshStandardMaterial color={GOLD} />
              </mesh>
            )}
          </group>
        )}
        {extras.includes("dupatta") && (
          <group position={[0, 1.22, 0.19]} rotation={[0, 0, 0.5]}>
            <mesh>
              <boxGeometry args={[0.12, 0.7, 0.035]} />
              <meshStandardMaterial color={bottom} />
            </mesh>
          </group>
        )}

        {/* arms */}
        {[
          { ref: armL, x: -0.26 },
          { ref: armR, x: 0.26 },
        ].map(({ ref, x }) => (
          <group key={x} ref={ref} position={[x, 1.42, 0]}>
            <mesh position={[0, -0.15, 0]}>
              <cylinderGeometry args={[0.055, 0.05, 0.3, 8]} />
              <meshStandardMaterial color={blazer ? blazerColor : top} />
            </mesh>
            <mesh position={[0, -0.44, 0]}>
              <cylinderGeometry args={[0.046, 0.042, 0.28, 8]} />
              <meshStandardMaterial color={longSleeves ? (blazer ? blazerColor : top) : skin} />
            </mesh>
            <mesh position={[0, -0.6, 0]}>
              <sphereGeometry args={[0.048, 8, 8]} />
              <meshStandardMaterial color={skin} />
            </mesh>
          </group>
        ))}

        {/* head */}
        <mesh position={[0, 1.54, 0]}>
          <cylinderGeometry args={[0.05, 0.055, 0.1, 8]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        <mesh position={[0, 1.65, 0]}>
          <sphereGeometry args={[0.125, 14, 12]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        {[-0.045, 0.045].map((x) => (
          <mesh key={x} position={[x, 1.665, 0.113]}>
            <sphereGeometry args={[0.014, 6, 6]} />
            <meshStandardMaterial color="#1a1412" />
          </mesh>
        ))}
        {extras.includes("bindi") && (
          <mesh position={[0, 1.7, 0.122]}>
            <sphereGeometry args={[0.014, 6, 6]} />
            <meshStandardMaterial color="#c0152b" />
          </mesh>
        )}
        <group position={[0, 1.66, 0]}>
          <Hair spec={spec} />
        </group>
      </group>
    </group>
  );
});
