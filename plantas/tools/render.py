"""Images to look at (reference / ours / overlay, with a coordinate grid)
and the final SVG export in the site's style."""

from __future__ import annotations

import json
import re
from html import escape

import numpy as np
from PIL import Image, ImageDraw, ImageFont

import ref
import spec

OUT = ref.ROOT / "out"
EXPORT = ref.ROOT / "export"

# Same colours as src/styles/base.css ([data-cat] fill / ink)
COLORS = {
    "show": ("#ffe3d8", "#8a2c10"),
    "comida": ("#fdecc8", "#7a4a00"),
    "bar": ("#efe6fb", "#4b2a8a"),
    "piscina": ("#d4eafa", "#0b4f7a"),
    "esporte": ("#d9f0e0", "#1d6b3c"),
    "criancas": ("#fff3b8", "#6b5a00"),
    "loja": ("#d3efeb", "#0d5f57"),
    "servico": ("#e4ebf5", "#33415a"),
    "cabines": ("#f3efe8", "#66707f"),
    "restrito": ("#ebe7e0", "#66707f"),
    "circulacao": ("#faf8f3", "#66707f"),
    "?": ("#ff00ff", "#ffffff"),  # unclassified: bright magenta so it stands out
}
NAVY = "#0b1f3a"
WATER = ("#8ecdf2", "#0b4f7a")  # the water itself (pools, whirlpools), darker than the deck around it
WATER_RX = re.compile(r"pool|piscina|whirlpool|hidromassagem|jacuzzi|aquapark|water ?park|slide|tobog", re.I)


def fill_of(r: dict) -> str:
    if r.get("cat") == "piscina" and WATER_RX.search(r.get("name", "")):
        return WATER[0]
    return COLORS.get(r.get("cat", "?"), COLORS["?"])[0]


def _chord(poly, x: float, y: float, horizontal: bool = True) -> tuple[float, float]:
    from shapely.geometry import LineString
    bx0, by0, bx1, by1 = poly.bounds
    if horizontal:
        line = LineString([(bx0 - 10, y), (bx1 + 10, y)]).intersection(poly)
        axis, target = 0, x
    else:
        line = LineString([(x, by0 - 10), (x, by1 + 10)]).intersection(poly)
        axis, target = 1, y
    if line.is_empty:
        return 0.0, target
    segs = [line] if line.geom_type == "LineString" else [
        g for g in getattr(line, "geoms", []) if g.geom_type == "LineString"
    ]
    for s in segs:
        if len(s.coords) < 2:
            continue
        c0, c1 = s.coords[0][axis], s.coords[-1][axis]
        lo, hi = min(c0, c1), max(c0, c1)
        if lo - 1 <= target <= hi + 1:
            return hi - lo, (lo + hi) / 2
    return 0.0, target


def _clearance(poly, pt) -> float:
    """Distance from pt to the nearest wall of poly (outer edge or a hole)."""
    return min([poly.exterior.distance(pt)] + [hole.distance(pt) for hole in poly.interiors])


