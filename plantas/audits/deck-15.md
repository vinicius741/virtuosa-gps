# Audit deck 15, round 1, by independent auditor (Claude Code)

Verdict: FAIL
Score at audit time: 99.16 (hull 1.00, edges 0.90, cover 1.00, labels 1.00, semantics 1.00, cabins 1.00, cats 1.00, texto 1.00)

Audited the BEST version top to bottom in six 600 px windows (`./pl view 15 --best --mode side`, y 0–600 … 3000–3434),
plus targeted ref/overlay crops of every suspect spot. Reference: `specs/deck-15.json`, `export/deck-15.json`,
`./pl rooms 15 --min-area 0` (119 rooms), `./pl labels 15`.

## Defects

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | major | 441–539, 672–1005 | r159 is a sliver artifact: a degenerate `circulacao` strip (area 1403) hugging the starboard deck edge — poly `[[441,674],[533,675],[535,677],[535,1005],[539,1005],[538,672],[441,672]]` draws a ~97x3 px horizontal band ACROSS the pool deck at y672–675 (visible as a stray line at phone size) plus a 2–6 px vertical ribbon down the edge. It has no name and carries a duplicated bar `texto` ("Bar na ponta de boreste do deck da piscina…") — a bar description on a deck-edge sliver that is not a bar. It ships to the site in `export/deck-15.json`. | Delete r159 (or fold the 1–2 px of real edge wall it touches into r160); the texto already exists on r160 |
| 2 | major | 93–96, 2501–3045 | r169 `Marketplace Buffet` port edge is ~34–37 px inside the real wall for its whole length: poly runs `[503,2501]→[96,2501]→[93,3045]` while the hull wall sits at x≈57–59. The ref shows NO wall at x≈93 — the excluded strip x59–93 (window seating; benches straddle our edge line) is rendered as open blue deck, and r169 inconsistently does reach x59 further aft (y3230–3263), proving the straight x93 edge is wrong. ~18,500 px² (≈6%) of the printed buffet lost, including the notch x61–93 / y3000–3044 | Extend the r169 west edge from x≈93–96 to the hull wall x≈57–59 between y2501 and y3045, matching the aft section that already reaches x59 |
| 3 | minor | 159–431, 747–948 / 216–383, 1194–1594 | r157 `Tropical Pool` and r78 `Atmosphere Pool` water rooms cover the whole pool complex incl. lounger strips — dark-blue water area ≈3.1x (r157) and ≈1.8x (r78) the real water. Outlines DO follow the real pool-deck walls; only the water:deck ratio is off | Carve the real water rectangle inside each; leave the surround as pool deck |
| 4 | minor | 60–160, 672–1080 (r81/r82) and ~140 / ~475, 1400 | Whirlpools underrepresented: the two round deck-edge platforms aft of the Solarium (r81/r82) are drawn plain beige `circulacao` with no basins; the two double-circle whirlpool symbols beside the Atmosphere Pool (x≈140 and x≈475, y≈1400) are not represented at all | Add small whirlpool water circles/rooms, or accept as style detail |
| 5 | minor | several | Unlabeled stair symbols swallowed by venue polygons: bow fan staircase 300–345/350–410 (r11); corridor ladder 280–300/180–320 (r11); hatched stair inside r41 380–410/455–470; starboard deck-edge stair 505–540/945–1000; two stern corner stairs 65–90 and 505–540/3330–3420 inside r150 | Carve as `circulacao` like the labeled lifts/stairs (cosmetic; plan prints no names there) |
| 6 | minor | 101–500, ~40–100 | Bow-top continuous grey crew band is one strip on the plan; we split it into 6 `restrito` boxes with visible seams | Merge into one `restrito` room |
| 7 | minor | 15011 / 15008 cells | The two corner YC suites (port and starboard, first row) are drawn as standard-size beige cells; the plan shows them as larger combined suites (the printed cell spans wider). Cabin NUMBERS are in the right place | Match the printed suite outline, or leave as minor style detail |
| 8 | minor | 490–539, 1072–1102 | r160 `Solarium` poly leaves a notch uncovered at the starboard deck edge — shows as a cream hole in the band | Close the poly along the deck edge |
| 9 | minor | 177–179, 145–330 | r12, a 2 px x 185 px `circulacao` sliver (area 185) on the bow deck edge — invisible at phone size | Delete or merge into r11 |

