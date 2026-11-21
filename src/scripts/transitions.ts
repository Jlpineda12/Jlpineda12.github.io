// One transition per chapter, each with its own idea, and each one ends on something that is really
// in the next chapter, so the move reads as one continuous gesture instead of a title card
// (scripts/fullpage.ts plays them):
//   dive     → About me: the camera dives into José's face; the colour of the next chapter grows out
//              of it and the cards come up as it opens
//   boot     → Projects: a cartridge with his projects on its label rises; the camera dives into the
//              label and lands in the console
//   page     → How I work: the screen itself turns over like a page, and the notebook slides in
//              under it
//   stick    → Tools: the notebook drops away, the laptop comes up and its stickers get slapped on
//   postcard → Contact: the keyboard steps back and the postcard comes flying in, then gets its stamp
// Going back up plays a soft slide instead. Each function builds a GSAP timeline; `swap` must be
// called at the moment the old chapter is gone and the new one is in place.
import { gsap } from 'gsap';

export type Ctx = {
  from: HTMLElement;
  to: HTMLElement;
  fromBg: string;
  toBg: string;
  title: string;
  /** Where José's face is, for the dive. */
  origin: { x: number; y: number };
  swap: () => void;
  layer: HTMLElement; // a fixed, empty layer above everything, cleared afterwards
};

const vw = () => innerWidth;
const vh = () => innerHeight;

