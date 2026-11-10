# Audit deck 13, round 1, by worker (self-check, deck 13 round 2)

Verdict: PASS
Score at audit time: 99.98 (start of the round: 99.48)

Windows checked top to bottom at the final state with `./pl view 13 --mode side` and `--mode overlay`
(0–320, 430–630, 590–800, 600–1200, 1200–1800, 2050–2250, 2400–3000, 3060–3270, 3380–3508).
Deck 13 prints no venue names; it has cabins, stairs, lifts and corridors only.

## Majors found this round (all fixed)

| # | severity | where (x,y) | what is wrong | fix applied |
|---|----------|-------------|---------------|-------------|
| 1 | major | 339–375, 625–729 | `Escadas` duplicated (r35 + r39, same stair flight traced twice, slightly overlapping; name drawn twice) | merged r39 into r35; merged the mirror pair r38 into r34 as well (same defect, not flagged by the scorer) |
| 2 | major | 210–305, 2087–2182 | lift bank traced as r90 + 5 nested shaft rooms (r92–r96), all named `Elevadores`: 7 overlapping labels rendered on top of each other | merged r92–r96 into r90; bank now one room, label once, matching the two `Lift` texts of the plan (r91 keeps the second block) |
| 3 | major | 123–196, 472–532 | r23 + r24 both `Elevadores` at the same spot (nested rooms; name drawn twice) | merged r23 into r24 |
| 4 | major | 123–196 / 308–367, 536–611 | lower blocks are STAIRS (hatched treads on the plan) but were named `Elevadores`; r28 + r32 also rendered two overlapping labels | merged r32 into r28 and renamed r28, r33 to `Escadas` |
| 5 | major | 103–397, 39–142 | six MSC Yacht Club duplex suites 12005, 12003, 12001, 12004, 12006, 12008 are printed on the plan (rotated white text on the dark blocks at the bow) but were missing from `cabins`; cells were empty on our map | added the 6 cabins with `cabin-add` (12001 x201,y39,w49,h90; 12004 x250,y39,w48,h90; 12005 x103,y54,w47,h88; 12003 x150,y54,w47,h88; 12006 x301,y54,w48,h88; 12008 x349,y54,w48,h88); overlay confirms they sit on the printed blocks |
| 6 | minor→fixed | 101–397, 3487–3504 | seven unlabeled void slivers at the stern tip (below cabins 13265–13376) were categorized `cabines`; they are not cabins | reclassified r156–r162 to `restrito` |

## Checks that passed

- Lift/stair blocks: every lift/stair piece is `circulacao`, none is part of another room.
  The `Panoramic Lift` shaft strips at the hull sides (x5–20 / x481–496, y1830–2100) are inside r6 (`circulacao`), no venue swallows them.
- Cabins: stern row matches the plan exactly (13265…13273 odd, 13376…13386 even; the cell between 13386 and 13384 is really 13386 — an earlier doubt was a misread of the render, the spec is correct).
  Sequences on every column spot-checked against the plan. 67 numbers absent from the range are not printed on the plan.
- No jagged artifact bands; the only sliver rooms (r45, r50, r79, r87, r88, r122 — 2 px wide) are traced corridor strips on real walls and invisible at phone size.
- No magenta rooms; crew areas grey; no pools on this deck; `texto` n/a (no public rooms).

## Minors remaining (do not fail)

- Aft banks r141/r142 (124–199 / 301–375, 3085–3175) contain three lift shafts plus a small stair each; named `Elevadores` (dominant feature, consistent with the other banks).
- Service room at 123–196, 1738–1802 is traced as two pieces (r84, r86), both `restrito`.
- Bow tip strip r1/r2/r3 (y3–50) is the void strip above the suite front walls; drawn `restrito` (no label on the plan).

## Scorer problems noticed (for the coordinator)

1. Deck 13, bow (x103–397, y39–142): after adding cabins 12001–12008 the hint says
   "cabins outside the official range 13001–13402 (probably OCR mistakes, fix with ./pl cabin-fix)".
   These are NOT OCR mistakes: the deck-13 plan genuinely prints 12001/12003/12004/12005/12006/12008
   (MSC Yacht Club duplex suites carry the lower-deck number on the upper-deck plan). The `RANGES`
   table assumes one numeric prefix per deck; a worker following this hint would delete correct cabins.
   Suggestion: exempt numbers printed inside Yacht-Club-styled blocks, or allow a second range per deck
   (e.g. 12001–12099 on decks 12–14).
