# Round 2: polish the public decks, audit everything, and own the scorer

You did round 1 well: every deck reached 97+ honestly, and the cabin decks (8–14) are good.
A human reviewer compared your drawings with the real plans and found problems the scorer
could not see. In round 2 you have **more responsibility**:

1. **Fix** the public decks (5, 6, 7, 15, 16, 18, 19) until they look right, not just score right.
2. **Audit** every deck with fresh eyes before calling it done (section 5).
3. **Improve the scorer** whenever it misses a real defect or punishes something correct (section 6).
   The scorer is your tool now, not a fixed exam. Use the rules in section 6 to keep it honest.

The goal is unchanged: `export/deck-N.svg` must look like the real plan in our colours, with every venue
in the right place, with the right outline and the right name, so passengers can tap it on their phones.
**A deck is done when a careful human comparing the two images side by side would find nothing wrong.**
The score is a means to that end, not the end.

Read `plantas/PROMPT.md` first (sections 1, 3, 4, 5, 6, 7). Everything there still applies,
except where this file changes it. Work from inside `plantas/`.

---

## 1. What changed since round 1 (already done for you)

**New scorer checks** (all decks were re-scored with them, which is why some scores dropped):
- **lifts:** each `Lift` printed on the real plan must be inside a `circulacao` room. A venue or deck area
  that swallows a lift/stair block now loses semantics points. The hint lists the lift positions.
- **duplicate:** two rooms with the same name that touch or overlap cost 0.5 points each pair, because the map
  shows the name twice. Merge them, or rename the piece that is not really that venue.
  Separate, non-touching rooms with the same name (for example 4 separate solariums) are fine.
- **Himalayan Bridge / ropes / arvorismo** are now expected to be `esporte`. Before, the word "bridge" demanded `restrito`.

**New commands:**
- `./pl reshape N rID --poly "x1,y1 x2,y2 ..."` gives a room a **new outline** (snapped to walls) and cuts that
  area away from the rooms it overlaps. Rooms entirely inside the new outline stay as nested rooms.
  Use it to redraw a rough rectangle along the real walls, to grow a room into a hole, or to pull a venue back
  behind a wall it spills past. Round 1 had no way to do this.
- `./pl rescore-best [decks|all]` re-scores the saved best versions with the **current** scorer.
  Run it after every scorer change (section 6), otherwise the ratchet compares old scores with new ones.
- `./pl promote N --reason "..."` makes the current spec the best version **even if it scores a little lower**.
  Only use it for a deck whose audit (section 5) says the current spec looks better.
  Every promotion is written to `best/promotions.log`.

**Rendering:**
- Pools, whirlpools and aquapark water (cat `piscina` with a water word in the name) are now drawn darker blue than the deck around them.
- Names are written in the most open spot of a room, not on top of a room nested inside it.
- PNGs now use a font with accents, so `ç` no longer shows as a box.

**Decks 15 and 18:** the visually better current specs were promoted to best (see `best/promotions.log`).

Current board (re-scored): 5 = 97.61, 6 = 97.17, 7 = 99.31, 15 = 96.13, 16 = 95.95, 18 = 95.70, 19 = 96.69,
cabin decks 99.5–99.98. Run `./pl board` to see the live values.

---

## 2. Ground rules for round 2 (they replace rule 3 of PROMPT.md section 1)

1. Everything stays inside `plantas/`. Never touch `../src`, `../public` or any file outside `plantas/`. No deploy, no git commands that change anything.
2. **Only the coordinator** (or one "scorer maintainer" agent the coordinator starts on purpose) may edit `tools/`.
   Workers and auditors **never** edit `tools/`. If they think the scorer is wrong, they write it in their report
   with the deck, the coordinates and what they saw.
3. Scorer changes happen **only between waves**, when no worker is running (section 6). A scorer that changes
   while workers hill-climb confuses them.
4. Never edit `cache/`. Never run `./pl setup --force` or `./pl init N --force`. Never delete files
   (backups and logs are fine).
5. Do not edit `best/` by hand. Use `./pl score`, `./pl revert`, `./pl promote` and `./pl rescore-best`.
6. **At most 4 sub-agents at the same time.** In round 1, 14 parallel workers hit HTTP 429 (rate limit).
7. Honesty rules stay the same. Never give a corridor a venue name to match a label. Never weaken a check just
   to raise a score. A human will review the result and the scorer changes.

---

## 3. Known defects from the human review (fix these first)

Line these up against `./pl view N --best` before you start. Coordinates are reference pixels.