function el(tag: string, cls: string, parent: HTMLElement, html = '') {
  const e = document.createElement(tag);
  e.className = cls;
  e.innerHTML = html;
  parent.appendChild(e);
  return e;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const all = (root: HTMLElement, sel: string) => [...root.querySelectorAll<HTMLElement>(sel)];

// ---------- dive: into his face ----------
function dive(c: Ctx) {
  const circle = el('div', 'tx-circle', c.layer);
  const size = Math.hypot(vw(), vh()) * 2.2;
  gsap.set(circle, { left: c.origin.x, top: c.origin.y, width: size, height: size, x: '-50%', y: '-50%', scale: 0.012, background: c.toBg });
  const tl = gsap.timeline();
  tl.to(c.from, { scale: 3.2, transformOrigin: `${c.origin.x}px ${c.origin.y}px`, filter: 'blur(4px)', duration: 0.85, ease: 'power3.in' }, 0)
    .to(circle, { scale: 1, duration: 0.8, ease: 'power3.in' }, 0.05)
    .call(c.swap, [], 0.84)
    // The chapter opens out of the same colour: no cut, the circle simply becomes its background.
    .fromTo(c.to, { scale: 1.06 }, { scale: 1, duration: 0.8, ease: 'power3.out' }, 0.84)
    .to(circle, { opacity: 0, duration: 0.35 }, 0.9);
  return tl;
}

// ---------- boot: a cartridge ----------
// The label shows his projects (flicking through a few as it rises) with the count under them. The
// camera dives into the picture, and when it fills the screen the console is there.
function boot(c: Ctx) {
  const art = (c.to.dataset.txArt || '').split(',').filter(Boolean);
  const sub = c.to.dataset.txSub || '';
  const cart = el(
    'div',
    'tx-cart',
    c.layer,
    `<span class="tx-ridges"></span><span class="tx-label">` +
      `<span class="tx-shot">${art.map((src, i) => `<img src="${esc(src)}" alt="" style="opacity:${i ? 0 : 1}">`).join('')}</span>` +
      `<span class="tx-cap"><b>${esc(c.title)}</b><small>${esc(sub)}</small></span></span>`,
  );
  const shot = cart.querySelector<HTMLElement>('.tx-shot')!;
  const imgs = all(shot, 'img');
  cart.style.setProperty('--paper', c.toBg);
  const tl = gsap.timeline();
  tl.to(c.from, { scale: 0.95, filter: 'brightness(0.85) blur(2px)', duration: 0.55, ease: 'power2.out' }, 0)
    .fromTo(cart, { yPercent: 120, rotate: 8 }, { yPercent: -50, rotate: 0, duration: 0.55, ease: 'power3.out' }, 0);
  // Flicking through the projects on the label, like a cartridge booting.
  imgs.slice(1).forEach((img, i) => {
    tl.set(imgs[i], { opacity: 0 }, 0.12 + i * 0.09).set(img, { opacity: 1 }, 0.12 + i * 0.09);
  });
  tl.call(() => {
    const r = shot.getBoundingClientRect();
    const cr = cart.getBoundingClientRect();
    gsap.set(cart, { transformOrigin: `${r.left - cr.left + r.width / 2}px ${r.top - cr.top + r.height / 2}px` });
  }, [], 0.6)
    .to(cart.querySelector('.tx-cap'), { opacity: 0, duration: 0.15 }, 0.62)
    .to(cart, { scale: Math.max(vw(), vh()) / Math.max(1, shot.offsetWidth || 120) * 1.6, duration: 0.55, ease: 'power3.in' }, 0.62)
    .call(c.swap, [], 1.12)
    .fromTo(c.to, { scale: 1.05, filter: 'blur(6px)' }, { scale: 1, filter: 'blur(0px)', duration: 0.6, ease: 'power3.out' }, 1.12)
    .to(cart, { opacity: 0, duration: 0.35 }, 1.12);
  return tl;
}

// ---------- page: the screen turns over ----------
function page(c: Ctx) {
  c.to.classList.add('is-under');
  const shade = el('div', 'tx-shade', c.layer);
  const book = c.to.querySelector<HTMLElement>('[data-book]');
  const tl = gsap.timeline();
  tl.set(c.from, { transformOrigin: '0% 50%', transformPerspective: 2200 }, 0)
    .to(c.from, { rotateY: -100, filter: 'brightness(0.7)', duration: 0.9, ease: 'power2.inOut' }, 0)
    .fromTo(shade, { opacity: 1 }, { opacity: 0, duration: 0.9, ease: 'power2.in' }, 0)
    .fromTo(c.to, { scale: 0.97 }, { scale: 1, duration: 0.9, ease: 'power2.out' }, 0)
    .call(c.swap, [], 0.9);
  if (book) tl.fromTo(book, { x: vw() * 0.12, rotate: 4 }, { x: 0, rotate: 0, duration: 1, ease: 'power3.out', clearProps: 'transform' }, 0.15);
  return tl;
}

// ---------- stick: the laptop comes up and the stickers get stuck on ----------
function stick(c: Ctx) {
  const laptop = c.to.querySelector<HTMLElement>('.laptop');
  const stickers = all(c.to, '.lid .st, .lid .logo');
  const rest = all(c.to, '.c-head, .chips, .st-hint, .lid-tag');
  const tl = gsap.timeline();
  tl.to(c.from, { y: vh() * 0.25, scale: 0.9, opacity: 0, duration: 0.5, ease: 'power2.in' }, 0)
    .call(c.swap, [], 0.4)
    .fromTo(c.to, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.4);
  if (laptop) tl.fromTo(laptop, { y: vh() * 0.3, rotateX: 35, transformPerspective: 1400, transformOrigin: '50% 100%' }, { y: 0, rotateX: 0, duration: 0.75, ease: 'power3.out', clearProps: 'transform' }, 0.4);
  // Slapped on one by one: each lands a little too big and settles.
  if (stickers.length) tl.fromTo(stickers, { scale: 1.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.32, ease: 'back.out(1.6)', stagger: { each: 0.035, from: 'random' }, clearProps: 'transform,opacity,scale' }, 0.75);
  if (rest.length) tl.fromTo(rest, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', stagger: 0.08, clearProps: 'transform,opacity' }, 0.55);
  return tl;
}

// ---------- postcard: the card flies in ----------
function postcard(c: Ctx) {
  const card = c.to.querySelector<HTMLElement>('.pc-card');
  const stamp = c.to.querySelector<HTMLElement>('.pc-stamp');
  const rest = all(c.to, '.pc-title, .pc-lead, .pc-foot');
  const tl = gsap.timeline();
  tl.to(c.from, { scale: 0.88, opacity: 0, filter: 'blur(3px)', duration: 0.5, ease: 'power2.in' }, 0)
    .call(c.swap, [], 0.35)
    .fromTo(c.to, { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0.35);
  if (rest.length) tl.fromTo(rest, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power2.out', clearProps: 'transform,opacity' }, 0.45);
  if (card) tl.fromTo(card, { x: vw() * 0.7, y: vh() * 0.45, rotation: 28 }, { x: 0, y: 0, rotation: 0, duration: 0.85, ease: 'power3.out', clearProps: 'transform' }, 0.35);
  if (stamp) tl.fromTo(stamp, { scale: 2.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'power3.in', clearProps: 'transform,opacity' }, 1.05);
  if (card) tl.to(card, { y: 4, duration: 0.08, yoyo: true, repeat: 1 }, 1.35);
  return tl;
}

// ---------- back up: a soft slide ----------
function back(c: Ctx) {
  const tl = gsap.timeline();
  tl.to(c.from, { yPercent: 30, opacity: 0, scale: 0.96, duration: 0.5, ease: 'power3.in' }, 0)
    .call(c.swap, [], 0.5)
    .fromTo(c.to, { yPercent: -18, opacity: 0, scale: 1.03 }, { yPercent: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out' }, 0.5);
  return tl;
}

export const TRANSITIONS: Record<string, (c: Ctx) => gsap.core.Timeline> = { dive, boot, page, stick, postcard, back };
