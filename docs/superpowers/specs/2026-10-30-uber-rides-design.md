# Aanawadi — Ride-hailing mode (bike, auto, car)

Date: 2026-10-30
Status: Draft for review
Builds on: the Stage 1 scenery and Stage 2 junctions/signals/radar work (all done)

## 1. Intent

The KSRTC bus game becomes an Uber-style ride game. After logging in the
player chooses a vehicle: **bike**, **auto-rickshaw** or **car**. Customers
request rides between **named places**; the player accepts a request, drives to
the customer, hears what they want in Malayalam, accepts the ride, drives them
to the drop place by following the on-screen navigation, and is paid.

Decisions already made with the user:

- The bus is **replaced** (no Bus mode stays).
- Pickups and drops are **named places on the roads**, main road and side roads.
- Earnings are **fare by distance, per vehicle**, plus a small speed bonus.
- A group of up to the vehicle's limit travels as **one booking, one pickup,
  one drop** (no shared/pool rides).
- The app name stays **Aanawadi**.

### Success criteria

- Login offers Bike / Auto / Car with passenger limits (1 / 2 / 3).
- Each vehicle is recognisably Indian: Yamaha R15-style bike, Swift
  Dzire-style car, auto-rickshaw with a yellow roof and green body.
- Each vehicle drives differently (speed, turning, engine sound) and never
  carries more than its limit; the request list never offers a larger group.
- Requests appear, can be accepted or skipped, expire, and show pickup, drop,
  distance and fare.
- On accept, the radar draws a route to the pickup. Arriving and stopping at
  the pickup starts a Malayalam conversation (bubble + voice + card). Pressing
  Accept makes the group walk to the vehicle and get in.
- While riding, the radar route goes to the drop, with next-turn guidance and
  remaining distance. Arriving and stopping at the drop makes the group get
  out and pays the fare.
- Accidents, red-light fines, signals, junctions, side roads, sounds, voice and
  the radar keep working with every vehicle.
- All logic is unit tested; the existing suite keeps passing wherever the code
  it covers survives.

### Out of scope

- Other traffic and pedestrian crowds at crossings (Stages 3 and 4), flyover and
  underpass (Stage 5).
- Shared rides, customer ratings and tips, cancellations, surge pricing, a
  saved profile history beyond what exists now.
- Several days in a row or an online leaderboard.

## 2. Game flow

States of the day: `idle` -> `running` (with a **ride phase**) -> `ended`.
Ride phase: `online` -> `toPickup` -> `atPickup` (conversation) -> `boarding`
-> `riding` -> `alighting` -> `online`.

1. **online:** the request board holds up to 3 open requests. Press **1/2/3**
   (or click) to accept one, **X** to skip. Requests expire after 45 s.
2. **toPickup:** radar route to the pickup place; HUD shows place name,
   distance, estimated time.
3. **atPickup:** when the vehicle is within the pickup zone (8 m) and slower
   than 1.5 m/s, the conversation opens: the customer speaks in Malayalam
   (voice via the existing `speakLine`, bubble over their head) and a card
   shows Malayalam, English, group size and fare. **Accept ride** (Enter or
   click) continues; the vehicle holds (handbrake) while the card is open.
4. **boarding:** the group walks from the footpath to the vehicle and gets in
   (seats/pillion visible), then **riding** starts.
5. **riding:** radar route to the drop, next-turn text, remaining distance. The
   route recalculates if the player takes another road.
6. **alighting:** within the drop zone (8 m) and slower than 1.5 m/s: the group
   gets out and walks off; fare is paid and the ride is counted.

A request left unanswered at `toPickup` for too long is not penalised except
that it is lost; leaving a customer in the vehicle never cancels the ride.

## 3. Vehicles

Defined in `src/game/data/vehicles.ts`:

```ts
type VehicleKind = "bike" | "auto" | "car";
type Vehicle = {
  kind: VehicleKind;
  name: string;            // "Yamaha R15", "Auto-rickshaw", "Maruti Swift Dzire"
  capacity: 1 | 2 | 3;     // max passengers
  length: number; width: number;      // metres
  wheelbase: number;
  maxSpeed: number;        // m/s forward
  accel: number;
  maxSteer: number;
  baseFare: number;        // Rs
  farePer100m: number;     // Rs
  rent: number;            // Rs taken at the start of the day
  goal: number;            // Rs net target
};
```

Starting values (tuned by a headless shift simulation before release):

| | Bike | Auto | Car |
|---|---|---|---|
| capacity | 1 | 2 | 3 |
| length x width | 2.1 x 0.8 | 2.7 x 1.4 | 4.4 x 1.8 |
| wheelbase | 1.4 | 2.0 | 2.5 |
| max speed | 22 | 14 | 18 |
| base fare / per 100 m | 15 / 3 | 25 / 5 | 35 / 7 |
| rent / goal | 100 / 500 | 200 / 700 | 300 / 900 |

