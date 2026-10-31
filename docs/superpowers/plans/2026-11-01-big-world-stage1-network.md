# Big World, Stage 1: Network and Places Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 800 x 500 m loop with the 2.4 x 1.5 km road network (about 28 junctions, about 40 places), keep it fully drivable, routable and populated with 80 vehicles, and retune fares so the daily goals still work. Result: a bigger town on plain roads.

**Architecture:** The map stays data. A new pure function `autoJunctions` finds every crossing and T-meeting of the roads, so the data file lists roads and a few rule overrides, not 28 junctions. `world.ts` switches from `NETWORK_V1`/`PLACES` to the V2 data; the V1 files stay as small test fixtures (the many existing tests import them directly). Road queries get a timing test first; a spatial index is added only if the test says it is needed.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest 5 (per-file `// @vitest-environment jsdom` where needed; heavy tests need explicit 60000 ms timeouts). Windows, Git Bash: write files with the Write tool, not heredocs with apostrophes.

**Spec:** `docs/superpowers/specs/2026-11-01-big-world-design.md` (this plan is its Stage 1; Stages 2 to 5 each get their own plan after the previous stage is merged).

## Global Constraints

- Coordinates are metres, +x east, +z south ("north" is -z), heading 0 faces +x, traffic keeps left.
- The village keeps its coordinates: ring road `(0,0)`-`(800,500)`, corner radius 40. World spans x 0..2400, z -760..900.
- Road half-width 6, junction box half 8 (`JUNCTION_BOX_HALF`), places at least 30 m from a junction box and 40 m from another place, junctions on one road at least 150 m apart (`validateNetwork` enforces).
- Every junction is signalled (`signal: { offset }`, plan 28/14/3/2 s, cycle 52 s) with its own offset; turn rules stay data.
- Malayalam names are invented; the README note that a native speaker must proofread stays.
- Traffic count 45 becomes 80; fares and goals retuned (the shift simulation decides).
- Keep CRLF files CRLF (edit through scripts that normalise `\r\n`).
- No new dependencies.

## Review Focus

- A route between any two places exists and uses no forbidden turn (the planner is the part most likely to fail on a bigger graph).
- A place or the depot sitting on a road whose `s` shifted when `ns` was extended north (places on `ns` must move by +130).
- A T-junction where a road ends on another road (ns on Dam Road, avenue streets on x=2300) behaves like the existing `north` stem: approaches from the end only turn.
- Start-up time: `buildScenery()` over a six times bigger network must stay under 3 s in the test environment (stage 2 makes it lazy; if over budget, rule and note it in the ledger).
- Vehicle spawn: 80 agents must start without overlapping each other or the player's depot.

---

### Task 1: Junctions from the roads

**Files:**
- Create: `src/game/logic/junctions.ts`
- Test: `src/game/logic/junctions.test.ts`

**Interfaces:**
- Consumes: `Road`, `Junction`, `SignalSpec` from `src/game/data/network-v1.ts`.
- Produces: `autoJunctions(roads: Road[], overrides?: Record<string, Partial<Pick<Junction, "id" | "allowed">>>): Junction[]`. The override key is `"x,z"` of the crossing (integers, e.g. `"400,0"`). Ids default to the sorted road ids joined with `+` (`"ew+ns"`); several junctions of the same road pair get `#2`, `#3`... Signal offset is `(index * 11) % 52` in discovery order (sorted by x, then z), `allowed` defaults to `{}`.

