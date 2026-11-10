# Scorer changes — round 2 (scorer-maintainer agent)

All changes were made by the scorer maintainer after the round-2 audits, with no worker running.
Procedure per change: file backed up (`tools/*.py.bak-round2-*`), `uv run python -m py_compile tools/*.py`,
tested on the deck that produced the evidence, then `./pl rescore-best all` + `./pl board` at the end
and the side effects checked on all 14 decks. Decks that moved: 9, 12, 14 — all three moved because the
new regression-insurance checks found real defects that are still in their saved best specs (each is
listed below with its hint). No deck's drop is a scorer bug; nothing was reverted.

Board before -> after (best scores, all 14 decks; the after column is the final board after all changes):

```
deck   before   after
  5    99.65    99.65
  6    99.04    99.04
  7    99.25    99.25
  8    99.74    99.74
  9    99.97    99.72   (change 4: sliver r24 — real defect, see below)
 10    99.89    99.89
 11    99.97    99.97
 12    99.97    99.47   (change 4: slivers r46+r85 — real defects)
 13    99.97    99.97
 14    99.94    97.94   (change 2: cabins 14097+14101, 14102+14106 share one poly — real defects)
 15    99.29    99.29
 16    98.34    98.34
 18    99.56    99.56
 19    96.68    96.68
```

Current specs and best specs are identical for every deck (verified after the final board), so these
drops are best-score corrections, not worker regressions.

## 1. Cabin ranges: several ranges per deck; deck 13 duplex numbers; deck 9 cabin 9000
- Problem: the plan genuinely prints cabins outside the "official" range, and the hint told workers
  to "fix" real cabins as OCR mistakes. Deck 13's bow MSC Yacht Club duplex suites really print
  12001–12008 (numbered from the lower deck; audits/deck-13.md rounds 1–2, visually verified against
  the plan), and deck 9 really prints cabin 9000 (OCR conf 0.998; audits/deck-9.md round 1 called the
  hint a false positive). A worker following the old hint would damage a correct spec.
- Change: `tools/score.py` — `RANGES` values are now lists of ranges and `deck_range()` returns a list.
  Deck 13 gets `[(13001, 13402), (12001, 12008)]`, deck 9 becomes `(9000, 9316)`. The "outside range"
  test passes if the number is inside ANY of the deck's ranges. The info/gaps line still uses the first
  (main) range. Hint now says "verify visually in ./pl view before changing a number (duplex suites are
  printed with the lower-deck number)" instead of bare "probably OCR mistakes".
- Board before -> after: no deck moved (hints and the info line only; no weight or penalty touched):
  5: 99.65, 6: 99.04, 7: 99.25, 8: 99.74, 9: 99.72, 10: 99.89, 11: 99.97, 12: 99.47, 13: 99.97,
  14: 97.94, 15: 99.29, 16: 98.34, 18: 99.56, 19: 96.68 (deck 9/12/14 movements below, from other entries).
- Why this is not gaming: it stops the scorer from telling workers to delete cabins that are really
  printed on the plan; the ranges are reference data, like the existing table.

## 2. Duplicate-cabin check (two numbers on one poly)
- Problem: a double-height cell the OCR read twice produced two cabins with the SAME poly; the rendered
  map prints both numbers on top of each other and one is unreadable. Deck 8 shipped 10 such pairs
  (all 10 were confirmed majors in audits/deck-8.md rounds 1–2); the scorer gave them 1.000 because it
  only checks that each number's point is inside its poly. Deck 14 still has two: 14097+14101
  (shared poly x188–250, y1603–1660; real divider visible at y≈1620) and 14102+14106 (x350–411,
  y1662–1719; divider at y≈1669) — visually confirmed against the reference image; the deck-14 audit
  missed them.
- Change: `tools/score.py`, penalties section — flag cabin pairs whose polys share more than 50% of the
  smaller area (prefiltered with the cabin STR-tree, like the room-overlap check). Penalty
  `min(5, 1.0 * pairs)` plus a hint listing the pairs and the fix (cabin-drop both, cabin-add the two
  halves along the real divider).
