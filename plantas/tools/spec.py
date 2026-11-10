"""The deck spec (plantas/specs/deck-N.json): the redrawn plan, in the pixel
coordinates of the reference image. This is the file the agents edit."""

from __future__ import annotations

import json
import re
from pathlib import Path

from shapely.geometry import Point, Polygon, box
from shapely.ops import unary_union

import ref

SPECS = ref.ROOT / "specs"
BEST = ref.ROOT / "best"

# Same categories as the site (src/data/navio.ts) + "circulacao" (corridors, stairs, lifts, walkways)
CATS = {
    "show": "Shows e noite (theater, lounges with shows, casino, disco)",
    "comida": "Comer (restaurants, buffet, cafés, ice cream)",
    "bar": "Bares (bars, pubs, lounges that are mainly bars)",
    "piscina": "Piscinas e sol (pools, whirlpools, sun decks, solarium, aquapark)",
    "esporte": "Esporte e diversão (gym, sports court, ropes course, cinema XD, arcade, walking track)",
    "criancas": "Crianças e jovens (kids and teen clubs)",
    "loja": "Lojas (shops, boutiques, photo shop, Galleria shopping street)",
    "servico": "Serviços (reception, excursions desk, spa, salon, medical, library, meeting rooms)",
    "cabines": "Cabines (guest cabins/suites as one block, when not drawn one by one in 'cabins')",
    "restrito": "Exclusivo ou restrito (crew areas, galley/kitchen, storage, bridge, Yacht Club only)",
    "circulacao": "Circulação (corridors, stairs, elevators/lifts, lobbies, open walkways)",
}
PUBLIC_CATS = {"show", "comida", "bar", "piscina", "esporte", "criancas", "loja", "servico"}


def path(n: int) -> Path:
    return SPECS / f"deck-{n}.json"


def load(n: int, p: Path | None = None) -> dict:
    p = p or path(n)
    if not p.exists():
        raise SystemExit(f"No spec for deck {n}. Create it with: ./pl init {n}")
    try:
        return json.loads(p.read_text())
    except json.JSONDecodeError as e:
        raise SystemExit(f"{p} is not valid JSON: {e}. Fix it or run ./pl revert {n}")


def save(n: int, s: dict) -> None:
    SPECS.mkdir(exist_ok=True)
    s["rooms"].sort(key=lambda r: (min(p[1] for p in r["poly"]), min(p[0] for p in r["poly"])))
    path(n).write_text(_dump(s))


def _dump(s: dict) -> str:
    """JSON with one room / cabin per line: easy to read and to edit."""
    out = ["{"]
    out.append(f'  "deck": {s["deck"]},')
    out.append(f'  "image": {json.dumps(s["image"])},')
    out.append(f'  "hull": {json.dumps(s["hull"])},')
    for key in ("rooms", "cabins"):
        items = s.get(key, [])
        out.append(f'  "{key}": [')
        out.append(",\n".join("    " + json.dumps(it, ensure_ascii=False) for it in items))
        out.append("  ]" + ("," if key == "rooms" else ""))
    out.append("}")
    return "\n".join(out) + "\n"


def poly_of(item: dict) -> Polygon:
    if len(item.get("poly", [])) < 3:
        return Polygon()
    p = Polygon(item["poly"])
    if not p.is_valid:
        p = p.buffer(0)
    return p


def to_coords(p) -> list[list[int]]:
    if p.geom_type == "GeometryCollection":
        # a carve/reshape whose cut corners snap onto lines coincident with the room's own boundary
        # can leave line-only pieces alongside the polygon(s); keep the polygonal parts only
        parts = [g for g in p.geoms if hasattr(g, "exterior")]
        p = unary_union(parts) if parts else Polygon()
    if p.geom_type == "MultiPolygon":
        p = max(p.geoms, key=lambda g: g.area)
    if p.is_empty:
        raise SystemExit("the edit produced an empty polygon (the cut fell exactly on the room's own boundary). Nudge the shape by 1-2 px and try again.")
    p = p.simplify(1.0, preserve_topology=True)
    return [[int(round(x)), int(round(y))] for x, y in list(p.exterior.coords)[:-1]]