## Checks that passed

- **Round-2 known defects are fixed**: both lift/stair rows are carved `circulacao` and no venue swallows them
  (bow `Elevadores` r174 at 251–348/612–696 covers the printed "Lift"; midship lifts r175/r176/r98 likewise);
  Tropical Pool (r157) and Atmosphere Pool (r78) are two SEPARATE dark-blue (`#8ecdf2`) water rooms nested in the light-blue deck.
- **Every venue name printed on the plan exists** in the same place with a sensible category: Solarium (r160, piscina),
  Tropical Pool (r157, piscina), Tropical Bar (r158, bar), Atmosphere Bar North (r160-bar, bar), Atmosphere Pool (r78, piscina),
  Atmosphere Bar South (r162, bar), Atmosphere Ice Cream Bar (r163, comida), Marketplace Buffet (r169, comida),
  Marketplace Bar (r170, bar), Marketplace Family & Kids (r171, comida), Sea Pavilion by Jereme Leung (r172, comida),
  Palco e pista de dança (r164, show). Each name is drawn ONCE, inside its venue (the plan writes the buffet twice; ours once — fine).
- **Cabins**: all 32 Yacht Club numbers 15001–15039 (minus 15017/15028/15030/15032/15034/15036/15038 — none of these is
  printed on the plan) sit in the correct cells; verified every cell in the bow rows and all four columns against the ref.
- **No magenta (`?`) rooms**; crew/restrito areas grey/beige; `Deck aberto` r11 does not swallow any labeled lift/stair.
- **texto**: all public-venue textos are correct pt-BR with accents (ç/ã/á/é/í/ó checked char by char in `specs/deck-15.json`),
  lengths 28–123 chars (within 25–260), factual, no invented prices or times.

## Scorer problems noticed (for the coordinator)

- The scorer gives r159 (sliver artifact, no name, texto copied from r160) semantics 1.00 and texto 1.00: it has no
  check for degenerate/zero-width rooms, nor for texto describing a venue type the room clearly is not. A minimum-area
  (or aspect-ratio) floor and a duplicate-texto check would catch this class.
- `edges` = 0.90 with two whole-side faults missed: r169's port side is 34–37 px inside the real wall over 545 px of
  length, and r160 has an uncovered notch. Either the tolerance is too loose or edges are scored against our own hull
  rather than the reference walls; a per-side residual check against the ref would catch it.
- No check that piscina WATER rooms approximate the actual water area — r157 water is ~3.1x the printed pool and scores full.
- Swallowed unlabeled stair/lift symbols cost nothing (deck 13 audit had the same blind spot for duplicated rooms).
- Overall: 99.16 with two majors visible at phone size. High score is not evidence of correctness — do not let the
  coordinator accept a deck on score alone.

# Audit deck 15, round 2, by independent auditor (Claude Code)

Verdict: FAIL
Score at audit time: 99.27 (hull 1.00, edges 0.92, cover 1.00, labels 1.00, semantics 1.00, cabins 1.00, cats 1.00, texto 1.00) — spec equals best, nothing was changed by this audit.

Audited the BEST version fresh, top to bottom, in five 600 px windows (`./pl view 15 --best --mode side`, y 0–600 … 3000–3434) plus 10 targeted overlay/ref/ours crops at scale 3–4 (r159 strip, r169 port edge, both pool waters, r158/r160, r162/r163 block, midship lifts, r108/r109 block, r164 stage, bow cabins, stern strip). Cross-checked `./pl rooms 15 --min-area 0` (132 rooms), `./pl labels 15`, polygon validity of all 132 rooms, point-in-polygon sampling of the rendered PNG, and every `texto` in `best/deck-15.json`.

## Re-verification of round-1 majors

- **r159 sliver — FIXED.** No r159 in the spec; the starboard strip x≈500–540, y672–1005 renders as clean light-blue deck in the overlay crop; no stray band at y672–675, no edge ribbon, no duplicated bar texto (the bar texto lives only on r160).
- **r169 Marketplace Buffet port edge — FIXED.** Overlay crop y2480–3070: the west edge now runs at x≈46–51 hugging the real hull wall for the whole y2501–3045 length, and the former notch x61–93 / y3000–3044 is covered (r171 continues to the same wall from y3044).