**Deck 5**
- `Lift` labels inside `r101 Infinity Atrium`. The glass panoramic lifts stand in the atrium, but if the plan
  draws a closed lift block, carve it out as `circulacao` ("Elevadores"). If the lifts really are open in the atrium,
  that is a false positive: improve the lift check (section 6), for example by exempting labels inside a room named
  "Atrium" whose panoramic lifts have no walls, and log it.

**Deck 6**
- The theatre seating (y≈430–530 in the top third) became a **jagged white band** separate from `Le Grand Théâtre`.
  The seats are part of the theatre: merge or reshape so the theatre includes its seating, with a clean outline.
- `Lift` labels inside `r26 Galleria Virtuosa`. Carve the lift/stair blocks out as `circulacao`.
- The Galleria venues are rough rectangles. Where the real plan has walls (HOLA!, Indochine, Shopping Gallery,
  MSC Shop, Fashion Jewellery, The HUB, Photo Gallery), use `reshape` to follow them.
  Where the venue is open-plan with no walls, a clean rectangle around its furniture is fine.

**Deck 7**
- `r1 MSC Aurea Spa` still geometrically contains the Kaito / Butcher's Cut rooms (round-1 report).
  Check with `./pl rooms 7 --ids r1` and an overlay view, and reshape r1 so it does not contain other venues.
- Merge the two touching `Carousel Lounge` rooms (r172 + r173) if they are the same venue.
- The site lists a beauty salon and a library on deck 7, but the plan does not print them.
  **Do not invent them.** Mention it in the report.

**Deck 15**
- `Lift` labels inside `r11 Deck aberto`. The two lift/stair blocks at the aft end are drawn inside the open deck:
  carve each as `circulacao` ("Elevadores"/"Escadas") along its walls.
- Check that the Atmosphere and Tropical pools are separate water rooms (now dark blue) nested in the deck area.

**Deck 16**
- `Lift` labels inside `r83 MSC Gym` and `r151` (Yacht Club). The lift/stair blocks inside the gym area are swallowed:
  carve them out as `circulacao`.
- The gym outline should follow the gym's curved front wall and leave out the lifts and stairs.
- The two `Power Walking Track` strips overlap the gym's sides. Make sure they don't cover each other.

**Deck 18**
- `Horizon Bar (r159)` spills right into the stair/lift block next to it (a lavender band). Reshape it back behind its walls.
- `Lift` labels inside `r160 Sky lounge`: carve the lift lobby out as `circulacao`.
- Duplicates: `Doremiland` (r175+r108), `Young Club` (r150+r109), `Hidromassagem` (r128+r129),
  `MSC Yacht Club Restaurant` (r170+r169, r170+r3). Merge, or rename the piece that is something else
  (for example the rim around a whirlpool is deck, not water).
- Check Doremiland's position: the plan prints "Doremiland" between the big pillared rectangle on the left and the
  round play structure. Decide from the walls which space it is, and say why in the report.
- Texts without accents: "Espaco", "laboratorio", "criacao", "musica" (MSC Teens Lab, Web Creator Room, Teens Club).
  Fix them in proper pt-BR.
- Name: the plan says "Sky lounge" and the site says "Discoteca". Keep "Sky lounge" as the name (it matches the plan),
  and make sure the `texto` says it is the ship's disco.

**Deck 19**
- `Lift` labels inside `r37 Top 19 Exclusive Solarium`: carve the lift block out.
- `Himalayan Bridge` covers the whole aft strip. The real bridge is the walkway structure at the very stern.
  Reshape it to the bridge and the platforms. The rest of the strip is open deck (`piscina`, "Deck aberto") or `circulacao`.
- The `Top 19 Exclusive Solarium` label sits on a tiny box. Check that the room really covers the solarium area
  and nothing more.

**Deck 13 (quick)**
- Duplicate `Escadas` (r35+r39). If they are the same stair, merge them. If they are two flights that only touch, rename one ("Escadas"/"Elevadores" as it really is) or accept it and explain why.

**All public decks**
- The worst visual problem is **rough rectangles where the plan has real walls**. After the known defects,
  go venue by venue: if the overlay shows walls more than ~8 px from our outline, `reshape` it onto the walls.

---

## 4. Roles and order of work

### Coordinator (you)
1. Run `./pl board` and read `best/promotions.log`. Read `RELATORIO.md` (round 1) to see what each deck worker knew.
2. **Wave A (fix):** start up to 4 **workers** at a time on decks 6, 18, 15, 16, then 19, 5, 7, 13, using the worker prompt (section 7).
3. **Between waves:** read the workers' reports. If several mention the same scorer problem, fix the scorer (section 6).
4. **Wave B (audit):** for each deck a worker finished, start a **fresh auditor** (section 5). It must not be the agent that edited the deck.
   Also audit the cabin decks 8–14 once (one auditor can take two cabin decks).