2. Deck 13, (123–162, 625–729): the duplicate check flagged r35+r39 but not the mirror pair r34+r38,
   although both render the name twice — r34/r38 interlock instead of overlapping, so an
   overlap/touch test misses them. A check on rendered label bounding-box collisions (same name,
   boxes nearer than ~20 px) would catch both cases.
3. Deck 13, (123,472) and (124,2087): nested rooms fully contained in another room (r23 in r24,
   r92–r96 in r90) escape both the duplicate check and the overlap penalty, because containment is
   neither `overlaps` nor `touches` — yet they render stacked duplicate labels.
   Suggestion: treat same-name containment as a duplicate.

---

# Audit deck 13, round 2, by independent auditor (Claude)

Verdict: FAIL
Score at audit time: 99.98 (board 99.98, `./pl score 13` before the audit; no edits were made)

Independent walk, top to bottom, with `./pl view 13 --best --mode side` in windows 0–600,
420–750 (2x), 520–740 (3x), 600–1200, 1200–1800, 1230–1360 (3x), 1800–2400, 2270–2420 (3x),
2400–3000, 3000–3508. Every cabin number compared against the real plan column by column.

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | major | 315–345, 3285–3300 | r6 (the big corridor room) carries the name `app` (OCR junk from the CruiseMapper watermark). It renders as grey text in the corridor beside cabin 13400's cell and is present in `export/deck-13.svg`. The real plan prints no such text. | clear r6's name (`./pl set 13 r6 --name ""`); labels/texto are n/a here, so the score should not drop |
| 2 | major | 200–299, 1251–1299 | r76 + r77 are both named `Escadas`, rendering the name twice ~20 px apart ("Escadas Escadas"). At 3x the real plan shows NO stair hatching there — small unlabeled service compartments (WC-style stall lines), not stairs. The name is invented and drawn twice. | clear both names; consider `restrito` for the two compartment pieces (they are small unlabeled enclosed rooms). Scorer duplicate check misses them because the pieces do not touch (4 px gap) |
| 3 | major | 124–198 and 303–374, 2279–2515 | Each aft stair tower is traced as three stacked rooms, all named `Escadas`: r104+r109+r114 (left) and r105+r108+r117 (right). The towers render "Escadas" three times each (labels at y≈2320, 2400, 2460; 6 stacked labels total) while the real plan draws two continuous unnamed hatched stairwells (identical x-columns, 5 px landing-line gaps). Name drawn multiple times; inconsistent with the bow tower r34 which is one room with one label. | merge each trio into one room (`merge 13 r104 r109 r114` and `merge 13 r105 r108 r117`), leaving one `Escadas` label per tower, mirroring the round-1 r35+r39 fix |

Verification of the round-1 self-audit's claims (all confirmed against the plan):

- Duplicate `Escadas` r35+r39 (and mirror r34+r38): resolution correct. At 3x the bow shows two
  separate hatched stair towers (x123–196 and x284–375, y625–729); after the merge each tower is one
  room with one label — matches the real plan. The lower bow blocks r28/r33 renamed `Escadas` are
  indeed hatched stairs on the plan (self-audit item 4 correct).
- Lift bank merge r92–r96 → r90: confirmed; the two mid-deck banks (r90 x124–305, r91 x323–374,
  y2087–2182) each print `Elevadores` once, matching the plan's two `Lift` texts (self-audit item 2).
- r23 merged into r24: confirmed, one `Elevadores` label per bow lift bank (item 3).
- Duplex suites 12001–12008 at the bow: present with correct cells over the printed dark blocks
  (item 5). The scorer's "cabins outside the official range 13001–13402" hint remains a false
  positive — the plan genuinely prints 12001/12003/12004/12005/12006/12008 on deck 13 (also seen in
  this audit); numbers verified in the spec at the printed positions. Coordinator already tracks this.
- Stern tip slivers r155–r162 `restrito`: confirmed grey and matching the tiny tip cells (item 6).

Other checks that passed:

- Cabin numbers: bow 13001/13004 + 13003–13062 sequences (13017 absent on the plan and in the spec),
  13063–13124, 13093–13150 (13117 absent), 13121–13192 (13125/H, 13174/H numbers correct),
  13139–13262, 13274–13340 (13217 absent), 13233–13402, stern row 13265–13273 odd /
  13386–13376 even — all in the right cells; 341 unique numbers, no duplicates.
- No magenta `?` rooms; crew areas grey (hull-side wedges r47/r48, r80–r83, r121–r133);
  no jagged artifact bands (1-px corridor slivers r45/r50 invisible); no hull voids.
- No public venues invented (cabin deck); the remaining names are all `Elevadores`/`Escadas` on
  lift/stair blocks except the three defects in the table above.

## Minors (do not fail)

- r141/r142 (124–199 / 301–375, 3085–3175) named `Elevadores` contain lift shafts plus small stair
  flights; naming follows the dominant feature, as the self-audit already noted.
- The plan's tiny "Lift" text at (≈188–203, 615–635) (between the bow towers) and the two bank texts
  at y≈2100 are not reproduced as names; ours uses `Elevadores`/`Escadas` consistently instead
  (labels n/a on this deck).
- Accessibility "H"/"B" and cabin-class icons (●/▲) on the plan are not drawn (style; labels n/a).

## Scorer problems noticed (for the coordinator)

1. Same as deck 12: junk room names (`app` on r6) cost nothing because `labels`/`texto` are n/a on
   cabin decks, yet they render and ship in the SVG. A name allowlist/warning for name-less decks
   would have caught both this and deck 12's `clift Gapp`.
2. The duplicate-name check misses same-name rooms with a gap between them: r104/r109/r114
   (5 px gaps) and r76/r77 (4 px gap) each render a name 2–3 times and pass. A check on rendered
   same-name label boxes nearer than ~25 px (already suggested in round 1) would catch all of them.
3. The known false positive `12001–12008 outside 13001–13402` re-confirmed; RANGES fix still pending.

---

# Audit deck 13, round 3, by independent auditor (Claude)

Verdict: PASS
Score at audit time: 99.97 (board 99.97, `./pl score 13` before the audit; no edits were made, best == spec after the documented 00:22 promotion)

Purpose: re-verify the three round-2 majors and audit the whole deck fresh. Walked top to bottom with
`./pl view 13 --best --mode side` in windows 0–600, 600–1200, 1200–1800, 1800–2400, 2400–3000,
3000–3508, plus zooms: 420–760 (2x, bow stairs/lifts/towers), 1150–1310 (3x, r70 + r76/r77), 
2250–2560 (2x) and 2380–2530 (3x side + 8x ours/ref/overlay, aft towers and the bridge band),
30–150 (3x, bow suites). Cabin numbers compared column by column in every window.

## Round-2 majors re-verified: ALL FIXED

1. `app` on r6 (315–345, 3285–3300): cleared. `./pl rooms 13` shows r6 with an empty name; the
   remaining 15 names are exactly 6x `Elevadores` + 9x `Escadas` on lift/stair blocks; the export
   contains only cabin-number texts. Nothing junk renders anywhere on the deck.
2. r76+r77 (200–299, 1251–1299): both names cleared and both reclassified `restrito`. At 3x the real
   plan shows small unlabeled service compartments there (WC-style comb/stall wall lines, no stair
   hatching); ours renders the same footprint grey with wall-exact outlines (the comb lines are our
   outline tracing the real stall walls), overlay-aligned. Correctly NOT stairs.
3. Aft stair towers r104 (124–198) and r105 (303–374), y2279–2515: each is now ONE room with ONE
   `Escadas` label (was 3 stacked rooms / 3 labels per tower). Merge quality inspected at 8x
   (ours/ref/overlay) and by reading the polygons in `best/deck-13.json`:
   - r104's only bridge artifacts are the 1–2 px jogs at (192,2432)→(194,2435)→(193,2437) and
     (195,2435)→(196,2433)→(198,2432) where the merge crossed the 5 px landing-line gap in the band
     y2432–2437. At 8x the dark outline sits ON the real wall stubs there (within ~1–2 px); no spur,
     no zig-zag band, nothing visible at phone size. The landing band interior (y2432–2458) still
     traces the real landing-line walls, so the merge did not mangle the tower.
   - r105 mirrors it cleanly (no bridge needed; union clean).
   - Nested strips r115 (135–189, 2437–2453) and r118 (310–364, 2437–2453) still render inside their
     towers, matching the real landing strips.
   - The −0.01 vs the old 99.98 is this documented promotion, not a defect.