- [ ] **Step 1: Write the failing tests** in `junctions.test.ts`: (a) two crossing straight roads give one junction at the crossing with both ids; (b) a road ending on another road (T) gives a junction; (c) two parallel roads give none; (d) the closed `ring` of V1 crossed by `ns` and `ew` gives exactly four junctions at `(400,0) (400,500) (0,250) (800,250)` plus the `ns`/`ew` centre one, and no junction at the rounded corners; (e) overrides rename a junction and set `allowed`; (f) offsets are all different for 5 junctions and below 52.
- [ ] **Step 2: Run** `npx vitest run src/game/logic/junctions.test.ts`. Expected: FAIL, `autoJunctions` not defined.
- [ ] **Step 3: Implement `autoJunctions`** in `junctions.ts`. Walk every axis-aligned edge of every road (closed roads include the closing edge); for each pair of edges from different roads that meet (crossing or touching at an end), record the point; merge equal points; the road list of a point is every road with an edge through it. Edges are horizontal or vertical (assert and skip others with a thrown Error naming the road).
- [ ] **Step 4: Run the test.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: find junctions from the roads`.

---

### Task 2: The V2 network data

**Files:**
- Create: `src/game/data/network-v2.ts`
- Test: `src/game/data/network-v2.test.ts`

**Interfaces:**
- Consumes: `Network`, `Road`, `ROAD_HALF_WIDTH` (network-v1.ts), `autoJunctions` (Task 1), `validateNetwork` (network.ts).
- Produces: `export const NETWORK_V2: Network`. Roads (ids are fixed; later stages and places use them):

| id | name | points | notes |
|---|---|---|---|
| `ring` | Ring Road | as V1 | closed, corner 40 |
| `ns` | Station Road | `[400,-130] → [400,500]` | starts at the Dam Road, so every place on it shifts by +130 |
| `ew` | Tech Avenue | `[0,250] → [2300,250]` | was Temple Road; renamed, `ml` "ടെക് അവന്യൂ" (the village places on it keep their `s`) |
| `dam` | Dam Road | `[100,-130] → [1300,-130]` | |
| `c1100` | First Street | `[1100,-130] → [1100,900]` | |
| `c1300` | Second Street | `[1300,-130] → [1300,900]` | |
| `c1500` | Park West Street | `[1500,0] → [1500,900]` | |
| `c1900` | Park East Street | `[1900,0] → [1900,900]` | |
| `c2300` | Last Street | `[2300,0] → [2300,900]` | |
| `r0` | North Cross Road | `[1100,0] → [2300,0]` | |
| `r550` | Middle Cross Road | `[1100,550] → [2300,550]` | |
| `r900` | South Cross Road | `[1100,900] → [2300,900]` | |

All city roads: `cornerRadius: 0`, `halfWidth: ROAD_HALF_WIDTH`. Malayalam names are invented (flag in README).
`junctions = autoJunctions(roads, overrides)` where overrides keep V1's rules: at `"400,0"` (`ring+ns`) `allowed: { "ring:1": ["left","straight"] }`; at `"400,250"` (`ew+ns`) `allowed: { "ns:-1": ["left","straight"], "ns:1": ["straight","right"] }`; plus three city rules so rules are visible: at `"1500,250"` `allowed: { "ew:1": ["left","straight"] }`, at `"1900,550"` `allowed: { "c1900:1": ["straight","right"] }`, at `"1300,0"` `allowed: { "r0:-1": ["left","straight"] }`.

- [ ] **Step 1: Write the failing tests** in `network-v2.test.ts`: `validateNetwork(NETWORK_V2, [])` returns no problems and keeps every road and junction; there are between 26 and 32 junctions; every junction has a signal with a distinct offset below 52 where roads are the same pair; `ns` begins at `(400,-130)`; junctions exist at `(400,-130)`, `(1100,-130)`, `(1300,-130)` and `(2300,900)`; the ring's `north`, `south`, `west`, `east` positions are junctions with 2 roads each; every `allowed` key names a road at its junction (validate does this, assert no problems).
- [ ] **Step 2: Run** `npx vitest run src/game/data/network-v2.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `network-v2.ts`** with the table above. Export the override table separately (`JUNCTION_RULES`) so later stages extend it.
- [ ] **Step 4: Run the test.** Expected: PASS. If `validateNetwork` reports a 150 m violation, report it and adjust the data; never relax the validator.
- [ ] **Step 5: Commit** `feat: the big road network (data)`.

---

### Task 3: About 40 places

**Files:**
- Create: `src/game/data/places-v2.ts`
- Test: `src/game/data/places-v2.test.ts`

