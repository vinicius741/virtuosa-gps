# Audit deck 9, round 1, by Claude Code
Verdict: FAIL
Score at audit time: 99.97

Walked top to bottom in 600 px windows with `--best --mode side` (0–3527), plus scale 3–8 zooms of the
bow, the aft columns and every suspicious cell, and a numeric diff of `specs/deck-9.json` cabins against
`cache/deck-9/cabins.json` + `cache/deck-9/labels.json` (spec == cache for all 304 cabins).

Checked and OK:
- Cabin numbers: all 304 spec numbers are OCR-read from the real plan (none inferred) and none is missing
  from the spec. Verified visually in zooms: bow suites 9002–9009 (vertical numbers), col sequences
  9011–9107 / 9022–9118, mid-aft 9155–9228, aft 9225–9316, and the aft transverse row
  9289/9291/9293/9295/9297/9306/9308/9310/9312/9314/9316. The 13 absent numbers (9001, 9017, 9117, 9217,
  9299, 9301–9315 odd) are genuinely not printed on the real plan.
- "9000" (vertical cell at x290–316, y177–245) IS printed on the real plan (OCR conf 0.998, visible in the
  overlay over the pink strip). It only looks wrong because it is outside 9001–9316. Keep it.
- Corridors `circulacao`; all lift/stair blocks (midship y≈770 "Lift", y≈1235, y≈1690, y≈2184 "Lift",
  panoramic lifts y≈1875 "Panoramic Lift", aft complex y≈3120–3300) sit inside `circulacao` rooms
  (r65/r66, r70–r79, r84–r97, r116–r136), none swallowed by a cabin.
- No magenta (`?`) rooms, no jagged artifact bands, no cream voids inside the hull.
- No public venue names; the only named room is r101 "eMa" (junk, see minors).

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | major | 408,2607 | Cabin 9242's cell is ~49 px too wide: spec poly x348–469 (121 px) vs the real cell x348–420 (72 px, same as neighbours 9244 below and 9225 opposite). The extra strip (x420–469) is the open hull-taper area beside the cabin, which the real plan leaves outside the cabin wall. Our number prints at (408,2607), pushed to the right edge of the real cell instead of its centre (~370,2607), and the box visibly sticks out past the column edge. | Set 9242 poly to ≈ [[348,2595],[420,2595],[420,2619],[348,2619]] (copy 9244's width). |
| 2 | minor | 303,2545 | Junk name "eMa" on corridor r101 (watermark OCR). PNG preview only; the SVG skips `circulacao` names, so the site never shows it. | Clear the `name` on r101. |
| 3 | minor | 250,30 | Bow-tip rooms r2/r3 (`cabines`, y3–58) sit over the two light-blue whirlpool icons of suites 9003/9002; the real plan draws them light blue (water), ours beige as cabins. Tiny (≈2.1k px² each), correct position. | Optional: restyle as water or fold into the suites; harmless as is. |
| 4 | minor | 320,400 | Thin `circulacao` slivers from wall snapping (r24 2x317, r19 3x103, r29 11x246). Corridor on corridor, invisible at phone size. | Optional cleanup. |
| 5 | minor | 300,3520 | r150–r160 (`cabines`, thin strips at y3514) are the aft balcony fronts of 9289–9316; they match the thin outlines the real plan draws under the aft row. Correct, just confirming intent. | None. |

Scorer problems noticed (for the coordinator):
- Same containment-only `cabins` check as deck 8: 9242's oversized poly passes because it still contains
  the printed-number point. Suggested: flag spec cabin polys whose area is > ~1.6x the cache cell area
  (deck 9: only 9242 and the legitimate corner suites 9008/9009 would trip a naive area rule, so pair the
  area test with the 9008/9009 exception or compare against the column median instead).
- The deck 9 hint says cabin 9000 is "probably OCR mistakes, fix with ./pl cabin-fix". That is a false
  positive: 9000 is really printed on the plan (verified in the ref PNG and the overlay, conf 0.998).
  The hint should not suggest renumbering a real cabin — e.g. only flag numbers the OCR read with conf
  < ~0.9, or say "verify visually before changing".

---

