// The hero's backdrop: a slow sheet of liquid glass. A height field made of warped noise (fbm fed
// through itself, so it folds like a viscous liquid) is lit as thick glossy glass: a cobalt body,
// iridescent colour where the surface turns away from you, and sharp white highlights on its
// ridges. The pointer presses a soft bulge into it, which follows with a little lag.
// Rendered at a fraction of the screen's resolution; still with reduced motion; plain colour
// where WebGL is missing.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uMouse; // x, y in 0..1, strength

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
float height(vec2 p, float t, vec2 m, float ms) {
  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.06)), fbm(p + vec2(5.2, 1.3) - t * 0.05));
  vec2 r = vec2(fbm(p + 2.6 * q + vec2(1.7, 9.2) + t * 0.07), fbm(p + 2.6 * q + vec2(8.3, 2.8) - t * 0.05));
  float h = fbm(p + 2.2 * r);
  float d = length(p - m);
  return h + ms * 0.32 * exp(-d * d * 5.0);
}
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * asp, uv.y) * 1.15;
  vec2 m = vec2(uMouse.x * asp, uMouse.y) * 1.15;
  float t = uTime * 0.7;
  float e = 0.012;
  float h = height(p, t, m, uMouse.z);
  float hx = height(p + vec2(e, 0.0), t, m, uMouse.z);
  float hy = height(p + vec2(0.0, e), t, m, uMouse.z);
  vec3 n = normalize(vec3(-(hx - h) / e, -(hy - h) / e, 4.2));
  // The glass body: deep cobalt in the valleys, brighter blue on the swells.
  vec3 deep = vec3(0.13, 0.17, 0.62);
  vec3 lift = vec3(0.30, 0.42, 0.95);
  vec3 col = mix(deep, lift, smoothstep(0.25, 0.85, h));
  // Iridescence where the surface tilts away: a thin-film shimmer through pink, cyan and gold.
  float fres = pow(1.0 - n.z, 1.6);
  vec3 iri = 0.5 + 0.5 * cos(6.2831 * (h * 1.6 + vec3(0.0, 0.33, 0.67)) + t * 0.2);
  col = mix(col, iri * vec3(0.9, 0.85, 1.0), clamp(fres * 1.6, 0.0, 0.32));
  // Highlights: a broad soft key and a tight sparkle on the ridges.
  vec3 L = normalize(vec3(-0.45, 0.6, 0.75));
  vec3 R = reflect(-L, n);
  float spec = pow(max(R.z, 0.0), 70.0);
  float soft = pow(max(dot(n, L), 0.0), 3.0);
  col += vec3(1.0) * spec * 0.7 + vec3(0.55, 0.65, 1.0) * soft * 0.1;
  // A vignette keeps the middle (the name) calm.
  float vig = smoothstep(1.25, 0.25, length((uv - 0.5) * vec2(asp, 1.0)));
  col *= mix(0.8, 1.0, vig);
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
  const uMouse = gl.getUniformLocation(prog, 'uMouse');
  canvas.classList.add('is-on');

  const size = () => {
    // Soft light needs few pixels: about a third of the screen's, capped.
    const k = Math.min(0.42, 700 / Math.max(1, canvas.clientWidth));
    canvas.width = Math.max(2, Math.round(canvas.clientWidth * k));
    canvas.height = Math.max(2, Math.round(canvas.clientHeight * k));
    gl!.viewport(0, 0, canvas.width, canvas.height);
  };
  size();
  addEventListener('resize', () => {
    size();
    if (reduced) draw(performance.now());
  });

  // The pointer's bulge eases after the pointer and swells while it moves.
  let mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5, ms = 0, mt = 0;
  addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    if (e.clientY > r.bottom) return;
    tx = (e.clientX - r.left) / r.width;
    ty = 1 - (e.clientY - r.top) / r.height;
    mt = 1;
  }, { passive: true });

  const t0 = performance.now();
  let raf = 0, visible = true;
  const draw = (now: number) => {
    mx += (tx - mx) * 0.06;
    my += (ty - my) * 0.06;
    ms += (mt - ms) * 0.05;
    mt *= 0.985;
    gl!.uniform2f(uRes, canvas.width, canvas.height);
    gl!.uniform1f(uTime, reduced ? 4 : (now - t0) / 1000);
    gl!.uniform3f(uMouse, mx, my, ms);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  };
  const frame = (now: number) => {
    raf = 0;
    if (!visible) return;
    draw(now);
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
