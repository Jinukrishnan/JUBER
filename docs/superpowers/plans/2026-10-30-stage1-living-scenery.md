# Stage 1 — Living Scenery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat painted roadside with Kerala vegetation, flowers, a layered ground and well-aligned, better-quality houses and shops, without changing any gameplay.

**Architecture:** A pure, deterministic layout generator (`logic/layout.ts`) decides what stands where, using keep-out zones built from the same road, bay and roadside modules the game already uses. Rendering components turn the layout into instanced meshes grouped in 100 m route slices; only slices within 260 m of the bus are drawn.

**Tech Stack:** TypeScript, React Three Fiber / three.js (existing `Instances` helper, `canvasTex` hooks), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-30-roadmap-and-stage1-living-scenery-design.md`

## Global Constraints

- No gameplay module changes: do not edit `state/store.ts`, `logic/bay.ts`, `logic/vehicle.ts`, `logic/boarding.ts` or the HUD. Allowed edits outside scenery: `logic/roadside.ts` (add `polePositions` only), `Road.tsx` (remove grass/ground only).
- Everything procedural: no imported model or image files.
- Deterministic: no `Math.random()` in layout or rendering setup; all variation from a seeded RNG (seed `20261030`).
- Draw range **260 m** from the bus along the route; scenery grouped in **100 m** slices.
- Budget: at most **~120** extra draw calls and **~150k** triangles in view; layout + instance building under **400 ms**.
- Setback: building front at least **3 m** behind the verge edge (road half-width + `FOOTPATH_WIDTH` 3.6 + verge 1.8); compound wall **1.2 m** behind the verge edge.
- Existing suite (197 tests) must stay green; `npx tsc --noEmit`, `npx eslint .`, `npm run build` clean at the end of every task.
- Malayalam shop names are placeholders for the user to review.

## Review Focus

- Scenery landing on a keep-out zone near the route ends and turn-around aprons, where the road widens (Task 1, Task 3 tests).
- Buildings on the steepest part of the curve (road angle up to ~0.12 rad): rotated rectangles clipping the road strip or each other (Task 3 test).
- Layout differing between reloads (any hidden `Math.random`) (Task 2 test).
- Objects that straddle a slice boundary popping in or out wrongly (Task 5 test).
- An empty or very sparse stretch (route ends) or a pile-up near a stop, instead of the density the spec asks for (Task 3 test).

---

### Task 1: Footprints, keep-out zones, pole positions

**Files:**
- Create: `src/game/logic/footprint.ts`, `src/game/logic/footprint.test.ts`
- Modify: `src/game/logic/roadside.ts` (add `polePositions`), `src/game/logic/roadside.test.ts`, `src/game/Scenery.tsx` (use `polePositions`)

**Interfaces:**
- Produces: `type Shape = { kind: "circle"; x: number; z: number; r: number } | { kind: "rect"; x: number; z: number; w: number; d: number; heading: number }` (rect `w` runs along `heading`, `d` across it).
- `overlaps(a: Shape, b: Shape): boolean` (circle/circle, circle/rect, rect/rect with rotation).
- `keepOutZones(stops: Stop[], features: RoadFeatures): Shape[]` — the carriageway + footpath + verge as 20 m rects following `roadCenterZ`/`roadAngle`/`roadHalfWidthAt` (so aprons are covered); a rect for every shelter (both kerbs, 7.4 x 3.6 centred 8.2 m from the centreline) and its queue; a circle (r 0.8) at every sign pole; a circle (r 0.6) at every electric pole.
- `polePositions(stops: Stop[]): number[]` in `roadside.ts` — x of every electric pole: every 45 m from `first + 10` up to `last`.

- [ ] **Step 1: Write failing tests** — `overlaps`: two circles 1 m apart with r 0.6 overlap, 2 m apart do not; a circle touching a rect corner overlaps; a rect rotated 45 degrees overlaps a neighbour that an unrotated one would miss. `keepOutZones`: a shape covering the road at x=500, `(500, roadCenterZ(500))`; a shape overlapping each stop's shelter on both kerbs; one covering each sign pole and each pole from `polePositions`; one covering the carriageway at `LAST + 60` where the road has widened. `polePositions`: ascending, spacing 45, first is `first + 10`, none beyond `last`.
- [ ] **Step 2:** Run `npx vitest run src/game/logic/footprint.test.ts src/game/logic/roadside.test.ts` — Expected: FAIL (module / function missing).
- [ ] **Step 3: Implement** the signatures above (separating-axis test for rotated rects; circle vs rect by clamping in the rect's frame) and switch `Scenery.tsx` poles to `polePositions` with the existing lateral offset `roadHalfWidthAt(x) + FOOTPATH_WIDTH + 0.9`.
- [ ] **Step 4:** Run the two test files — Expected: PASS; then full `npm test` green.
- [ ] **Step 5: Commit** `feat: footprints and keep-out zones for scenery`.

### Task 2: Layout core and vegetation placement

**Files:**
- Create: `src/game/logic/layout.ts`, `src/game/logic/layout.test.ts`

**Interfaces:**
- Consumes: `Shape`, `overlaps`, `keepOutZones` (Task 1); `roadCenterZ`, `roadAngle`, `roadHalfWidthAt`, `FOOTPATH_WIDTH` (`logic/road.ts`); `ROUTE_V1`, `roadFeatures`.
- Produces: `type Side = -1 | 1`; `type TreeKind = "coconut" | "mango" | "gulmohar" | "banana" | "jackfruit"`; `type FlowerKind = "sunflower" | "hibiscus" | "marigold"`.
- `type Placement` = tree `{ kind: TreeKind; x; z; scale; lean; seed }` | flowers `{ kind: "flowers"; species: FlowerKind; x; z; count; seed }` | (building/wall/gate variants are added in Task 3; keep the union open).
- `footprintOf(p: Placement): Shape` (tree circle r by kind: coconut 0.8, mango 3.0, gulmohar 3.5, banana 1.2, jackfruit 2.0; flowers circle r 1.2).
- `layoutScenery(seed: number, stops: Stop[], features: RoadFeatures): { placements: Placement[]; isGroundFree(x: number, z: number, radius: number): boolean }` — this task fills trees and flowers only.
- Trees stand 1.5-7.5 m beyond the verge edge; flowers 0.6-1.4 m beyond it.

- [ ] **Step 1: Write failing tests** — same seed gives deeply equal output, a different seed differs; every placement is `finite` and on the correct side of the centreline; no tree/flower footprint overlaps another or any `keepOutZones` shape; all five tree kinds and all three flower species occur; no run of more than 3 identical `kind` per side ordered by `x`.
- [ ] **Step 2:** Run `npx vitest run src/game/logic/layout.test.ts` — Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `layoutScenery` (seeded mulberry32; slots every ~9 m per side; weighted kind choice; reroll on overlap/run-of-4) and `footprintOf`; `isGroundFree` returns false if a circle of `radius` at `(x,z)` overlaps any placement footprint (wired in Task 3's tests).
- [ ] **Step 4:** Run the test file — Expected: PASS.
- [ ] **Step 5: Commit** `feat: seeded layout for trees and flowers`.

### Task 3: Buildings, compounds and density

**Files:**
- Modify: `src/game/logic/layout.ts`, `src/game/logic/layout.test.ts`

**Interfaces:**
- Consumes: everything from Task 2.
- Produces: building placements `{ kind: "house" | "shop"; x; z; side: Side; heading: number; width: number; depth: number; floors: number; seed }` (`heading === roadAngle(x)`, front faces the road), `{ kind: "wall"; x; z; heading; length }` (0.3 m thick, two per compound, either side of the gate), `{ kind: "gate"; x; z; heading }` (3 m wide); `footprintOf` extended to rects for these.
- Houses: width 8-11, depth 6-8, 1 floor. Shops: width 8-10, depth 7-9, 2-4 floors. Building centre lateral = verge edge + 3 + depth/2 (+ jitter <= 1.5 m); wall at verge edge + 1.2.

- [ ] **Step 1: Write failing tests** — every house/shop has `heading` equal to `roadAngle(x)` (1e-9) and `side` matching the sign of `z - roadCenterZ(x)`; its front is at least 3 m behind the verge edge; every compound has two walls and one gate in line with the building front; **no footprint (all kinds, walls and gates included) overlaps another or any keep-out zone**, checked at the steepest part of the road (`|roadAngle| >= 0.09`) too; at least 50 % of buildings within 60 m of a stop are shops and at most 20 % of buildings farther than 120 m from every stop are; building count per 100 m within 120 m of either end is below the count per 100 m in the middle; `isGroundFree` is false at a house centre and true at `(500, roadCenterZ(500))`.
- [ ] **Step 2:** Run `npx vitest run src/game/logic/layout.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** building, wall and gate placement in `layoutScenery` (buildings placed before trees so trees yield; density weights by distance to stops and to the route ends).
- [ ] **Step 4:** Run the test file — Expected: PASS.
- [ ] **Step 5: Commit** `feat: aligned houses, shops and compounds in the layout`.

