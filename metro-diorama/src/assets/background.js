// Far background: sky, clouds, distant monument, DCA control tower,
// the domed terminal, and the pickup/departures roadway deck.
import { Pix, dith, mix } from '../core/pixel.js';
import { makeNoise2D, h01, rng } from '../core/rng.js';
import { W, L } from '../layout.js';

export function sky(p) {
  const px = new Pix(W, 200);
  px.vgrad(0, 0, W, 150, p.sky);
  px.rect(0, 150, W, 50, p.sky[p.sky.length - 1]);
  // faint rain shafts hanging under the cloud deck
  for (let i = 0; i < 9; i++) {
    const x0 = Math.floor(h01(p.season, 'shaft', i) * W);
    const w = 20 + Math.floor(h01('shaftw', i) * 40);
    for (let y = 40; y < 140; y++) for (let x = x0; x < x0 + w; x++) {
      const edge = Math.min(x - x0, x0 + w - x) / (w / 2);
      if (dith(x, y, 0.18 * edge * (1 - (y - 40) / 100))) px.set(x + Math.floor((y - 40) * -0.15), y, p.cloudMid);
    }
  }
  return px;
}

// Horizontally tileable cloud strip; scrolled a whole number of widths per loop.
export function clouds(p, layer = 0) {
  const w = W, h = layer === 0 ? 90 : 70;
  const px = new Pix(w, h);
  const period = layer === 0 ? 12 : 16;
  const n = makeNoise2D(1000 + layer * 77, period);
  const n2 = makeNoise2D(2000 + layer * 31, period * 2);
  const scale = period / w;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const nx = x * scale, ny = y * scale * 1.8;
    let v = n(nx, ny) * 0.6 + n2(nx * 2, ny * 2) * 0.4;
    const band = layer === 0 ? 1 - Math.abs(y - 38) / 50 : 1 - Math.abs(y - 40) / 34;
    v = v * 0.9 + band * 0.45 - 0.35;
    // posterised bands; dither only in a thin seam between them
    const steps = layer
      ? [[0.14, p.cloudMid, 0.25], [0.28, p.cloudMid, 0.45], [0.44, p.cloudLight, 0.55]]
      : [[0.12, p.cloudDark, 0.35], [0.26, p.cloudDark, 0.7], [0.42, p.cloudMid, 0.7]];
    let pick = -1;
    for (let s = 0; s < steps.length; s++) {
      const th = steps[s][0];
      if (v > th + 0.02 || (v > th - 0.02 && dith(x, y, (v - th + 0.02) / 0.04))) pick = s;
    }
    if (pick >= 0) px.set(x, y, steps[pick][1], steps[pick][2]);
  }
  return px;
}

// Tileable band of drifting rain mist.
export function mist(p) {
  const w = W, h = 44;
  const px = new Pix(w, h);
  const n = makeNoise2D(4242, 10);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = n((x / w) * 10, y / 9) * 0.7 + n((x / w) * 20, y / 4 + 9) * 0.3;
    const fall = Math.sin((y / h) * Math.PI);
    const a = Math.max(0, (v - 0.42) * 2.2) * fall;
    if (a > 0.05) px.set(x, y, p.haze, Math.min(0.5, Math.round(a * 6) / 12));
  }
  return px;
}

// Washington Monument, hazy on the far horizon.
export function monument(p) {
  const px = new Pix(9, 60);
  const c = mix(p.haze, p.c5, 0.3), cl = mix(p.haze, p.c10, 0.2);
  for (let y = 6; y < 60; y++) {
    const half = 2.2 + (y - 6) * 0.012;
    for (let x = 0; x < 9; x++) {
      const d = x + 0.5 - 4.5;
      if (Math.abs(d) <= half) px.set(x, y, d < -0.5 ? cl : c);
    }
  }
  // pyramidion
  px.set(4, 2, c); px.hline(4, 4, 3, c); px.hline(3, 5, 4, c); px.hline(3, 5, 5, c);
  px.set(3, 4, cl); px.set(3, 5, cl);
  return px;
}