Models (built from primitives like the bus, no external assets):

- **Bike:** red and black Yamaha R15-style sports bike (full fairing, small
  windscreen, split seat, underbelly), rider with helmet; a pillion seat is
  not needed (capacity 1 is the customer, who rides pillion: shown behind).
- **Auto:** yellow roof, green lower body and doors-open sides, black hood
  cover, round headlight, single front wheel, driver seat and rear bench for 2.
- **Car:** white Swift Dzire-style sedan: hatch-like front, small boot, tinted
  windows, headlights, visible occupants through the glass.

Each has its own engine sound profile (bike: high and buzzy; auto: two-stroke
putter; car: smooth) using the existing synth in `audio.ts`.

## 4. Places and requests

`src/game/data/places-v1.ts`: about 12 named places, each:

```ts
type Place = {
  id: string; name: string; ml: string;     // English and Malayalam names
  at: { kind: "main"; x: number; side: "left" | "right" }
    | { kind: "arm"; junctionId: string; side: -1 | 1; distance: number };
};
```

Examples: Aanawadi Depot, Thennalpadi Temple, Mullakkunnu School, Karimbanam
Market, Govt. Hospital, Vattakkulam Bus Stand, Chembolimukku Bakery, Nellimala
Junction, and a few on side roads (Panchayat Office, Church, Mosque, Paddy
Farm). Every place has a kerbside **pickup spot** (on the road edge, on the
side given) used as pickup and drop point, a small sign post and a marker.

Request generation (seeded, pure, unit tested):

- every 8 to 15 s while fewer than 3 are open, create a request: pickup and
  drop are different places at least 150 m apart; group size 1 to the
  vehicle's capacity; fare from distance by route length;
- pickup preference is within 700 m of the vehicle so rides are reachable;
- expiry 45 s; speed bonus up to +20 percent if the ride finishes within the
  target time (route length / 8 m/s plus 10 s).

Fare: `round(baseFare + farePer100m * routeLength / 100)`.

## 5. Routing and navigation

A small road graph built from the junction data (`logic/roadgraph.ts`):

- nodes: the main road at each junction, at each main-road place, and the
  road ends; each arm's junction mouth, its places and its end;
- edges: straight stretches with lengths; main road edges follow
  `roadCenterZ`.
- `route(graph, from, to)` returns an ordered list of points and a list of
  **instructions** (straight, turn left, turn right, U-turn at the end).
  Plain Dijkstra, unit tested.
- The player's position is snapped to the nearest edge; the route is
  recomputed when the player is more than 25 m from the planned path.
- The radar draws the route as a bright line (blue to pickup, green to drop);
  the HUD shows the next instruction and distance to it ("Turn left in 80 m").

## 6. Conversation

`logic/dialogue.ts` (pure): picks a greeting and a request line from a small
set, using the drop place:

- Malayalam examples: "ചേട്ടാ, {place.ml} ലേക്ക് പോകണം" (Chetta, I need to go
  to {place}), "{place.ml} വരെ ഒന്ന് കൊണ്ടുപോകാമോ?" (Can you take me up to
  {place}?), group variants ("ഞങ്ങൾ രണ്ടുപേരുണ്ട്" - there are two of us).
- English gloss shown beneath. Spoken with `speakLine` (voice falls back to
  English if the device has no Malayalam voice, as now).
- Deterministic from the request id so tests are stable.

## 7. UI

- **Login:** name field, then three large vehicle cards (Bike, Auto, Car) with
  an illustration, max passengers, fare per km and daily goal. The choice is
  saved in the local profile and can be changed on the next login.
- **HUD (driving):**
  - left column: Net (with goal), Next signal, Headlights;
  - top centre: request board (cards with Accept and Skip) when online; during a
    ride, a ride strip: "Pickup: Priya, 340 m" or "Drop: Govt. Hospital, 520 m";
  - right column: Sound, round radar with route line and zoom (existing),
    current vehicle and passengers (for example "2 / 2");
  - bottom: next-turn instruction.
- **Conversation card:** customer name, Malayalam line (large), English line
  (small), group size, fare, and the Accept ride button.
- **Day summary:** rides completed, distance, earnings versus goal, stars.
- Visual style stays the existing sticker/cream style.

## 8. Rating

Stars are 5 minus penalties: accidents (1 each), red lights (0.5), requests that
expired while accepted-but-not-picked-up (0.25 each, max 1), harsh scrapes
(0.1). Rounded to half stars, minimum 1.

## 9. Architecture and files