def next_id(s: dict) -> str:
    nums = [int(m.group(1)) for r in s["rooms"] if (m := re.fullmatch(r"r(\d+)", r["id"]))]
    return f"r{max(nums, default=0) + 1}"


def init(n: int, force: bool = False) -> None:
    """First draft from the automatic extraction. Every room starts with cat '?'."""
    if path(n).exists() and not force:
        raise SystemExit(f"{path(n)} already exists (use --force to start over; the best version stays in best/)")
    R = ref.ref(n)
    lab_by_rid: dict[int, list] = {}
    for t in ref.venue_labels(n):
        lab_by_rid.setdefault(t["rid"], []).append(t)
    cabin_rids = {c["rid"] for c in R["cabins"]}
    rooms = []
    k = 0
    for r in R["regions"]:
        if r["rid"] in cabin_rids or r["area"] < 400:
            continue
        k += 1
        ts = sorted(lab_by_rid.get(r["rid"], []), key=lambda t: (t["cy"], t["cx"]))
        # a region with many names is an open area with several venues: leave it unnamed, it must be carved
        name = " ".join(t["text"] for t in ts) if len(ts) <= 3 else ""
        rooms.append({"id": f"r{k}", "name": name, "cat": "?", "texto": "", "poly": r["poly"]})
    cabins = [{"num": c["num"], "poly": c["poly"]} for c in R["cabins"]]
    s = {"deck": n, "image": {"src": f"public/img/decks/deck-{n}.webp", "w": R["w"], "h": R["h"]}, "hull": R["hull_poly"], "rooms": rooms, "cabins": cabins}
    save(n, s)
    print(f"Created {path(n)}: {len(rooms)} rooms (all cat '?'), {len(cabins)} cabins")


def hull_parts(s: dict) -> list:
    """The hull is one polygon, or a list of polygons for decks drawn in separate pieces."""
    h = s["hull"]
    return [h] if h and isinstance(h[0][0], (int, float)) else list(h)


def validate(s: dict) -> list[str]:
    errs = []
    ids = set()
    for r in s["rooms"]:
        rid = r.get("id")
        if not rid or rid in ids:
            errs.append(f"room id missing or duplicated: {rid!r}")
        ids.add(rid)
        if r.get("cat") not in CATS and r.get("cat") != "?":
            errs.append(f"{rid}: invalid cat {r.get('cat')!r} (valid: {', '.join(CATS)})")
        if len(r.get("poly", [])) < 3:
            errs.append(f"{rid}: poly needs at least 3 points")
        elif poly_of(r).area < 20:
            errs.append(f"{rid}: polygon has (almost) no area - check the point order")
    nums = set()
    for c in s.get("cabins", []):
        if c.get("num") in nums:
            errs.append(f"cabin {c.get('num')} appears twice")
        nums.add(c.get("num"))
        if len(c.get("poly", [])) < 3:
            errs.append(f"cabin {c.get('num')}: poly needs at least 3 points")
    return errs


# ------------------------------------------------------------ edit commands


def _find(s: dict, rid: str) -> dict:
    for r in s["rooms"]:
        if r["id"] == rid:
            return r
    raise SystemExit(f"room {rid} not found (see ./pl rooms {s['deck']})")


def set_rooms(n: int, ids: list[str], name=None, cat=None, texto=None) -> None:
    s = load(n)
    for rid in ids:
        r = _find(s, rid)
        if name is not None:
            r["name"] = name
        if cat is not None:
            if cat not in CATS:
                raise SystemExit(f"invalid cat {cat!r}. Valid: {', '.join(CATS)}")
            r["cat"] = cat
        if texto is not None:
            r["texto"] = texto
    save(n, s)
    print(f"updated {len(ids)} room(s)")


