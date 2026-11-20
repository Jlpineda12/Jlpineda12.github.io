// "How I work" as a drop lab. Six phases; in each one the visitor does something to the drop, and
// that is the story: listen (pull the voices in), define (squeeze it clear), ideate (split, keep
// the best three), prototype (pour it into the mould), test (catch the bugs), launch (hold, let go).
// Every drop is an SVG circle on a spring; the goo filter (Process.astro) melts nearby circles into
// one glossy liquid shape.
import { mountPuppet, type Anim } from './puppet';

const NS = 'http://www.w3.org/2000/svg';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const C = { x: 300, y: 300 };

type Drop = {
  x: number; y: number; r: number; vx: number; vy: number;
  hx: number; hy: number; hr: number; // home position and size the spring pulls to
  kind: 'main' | 'voice' | 'lump' | 'idea' | 'part' | 'trail';
  fill: string;
  el: SVGCircleElement;
  held?: boolean; picked?: boolean; dead?: boolean; free?: boolean;
  ox?: number; oy?: number; a?: number;
};

type Bug = { x: number; y: number; a: number; v: number; el: SVGGElement; caught?: boolean };

// Where the liquid settles in the mould: a gamepad, in circles.
const PARTS: [number, number, number][] = [
  [186, 430, 52], [414, 430, 52], [250, 412, 46], [350, 412, 46], [300, 406, 46],
  [200, 474, 42], [400, 474, 42], [300, 446, 40], [152, 456, 34], [448, 456, 34],
];
const PERFORM: Anim[] = ['listen', 'think', 'idea', 'build', 'play', 'travel'];

