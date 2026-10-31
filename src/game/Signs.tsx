"use client";

import { useMemo } from "react";
import { malayalamFont, useCanvasTexture, type Draw } from "./canvasTex";
import type { Sign } from "./logic/roadside";
import { drawStopSign } from "./Stops";
import { FEATURES } from "./world";

const KERB = 0.15;
const POLE_H = 3.0;

const drawSpeed: Draw = (g, w, h) => {
  g.clearRect(0, 0, w, h);
  g.fillStyle = "#fff";
  g.beginPath();
  g.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#d32020";
  g.lineWidth = w * 0.11;
  g.beginPath();
  g.arc(w / 2, h / 2, w / 2 - w * 0.08, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = "#111";
  g.font = `bold ${w * 0.42}px Arial, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("40", w / 2, h / 2 + 4);
};

// Pedestrian crossing: blue square, white triangle, walking figure.
const drawCrossing: Draw = (g, w, h) => {
  g.fillStyle = "#1565c0";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "#fff";
  g.lineWidth = 4;
  g.strokeRect(5, 5, w - 10, h - 10);
  g.fillStyle = "#fff";
  g.beginPath();
  g.moveTo(w / 2, h * 0.14);
  g.lineTo(w * 0.86, h * 0.8);
  g.lineTo(w * 0.14, h * 0.8);
  g.closePath();
  g.fill();
  g.strokeStyle = "#111";
  g.fillStyle = "#111";
  g.lineWidth = 5;
  g.lineCap = "round";
  g.beginPath();
  g.arc(w * 0.5, h * 0.38, w * 0.045, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(w * 0.5, h * 0.44);
  g.lineTo(w * 0.5, h * 0.6);
  g.moveTo(w * 0.5, h * 0.48);
  g.lineTo(w * 0.42, h * 0.58);
  g.moveTo(w * 0.5, h * 0.48);
  g.lineTo(w * 0.58, h * 0.54);
  g.moveTo(w * 0.5, h * 0.6);
  g.lineTo(w * 0.43, h * 0.72);
  g.moveTo(w * 0.5, h * 0.6);
  g.lineTo(w * 0.58, h * 0.72);
  g.stroke();
};

function directionDrawer(ml: string, en: string, km: string): Draw {
  return (g, w, h) => {
    g.fillStyle = "#0f6b3a";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#fff";
    g.lineWidth = 6;
    g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = "#fff";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = malayalamFont(800, 62);
    g.fillText(ml, w / 2, h * 0.34);
    g.font = "bold 36px Arial, sans-serif";
    g.fillText(`${en.toUpperCase()}  →  ${km}`, w / 2, h * 0.7);
  };
}

function SignBoard({ sign, tex, w, h }: { sign: Sign; tex: ReturnType<typeof useCanvasTexture>; w: number; h: number }) {
  // the board faces the traffic it is for: its front looks along `facing`
  const rot = Math.atan2(Math.cos(sign.facing), Math.sin(sign.facing));
  const y = KERB + POLE_H;
  return (
    <group position={[sign.x, 0, sign.z]} rotation={[0, rot, 0]}>
      <mesh position={[0, KERB + POLE_H / 2, 0]}>
        <boxGeometry args={[0.07, POLE_H, 0.07]} />
        <meshStandardMaterial color="#59595c" />
      </mesh>
      <mesh position={[0, y - h / 2 + 0.2, 0]}>
        <boxGeometry args={[w, h, 0.05]} />
        <meshStandardMaterial color="#8a8a8c" />
      </mesh>
      <mesh position={[0, y - h / 2 + 0.2, 0.045]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} transparent alphaTest={0.05} />
      </mesh>
    </group>
  );
}

function DirectionBoard({ sign }: { sign: Sign }) {
  const label = sign.label!;
  const draw = useMemo(() => directionDrawer(label.ml, label.en, label.km), [label.ml, label.en, label.km]);
  const tex = useCanvasTexture(512, 256, draw, label.ml);
  return <SignBoard sign={sign} tex={tex} w={2.2} h={1.1} />;
}

export function Signs() {
  const speed = useCanvasTexture(128, 128, drawSpeed);
  const crossing = useCanvasTexture(128, 128, drawCrossing);
  const stop = useCanvasTexture(128, 128, drawStopSign);

  return (
    <group>
      {FEATURES.signs.map((s, i) => {
        if (s.kind === "direction") return <DirectionBoard key={i} sign={s} />;
        const tex = s.kind === "speed40" ? speed : s.kind === "crossing" ? crossing : stop;
        return <SignBoard key={i} sign={s} tex={tex} w={0.9} h={0.9} />;
      })}
    </group>
  );
}
