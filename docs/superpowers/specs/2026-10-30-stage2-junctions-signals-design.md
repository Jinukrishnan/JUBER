# Aanawadi — Stage 2: Configurable Junctions, Side Roads and Signals

Date: 2026-10-30
Status: Draft for review
Builds on: `2026-10-30-roadmap-and-stage1-living-scenery-design.md` (roadmap, Stage 1 done)

## 1. Intent

Add signalled junctions to the route, and let the player drive through them
and **turn left or right into side roads**. Junctions are **data, not code**:
the owner of the project can add, remove or move a junction, and choose
whether its side road goes left, right, or both, by editing one file; the road
geometry, signals, markings, scenery clearance and rules all follow.

### Changes to earlier decisions (requested by the user in this session)

- Earlier decision "the bus keeps its fixed route and does not leave it" is
  **relaxed**: the bus may now leave the main route into side roads at
  junctions. The route itself (stops, bays, fares, direction flip, day clock)
  is unchanged and still defined on the main road only.
- Earlier question "what happens on red" is answered: **Rs. 100 fine, half a
  star off the rating, a red banner; crossing on yellow is allowed.**

### Success criteria

- A junction list in `src/game/data/junctions-v1.ts` fully describes the
  junctions. Changing a junction's position or side changes everything that
  depends on it, with no other code edits.
- A validator rejects bad configurations with a clear message (too close to a
  bus stop, bay, zebra crossing, another junction, or the route ends).
- At each junction: a cross-road arm on the configured side(s), a junction
  area, stop lines on every approach, zebra crossings across every arm and
  across the main road, footpaths that continue around the corners, and
  traffic signals (red / yellow / green) that run on a timer.
- The bus can turn into an arm, drive along it, turn round at its dead-end
  turn-around area, and come back. It cannot drive off the paved area.
- Running a red light, from any approach, costs the fine and rating.
- Houses, trees and poles never stand on an arm or junction corner.
- All existing gameplay tests keep passing.

### Out of scope (this stage)

- Other vehicles and pedestrians obeying the signals (Stages 3 and 4).
- Houses and shops along the arms (arms get trees and kerbs only).
- Flyover, underpass, split roads (Stage 5).
- Fares or stops on side roads.
- Turn arrows, left-turn-on-red rules, signal sensors.

## 2. Junction data

```ts
type ArmSide = "left" | "right" | "both";          // left = -z, right = +z
type Junction = {
  id: string;
  x: number;                 // metres along the route
  arms: ArmSide;             // which side(s) the side road goes
  armLength?: number;        // default 200; ends in a turn-around area
  armHalfWidth?: number;     // default 5 (10 m road)
  signal?: {                 // default plan if omitted
    offset?: number;         // seconds into the cycle at time 0
    mainGreen?: number;      // default 28
    crossGreen?: number;     // default 14
    yellow?: number;         // default 3
    allRed?: number;         // default 2
  } | false;                 // false = unsignalled junction
};
export const JUNCTIONS_V1: Junction[];   // default: four, between the stops
```

Default list: x = 400, 700, 1000, 1300; arms `both`, `left`, `right`, `both`
(so every kind exists out of the box); offsets 0, 12, 24, 36 s.

`validateJunctions(junctions, stops, features): string[]` returns messages:
outside the route (first stop + 60 to last stop - 60), closer than 90 m to a
stop (bay and shelter), closer than 45 m to a zebra crossing, closer than 150 m
to another junction, `armLength` under 40 or over 400, non-positive timings.
The game logs these at start-up and ignores invalid junctions rather than
crashing.

## 3. Geometry

Each junction is built in its own straight local frame at the main road's
position and angle at `x` (the road bends under 0.1 m across a junction).

- **Junction area:** the overlap of the main carriageway and the arm.
- **Arm:** a straight road, `armHalfWidth` each side of its axis, running
  perpendicular to the main road for `armLength`, ending in a circular
  turn-around area (radius 14 m) so the bus can turn round at the end.
- **Footpath and kerb:** along each arm, joined to the main footpath through
  **chamfered corners** (a 45-degree cut of about 4 m), not true curves.
  The main footpath, verge, edge lines and centre line have gaps where an arm
  joins.
- **Markings:** stop line on every approach (main road both ways, each arm),
  a zebra crossing across every arm and across the main road just outside the
  junction, centre line stops 8 m before the junction area.
- **Drivable area (new):** the paved area is the union of the main carriageway
  strip and every junction's arm strips and turn-arounds, plus the two
  existing end aprons. `drivable(x, z)` and `clampToDrivable(x, z)` (nearest
  point on the paved area) are pure and tested.

## 4. Signals

Pure module `logic/signals.ts`:

- `signalAt(plan, t): { main: Light; cross: Light; nextChange: number }` where
  `Light = "green" | "yellow" | "red"`. Cycle: main green, main yellow,
  all-red, cross green, cross yellow, all-red. Defaults: 28 / 3 / 2 / 14 / 3 / 2
  = 52 s. `offset` shifts the start. Both arms share the cross signal.
- `approachLight(junction, t, approach): Light` for approach in
  `"mainForward" | "mainBackward" | "armLeft" | "armRight"`.

The signal clock is `signalTime` in the store: advances by `dt` while the day
runs, frozen while paused, reset on a new day.