export function tower(p) {
  const w = 34, h = 120;
  const px = new Pix(w, h);
  const cx = 17;
  const T = p.tower;
  // antenna mast + dish
  px.vline(cx, 0, 12, p.c6);
  px.vline(cx + 4, 5, 12, p.c6);
  px.hline(cx - 2, cx + 2, 3, p.c7);
  px.set(cx + 5, 7, p.c7);
  // cap
  for (let y = 12; y < 18; y++) {
    const hw = 5 + Math.min(4, y - 12);
    for (let x = cx - hw; x <= cx + hw; x++) px.set(x, y, x < cx - hw / 2 ? T[4] : x > cx + hw / 2 ? T[2] : T[3]);
  }
  px.hline(cx - 9, cx + 9, 17, T[1]);
  // catwalk ring
  px.hline(cx - 12, cx + 12, 18, T[0]);
  px.hline(cx - 12, cx + 12, 19, p.c3);
  for (let x = cx - 12; x <= cx + 12; x += 2) px.set(x, 18, T[2]);
  // cab glass (slanted outward toward the top)
  for (let y = 20; y < 31; y++) {
    const hw = 12 - Math.floor((y - 20) / 4);
    for (let x = cx - hw; x <= cx + hw; x++) {
      let c = y < 23 ? p.glass[2] : p.glass[1];
      if ((x - cx + 40) % 5 === 0) c = p.c2; // mullions
      if (x > cx + hw - 3) c = p.glass[0];
      px.set(x, y, c);
    }
  }
  // warm consoles glowing inside the cab
  for (let x = cx - 8; x <= cx + 8; x += 3) px.set(x, 28, p.lamp, 0.8);
  px.hline(cx - 9, cx + 9, 29, p.interiorDim, 0.6);
  // cab underside
  for (let y = 31; y < 38; y++) {
    const hw = 11 - Math.floor((y - 31) * 0.8);
    for (let x = cx - hw; x <= cx + hw; x++) px.set(x, y, x < cx - 2 ? T[3] : x > cx + hw - 3 ? T[1] : T[2]);
  }
  px.hline(cx - 11, cx + 11, 31, T[4]);
  // ribbed shaft
  for (let y = 38; y < h; y++) {
    const hw = 6 + (y > 60 ? 1 : 0);
    const rib = (y % 3) === 0;
    for (let x = cx - hw; x <= cx + hw; x++) {
      const rel = (x - (cx - hw)) / (hw * 2);
      let k = rel < 0.25 ? 4 : rel < 0.55 ? 3 : rel < 0.8 ? 2 : 1;
      if (rib) k = Math.max(0, k - 1);
      px.set(x, y, T[k]);
    }
    // central window slot
    if (y > 44 && y % 3 !== 0) px.set(cx + 1, y, T[1]);
  }
  return px;
}

// One repeated module of the terminal: a domed bay with a trimmed arch.
function terminalModule(p, px, ox, mw, seed) {
  const R = p.terminalRoof;
  const top = 4;       // dome crown
  const archTop = 14;  // arch apex
  const archFoot = 30; // arch meets pier
  const cx = ox + mw / 2;
  for (let x = ox; x < ox + mw; x++) {
    const u = (x + 0.5 - cx) / (mw / 2); // -1..1
    const domeY = top + Math.round((1 - Math.sqrt(Math.max(0, 1 - u * u))) * 10 + u * u * 4);
    const archY = archTop + Math.round((1 - Math.sqrt(Math.max(0, 1 - u * u * 0.98))) * (archFoot - archTop));
    // roof between dome silhouette and arch
    for (let y = domeY; y < archY; y++) {
      const shade = y < domeY + 2 ? 3 : u < -0.3 ? 2 : u > 0.45 ? 0 : 1;
      px.set(x, y, R[shade]);
    }
    // ribs across the dome
    if (Math.abs(u) < 0.95 && Math.round((u + 1) * 5) % 2 === 0 && (x % 3 === 0)) {
      for (let y = domeY + 2; y < archY - 1; y++) px.set(x, y, R[0], 0.35);
    }
    // arch trim (2px warm band)
    px.set(x, archY, p.terminalTrim);
    px.set(x, archY + 1, p.terminalTrimDark);
    // glass under the arch
    for (let y = archY + 2; y < 60; y++) {
      let c = y < archY + 5 ? p.glass[2] : p.glass[1];
      if (y === archY + 5 && dith(x, y, 0.5)) c = p.glass[2];
      if ((x - ox) % 8 === 4 && y > archY + 3) c = p.glass[0];
      px.set(x, y, c);
    }
  }
  // lantern on the crown
  px.rect(cx - 2, top - 3, 4, 3, R[2]);
  px.hline(cx - 2, cx + 1, top - 3, R[3]);
  px.set(cx - 1, top - 4, R[2]);
  // piers between bays
  px.rect(ox - 1, archFoot - 2, 3, 30, p.concrete[3]);
  px.vline(ox - 1, archFoot - 2, 58, p.concrete[4]);
}