# Audit deck 9, round 2, by Claude Code
Verdict: FAIL
Score at audit time: 99.97 (spec == best == 99.97)

Round-1 major re-verified — FIXED: 9242 is now x348–420, y2595–2619, exactly the width of neighbours
9244/9246, number centred in the real cell (zoom y2560–2700 scale 10); no overhang past the column taper.

Fresh top-to-bottom walk (600 px windows, 0–3527, plus scale 10–14 zooms) and a numeric diff of all 304
spec cabins against `cache/deck-9/cabins.json`. Checked and OK: no two spec cabins share a poly (deck 8's
identical-pair bug does not exist here); corridors and all lift/stair blocks (midship y≈770, y≈1235,
y≈1690, y≈2184, panoramic y≈1875, aft y≈3100–3300) inside `circulacao`; all rooms `restrito`/
`circulacao`/`cabines` — no magenta, no artifact bands, no invented venue names, no hull voids; aft
transverse row 9289–9316 in the right order; "9000" correctly kept (round-1 minor/hint false positive
unchanged).

NEW MAJORS — three cabins kept the cache's leaked double-height cell (fill ran through the printed
divider AND 16 px past the column's right wall), and two more kept only the sideways leak. Same defect
class the round-1 audit failed 9242 for:

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | major | 392,1069 | Cabin 9112 poly x349–436, y1040–1099: real plan prints a divider at y≈1066 (pixel-checked/zoom y1030–1110 scale 14), so the real cell is y1070–1099, x348–420. Our box covers 9110's whole row and sticks out 16 px past the column edge onto the corridor strip (x436 vs 420, visible in the overlay); 9112's number prints at y1069.5 — on the divider, 15 px above its real centre (~1084). | Set 9112 to x348–420, y1070–1099. |
| 2 | major | 392,2831 | Cabin 9256 poly x348–436, y2802–2861: real divider y≈2830 (zoom y2795–2870), real cell y2802–2830, x348–420. Our box swallows 9258's row and overhangs 16 px right; number prints at y2831.5, on the wall, 15 px below its real centre (~2816). | Set 9256 to x348–420, y2802–2830. |
| 3 | major | 392,2952 | Cabin 9266 poly x348–436, y2923–2982: real divider y≈2953 (zoom y2915–2990), real cell y2955–2982, x348–420. Swallows 9264's row, overhangs 16 px, number prints on the divider (15 px above centre ~2968). | Set 9266 to x348–420, y2955–2982. |
| 4 | major | 392,1175 | Cabins 9118 and 9120 (x349–436, y1161–1190 / y1192–1220): 16 px sideways overhang past the real column wall (x420; overlay zoom y1155–1225) into the corridor strip; numbers 8 px right of centre. Mildest of the set, but the same "box sticks out past the column edge" defect round 1 failed 9242 for (>15 px on a whole side). | Narrow both to x348–420 (copy 9116). |

Minors (not failing): junk "eMa" on corridor r101 (accepted round 1, PNG only); bow r2/r3 whirlpool-suite
styling (accepted round 1); thin `circulacao` slivers r24/r19/r29 etc. (accepted); 9042/9072/9084/9228 are
7 px narrower than their column (wall snap, invisible); aft thin strips r150–r160 correct as before.

Scorer problems noticed (for the coordinator):
- Same blind spot as deck 8: the cache poly is treated as ground truth, so a leaked cache cell (merge of
  two cabins, or a sideways run into the corridor) scores 1.000 once it contains the OCR point. A width/
  height outlier test against the column median (flag >1.4x, or side overshoot >12 px vs the neighbouring
  cell edge) catches 9112, 9118, 9120, 9256, 9266 with no special cases.
- The "9000" hint false positive noted in round 1 persists (harmless but should say "verify visually").

---

# Audit deck 9, round 3, by Claude Code (glm-5.3-flash)
Verdict: PASS
Score at audit time: 99.97 (spec == best == 99.97)

Round-2 majors re-verified — ALL 4 FIXED (pixel zooms vs the real plan):
- 9112 now x349–420, y1071–1099: 9110's row is its own cell again above it, the number prints
  centred in the real cell, and the right edge sits on the real column wall x420 (overlay zoom
  y1040–1230; no more 16 px overhang onto the corridor strip).
