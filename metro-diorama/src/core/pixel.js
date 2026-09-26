// Pixel buffer + helpers used by every asset generator.
// Assets draw into a Pix (an RGBA buffer with blending) and convert to a
// canvas once, so they can be cached, exported as PNG, or swapped for a
// hand-edited override image.

const colorCache = new Map();

export function rgb(c) {
  if (Array.isArray(c)) return c;
  let v = colorCache.get(c);
  if (v) return v;
  let s = c.replace('#', '');
  if (s.length === 3) s = s.split('').map((ch) => ch + ch).join('');
  v = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16),
    s.length === 8 ? parseInt(s.slice(6, 8), 16) : 255];
  colorCache.set(c, v);
  return v;
}

export function hex([r, g, b]) {
  const h = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}

export function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return hex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

export function rgba(c, a) {
  const [r, g, b] = rgb(c);
  return `rgba(${r},${g},${b},${a})`;
}

// 4x4 ordered-dither threshold
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function bayer(x, y) {
  return (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
}
export function dith(x, y, level) {
  return level > bayer(x, y);
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export class Pix {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.d = new Uint8ClampedArray(w * h * 4);
  }

  set(x, y, c, a = 1) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const col = rgb(c);
    const alpha = a * (col[3] / 255);
    const i = (y * this.w + x) * 4, d = this.d;
    if (alpha >= 1) {
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    } else if (alpha > 0) {
      const da = d[i + 3] / 255;
      const oa = alpha + da * (1 - alpha);
      d[i] = (col[0] * alpha + d[i] * da * (1 - alpha)) / oa;
      d[i + 1] = (col[1] * alpha + d[i + 1] * da * (1 - alpha)) / oa;
      d[i + 2] = (col[2] * alpha + d[i + 2] * da * (1 - alpha)) / oa;
      d[i + 3] = oa * 255;
    }
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    const i = (y * this.w + x) * 4, d = this.d;
    return [d[i], d[i + 1], d[i + 2], d[i + 3]];
  }

  alphaAt(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[(y * this.w + x) * 4 + 3];
  }

  clear(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.d[i] = this.d[i + 1] = this.d[i + 2] = this.d[i + 3] = 0;
  }

  rect(x, y, w, h, c, a = 1) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c, a);
  }

  hline(x0, x1, y, c, a = 1) { for (let x = x0; x <= x1; x++) this.set(x, y, c, a); }
  vline(x, y0, y1, c, a = 1) { for (let y = y0; y <= y1; y++) this.set(x, y, c, a); }

  line(x0, y0, x1, y1, c, a = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c, a);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  ellipse(cx, cy, rx, ry, c, a = 1) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c, a);
      }
    }
  }

  // Ordered-dither fill: `level` 0..1 of pixels painted.
  dither(x, y, w, h, c, level, a = 1) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (dith(i, j, level)) this.set(i, j, c, a);
  }

  // Vertical gradient through a list of palette colours, dithered between steps.
  vgrad(x, y, w, h, colors) {
    const n = colors.length - 1;
    for (let j = 0; j < h; j++) {
      const f = (j / Math.max(1, h - 1)) * n;
      const i0 = Math.min(n - 1, Math.floor(f));
      const t = f - i0;
      for (let i = 0; i < w; i++) {
        this.set(x + i, y + j, dith(x + i, y + j, t) ? colors[i0 + 1] : colors[i0]);
      }
    }
  }

  // Paint only where predicate true (for masks).
  fill(fn) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const r = fn(x, y);
      if (r) this.set(x, y, r[0], r[1] ?? 1);
    }
  }

  // Blend every opaque pixel toward a colour (atmospheric haze).
  haze(c, t) {
    const col = rgb(c), d = this.d;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      d[i] += (col[0] - d[i]) * t; d[i + 1] += (col[1] - d[i + 1]) * t; d[i + 2] += (col[2] - d[i + 2]) * t;
    }
  }

  // Paste another Pix (or its sub-rect) at dx,dy.
  blit(src, dx, dy, flip = false) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const p = src.get(flip ? src.w - 1 - x : x, y);
      if (p && p[3]) this.set(dx + x, dy + y, p, 1);
    }
  }

  outline(c) {
    const out = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.alphaAt(x, y)) continue;
      if (this.alphaAt(x - 1, y) > 128 || this.alphaAt(x + 1, y) > 128 || this.alphaAt(x, y - 1) > 128 || this.alphaAt(x, y + 1) > 128) out.push([x, y]);
    }
    for (const [x, y] of out) this.set(x, y, c);
  }

  toCanvas() {
    const c = makeCanvas(this.w, this.h);
    c.getContext('2d').putImageData(new ImageData(this.d, this.w, this.h), 0, 0);
    return c;
  }
}

// Context helpers for per-frame drawing.
export function frect(ctx, x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

// A stepped (posterised) radial glow: crisp rings rather than smooth blur.
export function glow(ctx, x, y, r, c, alpha = 0.25, steps = 3, sy = 1) {
  ctx.fillStyle = c;
  for (let s = steps; s >= 1; s--) {
    const rr = (r * s) / steps;
    ctx.globalAlpha = alpha / steps;
    const ry = Math.max(1, rr * sy);
    // draw a pixelated ellipse row by row
    for (let j = -Math.ceil(ry); j <= Math.ceil(ry); j++) {
      const w = Math.round(rr * Math.sqrt(Math.max(0, 1 - (j * j) / (ry * ry))));
      if (w <= 0) continue;
      ctx.fillRect(Math.round(x - w), Math.round(y + j), w * 2, 1);
    }
  }
  ctx.globalAlpha = 1;
}
