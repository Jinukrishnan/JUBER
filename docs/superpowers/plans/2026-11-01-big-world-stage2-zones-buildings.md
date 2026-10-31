# Big World, Stage 2: Zones and Buildings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the village look like a village and the east of the map look like a high-tech city: zones as data, a building catalogue (towers, offices, apartments, homes, landmarks at the big places), the central park, and the ground coloured by zone. Result: a drivable world that no longer looks like bare roads.

**Architecture:** Zones are rectangles in a data file, queried by a small pure module. `layoutScenery` (the existing seeded roadside layout) gets the zones and chooses by zone: village keeps its compounds, trees and flowers; city uses catalogue buildings without compounds in one or two rows; the lake side takes nothing. Landmarks are placed first at named places. The park is its own pure layout. Rendering stays instanced; towers share window-textured box geometries bucketed by floor count.

**Tech Stack:** Next.js 16, React 19, TypeScript, React Three Fiber v9, Vitest 5 (jsdom per file; heavy tests need explicit 60000 ms timeouts). Windows, Git Bash: write files with the Write tool, small node scripts for edits.

**Spec:** `docs/superpowers/specs/2026-11-01-big-world-design.md` (Zones, Places, Buildings, Scale sections). Builds on Stage 1 (`docs/superpowers/plans/2026-11-01-big-world-stage1-network.md`, merged).

## Global Constraints

- Coordinates in metres, +x east, +z south, traffic keeps left; side -1 is left of the way a road runs, +1 right.
- The world spans x 0..2400, z -760..900. Zones are exactly: `village`, `city` (x 1000..2300), `park` (x 1500..1900, z 250..550), `lake` (x 100..1400, z -760..-160), `dam` (z -160..-100), `hills` (everything else).
- No building, tree, flower, pole, sign or park item may stand on tarmac, a junction box, a footpath, a zebra or in a shelter keep-out; whole footprints are checked, never centres (the existing `plantsInvariant.test.ts` rule, now over the whole world).
- Nothing is placed in the lake zone (Stage 3 puts water there).
- Scenery stays seeded and deterministic (`SCENERY_SEED`), the same whichever order roads are laid out in.
- Malayalam names stay invented and flagged in the README for a native speaker.
- Keep CRLF files CRLF (edit through scripts that normalise `\r\n`). No new dependencies.

## Review Focus

