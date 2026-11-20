// The hero's backdrop: minimal, so the cream name and the card stand out. A deep cobalt with a fine
// moving film grain, a slow glow breathing at the edges and a soft light that follows the pointer,
// as if a lamp were held over the name. Rendered at a fraction of the screen's resolution; still
// with reduced motion; plain colour where WebGL is missing.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uMouse; // x, y in 0..1, how present the pointer is

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 q = vec2(uv.x * asp, uv.y);
  float t = uTime;
  // Deep cobalt, a little lighter at the top, a little deeper at the bottom.
  vec3 top = vec3(0.17, 0.22, 0.78);
  vec3 bot = vec3(0.09, 0.11, 0.48);
  vec3 col = mix(bot, top, smoothstep(0.0, 1.0, uv.y));
  // A slow glow breathing in from two corners (warm pink and cool cyan, barely there).
  float g1 = noise(q * 1.2 + vec2(t * 0.04, -t * 0.03));
  float g2 = noise(q * 1.1 + vec2(-t * 0.03, t * 0.05) + 7.0);
  col += vec3(0.35, 0.12, 0.45) * smoothstep(0.9, 0.0, length(uv - vec2(0.05, 0.05))) * (0.25 + 0.2 * g1);
  col += vec3(0.05, 0.3, 0.5) * smoothstep(0.9, 0.0, length(uv - vec2(0.95, 0.95))) * (0.22 + 0.2 * g2);
  // The lamp: a soft pool of light under the pointer.
  vec2 m = vec2(uMouse.x * asp, uMouse.y);
  float d = length(q - m);
  col += vec3(0.32, 0.38, 0.85) * exp(-d * d * 5.0) * 0.55 * uMouse.z;
  // A quiet vignette and fine film grain that shimmers.
  col *= mix(0.78, 1.0, smoothstep(1.3, 0.2, length((uv - 0.5) * vec2(asp, 1.0))));
  float grain = hash(gl_FragCoord.xy + floor(t * 24.0) * 13.1) - 0.5;
  col += grain * 0.045;
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
    const k = Math.min(0.5, 800 / Math.max(1, canvas.clientWidth));
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
    ms += (Math.max(0.55, mt) - ms) * 0.05;
    mt *= 0.99;
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