- 9256 now x348–420, y2802–2830 with 9258's row back (overlay zoom y2780–3000).
- 9266 now x348–420, y2954–2981 with 9264's row back (same zoom).
- 9118 and 9120 narrowed to x349–420 (same zoom; right edges flush with the column wall).

Fresh top-to-bottom walk (600 px windows 0–3527, scale 5–8 zooms) and a geometric sweep of all
304 spec cabins against `cache/deck-9/cabins.json` (duplicate numbers, identical/near-identical
polys, overlap ratio, area vs cache cell, bbox overshoot, cache-claim coverage):
- No two spec cabins share a poly; zero overlaps above 5 %; every cache centroid claimed by
  exactly one spec cabin; no invented numbers (every spec number is an OCR read from the real
  plan; the 13 absent numbers 9001/9017/9117/9217/9299/9301–9315 odd are genuinely not printed).
- 9000 kept: genuinely printed on the real plan (vertical pink cell x290–316, y177–245, visible
  again in the bow window). The hint "probably OCR mistakes, fix with ./pl cabin-fix" remains a
  false positive — never flag it.
- Corridors and all lift/stair blocks (midship y≈770 "Lift", y≈1235, y≈1690, y≈2184 "Lift",
  panoramic lobby y≈1875 "Panoramic Lift", aft complex y≈3120–3300) inside `circulacao` rooms;
  158 rooms only `restrito`/`circulacao`/`cabines` — no magenta; no jagged artifacts; no slivers
  under 200 px²; no cream voids inside the hull; aft transverse row 9289–9316 in the right order
  with the orange cells matching the real plan.

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | minor | 303,2545 | Junk name "eMa" on corridor r101 (watermark OCR). PNG preview only; SVG skips `circulacao` names. Accepted rounds 1–2, unchanged. | Clear the `name` on r101. |
| 2 | minor | 250,30 | Bow-tip cells r2/r3 (`cabines`) sit over the whirlpool icons of suites 9003/9002; real plan draws them light blue (water). Accepted round 1, unchanged. | Optional restyle as water. |
| 3 | minor | 154,644 | Low-fill `circulacao` shapes (r58/r60 wedges at y644, r83/r90 stair shapes y2136/2249) are the real angled stair entries/hatches — geometry matches the overlay, listed only to record the check. | None. |
| 4 | minor | 149,908 | 9042/9072/9084/9228 are 7 px narrower than their column (wall snap) — accepted round 2, unchanged. | Optional. |

Scorer problems noticed (for the coordinator):
- The "9000" hint false positive persists (documented rounds 1–2): 9000 is a real printed cabin
  (OCR conf 0.998). Reword to "verify visually before changing" or only flag numbers read below
  ~0.9 confidence, so no worker renumbers a genuine cabin.
- Round-2's suggested geometric checks (duplicate-poly share, width/height outlier vs column
  median, side overshoot >12 px) remain unimplemented in the `cabins` check; on deck 8 the
  identical-poly pairs still scored 1.000/0.996. Adding them would have caught every deck-8 and
  deck-9 leak without any deck-specific cases.

---

# Audit deck 9, round 4, by Claude Code (glm-5.3-flash)
Verdict: PASS
Score at audit time: 99.97 (spec == best == 99.97)

Post-round-3 fixes re-verified — BOTH GOOD (pixel probes on `--mode ours` renders vs the ref/cache):

