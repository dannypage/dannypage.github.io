// Metrorail car sprites (side view, travelling left -> right).
// Door leaves and the lit interior behind them are separate sprites so the
// scene can slide the doors open.
import { Pix, dith, mix } from '../core/pixel.js';
import { h01, rng } from '../core/rng.js';
import { SMALL, textToPix, textWidth } from '../core/font.js';

export const CAR = {
  len: 300,
  h: 58,
  roof: 6,              // local y of roof line
  doors: [48, 150, 252], // door centres
  doorW: 20,
  doorTop: 18,          // local y (floor is at local 54)
  doorH: 36,
  gap: 4,
  winTop: 20, winH: 15, // window band (local y)
  stripe: 38,           // red/white/blue stripe (local y)
  signH: 9,
};

const r0 = CAR.roof;

function windowPane(px, p, x0, y0, w, h, seed) {
  // frame
  for (let y = y0 - 1; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) px.set(x, y, p.rubber);
  const r = rng('pane', seed);
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const f = (y - y0) / h;
    let c = f < 0.2 ? p.interior : dith(x, y, 0.5 - f * 0.4) ? p.interior : p.interiorDim;
    px.set(x, y, c);
  }
  // seat backs + passengers
  px.rect(x0, y0 + h - 4, w, 4, p.interiorShade);
  for (let x = h >= 10 ? x0 + 2 : 1e9; x < x0 + w - 4; x += r.int(5, 9)) {
    if (!r.chance(0.55)) continue;
    const hc = r.pick([p.w0, p.w1, '#2a2020', '#3a2a22']);
    const hy = y0 + h - 9 + r.int(-1, 1);
    px.rect(x, hy, 3, 3, hc); px.set(x + 1, hy - 1, hc);
    px.rect(x - 1, hy + 3, 5, 6, r.pick([p.w1, p.c2, p.c3, '#4a2a2a']));
  }
  // glass tint + reflections of the grey sky
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    px.set(x, y, p.glass[1], 0.28);
    const diag = (x - x0 + (y0 + h - y)) % 17;
    if (diag < 2) px.set(x, y, p.c10, 0.22);
  }
  // rounded corners
  px.set(x0, y0, p.rubber); px.set(x0 + w - 1, y0, p.rubber);
  px.set(x0, y0 + h - 1, p.rubber); px.set(x0 + w - 1, y0 + h - 1, p.rubber);
}

function body(p, kind, seed) {
  const Lc = CAR.len, S = p.steel;
  const px = new Pix(Lc, CAR.h);
  const cabRight = kind === 'head';
  const endX = (r) => {
    // sloped cab nose at the right end
    if (!cabRight) return Lc - 1;
    if (r < 22) return Lc - 1 - Math.round((22 - r) * 0.45);
    return Lc - 1;
  };
  const startX = (r) => (r < 2 ? 2 - r : 0);
  for (let r = 0; r < CAR.h - r0; r++) {
    const y = r + r0;
    for (let x = startX(r); x <= endX(r) - (r < 2 && !cabRight ? 2 - r : 0); x++) {
      let c;
      if (r === 0) c = S[4];
      else if (r < 4) c = r === 1 ? S[3] : S[2];
      else if (r === 4) c = S[0];
      else if (y < CAR.stripe) c = S[4];
      else if (y === CAR.stripe) c = p.stripeRed;
      else if (y === CAR.stripe + 1) c = p.stripeWhite;
      else if (y === CAR.stripe + 2) c = p.stripeBlue;
      else if (y < 52) c = dith(x, y, (y - 42) / 10) ? S[2] : S[3];
      else if (y < 54) c = S[1];
      else c = p.c2;
      // brushed steel grain + rain streaks
      if (r > 4 && y < 52 && (y < CAR.stripe || y > CAR.stripe + 2)) {
        if (x % 3 === 0 && dith(x, y, 0.25)) c = mix(c, S[1], 0.3);
        if (h01('streak', seed, x) < 0.06 && y > CAR.stripe) c = mix(c, S[1], 0.5);
      }
      px.set(x, y, c);
    }
  }
  // car-end frames
  if (!cabRight) px.vline(Lc - 1, r0 + 3, 53, S[0]);
  px.vline(0, r0 + 3, 53, S[1]);
  // roof equipment
  for (const ax of [36, 196]) {
    px.rect(ax, r0 - 4, 60, 4, S[1]); px.hline(ax, ax + 59, r0 - 4, S[3]);
    for (let x = ax + 4; x < ax + 56; x += 8) px.rect(x, r0 - 3, 4, 2, S[0]);
  }
  // windows between doors
  const d = CAR.doors, hw = CAR.doorW / 2;
  const segs = [[4, d[0] - hw - 4], [d[0] + hw + 4, d[1] - hw - 4], [d[1] + hw + 4, d[2] - hw - 4], [d[2] + hw + 4, Lc - 5]];
  segs.forEach(([a, b], i) => {
    const wlen = b - a;
    if (i === 0 || i === 3) {
      // end segment: LED side sign (drawn live) above a small window
      const isCabSeg = cabRight && i === 3;
      if (isCabSeg) {
        windowPane(px, p, a + 2, CAR.winTop, wlen - 16, CAR.winH - 3, seed * 10 + i);
      } else {
        px.rect(a + 1, CAR.winTop - 1, wlen - 2, CAR.signH + 2, p.rubber);
        px.rect(a + 2, CAR.winTop, wlen - 4, CAR.signH, p.pidsBody);
        windowPane(px, p, a + 2, CAR.winTop + CAR.signH + 2, wlen - 4, CAR.winH - CAR.signH - 2, seed * 10 + i);
      }
    } else {
      const n = 2, gapW = 4;
      const pw = Math.floor((wlen - gapW) / n);
      for (let k = 0; k < n; k++) windowPane(px, p, a + k * (pw + gapW), CAR.winTop, pw, CAR.winH, seed * 10 + i * 3 + k);
    }
  });
  // door frames (recess)
  for (const dc of d) {
    const x0 = dc - hw - 1, x1 = dc + hw;
    px.rect(x0, CAR.doorTop - 1, x1 - x0 + 1, CAR.doorH + 1, p.rubber);
    px.hline(x0 - 1, x1 + 1, CAR.doorTop - 2, S[2]);
  }
  // cab details
  if (cabRight) {
    // windshield along the slope
    for (let r = 3; r < 26; r++) {
      const ex = endX(r);
      for (let x = ex - 5; x < ex; x++) px.set(x, r + r0, r < 24 ? p.glass[0] : p.rubber);
      px.set(ex, r + r0, S[5]);
    }
    for (let r = 5; r < 22; r++) px.set(endX(r) - 3, r + r0, p.c9, 0.3);
    // headlight housing + marker
    px.rect(Lc - 7, 43, 6, 4, p.rubber);
    px.rect(Lc - 6, 44, 4, 2, p.c10);
    px.rect(Lc - 3, 48, 3, 5, S[0]);
  }
  // M logo + car number
  px.rect(97, 42, 7, 7, p.rubber);
  textToPix(px, SMALL, 'M', 98, 43, p.white);
  return px;
}

