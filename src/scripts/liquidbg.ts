// The hero's backdrop: a liquid surface over deep cobalt. Under it, a fine field of dots (like the
// pixels of a screen seen up close); on top, real ripples: a small wave simulation runs on the CPU
// (a height field a couple of hundred cells wide), and the shader bends the dots through it and
// catches the light on the crests. The pointer leaves a wake as it moves, a click or a tap drops a
// drop that rings outwards, and now and then a drop falls by itself, so the surface is never still.
// Still with reduced motion; plain colour where WebGL is missing.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uCell;      // dot spacing, in canvas pixels
uniform vec3 uMouse;      // x, y in 0..1, how present the pointer is
uniform sampler2D uWater; // r, g: the surface's slope; b: its height

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

// What lies under the liquid, at a (bent) point of the screen.
vec3 under(vec2 uv, float asp, float t) {
  vec3 col = mix(vec3(0.09, 0.11, 0.48), vec3(0.17, 0.22, 0.78), smoothstep(0.0, 1.0, uv.y));
  vec2 q = vec2(uv.x * asp, uv.y);
  col += vec3(0.35, 0.12, 0.45) * smoothstep(0.9, 0.0, length(uv - vec2(0.05, 0.05))) * (0.25 + 0.2 * noise(q * 1.2 + t * 0.04));
  col += vec3(0.05, 0.3, 0.5) * smoothstep(0.9, 0.0, length(uv - vec2(0.95, 0.95))) * (0.22 + 0.2 * noise(q * 1.1 - t * 0.04 + 7.0));
  // The dots, breathing in slow waves.
  vec2 px = uv * uRes;
  vec2 cell = floor(px / uCell);
  vec2 local = fract(px / uCell) - 0.5;
  vec2 c = (cell + 0.5) * uCell / uRes;
  float flow = smoothstep(0.35, 0.95, noise(vec2(c.x * asp, c.y) * 2.2 + vec2(t * 0.07, -t * 0.05)));
  float r = 0.07 + 0.14 * flow;
  float dotMask = smoothstep(r, r - 1.2 / uCell, length(local));
  col = mix(col, vec3(0.55, 0.63, 1.0), dotMask * (0.14 + 0.26 * flow) * smoothstep(0.02, 0.3, uv.y));
  return col;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  float t = uTime;

  vec4 w = texture2D(uWater, vec2(uv.x, 1.0 - uv.y));
  vec2 slope = (w.rg - 0.5) * 2.0;
  slope.y = -slope.y;
  float h = (w.b - 0.5) * 2.0;

  // Seen through the liquid: bent by its slope.
  vec3 col = under(uv + slope * 0.03, asp, t);

  // Light on the surface: a glint on the crests, a sheen on the slopes, troughs a touch deeper.
  vec3 N = normalize(vec3(-slope * 3.0, 1.0));
  vec3 L = normalize(vec3(-0.45, 0.55, 0.75));
  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(N, H), 0.0), 90.0);
  col += vec3(0.85, 0.9, 1.0) * spec * 0.7;
  col += vec3(0.3, 0.4, 1.0) * (1.0 - N.z) * 0.9;
  col *= 1.0 + h * 0.1;
  // Where the pointer is, the liquid catches a warm light.
  vec2 m = vec2(uMouse.x * asp, uMouse.y);
  float dm = length(vec2(uv.x * asp, uv.y) - m);
  col += vec3(1.0, 0.75, 0.3) * exp(-dm * dm * 14.0) * (0.06 + spec * 0.6 + (1.0 - N.z) * 1.2) * uMouse.z;

  col *= mix(0.8, 1.0, smoothstep(1.3, 0.2, length((uv - 0.5) * vec2(asp, 1.0))));
  // The bottom edge settles on one exact colour: the cobalt the next chapter starts from.
  col = mix(col, vec3(0.094, 0.122, 0.471), smoothstep(0.14, 0.0, uv.y));
  gl_FragColor = vec4(col, 1.0);
}`;

export function initLiquidBg(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  let gl: WebGLRenderingContext | null = null;
  try {
    gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
  } catch {}
  if (!gl) return;
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
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uCell = gl.getUniformLocation(prog, 'uCell');
  const uMouse = gl.getUniformLocation(prog, 'uMouse');
  gl.uniform1i(gl.getUniformLocation(prog, 'uWater'), 0);

  // ---------- The liquid: a wave simulation on a small grid ----------
  let W = 2, H = 2;
  let cur = new Float32Array(4), prev = new Float32Array(4), px = new Uint8Array(16);
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const grid = () => {
    const asp = Math.max(0.3, canvas.clientWidth / Math.max(1, canvas.clientHeight));
    W = canvas.clientWidth < 700 ? 110 : 200;
    H = Math.max(40, Math.round(W / asp));
    cur = new Float32Array(W * H);
    prev = new Float32Array(W * H);
    px = new Uint8Array(W * H * 4);
  };

  // A drop: a smooth bump of `amp` over `rad` cells at (gx, gy).
  const drop = (gx: number, gy: number, rad: number, amp: number) => {
    const r = Math.ceil(rad);
    for (let y = Math.max(1, Math.floor(gy - r)); y < Math.min(H - 1, gy + r); y++) {
      for (let x = Math.max(1, Math.floor(gx - r)); x < Math.min(W - 1, gx + r); x++) {
        const d = Math.hypot(x - gx, y - gy) / rad;
        if (d < 1) cur[y * W + x] += amp * (0.5 + 0.5 * Math.cos(d * Math.PI));
      }
    }
  };

  const step = () => {
    // The classic two-buffer ripple: each cell moves towards the average of its neighbours.
    for (let y = 1; y < H - 1; y++) {
      const row = y * W;
      for (let x = 1; x < W - 1; x++) {
        const i = row + x;
        prev[i] = ((cur[i - 1] + cur[i + 1] + cur[i - W] + cur[i + W]) * 0.5 - prev[i]) * 0.984;
      }
    }
    const t = cur;
    cur = prev;
    prev = t;
  };

  const upload = () => {
    for (let y = 0; y < H; y++) {
      const row = y * W;
      for (let x = 0; x < W; x++) {
        const i = row + x;
        const l = cur[x > 0 ? i - 1 : i], r = cur[x < W - 1 ? i + 1 : i];
        const u = cur[y > 0 ? i - W : i], d = cur[y < H - 1 ? i + W : i];
        const o = i * 4;
        px[o] = Math.max(0, Math.min(255, 128 + (r - l) * 42));
        px[o + 1] = Math.max(0, Math.min(255, 128 + (d - u) * 42));
        px[o + 2] = Math.max(0, Math.min(255, 128 + cur[i] * 30));
        px[o + 3] = 255;
      }
    }
    gl!.bindTexture(gl!.TEXTURE_2D, tex);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, W, H, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, px);
  };

  // Dots need crisp pixels: render at the screen's density (capped, so big screens stay light).
  let k = 1;
  const size = () => {
    k = Math.min(devicePixelRatio || 1, 2, 2400 / Math.max(1, canvas.clientWidth));
    canvas.width = Math.max(2, Math.round(canvas.clientWidth * k));
    canvas.height = Math.max(2, Math.round(canvas.clientHeight * k));
    gl!.viewport(0, 0, canvas.width, canvas.height);
    grid();
    upload();
  };
  size();
  canvas.classList.add('is-on');
  addEventListener('resize', () => {
    size();
    if (reduced) draw(performance.now());
  });

  const onHero = () => {
    const slide = document.documentElement.dataset.slide;
    return !slide || slide === 'inicio';
  };
  const toGrid = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H, inside: e.clientY <= r.bottom && e.clientY >= r.top };
  };

  // The pointer: a warm light that follows it, and a wake behind it as it moves.
  let mx = 0.5, my = 0.55, tx = 0.5, ty = 0.55, ms = 0, mt = 0;
  let lgx = -1, lgy = -1;
  addEventListener('pointermove', (e) => {
    if (!onHero()) return;
    const g = toGrid(e);
    if (!g.inside) return;
    tx = g.x / W;
    ty = 1 - g.y / H;
    mt = 1;
    if (reduced) return;
    if (lgx >= 0) {
      const dist = Math.hypot(g.x - lgx, g.y - lgy);
      const n = Math.min(8, Math.ceil(dist / 1.5));
      const amp = Math.min(1.4, 0.25 + dist * 0.08);
      for (let s = 1; s <= n; s++) drop(lgx + ((g.x - lgx) * s) / n, lgy + ((g.y - lgy) * s) / n, 2.6, amp / n * 2);
    }
    lgx = g.x;
    lgy = g.y;
  }, { passive: true });
  addEventListener('pointerleave', () => { lgx = -1; });

  // A click or a tap: a drop that rings outwards.
  addEventListener('pointerdown', (e) => {
    if (!onHero() || reduced) return;
    const g = toGrid(e);
    if (!g.inside) return;
    drop(g.x, g.y, W < 150 ? 5 : 6, -6);
    tx = g.x / W;
    ty = 1 - g.y / H;
    mt = 1;
  }, { passive: true });

  const t0 = performance.now();
  let raf = 0, visible = true, nextDrop = 0;
  const draw = (now: number) => {
    mx += (tx - mx) * 0.08;
    my += (ty - my) * 0.08;
    ms += (mt - ms) * 0.06;
    mt *= 0.985;
    gl!.uniform2f(uRes, canvas.width, canvas.height);
    gl!.uniform1f(uTime, reduced ? 4 : (now - t0) / 1000);
    gl!.uniform1f(uCell, (canvas.clientWidth < 700 ? 16 : 22) * k);
    gl!.uniform3f(uMouse, mx, my, Math.max(0.1, ms));
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  };
  const frame = (now: number) => {
    raf = 0;
    if (!visible) return;
    if (onHero()) {
      // Now and then a drop falls by itself, so the surface is never quite still.
      if (now > nextDrop) {
        drop(2 + Math.random() * (W - 4), 2 + Math.random() * (H - 4), 3 + Math.random() * 2, -(1.5 + Math.random() * 2));
        nextDrop = now + 900 + Math.random() * 1600;
      }
      step();
      upload();
      draw(now);
    }
    raf = requestAnimationFrame(frame);
  };
  if (reduced) {
    draw(performance.now());
    return;
  }
  new IntersectionObserver((e) => {
    visible = e[0].isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(frame);
  }).observe(canvas);
}
