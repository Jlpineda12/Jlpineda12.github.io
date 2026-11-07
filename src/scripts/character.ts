// The hero character: José's vector puppet replays his original animation (bored → headphones
// drop → controller → laugh), then follows the cursor with his eyes. Click, tap or press a key
// and he does it again.
import { mountPuppet } from './puppet';

const TOUCH = matchMedia('(pointer: coarse)').matches;

export function initCharacter() {
  const button = document.querySelector<HTMLButtonElement>('.character');
  const svg = button?.querySelector<SVGSVGElement>('svg.pp');
  const bubble = document.querySelector<HTMLElement>('.bubble');
  if (!button || !svg || !bubble) return;

  // The same greeting on every device; each tap or click says the next line.
  const LINES: string[] = JSON.parse(bubble.dataset.lines || '["¡Hola!"]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const p = mountPuppet(svg, 'happy', { follow: true });
  let line = 0;
  let busy = false;

  const say = (text: string) => {
    bubble.classList.remove('is-on');
    setTimeout(() => {
      bubble.firstElementChild!.textContent = text;
      bubble.classList.add('is-on');
    }, 120);
  };

  const replay = async () => {
    if (busy) return;
    busy = true;
    line = (line + 1) % LINES.length;
    bubble.classList.remove('is-on');
    await p.replay();
    say(LINES[line]);
    busy = false;
  };

  // First appearance: let the name rise, then the original intro.
  setTimeout(async () => {
    busy = true;
    await p.intro();
    busy = false;
    say(LINES[0]);
  }, reduced ? 0 : 650);

  button.addEventListener('click', replay);

  // Any letter, number or Enter replays him while the hero is on screen, like "press any key".
  let heroVisible = true;
  new IntersectionObserver((e) => (heroVisible = e[0].isIntersecting), { threshold: 0.4 }).observe(button);
  window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (!heroVisible || e.metaKey || e.ctrlKey || e.altKey || t.closest('input, textarea, select, [contenteditable]')) return;
    if (t === button && (e.key === 'Enter' || e.key === ' ')) return;
    if (/^[a-z0-9ñ]$/i.test(e.key) || e.key === 'Enter') replay();
  });

  // He leans toward the pointer.
  if (!reduced && !TOUCH) {
    let raf = 0;
    window.addEventListener('pointermove', (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = button.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
        const dy = (e.clientY - (r.top + r.height * 0.4)) / window.innerHeight;
        button.style.transform = `rotate(${(dx * 4).toFixed(2)}deg) translate(${(dx * 12).toFixed(1)}px, ${(dy * 6).toFixed(1)}px)`;
      });
    });
  }
}
