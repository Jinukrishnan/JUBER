# Grass Fix and Loop Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (the user chose inline "native" execution) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop plants standing on tarmac (Stage A), then replace the single long road with a closed ring road plus two cross roads, five signalled junctions with per-approach turn rules, and move places, routing, rides, scenery and radar onto it (Stage B).

**Architecture:** A road **network** (`data/network-v1.ts`) is the single source of the map. Pure geometry and rules live in `src/game/logic/*` (network, turns, signals, roadgraph, places), all unit tested; R3F components only render. Scenery moves from slices along x to grid cells around the vehicle. Stage B is done on branch `feat/loop-map` (branched from `feat/annawadi`) and merged only when the whole stage is green.

**Tech Stack:** Next.js 16 (see `AGENTS.md`), React 19, TypeScript, Tailwind v4, @react-three/fiber v9, Zustand, Vitest 5 (jsdom via `// @vitest-environment jsdom`).

**Spec:** `docs/superpowers/specs/2026-10-31-stage-ab-grass-and-loop-design.md` (and the roadmap `2026-10-31-town-roadmap.md`)

## Global Constraints

- Coordinates in metres: +x east, +z south; heading 0 faces +x; +z is the driver's right; traffic keeps left. Bus-pose convention `ry = -heading` for instanced items stays.
- Default map (`NETWORK_V1`): ring corners (0,0),(800,0),(800,500),(0,500), closed, corner radius 40; cross roads `ns` (400,0)->(400,500) and `ew` (0,250)->(800,250); road half-width 6; footpath 3.6; verge 1.8; kerb 0.15; junctions `north` (400,0), `south` (400,500), `west` (0,250), `east` (800,250), `centre` (400,250), all signalled with the existing 28/14/3/2 s plan and offsets 0/12/24/36/6.
- Default turn rules (data): `centre`: no right from the south approach, no left from the north approach; `north`: the stem may only turn left or right, no right from the west approach; all else allows every turn that exists.
- Stop line 7 m before a junction box; zebra crossing on every approach (3.5 m long, centre 3.65 m before the box); signal 28/14/3/2 s with 0.4 s red grace; red-light fine Rs. 100 and half a star; a wrong turn costs the same, once per move, banner "Turn not allowed here".
- Places: at least 30 m from a junction box and 40 m from another place; about 14, English and Malayalam names; depot on the ring.
- Keep: requests, rides, fares, rating, conversation, voice, accidents, camera, weather, sound unchanged in behaviour. Tests that cover them must keep passing (updated only where positions or distances change).
- No `Math.random` in layout or render setup (seeded `mulberry32`); no drei `<Html>`; triangle budget about 90k.
- CRLF files: edit with `.replace(/\r\n/g, "\n")` scripts or the Edit/Write tools. Do not put large heredocs in the shell (they fail with apostrophes); use the Write tool.
- Commits use `-c user.name="Jinu" -c user.email="sarath@zilmoney.com"` and end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- A vehicle on a corner arc, in a junction box, or just past a road end is still `drivable` and `clampToDrivable` is idempotent there; no gap between a road and a junction box lets a vehicle fall off.
- Turn rules: a legal route never uses a forbidden turn; when the only short way is forbidden, a longer legal way is chosen; a U-turn is only suggested where allowed; a wrong turn is fined once and not when reversing.
- A place near a junction or on an arc is reachable, and `customerSpot` is on the footpath, never in the road or a junction.
- Signals at a T: the stem and the ring pair never both green; every approach (all of a T's three, the four-way's four) fines on red.
- The Stage A invariant (no plant, tree, pole, sign or building on tarmac, junction box, footpath, zebra) holds for the whole network and for a moved junction.
- Day end, pause and a hit customer mid-route do not leave a stale route or a half-built scene; startDay from any state resets to the depot on the ring.

---

## Stage A: grass in the road

### Task 1: The invariant test, then the cause

**Files:**
- Create: `src/game/logic/plantsInvariant.test.ts`
- Modify (as the cause dictates): `src/game/plants.ts`, `src/game/Foliage.tsx`, `src/game/Ground.tsx`, `src/game/Road.tsx`, `src/game/Junctions.tsx`, `src/game/logic/layout.ts`, `src/game/logic/footprint.ts`

**Interfaces:**
- Consumes: `layoutScenery`, `keepOutZones`, `JUNCTIONS`, `drivable`, `groundY`, the grass-tuft and flower generators in `plants.ts`.
- Produces: a test `no plant stands on the road` that enumerates every tree, flower, bush and grass tuft position and asserts it is not `drivable`, not in the footpath/kerb band of the main road or any arm, and not on a zebra stripe.

