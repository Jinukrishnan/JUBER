# Annawadi — Design Spec

Date: 2026-10-30
Status: Draft for review

## 1. Summary

Anawandi is a browser-based 3D driving game. The player drives a KSRTC-style
bus along a fixed route between two termini, picking up and dropping off many
passengers at several stops, and tries to reach a daily earnings goal.

It is inspired by the concept of "Hey Auto" (a 3D auto-rickshaw game, one
passenger at a time). The key difference: a bus carries **many passengers at
once**, and runs a **fixed multi-stop route** instead of free-roaming fares.

Flow: landing page (sticker style) -> login (local driver profile) -> game.

### Intent and success criteria

- A playable full-3D bus game a visitor can open in a browser and finish a
  "day" in about 5-10 minutes.
- The bus mechanics are clearly different from the auto: multiple passengers,
  seat capacity, per-stop boarding/alighting, fixed route in both directions.
- A polished sticker-style landing page and a simple driver-profile login.
- Progress (best day, total earnings) persists across visits on the same browser.
- Deploys as a static/Next.js site with no backend.

### Out of scope (v1)

- Real accounts, server, database, leaderboard.
- Radio stations, voice chat with other drivers (may follow later).
- Multiple routes (route data is structured so more can be added later).
- Official KSRTC logo/branding (trademarked); we use an original "Annawadi"
  badge and a generic red/cream livery.
- Real KSRTC timetables/places; the first route is invented.

## 2. Stack

- Next.js (App Router), TypeScript, Tailwind CSS
- three.js via React Three Fiber (`@react-three/fiber`, `@react-three/drei`)
- Zustand for game state
- `localStorage` for the driver profile and records
- Vitest for unit tests of pure logic
- No external 3D model files: bus, road, buildings, stop shelters and people
  are procedural low-poly geometry generated in code.

## 3. Routes and screens

| Route    | Purpose |
|----------|---------|
| `/`      | Landing page |
| `/login` | Create/choose driver profile |
| `/play`  | The 3D game; redirects to `/login` if no profile |

### Landing page

- Warm paper background, large "Annawadi" title in Malayalam + English.
- Original SVG sticker illustrations (bus, tea glass, ticket, "KL" plate,
  chai-shop sign), slightly rotated, with hover nudge. CSS animation only.
- Primary button "Start the day"; short controls guide; "how it works" row.
- Responsive down to phone width.

### Login

- Ticket-style card: driver name input + avatar sticker picker.
- Saves profile to `localStorage`; returning visitors skip to their profile.
- Logout clears the profile. No password, nothing leaves the browser.
- Profile stores: name, avatar, best day net, total earnings, days played.

### Play screen

- Full-viewport R3F canvas with an HTML HUD overlay.
- HUD: today's net, goal, in-game clock, seats used / capacity, next stop name,
  route progress bar, current direction (A->B or B->A).
- Pause menu (Esc/P): controls, mute, restart day, quit to landing.
- End-of-day summary: earnings, passengers carried, rating, best day.

## 4. Game design

### Route

- One road with a start terminus, N intermediate stops (v1: 5), and an end
  terminus. Defined as data: stop id, name, position along the road (metres).
- The player runs A->B, then at the terminus the route reverses to B->A.
- Road is a long mostly-straight path with gentle curves (spline), roadside
  buildings, trees and palms, signboards; stops have shelters.

### Bus

- Procedural low-poly bus, red and cream livery, "Annawadi" badge.
- Arcade vehicle model (no physics engine): throttle/brake/reverse, steering
  with speed-dependent turn rate, hand brake, drag, simple collision/bounds
  with the road edge (slow down and bump rather than complex rigid body).
- Controls: W/S throttle & brake-reverse, A/D steer, Space hand brake,
  H horn, E open/close door, C camera, R rain toggle, P/Esc pause, M mute.
- Cameras: chase, high, driver-seat (cycle with C).

### Stops, boarding and alighting

- Each stop has a stop zone. The bus must be nearly stationary inside the zone
  and the door open (E) for transfers to happen.
