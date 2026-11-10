# Audit deck 7, round 1, by Claude (independent auditor, GLM)
Verdict: PASS
Score at audit time: 99.25 (current spec = best, confirmed by `./pl score 7`)

Method: `./pl board`, `./pl score 7`, `./pl rooms 7`, `./pl labels 7`; then the six 600 px
windows of `./pl view 7 --best --mode side` (0–600 … 3000–3586), plus overlay/ref zooms
(scale 4–6) of: bow tip and spa top (340–460), spa bottom (600–820), atrium/lifts (600–1200,
2190–2400), pub + TV studio (990–1180), Galleria and Kaito (1380–1800, 1590–1780),
Champagne bars (1950–2220), casino top/bottom (2440–2740, 2480–2680, 2980–3120),
stern/Carousel Lounge (3380–3586), and the side cells (1300–1500). Texts read from
`specs/deck-7.json` and cross-checked against `../src/data/navio.ts`.

Every name printed on the real plan was checked: MSC Aurea Spa (275,701), Lift (276,964),
TV Studio & Bar (415,1093), Masters of the Sea (142–161,1119), Galleria Virtuosa (276,1547),
Kaito Sushi Bar (140–160,1551), Kaito Teppanyaki (140–162,1662), Il Campo Restaurant
(384,1788 — plan prints vertical text ending in "o Restaurant"), Butcher's Cut (150,1821),
Champagne Bar (116,2074) and Champagne Bar (431,2074), Effy Shop Jewellery (119–140,2261),
Lift (207,2304), Lift (345,2303), Red Gem Casino (275,2813), Carousel Lounge (275,3468).
All 15 have a room in the same place, same name and a sensible category; every label is
written once and inside its venue. The two Champagne Bar rooms mirror the two prints on the
real plan (port/starboard, non-touching) — correct, not a duplicate defect.

Round-1 defects re-checked and fixed: r1 (bbox 57,404,454,378) no longer contains the
Kaito/Butcher's Cut rooms (they are at y≥1471); r172+r173 are merged into a single
Carousel Lounge whose scalloped outline follows the real scalloped wall.

Lifts: the 3 printed `Lift` labels sit at (276,964) → r8, (207,2304) → r8/r122,
(345,2303) → r8/r123 — all `circulacao`. The H-shaped lift cores at ~(151–260) and
(291–393, 2241–2343) are covered by r118/r122 (port) and r123/r117 (starboard) plus r8;
no part of a lift core falls inside a venue. Stair blocks (162/163 at 3231, 134/137 at 2362,
167/168 at 3366, 195 in the Galleria) are `circulacao`. No magenta rooms, no jagged bands.
Water: n/a on this deck.

