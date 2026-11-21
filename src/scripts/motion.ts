import { gsap } from 'gsap';

// Keep animations on real time even when frames arrive slowly (background tabs, slow phones).
gsap.ticker.lagSmoothing(0);

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Entrances (.reveal): the deck (scripts/fullpage.ts) replays them each time a chapter is shown;
// without it (no deck, reduced motion) they simply appear when scrolled into view.
export function initMotion() {
  const items = document.querySelectorAll<HTMLElement>('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  );
  items.forEach((el) => io.observe(el));
}
