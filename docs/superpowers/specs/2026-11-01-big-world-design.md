# The big world: village, tech city, park, lake with a dam, metro, full map

Date: 2026-11-01
Status: Draft for review
Builds on: the loop map (`2026-10-31-stage-ab-grass-and-loop-design.md`), the town roadmap (`2026-10-31-town-roadmap.md`, Stage C), traffic and the ride game.

## Intent

The town is one small block (about 0.8 x 0.5 km: a ring road and two cross roads, 5 junctions, 14 places). The
owner wants a much bigger world that is easier to travel and easier to maintain: many more roads, junctions and
places; a normal **village** next to a **high-tech city** (metro, towers, offices, homes, a park); and a very big
**lake held by a dam with a boat on it**. The map screen must cover the whole world. Decisions made with the owner:

- Size: about **2.4 x 1.5 km** (six times the area of today).
- Layout: **village west, tech city east, lake in the north**.
- Metro: **elevated line with moving trains; stations are ride places**.
- Map UI: **radar zooms out to the whole world, plus a full-screen map** (Tab).

## The world

Coordinates are metres as before (+x east, +z south, so "north" is -z). The village keeps its coordinates (ring road
from (0,0) to (800,500)), so nothing that works today moves. The world spans x 0..2400, z -760..900.

```
 z=-760  +--------------------- LAKE (water) ---------------------+
         |   boat route round the lake, a jetty, shore trees      |
 z=-160  +------------------ DAM WALL (embankment) ---------------+
 z=-130     Dam Road ======================================= (road on top of the dam)
 z=   0  +----------+                 +--------------------------------+
         | VILLAGE  |                 |  TECH CITY: towers, offices,   |
         | ring road|== Tech Avenue ==|  homes, mall, hospital, metro  |
 z= 500  | 800x500  |                 |  central park between 1500..1900|
         +----------+                 |  and z 250..550                |
 z= 900                               +--------------------------------+
        x=0       800  1000                                       2300
```

### Roads (data, `network-v2.ts`)

The network stays data. Existing roads and junctions are kept; new ones are added with small builders so the file
stays short (a `grid()` helper makes the city streets; every road still ends up as a plain `Road` entry):

- **ring**, **ns** (Station Road), **ew** (Temple Road): as today, with **ew extended east** to become **Tech
  Avenue** (to x = 2300) and **ns extended north** to the dam (z = -130). The north and east junctions become
  four-ways.
- **Dam Road** `dam`: east-west along the top of the dam, z = -130, from x = 100 to x = 1300. It meets Station Road
  at (400,-130) and the city's first north street at (1100,-130), so the village and the city are joined twice (by
  Tech Avenue and, round the north, by the dam), which gives the router real choices.
- **City streets**: four north-south streets at x = 1100, 1500, 1900, 2300 (from z = -130 / 0 down to z = 900) and
  three east-west streets at z = 0, 550 and 900, with Tech Avenue at z = 250. Junctions every 250 to 400 m.
- **Signals**: every junction is signalled as now (the existing rule), each with its own offset; city junctions use
  the same plan. Turn rules stay data; a few are set to make rules visible.
- About **35 junctions** in all (5 today). The validator's rules (150 m between junctions on a road, corner radius,
  places 30 m from a junction box) still apply and still print a message for anything bad.

### Zones (data, `zones-v1.ts`)

A zone is a rectangle (or polygon) with a kind and a style; scenery and the ground read them:

| Zone | Where | Looks like |
|---|---|---|
| `village` | the old ring and its blocks | as today: tiled-roof houses, shops, palms, paddy to the west |
| `city` | x 1000..2300, z 0..900 except the park | towers 8 to 30 storeys, offices, apartment blocks, a mall, a hospital, shops, homes, wide pavements, street lights |
| `park` | x 1500..1900, z 250..550 | lawns, trees, paths, benches, a fountain, a children's playground |
| `lake` | x 100..1400, z -760..-160 | water, shore, a beach strip along the dam foot |
| `dam` | z -160..-100, x 100..1300 | an embankment with a road on top, spillway gates, railings, a control building |
| `hills` | the outer edge | as today |

### Places (data)

About **40 places** (14 today): the village ones stay; the city gets Metro stations (3), City Mall, Tech Park
Office, General Hospital, Central Park (two gates), Apartments, University, Stadium, Bus Terminal, and more; the
lake gets Dam View Point, Boat Jetty and Fishing Pier. Places keep the rules (30 m from a junction, 40 m apart)
and the `shelter` flag (bus-stop style) or a name board.

### The lake, the dam and the boat

- **Water**: a large flat mesh with a gentle animated surface (a cheap vertex or texture wave, no real-time
  reflection), a darker colour with depth, a lighter edge.
- **Dam**: a long embankment wall (sloped sides, concrete face on the water side, a row of spillway gates and
  piers, lamp posts, railings) with Dam Road on top.
