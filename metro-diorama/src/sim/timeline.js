// Train visits. Time is split into visits of `visitSeconds`; each visit is
// one train arriving, dwelling and leaving. Everything here is a pure
// function of (config, t), so any frame can be rendered in any order.
import { rng } from '../core/rng.js';
import { CAR } from '../assets/train.js';
import { W } from '../layout.js';

export const T = {
  lead: 12,         // quiet time at the start of each visit
  approach: 10,     // edge lights flash / headlight glow before the train appears
  enterSpeed: 150,  // px/s as the nose crosses the left edge
  stopX: 474,       // where the nose stops
  openDelay: 2.0,   // stopped -> doors start opening
  openDur: 1.1,
  dwell: 19,        // doors fully open
  closeDur: 1.0,
  departDelay: 2.4, // doors shut -> wheels turn
  accel: 46,        // px/s^2 leaving
  cars: 6,
};
T.trainLen = T.cars * CAR.len + (T.cars - 1) * CAR.gap;

export function makeTimeline(cfg) {
  const lines = cfg.text.lines;
  const V = cfg.visitSeconds;
  const loop = cfg.mode !== 'live';
  const liveBase = cfg.liveSeed ?? cfg.seed;
  const period = V * lines.length;

  const enterAt = T.lead + T.approach;
  const D = T.stopX + 40;
  const brakeDur = (2 * D) / T.enterSpeed;
  const decel = T.enterSpeed / brakeDur;
  const stopAt = enterAt + brakeDur;
  const openAt = stopAt + T.openDelay;
  const openedAt = openAt + T.openDur;
  const closeAt = openedAt + T.dwell;
  const closedAt = closeAt + T.closeDur;
  const departAt = closedAt + T.departDelay;
  const clearDist = W + T.trainLen - T.stopX + 20;
  const goneAt = departAt + Math.sqrt((2 * clearDist) / T.accel);

  const cache = new Map();
  function visit(k) {
    let v = cache.get(k);
    if (v) return v;
    const key = loop ? ((k % lines.length) + lines.length) % lines.length : k;
    const r = rng(loop ? cfg.seed : liveBase, 'visit', key);
    const lineIdx = loop ? key : r.int(0, lines.length - 1);
    const start = k * V;
    v = {
      k, key, start, seedKey: [loop ? cfg.seed : liveBase, key],
      line: lines[lineIdx], lineIdx,
      carNo: lineIdx,
      t: { enterAt, stopAt, openAt, openedAt, closeAt, closedAt, departAt, goneAt },
      abs: (u) => start + u,
      plane: planeFor(cfg, k, key, r, loop),
    };
    if (cache.size > 64) cache.clear();
    cache.set(k, v);
    return v;
  }

  // Train nose x at visit-relative time u.
  function noseX(u) {
    if (u < enterAt) return -40 - T.enterSpeed * (enterAt - u);
    if (u < stopAt) { const r = stopAt - u; return T.stopX - 0.5 * decel * r * r; }
    if (u < departAt) return T.stopX;
    const r = u - departAt;
    return T.stopX + 0.5 * T.accel * r * r;
  }
  function speed(u) {
    if (u < enterAt) return T.enterSpeed;
    if (u < stopAt) return decel * (stopAt - u);
    if (u < departAt) return 0;
    return T.accel * (u - departAt);
  }

  // The shudder: a damped lurch as the brakes bite, and a jerk on departure.
  function shake(u) {
    let dx = 0, dy = 0;
    const s = u - stopAt;
    if (s >= 0 && s < 2.6) {
      dx += 2.2 * Math.exp(-2.4 * s) * Math.sin(s * 9.5);
      dy += s < 0.5 ? (Math.sin(s * 40) > 0 ? 1 : 0) : 0;
    }
    const d = u - departAt;
    if (d >= 0 && d < 2.2) {
      dx += -1.6 * Math.exp(-2.8 * d) * Math.sin(d * 11);
      dy += d < 0.35 ? 1 : 0;
    }
    return { dx: Math.round(dx), dy };
  }

  function doorOpen(u) {
    const e = (x) => x * x * (3 - 2 * x);
    if (u < openAt || u >= closedAt) return 0;
    if (u < openedAt) return e((u - openAt) / T.openDur);
    if (u < closeAt) return 1;
    return 1 - e((u - closeAt) / T.closeDur);
  }

  // Everything the renderer needs about the train right now.
  function trainState(t) {
    const k = Math.floor(t / V);
    const v = visit(k);
    const u = t - v.start;
    const nose = noseX(u);
    const present = nose > -20 && nose - T.trainLen < W + 10;
    const sh = shake(u);
    return {
      visit: v, u, nose: nose + sh.dx, rawNose: nose, dy: sh.dy, present,
      speed: speed(u),
      doors: doorOpen(u),
      doorWarn: u > closeAt - 3 && u < closedAt + 0.2,
      edgeFlash: u > T.lead && u < stopAt + 1.5,
      approach: u > T.lead && u < enterAt ? (u - T.lead) / T.approach : 0,
      stopped: u >= stopAt && u < departAt,
    };
  }

  // Door centres in scene x for the stopped train of visit v.
  function doorXs() {
    const out = [];
    for (let c = 0; c < T.cars; c++) {
      const carRight = T.stopX - c * (CAR.len + CAR.gap);
      const carLeft = carRight - CAR.len;
      for (const d of CAR.doors) {
        const x = carLeft + d;
        if (x > 14 && x < W - 14) out.push(x);
      }
    }
    return out;
  }

  // PIDS rows: next arrival for each line.
  function pids(t) {
    const k0 = Math.floor(t / V);
    return lines.map((line) => {
      for (let k = k0; k < k0 + 12; k++) {
        const v = visit(k);
        if (v.line.code !== line.code) continue;
        const u = t - v.start;
        if (u > departAt) continue;
        if (u >= openAt - 1) return { line, text: 'BRD' };
        const secs = v.start + stopAt - t;
        if (secs < 40) return { line, text: 'ARR' };
        return { line, text: String(Math.max(1, Math.round(secs / 60))) };
      }
      return { line, text: '--' };
    });
  }

  return { V, period, loop, visit, trainState, doorXs, pids, noseX, T, times: { enterAt, stopAt, openAt, openedAt, closeAt, closedAt, departAt, goneAt } };
}

function planeFor(cfg, k, key, r, loop) {
  const every = Math.max(1, cfg.planeEveryVisits || 1);
  const has = loop ? key % every === 0 : r.chance(1 / every + 0.1);
  if (!has) return null;
  // take off either while the platform is quiet or during the dwell
  const at = loop ? 66 : r.pick([2, 50, 66, 72]);
  return { at, dur: 16, lift: r.float(0.9, 1.2), y0: r.int(104, 108) };
}
