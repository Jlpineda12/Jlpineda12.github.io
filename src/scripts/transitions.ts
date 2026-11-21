// One transition per chapter, each with its own idea, and each one ends on something that is really
// in the next chapter, so the move reads as one continuous gesture instead of a title card
// (scripts/fullpage.ts plays them):
//   dive     → About me: the camera dives into José's face; the colour of the next chapter grows out
//              of it and the cards come up as it opens
//   boot     → Projects: the first cartridge rises with its label shuffling through his projects,
//              then drops into the console's slot, and the console boots
//   page     → How I work: the screen itself turns over like a page, and the notebook slides in
//              under it
//   stick    → Tools: the notebook drops away, the laptop comes up and its stickers rain into it
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
  tl.to(c.from, { scale: 3.2, transformOrigin: `${c.origin.x}px ${c.origin.y}px`, duration: 0.85, ease: 'power3.in' }, 0)
    .to(circle, { scale: 1, duration: 0.8, ease: 'power3.in' }, 0.05)
    .call(c.swap, [], 0.84)
    // The chapter opens out of the same colour: no cut, the circle simply becomes its background.
    .fromTo(c.to, { scale: 1.06 }, { scale: 1, duration: 0.8, ease: 'power3.out' }, 0.84)
    .to(circle, { opacity: 0, duration: 0.35 }, 0.9);
  return tl;
}