export function car(p, line, kind, carNo) {
  const seed = (carNo || 7000) + (kind === 'head' ? 1 : kind === 'tail' ? 2 : 0);
  let px = body(p, kind === 'tail' ? 'head' : kind, seed);
  if (kind === 'tail') {
    const f = new Pix(px.w, px.h);
    f.blit(px, 0, 0, true);
    px = f;
  }
  // text that must not be mirrored
  const num = String(carNo || 7000 + seed % 999);
  const nx = kind === 'tail' ? CAR.len - 30 - textWidth(SMALL, num) : 26;
  textToPix(px, SMALL, num, nx, 44, p.steel[1]);
  if (p.snowCover) {
    for (let x = 2; x < CAR.len - 2; x++) { px.set(x, r0 - 1, p.snow[2]); if (dith(x, 0, 0.5)) px.set(x, r0 - 2, p.snow[1]); }
  }
  // metadata: sign boxes (local coords) for live LED text, light positions
  const signBoxes = [];
  const d = CAR.doors, hw = CAR.doorW / 2;
  const leftSeg = [4, d[0] - hw - 4], rightSeg = [d[2] + hw + 4, CAR.len - 5];
  const add = ([a, b]) => signBoxes.push({ x: a + 2, y: CAR.winTop, w: b - a - 4, h: CAR.signH });
  if (kind === 'head') add(leftSeg);
  else if (kind === 'tail') add(rightSeg);
  else { add(leftSeg); add(rightSeg); }
  const lights = kind === 'head' ? { x: CAR.len - 4, y: 45, type: 'head' }
    : kind === 'tail' ? { x: 3, y: 45, type: 'tail' } : null;
  return { pix: px, meta: { signBoxes, lights, line: line.code } };
}

export function doorLeaf(p) {
  const w = CAR.doorW / 2, h = CAR.doorH;
  const S = p.steel;
  const px = new Pix(w, h);
  px.rect(0, 0, w, h, S[4]);
  px.vline(0, 0, h - 1, S[2]);
  px.hline(0, w - 1, 0, S[5]);
  // window
  const wt = CAR.winTop - CAR.doorTop, st = CAR.stripe - CAR.doorTop;
  px.rect(2, wt - 1, w - 4, CAR.winH + 1, p.rubber);
  for (let y = wt; y < wt + CAR.winH - 1; y++) for (let x = 3; x < w - 2; x++) {
    px.set(x, y, (y < wt + 3 ? p.interior : p.interiorDim));
    px.set(x, y, p.glass[1], 0.3);
    if ((x + (wt + 15 - y)) % 9 < 1) px.set(x, y, p.c10, 0.25);
  }
  // kick panel + stripe continues on doors
  px.hline(0, w - 1, st, p.stripeRed); px.hline(0, w - 1, st + 1, p.stripeWhite); px.hline(0, w - 1, st + 2, p.stripeBlue);
  px.rect(1, h - 6, w - 2, 5, S[3]);
  px.hline(0, w - 1, h - 1, S[0]);
  return px;
}

// What you see through an open doorway: lit vestibule, pole, far-side windows.
export function doorInterior(p) {
  const w = CAR.doorW, h = CAR.doorH;
  const px = new Pix(w, h);
  px.vgrad(0, 0, w, h - 6, [p.lampCore, p.interior, p.interior, p.interiorDim]);
  // opposite doors with grey daylight through their windows
  px.rect(3, 4, 14, 26, p.interiorShade);
  px.rect(4, 5, 5, 11, p.c7); px.rect(11, 5, 5, 11, p.c7);
  px.dither(4, 5, 12, 11, p.c9, 0.3);
  px.vline(10, 4, 30, p.interiorDim);
  // floor
  px.rect(0, h - 7, w, 7, p.w2);
  px.hline(0, w - 1, h - 7, p.w3);
  px.dither(0, h - 4, w, 4, p.w1, 0.5);
  // grab pole
  px.vline(13, 0, h - 7, p.c11); px.vline(14, 0, h - 7, p.c7);
  // ceiling light strip
  px.hline(0, w - 1, 1, p.lampCore);
  return px;
}
