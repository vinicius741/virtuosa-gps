# Audit deck 5, round 1, by Claude (auditor subagent, Claude Code)
Verdict: FAIL
Score at audit time: 99.65

Windows inspected top to bottom with `./pl view 5 --best --mode side` (0-600, 600-1200, 1200-1800, 1800-2400,
2400-3000, 3000-3600, 3600-3724) plus zooms at y120-480, 330-445, 730-860, 745-805, 752-800, 795-845, 900-1060,
985-1075, 1195-1300, 1420-1590, 1432-1492, 1495-1570, 1960-2180, 2040-2290, 2430-2500, 2700-3240, 3215-3570.
Spec == best (99.65). All 11 printed venue names on the real plan have a room in the right place with the right
name and a sensible category (`Le Grand Théâtre` show, `Blue Danube` comida, `Infinity Bar` bar, `Infinity
Atrium`/`Infinity Reception-Guest Service`/`Business Centre`/`MSC Excursions`/`MSC Future Cruise` servico,
`Toaletes` x2 servico, `Lift` x2 -> `Elevadores` circulacao as sanctioned). Names are drawn once, inside the venue.
Cabins: all 134 spec numbers are exactly the 134 reference numbers; spot-checked cells (5001/5002, 5014, 5019/5020,
5037-5048, 5065/5067/5069, 5075-5090, 5115-5143, 5163/5165) sit in the right cells. No jagged artifact bands, no
magenta rooms; crew areas grey; `bar` lavender is the palette colour (tools/render.py), not an artifact. Bow,
midship corridors and lift blocks trace the real walls tightly in the overlay.

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | major | 394,2100 | r104 `Infinity Bar` texto invents a time: "…com música ao vivo no fim da tarde." The site copy for this exact bar (src/data/navio.ts, deck 5) says only "Bar do átrio, ao lado da recepção."; the live-music claim belongs to the atrium, and "no fim da tarde" is unverifiable | Drop the invented detail, e.g. "Bar do átrio, ao lado da recepção. Bebidas conforme o pacote." (66 chars) |
| 2 | minor | 205,780 | Theatre r3 runs ~55 px aft past the wall at y≈750 through the strip between the two stage-tech blocks (x≈205-300, y≈750-805); the plan's wall line there is ambiguous (may be an open passage), so it may be right | If the wall closes at y≈750, reshape r3's aft edge in that strip; else leave as is and note it |
| 3 | minor | 130,1455 | r36 (114-145,1445-1470), r35 and r37 (331-382,1441-1474) are grey `restrito` boxes carved inside the midship stair blocks — they are the stair well/shaft, not crew rooms; r37 also sits ~10-15 px left of the real second box (365-400) | Recategorize as `circulacao` (unnamed or "Escadas") and nudge r37 right onto the real box |
| 4 | minor | 377,1530 | r40 grey box sits ~15 px low on the small structure at (351-400,1501-1540) and spills ~19 px into the corridor below; the structure reads as stair/technical, so `restrito` is doubtful | Reshape onto walls y1501-1540 and use `circulacao` |
| 5 | minor | 165,3284 | r75 is a 75x6 px sliver tracing the wall line above the aft toilets (a wall read as a room) | Merge into r77 or delete the room |
| 6 | minor | 425,775 | r18 (`restrito`) covers a small hatched stair/grate at (411-445,771-782); same pattern as r83/r77 over the aft steps structure at (155-234,3355-3405) | Prefer `circulacao` wherever stair hatching shows |
| 7 | minor | 250,2870 | Blue Danube r114 is one clean rectangle while the plan draws two walled octagonal islands inside (≈60-230 and ≈280-430, y2755-2985) — likely the galley/serving blocks (the site lists a "Cozinha" on deck 5, and r68 next to them is already `restrito`) | If confirmed galley, nest them as `restrito` rooms inside r114; otherwise fine |
| 8 | minor | 15,2150 | Plan prints "Panoramic Lift" on both sides (port x≈5-20, starboard x≈425-440, y2050-2260); ours covers the shafts with unnamed `circulacao` (r93/r100 port, r102/r99 starboard) — no room carries the printed name | Name them "Elevadores panorâmicos" (`circulacao`); the atrium texto already mentions the glass lifts |
| 9 | minor | 250,3640 | r88 fills the whole stern strip (3-496,3563-3720) as `restrito`; the plan shows an empty walled space with nothing printed | Keep grey only if it is technical/crew; if it is open deck, use `circulacao` |
| 10 | minor | 250,2110 | PNG preview draws r97's name truncated: "Infinity Reception-Guest Ser" — tools/render.py cuts labels at `txt[:28]`. The exported SVG has the full correct name, so the deliverable is right, but every `./pl view` PNG (what audits judge) shows it wrong | Fix the preview: wrap to two lines like the plan, or shrink the font, instead of truncating |