// ---------- boot: a cartridge ----------
// The first cartridge on the shelf comes up to meet you: it rises into the middle, its label
// shuffling through his projects like a slot reel until it settles on the first one. The projects
// open behind it, and it flies down into its place on the turntable (the very cartridge that is
// there), with a little ring as it clicks in, while the console slides in beside it.
function boot(c: Ctx) {
  const shelfCart = c.to.querySelector<HTMLElement>('.carts .cart.is-in') ?? c.to.querySelector<HTMLElement>('.carts .cart');
  const slot = c.to.querySelector<HTMLElement>('.slot-cart');
  if (!shelfCart || !slot) return bootDive(c);
  const R = slot.getBoundingClientRect();
  if (!R.width) return bootDive(c);

  // A copy of the first cartridge, big, in the layer above everything.
  const box = el('div', 'tx-cart2', c.layer);
  Object.assign(box.style, { left: `${R.left}px`, top: `${R.top}px`, width: `${R.width}px`, height: `${R.height}px` });
  const copy = shelfCart.cloneNode(true) as HTMLElement;
  copy.classList.remove('is-in');
  copy.setAttribute('tabindex', '-1');
  Object.assign(copy.style, { width: '100%', height: '100%', translate: 'none', opacity: '1', filter: 'none' });
  box.appendChild(copy);
  const img = copy.querySelector<HTMLImageElement>('.c-label img');
  if (img) img.loading = 'eager';

  const big = Math.min(vw() * 0.3, vh() * 0.42, 300) / R.width;
  const dx = vw() / 2 - (R.left + R.width / 2);
  const dy = vh() / 2 - (R.top + R.height / 2);
  const art = (c.to.dataset.txArt || '').split(',').filter(Boolean);
  const final = img?.src || '';
  const device = c.to.querySelector<HTMLElement>('.device .body');
  const rest = all(c.to, '.carts li, .infos, .pj-head > *');

  const tl = gsap.timeline();
  tl.to(c.from, { scale: 0.94, opacity: 0.55, duration: 0.6, ease: 'power2.out' }, 0)
    .fromTo(box, { x: dx, y: dy + vh() * 0.7, scale: big, rotate: 12 }, { y: dy, rotate: -3, duration: 0.6, ease: 'power3.out' }, 0)
    .to(box, { rotate: 0, duration: 0.3, ease: 'back.out(3)' }, 0.6);
  // The label shuffles like a reel, slowing down, and stops on the first project.
  if (img && art.length) {
    const shots = [...art, ...art].slice(0, 8);
    let t = 0.08;
    shots.forEach((src, i) => {
      tl.call(() => { img.src = src; }, [], t);
      t += 0.04 + i * 0.012;
    });
    tl.call(() => { img.src = final; }, [], t);
  }
  tl.set(slot, { opacity: 0 }, 0)
    .call(c.swap, [], 0.8)
    .fromTo(c.to, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out' }, 0.8);
  if (device) tl.fromTo(device, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', clearProps: 'all' }, 0.8);
  if (rest.length) tl.fromTo(rest, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.025, ease: 'power2.out', clearProps: 'all' }, 0.95);
  // Up above the slot, then down into it.
  tl.to(box, { x: 0, y: -R.height * 0.75, scale: 1, duration: 0.6, ease: 'power3.inOut' }, 0.9)
    .to(box, { y: 0, duration: 0.18, ease: 'power2.in' }, 1.5)
    .call(() => {
      gsap.set(slot, { opacity: 1 });
      box.style.opacity = '0';
      const ring = el('span', 'tx-ring', c.layer);
      gsap.set(ring, { left: R.left + R.width / 2, top: R.top + R.height, width: R.width * 2.2, height: R.width * 2.2 });
      gsap.fromTo(ring, { scale: 0.4, opacity: 0.9 }, { scale: 1.6, opacity: 0, duration: 0.55, ease: 'power2.out' });
      window.dispatchEvent(new Event('proj-inserted'));
    }, [], 1.68)
    .set({}, {}, 2.2);
  return tl;
}

// Without the turntable (no scripts ran for it yet): the camera dives into a cartridge's label.
function bootDive(c: Ctx) {
  const art = (c.to.dataset.txArt || '').split(',').filter(Boolean);
  const cart = el(
    'div',
    'tx-cart',
    c.layer,
    `<span class="tx-ridges"></span><span class="tx-label">` +
      `<span class="tx-shot">${art.slice(0, 1).map((src) => `<img src="${esc(src)}" alt="">`).join('')}</span>` +
      `<span class="tx-cap"><b>${esc(c.title)}</b></span></span>`,
  );
  const shot = cart.querySelector<HTMLElement>('.tx-shot')!;
  cart.style.setProperty('--paper', c.toBg);
  const tl = gsap.timeline();
  tl.to(c.from, { scale: 0.95, opacity: 0.6, duration: 0.55 }, 0)
    .fromTo(cart, { yPercent: 120 }, { yPercent: -50, duration: 0.55, ease: 'power3.out' }, 0)
    .call(() => {
      const r = shot.getBoundingClientRect();
      const cr = cart.getBoundingClientRect();
      gsap.set(cart, { transformOrigin: `${r.left - cr.left + r.width / 2}px ${r.top - cr.top + r.height / 2}px` });
    }, [], 0.6)
    .to(cart, { scale: 16, duration: 0.55, ease: 'power3.in' }, 0.62)
    .call(c.swap, [], 1.12)
    .fromTo(c.to, { scale: 1.05 }, { scale: 1, duration: 0.6, ease: 'power3.out' }, 1.12)
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
    .to(c.from, { rotateY: -100, duration: 0.9, ease: 'power2.inOut' }, 0)
    .fromTo(shade, { opacity: 1 }, { opacity: 0, duration: 0.9, ease: 'power2.in' }, 0)
    .fromTo(c.to, { scale: 0.97 }, { scale: 1, duration: 0.9, ease: 'power2.out' }, 0)
    .call(c.swap, [], 0.9);
  if (book) tl.fromTo(book, { x: vw() * 0.12, rotate: 4 }, { x: 0, rotate: 0, duration: 1, ease: 'power3.out', clearProps: 'all' }, 0.15);
  return tl;
}

// ---------- stick: the laptop comes up and the stickers get stuck on ----------
function stick(c: Ctx) {
  const laptop = c.to.querySelector<HTMLElement>('.laptop');
  const rest = all(c.to, '.c-head');
  const tl = gsap.timeline();
  tl.to(c.from, { y: vh() * 0.25, scale: 0.9, opacity: 0, duration: 0.5, ease: 'power2.in' }, 0)
    .call(c.swap, [], 0.4)
    .fromTo(c.to, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.4);
  // The laptop comes up; its stickers rain in as the chapter opens (Tools.astro).
  if (laptop) tl.fromTo(laptop, { y: vh() * 0.3, rotateX: 35, transformPerspective: 1400, transformOrigin: '50% 100%' }, { y: 0, rotateX: 0, duration: 0.75, ease: 'power3.out', clearProps: 'all' }, 0.4);
  if (rest.length) tl.fromTo(rest, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', clearProps: 'all' }, 0.55);
  return tl;
}

// ---------- postcard: the card flies in ----------
function postcard(c: Ctx) {
  const card = c.to.querySelector<HTMLElement>('.pc-card');
  const stamp = c.to.querySelector<HTMLElement>('.pc-stamp');
  const rest = all(c.to, '.pc-title, .pc-lead, .pc-foot');
  const tl = gsap.timeline();
  tl.to(c.from, { scale: 0.88, opacity: 0, duration: 0.5, ease: 'power2.in' }, 0)
    .call(c.swap, [], 0.35)
    .fromTo(c.to, { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0.35);
  if (rest.length) tl.fromTo(rest, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power2.out', clearProps: 'all' }, 0.45);
  if (card) tl.fromTo(card, { x: vw() * 0.7, y: vh() * 0.45, rotation: 28 }, { x: 0, y: 0, rotation: 0, duration: 0.85, ease: 'power3.out', clearProps: 'all' }, 0.35);
  if (stamp) tl.fromTo(stamp, { scale: 2.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'power3.in', clearProps: 'all' }, 1.05);
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
