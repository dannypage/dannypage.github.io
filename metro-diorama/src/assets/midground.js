// Midground: chain-link fence and overgrowth, trees (seasonal), the
// station pylon, and the track bed.
import { Pix, dith, mix } from '../core/pixel.js';
import { makeNoise2D, h01, rng } from '../core/rng.js';
import { SIGN, SMALL, textWidth, textToPix } from '../core/font.js';
import { W, L } from '../layout.js';

export function fence(p) {
  const top = L.fenceTop, h = L.trackTop - top + 2;
  const px = new Pix(W, h);
  const n = makeNoise2D(77, 24);
  const F = p.foliage;
  // chain link: diamond lattice
  for (let y = 2; y < h - 3; y++) for (let x = 0; x < W; x++) {
    if (((x + y) % 4 === 0) || ((x - y + 400) % 4 === 0)) px.set(x, y, p.c5, 0.45);
  }
  // posts + rails
  for (let x = 8; x < W; x += 48) { px.rect(x, 0, 2, h - 2, p.c4); px.vline(x, 0, h - 2, p.c6); }
  px.hline(0, W - 1, 1, p.c6); px.hline(0, W - 1, 2, p.c3);
  // overgrowth pushing through the fence
  for (let x = 0; x < W; x++) {
    const v = n(x / 20, 0.5) * 0.7 + n(x / 6, 3.3) * 0.3;
    const hgt = Math.floor(4 + v * 16);
    for (let y = h - hgt; y < h; y++) {
      const d = (y - (h - hgt)) / hgt;
      const leaf = n(x / 3, y / 3) ;
      let k = d < 0.25 ? 3 : d < 0.6 ? 2 : 1;
      if (leaf > 0.62) k = Math.min(4, k + 1);
      if (leaf < 0.3) k = Math.max(0, k - 1);
      if (y === h - hgt && !dith(x, y, 0.6)) continue;
      px.set(x, y, F[k]);
    }
    if (p.snowCover) {
      const y = h - hgt; px.set(x, y, p.snow[1]); if (dith(x, y, 0.5)) px.set(x, y + 1, p.snow[0]);
    }
  }
  // low concrete curb at track side
  px.hline(0, W - 1, h - 2, p.c4); px.hline(0, W - 1, h - 1, p.c2);
  return { pix: px, y: top };
}

// A few ornamental trees between the deck and the fence (cherry trees in spring).
export function trees(p) {
  const h = 76, px = new Pix(W, h);
  const baseY = h - 1;
  const n = makeNoise2D(9, 16);
  const cols = p.blossom || p.foliage;
  const spots = [[246, 22], [296, 18], [470, 24]];
  spots.forEach(([tx, size], ti) => {
    const r = rng('tree', ti);
    const crownY = baseY - 30 - size;
    // trunk and a couple of limbs
    for (let y = crownY + 6; y < baseY; y++) { px.set(tx, y, p.w0); px.set(tx + 1, y, p.c1); }
    px.line(tx, crownY + 16, tx - 7, crownY + 6, p.w0);
    px.line(tx + 1, crownY + 14, tx + 8, crownY + 4, p.w0);
    if (p.snowCover) {
      px.line(tx - 7, crownY + 6, tx - 12, crownY - 2, p.w0); px.line(tx + 8, crownY + 4, tx + 13, crownY - 4, p.w0);
      px.line(tx, crownY + 6, tx + 1, crownY - 6, p.w0);
      for (let i = 0; i < 14; i++) px.set(tx - 11 + r.int(0, 24), crownY - 5 + r.int(0, 12), p.snow[1]);
      return;
    }
    // crown built from overlapping blobs, lit from the upper left
    const blobs = [[0, 0, size * 0.62]];
    for (let i = 0; i < 6; i++) blobs.push([r.float(-0.7, 0.7) * size, r.float(-0.5, 0.45) * size, r.float(0.32, 0.5) * size]);
    for (let y = crownY - size; y < crownY + size; y++) for (let x = tx - size * 1.6; x < tx + size * 1.6; x++) {
      let best = -1, lit = 0;
      for (const [bx, by, br] of blobs) {
        const dx = x - (tx + bx), dy = y - (crownY + by);
        const d = Math.sqrt(dx * dx + dy * dy) / br;
        if (d < 1 && 1 - d > best) { best = 1 - d; lit = (-dx - dy) / br; }
      }
      if (best < 0) continue;
      const rough = n(x / 3, y / 3);
      if (best < 0.12 && rough < 0.5) continue;
      let k = 2 + Math.round(lit * 1.3 + (rough - 0.5) * 1.6);
      k = Math.max(0, Math.min(4, k));
      if (y > crownY + size * 0.4) k = Math.max(0, k - 1);
      px.set(Math.floor(x), y, cols[k]);
    }
  });
  px.haze(p.haze, 0.15);
  return { pix: px, y: L.fenceTop + 18 - h };
}

