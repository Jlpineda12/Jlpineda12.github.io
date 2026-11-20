// The hero's toys: the intro, the name landing letter by letter, stickers you can throw, a glass
// lens over the name and José's own cursor showing what can be grabbed.
import { gsap } from 'gsap';
import { mountPuppet } from './puppet';
import { travelTo } from './motion';

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

  const ghost = initGhost(stage, items);
  initStickers(hero, items, () => ghost.stopTour(), puppet);
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

  const pass = hero.querySelector<HTMLElement>('[data-pass]');
  const reader = hero.querySelector<HTMLElement>('[data-reader]');
  const readerBody = reader?.querySelector<HTMLElement>('.reader-body');

  // The way in appears: the card pops onto the hero, the reader slides up, and José's cursor
  // shows the move (card → reader) until someone grabs it.
  const toGate = () => {
    root.classList.remove('intro');
    window.dispatchEvent(new Event('jlp-drop'));
    if (pass && readerBody) setTimeout(showWay, 1200);
  };
  // Only while nobody has touched the card yet and the reader is waiting.
  let touched = false;
  const showWay = () => {
    if (pass && readerBody && !touched && reader?.dataset.state === 'idle') ghost.demo(pass, readerBody);
  };
  pass?.addEventListener('pointerdown', () => {
    touched = true;
    ghost.stop();
  });

  // Reading the card: José thinks while the laser passes; on access the letters and stickers wobble
  // like jelly as the wave from the reader reaches them, one by one.
  if (reader && readerBody) {
    new MutationObserver(() => {
      const st = reader.dataset.state;
      if (st === 'scan') puppet?.play('think');
      if (st !== 'ok') return;
      const r = readerBody.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top;
      puppet?.play('celebrate');
      const wave = (el: Element | null, box: Element) => {
        if (!el) return;
        const b = box.getBoundingClientRect();
        setTimeout(() => wobble(el), Math.hypot(b.left + b.width / 2 - cx, b.top + b.height / 2 - cy) * 0.8);
      };
      letters.forEach((l) => wave(l, l));
      items.forEach((li) => wave(li.querySelector('img'), li));
    }).observe(reader, { attributes: true, attributeFilter: ['data-state'] });
  }

  // Access granted: the card is collected and the page glides straight on to the next chapter.
  addEventListener('jlp-enter', () => {
    ghost.stop();
    const next = document.getElementById('quien-soy');
    if (next && scrollY < innerHeight * 0.5) {
      setTimeout(() => {
        next.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', '#quien-soy');
      }, reduced ? 0 : 650);
    }
    setTimeout(() => {
      puppet?.play('idle');
      ghost.start();
    }, 2200);
  });

  // Another lap (from the end of the page): a fresh card waits on the hero again.
  addEventListener('jlp-loop', () => {
    ghost.stop();
    touched = false;
    setTimeout(showWay, 1500);
  });

  stage.classList.add('is-ready');

  if (!gated()) {
    // Came in by a link to a chapter: no gate, just the home page.
    root.classList.remove('intro');
    if (!reduced) land(gsap.timeline({ onComplete: () => ghost.start() }), 0.15, true);
    return;
  }

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
// 4. The hero, as it stays: and the way in pops on (the card and the reader).
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

// ---------- José's cursor ----------
// At the gate it shows the way in: it grabs the card and carries it to the reader. Inside, it
// visits the stickers until you grab one yourself.
function initGhost(stage: HTMLElement, items: HTMLElement[]) {
  const ghost = stage.querySelector<HTMLElement>('.ghost');
  const tag = ghost?.querySelector<HTMLElement>('.ghost-tag');
  const nameText = tag?.textContent || 'José';
  const drag = tag?.dataset.drag || nameText;
  const passHint = tag?.dataset.passHint || drag;
  let tl: gsap.core.Timeline | null = null;
  let tourOff = false;

  const at = (el: Element, fx = 0.55, fy = 0.5) => {
    const s = stage.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    return { x: b.left - s.left + b.width * fx, y: b.top - s.top + b.height * fy };
  };
  const kill = () => {
    tl?.kill();
    tl = null;
    ghost?.classList.remove('is-on');
  };

  return {
    start() {
      if (!ghost || !tag || tourOff || reduced || !items.length) return;
      kill();
      const order = [0, 3, 1, 4, 2].filter((i) => items[i]);
      const first = at(items[order[0]]);
      tag.textContent = nameText;
      gsap.set(ghost, { x: first.x - 120, y: first.y + 160, scale: 1 });
      ghost.classList.add('is-on');
      tl = gsap.timeline({ repeat: 1, onComplete: () => ghost.classList.remove('is-on') });
      order.forEach((i, k) => {
        tl!.to(ghost, { x: () => at(items[i]).x, y: () => at(items[i]).y, duration: 1.1, ease: 'power2.inOut' }, k ? '+=0.5' : 0)
          .call(() => { tag.textContent = k % 2 ? nameText : drag; })
          .to(ghost, { scale: 0.86, duration: 0.12, yoyo: true, repeat: 1 })
          .call(() => wobble(items[i].querySelector('img')!));
      });
    },
    /** Show the way in: from the card to the reader, a few times, until someone grabs the card. */
    demo(pass: HTMLElement, reader: HTMLElement) {
      if (!ghost || !tag || reduced || !gated()) return;
      kill();
      const from = at(pass, 0.5, 0.45);
      gsap.set(ghost, { x: from.x + 140, y: from.y - 90, scale: 1 });
      ghost.classList.add('is-on');
      tag.textContent = passHint;
      tl = gsap.timeline({ repeat: 3, repeatDelay: 1.6, onComplete: () => ghost.classList.remove('is-on') });
      tl.to(ghost, { x: () => at(pass, 0.5, 0.45).x, y: () => at(pass, 0.5, 0.45).y, duration: 0.9, ease: 'power2.inOut' })
        .to(ghost, { scale: 0.84, duration: 0.12 })
        .call(() => {
          pass.classList.remove('is-hint');
          void pass.offsetWidth;
          pass.classList.add('is-hint');
        })
        .to(ghost, { x: () => at(reader, 0.5, 0.2).x, y: () => at(reader, 0.5, 0.2).y, duration: 0.9, ease: 'power2.inOut' })
        .to(ghost, { scale: 1, duration: 0.15 })
        .to(ghost, { x: () => at(pass, 0.5, 0.45).x + 140, y: () => at(pass, 0.5, 0.45).y - 90, duration: 0.8, ease: 'power2.inOut', delay: 0.3 });
    },
    stop: kill,
    /** Someone grabbed a sticker: no more tours. */
    stopTour() {
      tourOff = true;
      kill();
    },
  };
}