export function initDropLab() {
  const lab = document.querySelector<HTMLElement>('[data-lab]');
  const svg = lab?.querySelector<SVGSVGElement>('.goo-svg');
  const goo = svg?.querySelector<SVGGElement>('.goo');
  const fx = svg?.querySelector<SVGGElement>('.fx');
  const tank = lab?.querySelector<HTMLElement>('.tank');
  if (!lab || !svg || !goo || !fx || !tank) return;

  const hints: string[] = JSON.parse(lab.dataset.hints || '[]');
  const doneLines: string[] = JSON.parse(lab.dataset.done || '[]');
  const colors: string[] = JSON.parse(lab.dataset.colors || '[]');
  const hint = lab.querySelector<HTMLElement>('.tank-hint')!;
  const meter = lab.querySelector<HTMLElement>('.meter')!;
  const mold = svg.querySelector<SVGPathElement>('.mold')!;
  const tabs = [...lab.querySelectorAll<HTMLButtonElement>('[data-go]')];
  const steps = [...lab.querySelectorAll<HTMLElement>('.story-step')];
  const next = lab.querySelector<HTMLButtonElement>('.btn-next')!;
  const outro = lab.querySelector<HTMLAnchorElement>('.outro-btn')!;
  const again = lab.querySelector<HTMLButtonElement>('.again')!;
  const ppSvg = lab.querySelector<SVGSVGElement>('.story-pp svg.pp');
  const puppet = ppSvg ? mountPuppet(ppSvg, 'listen') : null;

  let phase = 0;
  let drops: Drop[] = [];
  let bugs: Bug[] = [];
  let done = false;
  let count = 0; // what the phase has counted so far (voices heard, ideas picked, bugs caught)
  let hold = 0; // 0..1 while pressing (define, launch)
  let holding = false;
  let split = false;
  let poured = false;
  let launched = false;
  let drag: { d: Drop; dx: number; dy: number; moved: number } | null = null;
  let timers: number[] = [];
  let raf = 0;
  let visible = false;
  let last = performance.now();
  const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));

  // ---------- Drops ----------
  const add = (o: Partial<Drop> & { x: number; y: number; r: number; kind: Drop['kind'] }) => {
    const el = document.createElementNS(NS, 'circle');
    const d: Drop = {
      vx: 0, vy: 0, hx: o.x, hy: o.y, hr: o.r, fill: colors[phase], el, ...o,
    } as Drop;
    el.setAttribute('fill', d.fill);
    goo.appendChild(el);
    drops.push(d);
    return d;
  };
  const kill = (d: Drop) => {
    d.dead = true;
    d.el.remove();
  };
  const main = () => drops.find((d) => d.kind === 'main' && !d.dead);
  const clearAll = () => {
    drops.forEach((d) => d.el.remove());
    drops = [];
    bugs.forEach((b) => b.el.remove());
    bugs = [];
    goo.removeAttribute('transform');
  };

  // ---------- Phase set-ups ----------
  const setups: (() => void)[] = [
    // 0 · Empathise: voices drift around the big drop.
    () => {
      add({ kind: 'main', x: C.x, y: C.y + 20, r: 70 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.4;
        add({ kind: 'voice', x: C.x + Math.cos(a) * 215, y: C.y + 20 + Math.sin(a) * 190, r: 22, a });
      }
    },
    // 1 · Define: the drop is lumpy; holding squeezes the lumps in.
    () => {
      add({ kind: 'main', x: C.x, y: C.y, r: 84 });
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + Math.random() * 0.5;
        const k = 74 + Math.random() * 34;
        add({ kind: 'lump', x: C.x + Math.cos(a) * k, y: C.y + Math.sin(a) * k, r: 30 + Math.random() * 16, ox: Math.cos(a) * k, oy: Math.sin(a) * k });
      }
    },
    // 2 · Ideate: one drop, waiting to be tapped.
    () => {
      add({ kind: 'main', x: C.x, y: C.y + 10, r: 96 });
    },
    // 3 · Prototype: the drop floats above the mould.
    () => {
      add({ kind: 'main', x: C.x, y: 210, r: 88 });
    },
    // 4 · Test: the gamepad stands in the mould with bugs crawling over it.
    () => {
      // Still the prototype's red; it turns green when the last bug is caught.
      PARTS.forEach(([x, y, r]) => add({ kind: 'part', x, y, r, fill: colors[3] }));
      for (let i = 0; i < 3; i++) spawnBug(i);
    },
    // 5 · Launch: one drop on the floor.
    () => {
      add({ kind: 'main', x: C.x, y: 420, r: 80 });
    },
  ];

  function spawnBug(i: number) {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'bug');
    g.innerHTML =
      '<path d="M-9 -4 L-15 -9 M-9 0 L-16 0 M-9 4 L-15 9 M9 -4 L15 -9 M9 0 L16 0 M9 4 L15 9" stroke="#2a2a2e" stroke-width="2.5" stroke-linecap="round"/>' +
      '<ellipse rx="10" ry="12" fill="#2a2a2e"/><circle cx="-4" cy="-6" r="3" fill="#fff"/><circle cx="4" cy="-6" r="3" fill="#fff"/>' +
      '<circle cx="-4" cy="-6" r="1.4" fill="#2a2a2e"/><circle cx="4" cy="-6" r="1.4" fill="#2a2a2e"/>';
    fx.appendChild(g);
    const [x, y] = PARTS[[0, 1, 4][i]];
    bugs.push({ x, y, a: Math.random() * Math.PI * 2, v: 1.6 + Math.random(), el: g });
  }

  // ---------- Phase flow ----------
  const say = (t: string, ok = false) => {
    hint.textContent = t;
    hint.classList.toggle('is-done', ok);
  };

  const go = (i: number) => {
    timers.forEach(clearTimeout);
    timers = [];
    phase = Math.max(0, Math.min(5, i));
    done = false;
    count = 0;
    hold = 0;
    holding = false;
    split = false;
    poured = false;
    launched = false;
    drag = null;
    clearAll();
    tank.dataset.phase = String(phase);
    tank.classList.remove('is-done');
    mold.classList.remove('is-hot');
    meter.style.setProperty('--p', '0');
    svg.style.touchAction = phase === 0 || phase === 3 ? 'none' : 'manipulation';
    tabs.forEach((t, k) => t.classList.toggle('is-on', k === phase));
    steps.forEach((s, k) => s.classList.toggle('is-on', k === phase));
    next.hidden = phase === 5;
    next.classList.remove('is-ready');
    outro.hidden = true;
    again.hidden = true;
    say(hints[phase]);
    puppet?.play(PERFORM[phase]);
    setups[phase]();
    kick();
  };

  const complete = () => {
    if (done) return;
    done = true;
    tank.classList.add('is-done');
    tabs[phase].classList.add('is-done');
    say(doneLines[phase], true);
    puppet?.play('celebrate');
    if (phase < 5) {
      next.classList.add('is-ready');
      later(() => puppet?.play(PERFORM[phase]), 1600);
    } else {
      outro.hidden = false;
      again.hidden = false;
    }
  };

  // ---------- Pointer ----------
  const pt = (e: PointerEvent) => {
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  const hit = (p: { x: number; y: number }, kinds: Drop['kind'][], pad = 14) =>
    drops
      .filter((d) => !d.dead && kinds.includes(d.kind))
      .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - a.r - (Math.hypot(b.x - p.x, b.y - p.y) - b.r))
      .find((d) => Math.hypot(d.x - p.x, d.y - p.y) < d.r + pad);
  const inMold = (p: { x: number; y: number }) => p.x > 100 && p.x < 500 && p.y > 350 && p.y < 525;

  const absorb = (v: Drop) => {
    if (v.dead || v.free) return;
    v.free = true;
    const m = main();
    if (!m) return;
    v.hx = m.x;
    v.hy = m.y;
    v.hr = 6;
    later(() => {
      kill(v);
      m.hr += 9;
      count++;
      if (count >= 3 && !done) {
        complete();
        // The rest of the voices follow on their own.
        drops.filter((d) => d.kind === 'voice' && !d.free).forEach((d, k) => later(() => absorb(d), 200 + k * 160));
      }
    }, 420);
  };

  const doSplit = () => {
    const m = main();
    if (!m || split) return;
    split = true;
    kill(m);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const k = i % 2 ? 175 : 120;
      const d = add({ kind: 'idea', x: m.x, y: m.y, r: 30 });
      d.hx = C.x + Math.cos(a) * k;
      d.hy = C.y + 20 + Math.sin(a) * k;
      d.vx = Math.cos(a) * 18;
      d.vy = Math.sin(a) * 18;
    }
    say(hints[2].split('. ').slice(-1)[0] || hints[2]);
  };

  const pick = (d: Drop) => {
    if (d.picked || done) return;
    d.picked = true;
    d.hr = 38;
    d.el.setAttribute('fill', '#ff9f1c');
    count++;
    if (count >= 3) {
      // The other ideas evaporate; the best three flow together.
      drops.filter((x) => x.kind === 'idea' && !x.picked).forEach((x) => { x.hr = 0; later(() => kill(x), 700); });
      drops.filter((x) => x.picked).forEach((x) => later(() => { x.hx = C.x; x.hy = C.y + 10; x.hr = 64; }, 500));
      later(complete, 1100);
    }
  };

  const pour = () => {
    const m = main();
    if (!m || poured) return;
    poured = true;
    mold.classList.add('is-hot');
    const sx = m.x, sy = m.y;
    kill(m);
    PARTS.forEach(([x, y, r], k) => {
      const d = add({ kind: 'part', x: sx + (Math.random() - 0.5) * 30, y: sy + (Math.random() - 0.5) * 30, r: r * 0.7 });
      d.hx = sx;
      d.hy = sy;
      later(() => { d.hx = x; d.hy = y; d.hr = r; }, 60 + k * 70);
    });
    later(complete, 1300);
  };

  svg.addEventListener('pointerdown', (e) => {
    if (e.button) return;
    const p = pt(e);
    svg.setPointerCapture(e.pointerId);
    if (phase === 0) {
      const v = hit(p, ['voice']);
      if (v && !v.free) {
        drag = { d: v, dx: v.x - p.x, dy: v.y - p.y, moved: 0 };
        v.held = true;
        svg.classList.add('is-dragging');
      }
    } else if (phase === 1 || phase === 5) {
      if (!done && !launched) holding = true;
    } else if (phase === 2) {
      if (!split) {
        if (hit(p, ['main'], 30)) doSplit();
      } else {
        const d = hit(p, ['idea']);
        if (d) pick(d);
      }
    } else if (phase === 3) {
      const m = hit(p, ['main'], 20);
      if (m && !poured) {
        drag = { d: m, dx: m.x - p.x, dy: m.y - p.y, moved: 0 };
        m.held = true;
        svg.classList.add('is-dragging');
      } else if (inMold(p)) pour();
    } else if (phase === 4) {
      const b = bugs.find((x) => !x.caught && Math.hypot(x.x - p.x, x.y - p.y) < 30);
      if (b) {
        b.caught = true;
        b.el.classList.add('is-caught');
        setTimeout(() => b.el.remove(), 450);
        count++;
        drops.forEach((d) => { d.vy -= 3; });
        if (count >= bugs.length) {
          drops.forEach((d) => d.el.setAttribute('fill', colors[4]));
          later(complete, 300);
        }
      }
    }
    kick();
  });

  svg.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = pt(e);
    const nx = p.x + drag.dx, ny = p.y + drag.dy;
    drag.moved += Math.abs(nx - drag.d.x) + Math.abs(ny - drag.d.y);
    drag.d.vx = nx - drag.d.x;
    drag.d.vy = ny - drag.d.y;
    drag.d.x = drag.d.hx = nx;
    drag.d.y = drag.d.hy = ny;
    if (phase === 3) mold.classList.toggle('is-hot', inMold(p));
    kick();
  });

  const release = () => {
    if (drag) {
      const d = drag.d;
      d.held = false;
      svg.classList.remove('is-dragging');
      if (phase === 0) {
        const m = main();
        // Close enough to the big drop, or just tapped: it is heard.
        if (drag.moved < 8 || (m && Math.hypot(d.x - m.x, d.y - m.y) < m.r + 70)) absorb(d);
        else { d.hx = d.x; d.hy = d.y; }
      } else if (phase === 3) {
        if (drag.moved < 8 || inMold({ x: d.x, y: d.y })) pour();
        else { d.hx = C.x; d.hy = 210; mold.classList.remove('is-hot'); }
      }
      drag = null;
    }
    if (holding) {
      holding = false;
      if (phase === 5 && hold >= 0.55 && !launched) launch();
    }
    kick();
  };
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);

  const launch = () => {
    const m = main();
    if (!m) return;
    launched = true;
    m.free = true;
    m.vy = -26 - hold * 10;
    hold = 0;
    meter.style.setProperty('--p', '0');
    puppet?.play('travel');
    // A trail of droplets falls off the rocket drop.
    for (let k = 0; k < 10; k++) {
      later(() => {
        if (m.dead) return;
        const t = add({ kind: 'trail', x: m.x + (Math.random() - 0.5) * 30, y: m.y + m.r * 0.6, r: 10 + Math.random() * 10 });
        t.free = true;
        t.vx = (Math.random() - 0.5) * 3;
        t.vy = 2 + Math.random() * 2;
        later(() => { t.hr = 0; }, 400);
        later(() => kill(t), 1200);
      }, k * 60);
    }
    later(complete, 900);
  };

  // ---------- Simulation ----------
  const step = (now: number) => {
    raf = 0;
    const dt = Math.min(2, (now - last) / 16.7);
    last = now;
    const t = now / 1000;
    let moving = false;

    // Holding: define squeezes the lumps in, launch charges and squashes the drop.
    if (phase === 1 && !done) {
      hold = holding ? Math.min(1, hold + 0.012 * dt) : Math.max(0, hold - 0.02 * dt);
      meter.style.setProperty('--p', hold.toFixed(3));
      if (hold >= 1) {
        drops.filter((d) => d.kind === 'lump').forEach((d) => { d.hr = 0; later(() => kill(d), 500); });
        const m = main();
        if (m) m.hr = 118;
        complete();
      }
      moving = true;
    }
    if (phase === 5 && !launched) {
      hold = holding ? Math.min(1, hold + 0.016 * dt) : Math.max(0, hold - 0.05 * dt);
      meter.style.setProperty('--p', hold.toFixed(3));
      const sx = 1 + hold * 0.28, sy = 1 - hold * 0.32;
      goo.setAttribute('transform', `translate(300 500) scale(${sx.toFixed(3)} ${sy.toFixed(3)}) translate(-300 -500)`);
      if (holding || hold > 0) moving = true;
    } else if (phase === 5) {
      goo.setAttribute('transform', 'translate(300 500) scale(0.9 1.15) translate(-300 -500)');
    }

    for (const d of drops) {
      if (d.dead) continue;
      if (d.kind === 'voice' && !d.held && !d.free) {
        // Voices drift in slow orbits.
        d.a = (d.a || 0) + 0.004 * dt;
        d.hx = C.x + Math.cos(d.a) * 215;
        d.hy = C.y + 20 + Math.sin(d.a) * 190;
      }
      if (d.kind === 'lump' && !done) {
        const k = 1 - hold * 0.92;
        const wob = reduced ? 0 : Math.sin(t * 2 + (d.ox || 0)) * 6;
        d.hx = C.x + (d.ox || 0) * k + wob;
        d.hy = C.y + (d.oy || 0) * k - wob;
      }
      if (d.kind === 'part' && phase === 4 && !done && !reduced) {
        d.hy += Math.sin(t * 6 + d.hx) * 0.15;
      }
      if (d.kind === 'idea' && d.picked && !done && !reduced) {
        d.r = d.hr + Math.sin(t * 6) * 2;
      }
      if (d.free && d.kind === 'main' && launched) {
        d.vy -= 0.6 * dt;
        d.y += d.vy * dt;
        if (d.y < -200) kill(d);
        moving = true;
      } else if (d.free && d.kind === 'trail') {
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.vy += 0.4 * dt;
        d.r += (d.hr - d.r) * 0.1;
        moving = true;
      } else if (!d.held) {
        // A soft spring to home, with damping: jelly, not rubber.
        const k = 0.08, damp = 0.78;
        d.vx = (d.vx + (d.hx - d.x) * k * dt) * Math.pow(damp, dt);
        d.vy = (d.vy + (d.hy - d.y) * k * dt) * Math.pow(damp, dt);
        d.x += d.vx * dt;
        d.y += d.vy * dt;
      }
      d.r += (d.hr - d.r) * 0.14 * dt;
      if (Math.abs(d.vx) + Math.abs(d.vy) > 0.05 || Math.abs(d.hr - d.r) > 0.2) moving = true;
      d.el.setAttribute('cx', d.x.toFixed(1));
      d.el.setAttribute('cy', d.y.toFixed(1));
      d.el.setAttribute('r', Math.max(0, d.r).toFixed(1));
    }
    drops = drops.filter((d) => !d.dead);

    // Bugs wander over the gamepad and turn back at its edges.
    for (const b of bugs) {
      if (b.caught) continue;
      b.a += (Math.random() - 0.5) * 0.4 * dt;
      b.x += Math.cos(b.a) * b.v * dt;
      b.y += Math.sin(b.a) * b.v * dt;
      if (b.x < 150 || b.x > 450 || b.y < 395 || b.y > 480) {
        b.a = Math.atan2(440 - b.y, 300 - b.x) + (Math.random() - 0.5);
        b.x = Math.max(150, Math.min(450, b.x));
        b.y = Math.max(395, Math.min(480, b.y));
      }
      b.el.setAttribute('transform', `translate(${b.x.toFixed(1)} ${b.y.toFixed(1)}) rotate(${((b.a * 180) / Math.PI + 90).toFixed(1)})`);
      moving = true;
    }

    // Idle life: the voices and the waiting drops keep breathing.
    if (!done && (phase === 0 || phase === 2 || phase === 3)) moving = true;

    if (moving && visible) raf = requestAnimationFrame(step);
  };
  const kick = () => {
    if (!raf && visible) {
      last = performance.now();
      raf = requestAnimationFrame(step);
    }
  };

  new IntersectionObserver((e) => {
    visible = e[0].isIntersecting;
    if (visible) kick();
  }).observe(tank);

  // ---------- Controls ----------
  tabs.forEach((b) => b.addEventListener('click', () => go(Number(b.dataset.go))));
  next.addEventListener('click', () => go(phase + 1));
  again.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('is-done'));
    go(0);
  });

  go(0);
}