export function terminal(p) {
  const w = W, h = 62;
  const px = new Pix(w, h);
  const mw = 48;
  for (let k = -1; k <= w / mw + 1; k++) terminalModule(p, px, k * mw + 10, mw, k);
  // long roof beam across glass
  px.hline(0, w - 1, 34, p.concrete[4]);
  px.hline(0, w - 1, 35, p.concrete[2]);
  // curtain wall mullions + warm interior below the beam
  for (let x = 0; x < w; x++) {
    for (let y = 36; y < h; y++) {
      let c = null;
      if (y >= 37 && y < 40) c = p.interiorShade;      // ceiling
      else if (y >= 40 && y < 44) c = p.interiorDim;   // lit hall
      else if (y >= 44) c = dith(x, y, 0.5) ? p.interiorDim : p.interiorShade;
      if (c) px.set(x, y, c, 0.85);
      if (x % 6 === 0) px.set(x, y, p.c3);
    }
    if (x % 12 === 3) { px.set(x, 38, p.lampHot); px.set(x + 1, 38, p.lamp, 0.8); }
  }
  // silhouettes of travellers inside
  const r = rng('terminal-people', p.season);
  for (let i = 0; i < 38; i++) {
    const x = r.int(0, w - 3), hh = r.int(5, 8);
    px.rect(x, h - hh, 2, hh, p.w1, 0.85);
    px.set(x, h - hh - 1, p.w1, 0.85);
  }
  // atmospheric perspective
  px.haze(p.haze, p.night ? 0.12 : 0.22);
  if (p.snowCover) {
    for (let x = 0; x < w; x++) for (let y = 0; y < 30; y++) {
      const a = px.alphaAt(x, y), above = px.alphaAt(x, y - 1);
      if (a && !above) { px.set(x, y, p.snow[2]); px.set(x, y + 1, p.snow[1]); break; }
    }
  }
  return px;
}

// Roadway deck: parapet, lamp posts, underside, columns, walkway shells.
export function deck(p) {
  const w = W, top = L.deckTop - 22, h = 60;
  const px = new Pix(w, h);
  const y0 = L.deckTop - top; // parapet top within sprite
  const C = p.concrete;
  // lamp posts rising above the parapet
  for (let x = 44; x < w; x += 122) {
    px.vline(x, 0, y0, p.c3);
    px.hline(x - 4, x, 1, p.c3);
    px.rect(x - 7, 1, 4, 2, p.c2);
  }
  // parapet
  px.hline(0, w - 1, y0, C[4]);
  px.hline(0, w - 1, y0 + 1, C[3]);
  px.rect(0, y0 + 2, w, 9, C[2]);
  for (let x = 0; x < w; x++) {
    // rain stains running down
    if (h01('stain', x) < 0.25) {
      const len = 2 + Math.floor(h01('stainl', x) * 8);
      for (let y = y0 + 2; y < y0 + 2 + len; y++) px.set(x, y, C[1], 0.7);
    }
    if (x % 40 === 0) px.vline(x, y0 + 1, y0 + 10, C[1]); // expansion joints
  }
  px.hline(0, w - 1, y0 + 11, C[0]);
  // beam
  px.rect(0, y0 + 12, w, 3, C[1]);
  px.hline(0, w - 1, y0 + 15, p.c1);
  // underside void
  px.rect(0, y0 + 16, w, h - y0 - 16, p.c1);
  px.dither(0, y0 + 16, w, 4, p.c0, 0.5);
  // columns
  for (let x = 30; x < w; x += 70) {
    px.rect(x, y0 + 16, 7, h - y0 - 16, p.c3);
    px.vline(x, y0 + 16, h - 1, p.c4);
    px.vline(x + 6, y0 + 16, h - 1, p.c2);
  }
  // curved walkway canopies (the pale green shells from the lower level)
  for (let k = 0; k < 7; k++) {
    const x0 = 36 + k * 70, sw = 64;
    for (let x = x0; x < x0 + sw; x++) {
      const u = (x - x0) / sw;
      const y = y0 + 28 - Math.round(Math.sin(u * Math.PI) * 5);
      px.set(x, y, p.walkway[2]); px.set(x, y + 1, p.walkway[1]); px.set(x, y + 2, p.walkway[0], 0.8);
    }
  }
  // warm lamps under the deck
  for (let x = 60; x < w; x += 70) {
    px.set(x, y0 + 17, p.lampHot); px.set(x + 1, y0 + 17, p.lamp);
    for (let dy = 1; dy < 7; dy++) px.dither(x - dy, y0 + 17 + dy, 2 + dy * 2, 1, p.sodium, 0.35 - dy * 0.04, 0.35);
  }
  px.haze(p.haze, p.night ? 0.05 : 0.12);
  if (p.snowCover) { px.hline(0, w - 1, y0 - 1, p.snow[2]); px.hline(0, w - 1, y0, p.snow[1]); }
  return { pix: px, y: top };
}
