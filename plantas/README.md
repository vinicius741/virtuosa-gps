# plantas: how the deck plans and the route data are made

Python tools (run with [`uv`](https://docs.astral.sh/uv/); the environment lives in `.venv/`) that turn the real deck plan images into the clean SVG plans and the GPS route data. `./pl -h` lists every command.

## Reference images (not included)

The tools read the real deck plans as reference images, `deck-N.webp` for N = 5–16, 18, 19 (bow at the top, about 500 × 3700 px). They are not part of this repository because they are not ours to license. Put them in `plantas/ref/` (git-ignored) or point `PLANTAS_REF` at their folder, then run `./pl setup` once to extract the line mask, OCR labels and cabins into `cache/` (also git-ignored).

## Files

- `specs/deck-N.json`: the current work on each deck: rooms (name, category, description `texto`, outline, doors `portas` or `aberto`) and cabins.
- `best/`: the best-scoring version of each deck (saved automatically by `./pl score`). `./pl export` uses these.
- `export/`: `deck-N.svg` and `deck-N.json`, the finished plans.
- `tools/rotas.py`: builds `../public/plantas/rotas.json` from `export/` (walkable grid, lift banks and hand-placed fixes at the top of the file).
- `audits/`, `PROMPT*.md`, `RELATORIO*.md`, `SCORER_CHANGES.md`: prompts and reports from the AI hill-climbing rounds that named the venues and fixed the plans (in Portuguese).

## Common tasks

```sh
cd plantas
./pl board                      # scores of every deck
./pl view 10 --best --y0 0 --y1 600   # PNG of a slice: reference | ours | overlay (in out/)
./pl rooms 10                   # list rooms
./pl set 10 r169 --name "…" --texto "…"
./pl door 10 r169 --add 120,800  # mark a door at x,y (see PROMPT-PORTAS.md)
./pl score 10                   # score; saves to best/ if better
./pl export                     # writes export/, ../public/plantas/deck-N.svg and rotas.json
./pl gps-view 10                # the GPS grid over the real plan, to check corridors and doors
```

After changing names or descriptions, add the English version to `../src/gps/i18n/places.en.json` and run `npm run check` at the repository root.
