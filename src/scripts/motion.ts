import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
// Keep animations on real time even when frames arrive slowly (background tabs, slow phones).
gsap.ticker.lagSmoothing(0);

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Fit one-line display text ([data-fit]) to the width of its container.
function fitText() {
  document.querySelectorAll<HTMLElement>('[data-fit]').forEach((el) => {
    if (getComputedStyle(el).whiteSpace !== 'nowrap') {
      el.style.fontSize = '';
      return;
    }
    el.style.fontSize = '100px';
    const inner = (el.firstElementChild as HTMLElement) || el;
    const cs = getComputedStyle(el);
    const avail = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const w = inner.getBoundingClientRect().width;
    if (w > 0) el.style.fontSize = `${Math.floor((100 * avail) / w) - 1}px`;
  });
}

// Section entrances: heading, text, picture, staggered by their --d delay.
function reveals() {
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

// Clouds drift at their own speed while the page scrolls.
function parallax() {
  if (reduced) return;
  document.querySelectorAll<HTMLElement>('[data-speed]').forEach((el) => {
    const speed = parseFloat(el.dataset.speed || '0.3');
    gsap.to(el, {
      y: () => -window.innerHeight * speed,
      ease: 'none',
      scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
  // The hero character sinks a little as the journey starts.
  const char = document.querySelector('.hero-char');
  if (char) {
    gsap.to(char, {
      yPercent: 12,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });
  }
}

// Travelling between chapters: a curtain of clouds sweeps across, the page lands on the
// chapter behind it, and the clouds clear. Reduced motion simply jumps.
function cloudTravel() {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
  const wipe = document.createElement('div');
  wipe.className = 'cloud-wipe';
  wipe.setAttribute('aria-hidden', 'true');
  wipe.innerHTML = `
    <div class="cw-band">
      <img class="cw-edge cw-l" src="${base}world/nube.webp" alt="" />
      <img class="cw-edge cw-r" src="${base}world/nube.webp" alt="" />
      <p class="cw-label"><img src="${base}favicon.png" alt="" /><span>Viajando a</span> <strong></strong></p>
    </div>`;
  document.body.appendChild(wipe);
  const label = wipe.querySelector('strong')!;
  let busy = false;

  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a || a.classList.contains('skip')) return;
    const hash = a.getAttribute('href')!;
    const target = hash === '#' ? null : document.querySelector<HTMLElement>(hash);
    if (!target) return;
    e.preventDefault();
    const go = () => {
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY, behavior: 'instant' as ScrollBehavior });
      history.replaceState(null, '', hash);
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    };
    if (reduced || busy) return go();
    busy = true;
    const heading = target.querySelector('h1, h2');
    wipe.querySelector('.cw-label span')!.textContent = document.body.dataset.travelling || 'Viajando a';
    label.textContent = (a.querySelector('.j-label')?.textContent || heading?.textContent || a.textContent || '').trim();
    gsap.timeline({ onComplete: () => { busy = false; } })
      .set(wipe, { display: 'block' })
      .fromTo('.cw-band', { xPercent: 120 }, { xPercent: 0, duration: 0.55, ease: 'power3.in' })
      .call(go)
      .to('.cw-band', { xPercent: -120, duration: 0.65, ease: 'power3.out', delay: 0.25 })
      .set(wipe, { display: 'none' });
  });
}

export function initMotion() {
  cloudTravel();
  fitText();
  document.fonts?.ready.then(() => {
    fitText();
    ScrollTrigger.refresh();
  });
  window.addEventListener('resize', fitText);
  reveals();
  parallax();
}