Scorer problems noticed (for the coordinator):

- **Preview truncation (tools/render.py ~line 106):** `txt[:28]` truncates drawn names in all PNG previews. "Infinity
  Reception-Guest Service" reads "Infinity Reception-Guest Ser" in `./pl view`. The SVG export (line ~188) is correct.
  Audits and workers judge the PNGs, so this wastes audit time and can hide real name errors. Suggest wrapping to two
  lines (the plan itself uses two lines here) or font shrink.
- **Blanket "panoramic lift" exemption (tools/ref.py ~line 246):** any OCR label with `fuzz.partial_ratio(norm,
  "panoramic lift") >= 85` is dropped as if it were watermark noise, on every deck. PROMPT-ROUND2 section 3 asked for a
  *narrow* exemption (labels inside a room named "Atrium" whose lifts have no walls). As written, no deck can ever be
  asked for a named panoramic-lift room. Either scope it geometrically or document it in `SCORER_CHANGES.md` as
  sanctioned (RELATORIO.md round 1 already accepted unnamed shafts inside corridors).
- **No sliver check:** r75 (75x6 px) passes all checks. The "jagged outline / sliver" idea in section 6 would catch it.
- **Stair-blind semantics:** the only stair signal the scorer reads is the printed word "Lift", so `restrito` boxes
  carved inside stair blocks (r36/r35/r37/r40/r18/r83 on this deck) pass. If hatch detection (section 6 idea) is ever
  implemented, these would be flagged.
- **Texto check cannot ground soft claims:** "no fim da tarde" passes because it is not a price or a clock time. It took
  a manual comparison with `src/data/navio.ts` to catch it; a checklist hint comparing spec textos against the site copy
  (exact-substring or fuzzy) would flag invented details automatically.

# Audit deck 5, round 2, by Claude (independent auditor subagent, Claude Code / GLM)
Verdict: FAIL
Score at audit time: 99.65 (spec == best)

**Round-1 major re-verification:** FIXED. r104 `Infinity Bar` texto is now exactly the site copy
"Bar do átrio, ao lado da recepção." (34 chars) — the invented "com música ao vivo no fim da tarde" is gone
(src/data/navio.ts line 367 matches verbatim). The "música ao vivo" claim now lives only in r101 `Infinity
Atrium`, where the site's own atrium copy has it. No other texto invents prices/times; all 10 textos are
correct pt-BR with accents, 25–260 chars.