- **r24 dropped, correctly.** r24 is gone from the spec and `./pl rooms 9`. The cache sliver
  (rid 233, 950 px², bbox x319–321, y267–584 — a 3 px light gap between the corridor's right wall
  x316–318 and the sea-view block's left wall x322–324) is no longer drawn. Pixel probes along
  y290–590 show exactly two clean vertical lines where the real plan has two wall lines: the
  corridor edge at x315 (real wall band 316–318, ≤3 px) and the cabin-block left wall at x324
  (real band 322–324). Nothing is drawn in the old sliver span x319–321 — no stray double line,
  no zigzag. The 9 px wall band between the lines is left uncovered, but it is wall and renders
  the same cream as the corridor floor, so no hole is visible; the corridor fill is continuous
  y267–590 (probed at y355/375/505). The sea-view block's left wall stays represented by the
  cabin polys at x324 (9036–9068) plus the outline line.
- **r101 junk name "eMa" cleared.** All 157 rooms report `''`; `./pl labels 9` is empty; nothing
  junk renders in any window — the aft corridor (r101, y2471–3073) renders plain cream. The
  CruiseMapper watermarks remain only in the reference panel, as they should.

Fresh top-to-bottom walk (600 px windows, 0–3533, plus scale-6 overlay/ours zooms of the bow
stair/9000 area, the r24 strip, and the aft transverse row) and a numeric sweep of all 304 spec
cabins against `cache/deck-9/cabins.json`:
- No duplicate numbers, no identical polys, no invented numbers (all 304 cache numbers present
  in the spec), no spec poly overshooting its cache cell by >6 px, no area outliers. The three
  sub-0.5 cache-coverage cabins (9112 0.39, 9256 0.37, 9266 0.37) are exactly the round-2
  majors, correctly split: 9110/9258/9264 hold the clean half-cells and the unions cover the
  leaked double-height cache cells with the real dividers (y≈1070, y≈2830, y≈2953). 9242 stays
  x348–420 (cache leak to x469 correctly ignored); 9118/9120 narrowed; 9075/9181/9228 match the
  cache geometry exactly (hull-taper cells, not offsets).
- Cabins sit in their real cells in every window (overlay alignment; vertical numbers 9000 and
  the aft row render in the right cells). "9000" kept — genuinely printed, never flag.
- All stair/lift blocks inside `circulacao`: bow stair y≈250 (r16/r20), corridor stairs
  y≈600–680, "Lift" y≈770 (r65/r66/r67/r68), stair y≈1245, stair y≈1690, Panoramic Lift y≈1875
  (r78–r82), "Lift" pair y≈2184 (r84–r89), stairs y≈2240–2290 (r83/r90), aft complex
  y≈3077–3300 (r114–r136). None swallowed by a cabin or venue.
- 157 rooms are only `restrito`/`circulacao`/`cabines` — no magenta. Smallest room is r19
  (257 px², the accepted 3 px wall-snap sliver); no new slivers, no jagged bands, no hull voids.
- Aft transverse row 9289–9316: right order and right widths (9293/9295/9312/9310 wide 46 px,
  9314 narrow, matching the plan); drawn uniform beige like every cabin on this deck.

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | minor | 320,400 | The 9 px wall band between the corridor edge (x315) and the sea-view block wall (x324) is left uncovered — it is wall on the real plan (two bands with the old 3 px sliver gap), renders the same cream as the corridor, invisible at phone size. Recorded as the intended result of the r24 drop, not a hole. | None. |
| 2 | minor | 150,3470 | The plan's category tinting of cells (green/pink/orange, incl. the orange 9293/9295/9312/9310) is not reproduced; all cabins draw uniform beige. Deck-wide convention on this deck since round 1, accepted. | None (style). |
| 3 | minor | 250,30 | Bow-tip cells r2/r3 beige over the whirlpool icons of 9003/9002 — accepted rounds 1–3, unchanged. | Optional restyle as water. |
| 4 | minor | 226,300 | Thin `circulacao` slivers r19 (3x103) and r29 (11x246) from wall snapping — accepted rounds 1–3, unchanged; the scorer's sliver check does not flag them. | Optional cleanup. |

Scorer problems noticed (for the coordinator):
- The `cabins` check still treats each cache cell as ground truth: my sweep shows 9112/9256/9266
  covering only 0.37–0.39 of their (leaked, double-height) cache cells while the deck is correct.
  A merge-aware comparison (union of neighbouring spec cells vs the cache cell) or the round-2
  width/height-outlier test would make the check robust without deck-specific cases.
- `--mode side` PNGs contain all three panels; pixel-probing them without the panel offset
  silently reads the reference panel. Worth a note for auditors (round 3's "orange cells" remark
  suggests an overlay-panel read; the ours render draws cabins beige).
- The "9000" hint false positive documented rounds 1–3 is gone from `./pl score 9` — only the
  benign "13 numbers not present" info hint remains.