// Station name pylon on two posts, as seen across the tracks in the photos.
export function stationSign(p, text) {
  const lines = text.station;
  const t1 = textWidth(SIGN, lines[0]), t2 = textWidth(SIGN, lines[1] || '');
  const subs = text.lines.map((l) => l.dest.toUpperCase());
  const subW = subs.reduce((s, t) => s + textWidth(SMALL, t) + 16, 0);
  const bw = Math.max(t1, t2, subW) + 12, bh = 36;
  const h = L.trackTop - L.signY;
  const px = new Pix(bw, h);
  // posts
  for (const x of [14, bw - 16]) {
    px.rect(x, bh - 2, 3, h - bh + 2, p.c2); px.vline(x, bh - 2, h - 1, p.c4);
  }
  // board
  px.rect(0, 0, bw, bh, p.signBoard);
  px.hline(0, bw - 1, 0, p.signEdge); px.vline(0, 0, bh - 1, p.signEdge);
  px.hline(0, bw - 1, bh - 1, p.ink); px.vline(bw - 1, 0, bh - 1, p.ink);
  textToPix(px, SIGN, lines[0], 6, 4, p.signText);
  if (lines[1]) textToPix(px, SIGN, lines[1], 6, 14, p.signText);
  // divider + line bullets
  px.hline(4, bw - 5, 25, p.signEdge);
  let x = 6;
  text.lines.forEach((l, i) => {
    const col = p.line[l.code] || p.c9;
    px.ellipse(x + 2.5, 30.5, 2.5, 2.5, col);
    x += 7;
    x += textToPix(px, SMALL, subs[i], x, 28, p.signText) + 9;
  });
  // wet sheen on the top edge
  px.hline(1, bw - 2, 1, p.c5, 0.5);
  return { pix: px, x: L.signX, y: L.signY };
}

export function track(p) {
  const top = L.trackTop, h = L.platformEdge - top + 2;
  const px = new Pix(W, h);
  px.rect(0, 0, W, h, p.c1);
  for (let x = 0; x < W; x++) for (let y = 0; y < h; y++) {
    if (h01('ballast', x, y) < 0.18) px.set(x, y, p.c3);
  }
  // third-rail cover board
  px.hline(0, W - 1, 1, p.c7); px.hline(0, W - 1, 2, p.c4);
  for (let x = 0; x < W; x += 30) px.rect(x, 3, 2, 2, p.c3);
  // running rails (far + near) with wet highlights
  const ry = L.railY - top;
  px.hline(0, W - 1, ry, p.c8); px.hline(0, W - 1, ry + 1, p.c4);
  px.hline(0, W - 1, ry + 4, p.c9); px.hline(0, W - 1, ry + 5, p.c4);
  // ties peeking between
  for (let x = 0; x < W; x += 6) { px.set(x, ry + 2, p.w1); px.set(x + 1, ry + 2, p.w1); px.set(x, ry + 3, p.w0); px.set(x + 1, ry + 3, p.w0); }
  if (p.snowCover) for (let x = 0; x < W; x++) if (dith(x, 0, 0.6)) px.set(x, 3, p.snow[0]);
  return { pix: px, y: top };
}