def label_info(rooms: list[dict]) -> dict[str, tuple[float, float, float, float]]:
    """Where to write each room's name and its local (width, height) span:
    the centered open spot of the room once nested rooms are removed."""
    from shapely.geometry import LineString, Point
    from shapely.ops import polylabel, unary_union

    polys = [spec.poly_of(r) for r in rooms]
    out: dict[str, tuple[float, float, float, float]] = {}
    for i, (r, p) in enumerate(zip(rooms, polys)):
        if p.is_empty:
            continue
        inner = [q for j, q in enumerate(polys) if j != i and not q.is_empty and q.area < p.area and p.intersection(q).area > 0.5 * q.area]
        free = p.difference(unary_union(inner)) if inner else p
        if free.is_empty or free.area < 0.1 * p.area:
            free = p
        if free.geom_type == "MultiPolygon":
            free = max(free.geoms, key=lambda g: g.area)
        elif free.geom_type != "Polygon":
            polys_only = [g for g in getattr(free, "geoms", []) if g.geom_type == "Polygon"]
            free = max(polys_only, key=lambda g: g.area) if polys_only else p
        try:
            pt = polylabel(free, tolerance=1.0)
        except Exception:
            pt = free.representative_point()
        min_clear = _clearance(free, pt) * 0.85
        cx, cy = float(pt.x), float(pt.y)
        w, cx_mid = _chord(free, cx, cy, horizontal=True)
        h, cy_mid = _chord(free, cx, cy, horizontal=False)
        h_at_cxm, cy_mid_at_cxm = _chord(free, cx_mid, cy, horizontal=False)
        p_cxm = Point(cx_mid, cy)
        if h_at_cxm >= min(h * 0.8, 36.0) and free.contains(p_cxm) and _clearance(free, p_cxm) >= min_clear:
            cx, h, cy_mid = cx_mid, h_at_cxm, cy_mid_at_cxm
        w_at_cym, _ = _chord(free, cx, cy_mid, horizontal=True)
        p_cym = Point(cx, cy_mid)
        if w_at_cym >= min(w * 0.8, 36.0) and free.contains(p_cym) and _clearance(free, p_cym) >= min_clear:
            cy, w = cy_mid, w_at_cym
        bx0, by0, bx1, by1 = free.bounds
        if (bx1 - bx0) > w * 1.4 and (by1 - by0) > 60:
            step = max(6, int((by1 - by0) / 40))
            run: list[tuple[int, float, float]] = []
            best_run: list[tuple[int, float, float]] = []
            for y_scan in range(int(by0) + 12, int(by1) - 11, step):
                line = LineString([(bx0 - 10, y_scan), (bx1 + 10, y_scan)]).intersection(free)
                segs = [line] if line.geom_type == "LineString" else [
                    g for g in getattr(line, "geoms", []) if g.geom_type == "LineString"
                ]
                wide = None
                for s in segs:
                    if len(s.coords) < 2:
                        continue
                    x0s = min(s.coords[0][0], s.coords[-1][0])
                    x1s = max(s.coords[0][0], s.coords[-1][0])
                    if (x1s - x0s) > w * 1.4:
                        wide = (y_scan, x1s - x0s, (x0s + x1s) / 2)
                        break
                if wide:
                    run.append(wide)
                    if len(run) > len(best_run):
                        best_run = list(run)
                else:
                    run = []
            if best_run and (best_run[-1][0] - best_run[0][0]) >= 36:
                mid_idx = len(best_run) // 2
                ym, wm, xm = best_run[mid_idx]
                hm, _ = _chord(free, xm, float(ym), horizontal=False)
                w, cx, cy, h = wm, xm, float(ym), max(hm, float(best_run[-1][0] - best_run[0][0]))
        if w <= 0:
            w = bx1 - bx0
        if h <= 0:
            h = by1 - by0
        out[r["id"]] = (cx, cy, w, h)
    return out


def label_points(rooms: list[dict]) -> dict:
    """Where to write each room's name: the most open spot of the room once the rooms drawn inside it are removed
    (so 'Deck aberto' is not written in the middle of the pool that sits inside it)."""
    return {rid: (cx, cy) for rid, (cx, cy, _, _) in label_info(rooms).items()}


CABIN = ("#f3efe8", "#33415a")