## No regression on the other round-1/2 fixes

- Bow towers r34 (123,625,39,104) and r35 (339,625,36,104): one room, one `Escadas` label each; the
  two hatched stair towers on the plan match (2x zoom).
- r24 and r26 (bow lift lobbies): one `Elevadores` label each; r28/r33 renamed `Escadas` sit on real
  hatched stairs (2x zoom confirms hatching at 123–196 and 284–375, y536–611).
- Mid banks r90 (124,2087,181,95) and r91 (338,2087,36,95): one `Elevadores` label each, matching the
  plan's two `Lift` texts; no nested duplicates left.
- r70 (200,1192,99,48) `Escadas` retained and correct: at 3x the plan shows a genuine wide hatched
  stair there (horizontal tread lines), unlike r76/r77 below it.
- Duplex suites 12001/12003/12004/12005/12006/12008 at the bow: numbers sit on the printed dark
  blocks (3x zoom). The scorer hint "outside the official range 13001–13402" remains the KNOWN false
  positive — ignore it (third independent confirmation across audits).
- Stern tip slivers r156–r162 still `restrito`, grey, matching the tiny tip cells.
- Stern hull stairs r153/r154 `Escadas` on the real hatched side stairs (3–32 / 467–496, y3388–3474).

## Checks that passed (fresh walk)

- Cabins: every printed number is in the spec in the right cell — bow 13001/13004 + 13003–13062
  (13017 absent both), 13063–13124 (13093 column; 13117 absent), 13121–13192 (13125H, 13174H correct),
  13139–13262 (13217 absent), 13274–13340 (13217 absent), 13233–13402, stern row 13265–13273 odd /
  13386–13376 even; 341 unique numbers, no duplicates, no wrong cell found.
- Circulation: corridors (r6 net), all lift banks (r24/r26, r90/r91, r141/r142), all stairs
  (r28/r33/r34/r35, r70, r98/r100 blocks, r104/r105, r143–r150 details, r153/r154) are
  `circulacao`; nothing swallows a stair/lift block; the panoramic-lift shafts at the hull sides are
  inside r6 (`circulacao`), no venue over them.
- Small unlabeled hull rooms grey `restrito` (r1–r5 wedges, r8–r25 side slivers, r40–r43, r47/r48,
  r51–r68, r71–r74, r80–r86, r89, r97, r103, r111–r113, r121–r140, r156–r162); no magenta.
- No jagged artifact bands; the 1–2 px corridor slivers (r45/r50/r79/r87/r88/r122, r75, r99) trace
  real wall lines and are invisible at phone size; no cream voids inside the hull; bow tip strip
  r1–r3 matches the plan's void above the suite front walls.
- No invented or junk names: the only names on the deck are the 6x `Elevadores` / 9x `Escadas`
  listed above, each on a genuine lift/stair block, each rendered exactly once, no two same-name
  labels anywhere near each other.

## Minors (do not fail, unchanged)

- r141/r142 (124–199 / 301–375, 3085–3175) named `Elevadores` though each also contains a small
  stair flight; dominant-feature naming, consistent with the other banks.
- The plan's tiny `Lift` texts (bow y≈615–635, banks y≈2100, aft y≈3095) are not reproduced;
  ours prints pt-BR `Elevadores`/`Escadas` instead (labels n/a on this deck).
- Accessibility `H`/`B` marks and cabin-class icons on the plan are not drawn (style).

## Scorer problems noticed (for the coordinator)

1. Still open (rounds 1–2): junk names are invisible to the scorer on cabin decks (`labels`/`texto`
   n/a). The two junk names here were found by human review and fixed manually; the allowlist/warning
   for name-less decks would catch any recurrence automatically.
2. Still open: the `12001–12008 outside 13001–13402` hint. These are real MSC Yacht Club duplex
   suites printed on the deck-13 plan; a worker following the hint would `cabin-fix` correct cabins.
   Suggested twice already: allow a second range per deck in `RANGES` (e.g. 12001–12099 on 12–14).
3. Duplicate check: fine on this deck now (every label is far from any same-name label), but the
   touching/overlap-only test still misses gapped or nested same-name rooms if they ever return.
