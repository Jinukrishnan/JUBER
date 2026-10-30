"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import {
  AmbientLight,
  BufferGeometry,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Fog,
  Points,
} from "three";
import { busPose } from "./busPose";
import { DAY_END_HOUR, DAY_START_HOUR } from "./constants";
import { useGame } from "./state/store";
import { useKeyPress } from "./useKeys";

const SKY_MID = new Color("#bfe3f5");
const SKY_END = new Color("#e8a67a");
const RAIN_GREY = new Color("#7f8c97");
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DROPS = 900;
const BOX = 60;

export function Weather() {
  const [rain, setRain] = useState(false);
  const rainRef = useRef(false);
  const ambient = useRef<AmbientLight>(null);
  const sun = useRef<DirectionalLight>(null);
  const fog = useRef<Fog>(null);
  const bg = useRef<Color>(null);
  const drops = useRef<Points>(null);
  const tmp = useMemo(() => new Color(), []);

  useKeyPress(["KeyR"], () =>
    setRain((r) => {
      rainRef.current = !r;
      return !r;
    }),
  );

  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    const a = new Float32Array(DROPS * 3);
    const rnd = mulberry32(11);
    for (let i = 0; i < DROPS; i++) {
      a[i * 3] = (rnd() - 0.5) * BOX * 2;
      a[i * 3 + 1] = rnd() * 30;
      a[i * 3 + 2] = (rnd() - 0.5) * BOX * 2;
    }
    g.setAttribute("position", new Float32BufferAttribute(a, 3));
    return g;
  }, []);

  useFrame((_, dt) => {
    const hour = useGame.getState().hour;
    const t = (hour - DAY_START_HOUR) / (DAY_END_HOUR - DAY_START_HOUR);
    // gentle dawn/dusk at the ends of the shift, bright at midday
    const daylight = 0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
    const wet = rainRef.current ? 0.55 : 1;

    tmp.copy(SKY_END).lerp(SKY_MID, (daylight - 0.35) / 0.65);
    if (rainRef.current) tmp.lerp(RAIN_GREY, 0.6);
    tmp.multiplyScalar(0.55 + 0.45 * daylight);
    bg.current?.copy(tmp);
    fog.current?.color.copy(tmp);
    if (ambient.current) ambient.current.intensity = 0.35 + 0.4 * daylight * wet;
    if (sun.current) sun.current.intensity = 1.8 * daylight * wet;
    if (fog.current) {
      fog.current.near = rainRef.current ? 30 : 80;
      fog.current.far = rainRef.current ? 220 : 420;
    }

    const d = drops.current;
    if (d) {
      d.visible = rainRef.current;
      d.position.set(busPose.x, 0, busPose.z);
      const pos = d.geometry.getAttribute("position");
      for (let i = 0; i < DROPS; i++) {
        let y = pos.getY(i) - 40 * dt;
        if (y < 0) y += 30;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }
  });

  return (
    <>
      <color ref={bg} attach="background" args={["#bfe3f5"]} />
      <fog ref={fog} attach="fog" args={["#bfe3f5", 80, 420]} />
      <ambientLight ref={ambient} intensity={0.7} />
      <directionalLight ref={sun} position={[60, 120, 40]} intensity={1.6} castShadow />
      <points ref={drops} geometry={geometry} visible={rain} frustumCulled={false}>
        <pointsMaterial color="#cfe4f2" size={0.18} transparent opacity={0.7} />
      </points>
    </>
  );
}