- Board before -> after: deck 14 99.94 -> 97.94 (2 real pairs found; hint lists `14097+14101;
  14102+14106`). All other decks unchanged: 5: 99.65, 6: 99.04, 7: 99.25, 8: 99.74, 9: 99.72, 10: 99.89,
  11: 99.97, 12: 99.47, 13: 99.97, 15: 99.29, 16: 98.34, 18: 99.56, 19: 96.68. Deck 8 (the deck with the
  10 fixed pairs) shows no change, which is the regression insurance working: its current best is clean.
- Why this is not gaming: it adds points for a defect class a human flagged as major ten times on
  deck 8; the penalty matches the room-overlap penalty's scale.
- Errata (post-fix): the divider rows quoted above (y≈1620 and y≈1669) were cabin number-TEXT rows,
  not walls. Pixel-verified against ../public/img/decks/deck-14.webp, the real divider wall rows are
  y1631–1632 (pair 14097/14101) and y1690–1691 (pair 14102+14106) — solid 100%-dark rows, aligned
  with sibling columns 14099/14103 and 14104/14108. The deck-14 fix (best/deck-14.json, promoted at
  99.74 -> later 99.92) used these measured wall rows.

## 3. Cabin-oversize check (poly far bigger than its real cell)
- Problem: a spec cabin that leaked a double-height cell or swallowed a corridor band scored 1.000:
  deck 8 cabin 8231 shipped as a band ~4x its real cell, deck 9's 9112/9256/9266 leaked doubles
  (audits/deck-8.md, audits/deck-9.md). All are fixed in the current bests, so this check is
  regression insurance: it fires only if a worker reintroduces the defect.
- Change: `tools/score.py`, penalties section — each spec cabin is matched to its cache cell
  (`cache/deck-N/cabins.json`, read-only) BY NUMBER; if the spec poly's area exceeds 1.6x the cache
  cell's area it is flagged, penalty `min(5, 1.0 * count)` plus a hint with both areas. Cabins whose
  number is not in the cache (hand-added cells, e.g. deck 13's duplex suites 12001–12008, which the
  OCR cannot attribute to deck 13 because they start with "12") are skipped, and cache cells under
  500px² (OCR text boxes, not real cells) are skipped. Nearest-centroid matching was measured and
  REJECTED: it would match deck 13's hand-added duplexes to small neighbouring cache cells and
  false-flag all six (~-5.0).
- Board before -> after: no deck moved. Largest ratio found in any current best: 1.33 (deck 8 cabin
  8223, a legitimately redrawn cell) — under the 1.6 threshold, as intended.
- Why this is not gaming: it catches a leak class the audits called major, and every escape hatch
  (unmatched number, tiny reference cell) skips rather than risks a false accusation.

## 4. Degenerate-sliver check (wiggle strips with hundreds of vertices)
- Problem: rooms that are really the tracer having traced a wall line render as stray thin lines and
  passed every check: deck 10 r64/r86 (604/453 vertices, audits/deck-10.md rounds 1–2), deck 11
  r54/r66/r75 (audits/deck-11.md — both audits asked for "a cheap polygon-hygiene check"), deck 15
  round-1 r159 (98x3 band, audits/deck-15.md). The check found the same garbage still living in
  "clean" bests: deck 9 r24 (634 verts, 632px²), deck 12 r46 (484 verts, 232px²) and r85 (896 verts,
  417px²).
