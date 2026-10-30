# Aanawadi — Road-World Roadmap and Stage 1 (Living Scenery) Design

Date: 2026-10-30
Status: Draft for review
Builds on: `2026-10-30-annawadi-design.md` (the game as shipped on `feat/annawadi`)

## 1. Why this document exists

The game is a fixed-route 3D KSRTC bus game. The request that triggered this
spec asks for a much richer road world: realistic vegetation and buildings,
signalled junctions with cross roads, parallel traffic (buses, cars, bikes,
autos), smart pedestrian-crossing signals, and grade-separated roads (flyover,
underpass, split roads). That is too large for one spec.

Decision already made with the user: **the bus keeps its fixed route** (the
current single route with 7 stops, out and back). The route will pass through
signalled junctions, a flyover and an underpass. Side roads exist and carry
traffic, but the player's bus does not leave the route. The road layout is
designed as a real network so that "drive anywhere" can be added later.

This document (a) records the roadmap of stages, and (b) specifies **Stage 1
only** in full. Each later stage gets its own spec, plan and review before it
is built.

## 2. Roadmap

| Stage | Name | What the player sees | Depends on |
|-------|------|----------------------|------------|
| 1 | Living scenery | Real Kerala trees, flowers, grass, paddy fields, hills; better, road-aligned houses and shops | nothing |
| 2 | Junctions and signals | Cross roads meeting the route; red/yellow/green signals on timers; the bus must obey (fines for jumping a red) | 1 (so junction corners look right) |
| 3 | Traffic | Cars, bikes, autos and other buses on the route and cross roads; they follow lanes, queue, obey signals | 2 |
| 4 | Smart crossings | Pedestrian signals: people gather at a zebra; when about five are waiting the traffic signal goes red, they cross, then it goes green | 2, 3 |
| 5 | Grade separation | A flyover and an underpass on the route, split roads; roads gain height, so vehicles, camera and bus bays follow a height profile | 2, 3 |

Stages 2-5 are out of scope here. Stage 1 must not make them harder: building
and tree placement must go through a single layout module that later stages
can ask "is this ground free?" (see 4.3).

## 3. Stage 1 — intent and success criteria

Intent: make the roadside look like Kerala rather than a flat painted scene,
without changing any gameplay.

Success criteria:

- The ground no longer reads as one flat green texture: it has large-scale
  colour variation, grass tufts, bushes, paddy fields and a distant horizon.
- At least four tree species are visibly distinct: coconut palm, mango,
  gulmohar (flame tree), banana (plus an optional jackfruit-style tree).
- Flower clusters (sunflower, hibiscus, marigold) appear in roadside groups.
- Every house and shop faces the road, turns with the road's direction, sits
  at a consistent distance, and has a compound wall and gate.
- Kerala houses have a plinth, veranda with pillars, pitched clay-tile roof
  with overhang, framed door and windows.
- Shops/buildings have 2-4 storeys, balconies, shutters, rooftop water tanks
  and signboards (Malayalam with English).
- No scenery overlaps the road, footpath, verge, bus bays, shelters, signs,
  zebra crossings, electric poles, or another building (verified by tests).
- Frame cost stays within the budget in 6.
- All existing gameplay tests keep passing; no gameplay values change.

### Out of scope (Stage 1)

- Any road geometry change, junction, signal, traffic, flyover or underpass.
- Collision with scenery (the bus still cannot leave the road).
- Day/night changes to scenery beyond what the existing lighting gives.
- Imported 3D model files: everything stays procedural (no asset licensing).

## 4. Design

### 4.1 Layout generator (pure, tested)

New module `src/game/logic/layout.ts`. It decides *what* stands *where* and
knows nothing about three.js.

```ts
type Side = -1 | 1;                      // -1 left (-z), +1 right (+z)
type Plot = { x: number; side: Side };   // a slot along the route
type Placement =
  | { kind: "coconut" | "mango" | "gulmohar" | "banana" | "jackfruit";
      x: number; z: number; scale: number; lean: number; seed: number }
  | { kind: "house" | "shop"; x: number; z: number; heading: number;
      width: number; depth: number; floors: number; seed: number }
  | { kind: "flowers"; x: number; z: number; species: "sunflower" | "hibiscus" | "marigold"; count: number; seed: number }
  | { kind: "wall" | "gate"; x: number; z: number; heading: number; length: number };

function layoutScenery(seed: number, route: Stop[], features: RoadFeatures): Placement[];
```

Rules the generator guarantees (each is a unit test):

1. Deterministic: same seed -> identical output.
2. **Alignment:** a building's `heading` equals the road angle at its `x`
   (so it follows the curve); its front faces the road.
3. **Setback:** buildings stand at a fixed minimum distance behind the verge
   (road half-width + footpath + verge + compound), with small per-plot
   variation; trees at least a smaller minimum.
4. **No overlap:** no two footprints (rotated rectangles/circles) overlap,
   including compound walls.
5. **Keep-out zones:** nothing inside the road, footpath, verge, any bus bay
   or shelter footprint, sign pole, electric pole, zebra crossing, or the two
   turn-around aprons. Zones are computed from the same road/bay/roadside
   modules the game already uses, so they cannot drift.