- A landmark (mall, stadium, hospital) overlapping a junction corner, a pole, a shelter or another landmark; landmarks must fit or the test names the place.
- City towers 30 storeys high casting shadows or filling the draw range: instance count in a 260 m draw range stays under the budget the test sets.
- A park path or fountain reaching the street edge, or street trees inside the park lawn.
- Trees or buildings on the lake side of Dam Road (north, side -1) or south of Tech Avenue's far east end where the world stops.
- `buildScenery()` time after adding the city (the spec's lazy per-cell layout is only needed if it exceeds 1000 ms; the roadside alone took 71 ms in Stage 1).

---

### Task 1: Zones

**Files:**
- Create: `src/game/data/zones-v1.ts`, `src/game/logic/zones.ts`
- Test: `src/game/logic/zones.test.ts`

**Interfaces:**
- Produces: `type ZoneKind = "village" | "city" | "park" | "lake" | "dam" | "hills"`; `type Zone = { id: string; kind: ZoneKind; name: string; ml: string; x0: number; z0: number; x1: number; z1: number; priority: number }`; `export const ZONES: Zone[]` (data); `zoneAt(zones: Zone[], x: number, z: number): Zone` (highest priority rectangle containing the point, else the `hills` zone, which has a huge rectangle and priority 0); `zoneKindAt(x: number, z: number): ZoneKind` (uses `ZONES`).

Data (priorities in brackets): `hills` (0) x -3000..5400, z -3000..3900; `village` (1) x -200..1000, z -100..700; `city` (1) x 1000..2400, z -100..1000; `lake` (2) x 100..1400, z -760..-160; `dam` (3) x 100..1300, z -160..-100; `park` (4) x 1500..1900, z 250..550. Names: Village, Tech City, Central Park, Lake, Dam, Countryside (Malayalam invented).

- [ ] **Step 1: Write the failing tests** in `zones.test.ts`: `zoneKindAt` is `village` at the depot spot area `(100,-5)`... use `(300,100)`; `city` at `(1700,700)`; `park` at `(1700,400)`; `lake` at `(700,-500)`; `dam` at `(400,-150)`; `hills` at `(5000,5000)`; park wins over city at its centre; zone ids are unique; every road centreline sample (every 20 m of `NETWORK`) is `village`, `city`, `dam` or `park`, never `lake`; every active place spot is village, city or dam.
- [ ] **Step 2: Run** `npx vitest run src/game/logic/zones.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `zones-v1.ts` (data) and `zones.ts` (`zoneAt`, `zoneKindAt`).
- [ ] **Step 4: Run the test.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: zones (data and lookup)`.

---

### Task 2: Building catalogue

**Files:**
- Create: `src/game/data/buildings-v1.ts`, `src/game/logic/catalogue.ts`
- Test: `src/game/logic/catalogue.test.ts`

**Interfaces:**
- Consumes: `ZoneKind` (Task 1).
- Produces: `type BuildingTypeId = "tower" | "office" | "apartment" | "home" | "arcade"`; `type BuildingType = { id: BuildingTypeId; width: [number, number]; depth: [number, number]; floors: [number, number]; weight: number; palette: string[] }`; `export const CITY_TYPES: BuildingType[]` with at least: tower (width 20-28, depth 20-28, floors 14-30, weight 2, glass blues and greys), office (24-34, 18-24, 6-12, 3), apartment (18-26, 16-22, 5-10, 4, warm pastels), home (10-14, 10-14, 2-3, 3, pastels), arcade (14-20, 12-16, 2-4, 3, bright). `export const CITY_CENTRE = { x: 1700, z: 450 }`. `heightFactor(x: number, z: number): number` returns 1 at the centre falling linearly to 0.15 at 900 m. `pickCityBuilding(r: () => number, x: number, z: number): { type: BuildingTypeId; width: number; depth: number; floors: number; color: string }`: weights are multiplied by the height factor for `tower` and `office` and by `1.2 - heightFactor` for `home` and `arcade`; floors are the range scaled so a tower at the edge is at most 60 percent of its range top.

- [ ] **Step 1: Write the failing tests**: `heightFactor` is 1 at the centre and 0.15 at 900 m and beyond; with a seeded generator `pickCityBuilding` is deterministic; every result is inside its type's ranges; over 400 picks at the centre the mean floors exceed the mean at `(2300, 900)` by at least 2x; at the edge `home` and `apartment` together outnumber `tower`; colours come from the type's palette.
- [ ] **Step 2: Run** `npx vitest run src/game/logic/catalogue.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** both files.
- [ ] **Step 4: Run the test.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: city building catalogue`.

---

### Task 3: Landmarks at places

**Files:**
- Create: `src/game/data/landmarks-v1.ts`, `src/game/logic/landmarks.ts`
- Test: `src/game/logic/landmarks.test.ts`

**Interfaces:**
- Consumes: `NETWORK`/`ACTIVE_PLACES` (world.ts), `keepOutZones`, `overlaps`, `footprintOf` (layout.ts, Task 4 adds the `city` placement; this task defines the landmark's own `BuildingPlacement`-shaped record `LandmarkPlacement`), `FEATURES`.
- Produces: `type Landmark = { place: string; kind: "mall" | "hospital" | "stadium" | "university" | "office" | "towers" | "apartments" | "hotel" | "bank" | "market"; width: number; depth: number; floors: number; color: string }`; `export const LANDMARKS: Landmark[]` for the places `city_mall` (60x40, 4), `city_hospital` (50x35, 6), `stadium` (80x60, 3), `university` (70x40, 5), `tech_office` (40x30, 14), `towers` (30x30, 30), `apartments` (30x25, 12), `hotel` (24x20, 10), `bank` (20x18, 4), `market` (36x26, 2); `landmarkPlacements(n: Network, places: Place[], zones: Shape[], landmarks: Landmark[]): { placements: LandmarkPlacement[]; missing: string[] }` where `LandmarkPlacement = { kind: "landmark"; landmark: Landmark["kind"]; place: string; side: -1 | 1; x: number; z: number; heading: number; width: number; depth: number; floors: number; color: string; seed: number }`. Each landmark stands behind the footpath and verge on its place's side, centred on the place's `s`; if its footprint hits a keep-out zone, another landmark, or leaves the zone `city`, it slides along the road in 5 m steps up to 40 m each way; if none fits the id goes in `missing`.

- [ ] **Step 1: Write the failing tests**: every `LANDMARKS.place` exists in `PLACES_V2`; `landmarkPlacements` over the real world returns an empty `missing`; no two landmark footprints overlap; none overlaps `keepOutZones(NETWORK, ACTIVE_PLACES, FEATURES)`; each stands on its place's side of the road (the centre is on that side of the road centreline); the stadium footprint is the largest; the result is the same on a second call.
- [ ] **Step 2: Run** `npx vitest run src/game/logic/landmarks.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the data and `landmarkPlacements` (footprint is the plain rectangle `width x depth` at `heading` of the road).
- [ ] **Step 4: Run the test.** Expected: PASS. If a landmark cannot fit, change its size or position in the data (never weaken the keep-out); report the change in the ledger.
- [ ] **Step 5: Commit** `feat: landmarks at the big places`.

---

### Task 4: Zone-aware scenery layout

**Files:**
- Modify: `src/game/logic/layout.ts` (new placement kind `city`, zone handling), `src/game/world.ts` (pass zones and landmarks)
- Test: `src/game/logic/layout.test.ts` (extend), `src/game/logic/plantsInvariant.test.ts` (extend)

**Interfaces:**
- Consumes: `zoneKindAt`/`ZONES` (Task 1), `pickCityBuilding` (Task 2), `landmarkPlacements` (Task 3), `keepOutZones`.
- Produces: `type CityPlacement = { kind: "city"; type: BuildingTypeId; side: Side; x: number; z: number; heading: number; width: number; depth: number; floors: number; color: string; seed: number }`; `Placement` gains `CityPlacement` and `LandmarkPlacement`; `footprintOf` handles both as the plain `width x depth` rectangle; `layoutScenery(seed, n, places, features, options?: { zones?: Zone[]; landmarks?: Landmark[] })` keeps its old behaviour when `options` is omitted (so the many existing layout tests keep running on V1) and with zones: (a) the village zone keeps compounds, trees and flowers exactly as before; (b) in the `city` zone each road side gets city buildings every 30 m (chance 0.8), no walls or gates, set back 4 m from the verge edge, and a second row (chance 0.5) one first-row depth plus 8 m further back; street trees every 18 m (coconut and gulmohar only); (c) in the `park` zone no buildings, only trees at the verge; (d) in `lake` or `dam` nothing on the lake side (side -1 of `dam`) and trees only on the south side; (e) landmark placements are accepted first and reserve their footprints; (f) the `hills` zone gets nothing. `accept()` rejects any placement whose footprint leaves its zone's allowed kinds.

- [ ] **Step 1: Write the failing tests** in `layout.test.ts` using the real `NETWORK`, `ACTIVE_PLACES`, `FEATURES`, `ZONES`, `LANDMARKS`: (a) with options, the layout has `city` placements and none of them has `x < 1000`; (b) no `house` or `shop` placement has `x > 1000`; (c) no placement of any kind has its centre in the lake zone; (d) every landmark is present as a `landmark` placement; (e) two layouts from one seed are equal; (f) the first row of city buildings never has a wall or gate near it (no `wall` placement with `x > 1000`).
- [ ] **Step 2: Extend `plantsInvariant.test.ts`** so its keep-out check runs over the whole new world with every placement kind (the footprint of each of `house`, `shop`, `city`, `landmark`, tree, flower, wall, gate against tarmac, junction boxes, footpaths and zebras); a placement that fails names its kind and position.
- [ ] **Step 3: Run** `npx vitest run src/game/logic/layout.test.ts src/game/logic/plantsInvariant.test.ts`. Expected: FAIL.
- [ ] **Step 4: Implement the layout changes** and pass `{ zones: ZONES, landmarks: LANDMARKS }` from `world.ts`'s `buildScenery`.
- [ ] **Step 5: Run both tests, then `npx vitest run`.** Expected: PASS everywhere. Time `buildScenery()`: if it is over 1000 ms, write `Ruling:` in the ledger and make layout lazy per 200 m cell (the layout of a cell depends only on the seed, the cell and the roads near it); otherwise record `Ruling: one-shot layout kept (N ms)`.
- [ ] **Step 6: Commit** `feat: zone-aware scenery layout (village, city, park edge, lake side)`.

---

### Task 5: Drawing the city

**Files:**
- Create: `src/game/cityParts.ts`, `src/game/CityBuildings.tsx`
- Modify: `src/game/Scenery.tsx` (draw `city` and `landmark` placements per cell)
- Test: `src/game/cityParts.test.ts`

**Interfaces:**
- Consumes: `CityPlacement`, `LandmarkPlacement`, `Instances`/`Item` (Instances.tsx).
- Produces: `FLOOR_HEIGHT = 3.2`; `cityParts(p: CityPlacement | LandmarkPlacement): { body: Item; roof: Item[]; podium: Item | null }` where `body` is one box `width x floors*FLOOR_HEIGHT x depth` standing on y = 0 at the placement, `roof` has a parapet slab and (for 10 or more floors) a small plant box, `podium` is a lower wider base box of 2 floors for `tower`, `office` and landmarks of 8 or more floors; `windowGeometry(floors: number): BoxGeometry` (cached per floor count) is a unit box whose UVs repeat 5 windows across each facade and one window row per floor; `CityBuildings({ placements }: { placements: Placement[] })` draws the bodies in one instanced mesh per floor-count bucket with a shared canvas window texture (rows of lit and dark windows), roofs and podiums in one plain instanced mesh, and sets `castShadow` only for the nearest cells (`detail === "full"`). Landmarks get a name sign at the entrance like shops do (reuse the sign atlas by adding their names to `SHOP_NAMES` is NOT allowed; draw a plain coloured band instead).

- [ ] **Step 1: Write the failing tests** (pure, in `cityParts.test.ts`): body height is `floors * 3.2`; the body, roof and podium all stay inside the placement's footprint plus 1 m; a tower of 30 floors has a podium, a 3-floor home has none; `windowGeometry(12)` returns the same object twice and has UVs whose v range is 12; roof items count is at most 3.
- [ ] **Step 2: Run** `npx vitest run src/game/cityParts.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `cityParts.ts` and `CityBuildings.tsx`, and add the `CityBuildings` call to `SceneCell` in `Scenery.tsx`.
- [ ] **Step 4: Run the test, then `npx tsc --noEmit` and `npx eslint src`.** Expected: PASS and clean.
- [ ] **Step 5: Commit** `feat: draw the city buildings (instanced, windowed)`.

---

### Task 6: The central park

**Files:**
- Create: `src/game/logic/park.ts`, `src/game/Park.tsx`
- Modify: `src/game/GameCanvas.tsx` (mount `<Park />` beside `<Scenery />`)
- Test: `src/game/logic/park.test.ts`

**Interfaces:**
- Consumes: the `park` zone rectangle (Task 1), `mulberry32` style seeded generator (copy the local one; do not export from layout.ts).
- Produces: `type ParkLayout = { lawn: { x: number; z: number; w: number; d: number }; paths: { x: number; z: number; w: number; d: number; heading: number }[]; fountain: { x: number; z: number; r: number }; playground: { x: number; z: number; w: number; d: number }; benches: { x: number; z: number; heading: number }[]; trees: { kind: "mango" | "gulmohar" | "coconut"; x: number; z: number; scale: number }[]`; `layoutPark(zone: Zone, seed: number, inset = 14): ParkLayout`. The lawn is the zone inset by `inset` metres (clear of the street verges); two crossing paths (3 m wide) through the centre run end to end of the lawn; the fountain (radius 5) is at the centre; the playground is a 24 x 18 m rectangle in the south-west quadrant; benches (about 14) stand along the paths 2.5 m to the side, at least 12 m apart; trees (about 90) are scattered on the lawn, never within 1.5 m of a path, 4 m of the fountain or inside the playground. `Park.tsx` draws the lawn as a brighter plane just above the ground, paths as pale boxes, the fountain as a ring with a blue disc, the playground as coloured boxes (slide, swing frames, a sand rectangle), benches, and trees through the existing `Trees` component (it takes `TreePlacement[]`).

- [ ] **Step 1: Write the failing tests**: everything lies inside the lawn rectangle (trees by centre with their radius, `TREE_RADIUS` from layout.ts); no tree overlaps a path, the fountain or the playground; benches are at least 12 m apart and within 4 m of a path; the paths cross at the fountain; `layoutPark` is deterministic; 70 to 110 trees.
- [ ] **Step 2: Run** `npx vitest run src/game/logic/park.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `park.ts` and `Park.tsx`; mount it.
- [ ] **Step 4: Run the test.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: the central park`.

---

### Task 7: The ground by zone

**Files:**
- Modify: `src/game/Ground.tsx`
- Create: `src/game/logic/groundZones.ts`
- Test: `src/game/logic/groundZones.test.ts`

**Interfaces:**
- Consumes: `ZONES`, `Zone`.
- Produces: `groundTints(zones: Zone[]): { x: number; z: number; w: number; d: number; color: string; y: number }[]`: a pale paved grey (`#9a9d9f`, y -0.055) for the `city` zone, a bright lawn green (`#6fae48`, y -0.05) for `park`, a dark water-blue placeholder is NOT drawn (Stage 3), and none for village, hills, lake or dam. `Ground.tsx` draws each tint as a flat box under the roads, stops scattering green patches over the city rectangle, and still places paddies only in the village.

- [ ] **Step 1: Write the failing tests**: one tint for the city and one for the park; the park tint lies inside the city tint; the park tint is higher than the city tint (no flicker); no tint for lake, dam, village, hills.
- [ ] **Step 2: Run** `npx vitest run src/game/logic/groundZones.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `groundZones.ts`, then use it in `Ground.tsx` (skip patches inside the city rectangle).
- [ ] **Step 4: Run the test.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: ground tinted by zone`.

---

### Task 8: Budgets, the browser and the finish

**Files:**
- Modify: `README.md` (zones, catalogue, landmarks, park; update the scenery section)
- Test: `src/game/logic/sceneBudget.test.ts` (create)

**Interfaces:**
- Consumes: `buildScenery`, `cellsAround`, `groupByCell`, `cityParts`.
- Produces: no new exports.

- [ ] **Step 1: Write the budget test** (explicit 60000 ms timeout): for every 100 m grid point along every road centreline, the number of placement boxes in the cells within the 260 m draw range stays under 6000 (count `cityParts` boxes for city and landmark placements, 1 for each tree, flower cluster and the box counts of `houseParts`, `shopParts`, `wallParts`, `gateParts` for the others); and `buildScenery()` completes under 1000 ms (or the lazy path from Task 4). Print the worst point.
- [ ] **Step 2: Run** it. Expected: PASS; if the worst point is over budget, thin the city (lower the second-row chance or the tower weights in `buildings-v1.ts`), never raise the budget silently.
- [ ] **Step 3: Run everything**: `npx tsc --noEmit`, `npx eslint src`, `npx vitest run`, `npx next build`. Expected: clean and green.
- [ ] **Step 4: Browser check** on `http://localhost:3001/play` (profile key `annawadi.profile.v1`: set it for the test, clear it and close the tab afterwards; no temporary hooks left in code): move the vehicle with the dispatched-key technique or the existing start pose; take screenshots at the village depot, on Tech Avenue at x about 1700 (towers and the park), at the mall and at Dam Road (nothing on the lake side). The test browser renders about 1.5 frames per second, so judge the look and draw counts, not speed.
- [ ] **Step 5: README and commit** `feat: village and tech city scenery; README`.

---

## After this plan

One fresh opus reviewer on the whole branch (inline execution), one fix pass, merge into `feat/annawadi`. Then the Stage 3 plan (lake, dam, boats) against the code as it stands; Stage 4 (metro) and Stage 5 (map UI) follow.

## Self-review notes

- Spec coverage for Stage 2: zones (Task 1), building catalogue by zone with centre-to-edge height (2), landmarks at the mall, hospital and so on (3), layout and invariant over the whole world (4), windows instanced (5), the park with fountain, paths, playground, benches, trees (6), ground by zone (7), draw budget and timing (8). Lake, dam wall and boats are Stage 3; the metro viaduct is Stage 4; zone-tinted radar is Stage 5.
- Deviation to confirm: the spec asks for lazy per-cell layout; Stage 1 measured the roadside layout at 71 ms, so the plan keeps the one-shot layout and switches to lazy only if the city pushes it past 1000 ms (Task 4, Step 5).
- Types: `Zone`/`zoneKindAt` (Task 1) are used in Tasks 3 to 7; `CityPlacement`/`LandmarkPlacement` (Tasks 3 and 4) are used in Tasks 5 and 8; `BuildingTypeId` (Task 2) is used in Task 4.
