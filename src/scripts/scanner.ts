// The gate: a glass card reader and José's Creative ID. Carry the card onto it (or tap
// the card or the reader) and it docks, a laser reads it, the reader beeps, the card is stamped
// with your lap, and the gate opens: the name, the menu and the way in appear and the page scrolls.
// On every load of the home page (Base.astro); a new lap ("another lap" at the end) closes the gate again.
// "Enter without scanning" and the skip link open it straight away.
import type { Lanyard, Point } from './pass';
import { getLoop } from './loop';

type State = 'idle' | 'near' | 'scan' | 'ok';

let audio: AudioContext | null = null;
function tone(freq: number, at: number, dur: number, vol = 0.05, type: OscillatorType = 'square') {
  try {
    audio ??= new AudioContext();
    const t = audio.currentTime + at;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {}
}

// Phones feel the reader too: a tick when the card is close, a buzz for each pass, a double tap
// when access is granted.
const buzz = (p: number | number[]) => {
  try {
    navigator.vibrate?.(p);
  } catch {}
};

export function initScanner(lanyard: Lanyard | null) {
  const root = document.documentElement;
  const reader = document.querySelector<HTMLElement>('[data-reader]');
  const pad = reader?.querySelector<HTMLButtonElement>('.reader-pad');
  const body = reader?.querySelector<HTMLElement>('.reader-body');
  const text = reader?.querySelector<HTMLElement>('.reader-text');
  const sub = reader?.querySelector<HTMLElement>('.reader-sub');
  const card = document.querySelector<HTMLElement>('.badge-card');
  const tape = document.querySelector<HTMLElement>('.badge .bubble');
  const stamp = card?.querySelector<HTMLElement>('.pass-stamp small');
  const skip = document.querySelector<HTMLButtonElement>('.gate-skip');
  if (!reader || !pad || !body || !text || !sub || !card) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(hover: none)').matches;
  const msg = JSON.parse(reader.dataset.msg || '{}') as Record<string, string>;
  const lines: string[] = JSON.parse(tape?.dataset.lines || '[]');
  const lap = () => String(getLoop()).padStart(2, '0');
  const gated = () => root.classList.contains('gate');
  let state: State = 'idle';
  let line = 0;
  let timers: number[] = [];
  const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
  const clear = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  const say = (t: string) => {
    if (!tape) return;
    tape.classList.remove('is-on');
    setTimeout(() => {
      tape.firstElementChild!.textContent = t;
      tape.classList.add('is-on');
    }, 160);
  };

  const set = (s: State) => {
    state = s;
    reader.dataset.state = s;
    card.classList.toggle('is-scanning', s === 'scan');
    const idle = touch ? msg.idleTouch : msg.idle;
    text.textContent = { idle, near: msg.near, scan: msg.scan, ok: msg.ok }[s];
    sub.textContent = s === 'ok' ? msg.welcome.replace('{name}', lap()) : s === 'idle' ? (touch ? msg.subTouch : msg.sub) : '';
  };

  const stampCard = () => {
    card.classList.add('is-stamped');
    if (stamp) stamp.textContent = `${msg.lap} ${lap()}`;
  };

  // Open the gate: the menu, the name and the way in come in; the page can scroll again.
  const enter = (focus = false) => {
    if (!gated()) return;
    root.classList.remove('gate');
    try {
      sessionStorage.setItem('jlp-in', '1');
    } catch {}
    const mg = document.querySelector<HTMLVideoElement>('.title-mg');
    if (mg && !reduced) {
      mg.currentTime = 0;
      mg.play().catch(() => {});
    }
    window.dispatchEvent(new CustomEvent('jlp-enter'));
    if (focus) document.querySelector<HTMLElement>('.hero-actions a')?.focus({ preventScroll: true });
  };

  // The card docks over the slot: while it is read it sinks in (depth: how much of it is inside);
  // once read it pops back up, stamped, its bottom edge just above the slot.
  const slot = parseFloat(body.dataset.slot || '0.15');
  const pass = card.closest<HTMLElement>('.pass');
  let depth = 0.42;
  const dockPoint = (): Point => {
    const r = body.getBoundingClientRect();
    const h = card.offsetHeight;
    return { x: r.left + r.width / 2, y: r.top + r.height * slot + h * depth - h / 2 };
  };

  const isNear = (p: Point) => {
    const r = body.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    const m = 40;
    return c.right > r.left - m && c.left < r.right + m && c.bottom > r.top - m * 1.5 && p.y < r.bottom + m;
  };

  const scan = () => {
    if (state === 'scan' || !gated()) return;
    const fromKeys = document.activeElement === pad;
    clear();
    set('scan');
    depth = 0.42;
    pass?.classList.add('is-inserted');
    lanyard?.dock(dockPoint);
    say(msg.reading);
    const settle = reduced ? 0 : 650;
    // Two passes of the laser, a blip each, then the chime and the stamp.
    later(() => {
      card.classList.add('beam-on');
      tone(1400, 0, 0.06, 0.03);
      tone(1400, 0.55, 0.06, 0.03);
      buzz([10, 540, 10]);
    }, settle);
    later(() => {
      card.classList.remove('beam-on');
      // Read: the reader pushes the card back out of the slot, and it is stamped.
      depth = -0.06;
      pass?.classList.remove('is-inserted');
      stampCard();
      set('ok');
      buzz([30, 60, 50]);
      tone(988, 0, 0.12, 0.05, 'triangle');
      tone(1319, 0.11, 0.26, 0.05, 'triangle');
      say(msg.welcomeTape);
    }, settle + (reduced ? 0 : 1150));
    // Let the card go; the reel winds it back up as the gate opens.
    later(() => {
      lanyard?.undock();
      enter(fromKeys);
    }, settle + (reduced ? 0 : 1900));
  };

  pad.addEventListener('click', scan);
  skip?.addEventListener('click', () => enter(true));
  // The skip link to the content opens the gate first.
  document.querySelector('.skip')?.addEventListener('click', () => enter());

  // Once inside, tapping the card makes José say something else.
  lanyard?.onTap(() => {
    if (gated()) return scan();
    line = (line + 1) % lines.length;
    say(lines[line]);
  });
  lanyard?.onDrag((p) => {
    if (state === 'scan' || !gated()) return;
    const near = isNear(p);
    if (near && state !== 'near') {
      set('near');
      buzz(12);
    } else if (!near && state === 'near') set('idle');
  });
  lanyard?.onRelease((p) => {
    if (state !== 'scan' && gated() && isNear(p)) scan();
  });

  const waitAtGate = () => {
    set('idle');
    // A hint on the tape after the greeting, if nobody has scanned yet.
    later(() => {
      if (state === 'idle' && gated()) say(touch ? msg.hintTap : msg.hintDrag);
    }, 4200);
  };

  if (gated()) waitAtGate();
  else {
    // Already inside this visit: the card keeps its stamp.
    stampCard();
    set('ok');
  }

  // Another lap: a fresh card, no stamp, and the gate closes again.
  window.addEventListener('jlp-loop', () => {
    clear();
    card.classList.remove('is-stamped', 'beam-on');
    try {
      sessionStorage.removeItem('jlp-in');
    } catch {}
    root.classList.add('gate');
    waitAtGate();
  });
}
