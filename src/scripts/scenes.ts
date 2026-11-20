// Colour scenes: every chapter has its own colour (global.css, [data-scene]). The page behind them
// is one sheet of colour that flows from chapter to chapter as you scroll. The mix happens in
// OKLab, where halfway between two colours also looks halfway, so the blend never turns muddy.
type Lab = [number, number, number];

const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToLab(hex: string): Lab {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => toLin(parseInt(h.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function labToHex([L, A, B]: Lab) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return '#' + rgb.map((c) => Math.round(Math.min(1, Math.max(0, toSrgb(c))) * 255).toString(16).padStart(2, '0')).join('');
}

export function initScenes() {
  const root = document.documentElement;
  const secs = [...document.querySelectorAll<HTMLElement>('[data-scene]')];
  if (!secs.length) return;
  const labs = secs.map((s) => hexToLab(getComputedStyle(s).getPropertyValue('--bg').trim() || '#3d4ccf'));
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  let raf = 0;
  let last = '';

  const update = () => {
    raf = 0;
    const vh = innerHeight;
    let i = 0;
    for (let k = 0; k < secs.length; k++) if (secs[k].getBoundingClientRect().top <= vh * 0.5) i = k;
    let t = 0;
    const next = secs[i + 1];
    if (next) t = Math.min(1, Math.max(0, (vh * 0.9 - next.getBoundingClientRect().top) / (vh * 0.4)));
    const a = labs[i], b = labs[i + 1] ?? a;
    const e = t * t * (3 - 2 * t);
    const c = labToHex([a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e]);
    if (c === last) return;
    last = c;
    root.style.setProperty('--scene-bg', c);
    root.dataset.scene = secs[t > 0.5 && next ? i + 1 : i].dataset.scene;
    if (meta) meta.content = c;
  };
  const ask = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);
  update();
}
