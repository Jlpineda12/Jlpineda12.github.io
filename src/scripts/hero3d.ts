// The hero's toys: the intro, the name landing letter by letter, stickers you can throw, a glass
// lens over the name and José's own cursor showing what can be grabbed.
import { gsap } from 'gsap';
import { mountPuppet } from './puppet';
import { travelTo } from './motion';
import { initWater } from './water';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const gated = () => document.documentElement.classList.contains('gate');

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

/** On narrow screens the card hangs right under the name: size the strap to reach past it.
 *  Runs before the lanyard reads --strap, and again on resize (before the lanyard does). */
export function fitStrap() {
  const hero = document.querySelector<HTMLElement>('.hero');
  const role = hero?.querySelector<HTMLElement>('.role');
  if (!hero || !role) return;
  const fit = () => {
    // At the gate the card hangs in the middle (CSS); only inside does it hang under the name.
    if (gated() || !matchMedia('(max-width: 900px), (max-aspect-ratio: 1/1)').matches) {
      hero.style.removeProperty('--strap');
      return;
    }
    const top = hero.getBoundingClientRect().top;
    const below = role.getBoundingClientRect().bottom - top;
    // The card's top sits 50px under the end of the strap (the clip and its cord).
    hero.style.setProperty('--strap', `${Math.round(below + 34 - 50)}px`);
  };
  fit();
  addEventListener('resize', fit);
  // Registered before the lanyard's own listeners, so it reads the new length.
  addEventListener('jlp-enter', fit);
  addEventListener('jlp-loop', fit);
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
  const extras = [...stage.querySelectorAll<HTMLElement>('.hello, .role')];

  letters.forEach((l) => l.addEventListener('pointerenter', () => wobble(l)));

  const ghost = initGhost(stage, items);
  initStickers(hero, items, () => ghost.stop(), puppet);
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
    tl.from(extras, { y: 24, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.1 }, at + drop + letters.length * gap);
    tl.set(letters, { clearProps: 'transform,opacity' });
    tl.set(items, { clearProps: 'transform,opacity' });
    return tl;
  };

  const water = initWater(hero);

  // After the title: the name and the stickers float up and away like bubbles, and the screen is
  // left empty, underwater, but for the card.
  const away = (tl: gsap.core.Timeline, at: number) => {
    tl.to([...letters, ...items], {
      y: () => -gsap.utils.random(0.5, 0.9) * innerHeight,
      x: () => gsap.utils.random(-40, 40),
      rotation: () => gsap.utils.random(-25, 25),
      scale: 0.5,
      opacity: 0,
      duration: 1.1,
      ease: 'power2.in',
      stagger: { each: 0.035, from: 'random' },
    }, at);
    tl.to(extras, { opacity: 0, y: -20, duration: 0.4, ease: 'power2.in' }, at);
    tl.call(() => stage.classList.add('is-away'));
    tl.set([...letters, ...items, ...extras], { clearProps: 'transform,opacity' });
    return tl;
  };

  // The way in: the card drops into the water, then the reader appears.
  const toGate = () => {
    root.classList.remove('intro');
    window.dispatchEvent(new Event('jlp-drop'));
  };

  // Reading the card sends ripples through the water from the reader.
  const reader = hero.querySelector<HTMLElement>('[data-reader]');
  const readerBody = reader?.querySelector<HTMLElement>('.reader-body');
  if (reader && readerBody && water) {
    new MutationObserver(() => {
      const st = reader.dataset.state;
      const r = readerBody.getBoundingClientRect();
      if (st === 'scan' || st === 'ok') water.ripple(r.left + r.width / 2, r.top);
      if (st === 'ok') water.glow();
    }).observe(reader, { attributes: true, attributeFilter: ['data-state'] });
  }

  // Access granted: the water drains away like a wave, and the home page lands, dry.
  addEventListener('jlp-enter', () => {
    water?.drain();
    stage.classList.remove('is-away');
    if (reduced) return;
    land(gsap.timeline({ onComplete: () => ghost.start() }), 0.55, true);
  });

  // Another lap (from the end of the page): the water fills again and the card waits.
  addEventListener('jlp-loop', () => {
    water?.fill();
    ghost.stop();
    stage.classList.add('is-away');
  });

  stage.classList.add('is-ready');

  if (!gated()) {
    // Came in by a link to a chapter: no gate, no water, just the home page.
    root.classList.remove('intro');
    if (!reduced) land(gsap.timeline({ onComplete: () => ghost.start() }), 0.15, true);
    return;
  }

  if (reduced || !root.classList.contains('intro')) {
    stage.classList.add('is-away');
    toGate();
    return;
  }

  playIntro(hero, letters, (tl, at) => {
    land(tl, at);
    // Hold the title a moment, then let it go.
    away(tl, tl.duration() + 1.3);
    return tl;
  }, toGate, () => stage.classList.add('is-away'));
}

