# Aanawadi (ആനവണ്ടി)

A 3D browser game: drive a KSRTC-style bus along a fixed route, pick up and drop
off many passengers at every stop, and finish the day with Rs. 800 net.
Inspired by a one-passenger auto-rickshaw game; here the bus carries up to 40.

Built with Next.js (App Router), TypeScript, Tailwind, React Three Fiber and Zustand.
No backend: the driver profile and records live in `localStorage`.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # unit + integration tests (Vitest)
npm run build    # production build
```

Flow: `/` landing -> `/login` driver ticket -> `/play` the game
(`/play` redirects to `/login` when there is no saved profile).

## Controls

| Key | Action |
|-----|--------|
| W / S | Throttle · brake / reverse |
| A / D | Steer |
| Space | Hand brake |
| H | Horn |
| L | Headlights (also the button on the left) |
| E | Open / close door (stopped inside a stop zone) |
| C | Camera: chase · high · driver seat |
| R | Monsoon rain |
| M | Sound on/off (also the button on the right) |
| P / Esc | Pause menu |

## How a shift works

- You start the day Rs. 250 down (diesel + depot rent) and need to reach Rs. 800 net.
- The route has 7 stops, each with a yellow bus-length bay on both kerbs (traffic keeps left: forward
  trips use one kerb, return trips the other). Park the bus completely inside the bay, lined up with the
  road, until it turns green, then press **E**. Passengers walk to the door and board, and riders for
  that stop step off, one by one. Fares grow with the stops ridden.
- Each end of the line has a wide turn-around area: after the last stop, turn the bus round and pull
  into the other kerb's bay to pick up the return passengers.
- Steering follows a real turning circle (slow to turn the wheel, tighter at low speed), so brake
  before corners.
- Driving past a stop where someone wants to get off costs rating and refunds their fare.
- The day runs 06:00-20:00 on a clock compressed to 8 real minutes.

## Sound, lights and accidents

The bus has a synthesised diesel engine (idle, gear changes, load), tyre roar, a reversing beeper, a door
hiss and an air horn. The **Sound** button on the right (or **M**) mutes everything. The **Headlights**
button on the left (or **L**) turns on real beams.

Hit a pedestrian and they are thrown clear, fall, and cry out in a speech bubble ("അയ്യോ! Oh my God!",
"എന്റമ്മേ! Help me!"). It costs a Rs. 300 fine, slows the bus, and takes a full star off the rating.

## The road

A realistic Kerala road: asphalt with white edge lines, a dashed centre line that turns into a double
yellow line before each zebra crossing, stop lines, raised footpaths with kerbs on both sides, dirt verges,
coconut palms, tiled-roof houses, shops and electric poles. Roadside signs (speed limit, pedestrian crossing,
bus stop, and Malayalam direction boards) are placed from the road layout in `src/game/logic/roadside.ts`.
People only cross the road at the zebra crossings.

Each bus stop is a Kerala-style waiting shed with a name board in Malayalam and English (names live in
`src/game/data/route-v1.ts`). Passengers walk through the bus door and take a seat or standing place you can
see through the windows; the number inside always matches the seat counter.

## Tuning

All numbers live in `src/game/constants.ts` (capacity, rent, goal, day length,
boarding speed, patience, spawn rate). The route is data in
`src/game/data/route-v1.ts`; fares are in `src/game/logic/fares.ts`.
The app name shown in the UI is `APP_NAME` in the same constants file.

## Layout

```
src/app/         routes (landing, login, play)
src/game/        3D scene (Bus, Road, Stops, CameraRig, Weather) + store
src/game/logic/  pure, unit-tested rules (route, fares, boarding, rating, clock, vehicle)
src/ui/          HUD, pause menu, day summary, login card, stickers
src/lib/         localStorage profile
```

## Deploy

It is a standard Next.js app with no server dependencies, so it deploys as-is to Vercel:

1. Push the repo to GitHub.
2. Import it at vercel.com/new (framework is auto-detected).
3. Deploy. No environment variables are needed.

## Notes

- Desktop keyboard only; touch devices get a "best on desktop" screen.
- The route and stop names are invented. The bus uses an original livery and badge,
  not the official KSRTC logo.