- Change: `tools/score.py`, penalties section — a room with >= 200 vertices on <= 2000px² is flagged;
  penalty like `tiny` (`min(5, 0.25 * each)`) plus a hint with ids, fill % and vertex counts.
  Calibration from all 14 bests: real rooms with >= 200 verts all have >= 22,000px² (hull-following
  deck areas); the most-vertex legit room on a small area is 76 verts/1,272px², the smallest artifact
  is 484 verts — the threshold sits in the gap. The task's literal rule (`poly.area / bbox.area < 0.05`)
  was measured and REJECTED: audited-clean diagonal corridors and hairline wall strips also have
  fill < 0.05 (deck 5 r74/r85, deck 6 r70/r179, deck 7 r131, deck 12 r53/r101/r111, deck 14 r72,
  deck 18 r167) and would have been penalised as slivers (deck 12 -0.75) — deck 6 r70 is a walkable
  4,120px² corridor (inscribed radius 8.2px), clearly not a sliver. Deck 5's r75 (the must-not-fire
  case) is a clean 75x6 rectangle, fill 100%, 4 verts — safe under both rules.
- Board before -> after: deck 9 99.97 -> 99.72, deck 12 99.97 -> 99.47 (real wiggle strips found; hints
  name r24, r46, r85 with fill and vertex counts). All other decks unchanged.
- Why this is not gaming: it penalises garbage geometry the audits explicitly asked to penalise, with
  a threshold calibrated on measured real cases, and the accepted thin-but-real rooms stay unpunished.

## 5. Carve crash guard (GeometryCollection in `to_coords`)
- Problem: when a carve/reshape cut's corners snap onto lines coincident with the room's own boundary,
  `base.intersection(cut)` returns a GeometryCollection and `to_coords` raised
  `AttributeError: 'GeometryCollection' object has no attribute 'exterior'` — reported by the deck 15,
  18 and 10/11 workers; the command died mid-edit.
- Change: `tools/spec.py`, `to_coords()` — if the geometry is a GeometryCollection, keep only the
  polygonal parts (`[g for g in gc.geoms if hasattr(g, "exterior")]`), union them (MultiPolygon still
  resolves to the largest piece, as before), and proceed; an empty result raises a clear SystemExit
  ("the edit produced an empty polygon ... Nudge the shape by 1-2 px") instead of crashing. Guards
  carve, reshape and merge alike.
- Board before -> after: no deck moved (crash guard only; no scoring code touched).
- Why this is not gaming: it makes a crashing tool command work without changing any score semantics.

## 6. Preview name truncation 28 -> 40 characters
- Problem: preview PNGs truncated room names at 28 characters, so names like "Infinity
  Reception-Guest Service" (32) rendered cut ("...Ser"). (The export SVG never truncated; only the
  preview renderer did.)
- Change: `tools/render.py`, `draw_ours()` — `txt[:28]` -> `txt[:40]`.
- Board before -> after: no deck moved (rendering only).
- Why this is not gaming: it is a rendering fix; scores never read this string.
  (Note: deck 5's "Elevadores panorâmicos" still runs past the hull edge at x≈470 — that is the
  separate hull-edge clipping problem listed under "Not implemented".)

## 7. Lift hint names the misoutlined room instead of telling the worker to carve a new block
- Problem: deck 19 round-1 audit — the printed Lift sat outside a badly outlined existing
  `circulacao` room, but the hint blamed the enclosing venue and told the worker to carve a NEW
  block, sending them to fix the wrong room.
- Change: `tools/score.py`, lift check — when the printed Lift is not inside a `circulacao` room but
  one comes within 40px of the label, the hint now names THAT room: "the outline of rX 'Elevadores'
  ends Npx short of the printed lift - extend it onto the shaft walls". Only when no `circulacao`
  room is near does it still say to carve. Same `lift_bad` count, so semantics is unchanged.
- Board before -> after: no deck moved (hint wording only; totals identical).
- Why this is not gaming: pure hint routing — it points the worker at the room that is actually
  wrong, verified with a synthetic deck-19 case (r41 shifted 60px: hint names r41 and does not say
  "carve").

