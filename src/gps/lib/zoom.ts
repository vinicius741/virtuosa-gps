// Zoom de uma planta dentro de uma área com rolagem: botões, pinça com dois dedos,
// toque duplo e pinça no trackpad (que chega como ctrl + rolagem).

export type Zoom = {
  readonly valor: number;
  /** Muda o zoom mantendo parado o ponto (cx, cy) da área. */
  aplicar: (z: number, cx?: number, cy?: number) => void;
  /** Volta ao zoom 1, no topo. */
  reiniciar: () => void;
};

export function criarZoom(
  area: HTMLElement,
  opts: {
    /** elemento que cresce (a imagem ou o SVG) */
    alvo: () => HTMLElement;
    /** largura do alvo, em pixels, no zoom 1 */
    base: () => number;
    max?: number;
    aoMudar?: (z: number) => void;
  },
): Zoom {
  const max = opts.max ?? 5;
  let zoom = 1;

  const aplicar = (z: number, cx = area.clientWidth / 2, cy = area.clientHeight / 2) => {
    z = Math.min(max, Math.max(1, z));
    const el = opts.alvo();
    const ox = area.scrollLeft + cx - el.offsetLeft;
    const oy = area.scrollTop + cy - el.offsetTop;
    const r = z / zoom;
    zoom = z;
    el.style.width = `${opts.base() * z}px`;
    area.scrollLeft = ox * r + el.offsetLeft - cx;
    area.scrollTop = oy * r + el.offsetTop - cy;
    opts.aoMudar?.(z);
  };

  const reiniciar = () => {
    zoom = 1;
    opts.alvo().style.width = `${opts.base()}px`;
    area.scrollTo(0, 0);
    opts.aoMudar?.(1);
  };

  const centro = (a: Touch, b: Touch) => {
    const r = area.getBoundingClientRect();
    return [(a.clientX + b.clientX) / 2 - r.left, (a.clientY + b.clientY) / 2 - r.top] as const;
  };
  const dist = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  let pinca: { d: number; z: number } | null = null;
  let ultimoToque = 0;
  let moveu = false;

  area.addEventListener('touchstart', (e) => {
    moveu = false;
    if (e.touches.length === 2) pinca = { d: dist(e.touches[0], e.touches[1]), z: zoom };
  }, { passive: true });
  area.addEventListener('touchmove', (e) => {
    moveu = true;
    if (pinca && e.touches.length === 2) {
      e.preventDefault();
      const [cx, cy] = centro(e.touches[0], e.touches[1]);
      aplicar((pinca.z * dist(e.touches[0], e.touches[1])) / pinca.d, cx, cy);
    }
  }, { passive: false });
  area.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) pinca = null;
    if (e.touches.length || e.changedTouches.length !== 1 || moveu) return;
    const agora = Date.now();
    if (agora - ultimoToque < 320) {
      const t = e.changedTouches[0];
      const r = area.getBoundingClientRect();
      aplicar(zoom > 1.2 ? 1 : 2.5, t.clientX - r.left, t.clientY - r.top);
      ultimoToque = 0;
      e.preventDefault();
    } else ultimoToque = agora;
  });
  area.addEventListener('dblclick', (e) => {
    if (Date.now() - ultimoToque < 1000) return;
    const r = area.getBoundingClientRect();
    aplicar(zoom > 1.2 ? 1 : 2.5, e.clientX - r.left, e.clientY - r.top);
  });
  area.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const r = area.getBoundingClientRect();
    aplicar(zoom * Math.exp(-e.deltaY / 200), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // só quando a área está na tela (o diálogo está aberto)
  window.addEventListener('resize', () => area.clientWidth && aplicar(zoom));

  return {
    get valor() {
      return zoom;
    },
    aplicar,
    reiniciar,
  };
}
