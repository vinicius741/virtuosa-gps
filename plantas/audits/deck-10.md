# Audit deck 10, round 1, by Claude Code (glm-5.3-flash), independent auditor

Verdict: FAIL
Score at audit time: 99.89 (best = current spec)

Walked top to bottom with the best version in windows 0–600, 600–1200, 1200–1800, 1800–2400,
2400–3000, 3000–3549 (`--mode side`), plus targeted zooms (bow, pan lifts, 10342, aft stairs,
stern) and phone-width renders (380 px) of the defect spots. Deck has 142 rooms
(92 circulacao + 49 restrito + r146), 352 cabins, no venue names — correct for a cabin deck.

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | major | 205–295, 41–121 | The bow stairwell block (brown fill 124,110,92 in the real plan, stair-tread glyphs at both lower corners, landing diamonds, printed numbers 9003/9002) is room r146 with cat `restrito` — the map renders an enclosed passenger stair core as a grey crew space. Pixel-sampled: the block is MSC's brown stair fill; crew areas on this plan are grey (228,234,239). Decks 13/14 classify their identical cores as `circulacao` (named Escadas/Elevadores); deck 10 is the outlier | set r146 cat to `circulacao` (optionally name it "Escadas", following decks 13–14) |
| 2 | major | 15–112 and 379–489, 1854–1891 | Both `Panoramic Lift` lobbies are drawn as jagged combs: r8's outline degenerates into 6+ sawtooth teeth (amplitude ~8–10 px) where the plan has clean white rectangles (x8–105 and x388–492, y1836–1872) with the "Panoramic Lift" text. The comb traces the text glyphs of the plan. Confirmed visible at phone width (380 px render: rough sawtooth bands on both hull sides) | carve each Panoramic Lift lobby as its own `circulacao` room following the real rectangle walls (deck 14 already has rooms named "Panoramic Lift"), so r8's boundary there becomes straight |
| 3 | minor | 131–194 and 302–370, 2278–2305 (also 2320–2345) | Aft stair blocks drawn with small (~4 px) square teeth on their edges where the plan hatches treads; amplitude too small to read as an artifact at phone size | snap the teeth flat (optional) |
| 4 | minor | x296–298: r11 (y157–560), r64 (y1368–1669, 604 vertices), r86 (y2370–2596, 453 vertices) | Degenerate zero-width "rooms" (area 301–402 px², hundreds of vertices) that render as thin lines. They sit on real wall lines of the plan, so they look right, but they are garbage geometry | fold into r8's outline as simple wall segments (low priority) |
| 5 | minor | 35–465, 3510–3545 | Stern crew strip drawn as 11 separate grey boxes (r135–r145) with ~4 px white gaps; the plan draws one continuous grey strip with dividers | merge into one `restrito` strip or close the gaps |
| 6 | minor | 102–394, 3–31 | Bow-tip strip above cabins 10001–10006 drawn grey (r1–r4 `restrito`); the plan fills it white like corridor (sampled 252,253,252). Grey matches the house rule "unlabeled hull-edge = restrito" and deck 13's accepted choice, but deck 11 draws the same strip white — inconsistent between the two decks | coordinator's call; pick one treatment for all cabin decks |

Checks that passed:
- Cabins: all 351 numbers of the reference found in the right cells (the single scorer complaint,
  10342@(293,2947), is a false positive, see below; overlay-verified). Our extra cabin 10372 is real:
  the plan prints it between 10370 and 10374, the reference OCR lost it under the watermark.
  Sequences checked by cell on every window (odd/even sides, +2 steps).
- Lifts/stairs: every lift lobby and stair core outside row 1 is `circulacao`; no stair/lift block is
  swallowed by a cabin or venue (the "Lift" texts at (248,739) and (2168–2190) sit inside circulation).
- No magenta `?` rooms; crew areas grey (hull-edge cells, wedges r5/r6, stern strips); no invented
  venue names; no cream voids inside the hull (cover 1.000).

Scorer problems noticed (for the coordinator):
1. Cabin hint "Missing or misplaced: 10342@(293,2947)" is a false positive: in cache/deck-10/cabins.json
   the ref region for 10342 spans x203–383.5 (it merged the label with the www.cruisemapper.com watermark
   band at y≈2930–2960), so its center lands in the corridor. Our cell (207–268, 2937–2963) matches the
   printed pink cell exactly. Suggestion: when a ref cabin poly is much wider than a cabin cell
   (> ~1.6x median width), compare by poly overlap instead of center containment.
2. The same watermark makes the ref MISS real cabins: deck 10 prints 10372 and deck 11 prints 11272,
   both absent from cache/cabins.json but correctly present in our specs. No hint fires for them, but a
   worker "fixing counts" could delete them. Maybe worth an info hint instead of silence.
3. Nothing flags an enclosed stair core classified `restrito` (the bow block has no "Lift" text, and
   stair blocks have no OCR). Suggestion: a room whose ref pixels are dominated by the stair-brown
   (124,110,92) should be `circulacao`. Note the same brown bow block exists on deck 9 (there cat is
   `cabines`!), deck 12 (`restrito`, same as ours) and deck 13 (YC suites printed on it) — needs one
   fleet-wide policy, not a per-deck fix.
