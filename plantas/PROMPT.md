# Mission: redraw the MSC Virtuosa deck plans

You are improving machine-made drafts of the deck plans of the cruise ship **MSC Virtuosa**.
For each deck there is a real plan image (bow = front of the ship at the TOP) and a draft
file `plantas/specs/deck-N.json` that was traced automatically from that image. The traced
shapes (walls, rooms, cabins) are already correct. **What is missing is meaning**: which room
is which venue, its category, a clean name and a short description in Portuguese. Some
venues are not separate shapes yet and must be cut out ("carved") of big open areas.

You work by **hill climbing**: make one small change, run the scorer, keep the change if the
score went up, undo it if it went down. Repeat. The scorer saves the best version of every
deck automatically, so you can never lose progress.

Decks: `5 6 7 8 9 10 11 12 13 14 15 16 18 19` (there is no deck 17).

---

## 1. Ground rules (read twice)

1. Work **only** inside the `plantas/` folder. Run every command from inside `plantas/`.
2. Change specs **only** with the `./pl` commands (section 4). Do not hand-edit JSON unless a
   command cannot do what you need. If you do hand-edit, keep it valid JSON and run `./pl score N` right after.
3. **Never** edit anything in `tools/`, `cache/`, `best/`, `pyproject.toml`, `uv.lock`, or any file outside `plantas/`.
4. **Never** run `./pl init N --force` or `./pl setup --force`. They throw away all work on the deck.
5. **Never** delete files. Never run `git` commands that change history (`reset`, `checkout`, `clean`, `push`).
6. One deck = one worker. Two workers must never edit the same deck at the same time.
7. Do not try to trick the scorer. For example, don't give a room a venue name just because a
   label is inside it when the room is really a corridor, and don't set every room to `restrito`.
   A human will look at the result. A cheated deck is thrown away.
8. If a command prints `ERROR`, fix that error before doing anything else.
9. If you are lost or the score keeps going down: `./pl revert N` goes back to the best version.

---

## 2. Setup check (do this once, before anything else)

```sh
cd plantas
./pl board          # scores of all decks; should print 14 lines
./pl cats           # the valid categories
```

If `./pl board` fails with "Reference for deck N not prepared", run `./pl setup` once (it takes about 3 minutes).
If `./pl` itself fails, `uv` is missing: stop and report it.

---

## 3. Concepts

### Coordinates
All coordinates are **pixels of the real plan image** of that deck. x goes left → right
(about 0 to 500-600). y goes top → bottom (about 0 to 3800). **y = 0 is the bow (front)**, and large
y is the stern (back). The left side of the image is the ship's left side (port).

### The spec file `specs/deck-N.json`
```jsonc
{
  "deck": 6,
  "image": {"src": "public/img/decks/deck-6.webp", "w": 500, "h": 3765},
  "hull": [[x,y], ...],                 // outline of the ship. Do not touch.
  "rooms": [                            // one per line
    {"id": "r34", "name": "Le Grand Théâtre", "cat": "show", "texto": "Teatro principal...", "poly": [[x,y], ...]}
  ],
  "cabins": [                           // guest cabins, one per line
    {"num": "10123", "poly": [[x,y], ...]}
  ]
}
```
- `id`: room id (r1, r2, ...). Use it in commands.
- `name`: the venue name as printed on the plan, cleaned up (see 6.1). It can be empty for back-of-house rooms and corridors.
- `cat`: category (below). `"?"` means "not classified yet". Every room must end up with a real category.
- `texto`: short description in Brazilian Portuguese, only for public rooms (see 6.2).
- `poly`: the shape. You normally never type it. The tools make it.
- `rotulo` (optional): set to `false` to hide the name on the drawn plan while keeping the room tappable on the site (use it for repeated names, like several "Deck de sol" pieces). Never blank `name`/`texto` just to hide a label.
- Rooms can be drawn inside other rooms (a kiosk in a hall). That is fine.