def merge(n: int, ids: list[str], name=None, cat=None) -> None:
    s = load(n)
    rooms = [_find(s, rid) for rid in ids]
    geom = unary_union([poly_of(r).buffer(2.5) for r in rooms]).buffer(-2.5)
    if geom.geom_type == "MultiPolygon":
        print("warning: the rooms do not touch; keeping the biggest piece. Merge only neighbouring rooms.")
    keep = rooms[0]
    keep["poly"] = to_coords(geom)
    if name is not None:
        keep["name"] = name
    elif not keep.get("name"):
        keep["name"] = " ".join(r["name"] for r in rooms if r.get("name")).strip()
    if cat is not None:
        keep["cat"] = cat
    if not keep.get("texto"):
        keep["texto"] = next((r["texto"] for r in rooms if r.get("texto")), "")
    s["rooms"] = [r for r in s["rooms"] if r["id"] not in ids[1:]]
    save(n, s)
    print(f"merged {', '.join(ids)} into {keep['id']}")


def drop(n: int, ids: list[str]) -> None:
    s = load(n)
    for rid in ids:
        _find(s, rid)
    s["rooms"] = [r for r in s["rooms"] if r["id"] not in ids]
    save(n, s)
    print(f"dropped {len(ids)} room(s)")


def add_rect(n: int, x: int, y: int, w: int, h: int, name: str, cat: str) -> None:
    if cat not in CATS:
        raise SystemExit(f"invalid cat {cat!r}. Valid: {', '.join(CATS)}")
    s = load(n)
    rid = next_id(s)
    s["rooms"].append({"id": rid, "name": name, "cat": cat, "texto": "", "poly": [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]})
    save(n, s)
    print(f"added {rid}")


def snap(pts: list[list[float]], n: int, radius: int = 6) -> list[list[int]]:
    """Move each point to the nearest wall pixel (within radius) of the real plan."""
    import numpy as np

    lines = ref.ref(n)["lines"]
    h, w = lines.shape
    out = []
    for x, y in pts:
        x, y = int(round(x)), int(round(y))
        x0, y0 = max(0, x - radius), max(0, y - radius)
        win = lines[y0 : min(h, y + radius + 1), x0 : min(w, x + radius + 1)]
        ys, xs = np.nonzero(win)
        if len(xs):
            i = int(np.argmin((xs + x0 - x) ** 2 + (ys + y0 - y) ** 2))
            x, y = int(xs[i] + x0), int(ys[i] + y0)
        out.append([x, y])
    return out


def parse_poly(text: str) -> list[list[float]]:
    try:
        pts = [[float(v) for v in p.split(",")] for p in text.split()]
    except ValueError:
        raise SystemExit('--poly must look like "x1,y1 x2,y2 x3,y3 ..."')
    if len(pts) < 3 or any(len(p) != 2 for p in pts):
        raise SystemExit('--poly needs at least 3 points like "x1,y1 x2,y2 x3,y3"')
    return pts


def carve(n: int, src: str, pts: list[list[float]], name: str, cat: str, do_snap: bool = True) -> None:
    """Cut the shape `pts` out of room `src` and make it a new room (the rest stays in src)."""
    if cat not in CATS:
        raise SystemExit(f"invalid cat {cat!r}. Valid: {', '.join(CATS)}")
    s = load(n)
    r = _find(s, src)
    if do_snap:
        pts = snap(pts, n)
    cut = Polygon(pts).buffer(0)
    base = poly_of(r)
    new = base.intersection(cut)
    if new.area < 60:
        raise SystemExit(f"the shape does not overlap room {src} (overlap {new.area:.0f}px²). Check the coordinates with ./pl view")
    rest = base.difference(cut)
    pieces = [g for g in (rest.geoms if rest.geom_type == "MultiPolygon" else [rest]) if g.area >= 60]
    if not pieces:
        raise SystemExit(f"the shape covers all of {src}: use ./pl set instead")
    pieces.sort(key=lambda g: -g.area)
    r["poly"] = to_coords(pieces[0])
    for g in pieces[1:]:
        s["rooms"].append({"id": next_id(s), "name": r.get("name", ""), "cat": r.get("cat", "?"), "texto": "", "poly": to_coords(g)})
    rid = next_id(s)
    s["rooms"].append({"id": rid, "name": name, "cat": cat, "texto": "", "poly": to_coords(new)})
    save(n, s)
    extra = f" ({len(pieces) - 1} leftover piece(s) of {src} became separate rooms)" if len(pieces) > 1 else ""
    print(f"carved {rid} ({int(new.area)}px²) out of {src}{extra}")


