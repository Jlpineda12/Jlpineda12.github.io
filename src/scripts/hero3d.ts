// The hero's toys: the intro, the name landing letter by letter, stickers you can throw, a glass
// lens over the name and José's own cursor showing what can be grabbed.
import { gsap } from 'gsap';
import { mountPuppet } from './puppet';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const hooked = new WeakSet<Element>();
function wobble(el: Element) {
  if (reduced) return;
  if (!hooked.has(el)) {
    hooked.add(el);
    el.addEventListener('animationend', (e) => {
      if ((e as AnimationEvent).animationName.includes('jelly')) el.classList.remove('is-wobble');
    });
  }
  el.classList.remove('is-wobble');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('is-wobble');
}

export function initHero3d() {
  const root = document.documentElement;
  const hero = document.querySelector<HTMLElement>('.hero');
  const stage = hero?.querySelector<HTMLElement>('.stage');
  const name = stage?.querySelector<HTMLElement>('.name');
  if (!hero || !stage || !name) return;

  const letters = [...name.querySelectorAll<HTMLElement>('.ch')];
  const face = name.querySelector<HTMLElement>('.face-in');
  const faceSvg = name.querySelector<SVGSVGElement>('.face-pp');
  const puppet = faceSvg ? mountPuppet(faceSvg, 'idle', { follow: true }) : null;
  const items = [...stage.querySelectorAll<HTMLElement>('.sticker-li')];

  letters.forEach((l) => l.addEventListener('pointerenter', () => wobble(l)));

  if (fine && !reduced) initLens(stage, name, letters);

  // The name lands: each letter drops, squashes on the line and springs back; José's face pops
  // into the O; the stickers bloom around it.
  const land = (tl: gsap.core.Timeline, at: number, quick = false) => {
    const drop = quick ? 0.4 : 0.55;
    const gap = quick ? 0.035 : 0.06;
    tl.from(letters, {
      yPercent: () => gsap.utils.random(-320, -220),
      rotation: () => gsap.utils.random(-28, 28),
      opacity: 0,
      duration: drop,
      ease: 'power3.in',
      stagger: gap,
    }, at);
    letters.forEach((l, i) => {
      tl.fromTo(l, { scaleX: 1.22, scaleY: 0.74 }, {
        scaleX: 1, scaleY: 1, duration: 0.9, ease: 'elastic.out(1, 0.38)', immediateRender: false,
      }, at + drop + i * gap);
    });
    if (face) {
      tl.from(face, { scale: 0, rotation: -35, duration: 0.8, ease: 'back.out(2.2)' }, at + drop + gap * 0.6);
      tl.call(() => puppet?.play('happy'), [], at + drop + 0.4);
      tl.call(() => puppet?.play('idle'), [], at + drop + 2.2);
    }
    tl.from(items, {
      scale: 0, rotation: () => gsap.utils.random(-70, 70), opacity: 0,
      duration: 1.1, ease: 'elastic.out(1, 0.5)', stagger: 0.08,
    }, at + drop + letters.length * gap * 0.5);
    tl.set(letters, { clearProps: 'transform,opacity' });
    tl.set(items, { clearProps: 'transform,opacity' });
    return tl;
  };

  // When the intro is over the page is free: no gate any more.
  const toGate = () => {
    root.classList.remove('intro');
    window.dispatchEvent(new Event('jlp-drop'));
  };

  // Another lap (from the end of the page): back at the top, the name lands again.
  addEventListener('jlp-loop', () => {
    if (!reduced) land(gsap.timeline(), 0.1, true);
  });

  stage.classList.add('is-ready');

  if (reduced || !root.classList.contains('intro')) {
    if (!reduced) land(gsap.timeline(), 0.15, true);
    toGate();
    return;
  }

  playIntro({ hero, letters, items, puppet, done: toGate });
}