### Task 4: Shop names

**Files:**
- Create: `src/game/data/shopnames.ts`, `src/game/data/shopnames.test.ts`

**Interfaces:**
- Produces: `type ShopName = { ml: string; en: string }`; `SHOP_NAMES: ShopName[]` (at least 8 invented names, e.g. a tea shop, textiles, pharmacy, bakery); `shopNameFor(seed: number): ShopName`.

- [ ] **Step 1: Write failing tests** — every entry has Malayalam script (`/[ഀ-ൿ]/`) and a non-empty English name; `shopNameFor(5)` equals itself; across seeds 0-30 at least 5 distinct names appear.
- [ ] **Step 2:** Run the test — Expected: FAIL.
- [ ] **Step 3: Implement** the list and `shopNameFor(seed)` (index by `Math.abs(seed) % length`).
- [ ] **Step 4:** Run the test — Expected: PASS.
- [ ] **Step 5: Commit** `feat: shop name list for signboards`.

### Task 5: Slice culling

**Files:**
- Create: `src/game/logic/slices.ts`, `src/game/logic/slices.test.ts`

**Interfaces:**
- Produces: `SLICE_LENGTH = 100`, `DRAW_RANGE = 260`, `NEAR_RANGE = 120`.
- `sliceOf(x: number): number` (floor division, works for negative x).
- `slicesFor(placements: { x: number }[], footprintReach: (i: number) => number): Map<number, number[]>` — indices of placements per slice; a placement within its reach of a boundary is listed in both slices.
- `visibleSlices(busX: number): number[]` — ascending slice indices whose span overlaps `[busX - 260, busX + 260]`.
- `isNear(slice: number, busX: number): boolean` — slice span overlaps `[busX - 120, busX + 120]`.