def reshape(n: int, rid: str, pts: list[list[float]], do_snap: bool = True) -> None:
    """Give room `rid` a new outline. Parts of OTHER rooms under the new outline are cut away from them
    (rooms that end up entirely inside the new outline are kept as nested rooms, e.g. a bar inside a deck area).
    Use it to grow a room into a hole, to fix a venue that spills past a wall, or to redraw a rough rectangle on the real walls."""
    s = load(n)
    r = _find(s, rid)
    if do_snap:
        pts = snap(pts, n)
    new = Polygon(pts).buffer(0)
    if new.area < 60:
        raise SystemExit("the new outline is too small or invalid. Check the coordinates with ./pl view")
    changed = []
    for o in list(s["rooms"]):
        if o is r:
            continue
        p = poly_of(o)
        inter = p.intersection(new).area
        if inter < 30 or inter > 0.9 * p.area:  # untouched, or nested inside the new outline
            continue
        rest = p.difference(new)
        pieces = sorted((g for g in (rest.geoms if rest.geom_type == "MultiPolygon" else [rest]) if g.area >= 60), key=lambda g: -g.area)
        if not pieces:
            continue
        o["poly"] = to_coords(pieces[0])
        for g in pieces[1:]:
            s["rooms"].append({"id": next_id(s), "name": o.get("name", ""), "cat": o.get("cat", "?"), "texto": "", "poly": to_coords(g)})
        changed.append(o["id"])
    r["poly"] = to_coords(new)
    save(n, s)
    print(f"reshaped {rid} ({int(new.area)}px²)" + (f"; cut from: {' '.join(changed)}" if changed else ""))


def select(s: dict, ids=None, y0=None, y1=None, x0=None, x1=None, min_area=None, max_area=None, unnamed=False, cat=None) -> list[dict]:
    out = []
    for r in s["rooms"]:
        p = poly_of(r)
        bx0, by0, bx1, by1 = p.bounds
        if ids and r["id"] not in ids:
            continue
        if y0 is not None and by0 < y0 or y1 is not None and by1 > y1:
            continue
        if x0 is not None and bx0 < x0 or x1 is not None and bx1 > x1:
            continue
        if min_area is not None and p.area < min_area or max_area is not None and p.area > max_area:
            continue
        if unnamed and r.get("name"):
            continue
        if cat is not None and r.get("cat") != cat:
            continue
        out.append(r)
    return out


def set_many(n: int, new_cat: str, **filters) -> None:
    if new_cat not in CATS:
        raise SystemExit(f"invalid cat {new_cat!r}. Valid: {', '.join(CATS)}")
    s = load(n)
    sel = select(s, **filters)
    for r in sel:
        r["cat"] = new_cat
    save(n, s)
    print(f"set cat={new_cat} on {len(sel)} room(s): {' '.join(r['id'] for r in sel)}")


def rooms_table(n: int, **filters) -> None:
    s = load(n)
    R = ref.ref(n)
    labels = ref.venue_labels(n)
    sel = select(s, **filters)
    print(f"{'id':6} {'cat':10} {'area':>6} {'bbox x,y,w,h':20} name  [OCR text inside]")
    for r in sel:
        p = poly_of(r)
        x0, y0, x1, y1 = p.bounds
        inside = [t["text"] for t in labels if p.buffer(4).contains(_pt(t))]
        bb = f"{int(x0)},{int(y0)},{int(x1 - x0)},{int(y1 - y0)}"
        print(f"{r['id']:6} {r.get('cat', '?'):10} {int(p.area):6} {bb:20} {r.get('name', '')!r}" + (f"  {inside}" if inside else ""))
    print(f"({len(sel)} of {len(s['rooms'])} rooms; image is {R['w']}x{R['h']}, bow at the top)")


