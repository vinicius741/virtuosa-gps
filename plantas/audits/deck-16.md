# Audit deck 16, round 1, by claude-code-glm (independent auditor, did not edit the deck)
Verdict: FAIL
Score at audit time: 98.11

Protocol followed: `./pl board`, `./pl score 16`, `./pl rooms 16 --min-area 0`, `./pl labels 16`,
then `./pl view 16 --best --mode side` in windows 0-600, 600-1200, 1200-1800, 1800-2400,
2400-3000, 3000-3518, with zoomed crops of the overlay for every finding below.
Wall positions were double-checked with a pixel scan of the real panel (long dark runs).

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | major | 325,2450 | MSC Gym (r83) swallows an **enclosed stair block**: real walls at x~303 and x~348 from y~2400 down to the gym's south wall (y2499), with step hatching between them (pixel-verified). This is the southern half of the Virtual Games Arcade strip (x292-348, y2400-2498), drawn green as gym floor. Inconsistent: the same worker carved the two labelled lift lobbies (r171/r172) and the two gym stairs (r173/r174), but not this one. | Carve the block along its walls as `circulacao` ("Escadas"), or extend r161 (arcade) down to the wall at y2498 and carve the stair out of it |
| 2 | major | 300,3010 | Horizon Amphitheatre (r167) north edge sits at y2990, but the real north wall of the venue (stage block) is at **y3036** (long continuous wall, pixel-verified). ~46 px of the aft stair-lobby strip (wall structures at x~251-388, y3000-3036) is drawn as amphitheatre. The other three sides are fine: real west wall x84-85 vs ours 87; real east wall x512 vs ours 513; real south wall y3363 vs ours 3360. | reshape r167's north edge down to y3036; keep the other three edges |
| 3 | major | 100,80 | Top Sail Lounge (r148) covers only x120-481, but the real lounge is the whole open bow: the curved sofa groups run from x~76 to x~534 with no walls between wings and centre. Both side wings (~70 px each) are drawn as `circulacao` (r2/r3/r4), so ~1/3 of the venue's floor (with its seating) reads as circulation. | reshape r148 to follow the bow seating curve out to x~76 / x~534; r2/r3 stay as the thin window-rim strips they already are |
| 4 | minor | 180,940 | r152 Solarium covers the two open staircases on the deck floor (x172-198 / y934-952 and x387-426 / y931-949, hatched on the real plan) — open-deck stairs, consistent with the no-furniture style, but they are swallowed by a `piscina` deck | acceptable; if polishing, carve thin `circulacao` slivers |
| 5 | minor | 40,910 | The two round whirlpool pods at the solarium's sides are correctly carved out of r152, but drawn blank (no water, no room). r152's own texto says "com hidromassagens nos dois lados". | draw each tub as a small dark-blue `piscina` room ("Hidromassagem") inside the pod |
| 6 | minor | 350,1755 | r156 "Deck de sol" bottom edge (y1748) slices through the two hatched stair trapezoids at y1743-1768 (x155-290 and x332-464); their lower halves land in r80 (cream) | end r156 at the wall above the stairs, or continue it to the wall below them (~y1770) |
| 7 | minor | 545,2300 | r160 (right Power Walking Track) right edge at x570 runs ~10-16 px past the hull rim line in the lower half (y2250-2370); the real track tapers with the hull. Left track (r158) matches well. | taper the strip, or pull the right edge to the hull line below y~2230 |
| 8 | minor | 180,2550 | r122 (unnamed `circulacao`, x99-263 / y2499-2596) carries the Sportplex court texto (never displayed, since the room has no name) and hides the real internal wall at y2549 (a small enclosed room x147-264 / y2549-2596) | drop the texto or name the room; optionally split at y2549 |
| 9 | minor | 370,2790 | Sports Bar (r166) drawn as a clean rectangle over its real outer walls (real x298 / y2727 / x450 / y2906 vs ours x295 / y2737 / x449 / y2906 — all within ~10 px), but its internal partitions (x~344, x~397, y~2816) are not represented; the strip east of x397 may be a corridor | acceptable open-plan simplification; could split off the x397-450 strip |
| 10 | minor | 300,90 | Names add qualifiers not printed on the plan: "Top Sail Lounge (Yacht Club)", "Concierge (Yacht Club)" (plan prints "Concierge Area") | venue is correctly identified; harmless, keep or drop |
| 11 | minor | 322,2293 | "Virtual Games Arcade" is written horizontally and overflows its 59 px-wide room onto r174's border; the real label is vertical | write it vertically like the plan |