- While the door is open, passengers alight (those whose destination is this
  stop) and board (those waiting here with a destination ahead in the current
  direction), one every ~0.4-0.8 s, until the door closes or no one is left
  or the bus is full.
- Waiting passengers are visible at the shelter; people on board are shown as
  a count (and optionally heads in windows).

### Passengers and fares

- Passenger: id, origin stop, destination stop, fare, patience.
- Fare is by stops travelled (or distance), paid on boarding or alighting
  (v1: paid on boarding, simple).
- Capacity: 40 seats/standing. Full bus: waiting passengers are skipped.
- Missing a requested stop (driving past without opening door) costs rating
  and that passenger leaves unhappy (no fare, or fare refunded if already paid).
- Passengers' patience drops while waiting; they leave if it hits zero.

### Money, goal and day

- At the start of the day the player owes diesel and depot rent (v1: Rs. 250
  upfront, shown as negative net), like the original's auto rent.
- Daily goal: Rs. 800 net (tunable constant).
- Day runs on an in-game clock (e.g. 06:00 -> 20:00 compressed to ~8 minutes of
  real time). The day ends at closing time or when the player ends the shift.
- Penalties: harsh braking/overspeed near stops (rating), hitting road edge.
- Rating (1-5 stars) derived from missed stops, patience, smooth driving.

### Atmosphere

- Day/night lighting tied to the in-game clock; monsoon rain toggle (particles
  + darker fog + wet road tint); horn and engine sounds (generated or free
  CC0 audio, mute-able).

## 5. Architecture

Pure game logic is kept separate from rendering so it can be unit-tested.

```
src/app/                 routes: page.tsx (landing), login/, play/
src/game/
  Bus.tsx                R3F bus mesh + vehicle controller hook
  Road.tsx               road, scenery, stop shelters
  Stops.tsx              stop zones, waiting passengers visuals
  CameraRig.tsx          chase / high / driver cameras
  Weather.tsx            rain, fog, day-night lighting
  GameCanvas.tsx         assembles the scene
  state/store.ts         Zustand store: money, clock, passengers, route progress
  logic/
    fares.ts             fare calculation
    boarding.ts          board/alight rules, capacity, direction
    route.ts             route progress, direction reversal, stop lookup
    rating.ts            rating from events
  data/route-v1.ts   v1 route definition (invented stops)
src/ui/
  Hud.tsx, PauseMenu.tsx, DaySummary.tsx
  stickers/              SVG sticker components
  LoginCard.tsx
src/lib/profile.ts       localStorage profile + records (guarded, versioned)
```

Data flow: input -> vehicle controller (per-frame, in R3F `useFrame`) ->
writes bus position/speed to store -> logic modules react to stop-zone events
and update passengers/money -> HUD reads from store.

## 6. Error handling and edge cases

- `localStorage` unavailable/corrupt: fall back to in-memory profile, never
  crash; profile data is versioned and validated on read.
- WebGL unsupported: show a friendly message on `/play` with a link back.
- Tab hidden: pause the game clock.
- Window resize and touch devices: v1 targets desktop keyboard; mobile shows
  the landing page fully and a "best on desktop" notice on `/play`.

## 7. Testing

- Vitest unit tests for `fares`, `boarding` (capacity, direction, destination
  rules), `route` (progress, reversal), `rating`, and `profile` (read/write,
  corrupt data, missing storage).
- Manual browser verification of the 3D scene: drive the route both ways,
  board/alight at stops, fill the bus, miss a stop, finish a day, reload and
  confirm records persisted.

## 8. Milestones (for the implementation plan)

1. Project scaffold, Tailwind, design tokens, routes.
2. Pure logic modules with tests (route, fares, boarding, rating, profile).
3. 3D scene: road, bus, vehicle controller, cameras.
4. Stops, passengers, boarding/alighting flow, money and day loop.
5. HUD, pause menu, day summary, weather and lighting.
6. Landing page stickers and login card.
7. Polish, manual verification, deploy notes.

## 9. Open assumptions

- Fictional route and town names for v1.
- Desktop keyboard play only in v1.
- Currency shown as Rs. with simple tunable constants (rent, goal, fares).
