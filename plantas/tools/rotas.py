"""Dados do GPS do navio (public/plantas/rotas.json), feitos a partir de export/deck-N.json.

Para cada deck: uma grade de células (por onde dá para andar e com que custo), a posição dos três
conjuntos de elevadores e escadas (proa, meio, popa), a distância a pé entre eles, a porta de cada
cabine e a lista de lugares que podem ser origem ou destino. A rota em si é calculada no navegador
(src/gps/lib/rotas.ts).

Salas com portas marcadas ("portas" no spec) têm o contorno fechado como parede, menos nas portas.
Salas sem portas e sem "aberto": paredes finas entre dois espaços públicos viram uma "passagem cara",
que a rota só usa quando não existe outro caminho."""

from __future__ import annotations

import heapq
import json
import re

import numpy as np
from PIL import Image, ImageDraw
from shapely.geometry import Polygon

import ref

EXPORT = ref.ROOT / "export"
WEB = ref.ROOT.parent / "public" / "plantas"
DECKS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19]

CELL = 5  # pixels da planta por célula da grade
# Classes da grade. O custo de andar em cada uma fica em src/gps/lib/rotas.ts (CUSTO).
VAZIO, CORREDOR, SALA, AGUA, PAREDE = 0, 1, 2, 3, 4
BLOQ = 9  # só durante a montagem: cabines e áreas restritas

# Elevadores e escadas: distância da popa, em pixels da planta (as plantas são alinhadas pela popa).
BANCOS = {"proa": 2830, "meio": 1365, "popa": 370}
# Ajustes à mão, onde o conjunto fica em outro ponto da planta ou não existe naquele deck.
# No meio dos decks 9 a 13 o centro da planta é um poço fechado entre os dois saguões dos elevadores:
# o ponto fica no saguão da esquerda.
AJUSTE: dict[int, dict[str, tuple[int, int] | None]] = {
    8: {"proa": (275, 965), "meio": (212, 2262)},  # no 8 o ponto padrão caía no corredor das cabines
    9: {"meio": (200, 2172)},
    10: {"meio": (179, 2182)},
    11: {"meio": (178, 2172)},
    12: {"meio": (178, 2157)},
    13: {"meio": (172, 2142)},
    18: {"proa": None, "meio": (385, 2240)},
    16: {"proa": None},  # na proa do 16 o elevador dá só no Yacht Club
    19: {"proa": None, "meio": (275, 2100), "popa": None},
}

# Destino de um lugar posto à mão (pixels da planta), onde o ponto automático cai mal.
PONTO: dict[tuple[int, str], tuple[int, int]] = {
    (5, "r101"): (168, 2258),  # Infinity Atrium: o contorno engloba os blocos de elevadores; o ponto fica no piso do átrio
}

BLOCO = re.compile(r"^(elevadores|escadas)$", re.I)  # blocos de elevadores e escadas desenhados como caixa (os panorâmicos, não: a caixa vem do rótulo e cobre o corredor)
EXCLUSIVO = re.compile(r"yacht club", re.I)
AGUA_RX = re.compile(r"pool|piscina|whirlpool|hidromassagem|jacuzzi", re.I)
# Nomes genéricos demais para aparecer na lista de destinos.
GENERICO = re.compile(r"^(deck de sol|deck aberto|sun deck|hidromassagem|whirlpool bath|sliding roof)$", re.I)
NOMES = {"Toaletes": "Banheiros"}


def _classe(r: dict) -> int:
    nome = r.get("name", "")
    if r["cat"] in ("restrito", "cabines") or EXCLUSIVO.search(nome):
        return BLOQ
    if r["cat"] == "circulacao":
        return CORREDOR
    if r["cat"] == "piscina":
        return AGUA if AGUA_RX.search(nome) else CORREDOR  # deck aberto: anda-se livremente
    if r["cat"] == "loja" and "galleria" in nome.lower():
        return CORREDOR  # a Galleria é a avenida do navio
    return SALA


