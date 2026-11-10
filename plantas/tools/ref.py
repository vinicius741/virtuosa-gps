"""Reference preprocessing: reads the real deck plan images and extracts
line mask, hull, enclosed regions, OCR labels and cabins. Results are cached
in plantas/cache/deck-N/ (run `./pl setup` once)."""

from __future__ import annotations

import json
import os
import re
from functools import lru_cache
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from rapidfuzz import fuzz

ROOT = Path(__file__).resolve().parents[1]  # plantas/
REPO = ROOT.parent
# The real deck plan images (deck-N.webp) used as reference. They are not part of this repository
# (they are not ours to license): put them in plantas/ref/ or point PLANTAS_REF at their folder.
IMG_DIR = Path(os.environ.get("PLANTAS_REF", ROOT / "ref"))
CACHE = ROOT / "cache"
DECKS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19]

# Words that are not venue names (ignored when scoring labels)
STOP = {"lift", "lifts", "panoramic lift", "cruisemapper", "www", "com", "cruisemapper.com", "www.cruisemapper.com"}

# Short words that ARE real venue words (other short OCR fragments are ignored)
SHORT_OK = {"pool", "spa", "gym", "bar", "hola", "shop", "hub", "disco", "club", "cafe", "café", "pub", "kids", "teen", "art", "top", "msc", "deck", "grill"}

MIN_REGION = 80  # px²: smaller enclosed areas are furniture/details


def deck_dir(n: int) -> Path:
    d = CACHE / f"deck-{n}"
    d.mkdir(parents=True, exist_ok=True)
    return d


def load_rgb(n: int) -> np.ndarray:
    return np.array(Image.open(IMG_DIR / f"deck-{n}.webp").convert("RGB"))


def line_mask(rgb: np.ndarray) -> np.ndarray:
    """1 where the plan has dark, unsaturated ink (walls, outlines, text)."""
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    dark = hsv[..., 2] < 125  # dark coloured borders (e.g. the dark green between cabins)
    return (((gray < 150) & (hsv[..., 1] < 70)) | dark).astype(np.uint8)


