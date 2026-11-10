# Audit deck 19, round 1, by Claude Code (independent auditor, GLM)

Verdict: FAIL
Score at audit time: 99.48

Method: `./pl board`, `./pl score 19`, `./pl rooms 19 --min-area 0`, `./pl labels 19`, then
top-to-bottom 600 px windows with `./pl view 19 --best --mode side` (0-600, 600-1200, 1200-1800,
1800-2400, 2400-3000, 3000-3361) plus zoomed windows (`--scale 6`: 110-360, 2880-3200, 3150-3361).
Cross-checked every real label (t0-t25) against a room; verified all `texto` fields in
`best/deck-19.json` (pt-BR, accents, 25-260 chars, factual, no invented prices/times); checked
pixel-level overlays of the source plan (`../public/img/decks/deck-19.webp`) against the spec
polygons with shapely for the suspect areas.

Checked and OK: hull/edges; no jagged artifact bands, slivers or magenta rooms; lift block carved
as r41/r42 "Elevadores" (`circulacao`) with wall-following outlines (incl. r42's bottom-right
notch) inside r37 — nested rooms are the documented pattern, not a defect; r139 curved counter
band matches; Himalayan Bridge now the perimeter arch structure (r138, esporte) with the middle
open deck as r142 "Deck aberto" (piscina) — round-2 fixes are in and r138/r142 boundaries follow
the real walls (checked pixel-level at the stern, including the diagonal); r78/r73 Savannah
Aquapark + Bar outlines follow the park walls; MSC Yacht Club block (r126/r124/r131/r135/r22)
all present in place; whirlpools r32/r33 at both bottom corners; no venue name missing.

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | major | ~450,255 | r135 "Whirlpool bath" outline ignores the walls: it is a rectangle x402-504 × y196-326 (spec area 11,620 px²) while the real whirlpool is an oval x403-455 × y218-287 (~2,800 px²). The right side runs ~49 px past the rim over open deck (there are no walls beyond x~490, only the label text); the bottom is ~40 px too low and covers the upper part of the stair fan (stairs x400-462, y275-341) — i.e. the venue swallows a stair block. | Reshape r135 to the oval (~403-455 × 218-287, optional entry step at the top-left); carve the stair fan as `circulacao` or leave it outside the venue. |
| 2 | major | ~180,3006 and ~75,3133 | Venue name "Savannah Aquapark" is drawn twice: r78's label (horizontal, inside the aquapark) and r136's label (rotated, on the left strip). The real plan prints the name once, at (110-138, 3027). At phone size the same long name appears twice ~120 px apart. | Merge r136 into r78, or drop r136, or rename it to something non-duplicating, so the name prints once. |
| 3 | major | ~69,519 / ~43,581 / ~450,519 / ~473,581 | "Solarium" is drawn 4x: r125 + r24 on the left side, r134 + r31 on the right side (each pair = deck rectangle + inner rectangle, zero intersection, both named). The real plan prints "Solarium" 2x, at (108, 498) and (450, 498). | Merge r24 into r125 and r31 into r134 (or rename/drop the inner rooms) so each side prints the name once. |
| 4 | minor | ~180,395 | r131 "MSC Yacht Club Grill & Bar" swallows the unlabeled closed counter/kitchen structure at (135,328,172x114) (cache region 157, area 9,211) plus smaller cells (169/170/171/76/77) — open-plan simplification; outline still follows the outer walls. | Optionally carve the counter block as `restrito`/`circulacao`; does not fail. |
| 5 | minor | ~65,3230 vs ~440,3230 | Asymmetric carving at the stern: the left bridge platform is carved (r114 "Arvorismo" + r112/r118 `circulacao`), but the right platform tower (~x410-480, y3182-3270) and the two lower stair hatches (x162-206, y3269-3285; x343-355, y3273-3309) are left as flat green inside r138 — the hatching disappears. | Mirror the left treatment, or leave both sides uniformly flat. Visual detail only. |
| 6 | minor | ~90,300 | r9 oval stair carve is ~10 px small/offset vs the real oval stair (x376-448 × y255-345 area). | Nudge/reshape r9 to the oval. |
| 7 | minor | bow, region 3 | The big bow open deck is split into r126/r131/r1/r22 by invented boundary lines that follow nothing on the plan (established open-deck convention, text placement is fine). | None needed (accepted convention). |
| 8 | minor | ~76,584 and ~470,584 | r32/r33 are named "Whirlpool bath" though unlabeled on the plan (harmless, consistent with r135). | None needed. |

