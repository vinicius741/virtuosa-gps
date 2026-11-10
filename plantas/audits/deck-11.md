# Audit deck 11, round 1, by Claude Code (glm-5.3-flash), independent auditor

Verdict: FAIL
Score at audit time: 99.98 (best = current spec)

Walked top to bottom with the best version in windows 0–600, 600–1200, 1200–1800, 1800–2400,
2400–3000, 3000–3538 (`--mode side`), plus targeted zooms (bow, 11272, pan lifts, aft stairs,
sliver rooms, stern) and a phone-width render (380 px) of the pan-lift spot. Deck has 142 rooms
(74 circulacao + 66 restrito + r9), 362 cabins, one named room — see row 1.

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | major | renders at ≈300,1960 (room r9 covers nearly the whole deck) | r9 (the big `circulacao` area) carries the invented name "dde" — an OCR fragment of the www.cruisemapper.com watermark. The real plan prints no name there. The PNG preview renders "dde" in the middle of the deck and the name ships in export/deck-11.svg as `data-nome="dde"` (SVG text is skipped for circulacao, but the data is exposed to the site) | clear the name (`name: ""`). Note the same garbage exists fleet-wide: 'eMa' (decks 8, 9), 'clift Gapp' (deck 12), 'app' (deck 13) |
| 2 | major | 94–123, 1836–1871 | Left `Panoramic Lift`: r9's outline degenerates into a ~26x35 px spiky zigzag blob that sticks ~15 px past the lobby's right wall into the corridor; the plan draws a clean lobby rectangle (x8–105, y1836–1872) with only a small shaft glyph (≈98–105, 1838–1845) inside. Confirmed visible at phone width (380 px render: a spiky scribble beside the lobby). The right lobby has smaller notches of the same kind (388–459, 1836–1870) | reshape both pan lift lobbies as clean rectangles (own `circulacao` rooms like deck 14's "Panoramic Lift", or straight r9 edges) |
| 3 | minor | 131–194 and 302–370, 2278–2282 (also 2320–2345) | Aft stair blocks drawn with small (~4 px) square teeth where the plan hatches treads; not readable as an artifact at phone size | snap the teeth flat (optional) |
| 4 | minor | r54 (201–261, 880–1317), r66 (297–374, 1335–2100), r75 (124–278, 1840–2117) | Degenerate near-zero-area polygons (216–692 px² of fill inside huge bounding boxes) that render as stray thin lines along the block walls. Visually harmless (they sit on real walls) but fragile garbage geometry | fold into the adjacent room outlines (low priority) |
| 5 | minor | 35–465, 3505–3535 | Stern crew strip drawn as 11 separate grey boxes with small white gaps; the plan draws one continuous strip with dividers | merge into one `restrito` strip or close the gaps |
| 6 | minor | y≈200–330, y≈690–800, y≈2290–2400 | Stair treads are not drawn (plan hatches them); stairs/lifts are correctly white `circulacao`, consistent with decks 8–12 | style choice, no action needed |

Checks that passed:
- Cabins: all 361 reference numbers found in the right cells at 100%; our extra cabin 11272 is real —
  the plan prints it directly below 11268 (the ref OCR lost it under the pink-tinted cell), zoom-verified.
  Sequences checked by cell on every window.
- Lifts/stairs: every lift lobby and stair core is `circulacao`; the "Lift" texts at (248,739) and
  (2168–2190) sit inside circulation; no stair/lift block swallowed by another room.
- No magenta `?` rooms; crew areas grey (hull-edge cells, wedges r4/r5, stern strip); no cream voids
  inside the hull (cover 1.000); bow-tip strip r1–r3 correctly white (the plan fills it white there).

Scorer problems noticed (for the coordinator):
1. Cabin decks have an EMPTY reference label list, so room names are never checked — that is how
   "dde" survived with semantics=1.000. Suggestion: on decks with no ref labels, warn when a room name
   is not in a small whitelist (Escadas, Elevadores, Panoramic Lift, Área da tripulação, ...) or fails
   a real-word/dictionary check; watermark OCR fragments ('dde', 'eMa', 'clift Gapp', 'app') would all trip it.
2. The ref cabins.json misses real cabins under the watermark band (deck 11: 11272; deck 10: 10372).
   Both are in our specs and correct. See deck-10 report for the suggested overlap-based fallback.
3. Zero-area degenerate polys (r54/r66/r75) pass every check; a cheap polygon-hygiene check would
   surface them (same note as deck 10).
4. The "cabins: 362 in the spec; numbers between 11001 and 11440 not present: 78" info line is fine,
   but note the tail 11306–11440 odd numbers are genuinely not printed (stern block is even-numbered
   there); no action needed, just context so nobody "fixes" it.

---

# Audit deck 11, round 2, by Claude Code (glm-5.3-flash), independent auditor

Verdict: PASS
Score at audit time: 99.97 (best = current spec; the −0.01 vs 99.98 is the documented promotion that
dropped the zero-area sliver rooms r54/r66/r75 — not a defect)

Walked top to bottom with the best version in windows 0–600, 600–1200, 1200–1800, 1800–2400,
2400–3000, 3000–3538 (`--mode side`), plus 4–6x zooms of both Panoramic Lift lobbies, cabin 11272,
the mid-deck stairwell (y1200–1400) and the aft stairs, and the `./pl rooms 11` / spec dump to
confirm nothing junk remains. Re-verified both round-1 majors fixed; audited the whole deck fresh.

Round-1 majors re-verified:
- Major 1 (junk name "dde"): FIXED. `./pl rooms 11` and the spec show exactly two non-empty names —
  "Panoramic Lift" on r145 and r146; r9's name is empty and nothing junk renders in any window.
- Major 2 (Panoramic Lift lobbies): FIXED. Port r145 (6–133 × 1838–1873) and starboard r146
  (390–493 × 1838–1873) are clean rectangles, each name printed once, no spiky blob, no notches on
  r9's edges. The worker's claim checks out: at 6x, the corridor wall at x133 runs continuously above
  and below the lobby row and no wall closes the lobby at x≈105 — the lobby opens straight into the
  vertical corridor there, so covering to x133 is right (the strip x133–200 is r9 corridor, also
  white `circulacao`, so the seam is invisible). Overlay shows both rectangles sitting on the real
  lobby walls.

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | minor | 131–194 and 302–370, 2278–2345 | Aft stair blocks keep ~4 px tread teeth on the outlines (unchanged from round 1); invisible at phone width | snap flat (optional) |
| 2 | minor | 35–465, 3505–3535 | Stern crew strip still drawn as 11 separate grey boxes (r134–r144) with small white gaps; the plan draws one continuous strip with dividers | merge into one `restrito` strip or close the gaps |
| 3 | minor | mid-deck stairs (r63 at 195–260, 1210–1320; r45/r46 at y600–660) | Stair tread hatching not drawn; stairs render as plain white boxes — fleet style choice, consistent with deck 10 | none needed |

Checks that passed:
- Cabins: sequences re-checked by cell in every window (odd/even sides, +2 steps, skipped 11017,
  11117, 11350 tail, 11352–11440 block genuinely even/odd as printed); all match the plan. 11272 is
  genuinely printed below 11268 (zoom-verified at 4x, overlay-aligned) and correctly in the spec.
  H-cabins 11051, 11062, 11089, 11091, 11124, 11126, 11220, 11170 all printed.
- Lifts/stairs: every lift bank and stair core is `circulacao`; the "Lift" texts at (248,755) and
  (2136–2237) sit inside circulation rooms (r47–r53, r79–r83); nothing swallowed.
- No magenta `?` rooms (cats only circulacao/restrito); no junk names; no invented venues; cover
  1.000 — no uncovered voids inside the hull (checked on every window's overlay).
- r54/r66/r75 slivers are gone; the walls they traced now render cleanly from the adjacent rooms.
- Port (127 px) vs starboard (103 px) lobby widths are asymmetric in our spec, but the overlay shows
  each rectangle on its real wall (the port side is wider because of the stair block behind it) —
  not a defect.

Scorer problems noticed (for the coordinator):
1. Still open from round 1: cabin decks have an empty ref label list, so room names are never
   checked — that is how "dde" survived round 1 at semantics=1.000. A whitelist/dictionary warning on
   decks with no ref labels would catch watermark fragments ('dde', 'eMa', 'clift Gapp', 'app').
2. Still open: ref cabins.json misses real 11272 (deck 11) and 10372 (deck 10); an info hint would
   stop a worker from "fixing" them away.
3. The tail info line (11306–11440 not present) is correct as-is: those numbers are genuinely not
   printed; just context so nobody "fixes" it.
4. Bow-tip strip treatment is white here (correct per plan) but grey on deck 10 — one coordinator
   call should align the two decks.
