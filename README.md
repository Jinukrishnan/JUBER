# Aanawadi (ആനവണ്ടി)

A 3D browser game: be the driver your Kerala town calls. Pick a vehicle (a Yamaha R15 bike, an
auto-rickshaw or a Maruti Swift Dzire car), accept ride requests, pick the customer up, hear in
Malayalam where they want to go, follow the radar route, drop them off and finish the day in profit.
Inspired by a one-passenger auto-rickshaw game.

Built with Next.js (App Router), TypeScript, Tailwind, React Three Fiber and Zustand.
No backend: the driver profile and records live in `localStorage`.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # unit + integration tests (Vitest)
npm run build    # production build
```

Flow: `/` landing -> `/login` driver ticket and vehicle -> `/play` the game
(`/play` redirects to `/login` when there is no saved profile).

## The three vehicles

| | Bike | Auto-rickshaw | Car |
|---|---|---|---|
| Model | Yamaha R15 style, blue and black | Yellow roof, green body, black nose | Swift Dzire style, orange with a red spoiler and a yellow bolt |
| Passengers | 1 | up to 2 | up to 3 |
| Top speed | 22 m/s, nimble | 14 m/s, slow and wide | 18 m/s |
| Rent / daily goal | Rs. 100 / 600 | Rs. 200 / 700 | Rs. 300 / 1000 |

The pictures on the driver ticket are cartoon vector drawings (`src/ui/VehicleArt.tsx`); `docs/design/vehicle-cartoon-concept.html` shows all three from the side, front and back.

Each handles differently (acceleration, turning, grip) and has its own engine sound. A request never
asks for a group bigger than your vehicle holds. All the numbers live in `src/game/data/vehicles.ts`.

## Controls

| Key | Action |
|-----|--------|
| W / S | Throttle · brake / reverse |
| A / D | Steer |
| Space | Hand brake |
| H | Horn |
| L | Headlights (also the button on the left) |
| 1 / 2 / 3 | Accept the first, second or third request |
| X | Skip the first request |
| Enter | Accept the ride when the customer is waiting |
| Z | Radar zoom: 150 m · 400 m · 1 km |
| C | Camera: chase · high · driver seat |
| R | Monsoon rain |
| M | Sound on/off (also the button on the right) |
| P / Esc | Pause menu |

## How a day works

1. You start Rs. 100 / 200 / 300 down (the vehicle's rent) and need to reach the vehicle's goal.
2. Up to three **requests** are open at once: customer, pickup, drop, group size, distance and fare.
   Accept one (**1 2 3** or the button) or skip it (**X**). Requests expire after 45 seconds.
3. The **radar** shows a blue route to the customer, with turn-by-turn text at the top of the screen
   ("Turn left in 80 m"). A blue beacon marks the pickup.
4. Stop at the pickup (within 8 m of the kerb spot, so the far lane counts too, under 1.5 m/s). The customer speaks, out loud in
   Malayalam when your device has a Malayalam voice, and the card shows the Malayalam and English.
   Press **Enter** to accept the ride. They walk to your vehicle and get in.
5. The route turns green and leads to the drop. Stop there and they get out and walk off; you are paid
   the distance fare plus up to 20% for a fast ride.
6. A customer you accepted but never reached gives up after 2.5 minutes (a quarter star off).
7. The day runs 06:00-20:00 on a clock compressed to 8 real minutes.

Fares are a base plus a rate per 100 m of road, by vehicle. Rating starts at 5 stars: 1 off per
accident, half a star per red light, half a star per turn that is not allowed, a quarter per customer who gave up (at most 1) and a little per
scrape against the kerb.

## Touch controls

Below 1024 px wide (phones, tablets) an on-screen pad appears: left and right on the left thumb; accelerate (Go) and Brake/reverse on the right, with small Horn, Hand brake and Pause buttons. Buttons work while held and several can be held at once; they let go on pointer cancel, window blur and pause. The pad merges with the keyboard (`src/game/touchInput.ts`, `src/ui/TouchControls.tsx`), so the physics is unchanged. The HUD shrinks and the cards move to the top on small screens. From 1024 px up the pad is hidden. Held upright, a touch device gets a "Rotate your phone to landscape" card (English and Malayalam) and the game pauses until it is turned (`src/ui/RotatePrompt.tsx`, `logic/orientation.ts`). A full-screen button (on the pad, and on the card) uses the browser's full screen and asks for a landscape lock (`src/game/useFullscreen.ts`); iPhone Safari has no full screen for web pages, so there the card suggests Add to Home Screen.

## Customer reviews

When a customer gets out they review the ride: 1 to 5 stars, a line in Malayalam (with the English, spoken aloud when your device has a Malayalam voice) and chips for what went wrong. A polite ride by the rules is 5 stars with warm thanks and a tip. An accident costs 2 stars, each red light or wrong turn 1, speeding over 40 km/h (the limit on the signs) up to 2 depending on how long, three or more kerb scrapes 1, and a ride much slower than it should be 1. The worse the ride, the angrier the customer, with a different rant for the worst problem. Five stars add a Rs. 20 tip and four stars Rs. 10. Speeding only changes the stars; it is never fined. The day summary shows your average customer rating.

The rules are in `src/game/logic/review.ts` (pure, tested), the card in `src/ui/ReviewCard.tsx`. The Malayalam wording is invented everyday speech; please have a native speaker check it.

## Sound, lights and accidents

Each vehicle has a synthesised engine (idle, gear changes, load), tyre roar, a reversing beeper and an
air horn. The **Sound** button on the right (or **M**) mutes everything, including the voices. The
**Headlights** button on the left (or **L**) turns on real beams.

Anyone you hit (pedestrians, people walking the footpaths, the customer waiting at a pickup) is thrown
clear, lands on the road or the footpath, and cries out in a speech bubble and out loud ("അയ്യോ! Oh my
God!"). It costs a Rs. 300 fine, slows you down and takes a star off. Hitting the waiting customer also
cancels the booking.

## The map

The world is about **2.4 by 1.5 km**. The village is in the west: a ring road (800 m by 500 m, rounded
corners) with Station Road (north to south) and Tech Avenue (west to east, running on into the city).
Station Road reaches north to **Dam Road**, which runs along the top of the dam (z = -150) and joins the
city, so the village and the city are connected twice. The tech city in the east is a street grid: five
north-south streets (x = 1100, 1300, 1500, 1900, 2300) and three cross roads (z = 0, 550, 900) around
Tech Avenue. There are about 28 junctions, all signalled, and 42 places (14 in the village, 4 on the
dam, 24 in the city).

The whole map is data in `src/game/data/network-v2.ts` (the types and the small V1 map, kept as a test
fixture, are in `network-v1.ts`). Junctions are not listed one by one: every crossing or T of the roads
is found by `autoJunctions` (`src/game/logic/junctions.ts`), and `JUNCTION_RULES` names the ones that
have turn rules. Places are in `src/game/data/places-v2.ts`. Roads must run along the axes. A snippet:

```ts
{ id: "ring", name: "Ring Road", ml: "റിംഗ് റോഡ്", closed: true, cornerRadius: 40, halfWidth: 6,
  points: [[0, 0], [800, 0], [800, 500], [0, 500]] },
{ id: "centre", at: [400, 250], roads: ["ns", "ew"], signal: { offset: 6 },
  allowed: { "ns:-1": ["left", "straight"], "ns:1": ["straight", "right"] } },