def font(size: int):
    for f in ("/usr/share/fonts/google-noto/NotoSans-Regular.ttf", "/usr/share/fonts/liberation-sans-fonts/LiberationSans-Regular.ttf"):
        try:
            return ImageFont.truetype(f, size)  # has accents (ç, é, ã)
        except OSError:
            pass
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def draw_ours(n: int, s: dict, scale: int, show_ids: bool, alpha: int = 255) -> Image.Image:
    R = ref.ref(n)
    W, H = R["w"] * scale, R["h"] * scale
    img = Image.new("RGBA", (W, H), (255, 255, 255, 0 if alpha < 255 else 255))
    d = ImageDraw.Draw(img, "RGBA")
    sc = lambda poly: [(x * scale, y * scale) for x, y in poly]  # noqa: E731
    for hp in spec.hull_parts(s):
        d.polygon(sc(hp), fill="#faf8f3" if alpha == 255 else None, outline=NAVY, width=3)
    for r in sorted(s["rooms"], key=lambda r: -spec.poly_of(r).area):  # big first: nested rooms stay visible
        fill = fill_of(r)
        f = fill if alpha == 255 else fill + "88"
        d.polygon(sc(r["poly"]), fill=f, outline=NAVY, width=2 if alpha == 255 else 2)
    for c in s.get("cabins", []):
        d.polygon(sc(c["poly"]), fill=CABIN[0] if alpha == 255 else None, outline="#1557a5", width=1)
    for r in s["rooms"]:  # doors: thick orange stretch of the outline + a dot
        for i, seg in enumerate(spec.door_segments(r), 1):
            d.line(sc(seg.coords), fill="#ff6a00", width=3 * scale)
            mx, my = seg.interpolate(0.5, normalized=True).coords[0]
            d.ellipse([mx * scale - 2 * scale, my * scale - 2 * scale, mx * scale + 2 * scale, my * scale + 2 * scale], fill="#c0005a")
    f_name, f_id, f_cab = font(9 * scale), font(7 * scale), font(6 * scale)
    lp = label_points(s["rooms"])
    for r in s["rooms"]:
        if r["id"] not in lp:
            continue
        cx, cy = lp[r["id"]]
        _, ink = COLORS.get(r.get("cat", "?"), COLORS["?"])
        txt = r.get("name") or ""
        if show_ids:
            d.text((cx * scale, cy * scale - 5 * scale), r["id"], fill="#c0005a", font=f_id, anchor="mm")
        if txt and alpha == 255:
            d.text((cx * scale, cy * scale + 4 * scale), txt[:40], fill=ink, font=f_name, anchor="mm")
    if alpha == 255:
        for c in s.get("cabins", []):
            p = spec.poly_of(c)
            cx, cy = p.centroid.coords[0]
            d.text((cx * scale, cy * scale), c["num"], fill=CABIN[1], font=f_cab, anchor="mm")
    return img


