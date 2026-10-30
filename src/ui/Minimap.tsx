"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { busPose } from "@/game/busPose";
import { ROUTE_V1 } from "@/game/data/route-v1";
import { armSigns, localToWorld } from "@/game/logic/junction";
import { DEFAULT_RANGE_INDEX, RADAR_RANGES, dropSummary, toRadar, toRadarRaw, type RadarView } from "@/game/logic/radar";
import { roadCenterZ } from "@/game/logic/road";
import { approachLight } from "@/game/logic/signals";
import { useGame } from "@/game/state/store";
import { useKeyPress } from "@/game/useKeys";
import { JUNCTIONS } from "@/game/world";

const SIZE = 176; // px across the round radar
const R = SIZE / 2;
const LIGHT = { red: "#ff3b2a", yellow: "#ffc21a", green: "#2fe06a" } as const;

type Drawn = { onboard: { destination: number }[]; signalTime: number };

function draw(ctx: CanvasRenderingContext2D, rangeM: number, g: Drawn) {
  const view: RadarView = { x: busPose.x, z: busPose.z, heading: busPose.heading };
  const k = R / rangeM;
  const at = (p: { x: number; z: number }) => toRadarRaw(view, p, k);
  const dropIdx = new Set(g.onboard.map((p) => p.destination));

  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.save();
  ctx.translate(R, R);
  ctx.beginPath();
  ctx.arc(0, 0, R - 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#26382c";
  ctx.fillRect(-R, -R, SIZE, SIZE);

  const road = (pts: { x: number; z: number }[], width: number) => {
    ctx.beginPath();
    pts.forEach((p, i) => {
      const q = at(p);
      if (i === 0) ctx.moveTo(q.px, q.py);
      else ctx.lineTo(q.px, q.py);
    });
    ctx.lineWidth = Math.max(3, width * k);
    ctx.lineCap = "round";
    ctx.strokeStyle = "#9aa0a6";
    ctx.stroke();
  };

  // the main road
  const step = rangeM / 16;
  const main: { x: number; z: number }[] = [];
  for (let x = busPose.x - rangeM * 1.2; x <= busPose.x + rangeM * 1.2; x += step) main.push({ x, z: roadCenterZ(x) });
  road(main, 12);

  // side roads and signals
  for (const j of JUNCTIONS) {
    if (Math.abs(j.x - busPose.x) > rangeM * 1.5) continue;
    for (const s of armSigns(j.arms)) road([localToWorld(j, 0, 0), localToWorld(j, 0, s * j.armLength)], 10);
  }
  for (const j of JUNCTIONS) {
    if (!j.plan) continue;
    const q = at({ x: j.x, z: j.z });
    if (Math.hypot(q.px, q.py) > R) continue;
    const light = approachLight({ id: j.id, x: j.x, arms: j.arms, signal: j.plan }, g.signalTime, "mainForward");
    ctx.beginPath();
    ctx.arc(q.px, q.py, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = LIGHT[light];
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#111";
    ctx.stroke();
  }
  ctx.restore();

  // bus stops: blue squares; green with a ring where someone is getting off
  ctx.save();
  ctx.translate(R, R);
  ctx.font = "600 10px system-ui, sans-serif";
  ctx.textAlign = "center";
  ROUTE_V1.forEach((s, i) => {
    const p = toRadar(view, { x: s.position, z: roadCenterZ(s.position) }, rangeM, R - 8);
    const drop = dropIdx.has(i);
    if (!p.inside && !drop) return;
    ctx.fillStyle = drop ? "#2fe06a" : "#4aa3ff";
    ctx.strokeStyle = "#0b1a10";
    ctx.lineWidth = 1.5;
    if (p.inside) {
      ctx.fillRect(p.px - 4, p.py - 4, 8, 8);
      ctx.strokeRect(p.px - 4, p.py - 4, 8, 8);
      if (drop) {
        ctx.beginPath();
        ctx.arc(p.px, p.py, 9, 0, Math.PI * 2);
        ctx.strokeStyle = "#2fe06a";
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.fillText(s.name.split(" ")[0], p.px, p.py - 13);
      }
    } else {
      // a drop beyond the circle: a dot on the rim, the way to go
      ctx.beginPath();
      ctx.arc(p.px, p.py, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  });
  // the bus: always at the centre, nose up
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 7);
  ctx.lineTo(0, 4);
  ctx.lineTo(-6, 7);
  ctx.closePath();
  ctx.fillStyle = "#ffd23f";
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(R, R, R - 2, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#f3e9d2";
  ctx.stroke();
}

// A round radar like the one in a driving game: the bus in the middle, the
// road turning around it, signals and bus stops marked, and a green marker
// wherever someone on board is getting off.
export function Minimap() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(DEFAULT_RANGE_INDEX);
  const range = RADAR_RANGES[zoom];
  const onboard = useGame((s) => s.onboard);
  const direction = useGame((s) => s.direction);
  const slot = useGame((s) => Math.round(s.busPosition / 25));

  useKeyPress(["KeyZ"], () => setZoom((z) => (z + 1) % RADAR_RANGES.length));

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const id = setInterval(() => {
      const g = useGame.getState();
      draw(ctx, range, { onboard: g.onboard, signalTime: g.signalTime });
    }, 100);
    return () => clearInterval(id);
  }, [range]);

  const drops = useMemo(() => dropSummary(onboard, ROUTE_V1, direction, slot * 25), [onboard, direction, slot]);

  return (
    <div className="rounded-2xl border border-line bg-cream/90 p-2 shadow">
      <canvas ref={canvas} width={SIZE} height={SIZE} className="mx-auto block" aria-label="Radar map" />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setZoom((z) => (z + 1) % RADAR_RANGES.length)}
        className="pointer-events-auto mt-1 w-full rounded-full border border-line bg-paper-sunk px-2 py-0.5 text-xs font-semibold"
      >
        Zoom {range >= 1000 ? `${range / 1000} km` : `${range} m`} <span className="opacity-60">Z</span>
      </button>
      <div className="mt-1 text-xs">
        <div className="font-semibold opacity-70">Getting off</div>
        {drops.length === 0 ? (
          <div className="opacity-60">Nobody on board</div>
        ) : (
          drops.slice(0, 4).map((d) => (
            <div key={d.index} className="flex justify-between gap-2">
              <span className="truncate">{d.name}</span>
              <span className="tabular-nums font-semibold">{d.count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