Round-1 minors #3, #4, #8, #9 are also fixed (r177/r180 water now match the printed pools incl. the whirlpool lobes; r178/r179/r181–r184 whirlpool basins added; r160 reaches the deck edge with no notch; r12 sliver deleted).

## Defects found in this round

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | major | 100–280, 1903–1985 (r162) | `r162 Atmosphere Bar South` renders with ~18% of its footprint as cream voids (base `#faf8f3` = the circulacao color) instead of the bar fill: measured 71% pink / 17.8% cream / 6.6% deck-blue inside its own footprint. Its polygon weaves around the counter furniture and r11 is carved away beneath, so the patches (100–183/1928–1944, 142–177/1903–1926 and the whole 199–279/1928–1985 block) are painted by nothing. At phone size the bar reads as pink Swiss cheese with wrong-color holes, unlike every other venue on the deck (r169 solid, r163's holes show deck blue). Shapely confirms those points are in no room. | Reshape r162 to one clean bar-floor polygon (x≈100–280, y≈1784–1985) like r107 on the port side, or at minimum fill/stop-carving the void patches so the whole venue is the bar color |
| 2 | major | 180–420, 2542–2637 (r170) | `r170 Marketplace Bar` north edge sits ~41 px north of the bar's real north wall across its whole 240 px width: the ref wall is at y≈2583 (curved wall with rounded corners, ref crops y2520–2680), ours is at y2542 — the rectangle swallows the open-deck strip where the plan prints the "Marketplace Bar" label. The other three sides match (south 2637 vs 2639, west 180 vs 182, east 420 vs 417). Whole-side fault > 15 px. | Reshape r170 to y≈2583–2639 (keep x180–420); ~42% of the current area is deck, not bar |
| 3 | minor | 163–258, 1741–1750 (r164) | `Palco e pista de dança` label is drawn once but ~43% of it lies WEST of the stage strip (room starts x204, label starts x163). Cause: `polylabel(strip, tolerance=2)` returns (211,1742) instead of the strip center (~298,1742) for thin rooms; the exported SVG inherits it. r171/r172 names also overflow their narrow rooms by ~11–23 px per side. | Fix label placement for thin/long rooms (bigger tolerance or centroid fallback), or store an explicit label point |
| 4 | minor | 350–452, 2213–2253 (r108) | `r108 Banheiros` is ~85% overpainted by `r109 circulacao` (drawn later): the toilets render as cream corridor with only a grey sliver near 356–384/2245–2257, and the "Banheiros" label floats on r109. Port twin r107 renders correctly as a grey block. | Draw r108 after r109 (reorder), or merge the stall block into r116's treatment |
| 5 | minor | 177–250 / 350–423, 518–593; 382–412, 438–467; ~505–540, 945–1000; 413–434, 913–944 | Unlabeled stair symbols still swallowed or unrepresented: the two hatched stairs inside restrito r54/r55, the hatched stair inside r41, and two deck-edge stairs left as plain deck. Cosmetic (the plan prints no names there) — same class round 1 accepted as minor. | Carve as `circulacao` where they sit inside named rooms |
| 6 | minor | 158–441, 2–42 | Bow-top crew band is still 6 restrito boxes (r1–r6) with visible seams; the plan shows one continuous grey strip | Merge into one `restrito` room |
| 7 | minor | 96–152 / 455–508, 160–190 | Corner YC suites 15011/15008 still drawn as single standard cells slightly smaller than the printed suite outlines; numbers are in the right cells | Match the printed suite outline, or accept as style |
| 8 | minor | 61, 3299 / 440, 3020 | `r150 Área externa do buffet` — the plan prints no name on the stern terrace; the descriptive pt-BR name/texto are factual but invented. r171/r172 labels overflow their rooms (see #3) | Keep, or note for the coordinator |
| 9 | minor | r16, r60, r95 | Self-intersecting (invalid) rings — render fine today (a few-px slivers), but they are one edit away from a fill artifact like #1 | Re-run reshape/merge to produce simple rings |

## Checks that passed

- **Round-2 known defect fixed**: no venue swallows a printed lift. Bow `Lift` (≈270–310/630–695) sits inside r174 `Elevadores`; both midship `Lift` texts (218–233/2058–2085 and 365–380/2058–2085) sit inside r175/r176 `Elevadores`, with every shaft column carved `circulacao` (r97/r99 port, r95/r100/r98 starboard). Stern corner stairs carved (r192/r193), strip-end stairs carved (r145/r146).
- **Pools**: Tropical Pool water r177 (268–330/799–919) and Atmosphere Pool water r180 (260–339/1216–1554) are separate dark-blue water rooms nested in the light-blue deck, and their outlines track the printed basins within ~2–4 px, including the Atmosphere Pool's whirlpool lobes; whirlpools r178/r179/r181–r184 cover the printed double-circle basins on the round platforms (r81/r82) and beside the pools.
- **Every venue name printed on the plan exists**, in the right place, with a sensible category: Solarium (r156, piscina), Tropical Pool (r177, piscina), Tropical Bar (r158, bar — footprint matches the printed island 231–372/1039–1099), Atmosphere Bar North (r160, bar), Atmosphere Pool (r180, piscina), Atmosphere Bar South (r162, bar), Atmosphere Ice Cream Bar (r163, comida), Marketplace Buffet (r169, comida, west edge on the hull wall), Marketplace Bar (r170, bar — but see #2), Marketplace Family & Kids (r171, comida), Sea Pavilion by Jereme Leung (r172, comida), Palco e pista de dança (r164, show). No name drawn twice; no magenta rooms; crew/restrito areas grey-beige; all 32 YC cabin numbers 15001–15039 (7 not printed on the plan) sit centered in the correct cells, verified per cell in the bow overlay.
- **texto**: all 34 texts are correct pt-BR with accents (suítes, espreguiçadeiras, à/bombordo/boreste, manhã, dança, café), 28–129 chars (within 25–260), factual, no invented prices or times; the paired rooms (r7–r10, r107/r108/r115/r116, r175/r176) share identical correct texts.

## Scorer problems noticed (for the coordinator)

- The scorer cannot see defect #1: r162 ships ~18% unpainted voids and scores cover/edges/semantics/texto 1.00. A fill-ratio check (room polygon area vs its bbox/convex footprint) or a "base-color pixels inside a named venue" check would catch this class — it is the same family as round 1's r159 sliver.
- `edges` = 0.92 while r170's north side is 41 px off the ref wall over 240 px (defect #2). As in round 1, the edge score appears to be measured against our own hull, not the reference walls; a per-side residual against ref walls would catch both this and round 1's r169.
- No check for one room overpainting another named room (r108 under r109, defect #4): a z-order/occlusion check (visible area of a named room ≈ 0) would catch it.
- Label placement: `polylabel(p, tolerance=2)` returns off-center anchors on thin rooms (r164 at x211 instead of ~298), so the exported SVG draws names partly outside their venue — this is a tools/render.py quirk, worth a narrow fix.

# Audit deck 15, round 3, by Claude Code (independent auditor)

Verdict: PASS
Score at audit time: 99.29 (hull 0.999, edges 0.919, cover 1.00, labels 1.00, semantics 1.00, cabins 1.00, cats 1.00, texto 1.00) — spec == best (diffed: identical), nothing was changed by this audit.

Audited the BEST version fresh, top to bottom, in six 600 px windows (`./pl view 15 --best --mode side`, y 0–600 … 3000–3434) plus 9 targeted ref/ours/overlay crops at scale 4–5 (r162 block, r170 block, r108/r109 block, r54/r55, r194, r195 + the disputed "505–540/945–1000" area, r156 south edge, Tropical Bar island, aft strips). Cross-checked `./pl rooms 15 --min-area 0` (134 rooms), `./pl labels 15`, shapely validity of all 134 polygons, pixel measurement of label positions, and every `texto` in `best/deck-15.json`.

## Re-verification of the round-2 majors — both FIXED

- **r162 `Atmosphere Bar South` — FIXED.** One clean bar-floor ring (92–280 × 1784–1987), rendered SOLID pink: no cream voids (the round-2 patches 100–183/1928–1944, 142–177/1903–1926, 199–279/1928–1985 are all painted). The poly follows the real walls on all four sides (overlay: north diagonal wall, west x≈100, east x≈280, south y≈1983 above the lift block), keeps the real-wall notch x92–100/y1939–1944 as deck, and does NOT swallow the nested lift shaft r94 (249–276 × 1945–1983 renders cream inside the SE corner) nor r163/r11. Name drawn once, inside.
- **r170 `Marketplace Bar` — FIXED.** North edge pulled to y2584 (182–417 × 2584–2637); overlay shows all four sides on the printed walls within ~3 px (west 181, east 417, south 2635–2637). The printed "Marketplace Bar" strip (label OCR center 296,2559) is open buffet floor again (r169 tan; pixel-checked: no bar fill, no grey print above y2584 in ours). Our label is drawn once, inside r170 (polylabel 208.5,2610.5 → ink center measured (209,2616)).

## Re-verification of the worker's extra fixes — all verified

- **r108 `Banheiros` — FIXED.** servico grey block 348–423 × 2211–2245, now fully visible (drawn after r109; only a ~3 px y2242–2245 line is shared), label sits on it; overlay shows it exactly over the printed stall block. Port twin r107 also renders grey over its stalls.
- **r54/r55 — FIXED.** Both reshaped to the full hatched stair blocks (182–245 / 354–416 × 521–570) as `circulacao`; overlay shows complete coverage of the printed hatching, sitting on the block walls.
- **r194 (365–402 × 434–453) — verified.** Covers the printed bow twin-stair hatch completely.
- **r195 (410–440 × 916–950) — verified,** and the round-2 audit's stair at "505–540, 945–1000" **does not exist**: the ref there is empty deck (checked at scale 4, plus the hull edge and watermark only). The genuine deck-edge stair is at x412–438/y916–948 and r195 (an angled quad following the walkway) covers it exactly. The worker's correction of the round-2 audit is right.
- **r156 `Solarium` south edge — verified.** Printed solarium content (label, loungers) ends at y≈1072–1074; the small 3-compartment rooms at x62–82 and empty deck follow. The snap to the wall mark at y1083 clips nothing.

## Full protocol checks (all passed)

- **Every venue name printed on the plan exists**, same place, same name, sensible category: Solarium (r156, piscina), Tropical Pool (r177, piscina, water), Tropical Bar (r158, bar), Atmosphere Bar North (r160, bar), Atmosphere Pool (r180, piscina, water), Atmosphere Bar South (r162, bar), Atmosphere Ice Cream Bar (r163, comida), Marketplace Buffet (r169, comida, west edge on the hull wall), Marketplace Bar (r170, bar), Marketplace Family & Kids (r171, comida — poly matches the printed strip x60–151), Sea Pavilion by Jereme Leung (r172, comida — poly matches the printed strip x441–505), Palco e pista de dança (r164, show; descriptive name, stage strip printed without a name). No name drawn twice; no magenta rooms.
- **Lifts/stairs**: printed "Lift" ×3 inside r174/r175/r176 `Elevadores`; all shaft columns carved `circulacao` (r94/r95/r97–r100, r98); stairs r54/r55/r101/r102/r105/r106/r185/r191/r192/r193/r194/r195/r145/r146 all `circulacao`; no venue swallows any of them.
- **Pools**: Tropical Pool water r177 and Atmosphere Pool water r180 are separate dark-blue basins nested in the light-blue deck (r157/r78 "Deck de sol"), tracking the printed basins incl. the Atmosphere whirlpool lobes; whirlpools r178/r179/r181–r184 cover the printed basins and the round platforms r81/r82.
- **Cabins**: all 32 YC numbers (15001–15039 minus the 7 not printed) sit centered in the correct cells — verified per cell in the bow window; corner suites 15011/15008 carry the BS marks.
- **No jagged artifacts or slivers**: r194/r195 are clean quads; r105/r106's comb outlines deliberately match the printed stair treads; nothing zig-zags at phone size.
- **Crew/restrito areas grey-beige** throughout (bow band, midship blocks, r84–r87).
- **texto**: all 33 named rooms' texts are correct pt-BR with accents (suítes, espreguiçadeiras, bombordo/boreste, à, área, só, hífen-free compounds checked), 28–129 chars (within 25–260), factual, no invented prices/times; paired rooms share identical correct texts.

## Defects found in this round (all minor)

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | minor | 158–229, 1037–1089 | `r158 Tropical Bar` covers only the main counter block (232–367 × 1043–1098). The printed fixture includes a rounded counter wing west of it (x≈158–229, y≈1037–1089, ring with capsule hole), joined to the block by a wall at y≈1084–1088 — ~3,000 px² (≈30% of the printed fixture) left as blue deck. Borderline: our west edge sits exactly on the block's real wall, and the plan centers its printed name on the block (center x≈293 vs block 297 vs full fixture 268); both earlier audits measured and passed the same footprint. Not a whole-side "ignores the walls" fault. | Reshape r158 west to x≈158 (or add the ring) if the coordinator wants the full printed island, mirroring r162's bar-floor treatment; costs a little edges score |
| 2 | minor | 159–176, 927–962 | Port twin of the r195 deck-edge stair (vertical hatched ladder with arrow) is still plain deck (r11). Round 2 missed it too (they looked only at the starboard side). | Carve as `circulacao` like r195 |
| 3 | minor | 180–215 / 385–420, 400–445; 361–388, 896–916 | Four small symmetric unlabeled symbols on the bow corridor/pool-deck walkway (stair or lift lobbies, no printed text) left as deck | Same cosmetic class rounds 1–2 accepted; carve only if a name ever shows |
| 4 | minor | 138–255, 1735–1750 | `Palco e pista de dança` label still starts ~66 px west of r164 (room starts x204): polylabel of a 188×14 strip returns x≈211 so the exported SVG name mostly floats over deck. Same for r171 (label spans 44–168, room 61–152) and r172 (label spans ~397–547, room 440–505) | Fix label placement for thin/long rooms in tools/render.py (bigger tolerance or centroid fallback), or store explicit label points — carried unchanged from round 2 |
| 5 | minor | r16, r60, r95 | The three self-intersecting (invalid) rings from round 2 are still invalid; they render fine (restrito/corridor areas) but are one edit away from a fill artifact | Re-run reshape/merge to produce simple rings — carried |
| 6 | minor | 158–441, 2–42 | Bow crew band still 6 restrito boxes (r1–r6) with visible seams; plan shows one continuous grey strip — carried | Merge into one `restrito` room |
| 7 | minor | 96–152 / 455–508, 160–190 | Corner YC suites 15011/15008 still standard-size cells vs the printed suite outlines; numbers correct — carried | Match printed outline or accept as style |
| 8 | minor | 61–538, 3299–3430 | `r150 Área externa do buffet` — plan prints no name on the stern terrace; descriptive pt-BR name/texto factual (same accepted class as round 2) | Keep, or note for the coordinator |

## Scorer problems noticed (for the coordinator)

- `labels` = 1.00 while exported names sit tens of px outside their rooms (defect #4): `polylabel(strip, tolerance=2)` anchors at the strip's blunt end for thin rooms. A narrow tools/render.py fix would improve every public deck's SVG, not the score.
- No scorer check reads omitted attached venue furniture (defect #1): edges/cover are measured against our own hull/rooms, so a venue that covers only part of its printed structure scores full. The per-side residual vs ref walls proposed in rounds 1–2 would catch this class too.
- Invalid self-intersecting polygons (r16/r60/r95) still cost nothing — a validity check would nudge workers to clean them.
- Cosmetic nit on the tooling: `./pl labels` prints OCR positions from the REAL plan (e.g. 'Marketplace Bar' at 296,2559), which is easy to misread as our label anchors (actual anchor 208.5,2610.5). The help text says it, but one header line in the output ("printed on the real plan at:") would save auditors a detour.
- Board note: deck 15's edges sits at 0.919 mostly because open-deck carve lines (r194/r195, stair blocks) have no wall to snap to — the promotion log's explanation is accurate; do not chase the 0.08.

## Round 3 fix (Sonnet)
- Carved r197 (circulacao, name "") out of r11 "Deck aberto": the whole indoor forward superstructure (central corridors x150-447 y123-607, full-width band y607-677 around the cabin/crew boxes, and the lift lobby funnel down to y735). Existing nested rooms stay inside it; r11 now starts at the outer deck (y677).
- Dropped r196, a 2 px sliver of r11 left over by the carve.
- Not changed: the aft lift/stair blocks (y1980-2500); carving them as rectangles lowered edges and the plan shows no enclosing walls, so they stay under r11 (open-deck colour in the gaps). Needs a human decision.
- Score 99.29 -> 99.27 (edges slightly lower), promoted.
