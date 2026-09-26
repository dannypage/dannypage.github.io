// Background traffic on the departures deck (kept soft and hazy so it
// reads as out of focus) and the plane that climbs out over the terminal.
import { Pix, mix } from '../core/pixel.js';
import { SMALL, textToPix } from '../core/font.js';

function sedan(p, color, opts = {}) {
  const w = opts.len || 26, h = opts.tall ? 13 : 11;
  const px = new Pix(w, h);
  const dark = mix(color, p.ink, 0.35), lite = mix(color, p.c12, 0.3);
  const roofY = opts.tall ? 1 : 3;
  // cabin
  const cab0 = opts.tall ? 3 : 6, cab1 = w - (opts.tall ? 6 : 8);
  for (let y = roofY; y < roofY + 5; y++) {
    const inset = y === roofY ? 2 : y === roofY + 1 ? 1 : 0;
    const f = opts.tall ? 0 : (roofY + 5 - y);
    for (let x = cab0 + inset - (opts.tall ? 0 : Math.floor(f / 2)); x <= cab1 - inset + (opts.tall ? 0 : Math.floor(f / 1.5)); x++) px.set(x, y, color);
  }
  // windows
  for (let y = roofY + 1; y < roofY + 5; y++) {
    for (let x = cab0 + 1; x <= cab1 - 1; x++) px.set(x, y, p.glass[0]);
  }
  px.vline(Math.floor((cab0 + cab1) / 2), roofY + 1, roofY + 4, color);
  px.hline(cab0 + 2, cab1 - 2, roofY + 1, p.c7, 0.5);
  px.hline(cab0 + 1, cab1 - 1, roofY, lite);
  // body
  px.rect(0, roofY + 5, w, h - roofY - 5, color);
  px.hline(0, w - 1, roofY + 5, lite);
  px.rect(0, h - 2, w, 2, dark);
  // lamps
  px.rect(w - 2, roofY + 6, 2, 2, p.headlight);
  px.rect(0, roofY + 6, 2, 2, p.tail);
  if (opts.taxi) { px.rect(Math.floor(w / 2) - 2, roofY - 2, 5, 2, p.lamp); px.hline(0, w - 1, roofY + 7, p.c9); }
  px.haze(p.haze, 0.18);
  return px;
}

function bus(p, opts = {}) {
  const w = opts.len || 64, h = 20;
  const px = new Pix(w, h);
  const body = p.c12, stripe = opts.stripe || p.line.BL;
  px.rect(0, 1, w, h - 1, body);
  px.hline(1, w - 2, 0, body);
  px.hline(0, w - 1, 1, p.white);
  // windows band
  px.rect(3, 4, w - 8, 6, p.glass[0]);
  for (let x = 3; x < w - 8; x += 9) px.vline(x, 4, 9, body);
  // lit interior
  for (let x = 4; x < w - 9; x++) if ((x * 7) % 5 < 2) px.set(x, 5, p.interior, 0.5);
  // windshield + LED destination box
  px.rect(w - 5, 3, 4, 9, p.glass[1]);
  px.rect(w - 30, 1, 26, 3, p.pidsBody);
  // livery stripe
  px.rect(0, 11, w, 3, stripe);
  px.hline(0, w - 1, 14, p.c9);
  px.rect(0, 15, w, h - 15, p.c10);
  px.rect(w - 2, 15, 2, 2, p.headlight);
  px.rect(0, 12, 2, 3, p.tail);
  px.haze(p.haze, 0.15);
  return px;
}

export function vehicleRecipes(p, cfg) {
  return {
    sedanGrey: () => sedan(p, '#7d8390'),
    sedanBlack: () => sedan(p, '#23262e'),
    sedanWhite: () => sedan(p, '#c9ccd2'),
    sedanRed: () => sedan(p, '#8e2e33'),
    sedanBlue: () => sedan(p, '#34507a'),
    suvBlack: () => sedan(p, '#1d2027', { tall: true, len: 28 }),
    suvSilver: () => sedan(p, '#9ea3ad', { tall: true, len: 28 }),
    taxi: () => sedan(p, '#b1373a', { taxi: true }),
    bus: () => bus(p),
    shuttle: () => bus(p, { len: 48, stripe: '#3a7a5a' }),
  };
}

export function plane(p) {
  const w = 24, h = 9;
  const px = new Pix(w, h);
  const hull = p.c12, belly = p.c9;
  // fuselage
  px.rect(3, 4, 19, 3, hull);
  px.hline(4, 21, 6, belly);
  px.hline(22, 22, 5, hull); px.set(23, 5, belly);
  // tail fin + stabiliser
  px.vline(3, 0, 4, hull); px.vline(4, 1, 4, hull); px.vline(5, 2, 4, hull);
  px.hline(0, 4, 5, hull);
  // windows
  for (let x = 8; x < 20; x += 2) px.set(x, 4, p.c6);
  // wing + engine
  px.line(10, 6, 14, 8, p.c7); px.line(11, 6, 15, 8, p.c8);
  px.rect(14, 7, 3, 2, p.c6);
  px.haze(p.haze, 0.3);
  return px;
}