- [ ] **Step 1: Write the failing test** over the current world. Enumerate placements from `layoutScenery(SEED, ...)` and tufts from the generator the slice renderer uses; assert for each point: `!drivable(JUNCTIONS, x, z)`, `groundY(x, z) === 0` (not on a footpath) and not within an arm footpath strip.
- [ ] **Step 2: Run** `npx vitest run src/game/logic/plantsInvariant.test.ts` — Expected: either FAIL with a list of offending points (the cause) or PASS (then go to Step 3b).
- [ ] **Step 3a (FAIL):** read the offending coordinates, find which generator or zone is missing, fix it, rerun until PASS.
- [ ] **Step 3b (PASS):** the cause is in drawing. Take screenshots at each junction, bend and road end (temporary start pose, reverted after) and inspect: ground or paddy meshes through asphalt (check the y layers 0.005 / 0.01 / 0.02 / 0.03 / 0.045 and the near/far planes), asphalt gaps where an arm joins the footpath and verge, textures with green showing at ribbon edges. Fix by correcting layer heights, widening the arm strip over the gap, or adding `polygonOffset` to the asphalt and paint.
- [ ] **Step 4:** run `npx vitest run && npx tsc --noEmit && npx eslint src`; confirm by screenshot that no grass remains on tarmac at every junction, bend and end. Record the cause in the commit message.
- [ ] **Step 5: Commit** `fix: grass on the road (<cause>)`.

---

## Stage B: the loop map (branch `feat/loop-map`)

### Task 2: Network data and geometry

**Files:**
- Create: `src/game/data/network-v1.ts`, `src/game/logic/network.ts`, `src/game/logic/network.test.ts`

**Interfaces:**
- Produces: types `RoadId`, `Road`, `Junction`, `TurnRule`, `Network`; `NETWORK_V1: Network`; `buildRoad(road): BuiltRoad` with `segments` (straight) and `arcs` (quarter circles); `roadLength(r)`, `pointAt(r, s): { x; z }`, `headingAt(r, s): number` (closed roads wrap `s`).

- [ ] **Step 1: Write failing tests:** ring length about 2,531 m (±1); `ns` 500 m and `ew` 800 m; `pointAt(ring, 0)` is the start and `pointAt(ring, length)` equals it (closed); at a corner the heading turns smoothly by 90 degrees over the arc; points on arcs are 40 m from the arc centre; `headingAt` on each straight matches the segment direction.
- [ ] **Step 2: Run** — Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `network-v1.ts` (the Global Constraints map, road names and Malayalam names) and `network.ts` geometry.
- [ ] **Step 4: Run tests** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: road network data and geometry`.

### Task 3: Nearest, drivable, clamp, validation, keep-out zones

**Files:**
- Modify: `src/game/logic/network.ts`, `network.test.ts`

**Interfaces:**
- Produces: `nearest(n, x, z): { road; s; lateral; side: -1 | 1; distance }`; `drivable(n, x, z): boolean` (within `halfWidth` of a centreline, or inside a junction box, with EPS); `clampToDrivable(n, x, z): { x; z; clamped }` (same contract as `junction.ts` today); `groundY(n, x, z)` (0.15 on a footpath band, else 0); `keepOutShapes(n): Shape[]` (road, footpath, verge strips and junction boxes as `footprint.ts` rects/circles); `validateNetwork(n, places): { problems: string[]; valid: Network }`.

- [ ] **Step 1: Write failing tests:** every centreline point is drivable; 6.1 m off is not; junction box corners are drivable; the footpath band is not drivable and has `groundY` 0.15; `clampToDrivable` is idempotent over a grid of 500 points including corners, boxes and outside the ring; `nearest` returns the right road and side on a straight and on an arc; validate flags: a road not meeting its junction, a corner radius over half the shorter neighbour, two junctions under 150 m apart on a road, a place beyond a road's length; accepts `NETWORK_V1`.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** using segment/arc distance functions; the junction box is the square of side `2 * halfWidth + 2 * kerbReturn` around the crossing.
- [ ] **Step 4: Run** `npx vitest run src/game/logic/network.test.ts` — Expected: PASS.
- [ ] **Step 5: Commit** `feat: network queries, drivable area and validation`.

### Task 4: Junction approaches and turn rules

**Files:**
- Create: `src/game/logic/turns.ts`, `src/game/logic/turns.test.ts`
- Modify: `src/game/data/network-v1.ts` (turn rules)

**Interfaces:**
- Consumes: Tasks 2 and 3.
- Produces: `approachesOf(n, junctionId): Approach[]` where `Approach = { id: "<roadId>:<dir>"; road; dir: 1 | -1; heading; stopLineAt: {x;z}; zebraAt: {x;z}; axis: "main" | "cross" }`; `classifyTurn(entryHeading, exitHeading): TurnRule | "uturn"`; `allowedTurns(n, junctionId, approachId): TurnRule[]`; `moveAt(n, junction, prev, next): { approach; exit; turn } | null` (detects entering and leaving the box); `isWrongTurn(n, junctionId, approachId, turn): boolean`.

- [ ] **Step 1: Write failing tests:** a T has 3 approaches and the four-way 4; `classifyTurn` gives left/straight/right for every approach and exit pair at both junction types (headings from the real network); `allowedTurns` honours the default rules (e.g. centre south approach has no right); `isWrongTurn` is true for a forbidden turn and false otherwise; `moveAt` reports one move per box crossing and none when the vehicle only touches the box edge or reverses back out.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement**; axis for a T: the two ring approaches are `main`, the stem is `cross`; for the four-way ring-parallel (ew) is `main`, ns is `cross`.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: junction approaches and turn rules`.