def hull_of(closed: np.ndarray):
    """Outline of the ship. Upper decks are drawn as separate pieces (bow and stern with
    nothing in between), so every big piece is kept; each piece's open top/bottom edge
    is capped so the flood fill from the border cannot leak into it."""
    h, w = closed.shape
    capped = closed.copy()
    rows = np.where(closed.any(axis=1))[0]
    if len(rows):
        splits = np.where(np.diff(rows) > 40)[0]
        starts = np.concatenate([[rows[0]], rows[splits + 1]])
        ends = np.concatenate([rows[splits], [rows[-1]]])
        for y0, y1 in zip(starts, ends):
            for y in (y0, y1):
                xs = np.where(closed[y])[0]
                capped[y, xs.min() : xs.max() + 1] = 1
    free = (capped == 0).astype(np.uint8)
    nlab, lab, _, _ = cv2.connectedComponentsWithStats(free, connectivity=4)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    inside = (~np.isin(lab, list(border))).astype(np.uint8)
    cnts, _ = cv2.findContours(inside, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    big = max(cv2.contourArea(c) for c in cnts)
    keep = sorted([c for c in cnts if cv2.contourArea(c) >= 0.05 * big], key=lambda c: c[:, 0, 1].min())
    hull = np.zeros_like(inside)
    cv2.drawContours(hull, keep, -1, 1, thickness=-1)
    polys = [cv2.approxPolyDP(c, 1.5, True)[:, 0, :].tolist() for c in keep]
    return hull, polys[0] if len(polys) == 1 else polys


def rehull(n: int) -> None:
    """Recompute only the hull (no OCR) from the cached line mask."""
    d = deck_dir(n)
    lines = (np.array(Image.open(d / "lines.png")) > 0).astype(np.uint8)
    closed = cv2.dilate(lines, np.ones((3, 3), np.uint8), iterations=1)
    hull, hull_poly = hull_of(closed)
    Image.fromarray(hull * 255).save(d / "hull.png")
    meta = json.loads((d / "regions.json").read_text())
    meta["hull"] = hull_poly
    (d / "regions.json").write_text(json.dumps(meta))
    ref.cache_clear()
    parts = 1 if hull_poly and isinstance(hull_poly[0][0], (int, float)) else len(hull_poly)
    print(f"deck {n}: hull {parts} piece(s), {int(hull.sum())} px")


def hull_and_regions(lines: np.ndarray):
    closed = cv2.dilate(lines, np.ones((3, 3), np.uint8), iterations=1)
    free = (closed == 0).astype(np.uint8)
    nlab, lab, stats, _ = cv2.connectedComponentsWithStats(free, connectivity=4)
    h, w = lines.shape
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    hull, hull_poly = hull_of(closed)

    regions = []
    for rid in range(1, nlab):
        if rid in border:
            continue
        x, y, bw, bh, area = stats[rid]
        if area < MIN_REGION:
            continue
        m = (lab[y : y + bh, x : x + bw] == rid).astype(np.uint8)
        cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        c = max(cs, key=cv2.contourArea)
        # walls were dilated by 1px: grow the region back so its outline sits on the wall
        poly = cv2.approxPolyDP(c, 1.2, True)[:, 0, :] + [x, y]
        if len(poly) < 3:  # very thin region: keep its full outline
            poly = c[:, 0, :] + [x, y]
        if len(poly) < 3:
            continue
        regions.append({"rid": int(rid), "area": int(area), "bbox": [int(x), int(y), int(bw), int(bh)], "poly": poly.tolist()})
    return hull, hull_poly, lab.astype(np.int32), regions


# ---------------------------------------------------------------- OCR

_ocr = None


def ocr_engine():
    global _ocr
    if _ocr is None:
        from rapidocr_onnxruntime import RapidOCR

        _ocr = RapidOCR()
    return _ocr


def _iou(a, b):
    ax0, ay0, ax1, ay1 = a
    bx0, by0, bx1, by1 = b
    ix = max(0, min(ax1, bx1) - max(ax0, bx0))
    iy = max(0, min(ay1, by1) - max(ay0, by0))
    inter = ix * iy
    u = (ax1 - ax0) * (ay1 - ay0) + (bx1 - bx0) * (by1 - by0) - inter
    return inter / u if u else 0


def run_ocr(rgb: np.ndarray) -> list[dict]:
    """OCR in tiles, in 3 orientations (labels on the plans can be vertical)."""
    eng = ocr_engine()
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    H, W = bgr.shape[:2]
    S = 2  # upscale: the text is small
    tile, step = 520, 440
    found = []
    for y0 in range(0, max(1, H - 80), step):
        crop = bgr[y0 : min(H, y0 + tile)]
        big = cv2.resize(crop, None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
        hb, wb = big.shape[:2]
        for rot in ("0", "cw", "ccw"):
            im = big if rot == "0" else cv2.rotate(big, cv2.ROTATE_90_CLOCKWISE if rot == "cw" else cv2.ROTATE_90_COUNTERCLOCKWISE)
            res, _ = eng(im)
            for box, text, conf in res or []:
                pts = []
                for xr, yr in box:
                    if rot == "0":
                        x, y = xr, yr
                    elif rot == "cw":
                        x, y = yr, hb - 1 - xr
                    else:
                        x, y = wb - 1 - yr, xr
                    pts.append((x / S, y0 + y / S))
                xs = [p[0] for p in pts]
                ys = [p[1] for p in pts]
                bb = [min(xs), min(ys), max(xs), max(ys)]
                bw, bh = bb[2] - bb[0], bb[3] - bb[1]
                vertical = bh > bw * 1.2
                if rot == "0" and vertical and len(text.strip()) > 2:
                    continue
                if rot != "0" and not vertical:
                    continue
                found.append({"text": text.strip(), "conf": round(float(conf), 3), "bbox": [round(v, 1) for v in bb], "vertical": vertical})
    # dedupe (tiles overlap, two rotated passes read the same vertical text)
    found.sort(key=lambda f: (-f["conf"], -len(f["text"])))
    keep: list[dict] = []
    for f in found:
        if any(_iou(f["bbox"], k["bbox"]) > 0.3 for k in keep):
            continue
        keep.append(f)
    keep.sort(key=lambda f: (f["bbox"][1], f["bbox"][0]))
    for i, f in enumerate(keep):
        f["id"] = f"t{i}"
        f["cx"] = round((f["bbox"][0] + f["bbox"][2]) / 2, 1)
        f["cy"] = round((f["bbox"][1] + f["bbox"][3]) / 2, 1)
    return keep


def cabin_number(text: str, deck: int) -> str | None:
    """'10123' -> '10123', 'W10097' -> '10097', '1014808' (number + icons) -> '10148'."""
    for g in re.findall(r"\d+", text):
        m = re.match(rf"{deck}\d{{3}}", g)
        if m:
            return m.group(0)
    return None


def region_at(lab: np.ndarray, bbox) -> int:
    """Most common region id under a text box (text pixels themselves are walls)."""
    x0, y0, x1, y1 = (int(round(v)) for v in bbox)
    sub = lab[max(0, y0 - 1) : y1 + 2, max(0, x0 - 1) : x1 + 2]
    ids = sub[sub > 0]
    if ids.size == 0:
        return 0
    vals, cnt = np.unique(ids, return_counts=True)
    return int(vals[np.argmax(cnt)])


def setup(n: int, force: bool = False) -> None:
    d = deck_dir(n)
    if (d / "regions.json").exists() and not force:
        print(f"deck {n}: cache ok")
        return
    rgb = load_rgb(n)
    lines = line_mask(rgb)
    hull, hull_poly, lab, regions = hull_and_regions(lines)
    labels = run_ocr(rgb)
    by_rid = {r["rid"]: r for r in regions}
    cabins = {}
    for t in labels:
        num = cabin_number(t["text"], n)
        t["cabin"] = num
        rid = region_at(lab, t["bbox"])
        t["rid"] = rid
        if num and num not in cabins:
            r = by_rid.get(rid)
            from_region = bool(r and r["area"] < 6000)
            if from_region:
                x, y, bw, bh = r["bbox"]  # cabins are drawn as clean rectangles
                poly = [[x - 1, y - 1], [x + bw, y - 1], [x + bw, y + bh], [x - 1, y + bh]]
            else:  # not inside a closed cell: use the text box
                x0, y0, x1, y1 = t["bbox"]
                poly = [[x0 - 2, y0 - 2], [x1 + 2, y0 - 2], [x1 + 2, y1 + 2], [x0 - 2, y1 + 2]]
            cabins[num] = {"num": num, "cx": t["cx"], "cy": t["cy"], "rid": rid if from_region else 0, "poly": poly}
    Image.fromarray(lines * 255).save(d / "lines.png")
    Image.fromarray(hull * 255).save(d / "hull.png")
    np.savez_compressed(d / "regions.npz", lab=lab)
    h, w = lines.shape
    (d / "regions.json").write_text(json.dumps({"w": w, "h": h, "hull": hull_poly, "regions": regions}))
    (d / "labels.json").write_text(json.dumps(labels, ensure_ascii=False, indent=0))
    (d / "cabins.json").write_text(json.dumps(sorted(cabins.values(), key=lambda c: c["num"]), indent=0))
    print(f"deck {n}: {len(regions)} regions, {len(labels)} labels, {len(cabins)} cabins")


@lru_cache(maxsize=None)
def ref(n: int) -> dict:
    """Everything the scorer/renderer needs about deck n (cached on disk)."""
    d = deck_dir(n)
    if not (d / "regions.json").exists():
        raise SystemExit(f"Reference for deck {n} not prepared. Run: ./pl setup {n}")
    meta = json.loads((d / "regions.json").read_text())
    lines = (np.array(Image.open(d / "lines.png")) > 0).astype(np.uint8)
    hull = (np.array(Image.open(d / "hull.png")) > 0).astype(np.uint8)
    lab = np.load(d / "regions.npz")["lab"]
    labels = json.loads((d / "labels.json").read_text())
    cabins = json.loads((d / "cabins.json").read_text())
    return {"w": meta["w"], "h": meta["h"], "hull_poly": meta["hull"], "regions": meta["regions"], "lines": lines, "hull": hull, "lab": lab, "labels": labels, "cabins": cabins}


def venue_labels(n: int) -> list[dict]:
    """OCR labels that should end up as named rooms in the spec."""
    out = []
    for t in ref(n)["labels"]:
        txt = t["text"].strip()
        norm = re.sub(r"[^a-z0-9&' ]+", " ", txt.lower()).strip()
        letters = len(re.sub(r"[^a-zA-Z]", "", txt))
        if t.get("cabin") or t["conf"] < 0.85 or letters < 3:
            continue
        if letters < 5 and not set(norm.split()) & SHORT_OK:
            continue  # short fragments are mostly watermark or stair hatching ('eMa', 'app', 'LTT')
        if norm in STOP or "www" in norm or ".com" in txt.lower() or (len(norm) >= 4 and fuzz.partial_ratio(norm, "cruisemapper") >= 75) \
                or fuzz.partial_ratio(norm, "panoramic lift") >= 85 and len(norm) <= 16:
            continue  # the CruiseMapper watermark
        out.append(t)
    return out