Rendering: a pole with a signal head at the near-right corner of every
approach facing the traffic (three lamps; the lit lamp glows), plus a head on
a mast arm over the main road. Lamps are emissive discs, no extra lights.

## 5. The rule

- Detection is pure: `stopLineCrossed(junction, prev, next, approach)` returns
  true when the bus's **front** moves across the stop line toward the
  junction between two frames.
- `redViolation(...)`: crossing while `approachLight` is `red`, with a 0.4 s
  grace after the light turned red. A bus already inside the junction area
  when the light turns red is not fined. Reversing across a line does not
  count. Yellow and green are fine.
- On violation the store records it once per approach crossing: `net -= 100`,
  `violations += 1`, banner "Jumped a red signal! Fine Rs. 100", rating
  `-0.5` per violation (added to `computeRating`).
- Turning does not change the rule: the light of the approach you cross is the
  one that counts (no right turn on red).

## 6. Off-route driving

- The HUD "Next stop" panel shows "Off route - rejoin the main road" while the
  bus is on an arm; stop bays and the transfer logic do not activate there
  (they already require a bay match, which only exists on the main road).
- Missed-stop detection uses the position along the main route; while on an
  arm the position is held at the junction's `x`, so no stops are missed or
  triggered by driving along an arm.
- Day clock, fares and passengers continue as normal.

## 7. Integration with earlier work

- `keepOutZones(stops, features, junctions)` gains zones for every arm
  corridor, turn-around, and junction corner. `layoutScenery` takes the
  junctions so houses, trees, flowers and poles never land there.
- `polePositions` skips any x inside a junction's clearance.
- `roadFeatures` zebra/sign placement is unchanged; validation guarantees
  junctions stay clear of them.
- `stepVehicle` gains an optional bounds callback; its existing behaviour and
  tests are unchanged when it is omitted. `Bus.tsx` passes the drivable-area
  clamp.
- Arms get simple trees along their first 120 m (seeded, kept clear of the
  corridor), using the existing tree parts.

## 8. HUD

A "Next signal" panel: a lamp in the current colour, distance to the stop line
in the direction of travel, and seconds until it changes. Hidden when no
signalled junction is ahead on the main road.

## 9. Files

```
src/game/data/junctions-v1.ts       the configurable list
src/game/logic/junction.ts          frames, arm/corner/turn-around geometry, validateJunctions
src/game/logic/drivable.ts          drivable(x,z), clampToDrivable
src/game/logic/signals.ts           signal plans, signalAt, approachLight
src/game/logic/redlight.ts          stopLineCrossed, redViolation
src/game/Junctions.tsx              arms, corners, markings
src/game/SignalHeads.tsx            poles, heads, lamps
src/game/Road.tsx                   gaps for arms in footpath, verge, edge and centre lines
src/game/logic/footprint.ts         keepOutZones takes junctions
src/game/logic/layout.ts            takes junctions
src/game/logic/vehicle.ts           optional bounds callback
src/game/Bus.tsx                    uses the drivable clamp; checks red-light crossings
src/game/state/store.ts             signalTime, violations, registerViolation
src/game/logic/rating.ts            violations weigh 0.5 star each
src/ui/Hud.tsx                      Next signal panel, off-route notice
```

## 10. Testing

- `signals.test.ts`: phase order and lengths, no conflicting greens, yellow
  before red, offsets, `nextChange` correct at every boundary.
- `junction.test.ts`: frame at a junction matches the road angle; arm corridor
  and turn-around geometry; `validateJunctions` accepts the default list and
  flags each bad case; moving a junction moves its zones.
- `drivable.test.ts`: points on the main road, in an arm, in a turn-around are
  drivable; grass beside an arm is not; clamp returns the nearest paved point
  and is idempotent; end aprons still work.
- `redlight.test.ts`: crossing on red is a violation from each of the four
  approaches; yellow, green, reversing, grace period and "already inside" are
  not.
- Store tests: fine, count, banner, rating; `signalTime` advances, pauses, resets.
- Layout tests: no placement overlaps any junction zone for the default list
  and for a moved junction.
- Vehicle tests: unchanged when no bounds; clamps to the bounds when given.
- HUD tests: Next signal panel shows colour and distance; off-route notice.
- Manual browser check: each default junction (both, left, right, both): arm,
  corners, markings, signals cycling, turning in and out, turn-around.

## 11. Risks and assumptions

- Cut footpaths and chamfered corners are the hardest geometry; built from
  simple quads in the junction's local frame and checked visually.
- The test browser is slow (~1.5 fps), so cycling signals are checked by
  reading signal state against the clock plus screenshots, not by watching.
- Signal timing numbers are defaults the owner can change per junction.
- A junction placed by editing the file is only guaranteed valid if it passes
  `validateJunctions`; invalid ones are skipped with a console message.
- Arms are straight and perpendicular; curved or angled side roads are a
  later extension.

## 12. Acceptance checklist

- [ ] Editing `junctions-v1.ts` (add, move, change arm side) changes the world
      accordingly with no other edits.
- [ ] `validateJunctions` flags each bad case with a clear message.
- [ ] The bus can turn into an arm, turn round at the end, and return.
- [ ] Signals cycle correctly at all four default junctions.
- [ ] Red-light fine, banner and rating work from every approach; yellow does not fine.
- [ ] Nothing from Stage 1 scenery stands on an arm or corner.
- [ ] Full test suite, type check, lint and build pass.
- [ ] README documents how to add or move a junction.
