# Audit deck 14, round 1, by Claude Code (independent auditor subagent)
Verdict: PASS
Score at audit time: 99.94 (spec == best, saved)

Method: PROMPT-ROUND2.md sections 2 and 5 applied to this cabin deck. Walked the whole
deck top to bottom in six windows (0–600, 600–1200, 1200–1800, 1800–2400, 2400–3000,
3000–3355) with `--mode side`, plus scale-3/4 zooms of the bow bridge (0–240), the bow
cabin grid (230–700), the waist (690–1010), the mid-aft stair/lift block (1700–2120 and
2040–2440) and the stern (3150–3355). Cross-checked the 264 spec cabin cells against
`cache/deck-14/cabins.json` numerically (IoU 1.00 on all 264) and the exported SVG text.

Checks and results:
- Cabins: all 264 numbers printed on the real plan are in the spec and in the right cell
  (14001–14288 minus 24 numbers). Verified cell by cell in the zooms: bow odd/even columns
  (14001–14029), mid specials 14004/14005/14009/14011/14013, waist blocks 14031–14058,
  H-cabins 14045/14047/14034/14036/14090, 14144 H, mid columns 14109–14154 and
  14178–14216, aft rows 14218–14245, stern row 14235–14288 (incl. 14245, 14288).
  The 24 absent numbers (14017, 14117, 14217, 14247–14287 odd) are genuinely not printed
  on the real plan — correctly not invented.
- Navigation Bridge: r133 `restrito` (grey) at the bow; outline follows the curved front
  and both wings; wing consoles r3/r4 drawn. Officers' areas r5–r35 etc. grey (`restrito`),
  walls match the overlay. No magenta, no misclassification.
- Stairs/lifts: all `circulacao` — Escadas r18/r50/r51/r52/r53/r80/r82/r111/r112/r120/r121,
  Elevadores r38/r56/r57/r58/r59/r62/r72/r75/r108/r109, Panoramic Lift r135/r137.
  No stair/lift block swallowed by a cabin or a crew room.
- Artifacts: no jagged bands or slivers in any window; hull-edge grey slivers (r8, r22,
  r30…, r11, r33…) match the real plan's grey edge shading; mid-line shafts r69/r74 follow
  the real walls.
- Names: only Navigation Bridge, Escadas, Elevadores, Panoramic Lift. Export SVG contains
  only "Navigation Bridge" + cabin numbers. No invented venues, no junk OCR fragments
  ("dde"/"clift Gapp"/"app" do not appear).
- Coverage: no cream voids inside the hull that the real plan draws as cabins/rooms
  (corridor network r2 covers the full strip; stern corridor r103 present).
- texto: r133 "Ponte de comando, de onde o comandante pilota o navio. Área restrita,
  fechada para hóspedes." — correct pt-BR, accented, factual, 89 chars. Other rooms have
  no texto (circulacao/restrito), texto n/a in the scorer.

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | minor | 252,1880 | r74 (8261 px²) and r69 (258,1386, 27473 px²): unnamed mid-line shafts drawn grey `restrito`; the real plan leaves them white/unnamed closed regions | Acceptable judgment call (crew shafts on a cabin deck); only change if the human reviewer says they are passenger spaces |
| 2 | minor | 275,2010 | r77/r78 thin grey strips (~2000 px² total) inside the aft lift-lobby block where the real plan shows white shaft/corridor | Could be reclassed `circulacao`; invisible at phone size, not worth churn |
| 3 | minor | whole deck | Ours drops the real plan's cabin colour coding (green/pink/orange) and "H" accessible markers; all cabins drawn uniform cream | Consistent project style on all cabin decks; keep, or decide once for all decks |

Scorer problems noticed (for the coordinator): none blocking. Two observations:
(1) Room bboxes of r2/r72/r73/r81/r94 geometrically contain cabin cells because those
rooms are thin wall-strip polygons (tiny area vs bbox) — the scorer's cover/cabin checks
rightly pass on polygon area, but anyone debugging with bbox intersection will see false
overlaps. (2) `edges` = 0.994 with no hint naming where the worst edge deviation is; a
hint line pointing at the worst-matching edge region would help workers. The cabin hint
("24 numbers not present") is informational only — all 24 are genuinely absent on the real
plan, so no scorer change is needed.

---

# Audit deck 14, round 2, by Claude Code (GLM, independent auditor subagent)
Verdict: PASS
Score at audit time: 99.92 (spec == best == saved; duplicate-cabin hint from SCORER_CHANGES.md
change 2 is gone — `./pl score 14` hints show only the informational 24-absent-numbers line)

Scope: verify the two shared-poly fixes (14097/14101, 14102/14106) found by the scorer after
round 1, then a fresh full sweep of the whole deck — independent of round 1, numeric + visual.

Fix verification (both confirmed correct):
- 14097/14101 (x188–250): spec now has two half-cells y1603–1630 and y1633–1660 (~27px each),
  split exactly at the real wall row y1631–1632 (checked at scale 4 against the real plan, where
  the wall row between the "14097" and "H 14101" cells sits at y≈1631). Matches siblings
  14099/14103 (x80–152, same y rows, IoU 1.00 vs their cache cells).
