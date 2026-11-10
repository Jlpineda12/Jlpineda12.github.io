// The loop: "another lap" rewinds the whole page to the start like a VHS tape (fast scroll with
// tracking lines and a ◀◀ label), adds a lap, and the Creative ID drops in again with the new number.
import { nextLoop } from './loop';

export function initRewind() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const label = document.body.dataset.rewindLabel || 'REWIND';
  const tape = document.createElement('div');
  tape.className = 'rewind';
  tape.setAttribute('aria-hidden', 'true');
  tape.innerHTML = `<span class="rw-label">◀◀ ${label}</span><span class="rw-band"></span><span class="rw-band b2"></span>`;
  document.body.appendChild(tape);

  document.addEventListener(
    'click',
    (e) => {
      const a = (e.target as HTMLElement).closest<HTMLElement>('[data-rewind]');
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();
      const lap = nextLoop();
      const done = () => {
        document.documentElement.classList.remove('is-rewinding');
        window.dispatchEvent(new CustomEvent('jlp-loop', { detail: lap }));
        document.querySelector<HTMLElement>('#inicio')?.focus({ preventScroll: true });
      };
      if (reduced) {
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        return done();
      }
      document.documentElement.classList.add('is-rewinding');
      const from = window.scrollY;
      const t0 = performance.now();
      const dur = Math.min(2200, 700 + from / 8);
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / dur);
        const k = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        window.scrollTo({ top: from * (1 - k), behavior: 'instant' as ScrollBehavior });
        if (t < 1) requestAnimationFrame(tick);
        else setTimeout(done, 120);
      };
      requestAnimationFrame(tick);
    },
    true,
  );
}
