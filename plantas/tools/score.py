"""Score a deck spec against the real plan (0-100) and print hints for what
to improve next. The best version of each deck is saved automatically."""

from __future__ import annotations

import json
import re
import shutil

import cv2
import numpy as np
from rapidfuzz import fuzz
from shapely.geometry import Point
from shapely.strtree import STRtree

import ref
import spec

WEIGHTS = {"hull": 5, "edges": 10, "cover": 10, "labels": 20, "semantics": 25, "cats": 10, "texto": 10, "cabins": 25}

# Venue name keywords -> categories that make sense for it (first match wins)
RULES = [
    (r"himalayan|ropes|arvorismo|zip ?line", {"esporte"}),
    (r"yacht", {"restrito", "comida", "bar", "piscina", "servico"}),
    (r"galley|crew|storage|bridge|kitchen|laundry", {"restrito"}),
    (r"lift|stair|elevator|lobby|corridor", {"circulacao", "servico"}),
    (r"starship|\bbar\b|\bpub\b|wine|champagne|cocktail", {"bar", "show", "comida"}),
    (r"pool|solarium|aquapark|whirlpool|jacuzzi|sun ?deck|slide|beach|lido", {"piscina", "esporte"}),
    (r"theat|th[eé][aâ]tre|casino|disco|carousel|lounge|studio|amphitheat|horizon|club 33", {"show", "bar"}),
    (r"restaurant|buffet|marketplace|caf[eé]|coffee|chocolat|cr[eê]pe|gelato|ice cream|tapas|tacos|cantina|sushi|teppanyaki|kaito|butcher|steak|indochine|hola|pizza|grill|eataly|dining|patisserie|minuetto|opera|symphony|danube|campo|pavilion", {"comida", "bar"}),
    (r"gym|sport|fitness|track|arcade|cinema|\bxd\b|bowling|ropes|simulator|virtual|\bf1\b|game", {"esporte", "show"}),
    (r"kids|lego|chicco|teen|young|baby|junior|doremi|mini club|family", {"criancas", "comida"}),
    (r"shop|boutique|jewel|duty|store|plaza|photo|gallery|fashion|perfume|logo|luxury|emporium|art", {"loja", "servico", "show", "bar"}),
    (r"reception|guest|excursion|spa|salon|library|medical|hospital|card room|conference|business|foundation|chapel|hub|tour|desk|future cruise|beauty|barber|atrium|infinity", {"servico", "loja", "bar", "circulacao"}),
]


def allowed_cats(label: str):
    for rx, cats in RULES:
        if re.search(rx, label.lower()):
            return rx, cats
    return None, None


