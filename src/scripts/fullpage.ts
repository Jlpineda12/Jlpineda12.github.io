// The site as a deck of screens. Every chapter fills the screen exactly; one scroll (the wheel, a
// swipe, the arrow keys, PageUp/PageDown, Space) or a link moves to the next one through its own
// transition (scripts/transitions.ts: a dive into José's face, an old TV switching channel, a
// notebook page turning, a keyboard being pressed, a postcard being sent). Going back up slides.
// A chapter that is taller than the screen (a small phone) scrolls inside first. A chapter can ask
// for steps (data-steps="n"): the notebook turns its pages with the same gestures before moving on.
// Without scripts the chapters simply stack and scroll; with reduced motion they cross-fade.
import { gsap } from 'gsap';
import { TRANSITIONS } from './transitions';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

type Slide = { el: HTMLElement; id: string; title: string; tx: string; scroller: HTMLElement; steps: number; step: number };

export function initFullpage() {
  const root = document.documentElement;
  const deck = document.querySelector<HTMLElement>('[data-deck]');
  if (!deck) return;
  const slides: Slide[] = [...deck.querySelectorAll<HTMLElement>(':scope > [data-slide]')].map((el) => ({
    el,
    id: el.dataset.slide || '',
    title: el.dataset.title || '',
    tx: el.dataset.tx || 'back',
    scroller: (el.firstElementChild as HTMLElement) ?? el,
    steps: Number(el.dataset.steps || 0),
    step: 0,
  }));
  if (slides.length < 2) return;
  root.classList.add('fp');

  // The layer transitions draw their extra pieces on (a circle, keys, a stamp…), emptied after each.
  const layer = document.createElement('div');
  layer.className = 'tx-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

  const bgOf = (s: Slide) => {
    const sc = s.el.querySelector<HTMLElement>('[data-scene]') ?? s.el;
    const v = getComputedStyle(sc).getPropertyValue('--bg').trim();
    return s.el.querySelector('.hero') ? '#181f78' : v || '#ffffff';
  };

  let index = 0;
  let busy = false;

  const show = (i: number) => {
    slides.forEach((s, k) => {
      s.el.classList.toggle('is-current', k === i);
      s.el.toggleAttribute('inert', k !== i);
      s.el.setAttribute('aria-hidden', String(k !== i));
    });
    index = i;
    const s = slides[i];
    root.dataset.slide = s.id;
    if (meta) meta.content = bgOf(s);
    // Its entrance plays every time it is shown.
    s.el.querySelectorAll('.reveal').forEach((r) => r.classList.remove('is-in'));
    requestAnimationFrame(() => requestAnimationFrame(() => s.el.querySelectorAll('.reveal').forEach((r) => r.classList.add('is-in'))));
    window.dispatchEvent(new CustomEvent('fp-change', { detail: { index: i, id: s.id } }));
    window.dispatchEvent(new Event(`fp-enter-${s.id}`));
  };

  const setStep = (s: Slide, k: number) => {
    s.step = k;
    s.el.dispatchEvent(new CustomEvent('fp-step', { detail: k }));
  };

  // Where the shape grows from: the middle, or José's face when leaving the hero.
  const originFor = (from: Slide) => {
    const face = from.el.querySelector('.face-in');
    if (face && from === slides[0]) {
      const r = face.getBoundingClientRect();
      if (r.width) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return { x: innerWidth / 2, y: innerHeight / 2 };
  };

  const go = (to: number, instant = false) => {
    to = Math.max(0, Math.min(slides.length - 1, to));
    if (busy || to === index) return;
    const from = slides[index];
    const next = slides[to];
    const dir = to > index ? 1 : -1;
    history.replaceState(null, '', to === 0 ? location.pathname : `#${next.id}`);
    // Coming back into a chapter with steps: arrive at its first or last step.
    if (next.steps) setStep(next, dir > 0 ? 0 : next.steps - 1);
    next.scroller.scrollTop = dir > 0 ? 0 : next.scroller.scrollHeight;

    if (instant || reduced) {
      if (!instant) {
        busy = true;
        gsap.fromTo(next.el, { opacity: 0 }, { opacity: 1, duration: 0.35, onComplete: () => { busy = false; } });
      }
      show(to);
      return;
    }

    busy = true;
    const kind = dir > 0 ? next.tx : 'back';
    const play = TRANSITIONS[kind] ?? TRANSITIONS.back;
    next.el.classList.add('is-next');
    const tl = play({
      from: from.el,
      to: next.el,
      fromBg: bgOf(from),
      toBg: bgOf(next),
      title: next.title,
      origin: originFor(from),
      swap: () => show(to),
      layer,
    });
    tl.eventCallback('onComplete', () => {
      layer.innerHTML = '';
      gsap.set(layer, { clearProps: 'all' });
      next.el.classList.remove('is-next', 'is-under');
      from.el.classList.remove('is-under');
      gsap.set([from.el, next.el], { clearProps: 'transform,opacity,filter,visibility,borderRadius,boxShadow,transformOrigin,x,y,rotate,rotateY,scale,scaleX,scaleY,yPercent' });
      busy = false;
    });
  };

  const next = () => {
    const s = slides[index];
    if (s.steps && s.step < s.steps - 1) return setStep(s, s.step + 1);
    go(index + 1);
  };
  const prev = () => {
    const s = slides[index];
    if (s.steps && s.step > 0) return setStep(s, s.step - 1);
    go(index - 1);
  };

  // Can the chapter still scroll inside in that direction?
  const canScroll = (dir: number) => {
    const sc = slides[index].scroller;
    if (sc.scrollHeight <= sc.clientHeight + 2) return false;
    return dir > 0 ? sc.scrollTop + sc.clientHeight < sc.scrollHeight - 2 : sc.scrollTop > 2;
  };

  // The wheel: one gesture, one move. Trackpads keep sending small deltas after a flick, so the
  // deck waits for the wheel to go quiet before it listens again.
  let acc = 0, quiet = 0, locked = false;
  addEventListener('wheel', (e) => {
    if ((e.target as Element).closest('[data-fp-free]')) return;
    const dir = Math.sign(e.deltaY);
    if (!dir || canScroll(dir)) return;
    e.preventDefault();
    clearTimeout(quiet);
    quiet = window.setTimeout(() => { locked = false; acc = 0; }, 220);
    if (locked || busy) return;
    acc += e.deltaY;
    if (Math.abs(acc) > 40) {
      locked = true;
      acc = 0;
      if (dir > 0) next(); else prev();
    }
  }, { passive: false });

  // Swipes.
  let ty = 0, tx = 0, tEdge = false;
  addEventListener('touchstart', (e) => {
    ty = e.touches[0].clientY;
    tx = e.touches[0].clientX;
    tEdge = true;
  }, { passive: true });
  addEventListener('touchend', (e) => {
    if (!tEdge || (e.target as Element).closest('[data-fp-free]')) return;
    const dy = ty - e.changedTouches[0].clientY;
    const dx = tx - e.changedTouches[0].clientX;
    if (Math.abs(dy) < 60 || Math.abs(dx) > Math.abs(dy)) return;
    const dir = Math.sign(dy);
    if (canScroll(dir)) return;
    if (dir > 0) next(); else prev();
  }, { passive: true });

  // Keys.
  addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('input, textarea, select, [contenteditable="true"]') || e.altKey || e.ctrlKey || e.metaKey) return;
    const down = ['ArrowDown', 'PageDown', ' '].includes(e.key);
    const up = ['ArrowUp', 'PageUp'].includes(e.key);
    if (e.key === ' ' && t.closest('button, a, [role="button"]')) return;
    if (down || up) {
      const dir = down ? 1 : -1;
      if (canScroll(dir) && !['PageDown', 'PageUp'].includes(e.key)) return;
      e.preventDefault();
      if (down) next(); else prev();
    } else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(slides.length - 1); }
  });

  // Links to chapters (the menu, the journey bar, buttons) move the deck.
  const byId = (id: string) => slides.findIndex((s) => s.id === id || s.el.querySelector(`#${CSS.escape(id)}`));
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href')!.slice(1);
    const k = byId(id);
    if (k < 0 && id !== 'inicio') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    go(k < 0 ? 0 : k);
  }, true);

  // A chapter can ask to move on or back (the notebook, when its page is clicked).
  addEventListener('fp-next', () => !busy && next());
  addEventListener('fp-prev', () => !busy && prev());

  // "Another lap": back to the start.
  addEventListener('jlp-loop', () => go(0));

  // Start where the link says.
  const start = location.hash ? byId(location.hash.slice(1)) : 0;
  show(start > 0 ? start : 0);
  addEventListener('hashchange', () => {
    const k = byId(location.hash.slice(1));
    if (k >= 0) go(k);
  });
}
