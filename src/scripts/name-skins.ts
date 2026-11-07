// The hero name changes material every few seconds: original, pixel art, plasticine, wireframe, glitch.
// Most skins are CSS (see Hero.astro). Pixel art is drawn on a small canvas from the real text, so it
// keeps the same font, size and place, just in chunky pixels.

const SKINS = ['base', 'pixel', 'clay', 'wire', 'glitch'] as const;
type Skin = (typeof SKINS)[number];
const HOLD: Record<Skin, number> = { base: 3200, pixel: 2400, clay: 2400, wire: 2200, glitch: 1800 };

// Pixel colours per line: fill, then the hard 8-bit shadow.
const PIXEL = [
  { fill: '#ffffff', shadow: '#b02e2e', deep: '#2a2a2e' },
  { fill: '#f2c14e', shadow: '#2a2a2e', deep: '#2a2a2e' },
];

function drawPixel(line: HTMLElement, i: number) {
  const inner = line.querySelector<HTMLElement>('.line-in');
  if (!inner) return;
  let canvas = line.querySelector<HTMLCanvasElement>('canvas.name-px');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'name-px';
    canvas.setAttribute('aria-hidden', 'true');
    line.appendChild(canvas);
  }
  const lb = line.getBoundingClientRect();
  const ib = inner.getBoundingClientRect();
  const cs = getComputedStyle(inner);
  const size = parseFloat(cs.fontSize);
  const px = Math.max(3, Math.round(size / 17)); // one art pixel, in screen pixels
  const w = Math.ceil(lb.width / px) + 2;
  const h = Math.ceil(lb.height / px) + 2;

  // Where the text's baseline sits inside the line box.
  const probe = document.createElement('span');
  probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
  inner.appendChild(probe);
  const baseY = probe.getBoundingClientRect().top - lb.top;
  probe.remove();

  // 1. The text at low resolution (font as close as canvas allows, then stretched to the real width).
  const mask = document.createElement('canvas');
  mask.width = w;
  mask.height = h;
  const m = mask.getContext('2d')!;
  m.font = `${cs.fontWeight} ${size / px}px ${cs.fontFamily}`;
  if ('fontStretch' in m) (m as CanvasRenderingContext2D & { fontStretch: string }).fontStretch = 'extra-expanded';
  const raw = inner.textContent || '';
  const text = cs.textTransform === 'uppercase' ? raw.toUpperCase() : raw;
  const measured = m.measureText(text).width || 1;
  const target = ib.width / px;
  m.setTransform(target / measured, 0, 0, 1, (ib.left - lb.left) / px, 0);
  m.fillText(text, 0, baseY / px);
  const src = m.getImageData(0, 0, w, h).data;

  // 2. Hard pixels: every art pixel is either on or off, then painted with a stepped shadow.
  const out = canvas.getContext('2d')!;
  canvas.width = w;
  canvas.height = h;
  const img = out.createImageData(w, h);
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 110;
  const put = (x: number, y: number, hex: string) => {
    const k = (y * w + x) * 4;
    img.data[k] = parseInt(hex.slice(1, 3), 16);
    img.data[k + 1] = parseInt(hex.slice(3, 5), 16);
    img.data[k + 2] = parseInt(hex.slice(5, 7), 16);
    img.data[k + 3] = 255;
  };
  const c = PIXEL[i % PIXEL.length];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (on(x, y)) put(x, y, c.fill);
      else if (on(x - 1, y - 1)) put(x, y, c.shadow);
      else if (on(x - 2, y - 2)) put(x, y, c.deep);
    }
  }
  out.putImageData(img, 0, 0);
  canvas.style.width = `${w * px}px`;
  canvas.style.height = `${h * px}px`;
}

export function initNameSkins() {
  const name = document.querySelector<HTMLElement>('.hero-name');
  if (!name) return;
  const lines = [...name.querySelectorAll<HTMLElement>('.line')];
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let k = 0;
  let timer = 0;
  let visible = true;

  const set = (skin: Skin) => {
    if (skin === 'pixel') lines.forEach(drawPixel);
    name.dataset.skin = skin;
    name.classList.remove('swap');
    void name.offsetWidth;
    name.classList.add('swap');
  };

  const next = () => {
    k = (k + 1) % SKINS.length;
    set(SKINS[k]);
    schedule();
  };

  const schedule = () => {
    clearTimeout(timer);
    if (visible && !document.hidden) timer = window.setTimeout(next, HOLD[SKINS[k]]);
  };

  // Start once the name has risen in, so the intro stays clean.
  setTimeout(() => {
    name.classList.add('is-ready');
    schedule();
  }, 1500);

  name.addEventListener('pointerenter', next);
  new IntersectionObserver((e) => {
    visible = e[0].isIntersecting;
    schedule();
  }).observe(name);
  document.addEventListener('visibilitychange', schedule);
  window.addEventListener('resize', () => {
    if (name.dataset.skin === 'pixel') lines.forEach(drawPixel);
  });
}
