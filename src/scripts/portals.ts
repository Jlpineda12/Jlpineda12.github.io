// Drives the portals between chapters (Portal.astro) from the scroll. For each one, p runs 0 → 1
// while its sticky screen is held; from p it sets the shape's size, the stars' depth and the
// title's size and fade. Only portals near the screen are updated.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const easeIn = (x: number) => x * x * x;
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export function initPortals() {
  if (reduced) return;
  const portals = [...document.querySelectorAll<HTMLElement>('[data-portal]')];
  if (!portals.length) return;
  const near = new Set<HTMLElement>();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? near.add(e.target as HTMLElement) : near.delete(e.target as HTMLElement)));
    ask();
  }, { rootMargin: '50% 0px' });
  portals.forEach((p) => io.observe(p));

  let raf = 0;
  const update = () => {
    raf = 0;
    const vh = innerHeight;
    near.forEach((el) => {
      const r = el.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - vh));
      // The shape: a dot that grows slowly, then rushes to fill the screen.
      const s = 0.04 + easeIn(smooth(0.05, 0.95, p)) * 20;
      el.style.setProperty('--s', s.toFixed(3));
      el.style.setProperty('--r', `${(p * 50).toFixed(1)}deg`);
      // The stars: depth runs on as the shape grows.
      el.style.setProperty('--z', smooth(0.0, 0.9, p).toFixed(3));
      // The title: comes in, holds, then flies past (grows and fades).
      const inn = smooth(0.02, 0.3, p);
      const out = smooth(0.55, 0.92, p);
      el.style.setProperty('--ts', (0.7 + inn * 0.3 + easeIn(out) * 9).toFixed(3));
      el.style.setProperty('--to-o', (inn * (1 - smooth(0.7, 0.9, p))).toFixed(3));
    });
  };
  const ask = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);
  update();
}
