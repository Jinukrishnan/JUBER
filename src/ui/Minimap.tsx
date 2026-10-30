"use client";

import { useEffect, useRef, useState } from "react";
import { busPose } from "@/game/busPose";
import { PLACES } from "@/game/data/places-v1";
import { armSigns, localToWorld } from "@/game/logic/junction";
import { DEFAULT_RANGE_INDEX, RADAR_RANGES, toRadar, toRadarRaw, type RadarView } from "@/game/logic/radar";
import { roadCenterZ } from "@/game/logic/road";
import type { Ride } from "@/game/logic/ride";
import type { Route } from "@/game/logic/roadgraph";
import { spotOf } from "@/game/rideWorld";
import { approachLight } from "@/game/logic/signals";
import { useGame } from "@/game/state/store";
import { useKeyPress } from "@/game/useKeys";
import { JUNCTIONS } from "@/game/world";

const SIZE = 176; // px across the round radar
const R = SIZE / 2;
const LIGHT = { red: "#ff3b2a", yellow: "#ffc21a", green: "#2fe06a" } as const;

type Drawn = { ride: Ride; route: Route | null; signalTime: number };

function draw(ctx: CanvasRenderingContext2D, rangeM: number, g: Drawn) {
  const view: RadarView = { x: busPose.x, z: busPose.z, heading: busPose.heading };
  const k = R / rangeM;
  const at = (p: { x: number; z: number }) => toRadarRaw(view, p, k);
  // where the driver is headed: the pickup, then the drop
  const targetId = g.ride.request ? (g.ride.phase === "toPickup" || g.ride.phase === "atPickup" || g.ride.phase === "boarding" ? g.ride.request.pickup.id : g.ride.request.drop.id) : null;
  const toDrop = g.ride.phase === "riding" || g.ride.phase === "alighting";

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

  // the route to follow: blue to the customer, green to the drop
  if (g.route && g.route.points.length > 1) {
    ctx.beginPath();
    g.route.points.forEach((p, i) => {
      const q = at(p);
      if (i === 0) ctx.moveTo(q.px, q.py);
      else ctx.lineTo(q.px, q.py);
    });
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = toDrop ? "#2fe06a" : "#4aa3ff";
    ctx.stroke();
  }

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

  // places: small blue squares; the one you are headed to is big, with its name
  // (blue to pick up, green to drop off)
  ctx.save();
  ctx.translate(R, R);
  ctx.font = "600 10px system-ui, sans-serif";
  ctx.textAlign = "center";
  for (const place of PLACES) {
    const spot = spotOf(place);
    const p = toRadar(view, spot, rangeM, R - 8);
    const target = place.id === targetId;
    if (!p.inside && !target) continue;
    ctx.fillStyle = target ? (toDrop ? "#2fe06a" : "#4aa3ff") : "#8fb4d8";
    ctx.strokeStyle = "#0b1a10";
    ctx.lineWidth = 1.5;
    if (target) {
      ctx.beginPath();
      ctx.arc(p.px, p.py, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (p.inside) {
        ctx.fillStyle = "#fff";
        ctx.fillText(place.name.split(" ")[0], p.px, p.py - 11);
      }
    } else {
      ctx.fillRect(p.px - 3, p.py - 3, 6, 6);
      ctx.strokeRect(p.px - 3, p.py - 3, 6, 6);
    }
  }
  // the vehicle: always at the centre, nose up
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

// A round radar like the one in a driving game: the vehicle in the middle, the
// road turning around it, signals and places marked, and the pickup (blue) or
// drop (green) you are headed for picked out.
export function Minimap() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(DEFAULT_RANGE_INDEX);
  const range = RADAR_RANGES[zoom];
  const ride = useGame((s) => s.ride);

  useKeyPress(["KeyZ"], () => setZoom((z) => (z + 1) % RADAR_RANGES.length));

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const id = setInterval(() => {
      const g = useGame.getState();
      draw(ctx, range, { ride: g.ride, route: g.route, signalTime: g.signalTime });
    }, 100);
    return () => clearInterval(id);
  }, [range]);

  const request = ride.request;
  const heading = request ? (ride.phase === "riding" || ride.phase === "alighting" ? "Drop" : "Pickup") : null;
  const place = request ? (heading === "Drop" ? request.drop : request.pickup) : null;

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
        <div className="font-semibold opacity-70">{heading ?? "Ride"}</div>
        {place ? <div className="truncate font-semibold">{place.name}</div> : <div className="opacity-60">No ride yet</div>}
      </div>
    </div>
  );
}