// ---------- Intro (after Candid's title card) ----------
// 1. Paper, and a tiny wobbling mark at the bottom.
// 2. The letters fly out of the mark along arcs, growing, and set into the big name, inked black.
// 3. The cut: a flash, the paper turns to cobalt, the letters to cream, the stickers pop in.
// 4. The hero, as it stays, and the way in drops in: his ID, hanging under the name.
function playIntro(o: {
  hero: HTMLElement;
  letters: HTMLElement[];
  items: HTMLElement[];
  puppet: ReturnType<typeof mountPuppet> | null;
  done: () => void;
}) {
  const { hero, letters, items } = o;
  const intro = hero.querySelector<HTMLElement>('.intro');
  const mark = intro?.querySelector<HTMLElement>('.intro-mark');
  const face = hero.querySelector<HTMLElement>('.name .face-in');
  if (!intro || !mark) return o.done();

  const imgs = letters.filter((l): l is HTMLImageElement => l instanceof HTMLImageElement);
  const loaded = Promise.race([Promise.all(imgs.map((i) => i.decode().catch(() => {}))), wait(2600)]);

  let tl: gsap.core.Timeline | null = null;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    hero.classList.remove('is-paper');
    intro.style.display = 'none';
    o.done();
  };

  // A click skips to the end.
  const skip = () => {
    if (tl) tl.progress(1);
    else finish();
  };
  intro.addEventListener('click', skip);
  hero.addEventListener('click', () => {
    if (!finished && hero.classList.contains('is-paper')) skip();
  });

  Promise.all([loaded, wait(1300)]).then(() => {
    if (finished) return;
    const m = mark.getBoundingClientRect();
    const mx = m.left + m.width / 2, my = m.top + m.height / 2;
    const flyers = [...letters];
    tl = gsap.timeline({ onComplete: finish });

    // The paper behind the overlay is the hero itself, so the overlay can go without a seam.
    tl.call(() => {
      hero.classList.add('is-paper');
      const paper = intro.querySelector<HTMLElement>('.intro-paper');
      if (paper) paper.style.background = 'transparent';
    });
    tl.to(mark, { scale: 1.15, duration: 0.18, ease: 'power2.out' })
      .to(mark, { scale: 0.2, opacity: 0, duration: 0.25, ease: 'power2.in' });
    tl.set(items, { opacity: 0, scale: 0 }, 0);

    // Each letter leaves the mark and flies along an arc into its place.
    const start = 0.25;
    flyers.forEach((l, i) => {
      const r = l.getBoundingClientRect();
      const dx = mx - (r.left + r.width / 2);
      const dy = my - (r.top + r.height / 2);
      const lift = gsap.utils.random(140, 260);
      tl!.fromTo(l, { x: dx, y: dy, scale: 0.06, rotation: gsap.utils.random(-40, 40), opacity: 0 }, {
        keyframes: [
          { x: dx * 0.5, y: dy * 0.35 - lift, scale: 0.55, rotation: gsap.utils.random(-20, 20), opacity: 1, duration: 0.42, ease: 'power2.out' },
          { x: 0, y: 0, scale: 1, rotation: 0, duration: 0.5, ease: 'power3.in' },
        ],
      }, start + i * 0.06);
      // Lands with a squash.
      tl!.fromTo(l, { scaleX: 1.2, scaleY: 0.78 }, { scaleX: 1, scaleY: 1, duration: 0.7, ease: 'elastic.out(1, 0.4)', immediateRender: false }, start + i * 0.06 + 0.92);
    });
    const landed = start + flyers.length * 0.06 + 0.92;
    if (face) tl.call(() => o.puppet?.play('happy'), [], landed);

    // The cut.
    const cut = landed + 0.45;
    tl.call(() => {
      hero.classList.remove('is-paper');
      hero.classList.remove('is-cut');
      void hero.offsetWidth;
      hero.classList.add('is-cut');
      intro.style.display = 'none';
    }, [], cut);
    tl.to(items, { opacity: 1, scale: 1, duration: 0.9, ease: 'elastic.out(1, 0.55)', stagger: 0.07 }, cut + 0.05);
    tl.set([...letters, ...items], { clearProps: 'transform,opacity' }, cut + 1.1);
    tl.call(() => o.puppet?.play('idle'), [], cut + 1.6);
  });
}