```

- Coordinates are metres, +x east, +z south. Traffic keeps left.
- A road is a list of corner `points`; corners are rounded with `cornerRadius`. `closed: true` joins the
  last point to the first (the ring).
- A junction says where it is (`at`), which roads meet there (`roads`), its light timings (`signal`: `offset`,
  `mainGreen`, `crossGreen`, `yellow`, `allRed`, in seconds, or `false` for none) and its turn rules.
- **Turn rules.** An approach is named `"<roadId>:<dir>"`: `dir` is `1` for traffic travelling the way the
  road's points run and `-1` for traffic travelling against them. `allowed` lists the turns (`left`,
  `straight`, `right`) an approach may make; an approach that is not listed may make every turn that exists.
  Leaving a junction by a turn that is not allowed costs Rs. 100, half a star and a "Turn not allowed here"
  banner, once. The signal heads, the arrows painted on the road before the stop line, the "Next signal"
  panel and the routes all follow the rules.
- To move a junction, change its `at` (and the points of the roads that meet there); the road meshes,
  crossings, signals, scenery clearance, radar and routes follow. A junction must lie on every road it names,
  be at least 150 m from another junction on the same road, and a corner radius may not exceed half of the
  shortest side. A bad part is left out and the reason is printed in the browser console.

Red lights: crossing a stop line while that approach's light is red costs Rs. 100 and half a star (yellow is
allowed; a light that has only just turned red gets a 0.4 s grace). At a T the ring and the cross road never
show green together.

## The places

There are 14 named places, each with an English and a Malayalam name: seven with bus-stop style shelters and
bays (`shelter: true`) and seven with name boards. They are data in `src/game/data/places-v1.ts`:

```ts
{ id: "hospital", name: "Govt. Hospital", ml: "ഗവ. ആശുപത്രി", road: "ns", s: 120, side: -1 },
```

`road` and `s` (metres along that road) say where, and `side` is the kerb: `-1` the left of the direction the
road runs, `1` the right. Keep a place at least 30 m from a junction box and 40 m from another place; a bad
one is left out with a message. You can stop in either lane within 8 m of the kerb spot.

The customer's wording is in `src/game/logic/dialogue.ts` (invented everyday Malayalam; please have a
native speaker check it).

## The scenery

Roadside trees, flowers, houses and shops, signs (the 40 km/h speed limit, crossing warnings, bus-stop signs and
Malayalam direction boards that name the road ahead), electric poles and pedestrians are all placed along
the network from `src/game/logic/layout.ts` and `roadside.ts`. Nothing is ever placed on a road, footpath,
junction or crossing: `src/game/logic/plantsInvariant.test.ts` proves it for the whole map and for a moved
junction. People only cross at the zebra crossings (one on every approach). The world is cut into 200 m cells
and only the ones near the vehicle are drawn.

## The radar

The round radar in the top-right corner shows every road of the loop turning around your vehicle, each signal
in its current colour, every place, and the route to follow (blue to the pickup, green to the drop). Press
**Z** (or click the button) to zoom: 150 m, 400 m or 1 km.

## The people

Customers, pedestrians and drivers are dressed from `src/game/logic/people.ts`: women in saris (a contrasting blouse and a gold border, hair in a bun), churidhars or suits; men in shirts, formal wear, or a shirt and a bordered mundu; elders in white; boys and girls in school uniform (white shirt, navy trousers or pinafore, tie, plaits) or everyday clothes. `docs/design/people-cartoon-concept.html` shows every outfit from the front and the back (drawn by `src/ui/PersonArt.tsx`).

## Traffic

You share the roads with 80 other vehicles (cars, autos, bikes and buses; `TRAFFIC_COUNT` in `traffic.ts`), driving both ways on every road. They keep to the left lane,
follow the vehicle in front (and you), queue at red lights, go on green and take any turn the junction allows;
they slow down and curve smoothly through a junction on a turn, and they never make a turn you would be fined for. They show as small dots on the radar (a bus a little bigger, one
waiting at a red light amber).

If you hit one it is an accident like any other (Rs. 300 and a star off, and you lose speed). Its driver stops for
4 seconds and shouts a line in Malayalam, in a speech bubble and out loud (a bus driver's voice is deeper than a
biker's). A driver who was waiting at a red light shouts about the signal.

The rules are in `src/game/logic/traffic.ts` (pure, tested: `traffic.test.ts`, `traffic.sim.test.ts`,
`trafficLap.test.ts`), the Malayalam lines in `src/game/logic/trafficTalk.ts` (invented everyday wording, please have
a native speaker check it), and the drawing and hit handling in `src/game/Traffic.tsx`. To change the numbers: the
number and mix are `TRAFFIC_COUNT` and `SHARE`, the spawn spacing is in `createTraffic`, cruise speeds and sizes in `KINDS`, braking,
gaps and the hit rules (`MIN_HIT_SPEED`, `HIT_COOLDOWN_S`, `HIT_STOP_S`) at the top of the driving section. Other
vehicles do not overtake, change lane, honk or yield inside a junction (two turning across one another can pass
through each other for a moment).

## Tuning

Vehicle numbers (speed, handling, fares, rent, goal) are in `src/game/data/vehicles.ts`; request pacing
(how often, how long they last, how near the pickups) is in `src/game/logic/requests.ts`; the day length
and fines are in `src/game/constants.ts`. `src/game/state/shift.sim.test.ts` plays whole days with a
competent scripted driver for each vehicle and checks the goal is reachable on most days but not every
one: change a fare, run `npm test`, and it tells you if the balance broke. The app name shown in the UI
is `APP_NAME` in the constants file.

## Layout

```
src/app/         routes (landing, login, play)
src/game/        3D scene (Vehicle, models, Road, Scenery, SignalHeads, Places, Riders, CameraRig, Weather) + store
src/game/data/   vehicles, places, the road network (network-v1.ts)
src/game/logic/  pure, unit-tested rules (network, turns, lights, traffic, requests, ride, roadgraph, layout, dialogue, rating, vehicle)
src/ui/          HUD, request board, conversation card, radar, pause menu, day summary, login card
src/lib/         localStorage profile
```

## Deploy

It is a standard Next.js app with no server dependencies, so it deploys as-is to Vercel:

1. Push the repo to GitHub.
2. Import it at vercel.com/new (framework is auto-detected).
3. Deploy. No environment variables are needed.

## Notes

- Touch devices play with the on-screen pad, held sideways (landscape).
- Place names and the Malayalam wording are invented. The vehicles are stylised models built from simple
  shapes, not official brand artwork.
- The voice uses the browser's speech synthesis: it speaks Malayalam only if the device has a Malayalam
  voice, otherwise it speaks the English line.