- [ ] **Step 1: Write failing tests** — `sliceOf(0)=0, sliceOf(99.9)=0, sliceOf(100)=1, sliceOf(-0.1)=-1`; `visibleSlices(0)` covers slices -3..2 and `visibleSlices(1000)` is ascending without gaps; a placement 2 m from a boundary with reach 3 appears in both slices; `isNear` true for the bus's own slice, false 400 m away.
- [ ] **Step 2:** Run the test — Expected: FAIL.
- [ ] **Step 3: Implement** the functions above.
- [ ] **Step 4:** Run the test — Expected: PASS.
- [ ] **Step 5: Commit** `feat: route slices for scenery culling`.

### Task 6: Ground

**Files:**
- Create: `src/game/Ground.tsx`
- Modify: `src/game/Road.tsx` (remove the grass plane and the `GRASS` texture only; keep dirt verges, asphalt, footpath, markings), `src/game/GameCanvas.tsx` (mount `<Ground />`)

**Interfaces:**
- Produces: `<Ground />` — layered ground: a base plane, 40+ large colour patches (several grass tones and dry-grass), 10-14 paddy-field rectangles with a water sheen set back from the road on both sides and clear of the keep-out strip, and a ring of low hills at the horizon. Patch and paddy positions come from the seeded RNG; nothing lies inside `keepOutZones`.

