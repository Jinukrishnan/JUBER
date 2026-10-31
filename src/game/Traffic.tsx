"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import { busPose } from "./busPose";
import { PLACES } from "./data/places-v1";
import { agentPose, createTraffic, inRange, liveTraffic, stepTraffic, shout, type Agent } from "./logic/traffic";
import { placeSpot } from "./logic/places";
import { Auto } from "./models/Auto";
import { Bike } from "./models/Bike";
import { Bus } from "./models/Bus";
import { Car } from "./models/Car";
import { Speech } from "./SpeechBubble";
import { useGame } from "./state/store";
import { cancelSpeech, speakLine } from "./voice";
import { NETWORK } from "./world";

const SEED = 20261031;
const DRAW_RANGE = 220; // metres from the player: only vehicles this close have their models in the scene
const NEAR_EVERY_MS = 250; // how often the set of near vehicles is refreshed
const BUBBLE_MS = 3500;
const BUBBLE_HEIGHT = { bus: 4.4, car: 2.9, auto: 3.0, bike: 2.7 } as const;

type Bubble = { id: number; day: number; line: { ml: string; en: string }; until: number };

function AgentView({ agent, bubble, near }: { agent: Agent; bubble: Bubble | null; near: boolean }) {
  const group = useRef<Group>(null);
  useFrame(() => {
    const g = group.current;
    if (!g || !near) return;
    const p = agentPose(NETWORK, agent);
    g.position.set(p.x, 0, p.z);
    g.rotation.y = -p.heading;
  });
  const model =
    agent.kind === "bus" ? (
      <Bus paint={agent.paint} lamps={agent} />
    ) : agent.kind === "car" ? (
      <Car paint={agent.paint} lamps={agent} />
    ) : agent.kind === "auto" ? (
      <Auto paint={agent.paint} lamps={agent} />
    ) : (
      <Bike paint={agent.paint} lamps={agent} />
    );
  return (
    <group ref={group}>
      {near && model}
      {near && bubble && (
        <group position={[0, BUBBLE_HEIGHT[agent.kind], 0]} rotation={[0, 0, 0]}>
          <Speech line={bubble.line} />
        </group>
      )}
    </group>
  );
}

// The other vehicles on the loop. They are all stepped every frame while the game
// runs (see logic/traffic.ts); only the ones near the player are drawn. Hitting one
// is an accident, and its driver shouts.
export function Traffic() {
  const dayId = useGame((s) => s.dayId);
  const phase = useGame((s) => s.phase);
  const agents = useMemo(() => {
    const depot = placeSpot(NETWORK, PLACES.find((p) => p.id === "depot")!);
    return createTraffic(NETWORK, SEED + dayId, depot);
  }, [dayId]);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  // which vehicles are close enough to have a model, refreshed a few times a second
  const [nearIds, setNearIds] = useState<number[]>([]);
  const lastNear = useRef(0);

  // the radar shows the same vehicles
  useEffect(() => {
    liveTraffic.agents = agents;
    return () => {
      liveTraffic.agents = [];
    };
  }, [agents]);

  // the end of the day, or a new one, cuts off any shouting
  useEffect(() => {
    if (phase === "ended") cancelSpeech();
  }, [phase]);
  useEffect(() => {
    cancelSpeech();
  }, [dayId]);

  useFrame((_, rawDt) => {
    const game = useGame.getState();
    const now = performance.now();
    setBubbles((cur) => (cur.some((b) => b.until <= now) ? cur.filter((b) => b.until > now) : cur));
    if (now - lastNear.current > NEAR_EVERY_MS) {
      lastNear.current = now;
      const ids = agents.filter((a) => inRange(NETWORK, a, busPose.x, busPose.z, DRAW_RANGE)).map((a) => a.id);
      setNearIds((cur) => (cur.length === ids.length && cur.every((v, i) => v === ids[i]) ? cur : ids));
    }
    if (game.phase !== "running") return;
    const dt = Math.min(rawDt, 0.05);
    const player = { x: busPose.x, z: busPose.z, heading: busPose.heading, speed: busPose.speed, length: busPose.length, width: busPose.width };
    const { hits } = stepTraffic(NETWORK, agents, dt, game.signalTime, player);
    if (hits.length === 0) return;
    game.registerAccident();
    busPose.bump = true; // the vehicle loses speed, as when it hits a person
    const lines = hits.map((a) => ({ a, said: shout(a) }));
    speakLine({ ml: lines[0].said.ml, en: lines[0].said.en }, lines[0].said.pitch);
    setBubbles((cur) => [
      ...cur.filter((b) => !lines.some((l) => l.a.id === b.id)),
      ...lines.map((l) => ({ id: l.a.id, day: dayId, line: { ml: l.said.ml, en: l.said.en }, until: now + BUBBLE_MS })),
    ]);
  });

  return (
    <group>
      {agents.map((a) => (
        <AgentView key={`${dayId}-${a.id}`} agent={a} bubble={phase === "ended" ? null : (bubbles.find((b) => b.id === a.id && b.day === dayId) ?? null)} near={nearIds.includes(a.id)} />
      ))}
    </group>
  );
}
