# Other traffic on the loop

Date: 2026-10-31
Status: Draft for review
Builds on: the loop map (`2026-10-31-stage-ab-grass-and-loop-design.md`), the roadmap's Stage F.

## Intent

Today the player is alone on the road. The owner wants a living town: cars, autos, bikes and buses driving
the loop, stopping at red lights and queueing behind each other. Hit one and its driver shouts at you in
Malayalam. Decisions made with the owner:

- Vehicles: **cars, autos, bikes and buses**, **moderate** density (about 14 on the whole loop).
- A hit: **Rs. 300 fine and a star off (the existing accident), the other driver shouts a Malayalam line
  (speech bubble and voice), both vehicles stay stopped for a few seconds**, then the other one drives on.
- A driver who is waiting at a red light and is hit says a line about the red light.

## Behaviour

Other vehicles ("agents") follow the road network. Each has a road, a direction, a distance `s` along it, a
speed, and keeps to the **left lane** (3.7 m from the centreline, like the player). Pure logic in
`src/game/logic/traffic.ts`, stepped every frame from one place; React only draws them.

- **Speed:** each kind has a cruising speed (bike 9, car 8.5, auto 6.5, bus 7 m/s) with a little per-vehicle
  variation; they slow for bends and for the vehicle in front.
- **Following:** an agent keeps at least 6 m (plus a speed-dependent margin) behind the vehicle ahead in the
  same road and direction, **including the player**. It brakes smoothly and never passes through anything.
  No overtaking and no lane changes.
- **Signals:** an agent approaching a junction stops at its stop line while its light is red or yellow (if it
  can still stop), waits, and goes on green. Agents queue behind one another at the line.
- **Turns:** at a junction an agent picks one of the turns the approach allows (the same rules as the player,
  `allowedTurns`): straight 60 %, left or right otherwise, seeded so the world is repeatable. Agents never make
  a forbidden turn. Roads have no dead ends, so agents drive forever.
- **Junction conflicts:** a turning agent does not yield to oncoming traffic in the box. Vehicles can pass
  through each other briefly in the middle of a junction (they are never hit-tested against each other).
  The signals already keep the main and cross roads apart.
- **Spawn:** at the start of a day they are placed, spaced along the roads (more on the ring than the
  cross roads), none within 40 m of the depot. About 6 cars, 3 autos, 3 bikes and 2 buses.
- **Simulated everywhere, drawn near:** all agents are stepped every frame (they are few), only those within
  about 260 m of the player are drawn.

## When the player hits one

- Detected every frame: the player's rectangle against each agent's, at a closing speed above 1.5 m/s
  (the same threshold as people).
- Once per agent per contact (cooldown 8 s): `registerAccident()` (Rs. 300, star off, notice), the player's
  speed drops as for hitting a person, the agent **stops for 4 s**, then drives on.
- The agent's driver says one **Malayalam line** (speech bubble above the vehicle, plus the voice through
  `voice.ts`, with a pitch that depends on the vehicle). English meaning is not shown for these lines; the
  bubble carries the Malayalam only (the voice reads Malayalam when the device has it, else the English).
- If the agent was waiting at a red light (stopped at a stop line), the line is about the signal; otherwise it
  is a general scolding. Each kind of driver (car, auto, bike, bus) has its own few lines, picked by a seeded
  roll so they vary. The wording is in `src/game/logic/trafficTalk.ts`, invented everyday Malayalam, **needs a
  native speaker to proofread**.
- The player cannot drive through an agent: it is a normal hit, then both stop. A stopped agent that blocks the
  player is a queue like any other.

## Drawing

- The existing cartoon car, auto and bike models are reused with other paint colours (a `paint` colour
  prop; the player's own look is the default). A new **bus** model in the same style (red and cream, long body,
  big windscreen).
- Brake lights: an agent's tail lamps glow while it brakes or waits (the lamps take a `source` of braking and
  reversing flags, defaulting to the player).
- Drawn with one component per visible agent, moved by `useFrame` (no React state per frame).

## Out of scope

Overtaking, lane changes, parking, honking, engine sound for other vehicles, agents yielding in junction
boxes, pedestrians reacting to traffic, police (Stage D), one-way streets.

## Files

```
src/game/logic/traffic.ts         agents, spawn, step (following, signals, turns), contact test
src/game/logic/trafficTalk.ts     the Malayalam lines and how one is chosen
src/game/Traffic.tsx              steps the agents and draws the near ones; hit handling and speech
src/game/models/Bus.tsx           the new bus
src/game/models/{Car,Auto,Bike}.tsx  a `paint` prop
src/game/models/parts.tsx         TailLamps `source`
src/game/state/store.ts           nothing new except `registerAccident` (reused)
```

## Testing

Pure tests in `traffic.test.ts` and `trafficTalk.test.ts`:

- agents stay on the road in the left lane and never leave `drivable`;
- spacing: no two agents in one lane closer than the minimum, from a crowded start, over a simulated 10
  minutes;
- stops at a red stop line and moves off on green; queues stack up behind;
- never makes a forbidden turn (checked with `isWrongTurn` on every junction move);
- no gridlock: over 10 simulated minutes every agent makes progress;
- a player ahead in the lane is followed, not driven through;
- a contact is detected once per cooldown, stops the agent for 4 s, then it resumes;
- a hit agent waiting at red gets a signal line, otherwise a general line; every kind has lines; the same
  seed gives the same line.

Component behaviour and look are checked in the browser by screenshots (several agents near a junction
queueing at a red light, a hit with the bubble).

## Risks and assumptions

- Agents ignore each other inside junction boxes; if two turn across one another they overlap for a moment.
  Accepted for this round.
- About 14 agents, each a handful of boxes, add roughly 10 to 15 % to the triangle budget; only nearby agents
  are drawn.
- The test browser runs at about 1.5 fps, so traffic flow is verified by the pure simulation and screenshots,
  not by playing.
- The Malayalam wording is invented and must be proofread.
