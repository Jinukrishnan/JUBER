# Aanawadi Ride-hailing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (the user chose inline "native" execution) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the KSRTC bus with Uber-style rides: choose bike, auto or car at login, accept ride requests between named places, hear the customer in Malayalam, navigate by radar route, drop them and get paid.

**Architecture:** Pure logic first in `src/game/logic/*` (vehicles, requests, ride state machine, road graph, dialogue), all unit tested; R3F components only render. A `ride` slice in the Zustand store replaces the bus/stop slices. The Stage 1 scenery and Stage 2 junctions, signals, red-light rule, radar, accidents and voice are reused.

**Tech Stack:** Next.js 16 (App Router, see `AGENTS.md`: read `node_modules/next/dist/docs/` before touching routing), React 19, TypeScript, Tailwind v4, @react-three/fiber v9, Zustand, Vitest 5 (jsdom via `// @vitest-environment jsdom` pragma).

**Spec:** `docs/superpowers/specs/2026-10-30-uber-rides-design.md`

## Global Constraints

- App name constant `APP_NAME` stays "Aanawadi".
- Capacities: bike 1, auto 2, car 3. A request never has a group larger than the chosen vehicle's capacity.
- Starting numbers (spec section 3): base fare / per 100 m: bike 15 / 3, auto 25 / 5, car 35 / 7; rent / goal: 100 / 500, 200 / 700, 300 / 900; max speed 22 / 14 / 18 m/s; length x width 2.1x0.8, 2.7x1.4, 4.4x1.8; wheelbase 1.4, 2.0, 2.5. Tuned in Task 13 only.
- Fare formula: `round(baseFare + farePer100m * routeLength / 100)`; speed bonus up to +20 percent; target time = route length / 8 m/s + 10 s.
- Requests: at most 3 open; one new every 8 to 15 s; expire after 45 s; pickup and drop differ and are at least 150 m apart; pickup within 700 m of the vehicle when possible.
- Pickup and drop zone: within 8 m of the place's kerb spot and slower than 1.5 m/s.
- Fines unchanged: accident Rs. 300 and -1 star, red light Rs. 100 and -0.5 star. Rating adds -0.25 per accepted ride whose pickup expired (max -1), -0.1 per harsh scrape; rounded to half stars, minimum 1.
- Vehicle colours: bike red and black (Yamaha R15 style), auto yellow roof with green lower body, car white (Swift Dzire style).
- Malayalam text is invented Kerala-style wording; keep Malayalam and English together in data (`ml`, `name`).
- No `Math.random` in layout or render setup; use the seeded `mulberry32`. No drei `<Html>` (React 19 clash); speech bubbles stay in-scene.
- CRLF files: edit with `.replace(/\r\n/g, "\n")` scripts or the Edit tool; avoid shell heredocs containing apostrophes inside `node -e '...'`.
- Commits use `-c user.name="Jinu" -c user.email="sarath@zilmoney.com"` and end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- A group bigger than capacity is never created, offered or boarded (bike vs 3 people).
- Pickup or drop place that is on a side road (needs the road graph and an arm-end U-turn).
- Vehicle moving fast through the pickup zone must not start the conversation; stopping just outside must not.
- A ride accepted, then the player crashes into someone or runs a red light: fines apply, the ride continues.
- Day ends (clock) in the middle of a ride: no crash, no double pay, summary counts only finished rides.
- Pausing during the conversation: timers, voice and request expiry freeze.

---

## Stage 1: Vehicles

### Task 1: Vehicle data

**Files:**
- Create: `src/game/data/vehicles.ts`, `src/game/data/vehicles.test.ts`

**Interfaces:**
- Produces: `type VehicleKind = "bike" | "auto" | "car"`; `type Vehicle = { kind; name; capacity: 1|2|3; length; width; wheelbase; maxSpeed; accel; maxSteer; baseFare; farePer100m; rent; goal }`; `VEHICLES: Record<VehicleKind, Vehicle>`; `VEHICLE_KINDS: VehicleKind[]` (order bike, auto, car); `isVehicleKind(x: unknown): x is VehicleKind`.