5. Any deck with a **major** defect in its audit goes back to a worker, together with the audit file.
   After the fix, a **new** auditor checks it again. Repeat until the audit passes. Give up on a deck after 4 rounds and report what is left.
6. **Final check** (section 9), export, final report.

### Worker
Fixes one deck: known defects (section 3), the audit's major defects if there is an audit, then the hill-climbing loop.
Before finishing it does its own **self-check** (section 5, as if it were the auditor) and writes the result in its report.

### Auditor
Does not edit anything. Compares the real plan with our drawing and writes `audits/deck-N.md` (section 5).

---

## 5. Audit protocol (auditors, and workers for their self-check)

1. `./pl board` and `./pl score N` (just to see the hints, nothing is changed).
2. Go top to bottom in windows of 600 px with the **best** version: `./pl view N --best --mode side --y0 0 --y1 600`, then 600–1200, and so on to the end.
   Look at each window carefully: left is the real plan, middle is ours, right is the overlay.
3. For **every venue name printed on the real plan** in that window, check:
   - Is there a room for it in the same place, with the same name and a sensible category?
   - Does the outline follow the venue's walls (overlay)? Is it missing a big part, or spilling into a corridor, a lift block or a neighbouring venue?
   - Is the name written once, inside the venue?
4. Also check:
   - Lift/stair blocks are `circulacao` and not part of venues.
   - Pools are dark blue water inside the light blue deck.
   - No jagged artifact bands, slivers or magenta rooms.
   - Crew areas look grey.
   - Cabins (cabin decks) have their numbers in the right cells.
5. Read each public venue's `texto` (`./pl rooms N --min-area 0`, or the spec file). It must be correct pt-BR with accents,
   25–260 characters, factual, and must not make up prices or times.
6. Write `audits/deck-N.md` (create the `audits/` folder if needed; increase the number in `round` each time):

```
# Audit deck N, round R, by <agent name>
Verdict: PASS | FAIL
Score at audit time: 97.8

| # | severity | where (x,y) | what is wrong | suggested fix |
|---|----------|-------------|---------------|---------------|
| 1 | major | 220,2171 | Lift block inside Sky lounge | carve as circulacao along walls x210-300,y2140-2210 |
| 2 | minor | 400,900 | Shop outline 10px inside the wall | reshape |

Scorer problems noticed (for the coordinator): ...
```

**Major** (FAIL):
- a missing or misplaced venue, or a wrong name;
- an outline that clearly ignores the walls (more than ~15 px off on a whole side), or that swallows a lift or stair block or another venue;
- a name drawn twice;
- a wrong category;
- a jagged artifact visible at phone size;
- a missing or wrong cabin;
- invented or wrong text.

**Minor** (does not fail):
- small outline offsets;
- an open-plan venue drawn as a clean rectangle where the plan shows no walls;
- style details.

**PASS** = zero majors. Be strict: an auditor who passes a bad deck has failed.

---

## 6. Owning the scorer (coordinator / scorer maintainer only)

You may change `tools/score.py`, `tools/render.py`, `tools/spec.py`, `tools/cli.py` and `tools/ref.py`
(but never the cached reference data in `cache/`). Allowed reasons:

- **The scorer misses a real defect** that a human would see (auditors found it, and the score did not drop).
  Add a check, so the next worker gets a hint for it.
- **False positive:** the scorer punishes something correct. Make the check smarter, as narrowly as possible
  (a specific word, a specific geometric condition). Never just delete the check.
- **Missing tool:** a command the workers needed and did not have.

Not allowed:
- lowering a weight because a part is low;
- deleting a check;
- loosening a threshold without a specific false positive to point at;
- special cases keyed on a deck number or room id (`if n == 18 and rid == "r160"`), except the existing `RANGES` table.

**Procedure for every scorer change:**
1. Only when no worker is running.
2. `./pl board > /tmp/board_before.txt` (or copy the output into the log).
3. `cp tools/score.py tools/score.py.bak-<short-name>` (keep the backups).
4. Make the change. Check it compiles: `uv run python -m py_compile tools/*.py`.
5. Test it on the deck where you saw the problem: the hint must now point at the real defect,
   or the false positive must be gone.
6. `./pl rescore-best all`, then `./pl board`.
   **Check the side effects on all 14 decks.** If a deck you did not mean to touch drops more than 0.5,
   look at the new hints for it. Either the drop is right (a real defect was found: send a worker) or your check is too broad (fix it).
