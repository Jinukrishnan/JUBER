# Aanawadi — The town: roadmap

Date: 2026-10-31
Status: Agreed in conversation; Stages A and B have a detailed spec, the others get theirs when they start.

## Why

The ride game works on one long road with dead-end side roads. The owner wants a real town: a **loop** the
driver can circle, signals that say which **turns** are allowed, a **varied town** instead of identical
houses, **traffic police**, and a **new UI**. A bug where grass shows up in the middle of the road must go.

Decisions made with the owner:

- Map: **ring road plus two cross roads** (about 800 m x 500 m ring), signal at every junction, each signal
  with defined turns (left, straight, right).
- Police: **officers at junctions that fine you** (a patrol jeep drives the loop). Other traffic is not part
  of this round.
- UI: **ride-app style** (dark navy and green, rounded cards, bottom sheet for the ride).
- Order: A, B, C, D, E.

## Stages

| Stage | What | Notes |
|---|---|---|
| A | Grass in the road | Find and remove every place plants can stand on tarmac; a test that proves none do. |
| B | Loop map | New road network model (roads, junctions, turn rules); roads, junctions, signals, places, routing, radar, scenery placement all move onto it. Largest stage. |
| C | The town | Building catalogue (shop rows, two- and three-storey houses, apartment blocks, temple, church, mosque, school, hospital, petrol pump, market, tea shops, bank) laid out by district: dense centre, thinning to paddies. |
| D | Police and traffic rules | Khaki officers at signals, a patrol jeep, siren and whistle; fines for red light, speeding past the 40 sign, a turn that is not allowed, stopping on a zebra crossing, wrong way; a pop-up giving the reason. |
| E | New UI | Ride-app style across login, HUD, request board, conversation card, radar, pause menu and day summary. |
| F (later) | Other traffic | Cars, buses, bikes and autos on the loop obeying the signals. Not in this round. |

Each stage: spec, plan, native inline build with tests first, review, fix pass, README.

## Order of work

0. Fix the Important findings from the ride-hailing review (before building on it).
1. Stage A, then Stage B (spec below).
2. Stages C, D, E each get a short design conversation first, because their details depend on what B
   produces (building lots, junction positions, the screen layout).