Windows inspected top to bottom with `./pl view 5 --best --mode side` (0-600, 600-1200, 1200-1800, 1800-2400,
2400-3000, 3000-3600, 3560-3724) plus overlay/ours zooms at y700-860, y820-1000, y1940-2050, y2020-2290,
y2030-2200 and y2038-2095 (scale 4). All 11 printed venue names have a room in the right place with the right
name and category (`Le Grand Théâtre` show, `Blue Danube` comida, `Infinity Bar` bar, `Infinity
Atrium`/`Infinity Reception-Guest Service`/`Business Centre`/`MSC Excursions`/`MSC Future Cruise`/`Toaletes` x2
servico, `Lift` x3 -> `Elevadores` x2 + unnamed circulacao per round-1 sanction). Names drawn once each, inside
their venues. Cabins: scorer says the 134 spec numbers are exactly the 134 reference numbers; spot-checked cells
(5001-5012, 5037-5064, 5065/5067/5069/5071/5073, 5075-5113, 5145-5165, 5085-5135) sit in the right cells in the
overlay. No jagged bands, no magenta rooms; crew/stage areas grey; outlines trace walls tightly except where
noted below.

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | major | 479,2060 | r104 `Infinity Bar` (bar) swallows the starboard panoramic-lift strip: its polygon spans x394-496, y2044-2115 and covers the lift's walled bracket block (x462-489, y2049-2084) plus the landing around it, right where the plan prints "Panoramic Lift" vertically (label at 479,2135, text runs y2055-2196). The port shaft is correctly `circulacao` (r93), so the deck is asymmetric: the bar covers the top ~70 px of the shaft and the top third of the printed label, and r102 only resumes as circulation below y2115. The polygon weaves around the bracket's inner ~20x30 px, which is why the scorer sees nothing | Carve the strip x≈452-496, y2044-2115 out of r104 as `circulacao` (merge into r102, or a new "Elevadores panorâmicos" mirroring r93), leaving the bar as x394-452, y2044-2115 |
| 2 | minor | 240,763 | Theatre r3 dips below the plan's aft wall at y763 in the strip x204-276 (points [204,826],[276,826] in its polygon): the wall line at y763 runs across the whole deck (top of r14-r21), and the strip may be the theatre's exit vestibule — carried from round 1 (#2), still ambiguous | If the strip is a passage, keep; if it is backstage, flatten r3's aft edge to y763 in that strip |
| 3 | minor | 350,1445 | r35/r36/r37 (midship stair wells) and r40, r18/r21, r83, r84 are grey `restrito` boxes inside stair/hatch structures — carried from round 1 (#3, #4, #6) | Prefer `circulacao` wherever stair hatching shows |
| 4 | minor | 128,3281 | r75 is still the 75x6 px sliver above the aft toilets; same class: r110 (292,2559,6,158) is a 6 px wide vertical strip that may be a wall read as a room (round 1 #5 carried) | Merge r75 into r77; check the plan at x292-298 for a real corridor before keeping r110 |
| 5 | minor | 15,2120 | Port/starboard panoramic-lift shafts are unnamed `circulacao` while the plan prints "Panoramic Lift" twice (round 1 #8 carried; note r93/r100/r99/r102 cover them, but the starboard top is in r104 — see #1) | Name r93 (and the carved starboard strip) "Elevadores panorâmicos" |
| 6 | minor | 250,3640 | r88 still fills the whole stern strip (3-496, 3563-3720) as `restrito` on an empty walled space with nothing printed (round 1 #9 carried) | Keep grey only if technical/crew; else `circulacao` |
| 7 | minor | 250,2119 | PNG preview still truncates "Infinity Reception-Guest Ser" (tools/render.py `txt[:28]`); the SVG export is correct (round 1 #10 carried) | Wrap to two lines or shrink font in the preview |
| 8 | minor | 55,2149 | "MSC Excursions" / "MSC Future Cruise" names are drawn horizontally and overflow their 46 px wide rooms into the neighbouring strip (the plan draws them vertically inside); style only, name still reads at phone size | Render narrow-room names vertically like the plan |
| 9 | minor | 250,2760 | Blue Danube r114 is a clean rectangle while the plan's dining room has angled (octagon) corners and two walled islands inside (round 1 #7 carried) | Trace the octagon corners, or nest the islands as `restrito` if confirmed galley |

Scorer problems noticed (for the coordinator):

- **Panoramic-lift exemption is why defect #1 scores 100 (tools/ref.py line 246 + tools/score.py line 176).**
  The two "Panoramic Lift" labels are dropped as watermark noise (`fuzz.partial_ratio(norm, "panoramic lift") >= 85`),
  and the lift-swallow check only tests `norm(text) in ("lift", "lifts")` — which can never match, since plain
  "Lift" is in the STOP list too... the three plain "Lift" labels (248,965 / 179,2367 / 319,2367) do survive in
  `cache/deck-5/labels.json` and are checked, but "Panoramic Lift" is never geometrically checked. A venue can
  swallow a panoramic-lift shaft (r104) and lose nothing. Suggest: keep "panoramic lift" out of the
  required-names list, but include it in the lift-position check (must be inside a `circulacao` room) — that
  single change would have flagged #1 here.
- Carried from round 1: preview truncation (`txt[:28]`), no sliver check (r75/r110 pass), stair-hatch blindness
  (`restrito` inside hatched stairs passes), and the texto check cannot ground soft claims against the site copy.

# Audit deck 5, round 3 (worker self-check after fixing round-2 #1), by deck-5 worker (Claude Code / GLM)
Verdict: PASS
Score at audit time: 99.65 (spec == best, all parts 1.000 except edges 0.960)

**Round-2 major re-verification:** FIXED. The starboard panoramic-lift strip is carved out of the bar: r118
"Elevadores panorâmicos" (`circulacao`, x416-496, y2044-2115 after merging the leftover wedge) now covers the
shaft block (walls x452/x483, y2051-2082), the landing and the top of the aft staircase, mirroring port r93;
r104 `Infinity Bar` is back to x394-452. Measured walls from cache/deck-5/lines.png before carving: block top
y2051 (x440-480 with notch x453-456), left wall x452, right wall x483, bottom y2066/y2082, stair treads
x470-487 below. The counter arc (x414-436, y2055-2058) + stub (y2051, x440-452) close the wedge x416-452
y2044-2056 off from the bar, so the carve split it out (r117) and it was merged into r118 — it opens only
toward the lift landing. Overlay checked at scale 6: boundary sits on the wall x452; "Panoramic Lift" print
now fully inside circulation. r93 + r118 named "Elevadores panorâmicos" (round-2 #5; note below on clipping).

Windows re-inspected top to bottom with `./pl view 5 --best --mode side` (0-600, 600-1200, 1200-1800,
1800-2400, 2400-3000, 3000-3600, 3600-3724) plus zooms of the lift strip, the bar, the midship stairs,
the aft crew core and the Blue Danube interior. All printed venue names still have the right room/category;
cabins unchanged (134/134 per scorer); no magenta, no jagged bands.

Changes made this round (all score-neutral, kept for visual correctness):
- r118 carved from r104 + wedge merged in, named "Elevadores panorâmicos" (major #1 fix).
- r93 renamed "Elevadores panorâmicos" (round-1 #8 / round-2 #5).
- r35, r36, r37, r40: `restrito` -> `circulacao` (round-1 #3/#4, round-2 #3): r36 and r35/r37 sit on hatched
  stair treads (treads verified in the wall mask at x348-383, y1455-1475), and the port mirror of all four
  (inside r34) was already `circulacao`.
- r83 merged into r77 (redundant nested restrito box on the U-counter inside the same crew core).

Round-2 minors checked and deliberately kept (with evidence):
- #2 theatre r3 dip (x204-276, y766-826): wall mask shows NO wall at y763 across x204-278; the strip is boxed
  by x202/x278 (y749-828) and y828, open only at the top into the theatre -> theatre floor. Keep.
- #4 slivers: r110 (292-298, 2559-2717) is a real walled passage (walls x290 and x297/300). r75 (128-203,
  3281-3287) is NOT a wall read as a room: it is a real enclosed compartment — top wall y3279 (x126-205),
  sides x126/x205 (y3280-3288), bottom wall y3289 (x110-222). Keep both.
- #6 r18/r21 "hatched stair/grate at (411-445,771-782)": no hatch exists there — wall mask x396-500 y740-840
  shows only the boundary wall x398 and an empty box; port mirror r14 is also `restrito`. Keep `restrito`.
- #9 Blue Danube "two walled octagonal islands": the interior lines (x61-136 / x363-438, y2790-2945) are
  broken single-px decorative furniture outlines, not closed walls, and nothing identifies them as galley —
  carving them as rooms would invent walls. Keep r114 as one room.
- #6/round-1 #9 r88 stern strip: fully enclosed empty compartment, no stair/lift connects into it, nothing
  printed -> most likely back-of-house; keep `restrito` (auditors' own condition "keep grey if technical/crew").

Scorer problems noticed (for the coordinator):

- **Confirmed (round-2 auditor): panoramic-lift blind spot.** tools/ref.py drops every label with
  `fuzz.partial_ratio(norm, "panoramic lift") >= 85` as watermark noise, and the lift check only matches
  names exactly "lift"/"lifts" — so swallowing a panoramic-lift shaft cost 0 points. r104 scored 100 before
  the fix. Including "panoramic lift" labels in the geometric must-be-`circulacao` check would flag this class.
- **PNG name clipping for circulation rooms (carry, with new data):** tools/render.py draws names horizontally
  centred on the room's open spot; for the narrow strips the text starts outside the hull ("Elevadores
  panorâmicos" on r93 clips at x<0 and collides with "MSC Excursions"; on r118 it clips at x500). The SVG
  export never draws visible text for `circulacao` rooms (tools/render.py ~line 180), so the clipping only
  misleads PNG-based audits; the name still reaches the site via the `data-nome` attribute (line 175) and the
  JSON export. Vertical names for narrow rooms (round-2 #8) would fix the whole class.
- **Naive sliver check would now misfire on this deck:** r75 is a real 75x9 px walled compartment, so a
  blanket "sliver" rule (any room thinner than ~8 px) would demand a wrong merge. If the sliver check is
  implemented, scope it to rooms whose polygon has no enclosed wall on both long sides.
- **edges 0.960 gives no hint about which outlines are off-wall**, so the last 0.04 is not actionable —
  fine to leave.

# Audit deck 5, round 4, by Claude (independent auditor subagent, Claude Code / GLM)
Verdict: PASS
Score at audit time: 99.65 (spec == best, all parts 1.000 except edges 0.960)

**Round-2 major re-verification (r104 vs starboard panoramic lift): FIXED, verified at pixel level.**
Rendered ref/ours/overlay at scale 8 for y2035-2130 and measured. r104 `Infinity Bar` (bar) is now
x394-452, y2044-2115 (poly ends x450/452; lavender fill solid, one clean notch, no holes — not Swiss
cheese; r117 no longer exists in the spec, it was merged into r118). The r104/r118 boundary sits on the
real wall x452 (ref wall x452, y2051-2082; our boundary x450-452 there — 0-2 px). The shaft block
(ref walls: top y2051 x440-480 with notch x453-456, right x483-485, bottom y2066, stair treads
x460-487 below y2066) is entirely outside the bar and inside r118 `Elevadores panorâmicos`
(`circulacao`, x416-496, y2044-2115), which traces the shaft walls (dashed circulation outline at
y2049-2050 / x485 / y2068 within 1-2 px of the ref lines) and covers the landing and all treads down to
y2115; r102 continues as circulation below, so the printed vertical "Panoramic Lift" label
(x≈485, y2055-2196) falls 100% inside circulation (r118 + r102). Port r93 carries the same name, so the
sides mirror. Point-in-polygon checks: the stair/landing strip (470,2072)…(470,2110) all in r118;
(466-470,2121+) in r102; the wedge above the counter arc (420-445,2046-2048) in r118.

**Round-1 major re-verification (r104 texto): FIXED.** `specs/deck-5.json` r104 texto is exactly
"Bar do átrio, ao lado da recepção." (34 chars) — byte-identical to the site copy
(src/data/navio.ts line 367). The invented "com música ao vivo no fim da tarde" is gone; the
"música ao vivo" claim now lives only in r101 `Infinity Atrium`, which is grounded in the site's own
atrium copy (navio.ts line 332: "Átrio com os elevadores panorâmicos de vidro e música ao vivo").
All 10 textos are correct pt-BR with accents, 25-260 chars, and grounded: r3 ≈ verbatim site copy,
r97 matches the 24-h reception copy (line 360), r114 ≈ verbatim (line 372), r94/r95 match the
"Excursões" copy (line 368; r95's "descontos a bordo" is a soft, verifiable MSC onboard-booking
claim, no invented price/time).

**Worker's other fixes verified:**
- r35/r36/r37/r40 are now `circulacao` (white, no grey) and sit on the real hatched stair treads:
  overlay at scale 8 of y1430-1560 shows r36 on the port hatched block (x114-144, y1445-1465),
  r35/r37 on the starboard hatched block (x331-382) with treads at x330-368, y1462-1477, and r40
  outline (x358-396, y1516-1559) hugging the small walled structure including its bottom tab;
  r37 is now on the walls (round-1's 10-15 px offset is gone). The port mirror inside r34 is
  circulation too, so the treatment is symmetric.
- r83 merged into r77: `./pl rooms 5` has no r83; overlay of y3270-3430 shows r77 as one grey
  `restrito` compartment (x111-220, y3291-3411) whose outline includes the U-counter and its
  hatching; stairs r82 and r79/r81, boxes r75/r76/r80/r78/r87/r88 all still there — nothing lost.
- r93 + r118 both named "Elevadores panorâmicos" (round-1 #8 / round-2 #5 closed).
- `./pl labels 5`: all 10 tracked printed labels map to the right room with the right name/category
  (t1→r3 show, t153/t157→r92, t160→r95, t161→r104 at (416,2107) — still inside the carved bar,
  t162→r94, t165/t166→r97, t168→r101, t175→r114). Plain "Lift" prints sit in r115/r116 "Elevadores"
  and the r93/r118 strips. Names drawn once each; no duplicates.
- Windows inspected top to bottom with `./pl view 5 --best --mode side` (0-600, 600-1200, 1200-1800,
  1800-2400, 2400-3000, 3000-3600, 3600-3724) plus zooms: side y2000-2150 s4, ref/ours/overlay
  y2035-2130 s8, overlay y2030-2130 s6, side y1420-1580 s6, overlay y1430-1560 s8, side y3200-3450 s5,
  overlay y3270-3430 s6, overlay y3480-3620 s7. No jagged artifact bands, no slivers newly visible, no
  magenta rooms; crew areas grey; `bar` lavender is the palette colour. Cabins: scorer 134/134 and
  cabins=1.000; spot-checked cells (5001-5036, 5014, 5065/5067, 5037-5090, 5115-5143, 5163/5165) sit
  in the right cells in the overlays.

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | minor | 470,2055 | The shaft-car interior (x454-485, y2049-2069) is excluded from r118's polygon and covered by no room, while the port twin IS covered (r100 covers x18-43 block interior; point test (30,2055)/(20,2062)→r100, starboard (470,2055)→uncovered). Invisible at phone size (white-on-white) and the exclusion mirrors r93's sanctioned shape, but the two sides are not treated the same | Extend r118 over the block interior (x454-485, y2049-2069), or carve the same block out of r100 on port — pick one treatment for both sides |
| 2 | minor | 452,2100 | r104/r118 boundary x452 continues y2082-2115 where the ref has no wall (open-plan edge), and x416-452 y2044-2051 sits above the wall's start y2051 | Keep — clean straight edge on the wall line; only note it |
| 3 | minor | 425,2058 | r104's notch runs ~2-3 px outside the ref counter arc (ref (436,2055)→(431,2058); ours (437,2058)→(432,2060)→(421,2060)) | Keep; within tolerance |
| 4 | minor | 240,763 | Theatre r3 dip below y763 in x204-276 (carried from rounds 1-2); worker's wall-mask evidence says the strip is boxed and open only into the theatre, so kept | Leave as is |
| 5 | minor | 128,3281 | r75 sliver and r110 thin passage kept as real walled compartments (carried; worker showed enclosing walls on all sides) | Leave as is |
| 6 | minor | 250,3640 | r88 still fills the whole stern strip as `restrito` on an empty enclosed space (carried from rounds 1-2) | Keep grey only if technical/crew; else `circulacao` |
| 7 | minor | 250,2760 | Blue Danube r114 is a clean rectangle over the plan's angled corners and two interior furniture islands (carried; worker showed the interior lines are broken decorative outlines, not walls) | Leave; optionally trace the octagon corners someday |
| 8 | minor | 250,2119 | PNG preview still truncates "Infinity Reception-Guest Ser" (tools/render.py `txt[:28]`) and clips the new "Elevadores panorâmicos" names at the canvas edges (r93 clips at x<0, r118 at x500); the SVG export is correct (carried) | Wrap/shrink/vertical text in the preview renderer |
| 9 | minor | 343,3520 | Small hatched crew stair sits INSIDE grey r84 (and a diagonal hatch inside r85 at ~160,3580) — crew stairs inside back-of-house compartments, symmetric, walled; not a public stair block, so not raised to major | If the stair-hatch check is ever implemented, exempt hatching fully enclosed by one `restrito` compartment |

Scorer problems noticed (for the coordinator):

- **Still open (carried from rounds 2-3): panoramic-lift blind spot.** tools/ref.py drops every
  "Panoramic Lift" label as watermark noise and the lift check only matches names exactly
  "lift"/"lifts", so a venue could still swallow a panoramic-lift strip and lose nothing — r104
  scored 100 before the round-2 fix, which was done by hand. Including "panoramic lift" in the
  geometric must-be-`circulacao` check (without making it a required name) would flag this class.
- **Carried: preview name truncation/clipping** (`txt[:28]`; horizontal clipping for narrow
  circulation rooms). PNG-only, but PNGs are what audits judge.
- **Carried: no sliver/uncovered-hole check.** New data point: r118's excluded shaft interior passes
  cover=1.000, so a future "uncovered region" check would need to ignore small named-shaft-class
  interiors or it would misfire here (same scoping caution as the worker's r75 sliver note).
- **Texto grounding is still manual**: soft claims (r95 "aproveitar descontos a bordo") cannot be
  auto-verified; a hint comparing spec textos against src/data/navio.ts copy (fuzzy substring) would
  close the class that produced the round-1 major.