**Interfaces:**
- Consumes: `Place` (places-v1.ts), `NETWORK_V2`, `placesAreValid` (places.ts).
- Produces: `export const PLACES_V2: Place[]`. Keep the 14 village places with the same ids; add `130` to `s` of `hospital` (now 250) and `temple` (now 510) because `ns` grew north. The Temple Road places (`school`, `paddy`, `masjid`) stay on `ew` with unchanged `s`. Add at least 26 more (ids are fixed, positions are approximate; adjust `s` until `placesAreValid` is clean, keeping the side given):

| id | name | road | s | side |
|---|---|---|---|---|
| `dam_view` | Dam View Point | `dam` | 700 | -1 |
| `jetty` | Boat Jetty | `dam` | 160 | -1 |
| `fishing_pier` | Fishing Pier | `dam` | 850 | -1 |
| `control_room` | Dam Control Room | `dam` | 1150 | 1 |
| `city_mall` | City Mall | `ew` | 1200 | 1 |
| `tech_office` | Tech Park Office | `ew` | 1400 | -1 |
| `central_park_n` | Central Park North | `ew` | 1700 | 1 |
| `university` | Technical University | `ew` | 2100 | -1 |
| `apartments` | Skyline Apartments | `ew` | 2200 | 1 |
| `city_hospital` | General Hospital | `c1100` | 255 | 1 |
| `bus_terminal` | Bus Terminal | `c1100` | 855 | -1 |
| `school_city` | International School | `c1100` | 530 | 1 |
| `market` | City Market | `c1300` | 530 | -1 |
| `hotel` | Grand Hotel | `c1300` | 255 | 1 |
| `bank` | Federal Bank | `c1300` | 855 | -1 |
| `park_w` | Central Park West Gate | `c1500` | 400 | -1 |
| `tech_hub` | Tech Hub | `c1500` | 125 | 1 |
| `towers` | Twin Towers | `c1500` | 725 | 1 |
| `park_e` | Central Park East Gate | `c1900` | 400 | 1 |
| `stadium` | City Stadium | `c1900` | 725 | -1 |
| `offices_a` | Office Plaza | `c1900` | 125 | -1 |
| `homes_a` | Green Homes | `c2300` | 400 | 1 |
| `homes_b` | Lake Homes | `c2300` | 125 | -1 |
| `fire` | Fire Station | `c2300` | 725 | -1 |
| `cinema` | Multiplex Cinema | `r0` | 100 | 1 |
| `cafe` | Cafe Street | `r550` | 300 | 1 |
| `shops_a` | Shopping Arcade | `r550` | 1000 | -1 |
| `warehouse` | Logistics Hub | `r900` | 600 | 1 |

Every `ml` Malayalam name is invented (a comment says so). Metro stations are added in Stage 4. Shelter places get `shelter: true` the way V1 does (bus terminal, school, market, hospital).

- [ ] **Step 1: Write the failing tests** in `places-v2.test.ts`: ids are unique; at least 38 places; `placesAreValid(NETWORK_V2, PLACES_V2)` is `[]`; `depot` exists on `ring` at `s` 100; `hospital.s === 250` and `temple.s === 510`; every place road exists in `NETWORK_V2`; at least 20 places have x > 1000 (city side).
- [ ] **Step 2: Run** `npx vitest run src/game/data/places-v2.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `places-v2.ts`** from the table, then tune `s` values (keep them mid-block) until the test passes.
- [ ] **Step 4: Run the test.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: about 40 places (data)`.

---

### Task 4: Query cost, measured first

**Files:**
- Create: `src/game/logic/network.perf.test.ts`
- Modify (only if the test fails): `src/game/logic/network.ts`; Create `src/game/logic/roadIndex.ts`

**Interfaces:**
- Consumes: `drivable`, `nearest`, `clampToDrivable`, `groundY` (network.ts), `NETWORK_V2`.
- Produces (only if needed): `roadIndex(n: Network): { near(x: number, z: number, r: number): BuiltRoad[] }` that returns the roads with a piece within `r` of the point, built once per network (a `WeakMap` like `builtRoads`), 100 m grid cells over piece bounding boxes; `nearest`, `drivable`, `groundY`, `clampToDrivable` then loop over `near(x, z, halfWidth + footpath + 20)` (falling back to every road when none is near).

