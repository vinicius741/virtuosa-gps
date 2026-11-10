# Audit deck 8, round 1, by Claude Code
Verdict: FAIL
Score at audit time: 99.91

Walked top to bottom in 600 px windows with `--best --mode side` (0–3400 plus aft tail to 3527),
plus scale 4–8 zooms of every suspicious spot and a numeric diff of `specs/deck-8.json` cabins
against `cache/deck-8/cabins.json` + `cache/deck-8/labels.json`.

Checked and OK:
- Cabin numbers: 258 in spec. Every printed number is present and sits in the right cell, except
  the two majors below. The 21 numbers the OCR missed (8057–8083, 8193–8209, 8245/8247/8251) were
  verified by zoom against the real plan: all correct. The 4 absent numbers (8017, 8117, 8217, 8261)
  are genuinely not printed on the real plan. Sequences odd port / even starboard, +2 per row: correct.
- Corridors `circulacao`; all stair/lift blocks (y≈490, 770–900, 1235–1490, 1912–1970, 2177–2410,
  3030–3350) are inside `circulacao` rooms, none swallowed by a cabin.
- No magenta (`?`) rooms; no jagged artifact bands; no cream voids inside the hull (cover 1.0 checks out visually).
- No public venue names on this deck; r210 "Área da tripulação" is the only named room (see minors).

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | major | 253,2907 | Cabin 8231 has the wrong cell: spec poly is a 184x38 band across the aft cross corridor (x160.5–345, y2888–2925.5). The real plan prints "8231" in the normal narrow col-1 cell (x≈141–208, same size as siblings 8229/8233, OCR text bbox starts at x183; the OCR string "8231uisemapi" merged the number with the watermark, which is how the centroid landed at x253). Result: our number renders in the middle of the corridor and the col-1 cell at that row shows no number. | Set cabin 8231 poly to ≈ [[141,2888],[208,2888],[208,2926],[141,2926]] (match 8229/8233). The corridor band stays in r1 (`circulacao`). Reconcile r163 (the squiggle nook, x142–205, `cabines`) which overlaps the same spot — restrito or merge into the cabin. |
| 2 | major | 436,2556 | Cabins 8208 and 8210 share the identical poly (x411–461, y2530–2583, one double-height cell). The real plan has two separate cells with the divider at y≈2561 (OCR read "8208" centred at y2543 and "8210" at y2570). Our render prints both numbers at the same centroid, so "8210" is overprinted and invisible. | Split: 8208 = y2530–2561, 8210 = y2561–2583, x411–461 (heights then match the neighbouring cells). |
| 3 | minor | 220,185 | r210 (`restrito`, bow block) is named "Área da tripulação" and that name renders in the exported SVG; the real plan prints no text anywhere on the bow (cache labels confirm: no text above y≈400). Plausible interpretation, but it is an invented label on the deliverable. | Coordinator call: either drop the `name` (keep `restrito`) or keep it deliberately and note it in RELATORIO-ROUND2.md. |
| 4 | minor | 170,2903 | r163 squiggle nook (x142–205, y2891–2915) is categorised `cabines`; on the real plan it is an odd little nook next to the 8231 cell (service/stair-like), not obviously a cabin. Also overlaps cabin 8231's poly as it stands today. | After fixing #1, re-categorise as `restrito` (or merge) so the col-1 cell shows only "8231". |
| 5 | minor | 280,1000 | Corridor r1 carries junk name "eMa" (OCR of the CruiseMapper watermark). Renders in the PNG preview; the SVG skips `circulacao` names, so the site is unaffected. | Clear the `name` on r1 to stop it appearing in previews. |
| 6 | minor | 306,809 | Thin `circulacao` slivers (r52 6x96, r49 10x78, r23 29x20, etc.) left by wall snapping. Corridor-coloured on corridor, invisible at phone size. | Optional cleanup; no action needed. |
| 7 | minor | 274,3434 | Aft open deck r205 (`restrito`, 543x177) covers the area the real plan leaves white (railing curves only, no label). Defensible interpretation; corner rooms r201/r202/r206/r207 match the real small rooms. | None; note in the report if the human knows what deck 8 aft really is. |