def _pt(t):
    from shapely.geometry import Point

    return Point(t["cx"], t["cy"])


def fix_cabin(n: int, old: str, new: str) -> None:
    s = load(n)
    for c in s["cabins"]:
        if c["num"] == old:
            c["num"] = new
            save(n, s)
            print(f"cabin {old} -> {new}")
            return
    raise SystemExit(f"cabin {old} not found")


def add_cabin(n: int, num: str, x: int, y: int, w: int, h: int) -> None:
    s = load(n)
    s["cabins"].append({"num": num, "poly": [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]})
    s["cabins"].sort(key=lambda c: c["num"])
    save(n, s)
    print(f"added cabin {num}")


def drop_cabin(n: int, nums: list[str]) -> None:
    s = load(n)
    s["cabins"] = [c for c in s["cabins"] if c["num"] not in nums]
    save(n, s)
    print(f"dropped cabins {' '.join(nums)}")


__all__ = ["CATS", "PUBLIC_CATS", "load", "save", "init", "validate", "poly_of", "box"]


# ------------------------------------------------------------ doors (portas)
# A room may carry "portas": [[x, y, w], ...] (points on its outline, w = opening width in px)
# or "aberto": true (open-plan venue with no walls: you can walk in from any side).
# The GPS (tools/rotas.py) treats the outline of a room with doors as a solid wall except at the doors.

DOOR_W = 12


def door_segments(r: dict) -> list:
    """The stretch of the room outline covered by each door (shapely LineStrings)."""
    from shapely.ops import substring

    p = poly_of(r)
    if p.is_empty or not r.get("portas"):
        return []
    if p.geom_type == "MultiPolygon":
        p = max(p.geoms, key=lambda g: g.area)
    ring = p.exterior
    L = ring.length
    out = []
    for d in r["portas"]:
        x, y = d[0], d[1]
        w = d[2] if len(d) > 2 else DOOR_W
        t = ring.project(Point(x, y))
        a, b = t - w / 2, t + w / 2
        if a < 0 or b > L:  # the door straddles the ring's start point
            from shapely.geometry import LineString

            pts = list(substring(ring, a % L, L).coords) + list(substring(ring, 0, b % L).coords)
            out.append(LineString(pts))
        else:
            out.append(substring(ring, a, b))
    return out


def doors(n: int, rid: str, add: list[list[float]] | None = None, clear: bool = False, aberto: bool | None = None, rm: list[int] | None = None) -> None:
    s = load(n)
    r = _find(s, rid)
    p = poly_of(r)
    if clear:
        r.pop("portas", None)
    if rm:
        r["portas"] = [d for i, d in enumerate(r.get("portas", []), 1) if i not in rm]
    for d in add or []:
        x, y = d[0], d[1]
        w = int(d[2]) if len(d) > 2 else DOOR_W
        ring = (max(p.geoms, key=lambda g: g.area) if p.geom_type == "MultiPolygon" else p).exterior
        q = ring.interpolate(ring.project(Point(x, y)))
        dist = q.distance(Point(x, y))
        if dist > 15:
            raise SystemExit(f"{rid}: the point {x:.0f},{y:.0f} is {dist:.0f}px away from the room outline (max 15). Put the door ON the wall of the room.")
        r.setdefault("portas", []).append([int(round(q.x)), int(round(q.y)), w])
    if aberto is not None:
        if aberto:
            r["aberto"] = True
        else:
            r.pop("aberto", None)
    if not r.get("portas"):
        r.pop("portas", None)
    save(n, s)
    sync_doors(n, quiet=True)
    ds = " ".join(f"#{i}=({d[0]},{d[1]} w{d[2]})" for i, d in enumerate(r.get("portas", []), 1))
    print(f"{rid} {r.get('name', '')!r}: doors {ds or 'none'}{' | aberto (open-plan)' if r.get('aberto') else ''}")