## 8. Panoramic lifts join the lift check; Atrium exemption
- Problem: `ref.py` drops every label matching "panoramic lift" (fuzz >= 85) as watermark noise and
  the lift check only matched exact "lift"/"lifts" — so a venue swallowing a panoramic-lift shaft
  lost no points. This is exactly how deck 5's round-1 major (r104 Infinity Bar covering the
  starboard shaft, audits/deck-5.md) scored 100 before a human caught it.
- Change: `tools/score.py`, lift check only — labels normalising exactly to "panoramic lift"/
  "panoramic lifts" join the lift set from the raw OCR list, so a venue covering a panoramic shaft
  now loses semantics points. Two narrow exemptions: (a) a covered-or-6px tolerance, because a
  vertical label's OCR box is wider than the shaft it sits in (deck 13's port label reads 5.5px
  outside its shaft room; the labels check uses the same 6px tolerance); (b) labels inside a room
  whose name contains "Atrium" are exempt — the glass lifts can stand open in an atrium with no
  shaft walls to carve (the deck 5 case PROMPT-ROUND2 section 3 describes). Verified: on all current
  bests every panoramic label is covered (decks 5, 9, 10, 11, 12, 13, 14), so no best moved; a
  synthetic deck-13 case with a shop over the shaft loses 0.4 semantics.
- Board before -> after: no deck moved. (Adding covered lifts to the semantics denominator leaves
  1.00 decks at 1.00; decks 16/18/19 have no panoramic labels.)
- Why this is not gaming: it closes a scored-in blind spot the auditor documented; the exemption is
  one word pattern ("Atrium") tied to a specific real geometry (open glass lifts), not a deck/id case.
- Note: `ref.py`'s blanket drop was NOT changed (see "Not implemented"): un-dropping the labels would
  push them into the labels part (weight 20), where pt-BR room names like "Elevadores panorâmicos"
  can never reach the fuzz >= 80 name match — seven decks would have taken large false drops. The
  geometric check now covers what the drop used to hide.

## 9. Junk-name warning on decks with no reference labels
- Problem: cabin decks print no venue names, so OCR fragments copied as room names shipped unnoticed
  at 1.000: 'dde' (deck 11), 'eMa' (decks 8/9 — still in both bests today), 'clift Gapp' (deck 12),
  'app' (deck 13) (audits/deck-8..13).