// ---------- The lens: a drop of glass that magnifies the name and bursts on a click ----------
function initLens(stage: HTMLElement, name: HTMLElement, letters: HTMLElement[]) {
  const lens = stage.querySelector<HTMLElement>('.lens');
  const inner = lens?.querySelector<HTMLElement>('.lens-in');
  if (!lens || !inner) return;
  const clone = name.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  clone.setAttribute('aria-hidden', 'true');
  clone.querySelectorAll('[data-puppet]').forEach((n) => n.removeAttribute('data-puppet'));
  inner.appendChild(clone);

  // The face in the lens mirrors the live one (eyes, blinks, mouth).
  const SYNC = '.pp-rig, .pp-head, .pp-eyes, .pp-look, .pp-closed, .pp-lens use, .pp-mouth use, .pp-phones';
  const src = [...name.querySelectorAll<SVGElement>(SYNC)];
  const dst = [...clone.querySelectorAll<SVGElement>(SYNC)];
  const sync = () => {
    for (let i = 0; i < src.length; i++) {
      const a = src[i], b = dst[i];
      if (!b) break;
      for (const at of ['transform', 'display']) {
        const v = a.getAttribute(at);
        if (v !== b.getAttribute(at)) v === null ? b.removeAttribute(at) : b.setAttribute(at, v);
      }
      if (a.style.transform !== b.style.transform) b.style.transform = a.style.transform;
    }
  };

  const K = 1.5;
  let x = 0, y = 0, tx = 0, ty = 0, on = false, raf = 0, bursting = false;
  const R = () => lens.offsetWidth / 2;

  const frame = () => {
    x += (tx - x) * 0.2;
    y += (ty - y) * 0.2;
    lens.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    const s = stage.getBoundingClientRect();
    const n = name.getBoundingClientRect();
    const lx = x + s.left - n.left, ly = y + s.top - n.top;
    inner.style.width = `${name.offsetWidth}px`;
    inner.style.transform = `translate(${(R() - lx * K).toFixed(1)}px, ${(R() - ly * K).toFixed(1)}px) scale(${K})`;
    sync();
    if (on || Math.abs(tx - x) + Math.abs(ty - y) > 0.5) raf = requestAnimationFrame(frame);
    else raf = 0;
  };

  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || bursting) return;
    const n = name.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    const over = !(e.target as Element).closest('.sticker, a, button');
    const inside = over && e.clientX > n.left - 20 && e.clientX < n.right + 20 && e.clientY > n.top - 20 && e.clientY < n.bottom + 20;
    tx = e.clientX - s.left;
    ty = e.clientY - s.top;
    if (inside && !on) {
      x = tx;
      y = ty;
    }
    on = inside;
    lens.classList.toggle('is-on', on);
    if (!raf) raf = requestAnimationFrame(frame);
  });
  stage.addEventListener('pointerleave', () => {
    on = false;
    lens.classList.remove('is-on');
  });

  stage.addEventListener('click', (e) => {
    if (!on || bursting || (e.target as Element).closest('.sticker, a, button')) return;
    bursting = true;
    lens.classList.add('is-burst');
    // Droplets fly off and the letters under the lens wobble.
    for (let i = 0; i < 12; i++) {
      const d = document.createElement('span');
      d.className = 'lens-drop';
      const a = (i / 12) * Math.PI * 2 + Math.random() * 0.4;
      const dist = R() * (1.1 + Math.random() * 0.9);
      d.style.left = `${x}px`;
      d.style.top = `${y}px`;
      d.style.setProperty('--tx', `${(Math.cos(a) * dist).toFixed(0)}px`);
      d.style.setProperty('--ty', `${(Math.sin(a) * dist).toFixed(0)}px`);
      d.style.setProperty('--sz', `${(8 + Math.random() * 14).toFixed(0)}px`);
      d.addEventListener('animationend', () => d.remove());
      stage.appendChild(d);
    }
    const s = stage.getBoundingClientRect();
    letters.forEach((l) => {
      const b = l.getBoundingClientRect();
      if (Math.hypot(b.left + b.width / 2 - s.left - x, b.top + b.height / 2 - s.top - y) < R() * 1.8) wobble(l);
    });
    setTimeout(() => {
      lens.classList.remove('is-burst');
      bursting = false;
    }, 700);
  });
}