- **Boat**: a few small boats (a ferry-style boat and a rowing boat) that follow a slow loop round the lake,
  bobbing a little and leaving a faint wake. They never leave the water (a test checks the boat path is inside the
  lake rectangle).
- **Keep-out**: no tree, house or pole is placed in the water (the lake is a keep-out shape).

### The metro

- An **elevated track** on pillars along Tech Avenue, from x = 900 to x = 2250 at y = 9 m, centred over the avenue's
  median, with three **stations** (x about 1250, 1700 and 2150): a platform shelter on top, a staircase and a
  ticket building at street level.
- A **train** of three coaches runs back and forth, accelerating, stopping 15 s at each station (a small pure state
  machine, tested), with a light and a quiet hum as it passes near the player.
- **Stations are places** at street level on the avenue (customers wait and are dropped there).
- The track never blocks the road (pillars stand in the median, outside the carriageway, checked by a test).

### Buildings (Stage C of the roadmap, built here)

A **catalogue** of building types (a function per type returns instance data), laid out by zone: villages as
today; the city in **blocks** with setbacks, towers in the centre thinning to low-rise at the edge, a mall and a
hospital as landmarks. Windows are drawn with an instanced texture (lit at dusk). The same invariant holds as
today: no building, tree, pole, sign or pillar on tarmac, a junction, a footpath or a zebra (the test now covers
the whole world and every zone).

### Scale and performance

- Scenery is placed **per cell** (200 m cells as now); layout is computed **lazily per cell** from a seed derived
  from the cell, so start-up time does not grow with the world, and only cells near the player are built or drawn.
- Roads: nearest-road and drivable queries use a **grid index** of road pieces so cost does not grow with the road
  count.
- Traffic grows from 45 to **80** vehicles (still simulated all the time, only near ones drawn). Fares and goals
  are re-tuned for the longer trips (the shift simulation checks it).
- Draw range, fog and the triangle budget are kept; towers use instancing.

### The map UI

- **Radar**: the round radar gets a fourth zoom (the whole world), keeps the colours, and draws zones faintly
  (green village, grey city, light-green park, blue lake) with the metro line as a dashed line.
- **Full-screen map** (Tab, closes with Tab or Esc, pauses the game): a drawing of every road, the zones, the lake and
  dam, the metro line with stations, every place (icons by kind), signals in their current colour, other vehicles,
  the route to follow and your position and heading. Click a place for its name.
- The HUD's radar caption shows the zone you are in ("Tech City", "Village", "Dam Road").

### Out of scope

Bridges over water other than the dam, buses and trains carrying passengers, a day/night cycle, traffic police
(Stage D), the new UI skin (Stage E), boats you can ride.

## Stages (each its own plan, built and merged in turn)

1. **Network and places**: `network-v2.ts` (grid builder, 35 junctions), 40 places, routing and rides on it,
   traffic count, spatial index for queries, fares re-tuned. Result: a bigger town you can drive, with plain
   roads.
2. **Zones and buildings**: `zones-v1.ts`, the building catalogue, per-cell lazy layout, city and park, the
   ground by zone. Result: village and tech city look right.
3. **Lake, dam and boats**: water, the dam, boats on a loop, shore, keep-outs.
4. **Metro**: viaduct, stations as places, the train and its state machine.
5. **Map UI**: wider radar, the full-screen map, zone names.

## Testing

- Network: the validator accepts the new map; every junction has its approaches, stops and signal; every place is
  usable; routes exist between every pair of places (a connectivity test) and never use a forbidden turn; the
  shift simulation still has a goal reachable on most days but not every day; the traffic simulation (80 vehicles)
  stays free of overlaps and gridlock for ten minutes; query cost per frame is bounded (a timing test).
- Scenery: the invariant over the whole world and every zone (no building, plant, pole, pillar, boat path point in
  the wrong place); layout is deterministic per cell and the same whichever order cells are built in.
- Water and boats: boat paths stay inside the lake; the dam wall does not overlap Dam Road's carriageway.
- Metro: the train state machine (accelerate, stop 15 s, reverse at the ends), stations are places on the avenue,
  pillars are outside the carriageway.
- Map: pure projection helpers for the full map (world to screen, hit testing of places), the radar's new zoom.
- Browser checks by screenshot at each stage (the test browser runs at about 1.5 fps, so flow is verified by tests).

## Risks and assumptions

- This is the biggest change so far; it is split into five stages so the game is playable after each.
- Lazy per-cell layout changes how scenery is generated (still seeded and deterministic). The old one-shot layout
  stays until stage 2 replaces it.
- More junctions mean more signals and more places to keep apart; the validator and tests are the safety net.
- The Malayalam names of the new places will be invented and need a native speaker to check.
- Browser speed: more buildings and water cost frames; the cell draw range and instancing are the answer, and
  each stage checks the draw counts.