- [ ] **Step 1: Write the failing test** `vehicles.test.ts`: capacities are 1, 2, 3; names "Yamaha R15", "Auto-rickshaw", "Maruti Swift Dzire"; every vehicle has rent below goal; max speeds 22, 14, 18; `isVehicleKind("bike")` true and `isVehicleKind("bus")` false.
- [ ] **Step 2: Run** `npx vitest run src/game/data/vehicles.test.ts` — Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `vehicles.ts` with the Global Constraints numbers (`accel` bike 7, auto 3.5, car 5; `maxSteer` bike 0.7, auto 0.55, car 0.6).
- [ ] **Step 4: Run the test** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: vehicle data (bike, auto, car)`.

### Task 2: Profile and vehicle picker at login

**Files:**
- Modify: `src/lib/profile.ts`, `src/ui/LoginCard.tsx`, `src/ui/LoginCard.test.tsx`, `src/app/login/LoginClient.tsx`, `src/app/play/PlayClient.tsx` (and `PlayGate.tsx` if it reads the profile)
- Create: `src/ui/VehiclePicker.tsx`, `src/ui/VehiclePicker.test.tsx`

**Interfaces:**
- Consumes: Task 1 `VEHICLES`, `VehicleKind`, `isVehicleKind`.
- Produces: `Profile` gains `vehicle: VehicleKind` (default `"auto"`; an old saved profile without it or with a bad value loads as `"auto"`); `<VehiclePicker value onChange />` renders three cards (name, "max N passengers", fare per km, daily goal); `LoginCard` submits `vehicle`.

- [ ] **Step 1: Write failing tests:** VehiclePicker shows three options with "1 passenger", "2 passengers", "3 passengers"; clicking Car calls `onChange("car")`; LoginCard submit includes the chosen vehicle; `loadProfile` with a stored profile lacking `vehicle` returns `"auto"`.
- [ ] **Step 2: Run** `npx vitest run src/ui src/lib` — Expected: FAIL.
- [ ] **Step 3: Implement** `VehiclePicker.tsx` (sticker style cards, `aria-pressed`, no focus steal like the existing toggles), extend `Profile` and its loader with validation via `isVehicleKind`, add the picker to `LoginCard`.
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS (existing LoginCard tests updated for the new field).
- [ ] **Step 5: Commit** `feat: choose bike, auto or car at login`.

### Task 3: Vehicle-specific driving physics

**Files:**
- Modify: `src/game/logic/vehicle.ts`, `src/game/logic/vehicle.test.ts`

**Interfaces:**
- Consumes: Task 1 `Vehicle`.
- Produces: `stepVehicle(s, i, dt, roadHalfWidth, centerZ?, bounds?, spec?: Pick<Vehicle,"wheelbase"|"maxSpeed"|"accel"|"maxSteer">)`; with `spec` omitted behaviour and tests are unchanged (defaults are today's bus numbers). `maxSteerAt(speed, spec?)`.

- [ ] **Step 1: Write failing tests:** with the bike spec top speed reaches 22 and not 23; with the auto spec it caps at 14; at equal speed the bike turns more per second than the car (smaller wheelbase); omitted spec still caps at 16 (existing tests).
- [ ] **Step 2: Run** `npx vitest run src/game/logic/vehicle.test.ts` — Expected: FAIL on the new cases.
- [ ] **Step 3: Implement** the optional `spec` parameter replacing the module constants `WHEELBASE`, `MAX_FORWARD_SPEED`, `ACCEL`, `MAX_STEER` inside `stepVehicle` and `maxSteerAt`.
- [ ] **Step 4: Run** `npx vitest run src/game/logic` — Expected: PASS.
- [ ] **Step 5: Commit** `feat: per-vehicle handling`.

### Task 4: Vehicle models and the driven vehicle

**Files:**
- Create: `src/game/models/Bike.tsx`, `Auto.tsx`, `Car.tsx`, `src/game/Vehicle.tsx`
- Modify: `src/game/GameCanvas.tsx`, `src/game/CameraRig.tsx`, `src/game/busPose.ts` (rename the exported pose to keep `busPose` but add `vehicleKind`), `src/game/state/store.ts` (`vehicle: VehicleKind`; `startDay(vehicle)` sets `net = -VEHICLES[vehicle].rent`)
- Delete from play: `Bus.tsx` is replaced by `Vehicle.tsx` (file removal happens in Task 11).

**Interfaces:**
- Consumes: Tasks 1 and 3; `clampToDrivable`, `redViolation`, `JUNCTIONS` (unchanged).
- Produces: `<Vehicle />` doing what `Bus.tsx` does (input, steering, bounds, red-light check, door/handbrake not needed) using the chosen vehicle's spec; each model component takes `{ lightsOn: boolean }` and renders at the origin facing +x with headlights, brake light and (for Auto/Car) visible seats; `useGame` exposes `vehicle`; camera distance and height scale with vehicle length.

- [ ] **Step 1: Write failing tests:** store `startDay("bike")` gives `vehicle === "bike"` and `net === -100`; `startDay("car")` gives net -300; `startDay()` with no argument keeps the previous choice.
- [ ] **Step 2: Run** `npx vitest run src/game/state` — Expected: FAIL.
- [ ] **Step 3: Implement** store changes, the three models from primitives (bike: red/black fairing, windscreen, split seat, wheels, helmeted rider; auto: yellow roof, green lower body, black hood, three wheels, open sides, driver and rear bench; car: white sedan, tinted glass, hatch-like nose, small boot), and `Vehicle.tsx`; swap it into `GameCanvas`.
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit && npx eslint src` — Expected: PASS. Then check each vehicle by screenshot at the depot (temporary start pose change, reverted afterwards) and record that in the ledger.
- [ ] **Step 5: Commit** `feat: bike, auto and car models, driven by the chosen vehicle`.