Checks that passed:
- All 12 printed labels on the real plan are matched once, by a room in the right place with a sensible category (Lounge->restrito, Concierge->restrito, MSC Yacht Club->restrito, Solarium->piscina, Gym/Power Walking/Virtual Games/Sportplex/Formula Racer/Hologate/XD/Bowling->esporte, Sports Bar->bar, Amphitheatre->show, Horizon Pool->piscina). No name drawn twice.
- Lifts: all three printed "Lift" lobbies are inside `circulacao` (r53 "Elevadores" at the aft lift lobby y587-692, r171 + r172 in the gym), and the two gym staircases are r173/r174 "Escadas". Nothing swallowed except finding #1.
- Cabins: all 22 numbers (16001-16016, 16018-16020, 16022, 16024, 16026; 16017/16021/16023/16025 do not exist on the plan) are drawn in the right cells, checked cell by cell in the middle panel.
- Pools/water: Horizon Pool is dark blue inside the light-blue deck; solarium and deck areas light blue; no magenta rooms; no jagged artifact bands; the thin rim slivers (r1, r4, r146 188x7) render as invisible cream rim strips, not artifacts.
- No crew areas on this deck (restrito beige is the MSC Yacht Club private area, matching the plan).
- Textos: all 19 are 25-260 chars, proper pt-BR with accents, factual, no invented prices or times. The "uma volta tem cerca de 330 metros" lap claim is not invented by the deck worker — it is the site's own copy (`../src/data/navio.ts:200`) — but it cannot be verified from the plan; the human may want to confirm it.

