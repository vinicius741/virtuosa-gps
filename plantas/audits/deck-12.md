# Audit deck 12, round 1, by independent auditor (Claude)

Verdict: FAIL
Score at audit time: 99.97 (board 99.97, `./pl score 12` before the audit; no edits were made)

Walked top to bottom with `./pl view 12 --best --mode side` in windows 0–600, 500–700 (2x),
380–560 (2x), 0–190 (2x), 600–1200, 1200–1800, 1800–2400, 2400–3000, 3000–3523, 3140–3440 (2x),
3380–3523 (2x), 3400–3500 (3x), plus an `--mode ours` zoom at 1850–1960 (3x). Cabin numbers were
compared column by column against the real plan in every window.

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | major | 160–200, 1900–1925 | r9 (the big corridor room) carries the name `clift Gapp` (OCR junk). It is rendered mid-deck, overlapping cabin 12153's number, and the string is present in `export/deck-12.svg`. The real plan prints no such text anywhere near this spot (its only texts here are the hull-side "Panoramic Lift" and the CruiseMapper watermark). A gibberish invented name on a cabin deck that should print no venue names. | clear r9's name (`./pl set 12 r9 --name ""`); labels and texto are n/a on this deck, so the score should not drop |

Checks that passed:

- Cabins: every number printed on the real plan exists in the spec and sits in the right cell —
  bow duplex suites 12005/12003/12001/12004/12006/12008 (printed rotated on the plan; ours prints
  them horizontally in the same blocks) plus 12007/12010; columns 12009–12051, 12011–12041 (12043 in
  the left green column confirmed at 2x), 12020–12052, 12053–12197, 12188–12196, 12158–12186
  (real prints "12158H"/"12200H"; ours drops the H symbol, number correct), 12209–12237,
  12284–12310, 12314–12340, 12243–12271 / 12255–12271 / 12388–12404, and the stern row
  12273–12281 + 12386/12384/12382/12380/12378/12376 (verified at 3x; matches exactly). 340 unique
  numbers, no duplicates.
- Corridor/stairs/lifts: all `circulacao`; the bow lift banks (r25/r26 area), the "Lift" lobby at
  (124–196, 669–717) and the stair blocks r78/r79, r71/r72/r74 are on the real walls (overlay). No
  stair/lift block swallowed by a cabin or crew room.
- Small unlabeled rooms near the hull are `restrito` grey (r44–r57, r86–r98, r112–r115); no magenta.
- No jagged artifact bands; slivers r46/r85 are 1-px wall traces, invisible at phone size.
- No cream voids inside the hull.

## Minors (do not fail)