- [ ] **Step 1: Write the timing test** (explicit `60000` timeout): over 20000 seeded random points inside the world, `drivable`, `nearest` and `groundY` together take under 400 ms on `NETWORK_V2` (80 vehicles x 60 fps x 4 queries is about 20000 per second, so this is one second of game).
- [ ] **Step 2: Run** `npx vitest run src/game/logic/network.perf.test.ts`. Expected: PASS means the index is not needed; ledger `Ruling: no spatial index at this size (N pieces)` and skip Steps 3 to 5. FAIL means continue.
- [ ] **Step 3 (only on FAIL): Write an equivalence test** in the same file: for 2000 random points `indexed === brute force` for `nearest`, `drivable`, `groundY`, `clampToDrivable`, compared against a copy of the old loop kept in the test.
- [ ] **Step 4 (only on FAIL): Implement `roadIndex.ts`** and use it in the four functions; run both tests until green, then the whole `network.test.ts`.
- [ ] **Step 5: Commit** `test: road query cost` (and `perf:` for the index when added).

---

### Task 5: The game uses the big world

**Files:**
- Modify: `src/game/world.ts` (use `NETWORK_V2`, `PLACES_V2`), `src/game/busPose.ts` (depot from `PLACES_V2`), `src/game/Ground.tsx` (cover the world), any file that still imports `PLACES` from `places-v1` for game use (grep `from "./data/places-v1"` and `"../data/places-v1"`; type-only imports stay)
- Test: `src/game/world.test.ts` (create)

**Interfaces:**
- Consumes: `NETWORK_V2`, `PLACES_V2`, `validateNetwork`, `usablePlaces`, `buildScenery`.
- Produces: `world.ts` keeps its exports (`NETWORK`, `ACTIVE_PLACES`, `FEATURES`, `SCENERY_SEED`, `buildScenery`) with V2 content; `Ground.tsx` centres on `(1200, 70)` and its ground plane covers x -400..2800, z -1100..1300.

- [ ] **Step 1: Write the failing test** `world.test.ts`: `NETWORK` equals V2 with no dropped roads or junctions (counts match); `ACTIVE_PLACES.length === PLACES_V2.length`; the depot's `placeSpot` is on the ring and `drivable`; `buildScenery()` completes in under 3000 ms (explicit `60000` test timeout, time it with `performance.now()`) and returns items.
- [ ] **Step 2: Run** `npx vitest run src/game/world.test.ts`. Expected: FAIL (world still V1).
- [ ] **Step 3: Switch `world.ts` and `busPose.ts` to V2**, enlarge the ground and its far hills (they must not sit inside the world: keep hills 400 m outside the world rectangle).
- [ ] **Step 4: Run the whole suite** `npx vitest run`. Tests that import `NETWORK`, `ACTIVE_PLACES` or `RIDE_WORLD` may change (`plantsInvariant.test.ts`, `requests.test.ts`, `rideWorld.test.ts`, `store.test.ts`, `shift.sim.test.ts`); fix each by the new geometry (never weaken an invariant: the plants invariant must hold on the whole new network). If `buildScenery()` is over 3 s, rule in the ledger, then reduce the one-shot layout to the cells within 700 m of the depot until Stage 2 makes it lazy, and keep the test at that radius.
- [ ] **Step 5: Commit** `feat: the game runs on the big network`.

---

### Task 6: Routing and traffic on the big network

**Files:**
- Modify: `src/game/logic/traffic.ts` (`TRAFFIC_COUNT` 45 to 80)
- Test: `src/game/logic/bigworld.test.ts` (create), existing `traffic*.test.ts`

**Interfaces:**
- Consumes: `buildGraph`, `route` (roadgraph.ts), `placeSpot`, `createTraffic`, `stepTraffic`, `TRAFFIC_COUNT`, `NETWORK`, `ACTIVE_PLACES`.
- Produces: no new exports.

