// José as a vector puppet (his own PSD layers, drawn by Puppet.astro). Each animation is a GSAP
// timeline over the real parts: lids (lens frames), pupils, the 14 mouths, headphones and hands.
import { gsap } from 'gsap';
import { POSES, type Pose, type PoseDef } from './poses';

export type Anim = 'idle' | 'happy' | 'sleep' | 'travel' | 'listen' | 'think' | 'idea' | 'build' | 'celebrate';
export type Puppet = {
  play: (a: Anim) => void;
  current: () => Anim;
  intro: () => Promise<void>;
  replay: () => Promise<void>;
};

const HEAD = '838 1525';
const FEET = '840 1779';
const HANDS = '834 1763';
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const FACE: Record<Anim, Pose> = {
  idle: 'calm', happy: 'happy', sleep: 'sleep', travel: 'travel', listen: 'listen',
  think: 'think', idea: 'think', build: 'build', celebrate: 'celebrate',
};

export function mountPuppet(svg: SVGSVGElement, start: Anim = 'idle', opts: { follow?: boolean } = {}): Puppet {
  const $ = <T extends Element>(s: string) => svg.querySelector(s) as T;
  const rig = $<SVGGElement>('.pp-rig');
  const body = $<SVGGElement>('.pp-body');
  const head = $<SVGGElement>('.pp-head');
  const eyes = $<SVGGElement>('.pp-eyes');
  const lens = $<SVGGElement>('.pp-lens');
  const pupils = $<SVGGElement>('.pp-look');
  const pupilClip = $<SVGGElement>('.pp-pupils');
  const mouth = $<SVGGElement>('.pp-mouth');
  const closedEyes = $<SVGGElement>('.pp-closed');
  const phones = $<SVGGElement>('.pp-phones');
  const hands = $<SVGGElement>('.pp-hands');
  const parts = [rig, body, head, eyes, pupils, phones, hands];

  let state: Anim = start;
  let tl: gsap.core.Timeline | null = null;
  let blinkTimer = 0;
  let eyesClosed = false;
  let lensNow = 0;
  let visible = false;
  let following = false;

  const frame = (g: Element, i: number) => {
    g.querySelectorAll('[data-f]').forEach((u) => u.setAttribute('display', Number((u as SVGElement).dataset.f) === i ? 'inline' : 'none'));
    // The pupil hides behind whichever eyelid position is showing.
    if (g === lens) {
      lensNow = i;
      pupilClip.setAttribute('clip-path', `url(#pp-lens-clip-${i})`);
    }
  };
  const showEl = (g: Element, on: boolean) => g.setAttribute('display', on ? 'inline' : 'none');

  const setFace = (p: PoseDef, keepLook = false) => {
    eyesClosed = p.lens === 'closed';
    frame(lens, eyesClosed ? 0 : (p.lens as number));
    gsap.set(eyes, { scaleY: 1 });
    showEl(eyes, !eyesClosed);
    showEl(closedEyes, eyesClosed);
    frame(mouth, p.mouth);
    showEl(phones, p.phones);
    showEl(hands, p.hands);
    if (!keepLook && !following) gsap.to(pupils, { x: p.look?.[0] ?? 0, y: p.look?.[1] ?? 0, duration: 0.25 });
  };

  const reset = () => {
    tl?.kill();
    gsap.killTweensOf(parts);
    gsap.set([rig, body, hands, phones], { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 });
    gsap.set(head, { rotation: 0, y: 0, svgOrigin: HEAD });
  };

  // Blinks use José's own lid frames: the lid drops, the eye shuts for a beat, then opens again.
  const scheduleBlink = () => {
    clearTimeout(blinkTimer);
    blinkTimer = window.setTimeout(() => {
      if (!eyesClosed && visible && !reduced()) {
        const from = lensNow;
        const down = [3, 5].filter((f) => f > from);
        const t = gsap.timeline();
        // Each step checks eyesClosed, in case he falls asleep mid-blink.
        const lid = (f: number) => () => !eyesClosed && frame(lens, f);
        down.forEach((f, i) => t.call(lid(f), [], i * 0.035));
        t.call(() => { if (!eyesClosed) { showEl(eyes, false); showEl(closedEyes, true); } }, [], down.length * 0.035)
          .call(() => { if (!eyesClosed) { showEl(closedEyes, false); showEl(eyes, true); } }, [], '+=0.09');
        [...down].reverse().slice(1).concat(from).forEach((f) => t.call(lid(f), [], '+=0.04'));
      }
      scheduleBlink();
    }, 2200 + Math.random() * 3200);
  };

  const talk = (seq: number[], step = 0.09) => {
    const t = gsap.timeline();
    seq.forEach((f, i) => t.call(() => frame(mouth, f), [], i * step));
    return t;
  };

  const build = (a: Anim): gsap.core.Timeline => {
    const t = gsap.timeline({ repeat: -1 });
    const breathe = (amt = 0.012, dur = 2) =>
      gsap.to(body, { scaleY: 1 + amt, svgOrigin: FEET, duration: dur, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    switch (a) {
      case 'idle':
        breathe();
        t.to(head, { rotation: 1.5, svgOrigin: HEAD, duration: 1.6, ease: 'sine.inOut' })
          .to(pupils, { x: following ? '+=0' : -14, duration: 0.25 }, '+=1.2')
          .to(head, { rotation: -2, svgOrigin: HEAD, duration: 0.5, ease: 'power2.out' }, '<')
          .to(pupils, { x: following ? '+=0' : 0, duration: 0.25 }, '+=1')
          .to(head, { rotation: 0, svgOrigin: HEAD, duration: 1.4, ease: 'sine.inOut' })
          .to(pupils, { x: following ? '+=0' : 14, y: following ? '+=0' : -4, duration: 0.25 }, '+=1.2')
          .to(pupils, { x: following ? '+=0' : 0, y: following ? '+=0' : 0, duration: 0.3 }, '+=0.9');
        break;
      case 'happy':
      case 'travel':
        breathe(0.01, 0.5);
        t.to(head, { rotation: 4, svgOrigin: HEAD, duration: 0.5, ease: 'sine.inOut' })
          .to(head, { rotation: -4, svgOrigin: HEAD, duration: 0.5, ease: 'sine.inOut' })
          .add(talk([0, 1, 2, 1, 0, 3, 0]), 0.2)
          .to(hands, { y: -10, duration: 0.25, ease: 'power2.out', yoyo: true, repeat: 3 }, 0);
        if (a === 'travel') {
          t.to(rig, { y: -34, scaleY: 1.03, scaleX: 0.98, svgOrigin: FEET, duration: 0.22, ease: 'power2.out', yoyo: true, repeat: 3 }, 0);
        }
        break;
      case 'sleep':
        breathe(0.025, 2.5);
        t.to(head, { rotation: 6, svgOrigin: HEAD, duration: 2.5, ease: 'sine.inOut' })
          .to(head, { rotation: 4, svgOrigin: HEAD, duration: 2.5, ease: 'sine.inOut' })
          .add(talk([9, 10, 11, 10, 9], 0.5), 0.4);
        break;
      case 'listen':
        breathe();
        t.to(head, { rotation: -1, svgOrigin: HEAD, duration: 0.3, ease: 'sine.inOut', yoyo: true, repeat: 3 })
          .to(head, { rotation: -4, svgOrigin: HEAD, duration: 0.3 })
          .add(talk([7, 8, 7], 0.3), '+=0.6')
          .to({}, { duration: 1.4 });
        break;
      case 'think':
        breathe();
        t.to(head, { rotation: 5, svgOrigin: HEAD, duration: 1.8, ease: 'sine.inOut' })
          .to(pupils, { x: 6, y: -8, duration: 0.6, ease: 'sine.inOut' }, 0.4)
          .to(head, { rotation: 3, svgOrigin: HEAD, duration: 1.8, ease: 'sine.inOut' })
          .to(pupils, { x: 12, y: -2, duration: 0.6, ease: 'sine.inOut' }, '<');
        break;
      case 'idea':
        breathe();
        t.call(() => setFace(POSES.think))
          .to(head, { rotation: 7, svgOrigin: HEAD, duration: 0.9, ease: 'sine.inOut' })
          .call(() => setFace(POSES.idea))
          .to(head, { rotation: -2, y: -26, svgOrigin: HEAD, duration: 0.18, ease: 'power3.out' })
          .to(head, { y: 0, duration: 0.35, ease: 'bounce.out' })
          .call(() => setFace({ ...POSES.celebrate, phones: false, hands: false }))
          .add(talk([0, 1, 2, 1, 0], 0.1))
          .to(head, { rotation: 3, svgOrigin: HEAD, duration: 0.4, ease: 'sine.inOut', yoyo: true, repeat: 1 })
          .to({}, { duration: 0.6 });
        break;
      case 'build':
        breathe();
        t.to(hands, { y: -5, duration: 0.08, yoyo: true, repeat: 3, ease: 'power1.inOut' })
          .to(hands, { rotation: -3, svgOrigin: HANDS, duration: 0.5, ease: 'sine.inOut' })
          .to(head, { rotation: 3, svgOrigin: HEAD, duration: 0.5, ease: 'sine.inOut' }, '<')
          .to(hands, { y: -5, duration: 0.08, yoyo: true, repeat: 5, ease: 'power1.inOut' }, '+=0.3')
          .to(hands, { rotation: 2, svgOrigin: HANDS, duration: 0.5, ease: 'sine.inOut' })
          .to(head, { rotation: 1, svgOrigin: HEAD, duration: 0.5, ease: 'sine.inOut' }, '<');
        break;
      case 'celebrate':
        t.to(rig, { y: -46, scaleY: 1.04, scaleX: 0.97, svgOrigin: FEET, duration: 0.26, ease: 'power2.out' })
          .to(hands, { y: -26, duration: 0.26, ease: 'power2.out' }, '<')
          .to(rig, { y: 0, scaleY: 0.95, scaleX: 1.04, svgOrigin: FEET, duration: 0.24, ease: 'power2.in' })
          .to(hands, { y: 0, duration: 0.24, ease: 'power2.in' }, '<')
          .to(rig, { scaleY: 1, scaleX: 1, svgOrigin: FEET, duration: 0.12 })
          .add(talk([0, 1, 0, 2, 0], 0.08), 0)
          .to(head, { rotation: 5, svgOrigin: HEAD, duration: 0.31, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0);
        break;
    }
    return t;
  };

  const apply = () => {
    reset();
    const pose = POSES[FACE[state]];
    setFace(pose);
    if (pose.tilt) gsap.set(head, { rotation: pose.tilt, svgOrigin: HEAD });
    if (reduced()) return;
    tl = build(state);
    if (!visible) tl.pause();
  };

  // Only animate while on screen.
  new IntersectionObserver((e) => {
    visible = e[0].isIntersecting;
    if (visible) tl?.resume(); else tl?.pause();
  }, { rootMargin: '100px' }).observe(svg);

  if (opts.follow && !reduced() && matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', (ev) => {
      if (!visible || eyesClosed) return;
      following = true;
      const r = svg.getBoundingClientRect();
      const cx = r.left + r.width * 0.5;
      const cy = r.top + r.height * 0.42;
      const dx = Math.max(-1, Math.min(1, (ev.clientX - cx) / (window.innerWidth * 0.5)));
      const dy = Math.max(-1, Math.min(1, (ev.clientY - cy) / (window.innerHeight * 0.5)));
      gsap.to(pupils, { x: dx * 16, y: dy * 10, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
    });
  }

  // The original animation: bored face, headphones drop from the sky, the controller rises, a big laugh.
  const intro = () =>
    new Promise<void>((resolve) => {
      reset();
      state = 'happy';
      setFace(POSES.bored);
      if (reduced()) {
        setFace(POSES.happy);
        resolve();
        return;
      }
      showEl(phones, true);
      showEl(hands, true);
      gsap.set(phones, { y: -1600 });
      gsap.set(hands, { y: 760 });
      const t = gsap.timeline({ onComplete: () => { apply(); resolve(); } });
      t.to(head, { rotation: -2, svgOrigin: HEAD, duration: 0.6, ease: 'sine.inOut' })
        .to(phones, { y: 0, duration: 0.75, ease: 'bounce.out' }, 0.25)
        .to(hands, { y: 0, duration: 0.6, ease: 'back.out(1.6)' }, 0.45)
        .to(head, { rotation: 0, y: 10, svgOrigin: HEAD, duration: 0.12, ease: 'power2.out' }, 0.62)
        .to(head, { y: 0, duration: 0.3, ease: 'back.out(3)' }, 0.74);
      [4, 3, 2, 1, 0].forEach((f, i) => t.call(() => frame(lens, f), [], 0.62 + i * 0.05));
      [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].forEach((f, i) => t.call(() => frame(mouth, f), [], 0.62 + i * 0.035));
    });

  // Headphones fly off, then the intro plays again.
  const replay = async () => {
    if (reduced()) return;
    reset();
    await new Promise<void>((r) => {
      gsap.timeline({ onComplete: r })
        .to(phones, { y: -1600, duration: 0.35, ease: 'power2.in' })
        .to(hands, { y: 760, duration: 0.3, ease: 'power2.in' }, 0)
        .call(() => setFace(POSES.bored), [], 0.2);
    });
    await intro();
  };

  apply();
  scheduleBlink();

  return {
    play(a) {
      if (a === state) return;
      state = a;
      apply();
    },
    current: () => state,
    intro,
    replay,
  };
}
