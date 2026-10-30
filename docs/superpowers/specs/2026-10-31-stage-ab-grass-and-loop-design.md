# Stages A and B — grass in the road, and the loop map

Date: 2026-10-31
Status: Draft for review
Builds on: `2026-10-31-town-roadmap.md`, the ride-hailing game and the Stage 1 scenery / Stage 2 junctions work.

## Stage A: grass in the road

### Intent

Plants (grass tufts, flowers, bushes, trees) must never stand on drivable road, a junction, a footpath or a
kerb. The owner reports grass in the middle of the road at some spots. The cause is not yet known, so Stage A
begins by finding it.

### Method

1. Write the invariant first as a test: for every plant placement in the world (grass tufts, flowers, trees,
   bushes), none lies inside the drivable area (`drivable`, including turn-arounds) or within the footpath
   and kerb band of any road. Run it on the current world. If it fails, the failing placements show the cause.
2. If it passes, search the rendering instead: ground or paddy meshes drawn through or above asphalt (depth
   fighting between y = 0.005 / 0.01 / 0.02 layers at distance), arm asphalt sitting below ground, grass drawn
   in the gaps cut in the footpath and verge where an arm joins, scenery drawn for a slice with stale
   keep-out zones. Check with screenshots at every junction, bend and road end.
3. Fix the cause. Keep the invariant test; Stage B reruns it on the loop network.

### Done when

- The invariant test exists and passes.
- No grass is visible on tarmac at any junction, bend or road end in screenshots.
- The cause is written down in the commit message.

## Stage B: the loop map

### Intent

Replace the single long road (a function of x) with a **road network**: a closed ring road and two cross
roads, with a signal at every junction and per-approach turn rules. Everything that assumed "one road along
x" moves onto the network.

### The network (data)

