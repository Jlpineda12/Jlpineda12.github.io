// The hero badge hangs from a lanyard and behaves like one: it drops in on load, sways, swings when
// you grab and throw it (sideways drags on touch, so the page still scrolls), and bounces on the
// strap. Two springs: the strap swings from the top of the screen, the badge swings from the clip.
import { getLoop } from './loop';

const D2R = Math.PI / 180;

export function initLanyard() {
  const root = document.querySelector<HTMLElement>('[data-lanyard]');
  const swing = root?.querySelector<HTMLElement>('.swing');
  const badge = root?.querySelector<HTMLElement>('.badge');
  const card = root?.querySelector<HTMLElement>('.badge-card');
  if (!root || !swing || !badge || !card) return;

  const loopEl = badge.querySelector<HTMLElement>('[data-loop]');
  if (loopEl) loopEl.textContent = String(getLoop()).padStart(2, '0');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const restLen = () => parseFloat(getComputedStyle(root.closest('.hero')!).getPropertyValue('--strap')) || 120;

  // State: strap angle (deg), badge angle relative to the strap (deg), strap length (px), and speeds.
  let a = 0, va = 0;
  let b = 0, vb = 0;
  let len = restLen(), vl = 0;
  let L0 = len;

  const render = () => {
    swing.style.setProperty('--len', `${len.toFixed(1)}px`);
    swing.style.transform = `rotate(${a.toFixed(2)}deg)`;
    const spin = Math.max(-28, Math.min(28, -(va + vb) * 0.09));
    badge.style.transform = `rotate(${b.toFixed(2)}deg)`;
    card.style.transform = `rotateY(${spin.toFixed(2)}deg) rotateX(${(Math.abs(spin) * 0.15).toFixed(2)}deg)`;
  };

  if (reduced) {
    a = -3;
    b = 2;
    render();
    return;
  }

  // Drop in from above the screen, landing with a bounce on the strap.
  len = -L0 * 2.4;
  vl = 0;
  a = 9;
  b = -6;

  let dragging = false;
  let grabAngle = 0;
  let grabDist = 1;
  let moved = 0;
  let lastX = 0, lastY = 0, lastT = 0;
  let raf = 0;
  let last = performance.now();
  let onScreen = true;

  const anchor = () => {
    const r = root.getBoundingClientRect();
    return { x: r.left, y: r.top };
  };

  const step = (now: number) => {
    raf = 0;
    const dt = Math.min(0.034, (now - last) / 1000);
    last = now;
    if (!dragging) {
      // Strap: a pendulum with a spring back to rest, a little air drag, and a soft breeze.
      const breeze = Math.sin(now / 1300) * 0.6 + Math.sin(now / 470) * 0.15;
      const aa = -38 * a - 3.2 * va + breeze;
      va += aa * dt;
      a += va * dt;
      // Length: the strap stretches and bounces.
      const al = -90 * (len - L0) - 9 * vl;
      vl += al * dt;
      len += vl * dt;
    }
    // Badge: hangs straight down (cancels the strap angle) and lags behind its swings.
    const ab = -60 * (b + a * 0.85) - 4.5 * vb;
    vb += ab * dt;
    b += vb * dt;
    render();

    // The breeze never stops, so it keeps running while the hero is on screen.
    if (onScreen) raf = requestAnimationFrame(step);
  };

  const wake = () => {
    if (!raf && onScreen) {
      last = performance.now();
      raf = requestAnimationFrame(step);
    }
  };

  const angleTo = (x: number, y: number) => {
    const o = anchor();
    return Math.atan2(o.x - x, y - o.y) / D2R;
  };

  badge.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    moved = 0;
    const o = anchor();
    grabAngle = angleTo(e.clientX, e.clientY) - a;
    grabDist = Math.max(40, Math.hypot(e.clientX - o.x, e.clientY - o.y)) / Math.max(1, len);
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
    const target = Math.max(-75, Math.min(75, angleTo(e.clientX, e.clientY) - grabAngle));
    va = (target - a) / dtm;
    a = target;
    const want = Math.hypot(e.clientX - o.x, e.clientY - o.y) / grabDist;
    const nl = Math.max(L0 * 0.7, Math.min(L0 * 1.6, want));
    vl = (nl - len) / dtm;
    len = nl;
    lastX = e.clientX;
    lastY = e.clientY;
    lastT = now;
  });

  const release = () => {
    if (!dragging) return;
    dragging = false;
    badge.classList.remove('is-grabbed');
    va = Math.max(-500, Math.min(500, va));
    vl = Math.max(-1500, Math.min(1500, vl));
    wake();
  };
  badge.addEventListener('pointerup', release);
  badge.addEventListener('pointercancel', release);
  badge.addEventListener('lostpointercapture', release);

  // A drag is not a click: don't replay the character after a throw.
  badge.addEventListener(
    'click',
    (e) => {
      if (moved > 8) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );

  // The cursor brushing past gives it a nudge; so does scrolling.
  let px = 0;
  window.addEventListener('pointermove', (e) => {
    if (dragging || e.pointerType !== 'mouse') return;
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
      if (!onScreen) return;
      vb += Math.max(-60, Math.min(60, d * 0.8));
      vl += Math.max(-200, Math.min(200, -d * 3));
      wake();
    },
    { passive: true },
  );

  // Clicking the character also makes the badge jump a little.
  badge.querySelector('.character')?.addEventListener('click', () => {
    vl -= 260;
    va += (Math.random() - 0.5) * 60;
    wake();
  });

  new IntersectionObserver((entries) => {
    onScreen = entries[0].isIntersecting;
    if (onScreen) wake();
  }).observe(root.closest('.hero')!);

  window.addEventListener('resize', () => {
    L0 = restLen();
    wake();
  });

  // A new lap: the card drops in again with the new number.
  window.addEventListener('jlp-loop', (e) => {
    const n = (e as CustomEvent<number>).detail;
    if (loopEl) loopEl.textContent = String(n).padStart(2, '0');
    len = -L0 * 2.4;
    vl = 0;
    va = 30;
    wake();
  });

  // Wait a beat so the drop is seen.
  render();
  setTimeout(wake, 250);
}