- Stern tip cells r116–r126 (y3493–3519, ~26 px tall each) are categorized `cabines`, but they are
  unlabeled slivers on the real plan (deck 13's analogous tip slivers were reclassified `restrito`).
  Invisible at phone size; suggest aligning with deck 13 for consistency.
- Accessibility "H" markers and cabin-class icons (●/▲/B, orange highlights on 12277/12279/12282/12280)
  printed on the real plan are not drawn. Style/labels detail (labels n/a on cabin decks).
- The plan's "Lift" and "Panoramic Lift" texts are not reproduced (lifts are unnamed `circulacao`),
  consistent with the no-names convention on the other cabin decks.

## Scorer problems noticed (for the coordinator)

1. Junk OCR names are invisible to the scorer on cabin decks: `labels` and `texto` are n/a, so a room
   name like r9's `clift Gapp` (deck 12) or r6's `app` (deck 13, see audits/deck-13.md) renders in the
   PNG and ships in the exported SVG with zero score penalty. Suggestion: for decks where labels are
   n/a, warn when any room has a non-empty name that is not a known lift/stair word
   (Elevadores/Escadas/Lift), or validate against the deck's OCR text list.
2. The duplicate-name check only fires on touching/overlapping pairs; same-name rooms separated by a
   small gap render the name twice and pass (same gap described in the deck-13 round-1 notes).

---

# Audit deck 12, round 2, by independent auditor (Claude)

Verdict: PASS
Score at audit time: 99.97 (board 99.97, `./pl score 12` before the audit; no edits were made, best == spec)

Purpose: re-verify the round-1 major and audit the whole deck fresh. Walked top to bottom with
`./pl view 12 --best --mode side` in windows 0–600, 600–1200, 1200–1800, 1800–2400, 2400–3000,
3000–3523, plus 2x zooms at 1900–2200, 0–200 and 1830–2000. Every cabin number compared column by
column against the real plan.

## Round-1 major re-verified: FIXED

`clift Gapp` on r9 is gone. `./pl rooms 12` shows all 126 rooms with empty names; `grep` over
`specs/deck-12.json`, `best/deck-12.json` and `export/deck-12.svg` finds no `clift`/`gapp` string;
the export contains only cabin-number texts; the windows show no text anywhere except cabin numbers
(the small red ids like `r9` are view debug annotations, not shipped content). The spot where the
junk used to render (160–200, 1900–1925) is clean at 2x.

## Checks that passed (fresh walk)

- Cabins: every number printed on the plan exists in the spec and sits in the right cell, verified
  per column in every window — bow duplex suites 12005/12003/12001/12004/12006/12008 on the printed
  dark blocks plus 12007/12010; left green 12009–12051 (12011 pink column correct, 12043 in the left
  green column), mid pink 12011–12041 and 12012/12014/12016, right pink 12020–12052H (H dropped as
  everywhere), right green 12018–12060, 12053–12197, 12188–12196, 12158H/12200H blocks,
  12209–12237, 12284–12310, 12314–12340, 12243–12271, 12388–12404, stern row 12273–12281 and
  12386–12376 — no missing, no duplicates, no wrong cell found.
- Circulation: the whole corridor net (r9), both lift banks (r62–r70 at y2087–2300 with the two
  printed `Lift` texts, bow bank r25–r36), stairs r71–r72/r74/r78–r79 (hatched on the plan), and the
  stern stairs r100–r111 are all `circulacao`; nothing swallows a stair or lift block. The
  panoramic-lift texts at the hull sides are not reproduced (consistent with the no-names
  convention on cabin decks).
- Small unlabeled hull rooms r44–r57, r86–r98, r112–r115 grey `restrito`; no magenta rooms.
- No jagged artifact bands; slivers r46/r85 are 1 px wall traces, invisible at phone size.
- No cream voids inside the hull; the stern tip is fully covered by r116–r126.
- No invented or junk names anywhere (there are zero room names on the deck).

## Minors (do not fail, unchanged from round 1)

- Stern tip cells r116–r126 (y3493–3519) are categorized `cabines` but are unlabeled slivers on the
  real plan (deck 13's analogous tip slivers are `restrito`). Invisible at phone size.
- The bow band above/around the duplex suites (r1–r8, y3–167) is drawn `restrito` (beige) while the
  real plan tints it light blue (open Yacht-Club deck). Same choice as deck 13's bow; categorizing
  it `circulacao` would be slightly closer, but nothing is mislabeled for the passenger.
- Accessibility `H` markers, class icons and the plan's `Lift`/`Panoramic Lift` texts are not drawn
  (style/labels detail; labels are n/a on this deck).

## Scorer problems noticed (for the coordinator)

1. Still open from round 1: on cabin decks `labels` and `texto` are n/a, so a junk room name costs
   nothing and only a human sees it render. The fixes here were manual; the suggested guard (warn
   when any room on a name-less deck carries a name outside the allowlist
   Elevadores/Escadas/Lift/…, or validate against the deck's OCR text list) is still not in the
   scorer. It would have caught deck 12's `clift Gapp` and deck 13's `app` automatically.
2. Duplicate-name check still only fires on touching/overlapping pairs; same-name rooms separated by
   a few px render the name twice and pass (see deck-13 rounds 1–2). Not triggered on this deck
   today (zero names), but the gap remains.

---

# Audit deck 12, round 3, by independent auditor (Claude)
Verdict: PASS
Score at audit time: 99.97 (board 99.97, `./pl score 12` before the audit; no edits were made, best == spec, sliver hint gone)

Purpose: verify the r46/r85 sliver drops and audit the whole deck fresh. Zoomed both drop bands
(`--y0 890 --y1 1160` and `--y0 2550 --y1 3040` at 4x–8x, plus `--mode ours`), then walked top to
bottom with `./pl view 12 --best --mode side` in windows 0–600, 600–1200, 1200–1800, 1800–2400,
2400–3000, 3000–3523 (plus a 5x zoom at 1180–1360). Read-only: board, score, rooms, view, spec files.

## Fix verification: r46 and r85 drops — VERIFIED, no coverage lost

- `r46`/`r85` are gone from `specs/deck-12.json` and `best/deck-12.json` (124 rooms now, was 126);
  no other room exists at x297±2 in the bands (nearest: r38 y660–756, r53 from y1309, r101 from
  y3093). Point-in-polygon on r9: the corridor strip x177–323 is inside r9 (`circulacao`) for both
  bands, so nothing was uncovered.
- Band 1 (r46 was x297–298, y901–1142): ours renders a continuous corridor, no hole, no stray line,
  no magenta. Pixel scan of x260–334, y900–1150 finds our lines only at x269.5–270, x323–324 and
  x326.5–328 (cabin/r9 edges, matching the real plan's thick wall band at x324.5–334.5). Strip
  interior x272–320 is 97.8% uniform r9 fill, remainder is view gridlines; zero dark pixels inside.
- Band 2 (r85 was x297–298, y2573–3020): same result — continuous fill, no stray line at x≈297, no
  hole, no magenta; seam x323–326 reads as a wall (fill + the two adjacent strokes), matching the
  real plan.
- Whole-deck scan: zero magenta-like pixels; no room with a bbox side <= 3 px (no remaining slivers);
  high-vertex rooms (r74 137 verts, r9/r100/r102) are the stair outlines and render as clean
  rectilinear stair boxes.

One correction to the fix's stated justification, for the record: the real double wall lines at
x≈294.5–296 and x≈300–301 are **not** "represented by r9's outline" — r9's polygon has no edges at
x295–301 anywhere (nearest edges x177 and x323), and the render has no dark pixels there. The real
lines exist only on parts of the bands (band 1 y996–1144; band 2 y2570–2930 with door gaps). The
dropped slivers did not represent them correctly either: they drew a single ~2 px line at
x296.5–298.5 over the full band lengths, including stretches where the real plan has no wall
(band 1 y901–995; band 2 y2600–2700 and y2880–2912), and never drew the second line at x≈300.5 at
all. So the drops removed an overdraw, not a correct representation; the unrepresented 5 px double
wall inside circulation is a pre-existing wall-detail omission (see minors).

## Checks that passed (fresh walk)

- Cabins: every number printed on the plan exists in the spec and sits in the right cell, compared
  column by column in every window — bow duplex 12005/12003/12001/12004/12006/12008 plus 12007/12010;
  left green 12009–12051 (12043 in the left green column); mid pink 12011–12041 with sub-cells
  12012/12014/12016 and 12002 rotated at top; right pink 12020–12052; right green 12018–12060;
  12053–12095, 12062–12128; 12097–12197; 12130–12156; 12158H/12200H blocks (letters dropped as
  everywhere, numbers correct); 12131/12135/12139; 12198–12214; 12143–12177; 12188–12196;
  12216–12252; 12218–12272; 12197–12207; 12272–12282; 12209–12237; 12284–12310; 12314–12340;
  12243–12271; 12388–12404; 12358–12374; 12346–12372; stern row 12273–12281 and
  12386/12384/12382/12380/12378/12376 (B prefixes dropped, numbers correct). 340 unique numbers,
  no duplicates, no missing, no wrong cell found.
- Circulation: whole corridor net r9; bow lift/stair bank r33–r43 (y560–790); the "Lift" lobby bank
  r62–r70 (y1930–2300, under the two printed `Lift` texts); stair clusters r71–r84 (y2223–3070) and
  r100–r111 (y3093–3388) are all `circulacao`; no stair or lift block inside a cabin room or venue.
- Small unlabeled hull rooms r44–r57, r86–r98, r112–r115 grey/beige `restrito`; corridor stubs r10,
  r13, r16, r19, r24, r53, r94, r96, r99, r101 `circulacao`. Category census: 41 restrito,
  72 circulacao, 11 cabines (stern tip r116–r126, carried minor). No magenta.
- Names: all 124 rooms have empty names and empty texto — correct for deck 12 (zero room names,
  only cabin numbers ship). No junk or invented names anywhere in spec, best or export texts.
- No jagged artifact bands; no cream voids inside the hull (cover 1.000); stern fully covered.

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | minor | 294–301, 996–1144 and 294–301, 2570–2930 | The real plan's interior double wall lines (x≈294.5–296 and x≈300–301, wall between the two cabin columns) are not drawn anywhere after the r46/r85 drops; r9 has no edges there. ~5 px detail inside circulation, invisible at phone size; the dropped slivers were an inaccurate overdraw of it, not a correct draw (see above). | Optional: one `restrito` riser strip x296–300 over the real line extents; risks re-triggering the sliver check for a 4 px room. Reasonable to leave as is. |
| 2 | minor | 190–260 and 360–430, 595–650; 133–195, 1192–1310 | Three stair-tread drawings are not carved as their own rooms (flat corridor in ours; the other stair blocks r71–r84/r100–r111 are carved). They sit inside r9 `circulacao`, so no semantics loss; consistent with rounds 1–2. | Carve as small `circulacao` rooms if consistency with the other stair blocks is wanted; cosmetic only. |
| 3 | minor | 39–461, 3493–3519 | Carried from rounds 1–2 (do not re-argue): stern tip cells r116–r126 categorized `cabines` though unlabeled on the plan (deck 13's analogous tip slivers are `restrito`). | Reclassify `restrito` for consistency, or accept. |
| 4 | minor | various | Carried: accessibility H / berth B markers and orange class highlights (12041H, 12158H, 12200H, B12277/B12279/B12382/B12380) not drawn — numbers correct; bow band r1–r8 beige `restrito` vs real light-blue tint; real `Lift`/`Panoramic Lift` texts not reproduced (no-names convention). | Style/labels detail; labels are n/a on this deck. |

## Scorer problems noticed (for the coordinator)

1. **Stale export — must re-run `./pl export` before shipping.** `export/deck-12.svg` (Nov 8 22:11)
   still contains the dropped r46/r85 polygons; they render as thin dark vertical lines at
   x≈296.5–298.5 through y901–1142 and y2573–3020 in the shipped SVG — exactly the stray lines the
   sliver check existed to remove. Best/spec (Nov 9 01:18/01:21) are clean and otherwise identical
   to the export (124 rooms, 340 numeric texts, nothing else differs). No content is lost by
   re-exporting.
2. The sliver check was right to flag 1 px degenerate rooms, but a bare drop can silently remove
   the only representation of real reference walls (here: two real wall lines at x≈295/x≈300.5).
   Suggestion for the sliver hint: when flagging a degenerate room, also print which reference wall
   edges (closed regions from cache) pass through its bbox, so the worker can choose redraw-vs-drop
   knowingly. (Suggestion only — auditors do not edit tools.)
3. Carried from rounds 1–2: no scorer guard against junk names on name-less cabin decks (moot here
   today: zero names), and the duplicate-name check still only fires on touching/overlapping pairs.