- Change: `tools/score.py`, hint before the penalties section — on a deck with no `venue_labels`, any
  non-empty room name whose de-accented, lowercased form is not in a small allowlist (escada(s),
  elevadores, lift(s), panoramic lift(s), navigation bridge, ponte de navegacao, area da tripulacao,
  area de servico, cabines/cabins) gets a hint "junk name suspected", explicitly marked hint-only.
  De-accenting is required because `norm()` turns accented letters into spaces ('Área da
  tripulação' would otherwise never match — that false positive was caught in testing and fixed).
- Board before -> after: no deck moved (hint only, no penalty). It currently flags r1/r101 'eMa' on
  decks 8 and 9 — both really are OCR junk still sitting in the saved bests; decks 10–13 are clean.
- Why this is not gaming: it is a hint, cannot move a score, and its only job is to stop junk words
  from reaching the public map.

# Not implemented (and why)

- **Duplicate-name proximity check** (same-name rooms with a small gap): contradicts PROMPT-ROUND2
  section 1 — separate same-name rooms are legitimate (4 Solariums, Whirlpools, named stair flights).
  The existing duplicate check already punishes touching/overlapping same-name pairs.
- **`edges` measured against the stale cached lines raster:** `edges` compares drawn outlines with
  `cache/deck-N/lines.png`, which misses faint walls, so a visually better outline can score worse
  (documented by deck 8's -0.06 promotion in best/promotions.log). `cache/` is untouchable, so the
  raster cannot be refreshed from here; regenerating it would change every deck's `edges` at once.
  Left alone deliberately.
- **`merge` silently dropping pieces at buffer ties + `to_coords` dropping holes:** both are known,
  documented behaviours (merge warns and keeps the biggest piece; `to_coords` returns only the exterior
  ring). Fixing them changes spec semantics for every existing deck and command, which is too risky in
  a maintenance pass with auditors running; the new GeometryCollection guard (change 5) touches only
  the crash path.
- **Flat ~0.59 texto penalty per unnamed public room:** naming a piece of an open area just to escape
  the texto penalty pushes workers to merge distinct spaces or invent names. Changing the texto weight
  would re-rank every public deck at once; needs its own calibrated pass, not a side change.
- **Render clipping long names at the hull edge:** names near the hull boundary (deck 5 r118
  "Elevadores panorâmicos" at x≈470, r93 at x≈10) are drawn centred and run past the image edge.
  Truncation (change 6) was not the cause there; fixing it needs edge-aware label placement or
  shrinking, i.e. real layout logic in `draw_ours()`/`label_points()`. Left for a dedicated change.
- **`ref.py` fuzz >= 85 "panoramic lift" blanket drop (previously undocumented):** unchanged, now
  documented (change 8 note). It still suppresses those labels from the *name-matching* labels part,
  which is where un-dropping would cause false drops; the *geometric* swallow blind spot it used to
  hide is closed by the lift check instead.
- **Deck 10 r11-class wall lines** (2px wide, ~400px², few vertices, hugging a real wall line):
  audits call them minor "fragile garbage geometry". No measured geometric rule separates them from
  the accepted wall-line strips on clean decks (deck 13 has five 4-vertex rooms with inscribed radius
  1.0px) — every threshold that catches r11 also flags accepted rooms. Left to workers via the audits;
  the sliver check covers the many-vertex variant of the class.

# Verification log

- `uv run python -m py_compile tools/*.py` after every edit: OK.
- Unit tests (in-memory spec copies, no spec file touched): `to_coords` GeometryCollection guard
  (polygon+line GC, GC of two polygons, line-only GC -> clear error, MultiPolygon/plain Polygon
  unchanged); lift check (clean bests unchanged; panoramic swallow fires and costs semantics; 6px
  tolerance covers the deck-13 boundary case; misoutlined r41 on deck 19 produces the "extend onto
  the shaft walls" message, not "carve").
- `./pl score 13` / `./pl score 9`: the duplex/9000 false "outside range" hints are gone; info line
  stays on the main range. `./pl score 5`: no sliver/hint change (r75/r110/r74/r85 safe).
- `./pl rescore-best all` + `./pl board`: only decks 9, 12, 14 moved (their real defects, listed
  above); the other 11 decks are identical. `specs/` == `best/` for all 14 decks afterwards.
- `git status --short` from the repo root: only `?? plantas/` — nothing outside `plantas/` changed.
- Backups kept: `tools/score.py.bak-round2-maint`, `tools/spec.py.bak-round2-carve`,
  `tools/render.py.bak-round2-txt40`, `tools/ref.py.bak-round2-pano` (ref.py ended up unchanged).

# Round 3 (Claude, after reviewing round 2)

## 10. Hull keeps every drawing piece (decks 18 and 19)
- Problem: `ref.hull_and_regions` kept only the biggest connected blob as the ship outline. Decks 18 and 19
  are drawn as two separate pieces (bow and stern, nothing in between), and the bow piece is open at the
  bottom, so the flood fill leaked into it. The bow halves (y < ~1260 / ~650) had no hull: no outline or
  background in the render, and hull/edges never looked at them. Round-2 audits passed defects there.
- Change: `tools/ref.py` new `hull_of()` caps the open top/bottom row of each drawing piece and keeps
  every piece >= 5% of the biggest; `spec.hull` may now be a list of polygons (`spec.hull_parts()`,
  used by score.py and render.py). New command `./pl rehull N` recomputes only the hull (no OCR) and
  copies it into specs/ and best/. Decks 5–16: hull mask identical (deck 7 +0.03%, cache not rewritten).
- Board: deck 18 99.56 -> 99.44, deck 19 96.68 -> 96.65 (edges now also checks the bow outline).