`src/game/data/network-v1.ts` is the single source of the map. Coordinates are metres, +x east, +z south
(+z is the driver's right when facing +x, as now). Traffic keeps left.

```ts
type RoadId = string;
type Road = {
  id: RoadId;
  name: string; ml: string;       // for direction boards
  points: [number, number][];     // centreline corners, in order
  closed?: boolean;               // the ring
  cornerRadius: number;           // metres; corners are quarter circles
  halfWidth: number;              // 6 (a 12 m road)
};
type TurnRule = "left" | "straight" | "right";
type Junction = {
  id: string;
  at: [number, number];                 // where the centrelines cross
  roads: RoadId[];                      // the roads that meet here (2 for a T counts the stem and the ring)
  signal: SignalSpec | false;           // timings as today, plus offset
  allowed: Record<string, TurnRule[]>;  // by approach id "<roadId>:<dir>", which turns may be taken
};
```

Default map (`NETWORK_V1`):

- **Ring** `ring`: corners (0,0), (800,0), (800,500), (0,500), closed, corner radius 40. Centreline length
  about 2,530 m.
- **Cross roads:** `ns` from (400,0) to (400,500) and `ew` from (0,250) to (800,250), radius not needed
  (straight).
- **Junctions (all signalled):** `north` (400,0) T, `south` (400,500) T, `west` (0,250) T, `east` (800,250) T,
  `centre` (400,250) four-way.
- **Default turn rules** (examples that exist so the rule is visible in play): at `centre`, no right turn
  from the south approach and no left turn from the north approach; at `north`, the stem (`ns` heading north)
  may only turn left or right (there is no straight), and from the west approach no right turn (carry on and
  loop round). Everything not listed allows all turns that exist.
- Road names with Malayalam text for direction boards (Ring Road, Station Road, Temple Road, ...).

`validateNetwork(network, places)` returns messages: roads that do not meet at their junctions, a corner
radius larger than half its shorter neighbouring segment, junctions closer than 150 m to each other along a
road, places on a road that does not exist or off its length, a rule naming an approach that is not there.
Invalid parts are skipped with a console message, as junctions are today.

### Geometry (pure, tested)

`logic/network.ts`:

- A road is an ordered list of **segments** (straight) and **arcs** (quarter circles at corners), built from
  its points and corner radius. `roadLength`, `pointAt(road, s)` and `headingAt(road, s)` give position and
  direction at a distance along the road.
- `nearest(network, x, z)` returns the closest road, distance along it, lateral offset and side.
- `drivable(network, x, z)`: within `halfWidth` of any road centreline, or inside a junction box
  (the square where roads cross), or inside a turn-around if one exists. `clampToDrivable` returns the nearest
  paved point (same contract as today, same tests carried over).
- `groundY` (footpath height band), `roadHalfWidthAt` and the "keep out" zones come from the network.

### Junctions and signals

- Each junction has one **approach** per road end that reaches it (3 for a T, 4 for the four-way). An approach
  has a stop line (as now: 7 m before the box) and a zebra crossing.
- **Signal groups:** approaches are grouped into two axes (for the T: the ring pair versus the stem; for the
  four-way: ns versus ew). The existing `signals.ts` cycle (main green, yellow, all red, cross green, yellow,
  all red) runs per junction with its own offset. `approachLight` works per approach via its axis.
- **Red light:** unchanged in effect (crossing the stop line on red, with the grace and the "already inside"
  rules), generalised to any approach of any junction. Fine Rs. 100 and half a star.
- **Turn rules:** `exitedBy(junction, from, to)` classifies the move as left, straight or right from the
  approach and exit headings. Leaving a junction by a turn that the approach does not allow is a **wrong
  turn**: Rs. 100, half a star, banner "Turn not allowed here". (Stage D adds the police officer and siren.)
- **Signal heads** show the allowed turns for their approach as small arrows under the lamps; a rule is also
  painted as an arrow on the road at the stop line. The "Next signal" HUD panel lists the allowed turns.

### Places

`places-v1.ts` is rewritten: each place is `{ road, s, side }` (distance along a road and which kerb) instead
of main/arm. About 14 places spread over the ring and the cross roads, each with English and Malayalam
names, shelters at the bus-stop style ones and name boards at the others. The depot is on the ring. A place
may not be within 30 m of a junction box, nor within 40 m of another place.

### Routing and navigation

`logic/roadgraph.ts` is rewritten for a network with cycles:

- Nodes are junctions and places; edges are road stretches between them with their lengths.
- **Dijkstra** over that graph gives the shortest route, **respecting the turn rules** (a route never
  makes a turn the junction forbids; a rule-compliant detour round the loop is chosen instead).
- Position snaps to the nearest road via `nearest`. Steps are left, right, straight-through-junction,
  U-turn, arrive. The first U-turn rule and `nextStep` behave as today.
- The radar and the turn-by-turn text are unchanged in use. "Turn left in 80 m" now also says when the way is
  "straight on through the junction".

### The scene

- **Road meshes** are built per road from segments and arcs (ribbons as now, with arcs sampled finely),
  junction boxes with kerb returns, zebra crossings and stop lines per approach. Footpaths and verges follow
  the roads and are cut where roads join.
- **Ground:** open ground outside and inside the blocks (paddy and hill look as now). The block interiors
  are left open for Stage C's town.
- **Scenery placement** (trees, flowers, grass, poles, current houses) moves from "slices along x" to a
  spatial grid around the vehicle: the world is laid out once, cut into grid cells, and the cells within
  draw range are drawn. Keep-out zones come from the network. The Stage A invariant test runs on the whole
  network. Houses along the roads remain as today until Stage C replaces them.
- **Signs and poles:** direction boards name the roads; speed signs (the 40) and zebra signs are placed per
  road; electric poles follow the roads.
- **Shelters and bays** at the bus-stop style places keep their look.
- **Pedestrians** cross only at zebras of the new network.
- **Radar** draws the whole loop (all roads, junction signals in their colour) at every zoom; the 1 km zoom
  shows most of the town.
- **Camera, weather, sound, accidents, voice** are unchanged.

### Migration notes

- `roadCenterZ(x)`, `roadAngle(x)` and `roadHalfWidthAt(x)` disappear. Everything that used them is rewritten
  against the network (`pointAt`, `headingAt`, `nearest`).
- `data/junctions-v1.ts` and `data/route-v1.ts` are replaced by `network-v1.ts`; `world.ts` exports the
  validated network.
- `vehicle.ts` physics is unchanged except the bounds callback now takes the network.
- The depot start pose, the day clock, requests, rides, fares and rating are unchanged.

### Out of scope

Other traffic, one-way streets, roundabouts, bridges, curved roads other than the ring's rounded corners,
police and fines beyond the red light and wrong turn (Stage D), the new building catalogue (Stage C), the new
UI (Stage E).

### Files (new / changed)

```
src/game/data/network-v1.ts          the map: roads, junctions, turn rules
src/game/logic/network.ts            segments, arcs, pointAt, nearest, drivable, clamp, keep-out zones
src/game/logic/turns.ts              classify a junction move, allowed turns, wrong-turn detection
src/game/logic/signals.ts            per-junction, per-approach lights (axis-based)
src/game/logic/redlight.ts           any approach of any junction
src/game/logic/roadgraph.ts          graph with cycles, Dijkstra, turn rules, steps
src/game/logic/places.ts             spots from {road, s, side}
src/game/logic/layout.ts, footprint.ts, plants.ts   placement on the network, grid cells
src/game/Road.tsx, Junctions.tsx, SignalHeads.tsx, Ground.tsx, Scenery.tsx, Signs.tsx, Pedestrians.tsx, Stops.tsx, Places.tsx
src/ui/Minimap.tsx                   draws the network
```

### Testing

- `network.test.ts`: lengths of the ring and cross roads; `pointAt`/`headingAt` at corners and straights;
  `nearest` returns the right road and side; `drivable` and `clampToDrivable` (on a road, at a junction box,
  beside a corner, on the footpath); idempotent clamp; every point on a centreline is drivable.
- `validateNetwork` accepts the default map and flags each bad case with its id.
- `turns.test.ts`: classify left/straight/right for all approach and exit pairs at the T and the four-way;
  allowed-turn tables; a forbidden exit is a wrong turn once; an allowed one is not; reversing does not
  count.
- `signals`/`redlight` tests carried over and extended: every approach of a T and a four-way fines on red,
  never on green or yellow.
- `roadgraph.test.ts`: routes between places on the ring and on the cross roads; the route around the loop in
  either direction; a route that must detour because a turn is forbidden; the loop closes (a place just
  behind you is reached by going round, or by a U-turn when allowed); turns and arrival side; `nextStep` and
  `offRoute` as today.
- Layout test (the Stage A invariant): no plant, tree, pole, sign or building footprint overlaps the drivable
  area, a junction box, a footpath or a zebra, for the whole network and for a moved junction.
- Store and ride tests keep passing with the new places and distances; the shift simulation is re-tuned
  (fares, goals) for the new distances and must still show the goal reachable on most days and not every day.
- Manual browser check (screenshots): each junction type, each corner, the loop, a signal with turn arrows,
  the radar route going round the loop, no grass on tarmac anywhere.

### Risks and assumptions

- This is a rebuild of the world's geometry. The game is not playable between its first and last task, so the
  work is done on the branch and merged only when the whole stage passes.
- Quarter-circle corners and junction boxes are the hardest geometry; they are built from simple strips and
  checked by screenshots and by the drivable-area tests.
- Scenery draw performance changes from slices to grid cells; the existing instancing is kept and the
  triangle budget (about 90k) is checked.
- Turn-rule and place data are hand-set; the validator catches mistakes but not bad taste.
- The test browser runs at about 1.5 fps, so driving the loop cannot be played there; it is checked by tests,
  headless simulation and screenshots.
- The default turn rules (which turns are forbidden where) are my choice to make the rule visible; they are
  data and can be changed in one file.

### Acceptance checklist

- [ ] No plant stands on tarmac, a junction, a footpath or a zebra (test) and none is seen in screenshots.
- [ ] The map is a closed ring with two cross roads and five signalled junctions.
- [ ] Each signal head shows its allowed turns; the HUD lists them; arrows are painted at the stop line.
- [ ] A turn that is not allowed is fined once with a clear banner.
- [ ] Routes go round the loop, respect the turn rules and update when you leave them.
- [ ] Places, requests, rides, fares, conversation and voice still work on the loop.
- [ ] The radar shows the whole loop and the route.
- [ ] Full test suite, type check, lint and build pass; README explains the network file.