7. Append an entry to `SCORER_CHANGES.md`:

```
## <n>. <short title>
- Problem: what a human would see / what was wrongly punished (deck, coordinates, audit file)
- Change: what you changed in which function
- Board before -> after: 5: 97.61 -> 96.9, 6: ..., (all 14 decks)
- Why this is not gaming: one sentence
```

A human will read `SCORER_CHANGES.md`. Clear, narrow, explained changes are welcome.

Ideas the reviewer had that are **not implemented yet** (implement them if audits show they matter):
- **Spill check:** a public venue that covers part of a closed room of the real plan (a closed region from `cache/`)
  without covering most of it, which is what a venue spilling past a wall looks like.
  Careful: open-plan carving cuts big regions on purpose, so only count small closed regions (for example under 5000 px²).
- **Jagged outline check:** unnamed rooms whose outline zig-zags (many vertices per 100 px of perimeter, while the room
  is not a stair). In round 1, simply counting vertices could not tell stairs from artifacts, so calibrate it on real cases first.
- **Stairs:** stair hatching (many short parallel lines) inside a public venue means it swallowed a staircase.

---

## 7. Worker prompt (copy, replace N, and add the audit file if there is one)

> You are polishing the redrawn plan of deck N of the MSC Virtuosa, round 2. From inside `plantas/`, read `PROMPT.md`
> sections 1, 3, 4, 5, 6 and 7, then `PROMPT-ROUND2.md` sections 1, 2, 3 and 5. Work ONLY on deck N and never edit `tools/`.
> Start with `./pl revert N`, `./pl score N` and `./pl view N --best --mode side` windows from top to bottom.
> First fix every known defect listed for deck N in PROMPT-ROUND2.md section 3 (and every **major** item in `audits/deck-N.md` if it exists).
> Then keep hill-climbing with `./pl score N`, but judge every change by the images, not only the number.
> If a change makes the drawing clearly more correct and costs less than 0.3 points, keep it and say so in your report.
> The coordinator can promote it.
> Before finishing, do the audit protocol of PROMPT-ROUND2.md section 5 on your own deck and fix every major problem you find.
> Report:
> - start and end score;
> - what you fixed, with room ids;
> - what you are unsure about;
> - whether the current spec is the best version or should be promoted, and why;
> - scorer problems you noticed (deck, coordinates, what is wrong).

## 8. Auditor prompt (copy, replace N)

> You are an independent auditor of the redrawn plan of deck N of the MSC Virtuosa. You did not draw it. Be strict.
> From inside `plantas/`, read `PROMPT-ROUND2.md` sections 2 and 5. **Do not change anything**:
> - no `./pl set`, `carve`, `merge`, `reshape`, `promote` or any other editing command;
> - no edits to specs or tools.
> You may only run `./pl board`, `./pl score N`, `./pl rooms N`, `./pl labels N`, `./pl view N --best ...`, and read files.
> Follow the audit protocol and write `audits/deck-N.md`. If an earlier audit exists, add your round below it; don't erase it.
> End with the verdict line and the list of major defects.

---

## 9. Final check (coordinator, before saying done)

Do not report "done" until **every** item below is true. Check each one yourself; don't take a worker's word for it.

1. `./pl board`: every deck at 97 or more, **or** a promotion in `best/promotions.log` explains why a lower-scoring version is better.
2. Every deck (all 14) has `audits/deck-N.md` whose **latest** round says `Verdict: PASS`, written by an agent that did not edit that deck in the same round.
3. Specs and best agree: for each deck, `./pl score N` on the current spec is equal to the best score.
   If not, either `./pl revert N` (the best version is right) or `./pl promote N --reason` (the spec is right, after its audit).
4. `./pl export`. Then open `./pl view N --best --mode side` for at least 3 windows on each public deck and look at them yourself:
   - the bow window;
   - the middle window;
   - the stern window.
5. `uv run python -m py_compile tools/*.py`. `SCORER_CHANGES.md` lists every change you made to `tools/` (or says "no changes").
6. Nothing changed outside `plantas/`. `git status --short` from the repo root must only show `?? plantas/`.
   That command is read-only and allowed for this check.
7. Write `RELATORIO-ROUND2.md` in Portuguese:
   - final board (before → after);
   - per deck: what was fixed, audit rounds, what remains (minor);
   - scorer changes, in short, linking to `SCORER_CHANGES.md`;
   - promotions;
   - open questions for the human (salon/library on deck 7, Doremiland position, anything else).

If an item cannot be made true, say exactly which one and why in the report. That is better than claiming you are done.
