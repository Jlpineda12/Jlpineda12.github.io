// The site's liquid touch. With a mouse, a lens of glass trails the pointer on a spring: it bends
// what is under it (with rainbow rims where the browser can refract the backdrop), stretches along
// its speed, melts onto buttons and links, and over pictures and cards marked [data-lens] it swells
// and reads out their name. A click squashes it and leaves a ripple. On touch screens, every tap
// leaves a glass drop that swells and wobbles away. Nothing of this with reduced motion.
import { liquid } from './liquid';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

// What the droplet melts onto: things you can press, but not big areas (cards, the console).
const TARGET = 'a, button, [role="button"], label, summary, .chip, .lang-switch';
const MAX_W = 360;
const MAX_H = 90;

function ripple(x: number, y: number, big = false) {
  const r = document.createElement('span');
  r.className = `drop-ripple${big ? ' is-big' : ''}`;
  r.style.left = `${x}px`;
  r.style.top = `${y}px`;
  document.body.appendChild(r);
  r.addEventListener('animationend', () => r.remove());
}

export function initDroplet() {
  if (reduced) return;

  if (!fine) {
    // Touch: a drop where the finger lands.
    window.addEventListener(
      'pointerdown',
      (e) => {
        if (e.pointerType === 'mouse') return;
        ripple(e.clientX, e.clientY, true);
      },
      { passive: true },
    );
    return;
  }

  const d = document.createElement('div');
  d.className = 'droplet';
  d.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.className = 'droplet-label';
  d.appendChild(label);
  document.body.appendChild(d);
  document.documentElement.classList.add('has-droplet');
  liquid(d, { bezel: 22, scale: 34, blur: 0.4, chroma: true });

  const SIZE = 54;
  const BIG = 118;
  let lensOn: HTMLElement | null = null;
  // Where it is, how fast it goes, and its shape (w, h, radius) easing towards the target shape.
  let x = -100, y = -100, vx = 0, vy = 0;
  let w = SIZE, h = SIZE, rad = SIZE / 2;
  let px = -100, py = -100;
  let target: HTMLElement | null = null;
  let press = 0;
  let shown = false;
  let raf = 0;

  // Over a picture or card with a name, the lens swells and reads it out.
  const lensOf = (el: Element | null) => el?.closest<HTMLElement>('[data-lens]') ?? null;
  const pick = (el: Element | null) => {
    if (lensOf(el)) return null;
    const t = el?.closest<HTMLElement>(TARGET) ?? null;
    if (!t) return null;
    const r = t.getBoundingClientRect();
    if (r.width > MAX_W || r.height > MAX_H || t.closest('[data-no-droplet]')) return null;
    return t;
  };

  const tick = () => {
    raf = 0;
    let tx = px, ty = py, tw = SIZE, th = SIZE, tr = SIZE / 2;
    if (lensOn) {
      tw = th = BIG;
      tr = BIG / 2;
    } else if (target && target.isConnected) {
      const r = target.getBoundingClientRect();
      const cs = getComputedStyle(target);
      // Melted onto the button, but still leaning towards the pointer like a drop of water.
      tx = r.left + r.width / 2 + (px - (r.left + r.width / 2)) * 0.12;
      ty = r.top + r.height / 2 + (py - (r.top + r.height / 2)) * 0.12;
      tw = r.width + 10;
      th = r.height + 10;
      tr = Math.min(th / 2, (parseFloat(cs.borderTopLeftRadius) || 12) + 5);
    }
    // A soft spring: it overshoots a little and wobbles, like something liquid.
    const k = target ? 0.22 : 0.18;
    const damp = target ? 0.62 : 0.68;
    vx = (vx + (tx - x) * k) * damp;
    vy = (vy + (ty - y) * k) * damp;
    x += vx;
    y += vy;
    w += (tw - w) * 0.24;
    h += (th - h) * 0.24;
    rad += (tr - rad) * 0.24;
    // Stretch along its speed (only while it is a free drop), squash when pressed.
    const speed = Math.hypot(vx, vy);
    const stretch = target ? 0 : Math.min(0.5, speed * (lensOn ? 0.012 : 0.024));
    const angle = Math.atan2(vy, vx);
    press *= 0.82;
    const sx = (1 + stretch) * (1 - press * 0.25);
    const sy = (1 - stretch * 0.45) * (1 - press * 0.25);
    d.style.width = `${w.toFixed(1)}px`;
    d.style.height = `${h.toFixed(1)}px`;
    d.style.borderRadius = `${rad.toFixed(1)}px`;
    d.style.transform =
      `translate(${(x - w / 2).toFixed(1)}px, ${(y - h / 2).toFixed(1)}px) ` +
      (target ? `scale(${(1 - press * 0.08).toFixed(3)})` : `rotate(${angle}rad) scale(${sx.toFixed(3)}, ${sy.toFixed(3)}) rotate(${-angle}rad)`);
    const settled = speed < 0.05 && Math.abs(tw - w) < 0.3 && Math.abs(th - h) < 0.3 && press < 0.01;
    if (!settled) raf = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (!raf) raf = requestAnimationFrame(tick);
  };

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      px = e.clientX;
      py = e.clientY;
      if (!shown) {
        shown = true;
        x = px;
        y = py;
        d.classList.add('is-on');
      }
      setLens(lensOf(e.target as Element));
      const t = pick(e.target as Element);
      if (t !== target) {
        target = t;
        d.classList.toggle('is-melted', !!t);
      }
      wake();
    },
    { passive: true },
  );
  function setLens(el: HTMLElement | null) {
    if (el === lensOn) return;
    lensOn = el;
    d.classList.toggle('is-lens', !!el);
    if (el) label.textContent = el.dataset.lens || '';
  }
  // Scrolling moves buttons under a still pointer.
  window.addEventListener(
    'scroll',
    () => {
      if (!shown) return;
      const under = document.elementFromPoint(px, py);
      setLens(lensOf(under));
      const t = pick(under);
      if (t !== target) {
        target = t;
        d.classList.toggle('is-melted', !!t);
      }
      wake();
    },
    { passive: true },
  );
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    press = 1;
    ripple(e.clientX, e.clientY);
    wake();
  });
  document.documentElement.addEventListener('mouseleave', () => {
    shown = false;
    d.classList.remove('is-on');
  });
  // Over iframes (the playable demos) the page gets no pointer events: let the drop go.
  window.addEventListener('blur', () => {
    shown = false;
    d.classList.remove('is-on');
  });
}
