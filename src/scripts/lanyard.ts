// The hero badge hangs from a lanyard and behaves like one: it drops in on load, sways, swings when
// you grab and throw it (sideways drags on touch, so the page still scrolls), and bounces on the
// strap. Two springs: the strap swings from the top of the screen, the badge swings from the clip.
//
// The clip is a retractable badge reel: past the strap, a thin cord pulls out so the card can reach
// the reader. The reader (scanner.ts) can also "dock" the card: the springs carry it over to a
// point and hold it there, level, until it is released and the reel winds it back.
import { getLoop } from './loop';

const D2R = Math.PI / 180;

export type Point = { x: number; y: number };

export type Lanyard = {
  /** Centre of the card on screen. */
  center(): Point;
  /** Carry the card to a point on screen (its centre) and hold it there. */
  dock(target: () => Point): void;
  /** Let go: the reel winds back and the card swings home. */
  undock(): void;
  /** Called while the card is dragged, and once when it is let go. */
  onDrag(cb: (p: Point) => void): void;
  onRelease(cb: (p: Point) => void): void;
  /** A tap on the card, not a drag. */
  onTap(cb: () => void): void;
};

export function initLanyard(): Lanyard | null {
  const root = document.querySelector<HTMLElement>('[data-lanyard]');
  const swing = root?.querySelector<HTMLElement>('.swing');
  const badge = root?.querySelector<HTMLElement>('.badge');
  const card = root?.querySelector<HTMLElement>('.badge-card');
  if (!root || !swing || !badge || !card) return null;

  const loopEl = badge.querySelector<HTMLElement>('[data-loop]');
  if (loopEl) loopEl.textContent = String(getLoop()).padStart(2, '0');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const restLen = () => parseFloat(getComputedStyle(root.closest('.hero')!).getPropertyValue('--strap')) || 120;

  const dragCbs: ((p: Point) => void)[] = [];
  const releaseCbs: ((p: Point) => void)[] = [];
  const tapCbs: (() => void)[] = [];

  const center = (): Point => {
    const r = card.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  // State: strap angle (deg), badge angle relative to the strap (deg), strap length (px), and speeds.
  let a = 0, va = 0;
  let b = 0, vb = 0;
  let len = restLen(), vl = 0;
  let L0 = len;
  // Docked: where the springs pull to instead of straight down.
  let dockAt: (() => Point) | null = null;
  let a0 = 0, Lt = L0;

  const strap = root.querySelector<HTMLElement>('.strap');
  const cord = root.querySelector<HTMLElement>('.cord');
  const render = () => {
    swing.style.setProperty('--len', `${len.toFixed(1)}px`);
    swing.style.transform = `rotate(${a.toFixed(2)}deg)`;
    // The strap swings with the card until the reel starts paying out cord; then it hangs and only
    // the cord follows the card.
    const k = Math.max(0, Math.min(1, 1 - (len - L0) / 90));
    const sa = a * k;
    const sl = Math.min(len, L0);
    root.style.setProperty('--sa', `${sa.toFixed(2)}deg`);
    root.style.setProperty('--strap-len', `${sl.toFixed(1)}px`);
    if (cord) {
      const ex = -sl * Math.sin(sa * D2R), ey = sl * Math.cos(sa * D2R);
      const cx = -len * Math.sin(a * D2R), cy = len * Math.cos(a * D2R);
      const l = Math.hypot(cx - ex, cy - ey);
      cord.style.height = `${l.toFixed(1)}px`;
      cord.style.transform = `translate(${ex.toFixed(1)}px, ${ey.toFixed(1)}px) rotate(${(Math.atan2(ex - cx, cy - ey) / D2R).toFixed(2)}deg)`;
    }
    const spin = Math.max(-28, Math.min(28, -(va + vb) * 0.09));
    badge.style.transform = `rotate(${b.toFixed(2)}deg)`;
    card.style.transform = `rotateY(${spin.toFixed(2)}deg) rotateX(${(Math.abs(spin) * 0.15).toFixed(2)}deg)`;
  };

  const anchor = () => {
    const r = root.getBoundingClientRect();
    return { x: r.left, y: r.top };
  };

  // Angle and length that put the card's centre on a point, with the card held level.
  // The card hangs from a pivot 20px under the clip; its centre sits `h` under that pivot.
  const solve = (p: Point) => {
    const o = anchor();
    const h = 30 + badge.offsetHeight / 2;
    const vx = p.x - o.x;
    const vy = p.y - o.y - h;
    return { a: Math.atan2(-vx, vy) / D2R, len: Math.max(L0 * 0.7, Math.hypot(vx, vy) - 20) };
  };

  const api: Lanyard = {
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

  let raf = 0;
  let onScreen = true;
  let last = performance.now();
  let dragging = false;

  function step(now: number) {
    raf = 0;
    const dt = Math.min(0.034, (now - last) / 1000);
    last = now;
    if (dockAt) {
      const s = solve(dockAt());
      a0 = s.a;
      Lt = s.len;
    } else {
      a0 = 0;
      Lt = L0;
    }
    const docked = !!dockAt;
    if (!dragging) {
      // Strap: a pendulum with a spring back to rest, a little air drag, and a soft breeze.
      // Docked, the springs are stiffer and calmer so the card settles over the reader.
      const breeze = docked ? 0 : Math.sin(now / 1300) * 0.6 + Math.sin(now / 470) * 0.15;
      const aa = docked ? -70 * (a - a0) - 14 * va : -38 * (a - a0) - 3.2 * va + breeze;
      va += aa * dt;
      a += va * dt;
      // Length: the strap stretches and bounces; the reel winds the cord back in.
      const al = docked ? -110 * (len - Lt) - 19 * vl : -90 * (len - Lt) - (len > L0 * 1.05 ? 16 : 9) * vl;
      vl += al * dt;
      len += vl * dt;
    }
    // Badge: hangs straight down (cancels the strap angle) and lags behind its swings. Docked, it
    // is held level.
    const ab = docked ? -90 * (b + a) - 16 * vb : -60 * (b + a * 0.85) - 4.5 * vb;
    vb += ab * dt;
    b += vb * dt;
    render();

    // The breeze never stops, so it keeps running while the hero is on screen.
    if (onScreen) raf = requestAnimationFrame(step);
  }

  function wake() {
    if (!raf && onScreen) {
      last = performance.now();
      raf = requestAnimationFrame(step);
    }
  }

  if (reduced) {
    // No swinging: the card hangs still, and docking just places it.
    a = -3;
    b = 2;
    render();
    api.dock = (target) => {
      const s = solve(target());
      a = s.a;
      b = -a;
      len = s.len;
      render();
    };
    api.undock = () => {
      a = -3;
      b = 2;
      len = L0;
      render();
    };
    badge.addEventListener('click', () => tapCbs.forEach((cb) => cb()));
    return api;
  }

  // Drop in from above the screen, landing with a bounce on the strap.
  len = -L0 * 2.4;
  vl = 0;
  a = 9;
  b = -6;

  let grabAngle = 0;
  let grabDist = 0;
  let moved = 0;
  let lastX = 0, lastY = 0, lastT = 0;

  const angleTo = (x: number, y: number) => {
    const o = anchor();
    return Math.atan2(o.x - x, y - o.y) / D2R;
  };

  badge.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    dockAt = null;
    moved = 0;
    const o = anchor();
    grabAngle = angleTo(e.clientX, e.clientY) - a;
    // How far past the clip the finger grabbed: the card keeps that offset under the finger.
    grabDist = Math.hypot(e.clientX - o.x, e.clientY - o.y) - len;
    lastX = e.clientX;
    lastY = e.clientY;
    lastT = performance.now();
    badge.setPointerCapture(e.pointerId);
    badge.classList.add('is-grabbed');
    wake();
  });

  badge.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dtm = Math.max(8, now - lastT) / 1000;
    moved += Math.hypot(e.clientX - lastX, e.clientY - lastY);
    const o = anchor();
    const target = Math.max(-85, Math.min(85, angleTo(e.clientX, e.clientY) - grabAngle));
    va = (target - a) / dtm;
    a = target;
    // The reel lets the cord out far enough to reach anywhere on the first screen.
    const want = Math.hypot(e.clientX - o.x, e.clientY - o.y) - grabDist;
    const nl = Math.max(L0 * 0.7, Math.min(L0 + innerHeight * 0.75, want));
    vl = (nl - len) / dtm;
    len = nl;
    lastX = e.clientX;
    lastY = e.clientY;
    lastT = now;
    if (moved > 8) dragCbs.forEach((cb) => cb(center()));
  });

  const release = () => {
    if (!dragging) return;
    dragging = false;
    badge.classList.remove('is-grabbed');
    va = Math.max(-500, Math.min(500, va));
    vl = Math.max(-1500, Math.min(1500, vl));
    if (moved > 8) releaseCbs.forEach((cb) => cb(center()));
    wake();
  };
  badge.addEventListener('pointerup', release);
  badge.addEventListener('pointercancel', release);
  badge.addEventListener('lostpointercapture', release);

  // A drag is not a tap.
  badge.addEventListener(
    'click',
    (e) => {
      if (moved > 8) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      tapCbs.forEach((cb) => cb());
    },
    true,
  );

  // The cursor brushing past gives it a nudge; so does scrolling.
  let px = 0;
  window.addEventListener('pointermove', (e) => {
    if (dragging || dockAt || e.pointerType !== 'mouse') return;
    const r = badge.getBoundingClientRect();
    const dx = e.clientX - px;
    px = e.clientX;
    if (e.clientX > r.left - 40 && e.clientX < r.right + 40 && e.clientY > r.top - 40 && e.clientY < r.bottom + 40) {
      va += Math.max(-40, Math.min(40, -dx * 1.4));
      wake();
    }
  });

  let lastScroll = scrollY;
  window.addEventListener(
    'scroll',
    () => {
      const d = scrollY - lastScroll;
      lastScroll = scrollY;
      if (!onScreen || dockAt) return;
      vb += Math.max(-60, Math.min(60, d * 0.8));
      vl += Math.max(-200, Math.min(200, -d * 3));
      wake();
    },
    { passive: true },
  );

  new IntersectionObserver((entries) => {
    onScreen = entries[0].isIntersecting;
    if (onScreen) wake();
  }).observe(root.closest('.hero')!);

  window.addEventListener('resize', () => {
    L0 = restLen();
    wake();
  });

  // The gate opens and the card's anchor slides aside: it swings after it.
  window.addEventListener('jlp-enter', () => {
    va -= 70;
    vb += 40;
    wake();
  });

  // A new lap: the card drops in again with the new number.
  window.addEventListener('jlp-loop', (e) => {
    const n = (e as CustomEvent<number>).detail;
    if (loopEl) loopEl.textContent = String(n).padStart(2, '0');
    dockAt = null;
    len = -L0 * 2.4;
    vl = 0;
    va = 30;
    wake();
  });

  // The intro plays first; the card drops in when it ends (jlp-drop). Otherwise, after a beat.
  const drop = () => {
    root.classList.remove('is-waiting');
    len = -L0 * 2.4;
    vl = 0;
    a = 9;
    b = -6;
    wake();
  };
  render();
  if (document.documentElement.classList.contains('intro')) {
    root.classList.add('is-waiting');
    window.addEventListener('jlp-drop', drop, { once: true });
  } else {
    setTimeout(wake, 250);
  }
  return api;
}