### Task 5: Engine sound per vehicle

**Files:**
- Modify: `src/game/audio.ts`, `src/game/logic/engine.ts`, `src/game/logic/engine.test.ts`

**Interfaces:**
- Consumes: `VehicleKind`.
- Produces: `engineProfile(kind: VehicleKind): { gears: number[]; idleRpm; maxRpm; gain }`; `updateEngine({ speed, throttle, live, kind })`.

- [ ] **Step 1: Write failing tests:** for each kind the rpm stays between idle and max over speeds 0 to the vehicle's max; bike idle rpm is higher than auto's; auto has fewer gears than the car.
- [ ] **Step 2-4: Run red, implement profiles (bike buzzy and high, auto putter, car smooth), run green.**
- [ ] **Step 5: Commit** `feat: engine sounds per vehicle`.

---

## Stage 2: Rides

### Task 6: Places

**Files:**
- Create: `src/game/data/places-v1.ts`, `src/game/logic/places.ts`, `src/game/logic/places.test.ts`
- Modify: `src/game/logic/roadside.ts` (zebras and signs relative to places), `src/game/logic/junction.ts` (`validateJunctions` measures distance to places), `src/game/data/route-v1.ts` (reduced to road span: `ROAD_START`, `ROAD_END`), tests that use `ROUTE_V1`

