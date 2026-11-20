// Liquid glass: what is behind a `.glass` panel bends near its edges, like a thick lens, instead of
// only blurring. A displacement map is drawn for each panel's exact size and corner radius and used
// as an SVG filter in `backdrop-filter`. Only Chromium can filter the backdrop with SVG; elsewhere
// the panel keeps the frosted look from global.css.

let n = 0;
let defs: SVGSVGElement | null = null;
const NS = 'http://www.w3.org/2000/svg';

const chromium = () =>
  !!(navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands?.some((b) =>
    /Chromium/.test(b.brand),
  );

// Each pixel's displacement points along the edge's normal: strong at the rim, none inside the bezel.
function drawMap(w: number, h: number, r: number, bezel: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const hw = w / 2, hh = h / 2;
  r = Math.min(r, hw, hh);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - hw, py = y + 0.5 - hh;
      const qx = Math.abs(px) - (hw - r), qy = Math.abs(py) - (hh - r);
      let nx = 0, ny = 0, d: number;
      if (qx > 0 && qy > 0) {
        const l = Math.hypot(qx, qy) || 1;
        d = r - l;
        nx = qx / l;
        ny = qy / l;
      } else {
        d = r - Math.max(qx, qy);
        if (qx > qy) nx = 1;
        else ny = 1;
      }
      nx *= Math.sign(px) || 1;
      ny *= Math.sign(py) || 1;
      // A convex rim: the slope (and so the bend) grows quickly towards the edge.
      const t = Math.max(0, 1 - Math.max(0, d) / bezel);
      const m = t * t * (3 - 2 * t);
      const i = (y * w + x) * 4;
      img.data[i] = 128 - nx * m * 127;
      img.data[i + 1] = 128 - ny * m * 127;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

export function liquid(el: HTMLElement, { bezel = 24, scale = 46, blur = 1.2, chroma = false } = {}) {
  if (!chromium() || matchMedia('(prefers-reduced-transparency: reduce)').matches) return;
  if (!defs) {
    defs = document.createElementNS(NS, 'svg');
    defs.setAttribute('aria-hidden', 'true');
    defs.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    document.body.appendChild(defs);
  }
  const id = `liquid-${++n}`;
  const filter = document.createElementNS(NS, 'filter');
  filter.id = id;
  filter.setAttribute('filterUnits', 'userSpaceOnUse');
  filter.setAttribute('color-interpolation-filters', 'sRGB');
  // With chroma, each colour channel bends a little differently, like a real lens: rainbow rims.
  const bend = (k: number, out: string) =>
    `<feDisplacementMap in="soft" in2="map" scale="${(scale * k).toFixed(1)}" xChannelSelector="R" yChannelSelector="G" result="${out}" />`;
  const only = (src: string, ch: number, out: string) => {
    const m = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0];
    m[ch * 5 + ch] = 1;
    return `<feColorMatrix in="${src}" type="matrix" values="${m.join(' ')}" result="${out}" />`;
  };
  filter.innerHTML = chroma
    ? `
    <feGaussianBlur in="SourceGraphic" stdDeviation="${blur}" result="soft" />
    <feImage x="0" y="0" preserveAspectRatio="none" result="map" />
    ${bend(1.14, 'dr')}${only('dr', 0, 'r')}
    ${bend(1, 'dg')}${only('dg', 1, 'g')}
    ${bend(0.86, 'db')}${only('db', 2, 'b')}
    <feBlend in="r" in2="g" mode="screen" result="rg" />
    <feBlend in="rg" in2="b" mode="screen" result="rgb" />
    <feColorMatrix in="rgb" type="saturate" values="1.35" />`
    : `
    <feGaussianBlur in="SourceGraphic" stdDeviation="${blur}" result="soft" />
    <feImage x="0" y="0" preserveAspectRatio="none" result="map" />
    <feDisplacementMap in="soft" in2="map" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="bent" />
    <feColorMatrix in="bent" type="saturate" values="1.6" />`;
  defs.appendChild(filter);
  const image = filter.querySelector('feImage')!;

  let lastW = 0, lastH = 0;
  const update = () => {
    const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
    if (!w || !h || (w === lastW && h === lastH)) return;
    lastW = w;
    lastH = h;
    const r = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    for (const f of [filter, image]) {
      f.setAttribute('x', '0');
      f.setAttribute('y', '0');
      f.setAttribute('width', String(w));
      f.setAttribute('height', String(h));
    }
    image.setAttribute('href', drawMap(w, h, r, Math.min(bezel, w / 3, h / 3)));
    el.style.backdropFilter = `url(#${id})`;
    el.classList.add('is-liquid');
  };
  // Redrawing the map costs a pass over every pixel: wait until a resize settles (the cursor lens
  // grows and melts continuously), and stretch the last map in the meantime.
  let wait = 0;
  new ResizeObserver(() => {
    clearTimeout(wait);
    wait = window.setTimeout(update, 120);
  }).observe(el);
  update();
}

export function initLiquid() {
  document.querySelectorAll<HTMLElement>('[data-liquid]').forEach((el) => {
    const o = el.dataset.liquid ? JSON.parse(el.dataset.liquid) : {};
    liquid(el, o);
  });
}