def grid(img: Image.Image, scale: int, y0: int) -> Image.Image:
    """Coordinate grid in reference pixels (every 50px, labelled every 100px)."""
    d = ImageDraw.Draw(img, "RGBA")
    W, H = img.size
    f = font(9 * min(scale, 2))
    for x in range(0, W // scale + 1, 50):
        d.line([(x * scale, 0), (x * scale, H)], fill=(0, 120, 255, 70 if x % 100 else 120), width=1)
        if x % 100 == 0:
            for yy in range(0, H, 300 * scale):
                d.text((x * scale + 2, yy + 2), f"x{x}", fill=(0, 90, 220, 255), font=f)
    first = (y0 // 50 + (1 if y0 % 50 else 0)) * 50
    for y in range(first, y0 + H // scale + 1, 50):
        yy = (y - y0) * scale
        d.line([(0, yy), (W, yy)], fill=(0, 120, 255, 70 if y % 100 else 120), width=1)
        if y % 100 == 0:
            d.text((2, yy + 2), f"y{y}", fill=(0, 90, 220, 255), font=f)
    return img


def view(n: int, mode: str = "side", y0: int | None = None, y1: int | None = None, scale: int = 2, ids: bool = True, best: bool = False) -> str:
    R = ref.ref(n)
    s = spec.load(n, spec.BEST / f"deck-{n}.json" if best else None)
    H = R["h"]
    y0 = max(0, y0 if y0 is not None else 0)
    y1 = min(H, y1 if y1 is not None else min(H, y0 + 900))
    refimg = Image.open(ref.IMG_DIR / f"deck-{n}.webp").convert("RGBA")
    refimg = refimg.resize((R["w"] * scale, H * scale), Image.NEAREST)
    crop = lambda im: im.crop((0, y0 * scale, R["w"] * scale, y1 * scale))  # noqa: E731
    panels = []
    if mode in ("ref", "side"):
        panels.append(grid(crop(refimg.copy()), scale, y0))
    if mode in ("ours", "side"):
        panels.append(grid(crop(draw_ours(n, s, scale, ids)), scale, y0))
    if mode in ("overlay", "side"):
        base = crop(refimg.copy())
        faded = Image.blend(base, Image.new("RGBA", base.size, "white"), 0.45)
        ov = crop(draw_ours(n, s, scale, ids, alpha=120))
        faded.alpha_composite(ov)
        panels.append(grid(faded, scale, y0))
    gap = 12
    W = sum(p.width for p in panels) + gap * (len(panels) - 1)
    out = Image.new("RGB", (W, panels[0].height), "white")
    x = 0
    for p in panels:
        out.paste(p, (x, 0), p)
        x += p.width + gap
    OUT.mkdir(exist_ok=True)
    fn = OUT / f"deck-{n}_{mode}_{y0}-{y1}.png"
    out.save(fn)
    print(fn)
    return str(fn)


def svg(n: int, s: dict) -> str:
    w, h = s["image"]["w"], s["image"]["h"]
    pts = lambda p: " ".join(f"{x},{y}" for x, y in p)  # noqa: E731
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" class="planta-svg" data-deck="{n}">']
    for hp in spec.hull_parts(s):
        o.append(f'<polygon class="pl-casco" points="{pts(hp)}" fill="#faf8f3" stroke="{NAVY}" stroke-width="3"/>')
    for r in sorted(s["rooms"], key=lambda r: -spec.poly_of(r).area):
        fill = fill_of(r)
        o.append(f'<polygon class="pl-lugar" data-id="{r["id"]}" data-cat="{r["cat"]}" data-nome="{escape(r.get("name", ""))}" points="{pts(r["poly"])}" fill="{fill}" stroke="{NAVY}" stroke-width="1"/>')
    for c in s.get("cabins", []):
        o.append(f'<polygon class="pl-cabine" data-cabine="{c["num"]}" points="{pts(c["poly"])}" fill="{CABIN[0]}" stroke="#9aa5b5" stroke-width="0.8"/>')
    info = label_info(s["rooms"])
    for r in s["rooms"]:
        name = r.get("name", "").strip()
        if not name or r["cat"] in ("circulacao",) or r.get("rotulo") is False or r["id"] not in info:
            continue
        cx, cy, lw, lh = info[r["id"]]
        vertical = lh > 1.55 * lw and lw < 0.6 * len(name) * 11
        room_w = lh if vertical else lw
        fs = max(6.5, min(11.0, 0.88 * (room_w - 6) / max(1, 0.56 * len(name))))
        _, ink = COLORS.get(r["cat"], COLORS["?"])
        rot = f' transform="rotate(-90 {cx:.0f} {cy:.0f})"' if vertical else ""
        o.append(f'<text x="{cx:.0f}" y="{cy:.0f}" fill="{ink}" font-size="{fs:.1f}" font-weight="700" text-anchor="middle" dominant-baseline="middle"{rot}>{escape(name)}</text>')
    for c in s.get("cabins", []):
        cx, cy = spec.poly_of(c).centroid.coords[0]
        o.append(f'<text x="{cx:.0f}" y="{cy:.0f}" fill="#33415a" font-size="8" text-anchor="middle" dominant-baseline="middle">{c["num"]}</text>')
    o.append("</svg>")
    return "\n".join(o)


WEB = ref.ROOT.parent / "public" / "plantas"


def _d(poly) -> str:
    """Compact SVG path: absolute first point, then relative moves (integer pixels)."""
    pts = [(round(x), round(y)) for x, y in poly]
    out = [f"M{pts[0][0]} {pts[0][1]}"]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if (x1, y1) != (x0, y0):
            out.append(f"l{x1 - x0} {y1 - y0}")
    return "".join(out).replace(" -", "-") + "z"


def web_svg(n: int, s: dict) -> str:
    """Light SVG for the site (public/plantas/deck-N.svg). Colours come from the site's CSS
    ([data-cat] / .pw-* rules in base.css); the inline fills are only a fallback for viewing the file alone."""
    w, h = s["image"]["w"], s["image"]["h"]
    rooms = sorted(s["rooms"], key=lambda r: -spec.poly_of(r).area)
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" class="pw" data-deck="{n}" role="img" aria-label="Planta desenhada do deck {n}">']
    o.append('<g class="pw-casco">' + "".join(f'<path d="{_d(hp)}" fill="#faf8f3" stroke="{NAVY}" stroke-width="3"/>' for hp in spec.hull_parts(s)) + "</g>")
    o.append('<g class="pw-salas">')
    for r in rooms:
        name = r.get("name", "").strip()
        attrs = f'data-cat="{r["cat"]}"'
        if r["cat"] == "piscina" and WATER_RX.search(name):
            attrs += ' data-agua=""'
        if name:
            attrs += f' data-lugar="p{n}-{r["id"]}" data-n="{escape(name)}" data-t="{escape(r.get("texto", ""))}"'
        o.append(f'<path {attrs} fill="{fill_of(r)}" d="{_d(r["poly"])}"/>')
    o.append("</g>")
    portas = [(r, seg) for r in rooms for seg in spec.door_segments(r)]
    if portas:  # the opening: the wall line is painted over in the room's colour
        o.append('<g class="pw-portas">' + "".join(f'<path data-cat="{r["cat"]}"' + (f' data-porta="p{n}-{r["id"]}"' if r.get("name") else "") + ' d="M' + "L".join(f"{x:.1f} {y:.1f}" for x, y in seg.coords) + '"/>' for r, seg in portas) + "</g>")
    if s.get("cabins"):
        o.append('<g class="pw-cabines">' + "".join(f'<path data-cabine="{c["num"]}" d="{_d(c["poly"])}"/>' for c in s["cabins"]) + "</g>")
        o.append('<g class="pw-cnum">')
        for c in s["cabins"]:
            p = spec.poly_of(c)
            x0, y0, x1, y1 = p.bounds
            cx, cy = p.centroid.coords[0]
            fs = max(6, min(11, 0.9 * (x1 - x0) / (0.6 * len(str(c["num"])))))
            o.append(f'<text x="{cx:.0f}" y="{cy:.0f}" font-size="{fs:.0f}">{c["num"]}</text>')
        o.append("</g>")
    info = label_info(s["rooms"])
    o.append('<g class="pw-nomes">')
    for r in s["rooms"]:
        name = r.get("name", "").strip()
        if not name or r.get("rotulo") is False or r["id"] not in info:
            continue
        cx, cy, lw, lh = info[r["id"]]
        if r.get("cat") == "circulacao":
            if min(lw, lh) < 28 or max(lw, lh) < 42:
                continue
        vertical = lh > 1.55 * lw and lw < 0.58 * len(name) * 11
        room_w = lh if vertical else lw
        room_h = lw if vertical else lh
        fs = max(6.0, min(14.0, 0.88 * max(12.0, room_w - 6.0) / (0.58 * len(name))))
        fs = min(fs, max(6.0, (room_h - 4.0) * 0.72))
        rot = f' transform="rotate(-90 {cx:.0f} {cy:.0f})"' if vertical else ""
        o.append(f'<text x="{cx:.0f}" y="{cy:.0f}" font-size="{fs:.1f}" data-cat="{r["cat"]}"{rot}>{escape(name)}</text>')
    o.append("</g></svg>")
    return "".join(o)


def export(decks: list[int]) -> None:
    """Writes export/deck-N.svg and export/deck-N.json from the BEST version of each deck."""
    EXPORT.mkdir(exist_ok=True)
    for n in decks:
        p = spec.BEST / f"deck-{n}.json"
        if not p.exists():
            print(f"deck {n}: no best version yet, skipped")
            continue
        s = json.loads(p.read_text())
        (EXPORT / f"deck-{n}.svg").write_text(svg(n, s))
        WEB.mkdir(parents=True, exist_ok=True)
        (WEB / f"deck-{n}.svg").write_text(web_svg(n, s))
        slim = {"deck": n, "w": s["image"]["w"], "h": s["image"]["h"], "hull": s["hull"],
                "rooms": [{k: r[k] for k in ("id", "name", "cat", "texto", "rotulo", "poly", "portas", "aberto") if k in r} for r in s["rooms"]],
                "cabins": s.get("cabins", [])}
        (EXPORT / f"deck-{n}.json").write_text(json.dumps(slim, ensure_ascii=False, separators=(",", ":")))
        print(f"deck {n}: export/deck-{n}.svg + .json")


__all__ = ["view", "export", "np"]