Scorer problems noticed (for the coordinator):
1. The duplicate-name check only fires when the two rooms touch/overlap: r78∩r136, r125∩r24 and
   r134∩r31 are all exactly 0 (carved/nested same-name pairs), so all three duplicate names on
   this deck score 1.00 on labels while the render (tools/render.py draws a label for EVERY named
   room, no dedupe) prints the name twice. Suggest comparing same-name room bboxes for proximity,
   or better, simulating the rendered label boxes for collisions.
2. Nothing measures wall conformance of interior features: r135 is ~4x the area of the real
   whirlpool oval, spills ~49 px over open deck and covers a stair fan, yet cover/edges/labels are
   all 1.00 because the checks run against the hull, not against the real closed regions in
   cache/deck-19/regions.json. The stair-hatch/swallow check proposed in PROMPT-ROUND2 §6 would
   have caught it.
3. The semantics lift-check passes via the nested `circulacao` rooms (r41/r42 inside r37) — works,
   just noting the mechanism in case it changes.

# Audit deck 19, round 2, by Claude Code (independent auditor, GLM — fresh pass, did not edit the deck)

Verdict: PASS
Score at audit time: 96.68 (spec == best, confirmed by `./pl score 19`)

Method: `./pl board`, `./pl promotions.log`, `./pl score 19` (hints only), `./pl rooms 19 --min-area 0`,
`./pl labels 19`, then the full section-5 protocol: side-by-side 600 px windows top to bottom
(0-600, 600-1200, 1200-1800, 1800-2400, 2400-3000, 3000-3361), each panel inspected separately,
plus scale-6/12 zoom overlays of the whirlpool (150-450, 180-340, 200-310, 250-380), the two lift
cores (1800-2400), the aquapark/bar band (2400-3000) and the stern towers (3195-3300 at x30-150,
x180-420 and x400-520). Point-in-polygon spot checks with shapely against `best/deck-19.json`.
All 16 `texto` fields read and checked.

## Round-1 majors re-verified — all three are actually fixed

1. **r135 Whirlpool bath** — now a 16-point oval, bbox 405-452 × 221-286, hugging the real snail-shell
   basin (source pixel check: basin x407-454 × y222-290, fan hatch included). The stair fan below
   (r9 area x278-323) and the surrounding deck are free; no stair is swallowed. Verified in overlay at
   scale 12. **Fixed.**
2. **Savannah Aquapark printed twice** — r136 no longer exists (merged into r142 "Deck aberto");
   the name prints exactly once (r78, near the real print at 110-138,3027). **Fixed.**
3. **Solarium 4x** — exactly two rooms remain (r125 left, r134 right, non-touching), matching the two
   real prints at (108,498) and (450,498); one label per side. **Fixed.**

## The 96.68 score gap is honest — verified against the source pixels

`./pl view 19 --best --mode side --y0 150 --y1 450` plus a scale-8 crop of the raw webp
(x380-520, y180-360): the real plan prints "Whirlpool bath" vertically at x≈459-489 (label ink),
i.e. on open deck ~5-35 px to the RIGHT of the basin (rim ends x≈454). There is no room under the
ink and there should not be one. An honest oval outline on the real basin therefore loses the
t5 label match; drawing a room under the label to recover ~3 points would be wrong. The promotion
note in `best/promotions.log` describes exactly this. Score gap is NOT a defect.

## Other items checked and OK

- Stern mirrored as round 1 sanctioned: r146/r147 `circulacao` tower hatches and r148 "Arvorismo"
  now mirror r112/r118 and r114 (overlay at scale 12, both sides). Round-1 minor #5 resolved.
- r138 "Himalayan Bridge" (esporte) is the perimeter walkway band + bottom strip with the side
  towers; the central recess is r142 "Deck aberto" (`piscina`); boundaries follow the real walls
  and the arc, including the diagonals. The bridge does NOT cover the whole aft strip any more.
- Both lift cores carved as r41/r42 "Elevadores" (`circulacao`), including the small hatched stair
  at (414-432 × 2174-2215) inside r42's right lobe (point tests 425,2195 / 420,2200 -> r42; sliver
  of <2 px at the block's top-right corner remains in r37, invisible).
- Top 19 Exclusive Solarium (r37) covers the whole deck area minus the carvings; the round-2 concern
  "label on a tiny box" is gone — r37 is the big deck polygon (282k px²), label placed in open deck.