- [ ] **Step 1: Implement** `Ground.tsx` with the requirements above (one `meshStandardMaterial` per colour group; patches as a single instanced flat mesh).
- [ ] **Step 2:** Run `npx tsc --noEmit && npx eslint src` — Expected: clean.
- [ ] **Step 3: Manual check** `npm run dev`, open `/play`: ground shows colour variation, paddies and hills; the road, footpath and verges are unchanged.
- [ ] **Step 4:** Run `npm test` — Expected: all green.
- [ ] **Step 5: Commit** `feat: layered ground with paddies and distant hills`.

### Task 7: Trees

**Files:**
- Create: `src/game/Foliage.tsx` (trees part), `src/game/trees.ts` (pure geometry helpers) , `src/game/trees.test.ts`

**Interfaces:**
- Consumes: `Placement` (tree variants), `Instances`.
- Produces: `treeParts(p: TreePlacement, detail: "full" | "lite"): Item[]`-style data per part name — `{ trunk: Item[]; crown: Item[]; extra: Item[] }` for the five species (coconut: curved 3-segment trunk, 10-12 fronds in full detail, 6 in lite, coconut bunch; mango: thick trunk, 5-7 overlapping crown spheres in two greens; gulmohar: wide flattened crown spheres plus red-orange blossom spheres; banana: stout stem and 6-8 leaves; jackfruit: short trunk, dense dark crown with fruit).
- `<Trees placements detail />` renders them as `InstancedMesh`es.

- [ ] **Step 1: Write failing tests** — for each species `treeParts` is deterministic for a given placement; `lite` returns fewer crown items than `full` for coconut and mango; gulmohar returns blossom items coloured red/orange; every item is finite; item positions stay within 12 m of the placement.
- [ ] **Step 2:** Run `npx vitest run src/game/trees.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `treeParts` and `<Trees />`.
- [ ] **Step 4:** Run the test and `npx tsc --noEmit && npx eslint src` — Expected: PASS / clean.
- [ ] **Step 5: Commit** `feat: Kerala tree species`.

### Task 8: Flowers, grass tufts and bushes

**Files:**
- Modify: `src/game/Foliage.tsx`, `src/game/trees.ts` (rename helper file to `plants.ts` only if clearer; keep tests passing)
- Create/Modify: `src/game/plants.test.ts` as needed

**Interfaces:**
- Produces: `flowerParts(p: FlowerPlacement): Item[]` (sunflower: stem, yellow petal ring, brown disc turned toward the road; hibiscus/marigold: small coloured spheres on green bushes, `count` heads); `tuftParts(seed, x, z, side): Item[]` (crossed-plane grass tufts along verges); `bushParts(seed, x, z): Item[]`; `<Flowers />`, `<Grass />` components.

- [ ] **Step 1: Write failing tests** — `flowerParts` returns `count` heads for hibiscus/marigold and one disc plus petals for sunflower; sunflower discs face the road side of their placement; `tuftParts` is deterministic and keeps tufts within 3 m of the given point.
- [ ] **Step 2:** Run the test — Expected: FAIL.
- [ ] **Step 3: Implement** the helpers and the two components.
- [ ] **Step 4:** Run tests, `npx tsc --noEmit`, `npx eslint src` — Expected: PASS / clean.
- [ ] **Step 5: Commit** `feat: flowers, grass tufts and bushes`.

### Task 9: Buildings

**Files:**
- Create: `src/game/Buildings.tsx`, `src/game/buildings.ts`, `src/game/buildings.test.ts`

**Interfaces:**
- Consumes: building/wall/gate `Placement`s, `shopNameFor`, `useCanvasTexture`, `malayalamFont`.
- Produces: `houseParts(p: HousePlacement): Item[]` (plinth, walls, veranda with 4 pillars, two roof slabs with an overhang of at least 0.5 m, door, two framed windows); `shopParts(p: ShopPlacement): Item[]` (one box per floor, a balcony slab and railing per upper floor, shutter strip on the ground floor, rooftop water tank, signboard rectangle); `wallParts`, `gateParts`; `<Buildings placements />` including one signboard texture per shop name (atlas of the names, not one texture per building).

- [ ] **Step 1: Write failing tests** — roof slabs of a house extend at least 0.5 m beyond the walls; a house has exactly 4 veranda pillars on its road-facing side; a shop with `floors = 3` has 3 floor boxes and 2 balcony slabs; every part of a building lies within its footprint expanded by 1.5 m; parts rotate with `heading`.
- [ ] **Step 2:** Run `npx vitest run src/game/buildings.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** the helpers and `<Buildings />`.
- [ ] **Step 4:** Run tests, `npx tsc --noEmit`, `npx eslint src` — Expected: PASS / clean.
- [ ] **Step 5: Commit** `feat: Kerala houses, shops, compound walls and gates`.

