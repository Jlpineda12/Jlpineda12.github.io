// The gate is underwater. Behind the Creative ID: caustic light dancing (a small WebGL shader of
// our own), soft rays from the surface and bubbles rising. The card sways and ripples like it is
// floating (an SVG displacement filter, Hero.astro). When the reader reads the card, a ripple runs
// out from it through the water; when access is granted the water drains away like a wave and the
// home page is left behind, dry.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
// Caustics: a few layers of warped sine waves; where they cancel, thin bright filaments appear,
// the way light focuses through a moving water surface. A ripple (uRip: centre, age) pushes the
// pattern outward and leaves a bright ring.
const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uRip;
uniform float uGlow;
float caus(vec2 p, float t) {
  vec2 a = p;
  float v = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    a += vec2(sin(a.y * 1.6 + t * 0.9 + fi), cos(a.x * 1.4 - t * 0.7 + fi * 1.3)) * 0.38;
    v += abs(sin(a.x * 2.6 + t * 0.6) * cos(a.y * 2.4 - t * 0.5));
  }
  v /= 4.0;
  return pow(1.0 - v, 7.0);
}
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 q = vec2(uv.x * asp, uv.y) * 3.2;
  float ring = 0.0;
  if (uRip.z >= 0.0) {
    vec2 c = vec2(uRip.x * asp, uRip.y) * 3.2;
    vec2 d = q - c;
    float r = length(d);
    float front = uRip.z * 4.2;
    float w = exp(-pow((r - front) * 2.2, 2.0)) * exp(-uRip.z * 1.3);
    q += normalize(d + 1e-4) * w * 0.35;
    ring = w;
  }
  float t = uTime * 0.55;
  float c = caus(q, t) * 0.75 + caus(q * 1.7 + 3.1, t * 1.3) * 0.45;
  float depth = mix(0.45, 1.15, uv.y);
  vec3 col = vec3(0.62, 0.9, 1.0) * c * depth + vec3(0.85, 0.97, 1.0) * ring * 0.9 + vec3(0.4, 0.7, 1.0) * uGlow * 0.25;
  gl_FragColor = vec4(col, 1.0);
}`;

export type Water = {
  /** The water rises into the hero. */
  rise(): void;
  /** A ripple from a point on screen. */
  ripple(x: number, y: number): void;
  /** A brief glow through the water (access granted). */
  glow(): void;
  /** The water drains away; resolves when it is gone. */
  drain(): Promise<void>;
  /** Fill again (another lap). */
  fill(): void;
};

export function initWater(hero: HTMLElement): Water | null {
  const water = hero.querySelector<HTMLElement>('.water');
  const canvas = water?.querySelector<HTMLCanvasElement>('.water-gl');
  if (!water || !canvas) return null;

  let gl: WebGLRenderingContext | null = null;
  try {
    gl = reduced ? null : canvas.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false });
  } catch {}

  let uRes: WebGLUniformLocation | null = null, uTime: WebGLUniformLocation | null = null;
  let uRip: WebGLUniformLocation | null = null, uGlow: WebGLUniformLocation | null = null;
  if (gl) {
    const sh = (type: number, src: string) => {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) gl = null;
    else {
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      uRes = gl.getUniformLocation(prog, 'uRes');
      uTime = gl.getUniformLocation(prog, 'uTime');
      uRip = gl.getUniformLocation(prog, 'uRip');
      uGlow = gl.getUniformLocation(prog, 'uGlow');
    }
  }
  if (!gl) water.classList.add('no-gl');

  // Half resolution: caustics are soft light, and it keeps phones cool.
  const size = () => {
    const k = Math.min(1, devicePixelRatio || 1) * 0.5;
    canvas.width = Math.max(2, Math.round(water.clientWidth * k));
    canvas.height = Math.max(2, Math.round(water.clientHeight * k));
    gl?.viewport(0, 0, canvas.width, canvas.height);
  };
  size();
  addEventListener('resize', size);

  let raf = 0, t0 = performance.now(), on = false, visible = true;
  let rip = { x: 0.5, y: 0.5, at: -1 };
  let glowAt = -1;
  const frame = (now: number) => {
    raf = 0;
    if (!gl || !on || !visible) return;
    const t = (now - t0) / 1000;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, t);
    gl.uniform3f(uRip, rip.x, rip.y, rip.at < 0 ? -1 : (now - rip.at) / 1000);
    gl.uniform1f(uGlow, glowAt < 0 ? 0 : Math.max(0, 1 - (now - glowAt) / 1400));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  };
  const run = () => {
    if (!raf && gl && on && visible) raf = requestAnimationFrame(frame);
  };
  new IntersectionObserver((e) => {
    visible = e[0].isIntersecting;
    run();
  }).observe(water);
  run();

  // Bubbles bursting up from a point (the reader, on access).
  const burst = (x: number, y: number, n = 26) => {
    if (reduced) return;
    const h = hero.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      const b = document.createElement('span');
      b.className = 'bub-burst';
      const s = 6 + Math.random() * 22;
      b.style.left = `${x - h.left + (Math.random() - 0.5) * 160}px`;
      b.style.top = `${y - h.top + (Math.random() - 0.5) * 40}px`;
      b.style.setProperty('--s', `${s.toFixed(0)}px`);
      b.style.setProperty('--dx', `${((Math.random() - 0.5) * 220).toFixed(0)}px`);
      b.style.setProperty('--dy', `${(-(260 + Math.random() * 420)).toFixed(0)}px`);
      b.style.animationDelay = `${(Math.random() * 0.25).toFixed(2)}s`;
      b.addEventListener('animationend', () => b.remove());
      hero.appendChild(b);
    }
  };

  const api: Water = {
    rise() {
      water.classList.remove('is-gone', 'is-draining');
      water.classList.add('is-live');
      on = true;
      run();
    },
    ripple(x, y) {
      const r = water.getBoundingClientRect();
      rip = { x: (x - r.left) / r.width, y: 1 - (y - r.top) / r.height, at: performance.now() };
      water.classList.remove('is-rippling');
      void water.offsetWidth;
      water.classList.add('is-rippling');
      water.style.setProperty('--rx', `${x - r.left}px`);
      water.style.setProperty('--ry', `${y - r.top}px`);
      run();
    },
    glow() {
      glowAt = performance.now();
      water.classList.add('is-glow');
    },
    drain() {
      const reader = hero.querySelector<HTMLElement>('.reader-body')?.getBoundingClientRect();
      if (reader) burst(reader.left + reader.width / 2, reader.top);
      return new Promise((res) => {
        if (reduced) {
          water.classList.add('is-gone');
          on = false;
          return res();
        }
        water.classList.add('is-draining');
        const end = () => {
          water.classList.add('is-gone');
          water.classList.remove('is-draining', 'is-glow', 'is-live');
          on = false;
          res();
        };
        // The surface falls out of the bottom of the screen (CSS), then the canvas stops.
        setTimeout(end, 1300);
      });
    },
    fill() {
      water.classList.remove('is-gone', 'is-draining', 'is-glow', 'is-live');
      on = true;
      t0 = performance.now();
      run();
    },
  };
  return api;
}