**Interfaces:**
- Produces: `type Place = { id; name; ml; at: { kind: "main"; x: number; side: "left" | "right" } | { kind: "arm"; junctionId: string; side: -1 | 1; distance: number } }`; `PLACES: Place[]` (about 12, spec examples, with at least 3 on side roads); `placeSpot(place: Place, junctions: ResolvedJunction[]): { x: number; z: number; heading: number }` the kerbside spot where vehicles stop (left kerb for the direction the vehicle faces; on arms, the arm's own kerb); `placesAreValid(places, junctions): string[]` (every arm place names an existing junction and distance within `armLength - 20`, main places inside the road span).

- [ ] **Step 1: Write failing tests:** every place spot is drivable (`drivable(JUNCTIONS, x, z)`); no two spots within 40 m; arm places lie on their arm (`onSideRoad`); `placesAreValid(PLACES, JUNCTIONS)` is empty; a place naming a missing junction is reported.
- [ ] **Step 2: Run** — Expected: FAIL (module missing).
- [ ] **Step 3: Implement** data and `placeSpot` (reuse `localToWorld`); adapt `roadFeatures`/`validateJunctions`/zebras to use places (zebra 24 m beyond a main place) keeping the Stage 2 junction tests green by updating their stop references.
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS.
- [ ] **Step 5: Commit** `feat: named places with Malayalam names`.

### Task 7: Ride requests

**Files:**
- Create: `src/game/logic/requests.ts`, `src/game/logic/requests.test.ts`

**Interfaces:**
- Consumes: Tasks 1 and 6; `route` is not yet available, so distance here is straight along-road distance from `placeSpot` positions (`pathLength` placeholder replaced by `route().length` in Task 12 via an injected `distance(a,b)` parameter).
- Produces: `type Request = { id: string; pickup: Place; drop: Place; group: 1|2|3; fare: number; distance: number; expiresIn: number }`; `fareFor(vehicle: Vehicle, distance: number): number`; `speedBonus(fare, actualS, targetS): number` (0 to +20 percent); `nextRequest(state: { seed; nextId }, vehicle, from: {x;z}, distance: (a: Place, b: Place) => number): { request: Request; seed; nextId }`; `REQUEST_TTL_S = 45`, `MAX_OPEN = 3`, `spawnDelay(seed): { delay; seed }` (8 to 15 s).

- [ ] **Step 1: Write failing tests:** group size never exceeds capacity over 500 seeds per vehicle (bike always 1); pickup differs from drop and `distance >= 150`; fare equals the formula (auto, 400 m -> 45); `speedBonus` is 0 when late and 20 percent when instant and never above; same seed gives the same request; spawn delay between 8 and 15.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** with the existing seeded RNG helper.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: ride request generation and fares`.

### Task 8: Ride state machine

**Files:**
- Create: `src/game/logic/ride.ts`, `src/game/logic/ride.test.ts`

**Interfaces:**
- Consumes: Task 7 `Request`.
- Produces: `type RidePhase = "online" | "toPickup" | "atPickup" | "boarding" | "riding" | "alighting"`; `type Ride = { phase: RidePhase; request: Request | null; elapsed: number }`; `inZone(vehicle: {x;z;speed}, spot: {x;z}): boolean` (within 8 m and speed under 1.5); `acceptRequest(r, req)`, `arrivePickup(r)`, `acceptRide(r)`, `finishBoarding(r)`, `arriveDrop(r)`, `finishAlighting(r): { ride: Ride; paid: number }`, `skipRequest`; each returns the same ride unchanged when called from a phase where it is illegal.

- [ ] **Step 1: Write failing tests:** the full happy path online -> alighting -> online pays `fare + bonus` once; every transition ignored from a wrong phase; `inZone` false at 9 m and at 8 m when speed 3, true at 7 m and speed 1; paid is 0 and no state change if `finishAlighting` is called twice.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** pure functions.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat: ride state machine`.

### Task 9: Store ride slice (replaces the bus slices)

**Files:**
- Modify: `src/game/state/store.ts`, `store.test.ts`, `day.integration.test.ts`, `shift.sim.test.ts`, `src/game/logic/rating.ts` and test
- Remove from the store: `onboard`, `waitingByStop`, `doorOpen`, `parked`, `events`, `transferStep`, `toggleDoor`, `busPosition`, `busSpeed`'s bay logic, missed-stop logic.

**Interfaces:**
- Consumes: Tasks 1, 7, 8.
- Produces: store fields `ride: Ride`, `openRequests: Request[]`, `ridesDone: number`, `distanceDone: number`, `expiredPickups: number`; actions `accept(id)`, `skip(id)`, `setVehicleState({x,z,heading,speed})` (drives `arrivePickup`/`arriveDrop` detection from `inZone`), `confirmRide()` (the Accept ride button), `finishBoarding()`, `finishAlighting()`; `tick(dt)` also ages and expires requests and spawns new ones while `online` or `toPickup`; paused/ended days do nothing; `computeRating({ accidents, violations, expiredPickups, harshEvents })`.

- [ ] **Step 1: Write failing tests:** after `startDay("auto")` requests appear within 15 s of ticks and never exceed 3; accepting one moves to `toPickup` and the others stay open; skip removes it; stopping in the pickup zone moves to `atPickup`; `confirmRide` moves to `boarding`; `finishBoarding` to `riding`; stopping in the drop zone to `alighting`; `finishAlighting` adds the fare to `net` once and increments `ridesDone`; ticking while paused changes nothing; ending the day mid-ride leaves `ridesDone` untouched; an accident during a ride fines Rs. 300 and keeps the ride; rating formula cases.
- [ ] **Step 2: Run** `npx vitest run src/game/state src/game/logic/rating.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** and rewrite the integration/simulation tests around rides (the simulation can stay stubbed until Task 13).
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS with old bus tests removed or rewritten (ledger the removed list).
- [ ] **Step 5: Commit** `feat: ride state in the store, bus state removed`.

### Task 10: Rides in the world and on the HUD

**Files:**
- Create: `src/game/Places.tsx`, `src/game/Riders.tsx`, `src/ui/RequestBoard.tsx`, `src/ui/RequestBoard.test.tsx`, `src/ui/RideStrip.tsx`, `src/ui/RideStrip.test.tsx`
- Modify: `src/game/GameCanvas.tsx`, `src/game/Vehicle.tsx` (ride detection, hold at pickup/drop), `src/ui/Hud.tsx` (remove bay hint and bus panels; add vehicle and passenger count), `src/ui/DaySummary.tsx` and `PauseMenu.tsx` (new controls: 1/2/3 accept, X skip, Enter accept ride)
- Reuse: `Person.tsx`, `WalkingPerson.tsx`, `logic/people.ts`, `logic/path.ts`

**Interfaces:**
- Consumes: Tasks 6 to 9.
- Produces: `<RequestBoard />` (up to 3 cards: pickup, drop, group, distance, fare, expiry bar, Accept and Skip; keyboard 1/2/3 and X); `<RideStrip />` (phase text such as "Pickup: Priya, 340 m" or "Drop: Govt. Hospital, 520 m"); `<Places />` (sign post and name board with Malayalam, kerb marker ring on the active pickup/drop, customers waiting at the pickup, drawn only near the vehicle); `<Riders />` (group walks footpath to vehicle then sits; walks away at drop; durations 1.2 s per person); DaySummary shows rides, distance, earnings versus goal, stars.

- [ ] **Step 1: Write failing tests:** RequestBoard renders three request cards and calls `accept` with the right id on click and on key "2"; shows nothing when not online; RideStrip text per phase; DaySummary shows rides done and stars for the vehicle's goal.
- [ ] **Step 2: Run** `npx vitest run src/ui` — Expected: FAIL.
- [ ] **Step 3: Implement** UI first, then `Places`/`Riders`; the vehicle holds (handbrake) in `atPickup`, `boarding`, `alighting`.
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit && npx eslint src` then check in the browser (screenshot of the request board, a waiting customer, boarding) — Expected: PASS and pictures noted in the ledger.
- [ ] **Step 5: Commit** `feat: requests, pickup, boarding, drop and fares in the game`.

### Task 11: Remove the dead bus code

**Files:**
- Delete: `src/game/Bus.tsx`, `BusModel.tsx`, `OnboardPassengers.tsx`, `Stops.tsx`, `Walkers.tsx`, `logic/bay.ts`, `boarding.ts`, `fares.ts`, `seats.ts`, `guidance.ts` and their tests; `data/route-v1.ts` leftovers; unused store imports
- Modify: README (bus text removed; keep for Task 15)

- [ ] **Step 1:** list every importer of each file with `grep`; confirm none remain after Tasks 4 to 10.
- [ ] **Step 2:** delete the files and tests.
- [ ] **Step 3: Run** `npx vitest run && npx tsc --noEmit && npx eslint src && npx next build` — Expected: all clean.
- [ ] **Step 4: Commit** `chore: remove the bus code`.

---

## Stage 3: Conversation and navigation

### Task 12: Road graph and routing

**Files:**
- Create: `src/game/logic/roadgraph.ts`, `src/game/logic/roadgraph.test.ts`

**Interfaces:**
- Consumes: `ResolvedJunction`, `Place`, `placeSpot`.
- Produces: `buildGraph(junctions, places): Graph`; `route(graph, from: { x; z }, to: Place): { points: { x; z }[]; length: number; steps: Step[] }` with `Step = { at: { x; z }; turn: "straight" | "left" | "right" | "uturn" | "arrive"; distanceFromStart: number }`; `nextStep(route, position): { step: Step; distance: number } | null`; `offRoute(route, position, limit = 25): boolean`. Wire `requests.ts` to take `distance = (a, b) => route(...).length`.

- [ ] **Step 1: Write failing tests:** main road to main road straight, length equals the x difference within 1 m; into a left arm gives "left" at the junction (heading +x), into a right arm "right", out of it the reverse (heading to the junction from the arm, turning onto the main road toward +x is "right" for a left arm, check by geometry); a place at an arm's end gets "uturn" only when it is a turn-around destination on the return; shortest path chosen when two exist; `offRoute` false on the path, true 30 m away; `nextStep` returns the next turn with the right remaining distance.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** nodes and edges per spec section 5, plain Dijkstra, turn from the signed cross product of consecutive edge directions with a 25 degree straight threshold.
- [ ] **Step 4: Run** `npx vitest run src/game/logic` — Expected: PASS.
- [ ] **Step 5: Commit** `feat: road graph, routes and turn instructions`.

### Task 13: Navigation on the radar and HUD

**Files:**
- Modify: `src/ui/Minimap.tsx` (stops removed; places drawn; route line blue to pickup and green to drop; pickup and drop markers), `src/game/logic/radar.ts` (+test: `routeToRadar(view, points, range, radius)` helper), `src/ui/Hud.tsx`/`RideStrip.tsx` (next-turn text and arrow, remaining distance and time), `src/game/state/store.ts` (`route`, recomputed on accept, on `riding` start and when `offRoute`)
- Create: `src/ui/TurnArrow.tsx` (+ small test)

**Interfaces:**
- Consumes: Task 12.
- Produces: store `route: Route | null`; HUD strings "Turn left in 80 m", "Go straight 300 m", "Your destination is on the left" (arrive); the radar draws every place as a small marker and the active target larger.

- [ ] **Step 1: Write failing tests:** `routeToRadar` rotates with the heading and clips to the radius; RideStrip shows "Turn left in 80 m" for a given route step; store recomputes the route when the vehicle is 30 m off it and keeps it when 10 m off.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit && npx eslint src` and browser screenshot of the radar route — Expected: PASS.
- [ ] **Step 5: Commit** `feat: navigation route on the radar with turn guidance`.

### Task 14: Malayalam conversation

**Files:**
- Create: `src/game/logic/dialogue.ts`, `src/game/logic/dialogue.test.ts`, `src/ui/ConversationCard.tsx`, `src/ui/ConversationCard.test.tsx`
- Modify: `src/game/Places.tsx` (customer speech bubble using the existing `SpeechBubble`), `src/game/hit.ts` untouched, `src/game/voice.ts` (reuse `speakLine`), `src/game/state/store.ts` (`speak` triggered on entering `atPickup`)

**Interfaces:**
- Consumes: Tasks 8 and 10, `speakLine`.
- Produces: `dialogueFor(request: Request): { ml: string; en: string; name: string }` deterministic from `request.id`, mentions the drop place's Malayalam name in `ml` and English name in `en`, with a group variant for 2 and 3; `<ConversationCard />` (shown during `atPickup`: name, large Malayalam, small English, group size, fare, Accept ride; Enter confirms).

- [ ] **Step 1: Write failing tests:** `ml` contains the drop place's `ml` name; the same request gives the same lines; group 1, 2 and 3 produce different Malayalam (a plural form for 2 and 3); the card shows both languages and calls `confirmRide` on click and Enter; the card does not render in other phases.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement**; speaking uses `speakLine({ ml, en })` once on entry to `atPickup`, cancelled on leaving it or on pause.
- [ ] **Step 4: Run** `npx vitest run` and a browser check of the card — Expected: PASS.
- [ ] **Step 5: Commit** `feat: Malayalam customer conversation`.

### Task 15: Balance, documentation and final checks

**Files:**
- Modify: `src/game/state/shift.sim.test.ts` and tuning numbers in `data/vehicles.ts`; `README.md`

- [ ] **Step 1: Write a headless shift simulation** per vehicle: a scripted driver that accepts the nearest request, drives the route at 70 percent of max speed, stops in zones. Assert the goal is reached in 10 to 60 percent of seeds with a competent driver and never reached by an idle driver.
- [ ] **Step 2: Run** `npx vitest run src/game/state/shift.sim.test.ts` — Expected: FAIL until tuned.
- [ ] **Step 3: Tune** fares, rents and goals in `vehicles.ts` (only place numbers live), rerun to PASS, ledger the final numbers as a ruling.
- [ ] **Step 4: Update the README** (vehicles, ride flow and controls, how to add a place, navigation, radar) and run the full gate: `npx vitest run && npx tsc --noEmit && npx eslint src && npx next build`. Expected: all pass.
- [ ] **Step 5: Commit** `docs: ride-hailing README and tuned balance`; then run the final whole-branch review by a fresh reviewer, fix pass, and report rulings and deferred minors.