Reused unchanged or nearly so: road, junctions, signals, red-light rule,
scenery, radar drawing, voice, accidents/casualties, audio engine core.

Replaced or new:

```
src/game/data/vehicles.ts              the three vehicles and their numbers
src/game/data/places-v1.ts             named places
src/game/logic/roadgraph.ts            graph, route(), instructions
src/game/logic/requests.ts             seeded request generation, fares, expiry
src/game/logic/ride.ts                 ride phase state machine (pure)
src/game/logic/dialogue.ts             Malayalam/English lines
src/game/models/Bike.tsx, Auto.tsx, Car.tsx
src/game/Vehicle.tsx                   replaces Bus.tsx, driven by the vehicle spec
src/game/Places.tsx                    place signs, pickup markers, waiting customers
src/game/Riders.tsx                    group walking to/from the vehicle, seated groups
src/ui/VehiclePicker.tsx               login vehicle cards
src/ui/RequestBoard.tsx, RideStrip.tsx, ConversationCard.tsx, DaySummary.tsx
```

Removed: bus model and interior, stops and bays, boarding/alighting by door,
bay and stop guidance, route/fare logic tied to stops (`bay.ts`, `boarding.ts`,
`fares.ts`, `seats.ts`, `Stops.tsx`, `OnboardPassengers.tsx`, `Walkers.tsx`).
`ROUTE_V1` shrinks to the road definition (start and end of the road) because
road ends, zebras and keep-out zones still need it; zebra crossings and road
signs are placed relative to places instead of bus stops, and junction
validation measures distance to places.

The store keeps the game state, with a `ride` slice (phase, open requests,
current request, route, earnings) replacing the bus slices.

## 10. Build stages

1. **Vehicles:** vehicle data, picker in login, the three models driving with
   their own handling and sounds, capacity shown. Bus removed from play.
2. **Rides:** places, requests, accept/skip, pickup and drop detection, group
   boarding/alighting, fares, day summary, new rating.
3. **Conversation and navigation:** road graph and routing, route on the radar,
   next-turn HUD, Malayalam conversation card with voice.

Each stage ends playable, with tests and a README update. The plan will give
exact tasks per stage.

## 11. Testing

- `vehicles.test.ts`: capacities are 1/2/3, numbers sane, rent below goal.
- `requests.test.ts`: group size never exceeds capacity, pickup and drop differ
  and are 150 m or more apart, fare formula, expiry, determinism by seed, at
  most 3 open.
- `roadgraph.test.ts`: routes along the main road, into and out of arms, turn
  instructions (left/right/straight/U-turn), shortest path, off-route
  recompute threshold.
- `ride.test.ts`: every legal phase change, the illegal ones are ignored, pickup
  and drop need the vehicle inside the zone and nearly stopped, boarding and
  alighting complete, fare paid once.
- `dialogue.test.ts`: lines contain the drop place in Malayalam, group variants,
  deterministic.
- Store tests for earnings, rent, rating; the existing accident, red-light and
  signal tests keep passing.
- A headless shift simulation per vehicle (like the earlier one) to tune
  fares, rents and goals so the goal is reachable but not trivial.
- Manual browser check: choose each vehicle, accept a ride, pickup, hear the
  conversation, route and turn text, drop.

## 12. Risks and assumptions

- Three vehicle models from primitives are the biggest visual task; they will
  look stylised, like the rest of the game.
- The Malayalam voice depends on the device having a Malayalam voice; the
  English fallback is spoken otherwise (as for the accident shouts).
- Place names and Malayalam wording are my own invented, Kerala-style text and
  should be proofread by a native speaker.
- The routing graph assumes straight arms and one main road, matching the
  current junction model.
- Fares, rents and goals are starting numbers to be tuned by simulation.
- The test browser renders at about 1.5 fps, so driving cannot be played end to
  end there; flows are checked by tests, headless simulation and screenshots.

## 13. Acceptance checklist

- [ ] Login lets you pick Bike, Auto or Car; capacities 1, 2, 3 are enforced.
- [ ] R15-style bike, auto-rickshaw (yellow roof, green body) and Swift
      Dzire-style car are recognisable in the world.
- [ ] Requests appear, accept/skip works, expired ones vanish.
- [ ] Route to the pickup appears on the radar; stopping at the pickup opens the
      Malayalam conversation with voice and bubble.
- [ ] Accepting makes the group walk to and board the vehicle; the route to the
      drop with turn guidance appears.
- [ ] Stopping at the drop makes them get out and pays the fare.
- [ ] Accidents, red-light fines, signals, junctions and the radar still work.
- [ ] Headless simulations show the daily goal is reachable for each vehicle.
- [ ] Full test suite, type check, lint and build pass.
- [ ] README documents the vehicles, the ride flow and how to add a place.
