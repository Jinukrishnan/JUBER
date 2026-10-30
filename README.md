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
| Model | Yamaha R15 style, red and black | Yellow roof, green body | Swift Dzire style, white |
| Passengers | 1 | up to 2 | up to 3 |
| Top speed | 22 m/s, nimble | 14 m/s, slow and wide | 18 m/s |
| Rent / daily goal | Rs. 100 / 500 | Rs. 200 / 700 | Rs. 300 / 900 |

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
4. Stop at the pickup (within 6 m of the kerb spot, under 1.5 m/s). The customer speaks, out loud in
   Malayalam when your device has a Malayalam voice, and the card shows the Malayalam and English.
   Press **Enter** to accept the ride. They walk to your vehicle and get in.
5. The route turns green and leads to the drop. Stop there and they get out and walk off; you are paid
   the distance fare plus up to 20% for a fast ride.
6. A customer you accepted but never reached gives up after 2.5 minutes (a quarter star off).
7. The day runs 06:00-20:00 on a clock compressed to 8 real minutes.

Fares are a base plus a rate per 100 m of road, by vehicle. Rating starts at 5 stars: 1 off per
accident, half a star per red light, a quarter per customer who gave up (at most 1) and a little per
scrape against the kerb.

## Sound, lights and accidents

Each vehicle has a synthesised engine (idle, gear changes, load), tyre roar, a reversing beeper and an
air horn. The **Sound** button on the right (or **M**) mutes everything, including the voices. The
**Headlights** button on the left (or **L**) turns on real beams.

Anyone you hit (pedestrians, people walking the footpaths, the customer waiting at a pickup) is thrown
clear, lands on the road or the footpath, and cries out in a speech bubble and out loud ("അയ്യോ! Oh my
God!"). It costs a Rs. 300 fine, slows you down and takes a star off. Hitting the waiting customer also
cancels the booking.

## The places

There are 14 named places, each with an English and a Malayalam name: the seven old bus-stop shelters on
the main road, and seven on the side roads (with their own name boards). They are data in
`src/game/data/places-v1.ts`:

```ts
{ id: "hospital", name: "Govt. Hospital", ml: "ഗവ. ആശുപത്രി",
  at: { kind: "arm", junctionId: "j1300", side: -1, distance: 130 } },
```

To add a place on a side road, give it the junction's id, the side (-1 left, 1 right) and how many metres
along the arm it stands (between 20 m and 20 m short of the arm's end). Main-road places are built from
the stops in `src/game/data/route-v1.ts`. Places must stay at least 40 m apart.

The customer's wording is in `src/game/logic/dialogue.ts` (invented everyday Malayalam; please have a
native speaker check it).

## The road

A realistic Kerala road: asphalt with white edge lines, a dashed centre line that turns into a double
yellow line before each zebra crossing, stop lines, raised footpaths with kerbs on both sides, dirt verges,
coconut palms, mango, gulmohar, banana and jackfruit trees, flowers, tiled-roof houses, shops with
Malayalam and English signboards and electric poles. Roadside signs (speed limit, pedestrian crossing,
bus stop, and Malayalam direction boards) are placed from the road layout in `src/game/logic/roadside.ts`.
People only cross the road at the zebra crossings.

## Junctions, signals and the radar

Junctions are data. Open `src/game/data/junctions-v1.ts` and edit the list:

```ts
{ id: "j400", x: 400, arms: "both", signal: { offset: 0 } },
```

- `x` is where along the road the junction is. Change it to move the junction left or right.
- `arms` is `"left"`, `"right"` or `"both"`: which side the side road goes.
- `armLength` (default 200 m) is how far the side road runs before its turn-around circle.
- `signal` sets the light timings (`offset`, `mainGreen`, `crossGreen`, `yellow`, `allRed`, in
  seconds), or `false` for a junction without lights.

The side road, kerbs, zebra crossings, stop lines, signals, scenery clearance, radar and rules all
follow. A junction must be at least 90 m from a main-road place, 45 m from a zebra crossing and 150 m
from another junction, and 60 m inside the ends of the road; a bad one is skipped and the reason is
printed in the browser console. Places on a side road that is removed must be moved or removed too.

You can turn left or right into any side road, drive to its end, turn round in the circle and come
back. Crossing a stop line while that road's light is red costs Rs. 100, half a star and a red banner
(yellow is allowed; a light that has only just turned red gets a 0.4 s grace).

The round radar in the top-right corner shows the road turning around your vehicle, the side roads, each
signal in its current colour, every place, and the route to follow (blue to the pickup, green to the
drop). Press **Z** (or click the button) to zoom.

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
src/game/        3D scene (Vehicle, models, Road, Junctions, Places, Riders, CameraRig, Weather) + store
src/game/data/   vehicles, places, junctions, road
src/game/logic/  pure, unit-tested rules (requests, ride, roadgraph, dialogue, signals, rating, vehicle)
src/ui/          HUD, request board, conversation card, radar, pause menu, day summary, login card
src/lib/         localStorage profile
```

## Deploy

It is a standard Next.js app with no server dependencies, so it deploys as-is to Vercel:

1. Push the repo to GitHub.
2. Import it at vercel.com/new (framework is auto-detected).
3. Deploy. No environment variables are needed.

## Notes

- Desktop keyboard only; touch devices get a "best on desktop" screen.
- Place names and the Malayalam wording are invented. The vehicles are stylised models built from simple
  shapes, not official brand artwork.
- The voice uses the browser's speech synthesis: it speaks Malayalam only if the device has a Malayalam
  voice, otherwise it speaks the English line.