### Categories (`./pl cats`)
| cat | use it for |
|---|---|
| `show` | theater, lounges with shows, casino, disco, TV studio |
| `comida` | restaurants, buffet, cafés, chocolate/crêpes/ice cream shops |
| `bar` | bars, pubs, cocktail lounges |
| `piscina` | pools, whirlpools, sun decks, solarium, aquapark |
| `esporte` | gym, sports court, ropes course, cinema XD, arcade, walking track |
| `criancas` | kids and teen clubs |
| `loja` | shops, boutiques, jewellery, photo shop, art gallery, the Galleria shopping street |
| `servico` | reception, excursions desk, spa, salon, medical centre, library, conference rooms |
| `cabines` | a block of guest cabins drawn as ONE room (normally cabins are in `cabins`, not here) |
| `restrito` | crew-only areas, galley/kitchen, storage, technical rooms, bridge, MSC Yacht Club-only areas |
| `circulacao` | corridors, stairs, elevators/lifts, lobbies, landings, open walkways |

`show comida bar piscina esporte criancas loja servico` are **public** categories. Public rooms need a `name` and a `texto`.

### The score (0-100) and its parts
Run `./pl score N`. It prints the total, the parts and **hints**. Parts:

| part | weight | what it checks |
|---|---|---|
| hull | 5 | the ship outline matches (already ~1.00) |
| edges | 10 | the outlines you draw sit on real walls |
| cover | 10 | the enclosed areas of the real plan are drawn (don't drop real rooms) |
| labels | 20 | every venue name printed on the real plan is inside a room with that name |
| semantics | 25 | ...and that room has a category that fits the name (Restaurant → comida, Pool → piscina); unnamed corridors (long and thin, or next to 6+ cabins) are `circulacao` |
| cats | 10 | share of the drawing (by area) that has a real category, not `?` |
| texto | 10 | public rooms have a name and a Portuguese description of 25-260 characters |
| cabins | 25 | every cabin number on the real plan exists in `cabins`, at the right place |

Parts that don't apply to a deck show `n/a` and don't count. Penalties: rooms that partly
overlap (−1 each), tiny rooms under 150 px² (−0.25 each).
**Target: 97 or more for every deck**, plus a visual check (section 7).

---

## 4. Commands (`./pl <command> -h` shows all options)

Look:
```sh
./pl board                                  # all decks: current and best score
./pl score 6                                # score + hints for deck 6 (saves best automatically)
./pl labels 6                               # venue names the OCR read on the real plan, with (x,y)
./pl rooms 6                                # all rooms: id, cat, area, bbox(x,y,w,h), name, [OCR text inside]
./pl rooms 6 --cat '?'                      # only unclassified rooms
./pl rooms 6 --y0 1500 --y1 2000            # only rooms fully between y=1500 and y=2000
./pl rooms 6 --min-area 20000               # only big rooms
./pl view 6 --y0 1500 --y1 2000             # PNG: real plan | our drawing | overlay, with grid
./pl view 6 --mode ref --y0 1500 --y1 1900 --scale 3    # just the real plan, bigger (to read coordinates)
./pl view 6 --mode overlay --y0 1500 --y1 1900          # our drawing on top of the real plan
```
`view` prints the path of a PNG in `out/`. Grid lines are every 50 px and labelled every 100 px
(`x200`, `y1500`). Unclassified rooms (`?`) are bright **magenta**, and room ids are printed in red.
Keep `y1 - y0` at 600 or less so the image stays readable.

Change:
```sh
./pl set 6 r34 --name "Le Grand Théâtre" --cat show --texto "Teatro principal, com shows diferentes toda noite."
./pl set 6 r40 r41 r42 --cat circulacao              # several rooms at once
./pl set-many 6 --to restrito --cat '?' --y1 400      # every '?' room fully above y=400 becomes restrito
./pl set-many 6 --to circulacao --cat '?' --max-area 600 --y0 2000 --y1 2600
./pl carve 6 r26 --rect 5,1612,132,186 --name "Indochine Restaurant" --cat comida
./pl carve 6 r26 --poly "5,1612 137,1612 137,1798 5,1798" --name "Indochine Restaurant" --cat comida
./pl merge 6 r50 r51 r52 --name "Le Grand Théâtre" --cat show   # join neighbouring pieces into r50
./pl drop 6 r99                                       # delete a room (rarely right: it lowers 'cover')
./pl add 6 --x 10 --y 20 --w 30 --h 40 --name "" --cat restrito  # add a rectangle room (rarely needed)
./pl revert 6                                         # undo everything since the best version
```
Cabins:
```sh
./pl cabin-fix 10 10I23 10123                         # fix a misread number
./pl cabin-add 10 10208 --x 230 --y 1860 --w 45 --h 28
./pl cabin-drop 10 10999
```

### How `carve` works
Many venues open onto a big corridor or promenade with no closing wall, so the tracer made ONE
huge room (for example `r26` on deck 6 covers the whole Galleria with about 30 venues inside).
`carve` cuts a shape out of that big room and makes it a new room with a name and category.
The rest stays in the big room. The corners are moved onto the nearest wall automatically.
To find the shape:
1. Find the label: `./pl labels 6` gives e.g. `'Indochine' at (52,1738)`.
2. Look: `./pl view 6 --mode ref --y0 1550 --y1 1900 --scale 3`. Find the walls around the label and read their
   x and y on the grid. Where a venue has no wall (open to the corridor), close it where the venue's
   furniture/floor ends, or halfway to the corridor's centre line.
3. Carve with `--rect x,y,w,h` (a box) or `--poly "x1,y1 x2,y2 ..."` (any shape, points in order around it).
4. `./pl score 6`. The label should now be matched. Then `./pl view 6 --mode overlay --y0 ... --y1 ...` to check.
5. If it looks wrong: `./pl revert 6` and try again with better numbers.

Whatever is left of the big room at the end is usually the corridor/promenade. Name it
(e.g. "Galleria Virtuosa" on deck 6) and give it the right category (`loja` for the Galleria
shopping street, `circulacao` for a plain corridor).

---

## 5. The hill-climbing loop (one deck)

```
repeat:
  1. ./pl score N                       → read the total and the FIRST hint
  2. choose ONE small change that fixes that hint (see playbooks below)
  3. make the change with a ./pl command
  4. ./pl score N
     - "NEW BEST"          → keep it, go to 1
     - "not better than best" and the total went DOWN → ./pl revert N, then try a different change
     - "same as best (saved)" → the change was saved; fine if it was right (e.g. a cleaner name), go on
  5. every ~10 changes: ./pl view N on the part you changed and check it looks right
until score >= 97 and the visual check (section 7) passes, or 150 changes without progress
```
Work through hints in this order: **ERROR → labels → semantics → cats → names/texto → cabins → overlap/tiny → cover/edges.**

---

## 6. Playbooks

### 6.1 Names
- Use the venue name printed on the plan, with the OCR mistakes fixed. Combine fragments
  that belong together: `'Indochine'` + `'Restaurant'` → `Indochine Restaurant`;
  `'Jean-Philippe'` + `'Crepes&Gelato'` → `Jean-Philippe Crêpes & Gelato`;
  `'rship Club'` → `MSC Starship Club`; `'The Simphony'` → `The Symphony`.
- Keep the official (English/Italian/French) names. Don't translate names.
- If a label is cut by the watermark, use what you can see and the list in 6.4 to complete it.
- Rooms with no label: corridors, stairs, crew rooms and storage get an empty name `""`. Lifts can be named `Elevadores`
  and stairs `Escadas`.

### 6.2 `texto` (descriptions in Brazilian Portuguese)
- 1 or 2 short sentences, 25 to 260 characters, Brazilian Portuguese, no emojis.
- Say what the place is and one useful tip. Mention when it costs extra ("pago à parte").
- Good: `"Restaurante de cozinha asiática. Pago à parte: reserve pelo app."`
- Good: `"Piscina principal, com hidromassagens e DJ durante o dia."`
- Reuse the texts in `../src/data/navio.ts` (the `DECKS` list) when the venue is the same. Read that file once at the start.
- Don't invent facts like prices, opening hours or capacities.

### 6.3 Classifying unnamed rooms (`cat '?'`)
Look at the area with `./pl view N --mode overlay` (the magenta rooms are the unclassified ones) and `./pl rooms N --cat '?'`.
Rules of thumb:
- Small rooms packed together near the bow (small y) or the stern (large y), or along the hull, with no label → `restrito` (crew, storage, technical).
- Long thin rooms between rows of cabins or between venues → `circulacao`.
- Rooms with a staircase drawing (parallel lines) or labelled Lift → `circulacao`.
- The space between the seating of a restaurant/theater and its walls → merge it into that venue (`./pl merge`).
- A small room fully inside a big venue (bar counter, stage, pool) → the same category as the venue, or `merge` it.
- On decks 15, 16, 18 and 19 (open decks) the big unlabelled open areas around pools are sun decks → `piscina`.
- Use `set-many` with filters for big batches, then fix the exceptions one by one.

### 6.4 Venues you should find, per deck (from the ship's public guides)
Use this to recognize labels and to check you didn't miss anything. Positions are approximate.
- **5**: Le Grand Théâtre (lower level, bow), cabins, ship entrances (gangways, both sides), Infinity Atrium, Reception / Guest Services, Infinity Bar, MSC Excursions, Business Centre, Blue Danube restaurant (stern), galley (crew).
- **6**: Le Grand Théâtre (balcony, bow), Virtuosa Bar & Lounge, Virtuosa Boutique, Galleria Virtuosa (the promenade), HOLA! Tacos & Cantina, Jean-Philippe Chocolat & Café, Jean-Philippe Crêpes & Gelato, MSC Excursions, Luxury Plaza, Indochine Restaurant, L'Atelier Bar & Art, The Art Wall, Shopping Gallery, MSC Foundation Centre, MSC Shop, Fashion Jewellery, MSC Starship Club, THE HUB Photo & Digit@l, Photo Gallery, Emotions Immersive Gallery, The Opera and The Symphony (main restaurant, stern), Minuetto.
- **7**: MSC Aurea Spa, salon, Galleria upper level, Butcher's Cut, Kaito Teppanyaki & Sushi Bar, Masters of the Sea pub, TV Studio & Bar, Champagne Bar, library, shops, Red Gem Casino, Carousel Lounge (stern).
- **8–13**: cabins only (+ stairs, lifts, corridors, crew areas).
- **14**: cabins, Navigation Bridge (bow, `restrito`), officers' area (`restrito`).
- **15**: Yacht Club suites (bow), Solarium, Tropical Pool & Bar, Atmosphere Pool, Atmosphere Bar North / Bar South / Ice Cream Bar, Marketplace Buffet & Bar (stern), Marketplace Family & Kids, Sea Pavilion.
- **16**: Yacht Club suites and Top Sail Lounge (bow, `restrito`), MSC Gym, Sportplex, cinema XD, arcade, Sports Bar, walking track, Horizon Pool / amphitheatre (stern).
- **18**: Yacht Club suites (bow), kids clubs (LEGO, Chicco, Doremi, Young Club, Teen Club), disco, Sportplex upper level, aft sun deck with pool.
- **19**: MSC Yacht Club open area (bow, `restrito`), TOP 19 Solarium, Savannah Aquapark & Bar, ropes course, Himalayan Bridge (stern).

### 6.5 Cabin decks (5, 8–16, 18)
The cabins were found automatically (the `cabins` part starts near 1.00). The work:
1. Classify the rooms: corridors → `circulacao` (the `corridors:` hint lists the ones the scorer is sure about), stairs/lifts → `circulacao`, the rest → `restrito`.
   On decks 8–13 this is most of the work, and `set-many` makes it fast.
2. The `info:` hint lists numbers missing from the official range. Many numbers are simply not used on the ship.
   Only add a cabin when you can **see** it on `./pl view N --mode ref` and it is not in the spec yet.
3. The scorer flags numbers outside the official range: those are OCR mistakes. Look at the place in the
   image and fix the number with `cabin-fix`.
4. Cabin numbers on one side of a corridor usually go up by 2 (odd on one side, even on the other). A number that breaks
   the sequence is probably misread. Check it in the image.

### 6.6 Public decks (5, 6, 7, 15, 16, 18, 19)
1. `./pl labels N` and `./pl rooms N --min-area 20000`. Find the big open rooms that contain many labels.
2. Easy ones first: rooms that already contain exactly one venue name → `./pl set N rX --name ... --cat ... --texto ...`.
3. Then carve the venues out of the big open rooms (section 4), one at a time, from the bow to the stern.
4. Then classify everything else (6.3), then write the `texto`s, then the visual check.

---

## 7. Visual check (required before a deck is "done")

Go through the deck from top to bottom in windows of 600 px:
`./pl view N --y0 0 --y1 600`, then `--y0 600 --y1 1200`, and so on until the image height (`./pl rooms N` prints it).
In each window check:
- No magenta (unclassified) rooms are left.
- Every venue printed on the real plan (left panel) has its own coloured room in the middle panel with the right name.
- Carved rooms follow the venue's walls (the right panel shows our outlines over the real plan).
- Colours make sense: pools blue, food yellow, bars purple, shows coral, shops teal, crew areas grey-striped/beige.

**If you cannot see images** (no vision): skip looking at the PNGs. Use `./pl rooms N` and the hints only, and
say so in your report so a human can do the visual check.

---

## 8. Running many workers (sub-agents)

The decks are independent, so run **one worker per deck in parallel**.

### Coordinator (you, if you can start sub-agents)
1. Do the setup check (section 2). Read `../src/data/navio.ts` once.
2. Start one worker per deck with the **worker prompt** below. Start the easy cabin decks (8, 9, 10, 11, 12, 13, 14)
   and the hard public decks (6, 7, 15, 5, 16, 18, 19) at the same time if you can. Never give two workers the same deck.
3. When a worker finishes, run `./pl board`. Any deck below 97 gets a new worker with the same prompt
   (it continues from the saved best version, so nothing is lost).
4. Stop when every deck is at 97 or more and every worker reported its visual check.
5. Run `./pl export` (writes `export/deck-N.svg` and `.json` from the best versions), then `./pl board`,
   and write the final report (section 9).

### Worker prompt (copy, replace N)
> You are improving the redrawn plan of deck N of the MSC Virtuosa. Read `plantas/PROMPT.md` sections 1, 3, 4, 5, 6 and 7 first,
> then work ONLY on deck N, from inside `plantas/`. Start with `./pl revert N` (to start from the best saved version), then
> `./pl score N`. Follow the hill-climbing loop of section 5 until the score is 97+ and you did the visual check of section 7,
> or until 150 changes without progress. Never touch other decks. Finish with a report: start score, end score,
> what you changed (carved venues, fixed cabins), what you were unsure about, and whether you could do the visual check.

If you cannot start sub-agents, do the decks one after another yourself, starting with deck 10.

---

## 9. Final report

Write `plantas/RELATORIO.md` (in Portuguese or English) with:
- The `./pl board` table.
- Per deck: what was done, doubts, and venues from section 6.4 you could NOT find on the plan.
- Anything that looked wrong in the automatic tracing.

Do not change the website (`src/`) and do not deploy. A human will review the result and plug it into the site.

---

## 10. Troubleshooting

| problem | fix |
|---|---|
| `X is not valid JSON` | you broke the file by hand: `./pl revert N` |
| `room rX not found` | ids change after carve/merge: run `./pl rooms N` again |
| carve says "does not overlap room" | your coordinates are outside that room: check with `./pl view N --mode overlay` |
| carve made extra "leftover pieces" | normal when a cut splits the big room. Classify the pieces (often `circulacao`) |
| score went down after a correct change | possible (e.g. carve across an open area lowers `edges` a little). If the room is right, keep it; the next steps raise the score again |
| `cover` dropped | you dropped or shrank a real room: `./pl revert N` |
| everything is confusing | `./pl revert N`, `./pl score N`, fix only the first hint |