### Task 10: Compose the scenery with slice culling

**Files:**
- Modify: `src/game/Scenery.tsx` (replace the old tree/house/pole code), `src/game/GameCanvas.tsx`, `src/game/Road.tsx` (drop `<Scenery />` from `Road` and mount it from `GameCanvas`, if not already)

**Interfaces:**
- Consumes: `layoutScenery`, `slicesFor`, `visibleSlices`, `isNear`, `SLICE_LENGTH`, `Trees`, `Flowers`, `Grass`, `Buildings`, `polePositions`.
- Produces: `<Scenery />` — builds the layout once (`useMemo`), groups placements by slice, renders one group per slice, shows only `visibleSlices(busX)` (state updated only when the bus's slice changes), passes `detail="lite"` to slices that are not `isNear`; electric poles and wires kept.

- [ ] **Step 1:** Implement `Scenery.tsx` as above and mount it.
- [ ] **Step 2:** Run `npx tsc --noEmit && npx eslint . && npm test && npm run build` — Expected: all clean/green.
- [ ] **Step 3: Manual check** `/play` at the depot: trees of four species, flowers, houses and shops aligned with the road, compound walls and gates, no object on the road or footpath, no clipping through shelters or signs.
- [ ] **Step 4: Commit** `feat: compose Stage 1 scenery with slice culling`.

### Task 11: Verification, budgets and docs

**Files:**
- Create (temporary, deleted at the end): `src/app/dev-scenery/page.tsx` and `View.tsx`
- Modify: `README.md`

- [ ] **Step 1:** Build the temporary debug page: renders `<Scenery />`, `<Ground />` and the road with a fixed camera at a chosen route position, and prints `renderer.info.render.calls` and `.triangles` on screen.
- [ ] **Step 2: Manual check** at three positions (depot, mid-route near a stop, near the far terminus): record draw calls and triangles; Expected: within the budgets in Global Constraints; trees distinguishable by species; flowers visible; houses follow the curve; nothing on the road, footpath or bays.
- [ ] **Step 3:** If a budget is exceeded, reduce instance counts in the heaviest component and re-measure until within budget; record the final numbers in the commit message.
- [ ] **Step 4:** Delete `src/app/dev-scenery/`, update `README.md` with a short "Scenery" section, run `npx tsc --noEmit && npx eslint . && npm test && npm run build` — Expected: all clean/green.
- [ ] **Step 5: Commit** `docs: scenery notes and measured budgets`.