### Task 5: Signals and red-light rule per approach

**Files:**
- Modify: `src/game/logic/signals.ts`, `signals.test.ts`, `redlight.ts`, `redlight.test.ts`, `src/game/logic/signalAhead.ts`, `signalAhead.test.ts`

**Interfaces:**
- Consumes: Task 4 `Approach`, `axis`.
- Produces: `approachLight(junction, t, approach): Light` using the approach's axis; `redViolation(n, junctionId, approachId, prev, next, t, half?)` generalised; `nextSignalAhead(n, pose, t): { id; distance; light; seconds; turns: TurnRule[] } | null` for the approach the vehicle is heading into.

- [ ] **Step 1: Write failing tests:** at a T the stem and a ring approach are never both green or both non-red; every approach of every junction fines on red (grace and "already inside" kept), never on green or yellow, not when reversing; `nextSignalAhead` returns the allowed turns for the approach and ignores junctions behind or off the road being driven.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** by replacing the four hard-wired approaches (`mainForward` ...) with the network's approaches; keep `resolvePlan`, `signalAt`, `redAge`, `untilChange`.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: signals and red lights for any approach`.

### Task 6: Places on the network

**Files:**
- Modify: `src/game/data/places-v1.ts`, `src/game/logic/places.ts`, `places.test.ts`

**Interfaces:**
- Consumes: Tasks 2 to 4.
- Produces: `Place = { id; name; ml; road: RoadId; s: number; side: -1 | 1 }`; `PLACES` (about 14, depot on the ring); `placeSpot(n, place): { x; z; heading }` (kerbside, left kerb for the direction of travel on that side); `customerSpot(n, place, k): { x; z }` (on the footpath, 0.9 m spacing); `placesAreValid(n, places): string[]` (road exists, `s` within length, 30 m from a box, 40 m from another place).

