// Foreground: the platform floor, canopy vaults, columns, bench, bin,
// and the empty PIDS housing (its text is drawn live).
import { Pix, dith, mix } from '../core/pixel.js';
import { h01, rng } from '../core/rng.js';
import { W, H, L } from '../layout.js';

export function platform(p) {
  const top = L.platformEdge, h = H - top;
  const px = new Pix(W, h);
  const G = p.granite;
  // granite edge with embedded light housings
  px.hline(0, W - 1, 0, p.c1);
  for (let y = 1; y < L.tactileY - top; y++) for (let x = 0; x < W; x++) {
    const k = y === 1 ? 2 : h01('gr', x, y) < 0.3 ? 0 : 1;
    px.set(x, y, G[k]);
  }
  for (let x = 6; x < W; x += 16) { px.rect(x, 2, 4, 2, p.c5); }
  // tactile strip
  const ty = L.tactileY - top;
  px.rect(0, ty, W, 4, p.tactile);
  for (let x = 0; x < W; x += 2) px.set(x + (Math.floor(x / 2) % 2), ty + 1 + (x % 4 === 0 ? 0 : 2), p.tactileDot);
  // hexagonal quarry tiles, foreshortened: rows grow toward the camera
  const tt = L.tileTop - top;
  px.rect(0, tt, W, h - tt, p.grout);
  let y = tt, row = 0;
  while (y < h) {
    const rh = 4 + Math.floor(row / 4); // row height grows with depth
    const tw = 8 + Math.floor(row / 3) * 2;
    const off = row % 2 ? tw / 2 : 0;
    for (let x = -tw; x < W + tw; x += tw) {
      const x0 = Math.round(x + off);
      const ci = Math.floor(h01('tile', row, x0) * p.tile.length);
      const c = p.tile[ci];
      for (let j = 0; j < rh - 1; j++) {
        // hex shape: chamfer corners of first/last row
        const inset = j === 0 || j === rh - 2 ? 1 : 0;
        for (let i = inset; i < tw - 1 - inset; i++) px.set(x0 + i, y + j, c);
      }
      // top highlight on each tile (wet sheen)
      for (let i = 2; i < tw - 3; i++) if (dith(x0 + i, y, 0.2)) px.set(x0 + i, y, mix(c, p.c8, 0.2));
    }
    y += rh; row++;
  }
  // puddles (static base; reflections added live)
  const r = rng('puddles', 5);
  for (let i = 0; i < 6; i++) {
    const cx = r.int(20, W - 20), cy = r.int(16, 40), rw = r.int(12, 30), rh = r.int(2, 4);
    px.ellipse(cx, cy, rw, rh, p.c2, 0.55);
    px.hline(cx - rw + 4, cx + rw - 6, cy - rh + 1, p.c6, 0.35);
  }
  // darker toward camera
  for (let yy = 0; yy < h; yy++) {
    const f = Math.max(0, (yy - 30) / (h - 30));
    for (let x = 0; x < W; x++) if (dith(x, yy, f * 0.5)) px.set(x, yy, p.ink, 0.35);
  }
  if (p.snowCover) {
    // slush tracked along the edge
    for (let x = 0; x < W; x++) if (dith(x, ty - 1, 0.4)) px.set(x, ty - 1, p.snow[0], 0.7);
  }
  return { pix: px, y: top };
}

// Arch profile of the canopy's front edge.
export function canopyEdgeY(x) {
  const [c0, c1] = L.columns;
  const span = c1 - c0;
  const u = ((x - c0) % span + span) % span / span; // 0..1 between columns
  const s = Math.sin(u * Math.PI);
  return Math.round(L.canopyBottom - (L.canopyBottom - L.canopyApex) * Math.pow(s, 0.7));
}

