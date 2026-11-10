# Round "portas": doors + closer outlines (one agent per deck)

The ship GPS (/mapa) draws a walking route on our redrawn deck plans. Users saw the route cut through
shop walls, because the plans had no doors. Now a room can have doors. Your job, for ONE deck:

1. **Doors**: for every named public venue that has walls on the real plan, mark where the real entrances are.
2. **Outlines**: where our outline clearly does not match the real plan's walls around those venues, fix it.

Work from inside `plantas/`. Only touch `specs/deck-N.json` through `./pl` commands. Never edit `tools/`,
`cache/`, `best/` by hand, `export/`, or anything outside `plantas/`. **Never run `./pl export` or `./pl rotas`**
(other agents work in parallel; the coordinator exports at the end). No git commands.

## Tools

- `./pl door-todo N`: named public rooms that still have no doors and no `aberto` flag. Your checklist.
- `./pl view N --best --mode side --y0 Y --y1 Y2 --scale 3`: writes a PNG (prints the path). Read it.
  Left = real plan, middle = ours (doors are drawn as thick ORANGE segments with a dot), right = overlay.
  Keep windows small (about 200-300 px of height) so you can see the walls. Coordinates are reference pixels (grid labels).
  `--mode ref` / `--mode ours` give a single panel.
- `./pl rooms N --y0 Y --y1 Y2`: room ids, categories, bounding boxes and names in that band.
- `./pl door-suggest N rID`: the gaps in the real plan's ink along the room's outline (door candidates, with centre and length).
  Long gaps are often an open shopfront; short gaps (8-20 px) are usually a door. It is only a hint: always look at the image.
- `./pl door N rID --add X,Y[,W] [X,Y,W ...]`: add door(s). The point must be ON the room's outline (it is snapped, max 15 px away).
  W = opening width in px (default 12). A single door is ~10-14 px; a double door ~16-22 px; an open shopfront = its real width.
- `./pl door N rID --rm K` (remove door number K), `--clear` (remove all), `--aberto` (open-plan venue with NO walls on the
  real plan: e.g. a bar in the middle of an atrium or open deck, a pool deck; you can walk in from any side), `--fechado` (undo aberto).
  Doors are saved straight into best/ too (they do not change the score).
- `./pl reshape N rID --poly "x1,y1 x2,y2 ..."`: new outline for a room, snapped to walls; cuts the area away from overlapping rooms.
  After every reshape run `./pl score N`. The score must not drop by more than ~0.3. If it says "not better than best" and the
  image is not clearly better, run `./pl revert N` (this throws away the spec changes since the last best, but doors are already in best).
  Doors are synced into best immediately, so a revert keeps them. Still, do
  outline work FIRST and doors AFTER, so a revert never fights with your doors. After a reshape that you keep, re-check that room's doors
  with `./pl view` (a door is re-snapped to the new outline when used).

## Lessons from the first wave (read!)

- **Never put a door on a corner.** A door at a corner opens two half-sides and the route squeezes through the corner.
  Put it in the MIDDLE of the side where the entrance is. For an open shopfront, ONE wide door centred on that side,
  with W = most of the side's length (e.g. a 106 px front -> `X_middle,Y,96`).
- `door-suggest` lists gaps per side. Display stands, counters and furniture in front of an open shop break the gap into pieces:
  that is still ONE open front. Small gaps between pieces of furniture are not doors.
- Always confirm with `./pl gps-view`: the pink door line must sit on the real opening, and the green room must touch blue corridor
  right through it.
- The score of a spec right after `./pl revert N` is the reference. Doors never change it.

## How to decide where a door is (real plan, left panel)

- A **gap in the wall line** between the venue and a corridor / the Galleria / a lobby.
- A **door-swing arc** (quarter circle) or a short line across a gap.
- A shop whose front has **no wall** (just display stands or a counter): one wide door covering that open front.
- A restaurant / theatre / lounge usually has 1-3 entrances facing the corridor or lobby, never into crew areas, kitchens (galley),
  cabins or the sea. A door must lead somewhere walkable (corridor, lobby, Galleria, open deck, another public venue).
- If the plan shows no wall at all around the venue: `--aberto`, no doors.
- If you really cannot see any entrance, put ONE door on the side facing the nearest corridor/lobby, at the middle of that side,
  and say so in your report.

Do not mark doors for corridors, stairs/lifts (`circulacao`), crew areas (`restrito`) or cabins.
Big open pool decks and sun decks (`piscina` "Deck aberto"/"Sun Deck") are `--aberto` unless the plan clearly walls them.

## Outline fixes (only clear problems)

While you are in a window, if a named venue's outline is clearly wrong against the real walls (more than ~10 px off on a whole side,
or it covers a neighbouring venue/corridor that the real plan separates, or two venues touch where the real plan has a corridor
between them), fix it with `reshape`. Do not redesign the whole deck. Do not rename venues or change texts.

## Corridors (check them too)

The route walks on corridors (`circulacao`), the Galleria and open decks. Check them with
`./pl gps-view N --y0 Y --y1 Y2` (PNG of the GPS walking grid painted over the REAL plan):
blue = corridor, green = inside a venue, cyan = water, ORANGE = thin wall the route may still cross (no door marked),
RED = walkable space that no lift can reach, black dots = lifts, magenta dots = where a route to a venue ends,
pink lines = your doors.

Look for, window by window:
- a real corridor on the plan that is NOT blue (it was swallowed by a venue, a crew area or a cabin block):
  carve it back with `./pl carve N <bigRoomId> --poly "..." --name "" --cat circulacao`, or `reshape` the room that swallowed it;
- a corridor that is broken (blue stops, then continues) where the real plan has no wall: reshape so it is continuous;
- blue where the real plan has crew areas / kitchens / walls (passengers cannot walk there): set that room to `restrito`
  (`./pl set N rID --cat restrito`) or reshape it;
- RED areas: a corridor or venue cut off from the lifts. Usually a missing door or a wrong room. Fix it.
- magenta dot of a venue outside the venue, or in the wrong place: its doors are probably wrong.
- lift/stair blocks must be `circulacao` (blue) and connected to the corridor.
Run `./pl score N` after corridor edits (same rule: keep only if the score does not drop more than ~0.3 and the image is better).

## Order

1. `./pl revert N` then `./pl door-todo N`. Some doors may already be marked by an earlier, interrupted agent: check them too (keep, fix or `--rm`).
2. Go through the deck from bow (y=0) to stern in windows of ~300 px: in each window first `./pl view` (outlines + doors),
   then `./pl gps-view` (corridors). Fix outlines/corridors first, then doors for the rooms of `door-todo` in that window,
   then `./pl gps-view` again to confirm the route can get in through the door.
3. At the end, `./pl door-todo N` should list nothing, or only rooms you explain.
4. Run `./pl score N` one last time and make sure the spec and best agree (`./pl score N` says NEW BEST or same as best;
   otherwise `./pl revert N`).

## Report (your final message, short)

- doors added per room (id, name, how many, aberto or not);
- outlines you reshaped (id, why), start and end score;
- corridor problems found and fixed (coordinates), and any left;
- rooms you were unsure about, with coordinates.