Scorer problems noticed (for the coordinator):
- `cabins` check is containment-only: a spec cabin passes if its poly merely contains the OCR point.
  That is why a poly that merged cell + corridor (8231, 6918 px² vs ~1300 px² for its siblings) and two
  cabins stacked on one cell (8208/8210, identical polys) both score 1.000. Suggested narrow fixes:
  (a) flag spec cabin polys whose area is > ~1.6x the matching `cache/deck-N/cabins.json` cell area;
  (b) flag two spec cabins sharing >90% of the same poly. Both fail today and are exactly the two majors above.
- The "numbers not present" info (8017/8117/8217/8261) is correct — verified none is printed on the real plan.

---

# Audit deck 8, round 2, by Claude Code
Verdict: FAIL
Score at audit time: 99.80 (spec == best == 99.80)

Round-1 majors re-verified — all three are FIXED:
- 8231 now prints inside the real narrow col-1 cell (poly x141–206, y2890–2916, aligned with 8229 above
  and 8233 below; zooms at y2820–2990 scale 6 and the real walls x139–140/x207, y2889/y2917). The scorer
  hint "Missing or misplaced: 8231@(253,2907)" remains the documented false positive (OCR merged "8231"
  with the "uisemapi" watermark) and is not counted as a defect.
- 8208/8210 are two half-cells split at y2555/2558, each number printing in its own cell (zoom y2520–2600
  scale 14), matching the real divider.
- r163 (watermark-noise squiggle) is gone from the spec; the corridor band left of the 8231 cell renders
  continuous, no hole.

Fresh top-to-bottom walk (600 px windows, 0–3527, plus scale 10–16 zooms of every suspicious cell) and a
numeric diff of all 258 spec cabins against `cache/deck-8/cabins.json`. Checked and OK: corridors and all
stair/lift blocks `circulacao` (incl. r148, r178); all 207 rooms are `restrito`/`circulacao`/`cabines` —
no magenta, no jagged artifact bands, no venue names invented, no voids inside the hull.

