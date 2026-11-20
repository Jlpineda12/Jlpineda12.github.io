// One transition per chapter, each with its own idea (scripts/fullpage.ts plays them):
//   dive     → About me: the camera dives into José's face, the O of his name, until it fills the screen
//   boot     → Projects: a cartridge rises into the middle, and the camera dives into its label
//   page     → How I work: the screen turns over like a notebook page; on its back, lined paper and the
//              chapter's name written by hand
//   keys     → Tools: keys fill the screen, spelling the chapter's name, and sink in like they were pressed
//   postcard → Contact: the screen shrinks into a postcard, gets a stamp, and flies off like mail
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

// ---------- dive: into his face ----------
function dive(c: Ctx) {
  const circle = el('div', 'tx-circle', c.layer);
  const title = el('p', 'tx-title', c.layer, c.title);
  const size = Math.hypot(vw(), vh()) * 2.2;
  gsap.set(circle, { left: c.origin.x, top: c.origin.y, width: size, height: size, x: '-50%', y: '-50%', scale: 0.015, background: c.toBg });
  const tl = gsap.timeline();
  tl.to(c.from, { scale: 7, transformOrigin: `${c.origin.x}px ${c.origin.y}px`, filter: 'blur(6px)', duration: 1.15, ease: 'power3.in' }, 0)
    .to(circle, { scale: 1, duration: 1.0, ease: 'power3.in' }, 0.15)
    .fromTo(title, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'power3.out' }, 0.55)
    .call(c.swap, [], 1.16)
    .to(title, { scale: 6, opacity: 0, duration: 0.55, ease: 'power3.in' }, 1.0)
    .fromTo(c.to, { scale: 1.12, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: 'power3.out' }, 1.16)
    .to(circle, { opacity: 0, duration: 0.4 }, 1.2);
  return tl;
}

// ---------- boot: a cartridge ----------
// One clean cartridge rises into the middle with the chapter's name on its label, then the camera
// dives into the label: its paper is the new chapter's colour, so when it fills the screen the
// projects are there.
function boot(c: Ctx) {
  const cart = el('div', 'tx-cart', c.layer, `<span class="tx-ridges"></span><span class="tx-label"><b>${c.title}</b></span>`);
  const label = cart.querySelector<HTMLElement>('.tx-label')!;
  cart.style.setProperty('--paper', c.toBg);
  const tl = gsap.timeline();
  tl.to(c.from, { scale: 0.94, filter: 'brightness(0.8) blur(2px)', duration: 0.6, ease: 'power2.out' }, 0)
    .fromTo(cart, { yPercent: 120, rotate: 8 }, { yPercent: -50, rotate: 0, duration: 0.6, ease: 'power3.out' }, 0)
    .call(() => {
      const r = label.getBoundingClientRect();
      const cr = cart.getBoundingClientRect();
      gsap.set(cart, { transformOrigin: `${r.left - cr.left + r.width / 2}px ${r.top - cr.top + r.height / 2}px` });
    }, [], 0.62)
    .to(label.querySelector('b'), { opacity: 0, duration: 0.2 }, 0.75)
    .to(cart, { scale: 14, duration: 0.6, ease: 'power3.in' }, 0.7)
    .call(c.swap, [], 1.3)
    .fromTo(c.to, { scale: 1.04, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'power3.out' }, 1.3)
    .to(cart, { opacity: 0, duration: 0.3 }, 1.32);
  return tl;
}

// ---------- page: turned over like a notebook page ----------
function page(c: Ctx) {
  const back = el('div', 'tx-page', c.layer, `<p class="tx-hand">${c.title}</p>`);
  gsap.set(c.layer, { perspective: 1800 });
  gsap.set(back, { rotateY: 90, transformOrigin: '0% 50%' });
  c.to.classList.add('is-under');
  const tl = gsap.timeline();
  tl.set(c.from, { transformOrigin: '0% 50%', boxShadow: '0 0 0 0 #0000' }, 0)
    .to(c.from, { rotateY: -90, transformPerspective: 1800, duration: 0.5, ease: 'power2.in', filter: 'brightness(0.85)' }, 0)
    // The page's back: lined paper, with the chapter's name written on it.
    .set(c.from, { visibility: 'hidden' }, 0.5)
    .to(back, { rotateY: 0, duration: 0.45, ease: 'power2.out' }, 0.5)
    .fromTo(back.querySelector('.tx-hand'), { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.5, ease: 'none' }, 0.75)
    .call(c.swap, [], 1.3)
    .to(back, { rotateY: 92, duration: 0.5, ease: 'power2.in' }, 1.35)
    .call(() => c.to.classList.remove('is-under'), [], 1.85);
  return tl;
}