6. **Variety:** each species and each of house/shop appears; no more than
   three identical neighbours in a row.
7. **Density by region:** shops cluster near bus stops; houses and trees fill
   between; fewer buildings, more paddy, toward the ends.
8. **Future-proof:** a function `isGroundFree(x, z, radius)` answers whether a
   spot is unoccupied by scenery; Stage 2 uses it to clear junction corners.

### 4.2 Rendering

New components, replacing the current `Scenery.tsx` and the grass part of
`Road.tsx`:

- `Ground.tsx` — layered ground: large tinted patches (several grass tones
  and dry-grass patches), paddy-field rectangles with a water sheen, and
  verge strips. Distant low hills as a ring of soft-coloured shapes at the
  horizon. Grass texture detail kept but broken up by the patches.
- `Foliage.tsx` — instanced vegetation:
  - grass tufts: crossed-plane clusters along verges and field edges;
  - bushes: clustered spheres;
  - trees (one instanced group per species/part): coconut (curved segmented
    trunk, 10-12 drooping fronds, coconut bunch), mango (thick trunk + dense
    rounded crown of overlapping spheres, two greens), gulmohar (wide
    umbrella crown of flattened spheres with red-orange blossom spheres),
    banana (stout stem + 6-8 large leaves), jackfruit (short trunk, dense
    dark crown with fruit);
  - flowers: sunflower (green stem, yellow petal ring, brown disc facing the
    road), hibiscus and marigold bushes (small coloured spheres on green).
- `Buildings.tsx` — instanced/grouped buildings from `Placement`:
  - Kerala house: plinth, walls, veranda with pillars, gable clay-tile roof
    with overhang, framed door/windows, optional chimney;
  - Shop/building: 2-4 floors, balconies with railings, shutter strips,
    rooftop water tank, signboard texture (Malayalam + English shop names
    from a small list);
  - compound wall (low, with coping) and gate with two pillars.
- `Scenery.tsx` keeps the electric poles and wires (unchanged behaviour) and
  composes the above.

Draw-call strategy: every repeated part is an `InstancedMesh` (existing
`Instances` helper, extended where needed for per-instance colour). Buildings
with unique signboards use a small texture atlas, not one texture each.

### 4.3 Culling and levels of detail

- Only scenery within **260 m** of the bus along the route is drawn; the rest
  is hidden (chunked by 100 m slices, toggled per frame as the bus moves).
- Beyond 120 m, trees use a simpler crown (fewer instances); fronds and
  flower detail are dropped.
- Slices are built once at load; only visibility changes at runtime.

### 4.4 Files

```
src/game/logic/layout.ts          pure layout generator + isGroundFree
src/game/logic/layout.test.ts
src/game/Ground.tsx
src/game/Foliage.tsx
src/game/Buildings.tsx
src/game/Scenery.tsx              composes the above + poles/wires
src/game/data/shopnames.ts        small list of Malayalam/English shop names
src/game/Road.tsx                 ground plane + grass removed (moves to Ground)
```

`Road.tsx` keeps asphalt, footpath, markings. No change to `logic/road.ts`,
`bay.ts`, `roadside.ts`, the store, or any gameplay module.

## 5. Testing

- `layout.test.ts` covers rules 1-8 above with the real route and features:
  determinism, alignment to road angle, setback, no overlaps, keep-out zones
  (including every bay, shelter, sign and pole), variety, density, and
  `isGroundFree`.
- Existing suite must stay green (197 tests at the time of writing).
- Manual verification in the browser at the depot and at two later positions
  (reached by driving or, since the test browser is slow, by a temporary
  debug camera page, removed afterwards): trees distinguishable by species,
  flowers visible, houses face and follow the road, no objects on the road
  or footpath, no clipping through shelters/signs.
- Performance check: frame time compared before and after on the same page
  (see 6).

## 6. Performance budget

- Draw calls added by Stage 1 scenery: at most ~120 at any camera position
  (instancing and slice culling).
- Triangles in view from scenery: at most ~150k.
- Load-time layout + instance building: under 400 ms on a mid laptop.
- The development browser used here renders at ~1.5 fps in software mode, so
  absolute fps cannot be measured there; budget is checked with
  `renderer.info` (draw calls, triangles) which is reported by a temporary
  debug readout.

## 7. Risks and assumptions

- Procedural trees will look stylised, not photographic. "Better quality" is
  taken to mean richer, correctly aligned, species-specific shapes with
  detail (veranda, balconies, signboards), not photoreal assets.
- Gulmohar and sunflower are not strictly roadside-typical everywhere in
  Kerala; they are placed as accents, as requested.
- Malayalam shop names are invented examples; the user should review the list.
- Draw-call and triangle numbers are estimates until measured.
- Stage 2+ will change road geometry; `isGroundFree` and the keep-out zone
  computation are the only hooks Stage 1 promises for them.

## 8. Acceptance checklist

- [ ] `layout.test.ts` passes and covers every guarantee in 4.1.
- [ ] Full test suite, type check, lint and production build pass.
- [ ] Browser check: four tree species and three flower types visible;
      houses and shops follow the road curve and face it; compound walls
      and gates present; no scenery on road/footpath/bays.
- [ ] Draw calls and triangle counts within the budget in 6.
- [ ] README updated with the scenery description.
