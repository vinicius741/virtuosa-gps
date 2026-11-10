"""./pl <command> ...   (run ./pl -h, or ./pl <command> -h)"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from concurrent.futures import ProcessPoolExecutor

import ref
import spec


def _setup_one(args):
    n, force = args
    ref.setup(n, force)


def decks_arg(v: str) -> list[int]:
    if v == "all":
        return ref.DECKS
    out = [int(x) for x in v.split(",")]
    for n in out:
        if n not in ref.DECKS:
            raise SystemExit(f"deck {n} does not exist. Decks: {ref.DECKS}")
    return out


def main() -> None:
    ap = argparse.ArgumentParser(prog="./pl", description="Redraw the MSC Virtuosa deck plans. Read plantas/PROMPT.md first.")
    sub = ap.add_subparsers(dest="cmd", required=True)

    a = sub.add_parser("setup", help="prepare the reference data (OCR etc.) for decks; run once")
    a.add_argument("decks", nargs="?", default="all")
    a.add_argument("--force", action="store_true")

    a = sub.add_parser("rehull", help="recompute only the ship outline in the cache (no OCR) and copy it into specs/ and best/")
    a.add_argument("decks", nargs="?", default="all")

    a = sub.add_parser("init", help="create the first automatic draft specs/deck-N.json")
    a.add_argument("deck", type=int)
    a.add_argument("--force", action="store_true", help="overwrite the current spec (best/ is kept)")

    a = sub.add_parser("score", help="score the current spec; saves it to best/ if it is the best so far")
    a.add_argument("deck", type=int)
    a.add_argument("--json", action="store_true")

    sub.add_parser("board", help="scores of all decks")

    a = sub.add_parser("revert", help="throw away the current spec and go back to the best one")
    a.add_argument("deck", type=int)

    a = sub.add_parser("view", help="write a PNG to look at: reference | ours | overlay, with a coordinate grid")
    a.add_argument("deck", type=int)
    a.add_argument("--mode", choices=["side", "ref", "ours", "overlay"], default="side")
    a.add_argument("--y0", type=int)
    a.add_argument("--y1", type=int)
    a.add_argument("--scale", type=int, default=2)
    a.add_argument("--no-ids", action="store_true")
    a.add_argument("--best", action="store_true", help="show best/ instead of specs/")

    def filters(p):
        p.add_argument("--ids", nargs="+")
        p.add_argument("--y0", type=float)
        p.add_argument("--y1", type=float)
        p.add_argument("--x0", type=float)
        p.add_argument("--x1", type=float)
        p.add_argument("--min-area", type=float)
        p.add_argument("--max-area", type=float)
        p.add_argument("--unnamed", action="store_true")
        p.add_argument("--cat", help="only rooms with this cat ('?' = unclassified)")

    a = sub.add_parser("rooms", help="list rooms (id, cat, area, bbox, name, OCR text inside)")
    a.add_argument("deck", type=int)
    filters(a)

    a = sub.add_parser("labels", help="list the venue names the OCR read on the real plan (what 'labels' scores)")
    a.add_argument("deck", type=int)

    a = sub.add_parser("set", help="set name / cat / texto of one or more rooms")
    a.add_argument("deck", type=int)
    a.add_argument("ids", nargs="+")
    a.add_argument("--name")
    a.add_argument("--cat", choices=list(spec.CATS))
    a.add_argument("--texto")

    a = sub.add_parser("set-many", help="set the cat of every room matching the filters")
    a.add_argument("deck", type=int)
    a.add_argument("--to", required=True, choices=list(spec.CATS), help="new category")
    filters(a)

    a = sub.add_parser("merge", help="merge neighbouring rooms into the first id")
    a.add_argument("deck", type=int)
    a.add_argument("ids", nargs="+")
    a.add_argument("--name")
    a.add_argument("--cat", choices=list(spec.CATS))

    a = sub.add_parser("drop", help="delete rooms")
    a.add_argument("deck", type=int)
    a.add_argument("ids", nargs="+")

    a = sub.add_parser("add", help="add a rectangular room")
    a.add_argument("deck", type=int)
    for k in ("x", "y", "w", "h"):
        a.add_argument(f"--{k}", type=int, required=True)
    a.add_argument("--name", default="")
    a.add_argument("--cat", required=True, choices=list(spec.CATS))

    a = sub.add_parser("carve", help="cut a new room out of a big room (open areas with several venues)")
    a.add_argument("deck", type=int)
    a.add_argument("src", help="id of the room to cut from")
    g = a.add_mutually_exclusive_group(required=True)
    g.add_argument("--rect", help='"x,y,w,h"')
    g.add_argument("--poly", help='"x1,y1 x2,y2 x3,y3 ..." (reference image pixels)')
    a.add_argument("--name", required=True)
    a.add_argument("--cat", required=True, choices=list(spec.CATS))
    a.add_argument("--no-snap", action="store_true", help="do not move the points onto the nearest walls")

    a = sub.add_parser("reshape", help="give a room a new outline (cuts it away from overlapping rooms)")
    a.add_argument("deck", type=int)
    a.add_argument("id")
    a.add_argument("--poly", required=True, help='"x1,y1 x2,y2 x3,y3 ..." (reference image pixels)')
    a.add_argument("--no-snap", action="store_true")

    a = sub.add_parser("rescore-best", help="after changing the scorer: re-score best/ with the current rules")
    a.add_argument("decks", nargs="?", default="all")

    a = sub.add_parser("promote", help="AUDITED decks only: make the current spec the best even if it scores a little lower")
    a.add_argument("deck", type=int)
    a.add_argument("--reason", required=True, help="why the current spec is better (logged in best/promotions.log)")

    a = sub.add_parser("cabin-fix", help="rename a cabin number (OCR mistake)")
    a.add_argument("deck", type=int)
    a.add_argument("old")
    a.add_argument("new")

    a = sub.add_parser("cabin-add", help="add a rectangular cabin")
    a.add_argument("deck", type=int)
    a.add_argument("num")
    for k in ("x", "y", "w", "h"):
        a.add_argument(f"--{k}", type=int, required=True)

    a = sub.add_parser("cabin-drop", help="delete cabins")
    a.add_argument("deck", type=int)
    a.add_argument("nums", nargs="+")

    sub.add_parser("cats", help="list the valid categories")

    a = sub.add_parser("export", help="write export/deck-N.svg + .json from best/")
    a.add_argument("decks", nargs="?", default="all")

    a = sub.add_parser("door", help="add / remove the doors of a room (where the GPS route may go through its wall)")
    a.add_argument("deck", type=int)
    a.add_argument("id")
    a.add_argument("--add", nargs="+", default=[], metavar="X,Y[,W]", help="door point(s) on the room outline; W = opening width in px (default 12)")
    a.add_argument("--rm", nargs="+", type=int, default=[], metavar="K", help="remove door number K (as printed)")
    a.add_argument("--clear", action="store_true", help="remove all doors of the room")
    a.add_argument("--aberto", action="store_true", help="open-plan venue with NO walls on the real plan (enter from any side)")
    a.add_argument("--fechado", action="store_true", help="remove the aberto flag")

    a = sub.add_parser("door-suggest", help="list the gaps in the real plan's walls along a room's outline (door candidates)")
    a.add_argument("deck", type=int)
    a.add_argument("id")

    a = sub.add_parser("door-todo", help="named public rooms that still have no doors and are not marked aberto")
    a.add_argument("deck", type=int)

    a = sub.add_parser("gps-view", help="PNG: the GPS walking grid over the real plan (check corridors and doors)")
    a.add_argument("deck", type=int)
    a.add_argument("--y0", type=int, default=0)
    a.add_argument("--y1", type=int)
    a.add_argument("--scale", type=int, default=2)
    a.add_argument("--best", action="store_true")

    sub.add_parser("rotas", help="write public/plantas/rotas.json (data for the ship GPS) from export/")

    A = ap.parse_args()
    c = A.cmd
    flt = lambda: {k: getattr(A, k) for k in ("ids", "y0", "y1", "x0", "x1", "min_area", "max_area", "unnamed", "cat")}  # noqa: E731

    if c == "setup":
        ds = decks_arg(A.decks)
        with ProcessPoolExecutor(max_workers=4) as ex:
            list(ex.map(_setup_one, [(n, A.force) for n in ds]))
    elif c == "rehull":
        import json as _j
        for n in decks_arg(A.decks):
            ref.rehull(n)
            for f in (spec.SPECS / f"deck-{n}.json", spec.BEST / f"deck-{n}.json"):
                if f.exists():
                    s = _j.loads(f.read_text())
                    s["hull"] = ref.ref(n)["hull_poly"]
                    f.write_text(spec._dump(s))
            print(f"deck {n}: hull copied into specs/ and best/ (run ./pl rescore-best {n})")
    elif c == "init":
        spec.init(A.deck, A.force)
    elif c == "score":
        import score

        r = score.run(A.deck, quiet=A.json)
        if A.json:
            print(json.dumps(r, ensure_ascii=False, indent=1))
    elif c == "board":
        import score

        print(f"{'deck':>4} {'current':>8} {'best':>8}  parts of best")
        for n in ref.DECKS:
            cur = score.score(n)["total"] if spec.path(n).exists() else None
            bp = spec.BEST / f"deck-{n}.score.json"
            b = json.loads(bp.read_text()) if bp.exists() else None
            parts = " ".join(f"{k}={v:.2f}" for k, v in (b or {}).get("parts", {}).items() if v is not None)
            print(f"{n:>4} {cur if cur is not None else '-':>8} {b['total'] if b else '-':>8}  {parts}")
    elif c == "revert":
        b = spec.BEST / f"deck-{A.deck}.json"
        if not b.exists():
            raise SystemExit("no best version yet")
        shutil.copy(b, spec.path(A.deck))
        print(f"specs/deck-{A.deck}.json restored from best/")
    elif c == "view":
        import render

        render.view(A.deck, A.mode, A.y0, A.y1, A.scale, not A.no_ids, A.best)
    elif c == "rooms":
        spec.rooms_table(A.deck, **flt())
    elif c == "labels":
        for t in ref.venue_labels(A.deck):
            print(f"{t['id']:5} ({t['cx']:.0f},{t['cy']:.0f}) {'vertical ' if t['vertical'] else ''}{t['text']!r}")
    elif c == "set":
        spec.set_rooms(A.deck, A.ids, A.name, A.cat, A.texto)
    elif c == "set-many":
        spec.set_many(A.deck, A.to, **flt())
    elif c == "merge":
        spec.merge(A.deck, A.ids, A.name, A.cat)
    elif c == "drop":
        spec.drop(A.deck, A.ids)
    elif c == "add":
        spec.add_rect(A.deck, A.x, A.y, A.w, A.h, A.name, A.cat)
    elif c == "carve":
        if A.rect:
            x, y, w, h = (float(v) for v in A.rect.split(","))
            pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
        else:
            pts = spec.parse_poly(A.poly)
        spec.carve(A.deck, A.src, pts, A.name, A.cat, not A.no_snap)
    elif c == "reshape":
        spec.reshape(A.deck, A.id, spec.parse_poly(A.poly), not A.no_snap)
    elif c == "rescore-best":
        import score

        for n in decks_arg(A.decks):
            score.rescore_best(n)
    elif c == "promote":
        import datetime

        import score

        res = score.score(A.deck)
        if res["errors"]:
            raise SystemExit("the current spec has errors, fix them first")
        old = score.best_score(A.deck)
        spec.BEST.mkdir(exist_ok=True)
        shutil.copy(spec.path(A.deck), spec.BEST / f"deck-{A.deck}.json")
        (spec.BEST / f"deck-{A.deck}.score.json").write_text(json.dumps(res, indent=1, ensure_ascii=False))
        with open(spec.BEST / "promotions.log", "a") as f:
            f.write(f"{datetime.datetime.now():%Y-%m-%d %H:%M} deck {A.deck}: {old} -> {res['total']} | {A.reason}\n")
        print(f"deck {A.deck}: current spec promoted to best ({old} -> {res['total']}), logged in best/promotions.log")
    elif c == "cabin-fix":
        spec.fix_cabin(A.deck, A.old, A.new)
    elif c == "cabin-add":
        spec.add_cabin(A.deck, A.num, A.x, A.y, A.w, A.h)
    elif c == "cabin-drop":
        spec.drop_cabin(A.deck, A.nums)
    elif c == "cats":
        for k, v in spec.CATS.items():
            print(f"{k:11} {v}")
    elif c == "export":
        import render

        render.export(decks_arg(A.decks))
        import rotas

        rotas.gerar()  # the GPS data follows the plans
    elif c == "door":
        pts = [[float(v) for v in t.split(",")] for t in A.add]
        spec.doors(A.deck, A.id, pts, A.clear, True if A.aberto else (False if A.fechado else None), A.rm)
    elif c == "door-suggest":
        spec.door_suggest(A.deck, A.id)
    elif c == "door-todo":
        spec.door_todo(A.deck)
    elif c == "gps-view":
        import rotas

        rotas.ver(A.deck, A.y0, A.y1, A.scale, A.best)
    elif c == "rotas":
        import rotas

        rotas.gerar()


if __name__ == "__main__":
    sys.exit(main())