Textos (all pt-BR, accented, 25–260 chars, factual, no invented prices/times): r1, r180,
r184, r185, r87, r93, r186, r98, r188=r191, r192, r193, r173 — verified word by word;
the seven that also exist on the site match `../src/data/navio.ts` exactly.

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | minor | 183,1085 | Masters of the Sea Pub right edge sits ~10 px inside the real wall (wall at x≈192–194, room drawn to x≈183–187 over its full height 1005–1165) | reshape right edge onto x≈193 |
| 2 | minor | 150,2100 | r188 Champagne Bar right edge ~8–10 px inside the real wall (real wall x≈158–161, drawn x≈150) | reshape right edge onto the wall |
| 3 | minor | 146,2230 | r192 Effy Shop: top-right corner ~8 px short of the real stepped wall (wall reaches x≈154 up to y≈2260) | reshape the corner |
| 4 | minor | 236,2600 | Red Gem Casino is a clean rectangle that covers the plan's interior details: entrance escalator strips (x≈230–242 and 308–320, y 2562–2655, crossing the top wall), two tiny hatched service stairs at the top corners (~122–135 and 418–428, 2631–2639) and an interior curved stair at ~(152–192, 2997–3025). The four sides themselves follow the walls (top 2562, bottom 3025, left 99, right 450 vs wall ≈442 — 8 px) | optionally carve the escalator strips as `circulacao`; otherwise acceptable — invisible at phone size, no printed Lift label swallowed |
| 5 | minor | 250,1690 | r195 (curved stair in the Galleria) is a rectangle that extends ~30–40 px below the real fan-shaped stair (fan ends ≈1698, room ends ≈1726–1738), leaving a white rectangle over open Galleria floor | reshape bottom edge to ≈1700 |
| 6 | minor | 275,650 | MSC Aurea Spa drawn as one room; the plan's internal partitions (treatment rooms, saunas — grey walls visible in the overlay) are not carved. The venue's own outer walls are followed, incl. the right-edge step at (476,668)→(511,668) | acceptable as one venue; optional nested rooms |
| 7 | minor | 207,2304 | Lift cores only partly carved: r122/r123 (216–256 / 294–333) cover the inner shafts, the outer shafts (153–195 / 333–393) are bare r8, and the r118/r117 alcoves sit above them. Category is `circulacao` everywhere, so no venue swallows a lift | optional: reshape r122/r123 over the full cores |
| 8 | minor | 275,300 | r194 bow tip is one unnamed 109k px² `restrito` block; the plan shows a few unlabeled rooms only at its bottom (y 340–373) and plain deck above | fine as a "no public venue" area; note for the human |
| 9 | minor | 40,1400 | Hull-side capsule rooms (rounded-corner blocks ~56×145 at spec x 15–71 / 479–535, repeated) are drawn as plain `circulacao` strips; the plan shows closed unnumbered cells (likely crew/service — no cabin numbers, and the scorer's cabin check is n/a here) | note for the human; consider `restrito` if they are crew |
| 10 | minor | 275,3575 | r178 is a 73×7 sliver of walkway behind the Lounge's scalloped bottom edge — harmless (correct cat, matches a real thin gap) but a sliver | could be merged into r8 |
| 11 | minor | 187,1644 | r87 and r93 overlap by ~10×8 px (x182–192, y1640–1648); same fill, invisible | trim r87's sliver to y≤1640 |

Not counted as defects, noted for the human:
- The site (`navio.ts`) lists "Salão de beleza" and "Biblioteca e joalheria" on deck 7, but
  the plan prints neither. The spec correctly does not invent them; the audit agrees.
  Effy Shop Jewellery is drawn as `loja`, which covers the site's "joalheria".
- Spec name "Il Campo Restaurant": the plan's vertical OCR only reads "oRestaurant", which is
  consistent with "…o Restaurant", but the name could not be confirmed from the plan alone.
- r176/r177 (curved bands flanking the Carousel Lounge) are drawn `restrito`; the plan shows
  them as enclosed unlabeled spaces, so grey is defensible, but they could be open-deck terraces.

Scorer problems noticed (for the coordinator):
1. Nothing punishes a named public venue for covering small hatched stair/escalator strips of
   the real plan (deck 7 casino, item 4). The "stair hatching inside a public venue" idea from
   PROMPT-ROUND2 section 6 would catch exactly this; it needs a small-area guard (the hatched
   regions here are <200 px², while furniture must not match).
2. The lift check is effectively vacuous on this deck: all three Lift labels fall inside the
   deck-wide r8 corridor, so semantics=1.00 even though only r122/r123 are carved near two of
   them. Not a drawing defect (r8 is `circulacao`), but the check cannot distinguish a real
   carve from the catch-all; a stricter variant would require the label inside a *nested*
   circulacao room on decks that have one.
3. No sliver check: r178 (73×7, 511 px²) passes silently. An "unnamed room with aspect > 8 or
   area < 600 px²" hint would be cheap and safe.
4. `./pl score 7` prints an empty "Hints:" even with edges=0.933; the edge loss (unrepresented
   interior walls) gives workers no pointer. Low priority.