// ---------- Intro ----------
function playIntro(
  hero: HTMLElement,
  letters: HTMLElement[],
  land: (tl: gsap.core.Timeline, at: number) => gsap.core.Timeline,
  done: () => void,
  skipped: () => void,
) {
  const intro = hero.querySelector<HTMLElement>('.intro');
  const paper = intro?.querySelector<HTMLElement>('.intro-paper');
  const bar = intro?.querySelector<HTMLElement>('.intro-load i');
  const edge = intro?.querySelector<SVGPathElement>('.intro-edge path');
  if (!intro || !paper) {
    skipped();
    return done();
  }

  const imgs = letters.filter((l): l is HTMLImageElement => l instanceof HTMLImageElement);
  const loaded = Promise.race([Promise.all(imgs.map((i) => i.decode().catch(() => {}))), wait(2600)]);
  if (bar) gsap.fromTo(bar, { '--p': 0 }, { '--p': 1, duration: 1.3, ease: 'power2.inOut' });

  let tl: gsap.core.Timeline | null = null;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    done();
  };

  // A click anywhere skips to the end.
  intro.addEventListener('click', () => {
    if (tl) tl.progress(1);
    else {
      gsap.set(paper, { yPercent: -130 });
      intro.style.pointerEvents = 'none';
      skipped();
      finish();
    }
  });

  Promise.all([loaded, wait(1250)]).then(() => {
    if (finished) return;
    tl = gsap.timeline({ onComplete: finish });
    tl.to('.intro-mark', { scale: 0.7, opacity: 0, duration: 0.4, ease: 'back.in(2)' })
      .to('.intro-load', { opacity: 0, y: 10, duration: 0.25 }, '<')
      // The paper lifts; its wavy edge sloshes as it goes, like liquid rising behind it.
      .to(paper, { yPercent: -125, duration: 1.05, ease: 'power3.inOut' }, '-=0.05');
    if (edge) {
      tl.to(edge, { attr: { d: 'M0 0 H1440 V40 C1180 0 980 120 720 70 C460 20 260 120 0 80 Z' }, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: 1 }, '<');
    }
    tl.set(intro, { pointerEvents: 'none' }, '<+0.5');
    land(tl, tl.duration() - 0.55);
  });
}