4. Zero-area degenerate polys (r64/r86 with 604/453 vertices) pass every check; a cheap hygiene check
   on polygon validity/fill-ratio would surface them.

---

# Audit deck 10, round 2, by Claude Code (glm-5.3-flash), independent auditor

Verdict: PASS
Score at audit time: 99.89 (best = current spec)

Walked top to bottom with the best version in windows 0–600, 600–1200, 1200–1800, 1800–2400,
2400–3000, 3000–3549 (`--mode side`), plus 3–6x zooms of the bow stairwell, both Panoramic Lift
lobbies, the mid-deck stairwell (y1200–1400), the aft stairs, cabin 10364 and cabin 10342, and a
phone-width (500 px) render of the pan-lift band. Re-verified both round-1 majors fixed; audited
the whole deck fresh.

Round-1 majors re-verified:
- Major 1 (bow stairwell): FIXED. r146 is now `circulacao` named "Escadas" (205–295, 41–121); the
  overlay shows the rectangle sitting exactly on the brown stair core's walls. The printed 9003/9002
  sit directly on the brown fill with tread hatching and deck-change diamonds — stair flight labels,
  not cabins (no white cells inside the brown), so not modeling them as cabins is correct. Treatment
  now matches decks 13/14 (stairs = `circulacao` "Escadas"/"Elevadores", pan lifts = "Panoramic Lift").
- Major 2 (Panoramic Lift lobbies): FIXED. Port r147 (8–110 × 1856–1889) and starboard r148
  (390–491 × 1856–1889) are clean rectangles on the real lobby walls, each name printed once inside;
  the round-1 sawtooth combs are gone and r8's outline runs straight past both lobbies. Verified at
  4x and at phone width.

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | minor | 134–192 and 306–366, 2294–2310 | Aft stair blocks keep ~4 px tread teeth on r82/r83 outlines (unchanged from round 1); invisible at phone width | snap flat (optional) |
| 2 | minor | 296,157 (r11) | Degenerate zero-width room (2 px wide, 402 px²) still present on the corridor wall line; r64/r86 from round 1 were folded, r11 was not | fold into r8's outline |
| 3 | minor | 42–457, 3510–3535 | Stern crew strip still drawn as 11 separate grey boxes (r135–r145) with small white gaps; the plan draws one continuous strip with dividers | merge into one `restrito` strip or close the gaps |
| 4 | minor | 104–294, 3–31 | Bow-tip strip r1–r4 drawn grey (`restrito`) while deck 11 draws the same strip white; the plan fills it white on both decks | coordinator's call: one treatment for all cabin decks |
| 5 | minor | mid-deck stairs (e.g. 202–260, 1215–1345) | Stair tread hatching not drawn; stairs render as plain white boxes (r61–r63 there) — fleet style choice, consistent with deck 11 | none needed |

Checks that passed:
- Cabins: sequences re-checked by cell in every window (odd/even sides, +2 steps, skipped numbers
  10052–10054, 10117, 10346–10348 block); all match the plan. 10372 is genuinely printed (between
  10370 and 10374) and correctly in the spec; 10342 renders in its correct cell (the scorer hint is
  the known watermark false positive). Stern row 10275–10410 complete incl. 10416/10414 B-suites.
- Lifts/stairs: every lift bank and stair core is `circulacao`; the "Lift" texts at (248,755) and
  (2136–2237) sit inside circulation rooms (r47–r53, r72–r79); nothing swallowed.
- No magenta `?` rooms (cats only circulacao/restrito); spec carries only "Escadas" + "Panoramic
  Lift" as names — no junk, no invented venues. Cover 1.000: no uncovered voids inside the hull
  (checked on every window's overlay).
- Wedges and hull-edge cells (r95–r110, r127–r134) align with the plan's taper.

Scorer problems noticed (for the coordinator):
1. Still open from round 1: cabin hint "Missing or misplaced: 10342@(293,2947)" is a false positive —
   the ref poly merged the label with the www.cruisemapper.com watermark band, so its center falls in
   the corridor; our cell matches the printed pink cell. Suggest overlap-based comparison when a ref
   cabin poly is much wider than a cell.
2. Still open: ref cabins.json misses real 10372 (deck 10) and 11272 (deck 11). No hint fires; a
   worker "fixing counts" could delete them. An info hint would protect them.
3. Still open: degenerate low-fill polys (r11, 2 px wide) pass every check; a cheap polygon-hygiene
   check (fill ratio / min width) would surface them.
4. Fleet policy: the bow stair core is `cabines` on deck 9, `circulacao` "Escadas" on deck 10 (this
   deck, now correct), `restrito` on decks 12–13. Deck 10's treatment is the faithful one for an
   enclosed stair core; worth one fleet-wide rule instead of per-deck choices.
5. Bow-tip strip grey-vs-white inconsistency with deck 11 (minor 4 above) needs one coordinator call.