// ---------- keys: a keyboard fills the screen ----------
function keys(c: Ctx) {
  const cols = Math.max(6, Math.round(vw() / 120));
  const rows = Math.max(5, Math.round(vh() / 120));
  const grid = el('div', 'tx-keys', c.layer);
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  const word = c.title.toUpperCase().replace(/\s+/g, '');
  const mid = Math.floor(rows / 2);
  const start = Math.max(0, Math.floor((cols - word.length) / 2));
  const caps: HTMLElement[] = [];
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const letter = r === mid && k >= start && k - start < word.length ? word[k - start] : '';
      const cap = el('span', `tx-key${letter ? ' is-word' : ''}`, grid, letter ? `<b>${letter}</b>` : '');
      cap.dataset.d = String(Math.hypot(k - cols / 2, r - rows / 2));
      caps.push(cap);
    }
  }
  grid.style.setProperty('--key', c.toBg);
  const order = (i: number) => Number(caps[i].dataset.d) * 0.035;
  const tl = gsap.timeline();
  tl.fromTo(caps, { scale: 0, rotate: -20 }, { scale: 1, rotate: 0, duration: 0.4, ease: 'back.out(2)', stagger: (i) => order(i) }, 0)
    .to(c.from, { scale: 0.94, filter: 'blur(2px)', duration: 0.6 }, 0)
    .call(c.swap, [], 0.95)
    // Pressed: every key sinks and lets the chapter through, the word last.
    .to(caps.filter((x) => !x.classList.contains('is-word')), { scaleY: 0.7, y: 10, opacity: 0, duration: 0.3, ease: 'power2.in', stagger: { each: 0.008, from: 'random' } }, 1.0)
    .to(caps.filter((x) => x.classList.contains('is-word')), { y: 14, scaleY: 0.85, duration: 0.12, stagger: 0.04 }, 1.15)
    .to(caps.filter((x) => x.classList.contains('is-word')), { opacity: 0, y: -30, duration: 0.3, stagger: 0.03 }, 1.45)
    .fromTo(c.to, { scale: 0.97, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: 'power3.out' }, 1.0);
  return tl;
}

// ---------- postcard: sent away ----------
function postcard(c: Ctx) {
  c.to.classList.add('is-under');
  const stamp = el('div', 'tx-stamp', c.layer, `<span>✉</span><small>${c.title}</small>`);
  const mark = el('div', 'tx-mark', c.layer, '<i></i><i></i><i></i>');
  gsap.set([stamp, mark], { opacity: 0 });
  const tl = gsap.timeline();
  tl.to(c.from, { scale: 0.42, rotate: -6, borderRadius: 26, boxShadow: '0 40px 80px -30px #0008', duration: 0.6, ease: 'power3.inOut' }, 0)
    // The stamp and the postmark land on the card's corner.
    .fromTo(stamp, { opacity: 0, scale: 2.4, rotate: 18 }, { opacity: 1, scale: 1, rotate: 6, duration: 0.25, ease: 'power3.in' }, 0.55)
    .to(mark, { opacity: 1, duration: 0.1 }, 0.8)
    // Off it goes.
    .to([c.from, stamp, mark], { x: vw() * 1.1, y: -vh() * 0.7, rotate: 24, duration: 0.6, ease: 'power3.in' }, 1.0)
    .call(c.swap, [], 1.6)
    .fromTo(c.to, { scale: 0.96 }, { scale: 1, duration: 0.5, ease: 'power3.out' }, 1.0)
    .call(() => c.to.classList.remove('is-under'), [], 1.6);
  return tl;
}

// ---------- back up: a soft slide ----------
function back(c: Ctx) {
  const tl = gsap.timeline();
  tl.to(c.from, { yPercent: 30, opacity: 0, scale: 0.96, duration: 0.55, ease: 'power3.in' }, 0)
    .call(c.swap, [], 0.55)
    .fromTo(c.to, { yPercent: -18, opacity: 0, scale: 1.03 }, { yPercent: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out' }, 0.55);
  return tl;
}

export const TRANSITIONS: Record<string, (c: Ctx) => gsap.core.Timeline> = { dive, boot, page, keys, postcard, back };
