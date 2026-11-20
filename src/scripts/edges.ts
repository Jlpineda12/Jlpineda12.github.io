// Draws the seams between chapters (Edge.astro). Each one is a shape in a 1440×200 box, rebuilt
// every frame from how far its chapter has come into view (p: 0 → 1) and from time (so liquid
// shapes keep moving a little), and only while it is on screen. With reduced motion every seam
// is drawn once, fully in.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const W = 1440, H = 200;

type Draw = (p: number, t: number, v: number) => string;

const f = (n: number) => n.toFixed(1);
const ease = (x: number) => 1 - Math.pow(1 - x, 3);

// Drips hanging from the top, getting longer as you scroll.
const DRIPS = [70, 190, 300, 420, 560, 690, 800, 930, 1060, 1190, 1310, 1400].map((c, i) => ({
  c, w: 26 + ((i * 37) % 30), l: 70 + ((i * 53) % 110), s: (i * 1.7) % 6.28,
}));
const melt: Draw = (p, t) => {
  const base = 6;
  let d = `M0 0 H${W} V${base}`;
  for (let i = DRIPS.length - 1; i >= 0; i--) {
    const { c, w, l, s } = DRIPS[i];
    const len = base + l * ease(p) * (0.85 + 0.15 * Math.sin(t * 1.6 + s));
    const hw = w / 2;
    d += ` L${f(c + hw)} ${base} C${f(c + hw)} ${f(base + (len - base) * 0.55)} ${f(c + hw * 0.65)} ${f(len)} ${f(c)} ${f(len)}`;
    d += ` C${f(c - hw * 0.65)} ${f(len)} ${f(c - hw)} ${f(base + (len - base) * 0.55)} ${f(c - hw)} ${base}`;
  }
  return d + ` L0 ${base} Z`;
};

// A wave that rises and sways; it swells when you scroll fast.
const wave: Draw = (p, t, v) => {
  const base = H - ease(p) * (H - 30);
  const amp = 14 + Math.min(40, Math.abs(v) * 0.6);
  let d = `M0 ${H}`;
  for (let x = 0; x <= W; x += 40) {
    const y = base + Math.sin(x * 0.006 + t * 1.4) * amp + Math.sin(x * 0.013 - t * 0.9) * amp * 0.4;
    d += ` L${x} ${f(y)}`;
  }
  return d + ` L${W} ${H} Z`;
};

// A dome: low and round at first, it widens and flattens into the chapter.
const dome: Draw = (p) => {
  const s = H - ease(p) * (H - 24);
  const peak = 24 + (1 - ease(p)) * 60;
  return `M0 ${H} L0 ${f(s)} Q${W / 2} ${f(2 * peak - s)} ${W} ${f(s)} L${W} ${H} Z`;
};

// A zip: wide teeth that close as it comes in.
const zipper: Draw = (p, t) => {
  const base = H - ease(p) * (H - 40);
  const amp = 34 * (1 - ease(p)) + 6 + Math.sin(t * 3) * 2;
  let d = `M0 ${H} L0 ${f(base)}`;
  for (let x = 0, k = 0; x <= W; x += 48, k++) d += ` L${x} ${f(base + (k % 2 ? -amp : amp))}`;
  return d + ` L${W} ${H} Z`;
};

// Blocks: each column steps up on its own beat, in 25px steps, like pixels.
const COLS = Array.from({ length: 36 }, (_, i) => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1);
const pixels: Draw = (p) => {
  const cw = W / COLS.length;
  let d = '';
  COLS.forEach((r, i) => {
    const k = Math.max(0, Math.min(1, p * 1.5 - r * 0.5));
    const h = Math.round((k * (H - 10)) / 25) * 25;
    if (h <= 0) return;
    d += `M${f(i * cw)} ${H} V${H - h} H${f((i + 1) * cw + 0.5)} V${H} Z `;
  });
  return d || `M0 ${H} Z`;
};

const DRAW: Record<string, Draw> = { melt, wave, dome, zipper, pixels };

// Bubbles: they rise from the floor, wobble and melt into each other (goo filter in the SVG).
const BUBS = Array.from({ length: 14 }, (_, i) => ({
  x: 60 + i * 100 + ((i * 37) % 40), r: 34 + ((i * 29) % 30), up: 60 + ((i * 47) % 110), s: i * 0.9,
}));

export function initEdges() {
  const edges = [...document.querySelectorAll<HTMLElement>('[data-edge]')];
  if (!edges.length) return;
  const NS = 'http://www.w3.org/2000/svg';

  const items = edges.map((el) => {
    const kind = el.dataset.edge!;
    const path = el.querySelector('path');
    let circles: SVGCircleElement[] = [];
    if (kind === 'blobs') {
      const g = el.querySelector('g')!;
      circles = BUBS.map(() => {
        const c = document.createElementNS(NS, 'circle');
        g.appendChild(c);
        return c;
      });
    }
    return { el, kind, path, circles, on: false };
  });

  const draw = (it: (typeof items)[number], p: number, t: number, v: number) => {
    if (it.kind === 'blobs') {
      const floor = H - ease(p) * 60;
      it.circles.forEach((c, i) => {
        const b = BUBS[i];
        const y = floor - b.up * ease(p) + Math.sin(t * 1.3 + b.s) * 10;
        c.setAttribute('cx', f(b.x + Math.sin(t * 0.7 + b.s) * 8));
        c.setAttribute('cy', f(y));
        c.setAttribute('r', f(b.r * (0.4 + 0.6 * ease(p))));
      });
      it.el.querySelector('rect')?.setAttribute('y', f(floor));
      return;
    }
    it.path?.setAttribute('d', DRAW[it.kind](p, t, v));
  };

  // How far the seam's chapter has come in: 0 as its top reaches the bottom of the screen,
  // 1 once it has climbed most of the way up.
  const progress = (el: HTMLElement) => {
    const top = (el.parentElement ?? el).getBoundingClientRect().top;
    return Math.max(0, Math.min(1, (innerHeight - top) / (innerHeight * 0.75)));
  };

  if (reduced) {
    items.forEach((it) => draw(it, 1, 0, 0));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const it = items.find((x) => x.el === e.target);
      if (it) it.on = e.isIntersecting;
    });
    kick();
  }, { rootMargin: '20% 0px' });
  items.forEach((it) => io.observe(it.el));

  let raf = 0, lastY = scrollY, v = 0;
  const t0 = performance.now();
  const frame = (now: number) => {
    raf = 0;
    const t = (now - t0) / 1000;
    v = v * 0.9 + (scrollY - lastY) * 0.1;
    lastY = scrollY;
    let any = false;
    for (const it of items) {
      if (!it.on) continue;
      any = true;
      draw(it, progress(it.el), t, v);
    }
    if (any) raf = requestAnimationFrame(frame);
  };
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };
  items.forEach((it) => draw(it, progress(it.el), 0, 0));
  addEventListener('scroll', kick, { passive: true });
}