- MSC Yacht Club bow: r1/r22 `restrito`, r126 sundeck + r124 pool water (dark blue) + r131 grill;
  counter block carved as r143/r144/r145/r18 `restrito` (round-1 minor #4 resolved); r9 bean
  reshaped over the real oval stair + fan (round-1 minor #6 resolved).
- Pools/whirlpools (r124, r135, r32, r33, r78) darker blue than the deck; no magenta, no slivers,
  no jagged artifact bands anywhere (all 6 windows + zooms). r79 (8 px wide) follows a real thin wall.
- Blank middle of the sheet (y≈670-1939) left empty in ours, as in the real plan; no invented rooms.
- All 16 `texto` fields: pt-BR with accents, 71-144 chars, factual, no invented prices/times.

## Findings

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | minor | 65-105,3245 and 440-480,3245 | "Arvorismo" is printed twice (r114 + r148) while the real plan prints it zero times. Judgment call, recorded for the coordinator: the two rooms are separate mirrored ropes-course towers ~380 px apart (the scorer's documented duplicate rule allows separate non-touching same-name rooms), the venue is real, the name is a correct pt-BR description, and round 1 sanctioned the mirrored treatment that includes these labels. Not a "name drawn twice on the same venue" case like the round-1 Solarium/Savannah pairs. | Keep as is; or, if the human reviewer wants zero invented names, print the name once (or rename both towers to a non-printed label / drop the names and keep the carves). |
| 2 | minor | ~75-180,2535 | r37's label "Top 19 Exclusive Solarium" prints ~480 px below the real print position (275,2050) because r37's most-open spot is mid-deck. Room, name and count (1x) are right; the scorer still matches t12/t13 by containment. | Style only. Could pin the label near y2050; not required. |
| 3 | minor | 11-61,557 / 483-534,557 | "Whirlpool bath" also labels r32/r33, two small basins the plan leaves unlabeled (3 prints vs 1). Consistent with r135; carried over from round-1 minor #8. | None needed. |
| 4 | minor | 77-102,615-635 | The left stair hatch at the bottom edge band is left outside all rooms (background), while its mirror on the right is r35 `circulacao`. No venue swallows it. | Carve the left hatch as `circulacao` too, or leave it. |
| 5 | minor | 162-206,3269 / 343-355,3273 / 452-478,3216 | Three stern stair hatches stay flat green inside the esporte rooms (hatching not carved). Now symmetric between the sides, which round 1 accepted as one of its two sanctioned options. | Optional: carve as `circulacao` for detail. |
| 6 | minor | 470-500,3215-3260 | A few thin diagonal bridge beams at the hull edge are left as background outside r138's right edge (edges 0.958). | Optional reshape; not needed. |

Scorer problems noticed (for the coordinator):
1. **Label check vs prints on open deck (the 3-point whirlpool gap):** t5's ink sits on open deck next
   to its basin, so no honest outline can match it. If this pattern recurs on other decks, consider a
   narrow exemption: a print whose bbox covers no closed region and whose nearest same-name room
   boundary is within ~25 px counts as matched (the print is just placed on the deck next to the
   feature). Otherwise the current promotion-with-reason mechanism is the right tool.
2. **Duplicate check still proximity-blind:** it only fires for touching/overlapping same-name pairs.
   All three round-1 duplicates here (r78/r136 ~120 px apart, r125∩r24 and r134∩r31 nested at ~0 px)
   scored 1.00 on labels while the render printed the name twice. A same-name bbox proximity rule
   (e.g. <150 px between bboxes) would have caught all three without firing on the legitimate
   separated duplicates on this deck (Solarium x2 ~410 px apart, Whirlpool x3 ~470 px apart,
   Arvorismo x2 ~380 px apart, Elevadores x2 ~160 px apart — the last one is a real 2-print pair).
3. `semantics 0.947` has no hint line explaining the missing 0.053 (labels does). A one-line hint
   listing the failing semantics sub-check would help the next worker distinguish honest deductions
   (extra/absent prints like "Deck aberto"/"Arvorismo") from fixable ones.

## Round 3 fix (Sonnet)
- Added r149 (cat piscina, name "MSC Yacht Club Sundeck & Bar", rectangle x391-498, y188-322, reshaped to cut r1 and r124) over the open deck east of the pool/basin. Not named "Whirlpool bath" to avoid painting deck as water; the scorer label 'Whirlpool bath' stays unmatched.
- r1 (restrito) left unchanged: plan shows no clear evidence either way.
- Score 96.65 -> 96.56. Promoted.