// ---------- Stickers: grab, throw, bounce; a tap opens that world ----------
function initStickers(hero: HTMLElement, items: HTMLElement[], onGrab: () => void, puppet: ReturnType<typeof mountPuppet> | null) {
  items.forEach((li) => {
    const btn = li.querySelector<HTMLButtonElement>('.sticker')!;
    const group = btn.dataset.group!;
    let x = 0, y = 0, vx = 0, vy = 0, r = 0;
    let held = false, moved = 0, raf = 0, px = 0, py = 0, last = 0;

    const apply = () => {
      btn.style.setProperty('--dx', `${x.toFixed(1)}px`);
      btn.style.setProperty('--dy', `${y.toFixed(1)}px`);
      btn.style.setProperty('--dr', `${r.toFixed(2)}deg`);
    };
    // How far the sticker may travel from its resting place and stay on the hero.
    const limits = () => {
      const h = hero.getBoundingClientRect();
      const b = li.getBoundingClientRect();
      const m = b.width * 0.25;
      return { x0: h.left - b.left - m, x1: h.right - b.right + m, y0: h.top - b.top + 70, y1: h.bottom - b.bottom + m };
    };
    const step = () => {
      if (held) {
        r += (Math.max(-28, Math.min(28, vx * 1.6)) - r) * 0.2;
      } else {
        vx *= 0.93;
        vy *= 0.93;
        x += vx;
        y += vy;
        const l = limits();
        if (x < l.x0) { x = l.x0; vx = Math.abs(vx) * 0.6; }
        if (x > l.x1) { x = l.x1; vx = -Math.abs(vx) * 0.6; }
        if (y < l.y0) { y = l.y0; vy = Math.abs(vy) * 0.6; }
        if (y > l.y1) { y = l.y1; vy = -Math.abs(vy) * 0.6; }
        r += (vx * 0.8 - r) * 0.12;
      }
      apply();
      if (held || Math.abs(vx) + Math.abs(vy) > 0.08 || Math.abs(r) > 0.08) raf = requestAnimationFrame(step);
      else raf = 0;
    };
    const go = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };

    const open = () => {
      if (gated()) {
        // Still at the gate: the sticker hops, and José points at the card.
        wobble(btn.querySelector('img')!);
        gsap.fromTo(btn, { y: 0 }, { y: -26, duration: 0.22, ease: 'power2.out', yoyo: true, repeat: 1 });
        puppet?.play('think');
        return;
      }
      travelTo('#proyectos');
      setTimeout(() => document.querySelector<HTMLButtonElement>(`#proyectos .chip[data-group="${group}"]`)?.click(), 1300);
    };

    btn.addEventListener('pointerdown', (e) => {
      if (e.button) return;
      held = true;
      moved = 0;
      px = e.clientX;
      py = e.clientY;
      last = performance.now();
      vx = vy = 0;
      btn.setPointerCapture(e.pointerId);
      btn.classList.add('is-held');
      onGrab();
      go();
    });
    btn.addEventListener('pointermove', (e) => {
      if (!held) return;
      const dx = e.clientX - px, dy = e.clientY - py;
      px = e.clientX;
      py = e.clientY;
      x += dx;
      y += dy;
      moved += Math.abs(dx) + Math.abs(dy);
      const now = performance.now();
      const k = 16 / Math.max(8, now - last);
      last = now;
      const cap = (v: number) => Math.max(-42, Math.min(42, v));
      vx = cap(vx * 0.4 + dx * k * 0.6);
      vy = cap(vy * 0.4 + dy * k * 0.6);
    });
    const up = () => {
      if (!held) return;
      held = false;
      btn.classList.remove('is-held');
      if (performance.now() - last > 80) vx = vy = 0; // held still before letting go: no throw
      if (reduced) vx = vy = 0;
      if (moved < 6) open();
      go();
    };
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    // Keyboard: Enter or Space opens the world.
    btn.addEventListener('click', (e) => {
      if (e.detail === 0) open();
    });
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
    if (gated()) {
      on = false;
      lens.classList.remove('is-on');
      return;
    }
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

// ---------- José's cursor: it visits the stickers until you grab one ----------
function initGhost(stage: HTMLElement, items: HTMLElement[]) {
  const ghost = stage.querySelector<HTMLElement>('.ghost');
  const tag = ghost?.querySelector<HTMLElement>('.ghost-tag');
  const nameText = tag?.textContent || 'José';
  const drag = tag?.dataset.drag || nameText;
  let tl: gsap.core.Timeline | null = null;
  let stopped = false;

  const spot = (li: HTMLElement) => {
    const s = stage.getBoundingClientRect();
    const b = li.getBoundingClientRect();
    return { x: b.left - s.left + b.width * 0.55, y: b.top - s.top + b.height * 0.5 };
  };

  return {
    start() {
      if (!ghost || !tag || stopped || reduced || !items.length) return;
      const order = [0, 3, 1, 4, 2].filter((i) => items[i]);
      const first = spot(items[order[0]]);
      gsap.set(ghost, { x: first.x - 120, y: first.y + 160 });
      ghost.classList.add('is-on');
      tl = gsap.timeline({ repeat: 2, onComplete: () => ghost.classList.remove('is-on') });
      order.forEach((i, k) => {
        tl!.to(ghost, { x: () => spot(items[i]).x, y: () => spot(items[i]).y, duration: 1.1, ease: 'power2.inOut' }, k ? '+=0.5' : 0)
          .call(() => { tag.textContent = k % 2 ? nameText : drag; })
          .to(ghost, { scale: 0.86, duration: 0.12, yoyo: true, repeat: 1 })
          .call(() => wobble(items[i].querySelector('img')!));
      });
    },
    stop() {
      stopped = true;
      tl?.kill();
      ghost?.classList.remove('is-on');
    },
  };
}
