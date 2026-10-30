"use client";

import { Billboard } from "@react-three/drei";
import { useMemo } from "react";
import { malayalamFont, useCanvasTexture, type Draw } from "./canvasTex";
import type { Line } from "./logic/speech";

function bubbleDrawer(line: Line): Draw {
  return (g, w, h) => {
    const tail = 34;
    const bh = h - tail;
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#ffffff";
    g.strokeStyle = "#d32020";
    g.lineWidth = 8;
    g.beginPath();
    g.roundRect(6, 6, w - 12, bh - 6, 36);
    g.fill();
    g.stroke();
    // little tail pointing down at the person
    g.beginPath();
    g.moveTo(w / 2 - 26, bh - 4);
    g.lineTo(w / 2, h - 4);
    g.lineTo(w / 2 + 26, bh - 4);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = "#ffffff";
    g.fillRect(w / 2 - 22, bh - 12, 44, 14);
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#b91c1c";
    g.font = malayalamFont(800, 66);
    g.fillText(line.ml, w / 2, bh * 0.38);
    g.fillStyle = "#111";
    g.font = "bold 44px Arial, sans-serif";
    g.fillText(line.en, w / 2, bh * 0.77);
  };
}

// A speech bubble over someone's head, drawn in the scene so it always faces the camera.
export function Speech({ line }: { line: Line }) {
  const draw = useMemo(() => bubbleDrawer(line), [line]);
  const tex = useCanvasTexture(640, 280, draw, line.ml);
  return (
    <Billboard>
      <mesh renderOrder={50}>
        <planeGeometry args={[3.0, 1.3125]} />
        <meshBasicMaterial map={tex} transparent depthTest={false} />
      </mesh>
    </Billboard>
  );
}