Scorer problems noticed (for the coordinator):
1. The corridor/"thin" heuristic flags r151 (the unnamed MSC Yacht Club `restrito` envelope, 407x569) as a corridor, and that is the single lost semantics point (0.9667 = 29/30). False positive: r151 is the YC private interior envelope; `restrito` fits it, and visually it is correct. Suggest exempting unnamed `restrito` rooms that fully contain named rooms (r149/r150/r16/r31...) from the thin check, or accepting `restrito` in the hint text.
2. The edges percentage conflates two different things. r166 (32%), r164 (41%), r156 (42%), r168 (50%) have outer envelopes that match the real walls within ~10 px (pixel-verified for r166 and r164): their low scores come from internal partition walls not being drawn. Meanwhile r167's real defect (46 px off on the north side) shows up as the same kind of "50%" as the harmless ones. A check of the outline against the venue's outer closed region only (ignoring interior partitions) would point workers at the real problems — the "spill check" idea in PROMPT-ROUND2 section 6 goes in the same direction.
3. Nothing catches a venue drawn smaller than its real extent (r148's wings, finding #3) or stair hatching inside a venue when the plan prints no "Lift" text there (r83's south stair, finding #1). The second is already on the section 6 idea list ("Stairs: stair hatching inside a public venue means it swallowed a staircase") — this deck is the concrete test case.

# Audit deck 16, round 2, by claude-code-glm (independent auditor, did not edit the deck)
Verdict: PASS
Score at audit time: 98.34

Protocol followed: `./pl board`, `./pl score 16` (hints only), `./pl rooms 16 --min-area 0`,
`./pl labels 16`, then `./pl view 16 --best --mode side` in windows 0-600, 600-1200, 1200-1800,
1800-2400, 2400-3000, 3000-3518, with zoomed crops of real / ours / overlay for every region
checked below (bow, lift lobby + r169 band, solarium pods, gym front wall, tracks, stair block,
r122/r178 split, arcade label, XD/Hologate labels, amphitheatre, pool, stern side structures).
The best spec's polys and textos were read to confirm coordinates and text claims.

## Re-verification of round-1 majors (all fixed)

1. **FIXED** (was: gym r83 swallows the enclosed stair block at ~x303-348 / y2400-2498).
   The block is now carved as `r175` "Escadas" `circulacao` (x304-349, y2403-2499). The overlay shows
   the white box on the real walls, with the step hatching inside it and gym green on both sides.
   r83's south wall now ends at y2499 on the real wall.
2. **FIXED** (was: r167 north edge at y2990). r167 now spans y3036-3360 (bbox 87,3036,426,324).
   Overlay: our north edge runs on the real stage wall (y3036-3038, x87-513) for the full width;
   the aft stair-lobby strip (x251-388, y3000-3036) is now cream `circulacao` (r5), not amphitheatre.
   East/west/south edges unchanged and still on the real walls (x87 / x513 / y3360).
3. **FIXED** (was: r148 covers only x120-481). r148's poly now runs x75-537, y38-161 and follows the
   bow seating curve; the overlay shows the dark boundary hugging the curved walls out to both
   side rims, with r2/r3/r4 as the thin window-rim strips. The label sits inside, written once.

## Re-verification of round-1 minors claimed fixed

- Solarium whirlpool pods: **fixed**. r176/r177 "Hidromassagem" (`piscina`) are drawn as dark-blue
  water in the two round pods at (~22,891) and (~541,891), matching r152's texto.
- r156 bottom edge: **fixed**. The blue now ends at the wall at y~1765; both stair trapezoids
  (y1743-1768) sit entirely inside cream r80/r170, no longer sliced.
- Walking-track strips: **fixed**. r160's outer edge now tapers with the hull rim in the lower half
  (y2250-2370) instead of running straight past it; r158 matched before. The strips do not overlap
  each other or the gym (inner edges on the gym walls at x~97 / x~500).
- r122/r178: **fixed**. Split on the real internal wall (our boundary at y~2545-2548, x150-263);
  both rooms unnamed `circulacao` and neither carries the Sportplex texto any more.

## New findings (all minor)

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | minor | 322,2295 | r161 "Virtual Games Arcade" label is still horizontal and ~18 px wider than its 59 px strip: the tail lands on r174's Escadas box; the real label is vertical (leftover from round 1 #11) | render this label vertically, or shorten to "Games Arcade" |
| 2 | minor | 350,2550 | "XD Interactive Cinema" (r123) and "Hologate Arena" (r162) labels each spill ~6-9 px across the shared wall onto the neighbour's floor (both green, so it still reads fine) | nudge label anchors; cosmetic |
| 3 | minor | 116,826 | Label orientations differ from the plan: real prints Solarium / Sportplex / Bowling / Concierge Area vertically, ours horizontally; ours also places the gym name near y2355 while the plan prints it at the top (y~1870). All inside their venues and written once | style only; renderer has no vertical option |
| 4 | minor | 258,365 | Name qualifiers not on the plan: "Concierge (Yacht Club)" (plan: "Concierge Area"), "Top Sail Lounge (Yacht Club)" (plan: "Top Sail Lounge") | harmless; keep or drop the parenthetical |
| 5 | minor | 180,945 | r152 still covers the two open deck staircases (x172-198 / y934-952 and x387-426 / y931-949) - unchanged from round 1 #4, acceptable open-deck style | optional thin `circulacao` carves |
| 6 | minor | 100,3500 | r168's south-west corner leaves a small cream sliver between the hull rim and the solarium blue (x87-150, y3490-3514); smooth curve, reads as deck rim | optional: pull r168's corner to the rim |

## Checks that passed (fresh, full deck)

- All 12 printed venue names on the real plan matched exactly once, in the right place, with
  sensible categories: Top Sail Lounge->restrito (r148), Concierge->restrito (r149),
  MSC Yacht Club->restrito (r150), Solarium->piscina (r152), MSC Gym->esporte (r83),
  Power Walking Track->esporte (r158, r160 - two separate strips, each named once),
  Virtual Games Arcade->esporte (r161), XD Interactive Cinema->esporte (r123),
  Hologate Arena->esporte (r162), MSC Formula Racer->esporte (r163), Sportplex->esporte (r164),
  Bowling->esporte (r165), Sports Bar->bar (r166), Horizon Amphitheatre->show (r167),
  Horizon Pool->piscina (r143, dark blue inside the light-blue r168 deck). No name drawn twice.
- Lifts/stairs: all three printed "Lift" lobbies are `circulacao` (r53 "Elevadores" y587-692;
  r171 + r172 "Elevadores" in the gym), and every hatched stair block is carved
  (r173 + r174 "Escadas" in the gym, r175 "Escadas" south of the arcade). Nothing swallowed.
- Pools/water: Horizon Pool and the two Hidromassagem pods dark blue; solarium and deck areas
  light blue; no magenta rooms; no jagged artifact bands or slivers (side sponson rooms
  r68-r82 render as clean cream boxes on the real structures).
- Cabins: all 22 (16001-16016, 16018-16020, 16022, 16024, 16026 + pairs 16006/16008 and
  16010/16012) drawn in the right cells, checked cell by cell; 16017/16021/16023/16025 do not
  exist on the plan and are correctly absent.
- Textos: all 20 are 60-109 chars, proper pt-BR with accents, factual, no invented prices or
  times. The "cerca de 330 metros" lap claim and the Sportplex/bumper-cars wording come from the
  site's own copy (`../src/data/navio.ts:189` and `:200`), not invented by the deck worker.
- r122/r178/r175/r173/r174/r53 etc. carry no texto (correct: they are circulation).

Scorer problems noticed (for the coordinator):
1. The `edges` hint still fires on r166 (32%), r164 (41%), r168 (50%), r169 (52%), r163 (54%),
   r150 (54%) even though their outer envelopes sit on the real walls within ~10 px (re-verified
   by pixel/overlay this round). The percentage is dominated by undrawn *internal* partitions
   (r166's x344/x397/y2816 walls, r169's lift-lobby inner walls, r168's pool pad, r150's desks).
   Same false-positive family round 1 reported; the "spill check" idea in PROMPT-ROUND2 section 6
   (outline vs the venue's outer closed region) would point workers at real problems instead.
2. The `corridors` hint still flags r151 (the unnamed 407x569 MSC Yacht Club `restrito` envelope
   that fully contains the named YC rooms) - the only lost semantics fraction (0.964). Round 1
   suggested exempting unnamed `restrito` rooms that contain named rooms; still worth doing.
3. Nothing detects a label that overflows its room (findings 1-2). A narrow check (label text
   width at render size vs the room's bbox) would surface these; cosmetic, so low priority.