def norm(t: str) -> str:
    t = t.lower().replace("’", "'")
    t = re.sub(r"[^a-z0-9&'@ ]+", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def raster(polys, h, w, fill=True) -> np.ndarray:
    m = np.zeros((h, w), np.uint8)
    pts = [np.array(p, np.int32).reshape(-1, 1, 2) for p in polys if len(p) >= 3]
    if fill:
        for p in pts:  # one by one: fillPoly with several polygons treats nested ones as holes
            cv2.fillPoly(m, [p], 1)
    else:
        cv2.polylines(m, pts, True, 1, 1)
    return m


def score(n: int, s: dict | None = None) -> dict:
    s = s or spec.load(n)
    R = ref.ref(n)
    h, w = R["h"], R["w"]
    errs = spec.validate(s)
    if errs:
        return {"deck": n, "total": 0.0, "parts": {}, "errors": errs, "hints": ["Fix the errors first."]}

    parts: dict[str, float] = {}
    hints: list[str] = []
    rooms = s["rooms"]
    cabins = s.get("cabins", [])

    # 1) hull: IoU with the real outline
    hull = raster(spec.hull_parts(s), h, w)
    inter = np.logical_and(hull, R["hull"]).sum()
    union = np.logical_or(hull, R["hull"]).sum()
    parts["hull"] = inter / union if union else 0
    if parts["hull"] < 0.97:
        hints.append(f"hull: IoU {parts['hull']:.3f}. The 'hull' polygon should follow the outer outline of the ship (run ./pl view {n} --mode overlay).")

    # 2) edges: the outlines you draw must sit on real walls (precision, 3px tolerance)
    all_polys = [r["poly"] for r in rooms] + [c["poly"] for c in cabins] + spec.hull_parts(s)
    edges = raster(all_polys, h, w, fill=False)
    dist = cv2.distanceTransform((1 - R["lines"]).astype(np.uint8), cv2.DIST_L2, 3)
    on = edges > 0
    parts["edges"] = float((dist[on] <= 3).mean()) if on.any() else 0
    if parts["edges"] < 0.9:
        bad = []
        for r in rooms:
            e = raster([r["poly"]], h, w, fill=False) > 0
            if e.sum() > 20:
                bad.append(((dist[e] <= 3).mean(), r["id"]))
        bad.sort()
        hints.append("edges: these rooms have outlines that do not follow walls (fix or redraw them): " + ", ".join(f"{rid} ({p:.0%})" for p, rid in bad[:6]))

    # 3) cover: the meaningful enclosed areas of the real plan (>= 400px²) should be drawn, not left blank
    filled = raster([r["poly"] for r in rooms] + [c["poly"] for c in cabins], h, w)
    big_ids = [r["rid"] for r in R["regions"] if r["area"] >= 400]
    target = np.isin(R["lab"], big_ids)
    cov = np.logical_and(filled > 0, target).sum() / max(1, target.sum())
    parts["cover"] = min(1.0, cov / 0.95)
    if cov < 0.95:
        gap = np.logical_and(target, filled == 0).astype(np.uint8)
        gap = cv2.morphologyEx(gap, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
        nl, _, st, _ = cv2.connectedComponentsWithStats(gap)
        big = sorted(range(1, nl), key=lambda i: -st[i, cv2.CC_STAT_AREA])[:4]
        hints.append(f"cover: {cov:.0%} of the enclosed areas of the real plan are drawn (target 95%). Biggest blank areas (x,y,w,h): " + "; ".join(f"{st[i,0]},{st[i,1]},{st[i,2]},{st[i,3]}" for i in big) + " - a room you dropped or shrank? (./pl revert if so)")

    polys = [spec.poly_of(r) for r in rooms]
    tree = STRtree(polys) if polys else None

    # 4) labels: every venue name printed on the real plan must be inside a room with that name
    # 5) semantics: ...and that room must have a category that fits the name (Restaurant -> comida, Pool -> piscina...)
    labels = ref.venue_labels(n)
    ok = sem_ok = 0
    missing, wrong = [], []
    crowd: dict[str, int] = {}  # how many venue names fall inside each room
    for t in labels:
        pt = Point(t["cx"], t["cy"])
        inner = sorted((i for i in (tree.query(pt) if tree else []) if polys[i].contains(pt)), key=lambda i: polys[i].area)
        if inner:
            crowd[rooms[inner[0]]["id"]] = crowd.get(rooms[inner[0]]["id"], 0) + 1
    for t in labels:
        pt = Point(t["cx"], t["cy"])
        cand = [i for i in (tree.query(pt.buffer(6)) if tree else []) if polys[i].buffer(6).contains(pt)]
        cand.sort(key=lambda i: polys[i].area)  # innermost room first
        hit = next((i for i in cand if fuzz.partial_ratio(norm(t["text"]), norm(rooms[i].get("name", ""))) >= 80), None)
        if hit is None:
            if not cand:
                tip = " -> no room there: add one (./pl add) or carve one"
            elif crowd.get(rooms[cand[0]]["id"], 0) > 3:
                tip = f" -> inside big area {rooms[cand[0]]['id']}: carve the venue out of it (./pl carve {n} {rooms[cand[0]]['id']} --poly ... --name ... --cat ...)"
            else:
                tip = f" -> room {rooms[cand[0]]['id']} is there: give it this name (./pl set {n} {rooms[cand[0]]['id']} --name ...)"
            missing.append(f"'{t['text']}' at ({t['cx']:.0f},{t['cy']:.0f})" + tip)
            continue
        ok += 1
        r = rooms[hit]
        rx, cats = allowed_cats(r.get("name", "") + " " + t["text"])
        if r.get("cat") == "?":
            wrong.append(f"{r['id']} '{r.get('name')}' has no category")
        elif cats and r["cat"] not in cats:
            wrong.append(f"{r['id']} '{r.get('name')}' is cat {r['cat']}, expected one of {sorted(cats)}")
        elif not cats and r["cat"] in ("restrito", "circulacao", "cabines"):
            wrong.append(f"{r['id']} '{r.get('name')}' is a named venue but cat {r['cat']}: is it really not public?")
        else:
            sem_ok += 1
    # corridors: long thin unnamed rooms must be 'circulacao'
    thin_ok = 0
    thin = []
    cab_polys = [spec.poly_of(c) for c in cabins]
    cab_tree = STRtree(cab_polys) if cab_polys else None
    for r, p in zip(rooms, polys):
        if r.get("name") or p.is_empty:
            continue
        if cab_tree is not None:  # the corridor the cabin doors open onto
            near = sum(1 for j in cab_tree.query(p.buffer(4)) if cab_polys[j].intersects(p.buffer(4)))
            if near >= 6 and p.area > 2000:
                thin.append(r)
                if r.get("cat") == "circulacao":
                    thin_ok += 1
                continue
        mrr = p.minimum_rotated_rectangle
        xs, ys = mrr.exterior.coords.xy
        a = ((xs[1] - xs[0]) ** 2 + (ys[1] - ys[0]) ** 2) ** 0.5
        b = ((xs[2] - xs[1]) ** 2 + (ys[2] - ys[1]) ** 2) ** 0.5
        long_, short = max(a, b), max(1.0, min(a, b))
        if short <= 40 and long_ >= 150 and long_ / short >= 5:
            thin.append(r)
            if r.get("cat") == "circulacao":
                thin_ok += 1
    # lifts: a 'Lift' printed on the plan must be inside a circulacao room (not swallowed by a venue or deck area).
    # 'Panoramic Lift' labels count too: their glass shafts are real lift blocks a venue can swallow
    # (they used to be dropped as watermark noise in ref.venue_labels, which made swallowing them score-invisible).
    lift_bad = []
    lifts = [t for t in R["labels"] if norm(t["text"]) in ("lift", "lifts", "panoramic lift", "panoramic lifts")]
    for t in lifts:
        pano = norm(t["text"]).startswith("panoramic")
        pt = Point(t["cx"], t["cy"])
        inner = sorted((i for i in (tree.query(pt) if tree else []) if polys[i].contains(pt)), key=lambda i: polys[i].area)
        if not inner or rooms[inner[0]].get("cat") == "circulacao":
            continue
        r = rooms[inner[0]]
        if pano and "atrium" in norm(r.get("name", "")):
            continue  # glass panoramic lifts can stand open inside an atrium: no shaft walls to carve (deck 5)
        # if a circulacao room comes close to the label, its outline is the defect - not a missing room
        cand = [i for i in (tree.query(pt.buffer(40)) if tree else []) if rooms[i].get("cat") == "circulacao" and not polys[i].is_empty]
        near = min(cand, key=lambda i: polys[i].distance(pt), default=None)
        d = polys[near].distance(pt) if near is not None else 1e9
        if near is not None and d <= (6 if pano else 40):
            # a vertical label's OCR box is wider than the shaft it sits in, so a covered panoramic
            # lift may read up to ~6px outside the room polygon (labels check uses the same tolerance)
            if not pano or d > 6:
                lift_bad.append(f"'{t['text']}' at ({t['cx']:.0f},{t['cy']:.0f}): the outline of {rooms[near]['id']} '{rooms[near].get('name', '')}' ends {d:.0f}px short of the printed lift - extend it onto the shaft walls")
        else:
            lift_bad.append(f"'{t['text']}' at ({t['cx']:.0f},{t['cy']:.0f}) is inside {r['id']} '{r.get('name', '')}' (cat {r.get('cat')}) - carve the lift block out as its own room with cat circulacao (name 'Elevadores'), following its walls")
    if lift_bad:
        hints.append("lifts: the printed lift is not covered by a circulacao room: " + "; ".join(lift_bad[:6]))
    n_sem = len(labels) + len(thin) + len(lifts)
    parts["labels"] = ok / len(labels) if labels else None
    parts["semantics"] = (sem_ok + thin_ok + len(lifts) - len(lift_bad)) / n_sem if n_sem else None
    bad_thin = [r["id"] for r in thin if r.get("cat") != "circulacao"]
    if bad_thin:
        hints.append(f"corridors: these unnamed rooms look like corridors (long and thin, or next to many cabins) -> cat circulacao (check with ./pl view; if one is really something else, give it a name): {' '.join(bad_thin[:15])}{' ...' if len(bad_thin) > 15 else ''}")
    if missing:
        hints.append(f"labels: {ok}/{len(labels)} venue names matched. Missing: " + "; ".join(missing[:8]))
    if wrong:
        hints.append(f"semantics: {sem_ok}/{len(labels)} named venues have a fitting category. Fix: " + "; ".join(list(dict.fromkeys(wrong))[:8]))

    # 6) cabins: every cabin number found on the real plan, at the right place
    rc = R["cabins"]
    if rc:
        by_num = {c["num"]: c for c in cabins}
        good = 0
        miss = []
        for c in rc:
            mine = by_num.get(c["num"])
            if mine and spec.poly_of(mine).buffer(3).contains(Point(c["cx"], c["cy"])):
                good += 1
            else:
                miss.append(f"{c['num']}@({c['cx']:.0f},{c['cy']:.0f})")
        parts["cabins"] = good / len(rc)
        if miss:
            hints.append(f"cabins: {good}/{len(rc)} found. Missing or misplaced: " + ", ".join(miss[:12]))
        ranges = deck_range(n)
        if ranges:
            lo, hi = ranges[0]
            seen = {int(c["num"]) for c in cabins if c["num"].isdigit()}
            weird = sorted(c["num"] for c in cabins if not c["num"].isdigit() or not any(a <= int(c["num"]) <= b for a, b in ranges))
            if weird:
                hints.append(f"cabins outside the official range {' + '.join(f'{a}-{b}' for a, b in ranges)} - verify visually in ./pl view before changing a number (duplex suites are printed with the lower-deck number, so the plan may really print it); if it is really junk, fix with ./pl cabin-fix: {', '.join(weird[:10])}")
            gaps = [x for x in range(lo, hi + 1) if x not in seen]
            hints.append(f"info: {len(seen)} cabins in the spec; numbers between {lo} and {hi} not present: {len(gaps)} (some numbers are simply not used on the ship - only add a cabin if you SEE it in ./pl view)")
    else:
        parts["cabins"] = None

    # 7) cats: every room classified (area-weighted)   8) texto: public venues need name + short pt-BR text
    area = sum(p.area for p in polys) or 1
    todo_cat = [r["id"] for r in rooms if r.get("cat") == "?"]
    parts["cats"] = sum(p.area for r, p in zip(rooms, polys) if r.get("cat") != "?") / area
    pub = [r for r in rooms if r.get("cat") in spec.PUBLIC_CATS]
    todo_name = [r["id"] for r in pub if not r.get("name")]
    todo_text = [r["id"] for r in pub if r.get("name") and not 25 <= len(r.get("texto", "")) <= 260]
    parts["texto"] = (len(pub) - len(todo_name) - len(todo_text)) / len(pub) if pub else None
    if todo_cat:
        hints.append(f"cats: {len(todo_cat)} rooms still have cat '?': {' '.join(todo_cat[:15])}{' ...' if len(todo_cat) > 15 else ''}")
    if todo_name:
        hints.append(f"names: public rooms ({'/'.join(sorted(spec.PUBLIC_CATS))}) without a name - name them, or give them a non-public cat: {' '.join(todo_name[:15])}")
    if todo_text:
        hints.append(f"texto: public rooms without a description in Portuguese (25-260 chars): {' '.join(todo_text[:15])}")

    # junk names on cabin decks: these decks print no venue names, so every name should be one of
    # the standard ones; anything else is an OCR fragment a worker copied in ('eMa', 'dde', 'app',
    # 'clift Gapp' all shipped at 1.000). Hint only - a real odd name must not lose points.
    if not labels:
        std_names = {"escada", "escadas", "elevadores", "lift", "lifts", "panoramic lift", "panoramic lifts",
                     "navigation bridge", "ponte de navegacao", "area da tripulacao", "area de servico", "cabines", "cabins"}
        import unicodedata

        def deaccent(t: str) -> str:
            return re.sub(r"\s+", " ", unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode()).strip().lower()

        junk = [f"{r['id']} '{r.get('name')}'" for r, p in zip(rooms, polys) if r.get("name") and deaccent(r["name"]) not in std_names]
        if junk:
            hints.append('junk name suspected (hint only, no penalty): a deck with no printed venue names should only use standard room names (Escadas, Elevadores, Lift, Panoramic Lift, Ponte de Navegação, Área da tripulação, ...). If the name is an OCR fragment, clear it with ./pl set N <id> --name "": ' + "; ".join(junk[:8]))

    # penalties: overlapping rooms, tiny rooms
    pen = 0.0
    overlaps = []
    if tree:
        for i, p in enumerate(polys):
            for j in tree.query(p):
                if j <= i:
                    continue
                a = p.intersection(polys[j]).area
                small = min(p.area, polys[j].area)
                if a > 0.9 * small:  # one room drawn inside another (e.g. a kiosk in a hall): fine
                    continue
                if a > 0.2 * small and a > 30:
                    overlaps.append(f"{rooms[i]['id']}+{rooms[j]['id']}")
    tiny = [r["id"] for r, p in zip(rooms, polys) if p.area < 150]
    # same name on two rooms that overlap or touch = one venue split in pieces (double label on the map)
    dups = []
    if tree:
        for i, p in enumerate(polys):
            nm = norm(rooms[i].get("name", ""))
            if not nm:
                continue
            for j in tree.query(p.buffer(3)):
                if j > i and norm(rooms[j].get("name", "")) == nm and p.buffer(3).intersects(polys[j]):
                    dups.append(f"{rooms[i]['id']}+{rooms[j]['id']} '{rooms[i]['name']}'")
    pen += min(8, 1.0 * len(overlaps)) + min(5, 0.25 * len(tiny)) + min(4, 0.5 * len(dups))
    if dups:
        hints.append("duplicate: rooms with the same name that touch or overlap (the map shows the name twice). Merge them (./pl merge), or rename/reclassify the piece that is not really that venue: " + "; ".join(dups[:8]))
    if overlaps:
        hints.append(f"overlap: these rooms partly overlap (merge them, or fix one outline): {' '.join(overlaps[:10])}")
    if tiny:
        hints.append(f"tiny: rooms under 150px² are noise, drop or merge them: {' '.join(tiny[:15])}")
    # two cabins on ONE poly (a double-height cell the OCR read twice): the map prints both numbers on top
    # of each other. Deck 8 shipped 10 of these (audits/deck-8.md rounds 1-2); deck 14 still has two.
    cab_dups = []
    if cab_tree:
        for i, p in enumerate(cab_polys):
            if p.is_empty:
                continue
            for j in cab_tree.query(p):
                if j > i and not cab_polys[j].is_empty and p.intersection(cab_polys[j]).area > 0.5 * min(p.area, cab_polys[j].area):
                    cab_dups.append(f"{cabins[i]['num']}+{cabins[j]['num']}")
    pen += min(5, 1.0 * len(cab_dups))
    if cab_dups:
        hints.append("cabins duplicated: these pairs share ONE poly, so the map prints both numbers on top of each other (the real plan has two cells with a divider between them - zoom into ./pl view to find it). Drop both numbers and cabin-add the two halves along the divider: " + "; ".join(cab_dups[:8]))
    # a cabin poly far bigger than the real cell printed with its number: a leaked double-height cell or a
    # corridor band drawn as a cabin (evidence: deck 8 cabin 8231 ~4x its cell; deck 9 9112/9256/9266).
    # Match by number against the cache cells (reading cache is fine); cabins that are not in the cache at
    # all (hand-added duplex suites, e.g. deck 13's 12001-12008) have no reliable reference cell -> skip them.
    big_cab = []
    cache_cell = {c["num"]: spec.poly_of(c) for c in rc}
    for c, p in zip(cabins, cab_polys):
        cp = cache_cell.get(c["num"])
        if cp is None or cp.is_empty or cp.area < 500 or p.is_empty:
            continue  # cells under 500px² are OCR text boxes, not a reliable size reference
        if p.area > 1.6 * cp.area:
            big_cab.append(f"{c['num']} ({int(p.area)}px² vs cell {int(cp.area)}px²)")
    pen += min(5, 1.0 * len(big_cab))
    if big_cab:
        hints.append("cabins oversize: these cabin polys are far bigger than the real cell with their number (a leaked double-height cell or a corridor band). Check the walls in ./pl view and cabin-drop + cabin-add the real cell: " + "; ".join(big_cab[:8]))
    # degenerate slivers: after simplify(1.0) a real room keeps well under 100 vertices, so a poly with
    # hundreds of vertices on a tiny area is the tracer having traced a wall line as a "room" - it renders
    # as a stray thin line (audits deck 10 r64/r86: 604/453 verts; deck 11 r54/r66/r75; deck 15 r159).
    # (A bbox-fill rule was measured and rejected: audited-clean diagonal corridors and hairline wall
    # strips on decks 5/6/7/12/14/18 also have area/bbox < 0.05, but far fewer vertices.)
    slivers = []
    for r, p in zip(rooms, polys):
        v = len(r["poly"])
        if v >= 200 and p.area <= 2000:
            x0, y0, x1, y1 = p.bounds
            fill = p.area / max(1.0, (x1 - x0) * (y1 - y0))
            slivers.append(f"{r['id']} (fill {fill:.0%}, {v} verts)")
    pen += min(5, 0.25 * len(slivers))
    if slivers:
        hints.append("sliver: these rooms are degenerate wiggle strips (hundreds of vertices on a tiny area) that render as stray thin lines. Fold the strip into the adjacent room's outline (./pl reshape) or drop it: " + "; ".join(slivers[:10]))

    wsum = sum(WEIGHTS[k] for k, v in parts.items() if v is not None)
    total = sum(WEIGHTS[k] * v for k, v in parts.items() if v is not None) / wsum * 100 - pen
    return {"deck": n, "total": round(max(0.0, total), 2), "parts": {k: (round(v, 4) if v is not None else None) for k, v in parts.items()}, "penalty": pen, "errors": [], "hints": hints}


# official cabin ranges (CruiseMapper). A deck can need more than one range: the bow duplex
# suites are printed with their lower-deck number (deck 13 really prints 12001-12008,
# audits/deck-13.md rounds 1-2), and deck 9 really prints cabin 9000 (audits/deck-9.md).
RANGES: dict[int, list[tuple[int, int]]] = {
    5: [(5001, 5165)], 8: [(8001, 8262)], 9: [(9000, 9316)], 10: [(10001, 10428)],
    11: [(11001, 11440)], 12: [(12001, 12404)], 13: [(13001, 13402), (12001, 12008)],
    14: [(14001, 14288)], 15: [(15001, 15039)], 16: [(16001, 16026)], 18: [(18001, 18019)],
}


def deck_range(n: int) -> list[tuple[int, int]]:
    return RANGES.get(n, [])


def best_score(n: int) -> float | None:
    p = spec.BEST / f"deck-{n}.score.json"
    return json.loads(p.read_text())["total"] if p.exists() else None


def rescore_best(n: int) -> None:
    """After changing the scorer: re-score the saved best version with the CURRENT rules, so the ratchet compares like with like."""
    p = spec.BEST / f"deck-{n}.json"
    if not p.exists():
        print(f"deck {n}: no best yet")
        return
    old = best_score(n)
    res = score(n, json.loads(p.read_text()))
    (spec.BEST / f"deck-{n}.score.json").write_text(json.dumps(res, indent=1, ensure_ascii=False))
    print(f"deck {n}: best re-scored {old} -> {res['total']}")


def run(n: int, quiet: bool = False) -> dict:
    res = score(n)
    prev = best_score(n)
    if not res["errors"] and (prev is None or res["total"] >= prev):
        spec.BEST.mkdir(exist_ok=True)
        shutil.copy(spec.path(n), spec.BEST / f"deck-{n}.json")
        (spec.BEST / f"deck-{n}.score.json").write_text(json.dumps(res, indent=1, ensure_ascii=False))
        res["status"] = "NEW BEST" if prev is None or res["total"] > prev else "same as best (saved)"
        res["status"] += f" (was {prev})"
    else:
        res["status"] = f"not better than best ({prev}). If this edit made things worse, run: ./pl revert {n}"
    if not quiet:
        print(f"deck {n}: SCORE {res['total']}  [{res['status']}]")
        for k, v in res["parts"].items():
            print(f"  {k:7} {'n/a' if v is None else f'{v:.3f}'}  (weight {WEIGHTS[k]})")
        if res.get("penalty"):
            print(f"  penalty -{res['penalty']}")
        for e in res["errors"]:
            print("  ERROR:", e)
        print("Hints:")
        for hnt in res["hints"]:
            print("  -", hnt)
    return res