- [ ] **Step 1: Write failing tests:** every place spot is drivable; every customer spot is not drivable and has `groundY` 0.15; no spot within 30 m of a junction box or 40 m of another spot; `PLACES` has English and Malayalam names, unique ids, and `placesAreValid` is empty; a place beyond its road is reported.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** and write the new place list across the ring and cross roads, reusing the old names (Aanawadi Depot, Thennalpadi, Mullakkunnu, Karimbanam, Vattakkulam, Chembolimukku, Nellimala Junction, Panchayat Office, St. Mary's Church, Paddy Farm, Juma Masjid, Govt. Hospital, Ayyappan Temple, Primary School).
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: places on the loop`.

### Task 7: Routing with cycles and turn rules

**Files:**
- Rewrite: `src/game/logic/roadgraph.ts`, `roadgraph.test.ts`
- Modify: `src/game/rideWorld.ts`, `rideWorld.test.ts`, `logic/navtext.ts` (straight-on step), `navtext.test.ts`

**Interfaces:**
- Consumes: Tasks 2 to 6.
- Produces: `buildGraph(n, places): Graph`; `route(g, from: { x; z; heading? }, to: Place): Route` (same `Route`/`Step` shape as today plus `Turn` gaining `"straight"` for a signalled pass-through); `nextStep(r, p, heading?)`, `offRoute(r, p, limit?)` unchanged in use; `RIDE_WORLD.distance` uses `route(...).length`.

- [ ] **Step 1: Write failing tests:** a route between two places on the ring takes the shorter way round; the other direction gives the other way round; a route into a cross road turns left or right at the right junction; **a route never makes a forbidden turn** (check against `isWrongTurn` for every junction move on 200 random place pairs); when the direct turn is forbidden the route is longer and legal; a place just behind the vehicle is reached by going round, or by a U-turn only where one is allowed; `uturn` first step when facing away; `arrive` side; `nextStep` and `offRoute` behave as before.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** Dijkstra over states `(approach)` so turn rules apply per move; snap positions with `nearest`; keep the "opening U-turn stays due until turned round" behaviour.
- [ ] **Step 4: Run** `npx vitest run src/game/logic src/game/rideWorld.test.ts` — Expected: PASS.
- [ ] **Step 5: Commit** `feat: routing on the loop with turn rules`.

### Task 8: World wiring, vehicle bounds, wrong-turn fine

**Files:**
- Modify: `src/game/world.ts`, `src/game/Vehicle.tsx`, `src/game/busPose.ts` (depot pose from the depot place), `src/game/state/store.ts`, `store.test.ts`, `src/game/logic/vehicle.test.ts` and the ride tests
- Delete: `src/game/data/junctions-v1.ts`, `src/game/data/route-v1.ts`, `src/game/logic/junction.ts` and its tests (superseded)

**Interfaces:**
- Consumes: Tasks 2 to 7.
- Produces: `world.ts` exports the validated `NETWORK` (console message per problem); `store.registerWrongTurn()` (Rs. 100, `wrongTurns` +1, banner "Turn not allowed here", rating -0.5 per, in `computeRating({..., wrongTurns})`); `Vehicle.tsx` uses `clampToDrivable(NETWORK, ...)`, checks `redViolation` and `moveAt`/`isWrongTurn` each frame for junctions within 60 m.

- [ ] **Step 1: Write failing tests:** `registerWrongTurn` fines, counts, shows the notice, resets on a new day; rating loses 0.5 per wrong turn; a headless drive through a junction box (using `stepVehicle` with the network bounds) makes exactly one wrong turn fine for a forbidden exit and none for an allowed one, and none when reversing out; a vehicle driven 50 m beyond a road end is clamped back; `startDay` puts the vehicle at the depot on the ring.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement**; update imports everywhere that used `JUNCTIONS`, `ROUTE_V1`, `roadCenterZ` for logic (rendering migrates in Tasks 9 to 12 — keep the old road module alive until Task 12 so the branch compiles; mark it with a TODO comment that Task 12 deletes).
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit` — Expected: PASS.
- [ ] **Step 5: Commit** `feat: the loop network drives the vehicle; wrong turns are fined`.

### Task 9: Roads, junction boxes and markings in the scene

**Files:**
- Rewrite: `src/game/Road.tsx`, `src/game/Junctions.tsx`, `src/game/junctionParts.ts`, `junctionParts.test.ts`
- Modify: `src/game/GameCanvas.tsx`

**Interfaces:**
- Consumes: Tasks 2 to 4 and 8.
- Produces: `roadParts(n): { asphalt; footpaths; kerbs; verges; edgeLines; centreDashes }` as geometry/instance data per road (straights as ribbons, arcs sampled at about 5 degrees); `junctionParts(n, junctionId): { zebra; stopLines; turnArrows; kerbReturns }` in world coordinates; the footpath, verge and edge lines are cut where roads join; paint layers keep the y ordering from Stage A (with `polygonOffset` if Stage A needed it).

- [ ] **Step 1: Write failing tests (pure parts):** every junction has one stop line and one zebra per approach; turn arrows exist for each allowed turn and none for forbidden ones; centre dashes stop 8 m before a box; ribbons of the ring close without a gap; no road ribbon vertex lies inside another road's junction box except at the box edge.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** the pure builders then the components.
- [ ] **Step 4: Run** tests, then screenshots of each junction type, a corner and a straight (temporary start poses, reverted) — Expected: roads join cleanly, no gaps or grass on tarmac.
- [ ] **Step 5: Commit** `feat: the loop road, junction boxes and markings`.

### Task 10: Signal heads with turn arrows; HUD

**Files:**
- Modify: `src/game/SignalHeads.tsx`, `src/ui/Hud.tsx`, `src/ui/Hud.test.tsx`

**Interfaces:**
- Consumes: Tasks 4, 5, 9.
- Produces: a signal pole at the left kerb of every approach with three lamps and an arrow plate listing the allowed turns; the "Next signal" panel shows the lamp, distance, seconds and small arrows for the allowed turns; no panel when no signal is ahead on the road being driven.

- [ ] **Step 1: Write failing tests:** Hud shows the panel with arrows for a given `nextSignalAhead` (left+right only, all three, none); hides it with no signal.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** tests and a screenshot of a signal at the north T.
- [ ] **Step 5: Commit** `feat: signal heads and the HUD show the allowed turns`.

### Task 11: Scenery on the network (the invariant for the whole map)

**Files:**
- Rewrite: `src/game/logic/layout.ts`, `footprint.ts` (keep-out from `keepOutShapes`), `plants.ts`, `logic/slices.ts` (grid cells), `src/game/Scenery.tsx`, `Ground.tsx`, `Signs.tsx`, `logic/roadside.ts`, `Pedestrians.tsx`, `Stops.tsx`, `Places.tsx`, `Foliage.tsx`
- Modify: `plantsInvariant.test.ts`, `layout.test.ts`, `footprint.test.ts`, `roadside.test.ts`, `slices.test.ts`

**Interfaces:**
- Consumes: Tasks 2, 3, 6.
- Produces: `layoutScenery(seed, network, places): { placements; isGroundFree }` placing houses, trees, flowers and poles along both sides of every road, never in a keep-out shape; `cellsAround(x, z, range): CellKey[]` grid cells (100 m) replacing slices, with the near/far detail split as before; `roadFeatures(n, places)` zebras per approach, 40 km/h signs per road, direction boards naming roads; pedestrians cross only at the network's zebras; shelters at the bus-stop style places.

- [ ] **Step 1: Write failing tests:** the Stage A invariant over the whole map (no placement, tuft, pole or sign on tarmac, a junction box, a footpath or a zebra); same for a moved junction in a test network; layout is deterministic per seed; `cellsAround` returns the 3x3 neighbourhood plus range and each placement lives in exactly one cell; pedestrians' crossing points are on zebras; every road has a speed sign and direction boards.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement**; keep Instances batching; measure mesh and triangle counts with `renderer.info` in a screenshot run and keep within about 90k.
- [ ] **Step 4: Run** `npx vitest run`; screenshots along a straight, a corner and a junction — Expected: PASS and no grass on tarmac.
- [ ] **Step 5: Commit** `feat: scenery placed on the loop; invariant holds for the whole map`.

### Task 12: Radar, remove the old road, README

**Files:**
- Modify: `src/ui/Minimap.tsx`, `src/game/logic/radar.ts`, `radar.test.ts`, `README.md`
- Delete: `src/game/logic/road.ts`, `road.test.ts`, `src/game/logic/roadside.ts` leftovers, any file still importing the old one-road functions

**Interfaces:**
- Consumes: all earlier tasks.
- Produces: the radar draws every road (polyline with arcs), junction signals in their colours and the route at all three zooms; `road.ts` and the one-road functions are gone.

- [ ] **Step 1: Write failing tests:** `radar.ts` helper `roadsToRadar(view, polylines, range, radius)` rotates with heading and clips to the radius; the ring is drawn closed.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement**; delete the old road module and fix imports; update the README (network file, how to move a junction or change a turn rule, places on roads).
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit && npx eslint src && npx next build` — Expected: all pass; `grep -rn "roadCenterZ\|roadHalfWidthAt" src` finds nothing.
- [ ] **Step 5: Commit** `feat: radar shows the loop; remove the one-road code; README`.

### Task 13: Balance, final checks, review

**Files:**
- Modify: `src/game/state/shift.sim.test.ts`, `src/game/data/vehicles.ts` (numbers only)

- [ ] **Step 1:** run the shift simulation with the new distances; it will probably fail the 50 to 99 percent band.
- [ ] **Step 2:** tune fares, rents and goals in `vehicles.ts` only until a competent scripted driver reaches the goal on most days but not every day for each vehicle; ledger the final numbers as a ruling.
- [ ] **Step 3:** headless check: drive a scripted vehicle round the whole ring and each cross road with the real physics and bounds and assert it never leaves the drivable area and passes every junction without a wrong-turn fine when it takes allowed exits.
- [ ] **Step 4:** full gate `npx vitest run && npx tsc --noEmit && npx eslint src && npx next build`; screenshot tour of every junction, corner and the radar.
- [ ] **Step 5:** run the final whole-branch review by a fresh reviewer (most capable model) using the Review Focus above, fix pass, merge `feat/loop-map` into `feat/annawadi`, report rulings and deferred minors.