- 14102/14106 (x350–411): two half-cells y1662–1689 and y1692–1719, split at the real wall row
  y1690–1691 (wall row confirmed in the scale-4 ref zoom). Matches siblings 14104/14108
  (x447–518, same y rows).
- Each number prints once in its own cell: export/deck-14.svg carries 264 cabin-number text
  elements, all unique, set == spec set == cache set (no missing, no extra); no name or number
  appears twice anywhere in the SVG.

Independent numeric sweep (all 264 cabins, shapely, read-only):
- Spec-vs-cache IoU: 1.00 on 260 cabins; the only four below 1.00 are 14097/14101/14102/14106
  (0.474) — by design, because their cache cells are the double-height OCR cells and the spec now
  holds the correct halves (each exactly half the old cell). Round-1's IoU-1.00 claim could not
  have held for these four against the old cache — consistent with the two pairs being missed.
- Shared-poly class (the one round 1 missed): ZERO pairs of spec cabins share ANY area
  (checked pairwise, all 34,716 pairs; not even a 1px² touch, let alone >50% of the smaller).
- No oversize/leaked cells: max spec/cache area ratio = 1.00 (no cabin over 1.6x).
- Every OCR label point (cache cx,cy) lies inside its own spec poly (264/264).
- The split cells respect the wall rows (3px gap to their sibling = the wall line; 14102 sits 2px
  off 14098's wall line, same as its column pattern). No cabin poly crosses a divider or
  overhangs a column wall.
- Cabin-vs-room polygon overlap >30px²: only r2 (the corridor mesh), 78 cells, see scorer notes.

Visual sweep (windows 0–240 x3, 0–600, 580–730 x4, 600–1200, 1200–1800, 1500–1800 x3,
1590–1730 x4 ref+ours, 1730–1870 x4, 1800–2400, 2400–3000, 2420–2520 x4, 2900–3140 x4,
3000–3355 — full deck 0–3355 covered, dense areas zoomed):
- Bow: Navigation Bridge r133 `restrito` grey, curved front and both wings follow the hull in the
  overlay; wing consoles r3/r4 drawn; the only printed label 'BRIDGE' is matched.
- Stairs/lifts, incl. panoramic lifts: all `circulacao` (Escadas r18/r50/r51/r52/r53/r80/r82/
  r111/r112/r120/r121; Elevadores r38/r56/r57/r58/r59/r62/r72/r75/r108/r109; Panoramic Lift
  r135/r137). Zooms of the 600–700 twin lift blocks and the 2900–3070 stern lift/stair cluster
  show shafts and hatching inside circulacao rooms, none swallowed by a cabin or venue.
  Semantics 1.00 with no lift hints.
- Small unlabelled hull rooms (edge slivers r8/r11/r22/r30…, notch rooms r100/r101, stern r119,
  r122–r128) all grey `restrito`; no magenta anywhere in any window.
- No jagged artifact bands or slivers (the round-2 sliver check is silent on this deck too).
- No junk or invented names: room names are only Navigation Bridge / Escadas / Elevadores /
  Panoramic Lift; export SVG text is those + 264 numbers (junk-name hint did not fire).
- No uncovered voids: cover 1.00; every cream region inside the hull corresponds to real
  corridor/shaft white space on the plan.
- Absent numbers re-checked: 14017, 14117 (column really jumps 14115 -> 14121 on the real plan),
  14217, 14247–14287 odd — none printed on the real plan, none invented in the spec.
- texto: r133 unchanged, correct pt-BR with accents, factual (89 chars).

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | minor | whole deck | Ours still drops the real plan's cabin colour coding (green/pink/orange) and the "H"/"B" accessible markers (14090, 14101, 14144, 14239–14243…); all cabins uniform cream | Carried from round 1: project style decision for all cabin decks, not a deck-14 fix |
| 2 | minor | 258,1386 / 252,1880 | r69 (27,473px²) and r74 (8,261px²) mid-line shafts drawn grey `restrito` where the real plan shows white/unnamed closed space | Carried from round 1: acceptable judgment call; only change if the human reviewer disagrees |
| 3 | minor | 275,2010 / 254,2109 | r77/r78/r81 thin grey strips inside the aft lift-lobby block where the plan shows white shaft/corridor | Carried from round 1: invisible at phone size, not worth churn |

Scorer problems noticed (for the coordinator): none blocking. Two observations:
(1) 78 cabin cells lie fully inside r2's stored polygon (corridor mesh, 716k px², exterior ring
only — the spec format stores no holes), overlaps of 1,700–2,700px² each. Invisible in the render
(cabins are drawn on top of rooms) and no current check reads it, but if a future change adds a
room-vs-cabin overlap penalty it must exclude r2-class meshes or it will false-flag 78 cells at
once. (2) The four split cabins now score IoU 0.474 against their double-height cache cells by
design — if anyone ever "fixes" cabin-vs-cache IoU into a penalty, it would push workers to
re-merge exactly the pairs the duplicate check (SCORER_CHANGES.md change 2) just caught. The
duplicate check is the right guard for this deck; keep it.