def _poly(p) -> Polygon:
    try:
        g = Polygon(p)
        return g if g.is_valid else g.buffer(0)
    except Exception:
        return Polygon()


def _viz(a: np.ndarray) -> np.ndarray:
    """Dilatação 3×3 de uma máscara booleana."""
    o = a.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx or dy:
                s = np.zeros_like(a)
                h, w = a.shape
                s[max(0, dy) : h + min(0, dy), max(0, dx) : w + min(0, dx)] = a[max(0, -dy) : h + min(0, -dy), max(0, -dx) : w + min(0, -dx)]
                o |= s
    return o


def grade(d: dict) -> np.ndarray:
    """Pinta o deck (salas maiores primeiro, cabines por cima) e reduz para a grade de células."""
    W, H = d["w"], d["h"]
    im = Image.new("L", (W, H), VAZIO)
    dr = ImageDraw.Draw(im)
    for r in sorted(d["rooms"], key=lambda r: -_poly(r["poly"]).area):
        dr.polygon([tuple(p) for p in r["poly"]], fill=_classe(r))
    for c in d["cabins"]:
        dr.polygon([tuple(p) for p in c["poly"]], fill=BLOQ)
    px = np.asarray(im)
    cols, rows = -(-W // CELL), -(-H // CELL)
    pad = np.full((rows * CELL, cols * CELL), VAZIO, np.uint8)
    pad[:H, :W] = px
    blocos = pad.reshape(rows, CELL, cols, CELL).transpose(0, 2, 1, 3).reshape(rows, cols, CELL * CELL)
    conta = {k: (blocos == k).sum(-1) for k in (CORREDOR, SALA, AGUA, BLOQ)}
    anda = conta[CORREDOR] + conta[SALA] + conta[AGUA]
    g = np.zeros((rows, cols), np.uint8)
    ok = (anda >= 0.5 * CELL * CELL) & (conta[BLOQ] < 0.4 * CELL * CELL)
    melhor = np.argmax(np.stack([conta[CORREDOR], conta[SALA], conta[AGUA]]), 0)
    g[ok] = np.array([CORREDOR, SALA, AGUA], np.uint8)[melhor[ok]]
    # Paredes finas (sem porta na planta) entre dois espaços por onde se anda: fechamento morfológico.
    livre = g > 0
    fechado = ~_viz(~_viz(livre))
    bloq = conta[BLOQ] >= 0.4 * CELL * CELL
    g[fechado & ~livre & ~bloq] = PAREDE
    return g


def portas(g: np.ndarray, d: dict) -> np.ndarray:
    """Fecha o contorno das salas que têm portas marcadas e abre só as portas."""
    import spec

    W, H = d["w"], d["h"]
    rows, cols = g.shape
    g = g.copy()
    abrir = []
    for r in d["rooms"]:
        segs = spec.door_segments(r)
        if not segs or r.get("aberto"):
            continue
        im = Image.new("L", (cols * CELL, rows * CELL), 0)
        ImageDraw.Draw(im).polygon([tuple(p) for p in r["poly"]], fill=1)
        dentro = np.asarray(im).reshape(rows, CELL, cols, CELL).sum((1, 3)) >= 0.5 * CELL * CELL
        borda = dentro & _viz(~dentro)  # o anel de células por dentro do contorno
        perto = _viz(dentro) & ~dentro  # e o anel por fora
        parede = borda | (perto & (g == PAREDE))
        livre_antes = g.copy()
        g[parede & (g > 0)] = VAZIO
        for seg in segs:
            im = Image.new("L", (cols * CELL, rows * CELL), 0)
            ImageDraw.Draw(im).line([tuple(p) for p in seg.coords], fill=1, width=CELL + 2)
            m = _viz(np.asarray(im).reshape(rows, CELL, cols, CELL).any((1, 3)))
            abrir.append((m & (borda | perto), livre_antes))
    for m, antes in abrir:  # portas por último: uma parede vizinha não fecha a porta de outra sala
        g[m & (antes > 0)] = np.where(antes[m & (antes > 0)] == PAREDE, SALA, antes[m & (antes > 0)])
    return g


def _bancos(n: int, g: np.ndarray, W: int, H: int) -> dict[str, tuple[int, int]]:
    """Célula de cada conjunto de elevadores e escadas do deck."""
    folga = _folga(g)
    out: dict[str, tuple[int, int]] = {}
    for nome, popa in BANCOS.items():
        aj = AJUSTE.get(n, {})
        if nome in aj and aj[nome] is None:
            continue
        x, y = aj.get(nome) or (W / 2, H - popa)
        c = _perto(g, folga, x, y, 4 if aj.get(nome) else 16)
        if c:
            out[nome] = c
    return out


def _alcance(livre: np.ndarray, ancoras: list[list[tuple[int, int]]]) -> np.ndarray:
    """Para cada elevador (uma lista de células âncora), as células livres ligadas a ele pelos lados,
    como a rota anda. Uma camada por elevador: separar dois elevadores também conta como perda."""
    import cv2

    _, lab = cv2.connectedComponents(livre.astype(np.uint8), connectivity=4)
    out = np.zeros((len(ancoras), *livre.shape), bool)
    for i, anc in enumerate(ancoras):
        ids = {int(lab[y, x]) for x, y in anc if livre[y, x]} - {0}
        out[i] = np.isin(lab, list(ids))
    return out


def estruturas(g: np.ndarray, d: dict, n: int, bancos: dict[str, tuple[int, int]]) -> np.ndarray:
    """Fecha os blocos de escada, poços de elevador e áreas de serviço desenhados dentro dos corredores.

    Eles são salas de circulação como o corredor em volta, e a rota passava por cima das linhas
    desenhadas. O contorno de cada uma vira parede onde a planta real também tem linha, mas só se
    isso não isolar nada fora dela: a sala de circulação que é corredor ou saguão de verdade (com
    passagem que a planta real desenha como linha, ou com cabines e salas dentro) continua aberta.
    As portas marcadas nunca fecham."""
    import cv2
    import spec

    rows, cols = g.shape
    W, H = d["w"], d["h"]
    tinta = cv2.dilate(ref.line_mask(ref.load_rgb(n)), np.ones((5, 5), np.uint8)) > 0
    th, tw = tinta.shape
    porta = np.zeros((rows, cols), bool)
    for r in d["rooms"]:
        for seg in spec.door_segments(r):
            im = Image.new("L", (cols * CELL, rows * CELL), 0)
            ImageDraw.Draw(im).line([tuple(p) for p in seg.coords], fill=1, width=CELL + 2)
            porta |= _viz(np.asarray(im).reshape(rows, CELL, cols, CELL).any((1, 3)))
    # O que não pode ficar dentro de uma estrutura fechada: cabines e salas com nome.
    dentro_de = [_poly(c["poly"]).representative_point() for c in d["cabins"]]
    dentro_de += [_poly(r["poly"]).representative_point() for r in d["rooms"] if r["cat"] not in ("circulacao", "restrito") and r.get("name") and not _poly(r["poly"]).is_empty]

    ancoras = [[(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if 0 <= x + dx < cols and 0 <= y + dy < rows] for x, y in bancos.values()]
    livre = g > 0
    alc = alc0 = _alcance(livre, ancoras)
    salas = [r for r in d["rooms"] if r["cat"] == "circulacao" and len(r["poly"]) >= 3]
    for r in sorted(salas, key=lambda r: _poly(r["poly"]).area):
        poly = _poly(r["poly"])
        if poly.is_empty or any(poly.contains(p) for p in dentro_de):
            continue
        im = Image.new("L", (cols * CELL, rows * CELL), 0)
        ImageDraw.Draw(im).line([tuple(p) for p in r["poly"]] + [tuple(r["poly"][0])], fill=1, width=1)
        linha = np.asarray(im).astype(bool)
        if not BLOCO.search(r.get("name", "")):  # um bloco com nome é desenhado como caixa: o contorno todo vale
            linha[:th, :tw] &= tinta
        linha[th:, :] = False
        linha[:, tw:] = False
        parede = (linha.reshape(rows, CELL, cols, CELL).sum((1, 3)) >= 2) & ~porta & livre
        if not parede.any():
            continue
        im = Image.new("L", (cols * CELL, rows * CELL), 0)
        ImageDraw.Draw(im).polygon([tuple(p) for p in r["poly"]], fill=1)
        interior = _viz(np.asarray(im).reshape(rows, CELL, cols, CELL).any((1, 3)))
        novo = _alcance(livre & ~parede, ancoras)
        if ((alc & ~novo).any(0) & ~interior).sum() > 2:
            continue  # isolaria um corredor ou uma sala: não é uma estrutura fechada
        livre &= ~parede
        alc = novo
    g = g.copy()
    g[~livre | (alc0 & ~alc).any(0)] = VAZIO  # o miolo das estruturas fechadas sai junto
    return g


def _folga(g: np.ndarray, lim: int = 6) -> np.ndarray:
    """Distância (em células, até `lim`) de cada célula livre até a parede mais próxima."""
    livre = (g > 0) & (g != PAREDE)
    f = np.zeros(g.shape, np.int16)
    m = livre.copy()
    for _ in range(lim):
        m = ~_viz(~m)
        f += m
    return f


def dijkstra(g: np.ndarray, custo: np.ndarray, origem: tuple[int, int]) -> np.ndarray:
    rows, cols = g.shape
    dist = np.full(g.shape, np.inf)
    cx, cy = origem
    dist[cy, cx] = 0
    fila = [(0.0, cx, cy)]
    while fila:
        dd, x, y = heapq.heappop(fila)
        if dd > dist[y, x]:
            continue
        for dx, dy, k in ((1, 0, 1), (-1, 0, 1), (0, 1, 1), (0, -1, 1), (1, 1, 1.414), (1, -1, 1.414), (-1, 1, 1.414), (-1, -1, 1.414)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < cols and 0 <= ny < rows and g[ny, nx]:
                nd = dd + k * custo[ny, nx]
                if nd < dist[ny, nx]:
                    dist[ny, nx] = nd
                    heapq.heappush(fila, (nd, nx, ny))
    return dist


# Os mesmos custos de src/gps/lib/rotas.ts.
CUSTO = np.array([0, 1, 1.6, 6, 14])
MARGEM = np.array([2.2, 1.0, 0.45, 0.15, 0, 0, 0])  # custo extra por andar colado à parede


def custos(g: np.ndarray) -> np.ndarray:
    return CUSTO[g] + MARGEM[_folga(g)] * (g > 0)


def _perto(g: np.ndarray, folga: np.ndarray, x: float, y: float, raio: int, livre=(CORREDOR, SALA)) -> tuple[int, int] | None:
    """Célula livre mais próxima do ponto (em pixels), preferindo as que têm folga das paredes."""
    rows, cols = g.shape
    cx, cy = int(x // CELL), int(y // CELL)
    melhor, nota = None, 1e9
    for j in range(max(0, cy - raio), min(rows, cy + raio + 1)):
        for i in range(max(0, cx - raio), min(cols, cx + raio + 1)):
            if g[j, i] in livre:
                n = ((i - cx) ** 2 + (j - cy) ** 2) ** 0.5 - 1.5 * min(int(folga[j, i]), 4)
                if n < nota:
                    melhor, nota = (i, j), n
    return melhor


def _acesso(g: np.ndarray, poly: Polygon, alcance: int = 9) -> tuple[int, int] | None:
    """Por onde se chega a um lugar: uma célula livre dentro dele ou, se não houver, a mais próxima por fora."""
    if poly.is_empty:
        return None
    rows, cols = g.shape
    x0, y0, x1, y1 = poly.bounds
    alvo = poly.representative_point()
    dentro, fora = (None, 1e9), (None, 1e9)
    for j in range(max(0, int(y0 // CELL) - alcance), min(rows, int(y1 // CELL) + alcance + 1)):
        for i in range(max(0, int(x0 // CELL) - alcance), min(cols, int(x1 // CELL) + alcance + 1)):
            if g[j, i] not in (CORREDOR, SALA):
                continue
            px, py = (i + 0.5) * CELL, (j + 0.5) * CELL
            from shapely.geometry import Point

            pt = Point(px, py)
            dd = poly.distance(pt)
            if dd == 0:
                k = pt.distance(alvo)
                if k < dentro[1]:
                    dentro = ((i, j), k)
            elif dd <= alcance * CELL:
                k = dd + 0.05 * pt.distance(alvo)
                if k < fora[1]:
                    fora = ((i, j), k)
    return dentro[0] or fora[0]


def _rle(g: np.ndarray) -> list[int]:
    v = g.ravel()
    cortes = np.flatnonzero(np.diff(v)) + 1
    ini = np.concatenate(([0], cortes))
    fim = np.concatenate((cortes, [v.size]))
    return [int((f - i) * 5 + v[i]) for i, f in zip(ini, fim)]


def deck(n: int, d: dict | None = None) -> tuple[dict, list[dict], np.ndarray]:
    d = d or json.loads((EXPORT / f"deck-{n}.json").read_text())
    W, H = d["w"], d["h"]
    g = portas(grade(d), d)
    bancos = _bancos(n, g, W, H)
    g = estruturas(g, d, n, bancos)
    folga = _folga(g)
    for nome, (x, y) in list(bancos.items()):  # uma parede nova caiu em cima do ponto: o mais perto
        if not g[y, x]:
            c = _perto(g, folga, (x + 0.5) * CELL, (y + 0.5) * CELL, 4)
            if c:
                bancos[nome] = c
            else:
                del bancos[nome]

    # Só fica o que se alcança a pé a partir de algum elevador.
    c = custos(g)
    dist = {b: dijkstra(g, c, p) for b, p in bancos.items()}
    alcanca = np.zeros(g.shape, bool)
    for dd in dist.values():
        alcanca |= np.isfinite(dd)
    g = np.where(alcanca, g, VAZIO).astype(np.uint8)

    entre = {}
    nomes = list(bancos)
    for i, a in enumerate(nomes):
        for b in nomes[i + 1 :]:
            x, y = bancos[b]
            if np.isfinite(dist[a][y, x]):
                entre[f"{a}-{b}"] = round(float(dist[a][y, x]) * CELL)

    cab: list[int] = []
    sem = 0
    for k in d["cabins"]:
        p = _acesso(g, _poly(k["poly"]), 6)
        if not p or not str(k["num"]).isdigit():
            sem += 1
            continue
        cab += [int(k["num"]), p[0], p[1]]

    grupos: dict[str, dict] = {}
    for r in d["rooms"]:
        nome = NOMES.get(r.get("name", "").strip(), r.get("name", "").strip())
        if not nome or r["cat"] in ("circulacao", "restrito") or EXCLUSIVO.search(nome) or GENERICO.match(nome):
            continue
        p = _acesso(g, _poly(r["poly"]), 0 if r.get("portas") and not r.get("aberto") else 9)
        if (n, r["id"]) in PONTO:
            p = _perto(g, folga, *PONTO[n, r["id"]], 0) or p
        if not p and r.get("portas"):
            print(f"  deck {n}: {nome} ({r['id']}): por dentro não se chega pelas portas; usando o ponto em frente à porta")
            x, y = r["portas"][0][:2]
            p = _perto(g, folga, x, y, 4)
        if not p:
            if r.get("portas"):
                print(f"  deck {n}: {nome} ({r['id']}) ficou sem acesso: confira as portas")
            continue
        lug = grupos.setdefault(nome, {"id": f"p{n}-{r['id']}", "n": nome, "c": r["cat"], "d": n, "t": r.get("texto", ""), "ids": [], "p": []})
        lug["ids"].append(f"p{n}-{r['id']}")
        lug["p"] += [p[0], p[1]]

    info = {"w": W, "h": H, "cols": g.shape[1], "rows": g.shape[0], "g": _rle(g), "b": {k: list(v) for k, v in bancos.items()}, "m": entre, "cab": cab}
    print(f"deck {n}: {int((g > 0).sum())} células, elevadores {', '.join(bancos) or 'nenhum'}, {len(cab) // 3} cabines ({sem} sem acesso), {len(grupos)} lugares")
    return info, list(grupos.values()), g


def gerar() -> None:
    decks, lugares = {}, []
    for n in DECKS:
        info, lug, _ = deck(n)
        decks[str(n)] = info
        lugares += lug
    out = {"cell": CELL, "decks": decks, "lugares": lugares}
    WEB.mkdir(parents=True, exist_ok=True)
    (WEB / "rotas.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print(f"public/plantas/rotas.json: {(WEB / 'rotas.json').stat().st_size // 1024} KB")


def ver(n: int, y0: int = 0, y1: int | None = None, scale: int = 2, best: bool = False) -> None:
    """PNG for checking corridors and doors: the GPS walking grid painted over the real plan.
    Blue = corridor, green = inside a venue, cyan = water, ORANGE = 'costly passage' through a thin wall
    (a wall the route may cross because no door was marked), RED = walkable space the lifts cannot reach
    (a corridor cut off by a wrong room / missing door), black dots = lifts, magenta = destination points."""
    import spec

    s = spec.load(n, spec.BEST / f"deck-{n}.json" if best else None)
    d = {"w": s["image"]["w"], "h": s["image"]["h"], "rooms": s["rooms"], "cabins": s.get("cabins", [])}
    g0 = portas(grade(d), d)
    g0 = estruturas(g0, d, n, _bancos(n, g0, d["w"], d["h"]))
    info, lug, g = deck(n, d)
    W, H = d["w"], d["h"]
    y1 = min(H, y1 or y0 + 900)
    base = Image.open(ref.IMG_DIR / f"deck-{n}.webp").convert("RGBA").resize((W * scale, H * scale))
    over = Image.new("RGBA", base.size, (0, 0, 0, 0))
    dr = ImageDraw.Draw(over)
    cor = {CORREDOR: (40, 110, 255, 90), SALA: (40, 170, 70, 80), AGUA: (0, 200, 220, 90), PAREDE: (255, 120, 0, 200)}
    rows, cols = g.shape
    for j in range(rows):
        for i in range(cols):
            v = int(g[j, i])
            c = cor.get(v)
            if not v and g0[j, i]:
                c = (230, 0, 0, 150)  # walkable but unreachable
            if c:
                dr.rectangle([i * CELL * scale, j * CELL * scale, (i + 1) * CELL * scale - 1, (j + 1) * CELL * scale - 1], fill=c)
    for r in s["rooms"]:
        for seg in spec.door_segments(r):
            dr.line([(x * scale, y * scale) for x, y in seg.coords], fill=(255, 0, 160, 255), width=3 * scale)
    for b, (i, j) in info["b"].items():
        cx, cy = (i + 0.5) * CELL * scale, (j + 0.5) * CELL * scale
        dr.ellipse([cx - 6 * scale, cy - 6 * scale, cx + 6 * scale, cy + 6 * scale], fill=(0, 0, 0, 255))
    for L in lug:
        for k in range(0, len(L["p"]), 2):
            cx, cy = (L["p"][k] + 0.5) * CELL * scale, (L["p"][k + 1] + 0.5) * CELL * scale
            dr.ellipse([cx - 3 * scale, cy - 3 * scale, cx + 3 * scale, cy + 3 * scale], fill=(200, 0, 200, 255))
    base.alpha_composite(over)
    import render

    img = render.grid(base.crop((0, y0 * scale, W * scale, y1 * scale)), scale, y0)
    out = ref.ROOT / "out" / f"deck-{n}_gps_{y0}-{y1}.png"
    out.parent.mkdir(exist_ok=True)
    img.convert("RGB").save(out)
    print(out)