def door_suggest(n: int, rid: str, step: float = 1.0) -> None:
    """Gaps in the real plan's walls along the room outline: places where the outline runs over
    no ink for a while. Doors are usually such gaps (or a door-swing arc)."""
    import numpy as np

    R = ref.ref(n)
    lines = R["lines"]
    H, W = lines.shape
    s = load(n)
    r = _find(s, rid)
    p = poly_of(r)
    if p.geom_type == "MultiPolygon":
        p = max(p.geoms, key=lambda g: g.area)
    ring = p.exterior
    L = ring.length
    # sample the outline side by side, so a gap never wraps around a corner
    coords = list(ring.coords)
    print(f"{rid} {r.get('name', '')!r}: outline {L:.0f}px. Gaps in the real walls, per side (put a door in the MIDDLE of a gap):")
    found = 0
    for (ax, ay), (bx, by) in zip(coords, coords[1:]):
        seg_len = ((bx - ax) ** 2 + (by - ay) ** 2) ** 0.5
        if seg_len < 8:
            continue
        m = int(seg_len // step)
        ink = []
        for i in range(m + 1):
            t = i / max(1, m)
            x, y = int(round(ax + t * (bx - ax))), int(round(ay + t * (by - ay)))
            win = lines[max(0, y - 3) : min(H, y + 4), max(0, x - 3) : min(W, x + 4)]
            ink.append(bool(win.any()))
        i = 0
        while i < len(ink):
            if ink[i]:
                i += 1
                continue
            j = i
            while j < len(ink) and not ink[j]:
                j += 1
            ln = (j - i) * step
            if ln >= 6:
                t = ((i + j) / 2) / max(1, m)
                found += 1
                side = "whole side open" if ln > 0.85 * seg_len else ""
                print(f"  side ({ax:.0f},{ay:.0f})-({bx:.0f},{by:.0f}): gap {ln:4.0f}px centred at {ax + t * (bx - ax):.0f},{ay + t * (by - ay):.0f} {side}")
            i = j
    if not found:
        print("  no gap: the walls are closed all round (look for a door-swing arc on the image)")


def door_todo(n: int) -> None:
    """Named public rooms that have neither doors nor the 'aberto' flag."""
    s = load(n)
    todo = [r for r in s["rooms"] if r.get("name") and r["cat"] in PUBLIC_CATS and not r.get("portas") and not r.get("aberto")]
    done = [r for r in s["rooms"] if r.get("portas") or r.get("aberto")]
    print(f"deck {n}: {len(done)} rooms done, {len(todo)} named public rooms without doors / aberto:")
    for r in todo:
        x0, y0, x1, y1 = poly_of(r).bounds
        print(f"  {r['id']:6} {r['cat']:9} bbox {x0:.0f},{y0:.0f}-{x1:.0f},{y1:.0f}  {r['name']}")


def sync_doors(n: int, quiet: bool = False) -> None:
    """Doors do not change the score, so they are copied straight into best/ (same room id),
    instead of waiting for the score ratchet."""
    bp = BEST / f"deck-{n}.json"
    if not bp.exists():
        return
    cur = {r["id"]: r for r in load(n)["rooms"]}
    b = load(n, bp)
    k = 0
    for r in b["rooms"]:
        c = cur.get(r["id"])
        for key in ("portas", "aberto"):
            v = c.get(key) if c else None
            if v != r.get(key):
                k += 1
                if v:
                    r[key] = v
                else:
                    r.pop(key, None)
    bp.write_text(_dump(b))
    if not quiet or k:
        print(f"best/deck-{n}.json: doors synced ({k} changes)")