- [ ] **Step 1: Write the failing tests** in `bigworld.test.ts` (explicit `60000` timeouts): (a) for every ordered pair of places, `route(graph, placeSpot(...), to)` has `length > 0` and `moves` that use only turns `allowedTurns` accepts (reuse `isWrongTurn` from turns.ts), and the shortest route between `depot` and `stadium` is longer than 1500 m; (b) the three rules added in Task 2 are respected (a route never takes `ew:1` right at `1500,250`); (c) `TRAFFIC_COUNT === 80`; (d) `createTraffic(NETWORK, 7, depotSpot)` places 80 agents none closer than 8 m to each other or 25 m to the depot; (e) ten minutes (`dt` 0.1 s) of `stepTraffic` on the big network leave no two agents overlapping in the same lane for more than 20 s and at least 70 percent of agents have moved over 200 m (no gridlock).
- [ ] **Step 2: Run** `npx vitest run src/game/logic/bigworld.test.ts`. Expected: FAIL on (c) at least.
- [ ] **Step 3: Raise `TRAFFIC_COUNT` to 80** and fix whatever the other tests expose (a route that fails is a data problem in Task 2's rules or a graph bug; fix at the source and add the case to `roadgraph.test.ts`).
- [ ] **Step 4: Run** `npx vitest run src/game/logic`. Expected: PASS. Existing traffic tests that hard-code 45 move to the constant.
- [ ] **Step 5: Commit** `feat: 80 vehicles on the big network`.

---

### Task 7: Fares, goals and the finish

**Files:**
- Modify: `src/game/data/vehicles.ts` (`baseFare`, `farePer100m`, `goal` if the sim says so), `src/game/logic/requests.ts` (`NEAR_PICKUP_M`, `MAX_PREFERRED_RIDE_M`), `README.md`
- Test: `src/game/state/shift.sim.test.ts` (existing), `src/ui/Hud.test.tsx` and `src/ui/VehiclePicker.test.tsx` if goals change

**Interfaces:**
- Consumes: `VEHICLES`, `fareFor`, `nextRequest`, `RIDE_WORLD`.
- Produces: tuned numbers only.

- [ ] **Step 1: Run the shift simulation** `npx vitest run src/game/state/shift.sim.test.ts` and read the printed nets. Expected before tuning: the goals are either never or always reached on the longer map.
- [ ] **Step 2: Tune** `NEAR_PICKUP_M` (so pickups stay near on a big map), `MAX_PREFERRED_RIDE_M` (about 1500) and the vehicle fare numbers until, for every vehicle, the competent driver hits the goal on at least half but not all of the twelve seeds. Goals may move (record old and new in the ledger); update every test and README line that names a goal.
- [ ] **Step 3: Run everything** `npx tsc --noEmit`, `npx eslint src`, `npx vitest run`, `npx next build`. Expected: all clean and green.
- [ ] **Step 4: Browser check** on `http://localhost:3001/play` (profile key `annawadi.profile.v1`, set it for the test and clear it afterwards; close the tab): the page loads under 10 s, the depot starts on the ring, driving east along Tech Avenue past `x = 800` works, the radar shows the junctions ahead. Never leave temporary hooks in the code.
- [ ] **Step 5: Update README** (map size, junction and place counts, traffic 80, tuning table) and commit `feat: fares and goals for the big map; README`.

---

## After this plan

One fresh opus reviewer on the whole branch (inline execution), one fix pass, merge into `feat/annawadi`. Then write the Stage 2 plan (zones, building catalogue, lazy per-cell layout, park, ground by zone) against the code as it stands; Stages 3 (lake, dam, boats), 4 (metro) and 5 (map UI) follow in turn. Each stage ends playable.

## Self-review notes

- Spec coverage for Stage 1: network (Tasks 1 and 2), places (3), index (4, measured), world switch (5), traffic 80 and routing (6), fares (7). Zones, buildings, lake, metro and map UI are stages 2 to 5 by the spec.
- Deviation to confirm: the spec says about 35 junctions; the road list in the spec gives 28 (the `autoJunctions` count). The extra streets would cut the park, so they are left out.
- Type consistency: `autoJunctions` (Task 1) is used in Task 2; `NETWORK_V2`/`PLACES_V2` (Tasks 2 and 3) are used in Tasks 4 to 6.