NEW MAJORS — the round-1 "two cabins on one cell" defect (major #2, fixed for 8208/8210) is still present
in nine other places. The cache flood-fill leaked through the printed divider wall in these cells and gave
BOTH numbers the same double-height poly; the spec copied the cache. Our render prints both numbers at the
same centroid, so each cell shows ONE illegible mashed number where the real plan shows two clear numbers
in two walled cells (zoomed and verified on the real plan for every pair):

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | major | 348,426 | Cabins 8004/8008 share poly x319–378, y400–453. Real plan prints a divider at y≈428 (pixel-checked). Render shows one mashed "8008̶" at the centroid; 8004 unreadable, no divider drawn. | Split at y428: 8004 y400–428, 8008 y428–453 (same x). |
| 2 | major | 348,595 | 8028/8032 share x319–378, y569–622; real divider y≈595–598; one mashed number. | Split at y596. |
| 3 | major | 436,1018 | 8070/8072 share x410–461, y989–1047; real divider y≈1018; 8072 effectively invisible. | Split at y1018. |
| 4 | major | 348,1881 | 8134/8138 share x319–377, y1854–1909; real divider y≈1881. | Split at y1881. |
| 5 | major | 200,1881 | 8137/8141 share x171–229, y1854–1909; real divider y≈1881. | Split at y1881. |
| 6 | major | 200,2080 | 8159/8163 share x171–229, y2054–2107; real divider y≈2081; render "8159̶" mash. | Split at y2081. |
| 7 | major | 348,2080 | 8162/8166 share x319–377, y2054–2107; real divider y≈2082; render "8162̶" mash. | Split at y2082. |
| 8 | major | 174,2972 | 8235/8237 share x141–206, y2946–2999; real divider y≈2972–2973 (zoom y2940–3005 scale 16). | Split at y2972. |
| 9 | major | 436,3169 | 8252/8254 share x411–461, y3144–3194; real divider y≈3167 (zoom y3135–3200 scale 14). | Split at y3167. |
| 10 | major | 113,3169 | 8249 keeps the cache's leaked double cell x88–139, y3144–3194 and swallows 8251 (spec y3163–3195, added by hand). Real divider y≈3166; 8249's number prints at y3169 — below the wall, i.e. in 8251's real cell — and the drawn box covers two real cells. | Set 8249 to y3144–3166; keep 8251 y3168–3195. |
| 11 | major | 166,2792 | Cabin 8223 poly x141–190 is 16 px short of the real cell wall (x≈206–208; pixel-checked the source image at y2792: green fill to x206, wall 207–208 — the cache fill was cut by the watermark ship streaks). Leaves a 16x26 px uncovered strip and a visible step in a straight column edge (crop /tmp/d8_8223_ours.png). Borderline call at the ~15 px rule; flagged for consistency with the round-1 standard. | Set 8223 poly to x141–206 (copy 8225). |

Minors (not failing): 8221 is 4 px short on the right (x202 vs 206); 8111/8121 left edge 8–9 px inside the
real wall (x149/150 vs 141); 8207/8209 5 px (x135 vs 140) — same wall-snap/watermark family, invisible at
phone size. Round-1 accepted minors unchanged (r210 invented-but-plausible "Área da tripulação", junk
"eMa" on r1, thin `circulacao` slivers, aft r205 interpretation).

Scorer problems noticed (for the coordinator):
- The round-1 suggestion (b) — "flag two spec cabins sharing >90% of the same poly" — was apparently NOT
  implemented: `cabins=0.996` complains only about the bogus 8231 centroid while all nine identical-poly
  pairs score clean. That one check would have caught majors 1–10 on this deck (and, with an area/width
  test, #11 and the deck-9 leaks).
- Suggested narrow additions: (a) two spec cabins whose polys overlap >50 % of the smaller area = fault
  (catches identical pairs and 8249⊃8251); (b) a spec cabin whose cell height or width is >1.4x the median
  of its column neighbours, or whose side overshoots the neighbouring cell edge by >12 px (catches 8223,
  9112, 9118, 9120, 9256, 9266). All geometric, no deck/room special cases.
- The 8231@(253,2907) hint stays a false positive (documented promotion); consider matching spec cabins to
  labels by best OCR candidate rather than merged-string centroid.

---

# Audit deck 8, round 3, by Claude Code (glm-5.3-flash)
Verdict: PASS
Score at audit time: 99.74 (spec == best == 99.74)

Round-2 majors re-verified — ALL 11 FIXED. Numeric diff of all 258 spec cabins against
`cache/deck-8/cabins.json` plus pixel zooms of the real plan for every fix spot:
- 8004/8008 split at y425.5; 8028/8032 at y595.5; 8070/8072 at y1015; 8134/8138 and 8137/8141 at
  y1881; 8159/8163 and 8162/8166 at y2080.5; 8235/8237 at y2972; 8252/8254 at y3170.5 — each pair
  is now two normal cells and every number prints in its own cell (overlay zooms checked for
  8004/8008, 8028/8032, 8070/8072, 8134/8138, 8137/8141, 8159/8163, 8235/8237; the rest confirmed
  numerically at the pixel-verified divider values).
- 8249 shrunk to y3144–3169 and 8251 owns y3172–3195 (overlay zoom: both numbers in their real
  cells, divider aligned).
- 8223 extended to x206 — the right edge is now flush with 8221/8225, step gone (overlay zoom
  y2755–2830).
- 8231 prints in the narrow col-1 cell x141–206, y2890–2916 between 8229/8233 (window y2400–3000).
  The hint "Missing or misplaced: 8231@(253,2907)" remains the documented false positive (OCR
  merged the number with the CruiseMapper watermark; the cache centroid sits in the corridor) —
  not counted.

Fresh top-to-bottom walk (600 px windows 0–3527, scale 5–8 zooms of every suspicious spot) and a
geometric sweep of all 258 spec cabins (duplicate numbers, identical/near-identical polys,
overlap ratio, area vs cache cell, bbox overshoot vs cache, cache-claim coverage):
- One number per cell everywhere; no two spec cabins share a poly; no poly crosses a divider or
  overhangs a column wall. All 21 OCR-missed numbers (8057–8083 odd set, 8193–8209, 8245/8247/
  8251) re-checked in overlay: present and in the right cells. The 4 absent numbers
  (8017/8117/8217/8261) are genuinely not printed.
- Cache cell 8084 flagged "unclaimed" by the geometric sweep is a sweep false positive: its cache
  centroid (436.2,1117.5) sits 1.5 px above the poly top (y1119); the spec poly equals the cache
  poly and the zoom (y1080–1160) shows a genuinely short, wide end-of-column cell with the berth
  symbol — 8084 is correct.
- All stair/lift blocks (y≈490, 770–900, 1235–1490, 1912–1970, 2177–2410, 3030–3350) inside
  `circulacao` rooms; corridors `circulacao`; 207 rooms are only `restrito`/`circulacao`/`cabines`
  (no magenta); no jagged artifacts; no slivers under 200 px²; no cream voids inside the hull
  (cover 1.00 confirmed visually).

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | minor | 220,185 | r210 "Área da tripulação" is an invented label on the bow (real plan prints no text there); renders in the exported SVG. Accepted rounds 1–2, unchanged. | Coordinator call: drop the name or keep deliberately and note in the report. |
| 2 | minor | 280,1000 | Junk name "eMa" on corridor r1 (watermark OCR). PNG preview only; SVG skips `circulacao` names. | Clear the `name` on r1. |
| 3 | minor | 220,995 | Three-prong "E"-comb of tiny unlabelled service nooks (x≈207–235, y≈925–1070, ~5 kpx² total) left as corridor r1; the real plan draws their walls. White-on-white, invisible at phone size; new observation, not previously listed. | Optional: carve as `restrito` or leave; no passenger impact. |
| 4 | minor | 113,2585 | Cabins 8205/8207 polys overlap 94 px² (2 px in y, x88–140 vs x88–135) — wall snap; invisible. | Optional 2 px trim. |
| 5 | minor | 149,1620 | 8111/8121 left edge 8–9 px inside the real wall (x149/150 vs 141); 8221 4 px short right; 8207/8209 5 px (x135 vs 140) — accepted round-2 minors, unchanged. | Optional wall snap. |
| 6 | minor | 274,3434 | Aft open deck r205 (`restrito`) covers the area the real plan leaves white — accepted round-1 interpretation. | None. |

Scorer problems noticed (for the coordinator):
- The 8231@(253,2907) hint false positive persists (documented in the promotion). Suggestion from
  round 2 stands: match spec cabins to labels by best OCR candidate rather than merged-string
  centroid, or skip cache cells whose OCR string contains non-digit tails ("8231uisemapi").
- Same-merged-string family, harmless here: cache cell 8084's own centroid (436.2,1117.5) sits
  1.5 px ABOVE its printed poly (y1119), so any tightened containment check would falsely flag it.
  If a containment check is added, use a small tolerance or the poly's own centroid.
- The geometric checks suggested in rounds 1–2 (flag two spec cabins sharing >50 % of the smaller
  poly; flag a cabin whose width/height is >1.4x its column median or whose side overshoots a
  neighbour's edge by >12 px) are still not implemented: this deck scored cabins=1.00/0.996 while
  it still had 11 shared-poly majors. Both checks are purely geometric, no deck/room special
  cases, and would have caught every one of them.
