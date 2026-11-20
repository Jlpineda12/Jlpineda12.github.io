// The Creative ID as one more sticker on the hero: a glossy card you grab, carry and drop on the
// reader. It follows the pointer with a little lag and tilts into the motion, springs back home
// when let go anywhere else, and docks level over the reader while it is read. It speaks the same
// small interface the old lanyard did, so scanner.ts drives it unchanged.
export type Point = { x: number; y: number };

/** What the scanner needs from the card: where it is, carry it somewhere, and its gestures. */
export type Lanyard = {
  center(): Point;
  dock(target: () => Point): void;
  undock(): void;
  onDrag(cb: (p: Point) => void): void;
  onRelease(cb: (p: Point) => void): void;
  onTap(cb: () => void): void;
};

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initPass(): Lanyard | null {
  const pass = document.querySelector<HTMLElement>('[data-pass]');
  const card = pass?.querySelector<HTMLElement>('.badge-card');
  if (!pass || !card) return null;

  const dragCbs: ((p: Point) => void)[] = [];
  const releaseCbs: ((p: Point) => void)[] = [];
  const tapCbs: (() => void)[] = [];

  // Offset from home (px), tilt (deg), scale; their speeds; and where the springs pull to.
  let x = 0, y = 0, r = 0, s = 1, vx = 0, vy = 0, vr = 0;
  let tx = 0, ty = 0, tr = 0, ts = 1;
  let held = false, moved = 0, px = 0, py = 0, raf = 0;
  let dockAt: (() => Point) | null = null;

  const center = (): Point => {
    const b = card.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  };
  // Home: where the card rests, without its drag offset (offsetLeft/Top ignore transforms; the
  // card is centred on that point by translate: -50% -50%).
  const parent = pass.offsetParent as HTMLElement | null;
  const home = (): Point => {
    const p = parent?.getBoundingClientRect() ?? { left: 0, top: 0 };
    return { x: p.left + pass.offsetLeft, y: p.top + pass.offsetTop };
  };

  const render = () => {
    pass.style.setProperty('--px', `${x.toFixed(1)}px`);
    pass.style.setProperty('--py', `${y.toFixed(1)}px`);
    pass.style.setProperty('--pr', `${r.toFixed(2)}deg`);
    pass.style.setProperty('--ps', s.toFixed(3));
  };

  const step = () => {
    raf = 0;
    if (dockAt && !held) {
      const h = home(), d = dockAt();
      tx = d.x - h.x;
      ty = d.y - h.y;
      tr = 0;
      ts = 0.92;
    } else if (!held) {
      tx = 0;
      ty = 0;
      tr = 0;
      ts = 1;
    }
    if (held) {
      // Following the hand: a quick lag, and a tilt into the motion.
      const dx = tx - x;
      x += dx * 0.45;
      y += (ty - y) * 0.45;
      r += (Math.max(-22, Math.min(22, dx * 0.5)) - r) * 0.25;
      s += (1.08 - s) * 0.25;
    } else if (reduced) {
      x = tx; y = ty; r = tr; s = ts;
    } else {
      // Springs back like a sticker on jelly.
      vx = (vx + (tx - x) * 0.09) * 0.8;
      vy = (vy + (ty - y) * 0.09) * 0.8;
      vr = (vr + (tr - r) * 0.12) * 0.75;
      x += vx;
      y += vy;
      r += vr;
      s += (ts - s) * 0.18;
    }
    render();
    const busy = held || Math.abs(tx - x) + Math.abs(ty - y) > 0.3 || Math.abs(vx) + Math.abs(vy) > 0.05 || Math.abs(r - tr) > 0.1 || Math.abs(s - ts) > 0.002;
    if (busy || dockAt) raf = requestAnimationFrame(step);
  };
  const wake = () => {
    if (!raf) raf = requestAnimationFrame(step);
  };

  pass.addEventListener('pointerdown', (e) => {
    if (e.button || dockAt) return;
    held = true;
    moved = 0;
    px = e.clientX;
    py = e.clientY;
    pass.setPointerCapture(e.pointerId);
    pass.classList.add('is-held');
    wake();
  });
  pass.addEventListener('pointermove', (e) => {
    if (!held) return;
    const dx = e.clientX - px, dy = e.clientY - py;
    px = e.clientX;
    py = e.clientY;
    tx += dx;
    ty += dy;
    moved += Math.abs(dx) + Math.abs(dy);
    const c = home();
    dragCbs.forEach((cb) => cb({ x: c.x + tx, y: c.y + ty }));
  });
  const up = () => {
    if (!held) return;
    held = false;
    pass.classList.remove('is-held');
    const c = home();
    if (moved < 6) tapCbs.forEach((cb) => cb());
    else releaseCbs.forEach((cb) => cb({ x: c.x + tx, y: c.y + ty }));
    wake();
  };
  pass.addEventListener('pointerup', up);
  pass.addEventListener('pointercancel', up);
  // Keyboard: the card is a button; Enter scans it.
  pass.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      tapCbs.forEach((cb) => cb());
    }
  });

  // It pops onto the hero when the intro ends.
  const show = () => {
    pass.classList.remove('is-waiting');
    if (reduced) return;
    s = 0.2;
    r = -30;
    wake();
  };
  if (document.documentElement.classList.contains('intro')) {
    pass.classList.add('is-waiting');
    addEventListener('jlp-drop', show, { once: true });
  }
  // A new lap: a fresh card pops back in.
  addEventListener('jlp-loop', () => {
    dockAt = null;
    x = y = 0;
    show();
  });

  render();
  return {
    center,
    dock(target) {
      dockAt = target;
      wake();
    },
    undock() {
      dockAt = null;
      wake();
    },
    onDrag: (cb) => dragCbs.push(cb),
    onRelease: (cb) => releaseCbs.push(cb),
    onTap: (cb) => tapCbs.push(cb),
  };
}
