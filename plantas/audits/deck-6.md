# Audit deck 6, round 1, by auditor (independent, Claude Code sub-agent)

Verdict: PASS
Score at audit time: 99.04 (current spec == best, nothing changed by the audit)

Protocol followed: `./pl board`, `./pl score 6`, then side-by-side windows 0–600, 600–1200,
1200–1800, 1800–2400, 2400–3000, 3000–3600, 3600–3765 with `./pl view 6 --best --mode side`,
plus `--mode overlay` zooms (scale 3–8) of every public venue and `--mode ref` where the walls
needed checking. Textos read from `specs/deck-6.json` and cross-checked with `../src/data/navio.ts`.

## What was checked and is right

- All 30 OCR labels of the real plan are matched, one room each, name written once, inside the
  venue: Le Grand Théâtre (r34, show), Galleria Virtuosa (r26, loja), Virtuosa Bar & Lounge (r141,
  bar), Virtuosa Boutique (r144), HOLA! Tacos & Cantina (r149), Jean-Philippe Chocolat & Café
  (r150), Jean-Philippe Crêpes & Gelato (r151), MSC Excursions (r152, servico), Luxury Plaza (r156),
  Indochine Restaurant (r155), L'Atelier Bar & Art (r157, bar), The Art Wall (r158), Shopping
  Gallery (r160), MSC Foundation Centre (r161, servico), MSC Shop (r164), Fashion Jewellery (r167),
  MSC Starship Club (r169, bar), THE HUB Photo & Digit@l (r171), Photo Gallery (r173), Emotions
  Immersive Gallery (r175), The Opera (r177) / The Symphony (r180) (port/starboard assignment
  matches the plan), Minuetto (r182). No duplicated names; no magenta (`?`) rooms; deck 6 has no
  cabins (`cabins n/a`), correct.
- The round-1 known defects are fixed: the theatre seating (arcs y≈600–780) is inside r34 with a
  clean outline that follows the real walls, including the zig-zag wall at y≈460–520 and the stage
  protrusion at y≈780–800 — no jagged white band left. The Galleria lift/stair blocks are carved:
  the three printed `Lift` labels sit inside `Elevadores` rooms (r184 at (247,981); r83/r84 at
  (150,2417) and (365,2415)) and both stair cores are their own `Escadas` rooms (r87, r88,
  hatching drawn inside). Outlines of HOLA!, Chocolat, Crêpes, MSC Excursions, Luxury Plaza,
  Indochine, L'Atelier, The Art Wall, Shopping Gallery, MSC Foundation Centre, MSC Shop, Fashion
  Jewellery, Starship Club, THE HUB, Photo Gallery, Opera/Symphony and Minuetto sit on the real
  walls (checked at scale 3–8), including the chamfered corner of MSC Shop, the right-hand jut of
  Fashion Jewellery and the notched bottom of Virtuosa Bar & Lounge.
- Unnamed areas: cabin rows r3–r24 and the foredeck block r27/r28/r29 (forward of the stage, real
  walls at x≈147 and x≈350) are unnamed on the plan and drawn as `restrito`; corridors/stairs are
  `circulacao`; crew rooms (r46, r50, r97–r100, r105/r106, r110, r128–r131) beige. Correct per the
  playbook. Open stairs of the promenade (grand staircase y≈2185–2330, spiral stair x≈213–233,
  escalator near the boutique) stay inside the Galleria, consistent throughout.
- Textos: 24 textos, all pt-BR with accents, 50–141 chars, factual; the paid/included claims
  (HOLA!, Jean-Philippe x2, Indochine, Starship Club "fora dos pacotes de bebidas", Opera/Symphony
  "incluído na tarifa, turno e mesa no app") match `../src/data/navio.ts`. No invented prices or
  times found.

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | minor | 150,2600 | The two small stair cells in front of the aft rooms — (107–200, 2585–2620) and (300–391, 2585–2620), treads visible — are half covered by r175 (Emotions Immersive Gallery, teal) and half left as a thin undrawn gap between r175 and r100/r99 | carve each cell as `circulacao` "Escadas" along its walls (same treatment as r87/r88) and let r100/r99 absorb the lower halves |
| 2 | minor | 30,1360 | Curved escalator/stair symbol inside r149 HOLA! (10–50, 1335–1385) is under the venue fill; it is open (no closing walls), so it reads as an internal feature | acceptable; carve as `circulacao` only if a source confirms it is a public stair |
| 3 | minor | 130,1490 | Stair symbol inside r151 Crêpes & Gelato (112–154, 1471–1514) is under the venue fill; its mirror twin on the starboard side is carved as circulation | same treatment for symmetry |
| 4 | minor | 250,3759 | r135/r136/r137 are 4 px-tall slivers (~320 px² each) inside the stern wall band at y 3757–3761 | merge/drop them if the scorer tolerates the cover loss; invisible at phone size |
| 5 | minor | 85,3355 | r115–r118 are 9 px-wide strips and r126/r127 13 px-tall strips; thin, but they do sit on real walls of the galley area | acceptable; could be merged with the neighbouring counters |
| 6 | minor | 466,460 | r33 is a thin frame room (367 px²) around r32; it matches the real double outline of that hull-side room | none needed |
| 7 | minor | 188,1750 | r157 L'Atelier top-right corner overlaps the outer ring of the spiral stair by ~4–6 px | pull the corner ~5 px to the left |
| 8 | minor | 247,2740 | r174 is `circulacao` with an empty name but has an 87-char `texto` ("Trecho final da avenida…"); PROMPT 6.2 says textos are for public rooms | remove the texto (do not invent a name for a corridor) |

Scorer problems noticed (for the coordinator):
- The lift check works (all three `Lift` prints are in `Elevadores` rooms), but nothing looks at
  stairs: the stair symbols of item 1–3 sit inside public venues and semantics is still 1.00. The
  "stair hatching inside a public venue" idea from PROMPT-ROUND2 section 6 would have caught items
  1–3; item 1 is the only one where a venue fill visibly covers part of a walled stair cell.
- Tiny-room penalty starts below 150 px², so 4 px-tall rooms of ~320 px² (r135–r137) and 8–9 px-wide
  strips (r10, r115–r118) pass silently. A perimeter/area "thin strip" hint (calibrated to exempt
  stairs) would surface them.
- The `texto` check does not notice a texto on a non-public, unnamed room (r174). A hint could list
  textos on rooms whose `cat` is not public.
- `edges` 0.913 produces no hint; the residual loss comes from carving lines across open areas and
  the small gap of item 1, which cover/edges tolerate. Fine as is, just noting where the 0.9 lives.

No earlier audit existed for deck 6; this file is round 1.