export function canopy(p) {
  const h = L.canopyBottom + 16;
  const px = new Pix(W, h);
  const C = p.concrete;
  for (let x = 0; x < W; x++) {
    const ey = canopyEdgeY(x);
    // underside of the vault, with ribs following the arch
    for (let y = 0; y < ey - 5; y++) {
      let c = y < 4 ? p.c0 : p.c1;
      if (y > 3 && (y - ey + 200) % 7 === 0) c = p.c2;
      if (y > 3 && x % 24 === 0) c = p.c2;
      if (y >= ey - 8 && dith(x, y, 0.5)) c = p.c2;
      px.set(x, y, c);
    }
    // fascia band (lit from below by platform lamps)
    px.set(x, ey - 5, C[0]); px.set(x, ey - 4, C[1]); px.set(x, ey - 3, C[2]);
    px.set(x, ey - 2, C[2]); px.set(x, ey - 1, C[3]); px.set(x, ey, C[1]);
    if (h01('drip', x) < 0.25) px.set(x, ey + 1, C[0], 0.7);
  }
  // pendant lamp housings
  for (const lx of lampXs()) {
    px.vline(lx, 0, 7, p.c3);
    px.rect(lx - 3, 7, 7, 2, p.c3);
    px.hline(lx - 2, lx + 2, 9, p.lampHot);
  }
  if (p.snowCover) for (let x = 0; x < W; x++) { const ey = canopyEdgeY(x); if (dith(x, ey + 1, 0.3)) px.set(x, ey + 1, p.snow[2], 0.6); }
  return px;
}

export function lampXs() { return [40, 128, 250, 398, 470]; }

export function column(p) {
  const w = 20, h = L.columnBase - L.canopyBottom + 8;
  const px = new Pix(w, h);
  const C = p.concrete;
  const cx = 10;
  for (let y = 0; y < h; y++) {
    let hw = 5;
    if (y < 12) hw = 5 + Math.round((12 - y) * 0.45); // flared capital
    if (y > h - 8) hw = 7;
    for (let x = cx - hw; x <= cx + hw; x++) {
      const u = (x - (cx - hw)) / (2 * hw);
      let k = u < 0.2 ? 3 : u < 0.5 ? 2 : u < 0.8 ? 1 : 0;
      if (y > h - 8) k = Math.max(0, k - 1);
      px.set(x, y, C[k]);
    }
  }
  // warm light catching the column from the lamps
  for (let y = 14; y < h - 10; y++) if (dith(cx - 3, y, 0.3)) px.set(cx - 3, y, p.w3, 0.4);
  px.hline(cx - 7, cx + 7, h - 8, C[4]);
  // metro map/schedule case on the column
  px.rect(cx - 4, 70, 9, 16, p.c1);
  px.rect(cx - 3, 71, 7, 14, mix(p.c9, p.lamp, 0.25));
  for (let y = 73; y < 84; y += 2) px.hline(cx - 2, cx + 2, y, p.c5);
  px.hline(cx - 2, cx + 2, 72, p.line.BL); px.hline(cx - 2, cx + 2, 74, p.line.YL);
  return px;
}

export function bench(p) {
  // backless wooden bench on steel legs, seen from behind
  const px = new Pix(36, 10);
  px.rect(0, 0, 36, 3, p.w3); px.hline(0, 35, 0, p.w4); px.hline(0, 35, 2, p.w2);
  px.set(0, 0, p.w2); px.set(35, 0, p.w2);
  for (let x = 2; x < 34; x += 5) px.set(x, 1, p.w2, 0.6);
  for (const x of [3, 31]) { px.rect(x, 3, 2, 7, p.c3); px.vline(x, 3, 9, p.c5); }
  px.hline(3, 32, 5, p.c3);
  return px;
}

export function trashCan(p) {
  const px = new Pix(10, 16);
  px.rect(1, 2, 8, 14, p.c3); px.vline(1, 2, 15, p.c5); px.vline(8, 2, 15, p.c2);
  px.rect(0, 0, 10, 3, p.c4); px.hline(0, 9, 0, p.c6);
  px.rect(3, 1, 4, 1, p.ink);
  px.rect(2, 6, 6, 3, p.w3);
  return px;
}

export function pidsHousing(p) {
  const w = 104, h = 26;
  const px = new Pix(w, h);
  // hanging rods
  px.vline(12, 0, 5, p.c4); px.vline(w - 13, 0, 5, p.c4);
  px.rect(0, 5, w, h - 5, p.c2);
  px.rect(2, 7, w - 4, h - 9, p.pidsBody);
  px.hline(0, w - 1, 5, p.c5);
  px.hline(0, w - 1, h - 1, p.ink);
  return px;
}
