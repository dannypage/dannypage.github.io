// Composes the generated assets into the diorama, back to front, for any
// time t. No state is carried between frames.
import { glow, rgba, dith, makeCanvas, mix } from './core/pixel.js';
import { h01, rng } from './core/rng.js';
import { SMALL, textToCtx, textWidth } from './core/font.js';
import { W, H, L } from './layout.js';
import { CAR } from './assets/train.js';
import { lampXs, canopyEdgeY } from './assets/foreground.js';
import { makeTimeline, T } from './sim/timeline.js';
import { crowdForVisit, personAt } from './sim/crowd.js';
import { randomSpec } from './assets/people.js';

const TAU = Math.PI * 2;

export function createScene(cfg, p, A) {
  const tl = makeTimeline(cfg);
  const P = tl.period; // every periodic motion completes whole cycles in P
  const crowdCache = new Map();
  const crowd = (k) => {
    let c = crowdCache.get(k);
    if (!c) {
      if (crowdCache.size > 8) crowdCache.clear();
      c = crowdForVisit(p, tl, tl.visit(k));
      crowdCache.set(k, c);
    }
    return c;
  };

  // --- weather particles (periodic in P) ------------------------------------
  const rainOn = p.weather === 'rain';
  const dens = p.rainDensity ?? 1;
  const mkDrops = (n, key, k, len, y0, y1, alpha, slant) => {
    const R = y1 - y0 + len;
    const speed = (k * R) / P; // whole cycles per loop
    return Array.from({ length: Math.round(n) }, (_, i) => ({
      x: h01(key, i) * W, ph: h01(key, 'ph', i), len, y0, R, speed: speed * (0.9 + 0.2 * h01(key, 'v', i)), alpha, slant,
      // speeds must stay integral cycles; quantise
    })).map((d) => ({ ...d, speed: (Math.round((d.speed * P) / d.R) * d.R) / P }));
  };
  const rainFar = rainOn ? mkDrops(240 * dens, 'rf', 110, 3, 0, 150, 0.24, -0.18) : [];
  const rainMid = rainOn ? mkDrops(210 * dens, 'rm', 170, 5, 20, 206, 0.36, -0.22) : [];
  const rainNear = rainOn ? mkDrops(120 * dens, 'rn', 230, 8, 20, 206, 0.45, -0.25) : [];
  const snowOn = p.weather === 'snow';
  const mkFlakes = (n, key, k, y0, y1, size, alpha) => Array.from({ length: n }, (_, i) => {
    const R = y1 - y0 + 4;
    return { x: h01(key, i) * W, ph: h01(key, 'ph', i), y0, R, speed: (Math.max(1, Math.round(k * (0.8 + 0.4 * h01(key, 'v', i)))) * R) / P,
      sway: 2 + h01(key, 's', i) * 5, sw: 2 + Math.floor(h01(key, 'w', i) * 5), size, alpha };
  });
  const snowFar = snowOn ? mkFlakes(160, 'sf', 16, 0, 206, 1, 0.55) : [];
  const snowNear = snowOn ? mkFlakes(60, 'sn', 24, 20, 262, 2, 0.8) : [];
  const petals = p.petals ? mkFlakes(22, 'pt', 10, 0, 262, 1, 0.9) : [];
  const leaves = p.leavesFall ? mkFlakes(14, 'lv', 9, 0, 262, 2, 0.95) : [];

  const drips = [];
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(10 + h01('drip', i) * (W - 20));
    if (Math.abs(x - L.columns[0]) < 10 || Math.abs(x - L.columns[1]) < 10) continue;
    drips.push({ x, y: canopyEdgeY(x) + 1, cyc: P / (40 + Math.floor(h01('dc', i) * 60)), ph: h01('dp', i) });
  }

  // --- traffic ---------------------------------------------------------------
  const vehicleKinds = ['sedanGrey', 'sedanBlack', 'sedanWhite', 'suvBlack', 'taxi', 'sedanRed', 'suvSilver', 'sedanBlue'];
  const lanes = [
    { y: L.deckTop - 3, laps: 9, slots: 4, stop: 0, stopX: 0, key: 'far', tint: 0.25 },
    { y: L.deckTop - 1, laps: 5, slots: 3, stop: 7, stopX: 250, key: 'near', bus: true },
  ];
  const laneLen = W + 160;

  // lane position: travel laneLen per lap, pausing `stop` seconds at stopX
  function lanePos(lane, t, slot) {
    const lap = P / lane.laps;
    const tt = ((t / lap + slot / lane.slots) % 1 + 1) % 1 * lap;
    const lapIdx = Math.floor(t / lap + slot / lane.slots);
    if (!lane.stop) return { x: -80 + (tt / lap) * laneLen, v: laneLen / lap, lapIdx, stopped: false };
    const move = lap - lane.stop;
    const v = laneLen / move;
    const tStop = (lane.stopX + 80) / v;
    const ease = 1.2; // seconds to brake / pull away
    let x, stopped = false, braking = false;
    if (tt < tStop - ease) x = -80 + v * tt;
    else if (tt < tStop) { const r = tStop - tt; x = lane.stopX - (v * r * r) / (2 * ease); braking = true; }
    else if (tt < tStop + lane.stop - ease) { x = lane.stopX; stopped = true; }
    else if (tt < tStop + lane.stop) { const r = tt - (tStop + lane.stop - ease); x = lane.stopX + (v * r * r) / (2 * ease); stopped = true; }
    else x = lane.stopX + v * ease / 2 + v * (tt - tStop - lane.stop);
    const stopFrac = tt >= tStop && tt < tStop + lane.stop ? (tt - tStop) / lane.stop : -1;
    return { x, v, lapIdx, stopped: stopped || braking, stopFrac };
  }

  // --- static light overlays ---------------------------------------------------
  const vignette = makeCanvas(W, H);
  {
    const v = vignette.getContext('2d');
    const g = v.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H * 0.45, W * 0.62);
    g.addColorStop(0, rgba(p.vignette, 0));
    g.addColorStop(1, rgba(p.vignette, 0.55));
    v.fillStyle = g; v.fillRect(0, 0, W, H);
  }

  const draw = (ctx, spec, x, y) => ctx.drawImage(A[spec].canvas, Math.round(x), Math.round(y));

  // --------------------------------------------------------------------------
  function render(ctx, tAbs) {
    const t = tl.loop ? ((tAbs % P) + P) % P : tAbs;
    const ts = tl.trainState(t);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // sky + clouds
    draw(ctx, 'sky', 0, 0);
    const off0 = ((t / P) * W) % W, off1 = ((t / P) * W * 2) % W;
    ctx.drawImage(A['clouds.far'].canvas, Math.round(-off0), 6);
    ctx.drawImage(A['clouds.far'].canvas, Math.round(W - off0), 6);
    ctx.drawImage(A['clouds.near'].canvas, Math.round(-off1), 30);
    ctx.drawImage(A['clouds.near'].canvas, Math.round(W - off1), 30);
    // monument + its aviation lights
    draw(ctx, 'monument', 386, 58);
    if (Math.floor(t / 1.5) % 2 === 0) { ctx.fillStyle = p.ledRed; ctx.fillRect(390, 62, 1, 1); glow(ctx, 390, 62, 3, p.ledRed, 0.3, 2); }

    drawPlane(ctx, t);

    // control tower + beacon
    draw(ctx, 'tower', L.towerX - 17, 12);
    const bt = t % 2;
    if (bt < 0.12) glow(ctx, L.towerX, 13, 5, '#ffffff', 0.7, 2);
    else if (bt > 1 && bt < 1.12) glow(ctx, L.towerX, 13, 5, '#7dffb0', 0.6, 2);
    if (Math.floor(t * 1.2) % 3 !== 0) { ctx.fillStyle = p.ledRed; ctx.fillRect(L.towerX, 11, 1, 1); }

    draw(ctx, 'terminal', 0, L.terminalTop);
    const mo = ((t / P) * W) % W;
    ctx.drawImage(A.mist.canvas, Math.round(mo), 100); ctx.drawImage(A.mist.canvas, Math.round(mo - W), 100);
    drawRain(ctx, rainFar, t, null);
    drawSnow(ctx, snowFar, t);

    // departures deck traffic (behind the parapet)
    drawTraffic(ctx, t);
    const deck = A.deck;
    ctx.drawImage(deck.canvas, 0, deck.y);
    drawDeckWalkers(ctx, t);
    for (let x = 44; x < W; x += 122) glow(ctx, x - 5, deck.y + 3, 10, p.lamp, 0.35, 3, 0.8);
    drawLowerRoad(ctx, t);

    const mo2 = ((t / P) * W * 2) % W;
    ctx.globalAlpha = 0.7;
    ctx.drawImage(A.mist.canvas, Math.round(-mo2), 150); ctx.drawImage(A.mist.canvas, Math.round(W - mo2), 150);
    ctx.globalAlpha = 1;
    draw(ctx, 'trees', 0, A.trees.y);
    draw(ctx, 'fence', 0, A.fence.y);
    draw(ctx, 'stationSign', A.stationSign.x, A.stationSign.y);
    draw(ctx, 'track', 0, A.track.y);
    drawRain(ctx, rainMid, t, 'track');

    // the train
    drawApproach(ctx, ts, t);
    drawTrain(ctx, ts, t);

    drawRain(ctx, rainNear, t, 'near');
    drawDrips(ctx, t);

    // platform
    draw(ctx, 'platform', 0, A.platform.y);
    drawEdgeLights(ctx, ts, t);
    drawTrainSpill(ctx, ts);
    drawReflections(ctx, t);
    drawLampPools(ctx, t);

    drawActors(ctx, t);

    // canopy, lamps, PIDS
    draw(ctx, 'canopy', 0, 0);
    drawLamps(ctx, t);
    drawPids(ctx, t);
    drawSnow(ctx, snowNear, t);
    drawFloaters(ctx, t);

    ctx.globalAlpha = 1;
    ctx.drawImage(vignette, 0, 0);
    if (p.lightning) {
      // a few flashes per loop, each a quick double flicker
      for (const at of [37, 101, 158]) {
        const d = t - at;
        if (d >= 0 && d < 0.5) {
          const a = d < 0.08 ? 0.28 : d > 0.18 && d < 0.26 ? 0.18 : 0;
          if (a) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba('#c9d6ff', a); ctx.fillRect(0, 0, W, L.platformEdge); ctx.globalCompositeOperation = 'source-over'; }
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ plane
  function drawPlane(ctx, t) {
    const k = Math.floor(t / tl.V);
    for (const kk of [k, k - 1]) {
      const v = tl.visit(kk);
      if (!v.plane) continue;
      const tau = t - v.start - v.plane.at;
      if (tau < 0 || tau > v.plane.dur) continue;
      const x = 212 + 20 * tau + 0.35 * tau * tau;
      const y = v.plane.y0 - v.plane.lift * (0.9 * tau + 0.22 * tau * tau);
      const a = Math.min(1, (v.plane.dur - tau) / 3);
      ctx.globalAlpha = a;
      draw(ctx, 'plane', x, y);
      // landing lights, beacon, strobes
      glow(ctx, x + 21, y + 6, 6, p.headlight, 0.35 * a, 3);
      ctx.fillStyle = p.headlight; ctx.fillRect(Math.round(x + 21), Math.round(y + 6), 1, 1);
      if (Math.floor(tau * 1.5) % 2 === 0) { ctx.fillStyle = p.ledRed; ctx.fillRect(Math.round(x + 12), Math.round(y + 3), 1, 1); }
      const s = (tau * 1.1) % 1;
      if (s < 0.06 || (s > 0.14 && s < 0.2)) { glow(ctx, x + 14, y + 8, 3, '#ffffff', 0.6 * a, 2); }
      ctx.globalAlpha = 1;
    }
  }

  // ------------------------------------------------------------------ traffic
  function drawTraffic(ctx, t) {
    for (const lane of lanes) {
      for (let s = 0; s < lane.slots; s++) {
        const pos = lanePos(lane, t, s);
        const lapKey = ((pos.lapIdx % lane.laps) + lane.laps) % lane.laps;
        const r = rng(cfg.seed, 'veh', lane.key, s, lapKey);
        let kind = r.pick(vehicleKinds);
        if (lane.bus && s === 0 && lapKey % 2 === 0) kind = lapKey % 4 === 0 ? 'bus' : 'shuttle';
        if (r.chance(0.12) && !(lane.bus && s === 0)) continue; // gaps in traffic
        const a = A['vehicle.' + kind];
        const x = Math.round(pos.x - a.w);
        const y = lane.y - a.h + 4;
        if (x > W || x + a.w < 0) continue;
        if (lane.tint) ctx.globalAlpha = 0.85;
        ctx.drawImage(a.canvas, x, y);
        ctx.globalAlpha = 1;
        // headlight wash through the rain ahead of the car
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = rgba(p.lamp, 0.05);
        for (let j = 0; j < 6; j++) ctx.fillRect(x + a.w, y + a.h - 6 - j, 10 + j * 5, 1);
        ctx.globalCompositeOperation = 'source-over';
        if (pos.stopped) glow(ctx, x + 1, y + a.h - 4, 4, p.tailGlow, 0.45, 2);
        if ((kind === 'bus' || kind === 'shuttle') && pos.stopped && Math.floor(t * 1.6) % 2 === 0) {
          glow(ctx, x + 1, y + 12, 3, p.led, 0.7, 2); glow(ctx, x + a.w - 2, y + 12, 3, p.led, 0.7, 2);
        }
        // a traveller with an umbrella dashes to the waiting car and hops in
        if (pos.stopFrac > 0.1 && pos.stopFrac < 0.75) {
          const f = (pos.stopFrac - 0.1) / 0.55;
          const ux = Math.round(x + a.w + 26 - f * 30), uy = L.deckTop - 6;
          umbrella(ctx, ux, uy, r.pick(umbrellaColors), f > 0.9 ? 1 - (f - 0.9) * 10 : 1, t);
        }
        if (kind === 'bus' || kind === 'shuttle') {
          // scrolling LED destination
          const msg = kind === 'bus' ? 'AIRPORT EXPRESS' : cfg.text.shuttle;
          ledMarquee(ctx, msg, x + a.w - 29, y + 1, 24, 3, t, p.led, true);
        }
      }
    }
  }

  const umbrellaColors = ['#1c1f28', '#b83a3a', '#d9a13a', '#2f4a6a', '#3a6a4a', '#6b2a6a'];
  function umbrella(ctx, x, y, col, alpha = 1, t = 0) {
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = col;
    ctx.fillRect(x - 2, y, 5, 1); ctx.fillRect(x - 3, y + 1, 7, 1);
    ctx.fillStyle = mix(col, p.lamp, 0.25); ctx.fillRect(x - 1, y, 2, 1);
    ctx.fillStyle = p.c2; ctx.fillRect(x, y + 2, 1, 3);
    ctx.fillStyle = p.c3; ctx.fillRect(x - 1, y + 3, 2, 3);
    ctx.globalAlpha = 1;
  }

  // travellers under umbrellas walking the departures curb
  const deckWalkers = Array.from({ length: 5 }, (_, i) => ({
    dir: h01('dw', i) < 0.5 ? 1 : -1, n: 2 + (i % 3), ph: h01('dwp', i), col: umbrellaColors[i % umbrellaColors.length],
  }));
  function drawDeckWalkers(ctx, t) {
    const len = W + 40;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, L.deckTop); ctx.clip();
    for (const w of deckWalkers) {
      const u = ((w.n * t) / P + w.ph) % 1;
      const x = w.dir > 0 ? -20 + u * len : W + 20 - u * len;
      const bob = Math.floor(t * 4 + w.ph * 8) % 2;
      umbrella(ctx, Math.round(x), L.deckTop - 5 - bob, w.col);
    }
    ctx.restore();
  }

  function drawLowerRoad(ctx, t) {
    const y = L.lowerRoadY + 1;
    const len = W + 80;
    for (let i = 0; i < 6; i++) {
      const k = 4 + i * 2;
      const x = W + 40 - ((h01('lr', i) * len + (k * len * t) / P) % len);
      // headlight (leading, left) + tail (right)
      ctx.fillStyle = p.headlight; ctx.fillRect(Math.round(x), y, 2, 1);
      glow(ctx, x - 4, y, 7, p.lamp, 0.25, 2, 0.5);
      ctx.fillStyle = p.tail; ctx.fillRect(Math.round(x + 16), y, 2, 1);
    }
  }

  // ------------------------------------------------------------------ weather
  function drawRain(ctx, drops, t, mode) {
    if (!drops.length) return;
    const trainCover = mode === 'track' ? trainSpan(t) : null;
    ctx.fillStyle = mode ? p.rain : p.rainFar;
    const gust = 0.07 * Math.sin((TAU * 3 * t) / P) + 0.04 * Math.sin((TAU * 7 * t) / P + 1.3);
    for (const d of drops) {
      const yy = (d.ph * d.R + d.speed * t) % d.R;
      const y = d.y0 + yy - d.len;
      let x = (d.x + yy * (d.slant + gust) + W * 4) % W;
      const bottom = d.y0 + d.R - d.len;
      if (mode === 'near' && y + d.len < canopyEdgeY(Math.round(x)) + 2) continue;
      ctx.globalAlpha = d.alpha;
      ctx.fillRect(Math.round(x), Math.round(y), 1, d.len);
      // splash on arrival
      if (mode && bottom - (y + d.len) < 3) {
        let sy = mode === 'near' ? L.platformEdge + 1 : L.trackTop + 4;
        ctx.globalAlpha = d.alpha * 0.9;
        ctx.fillRect(Math.round(x) - 1, sy - 1, 1, 1); ctx.fillRect(Math.round(x) + 1, sy - 1, 1, 1);
        ctx.fillRect(Math.round(x), sy - 2, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawSnow(ctx, flakes, t) {
    if (!flakes.length) return;
    ctx.fillStyle = p.snow ? p.snow[2] : '#fff';
    for (const f of flakes) {
      const yy = (f.ph * f.R + f.speed * t) % f.R;
      const x = (f.x + Math.sin((TAU * f.sw * t) / P + f.ph * TAU) * f.sway + W) % W;
      ctx.globalAlpha = f.alpha;
      ctx.fillRect(Math.round(x), Math.round(f.y0 + yy), f.size, f.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawFloaters(ctx, t) {
    const sets = [[petals, p.blossom], [leaves, p.leaves]];
    for (const [arr, cols] of sets) {
      if (!arr.length) continue;
      arr.forEach((f, i) => {
        const yy = (f.ph * f.R + f.speed * t) % f.R;
        const x = (f.x + Math.sin((TAU * f.sw * t) / P + f.ph * TAU) * f.sway * 3 + (yy * 0.4) + W) % W;
        const flip = Math.floor(t * 4 + i) % 2;
        ctx.fillStyle = cols[(i + flip) % cols.length];
        ctx.fillRect(Math.round(x), Math.round(f.y0 + yy), flip ? 2 : 1, flip ? 1 : 2);
      });
    }
  }

  function drawDrips(ctx, t) {
    const g = 420;
    for (const d of drips) {
      const c = ((t / d.cyc + d.ph) % 1) * d.cyc;
      const hang = d.cyc * 0.7;
      ctx.fillStyle = p.rain;
      if (c < hang) {
        ctx.globalAlpha = 0.7;
        ctx.fillRect(d.x, d.y, 1, c > hang * 0.6 ? 2 : 1);
      } else {
        const tf = c - hang;
        const y = d.y + 0.5 * g * tf * tf;
        if (y < L.platformEdge) {
          ctx.globalAlpha = 0.75;
          ctx.fillRect(d.x, Math.round(y), 1, 2);
        } else if (y < L.platformEdge + 60) {
          const sy = L.platformEdge + 1;
          ctx.globalAlpha = 0.6;
          ctx.fillRect(d.x - 2, sy - 1, 1, 1); ctx.fillRect(d.x + 2, sy - 1, 1, 1);
          ctx.fillRect(d.x - 1, sy - 2, 1, 1); ctx.fillRect(d.x + 1, sy - 2, 1, 1);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ train
  function trainSpan(t) {
    const ts = tl.trainState(t);
    if (!ts.present) return null;
    return [ts.nose - T.trainLen, ts.nose];
  }

  function drawApproach(ctx, ts, t) {
    // headlights sweeping in from the left before the nose appears
    if (ts.approach > 0) {
      const a = ts.approach;
      ctx.globalCompositeOperation = 'lighter';
      for (let j = 0; j < 14; j++) {
        const w = Math.round((30 + 170 * a) * (1 - j / 16));
        ctx.fillStyle = rgba(p.headlight, 0.05 * a);
        ctx.fillRect(0, L.platformEdge - 2 - j, w, 1);
      }
      // glints running along the wet rails
      ctx.fillStyle = rgba(p.lampHot, 0.6 * a);
      const gx = ((t * 90) % 60);
      for (let x = gx; x < 60 + 200 * a; x += 60) { ctx.fillRect(Math.round(x), L.railY, 3, 1); ctx.fillRect(Math.round(x + 20), L.railY + 4, 3, 1); }
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function carKind(c) { return c === 0 ? 'head' : c === T.cars - 1 ? 'tail' : 'mid'; }

  function drawTrain(ctx, ts, t) {
    if (!ts.present) return;
    const v = ts.visit;
    const code = v.line.code;
    const y = L.trainTop - CAR.roof + ts.dy;
    const fast = ts.speed > 140;
    const nose = Math.round(ts.nose);
    for (let c = 0; c < T.cars; c++) {
      const right = nose - c * (CAR.len + CAR.gap);
      const left = right - CAR.len;
      if (left > W || right < 0) continue;
      const a = A[`train.${code}.${carKind(c)}`];
      // bumpy ride: each car rocks on rail joints
      const bump = ts.speed > 5 && Math.floor((ts.rawNose + c * 37) / 41) % 3 === 0 ? 1 : 0;
      const yy = y + (ts.stopped ? 0 : bump);
      if (fast) {
        const sm = Math.min(6, Math.round(ts.speed / 70));
        ctx.globalAlpha = 0.35; ctx.drawImage(a.canvas, left - sm, yy);
        ctx.globalAlpha = 1;
      }
      ctx.drawImage(a.canvas, left, yy);
      if (fast) { ctx.globalAlpha = 0.25; ctx.drawImage(a.canvas, left - Math.round(ts.speed / 45), yy); ctx.globalAlpha = 1; }
      // door leaves (over the lit interior)
      for (const d of CAR.doors) {
        const dx = left + d - CAR.doorW / 2, dy = yy + CAR.doorTop;
        if (ts.doors > 0) ctx.drawImage(A['train.interior'].canvas, dx, dy);
        const o = Math.round(ts.doors * (CAR.doorW / 2 - 1));
        ctx.save();
        ctx.beginPath(); ctx.rect(dx, dy, CAR.doorW, CAR.doorH); ctx.clip();
        ctx.drawImage(A['train.door'].canvas, dx - o, dy);
        ctx.save(); ctx.translate(dx + CAR.doorW + o, dy); ctx.scale(-1, 1);
        ctx.drawImage(A['train.door'].canvas, 0, 0); ctx.restore();
        ctx.restore();
        // door chime lights
        if (ts.doorWarn && Math.floor(t * 4) % 2 === 0) {
          glow(ctx, dx + CAR.doorW / 2, dy - 2, 4, p.led, 0.6, 2);
          ctx.fillStyle = p.led; ctx.fillRect(dx + 2, dy - 2, 3, 1); ctx.fillRect(dx + CAR.doorW - 5, dy - 2, 3, 1);
        }
      }
      // side destination signs
      for (const b of a.meta.signBoxes) {
        ctx.fillStyle = p.line[code] || p.c9;
        ctx.fillRect(left + b.x + 1, yy + b.y + 2, 4, 5);
        ledMarquee(ctx, v.line.short, left + b.x + 7, yy + b.y + 2, b.w - 8, 5, t, p.led);
      }
      // head / tail lights
      if (a.meta.lights) {
        const lx = left + a.meta.lights.x, ly = yy + a.meta.lights.y;
        if (a.meta.lights.type === 'head') {
          ctx.fillStyle = p.headlight; ctx.fillRect(lx - 1, ly - 1, 3, 2);
          glow(ctx, lx, ly, 10, p.headlight, 0.55, 3);
          ctx.globalCompositeOperation = 'lighter';
          for (let j = 0; j < 10; j++) {
            ctx.fillStyle = rgba(p.headlight, 0.06 * (1 - j / 10));
            ctx.fillRect(lx + 2, ly - 2 + j, 50 + j * 16, 1);
          }
          ctx.globalCompositeOperation = 'source-over';
        } else {
          ctx.fillStyle = p.tail; ctx.fillRect(lx - 1, ly - 1, 3, 2);
          glow(ctx, lx, ly, 7, p.tailGlow, 0.5, 3);
        }
      }
      // rain splashing on the roof
      if (rainOn) {
        ctx.fillStyle = p.rain;
        for (let i = 0; i < 16; i++) {
          const sx = left + Math.floor(h01('roof', c, i) * CAR.len);
          const ph = (t * (2 + h01('rs', i) * 2) + h01('rp', i)) % 1;
          if (ph < 0.18 && sx >= 0 && sx < W) {
            ctx.globalAlpha = 0.7;
            ctx.fillRect(sx - 1, yy + CAR.roof - 2, 1, 1); ctx.fillRect(sx + 1, yy + CAR.roof - 2, 1, 1);
            ctx.fillRect(sx, yy + CAR.roof - 3, 1, 1);
          }
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  function ledMarquee(ctx, msg, x, y, w, h, t, color, tiny = false) {
    x = Math.round(x); y = Math.round(y);
    const tw = textWidth(SMALL, msg);
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, tiny ? h : 5); ctx.clip();
    let ox = 0;
    // scroll a whole number of times per loop so the marquee never jumps
    const span = tw + 12, cycles = Math.max(1, Math.round((14 * P) / span));
    if (tw > w) ox = -Math.floor(((t * cycles * span) / P) % span) + (w > 20 ? 4 : 0);
    else ox = Math.floor((w - tw) / 2);
    textToCtx(ctx, SMALL, msg, x + ox, y + (tiny ? -1 : 0), color);
    if (tw > w) textToCtx(ctx, SMALL, msg, x + ox + tw + 12, y + (tiny ? -1 : 0), color);
    ctx.restore();
  }

  function drawEdgeLights(ctx, ts, t) {
    const on = ts.edgeFlash && Math.floor(t * 2) % 2 === 0;
    for (let x = 6; x < W; x += 16) {
      ctx.fillStyle = on ? p.lampCore : p.c6;
      ctx.fillRect(x, L.platformEdge + 2, 4, 2);
      if (on) glow(ctx, x + 2, L.platformEdge + 3, 6, p.lampHot, 0.4, 2, 0.6);
    }
  }

  function drawTrainSpill(ctx, ts) {
    if (!ts.present) return;
    const nose = Math.round(ts.nose);
    ctx.globalCompositeOperation = 'lighter';
    for (let c = 0; c < T.cars; c++) {
      const right = nose - c * (CAR.len + CAR.gap), left = right - CAR.len;
      if (left > W || right < 0) continue;
      // window glow along the edge
      ctx.fillStyle = rgba(p.interior, 0.06);
      ctx.fillRect(left, L.platformEdge + 1, CAR.len, 5);
      if (ts.doors > 0) {
        for (const d of CAR.doors) {
          const cx = left + d;
          for (let j = 0; j < 30; j++) {
            const w = Math.round(CAR.doorW * ts.doors + j * 1.3);
            ctx.fillStyle = rgba(p.interior, 0.2 * ts.doors * (1 - j / 30));
            ctx.fillRect(cx - Math.round(w / 2), L.platformEdge + 1 + j, w, 1);
          }
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // Wet-floor reflection: mirror the band just above the platform edge.
  function drawReflections(ctx, t) {
    const src = ctx.canvas;
    const top = L.tileTop;
    for (let j = 0; j < 34; j++) {
      const dstY = top + j;
      const srcY = L.platformEdge - 1 - (dstY - L.platformEdge);
      if (srcY < 0) break;
      const off = Math.round(Math.sin(j * 0.9 + (TAU * 60 * t) / P) * 1.2);
      ctx.globalAlpha = 0.2 * (1 - j / 34);
      ctx.drawImage(src, 0, srcY, W, 1, off, dstY, W, 1);
    }
    ctx.globalAlpha = 1;
  }

  function lampLevel(i, t) {
    // lamp 3 is a tired fluorescent that stutters now and then
    if (i !== 3) return 1;
    const c = t % (P / 4);
    if (c > 30 && c < 31.6) return h01('flick', Math.floor(c * 14)) < 0.5 ? 0.15 : 1;
    return 1;
  }

  function drawLampPools(ctx, t) {
    ctx.globalCompositeOperation = 'lighter';
    lampXs().forEach((lx, i) => {
      const k = lampLevel(i, t);
      glow(ctx, lx, 240, 44, p.lamp, 0.15 * k, 4, 0.22);
      glow(ctx, lx, 236, 5, p.lampHot, 0.12 * k, 3, 3.5); // lamp's streaky reflection in the wet floor
    });
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawLamps(ctx, t) {
    ctx.globalCompositeOperation = 'lighter';
    lampXs().forEach((lx, i) => {
      const k = lampLevel(i, t);
      glow(ctx, lx, 10, 20, p.lamp, 0.3 * k, 4, 0.6);
      // faint cone down through the air
      for (let j = 0; j < 40; j += 1) {
        const w = 6 + j;
        ctx.fillStyle = rgba(p.lamp, 0.018 * k * (1 - j / 40));
        ctx.fillRect(lx - w / 2, 11 + j, w, 1);
      }
    });
    ctx.globalCompositeOperation = 'source-over';
    lampXs().forEach((lx, i) => {
      if (lampLevel(i, t) < 0.5) { ctx.fillStyle = p.c4; ctx.fillRect(lx - 2, 9, 5, 1); }
    });
  }

  function drawPids(ctx, t) {
    const x = L.pidsX, y = L.pidsY;
    ctx.fillStyle = p.c3;
    ctx.fillRect(x + 12, 0, 1, y); ctx.fillRect(x + A.pidsHousing.w - 13, 0, 1, y);
    draw(ctx, 'pidsHousing', x, y - 5);
    const rows = tl.pids(t);
    rows.slice(0, 2).forEach((r, i) => {
      const ry = y + 4 + i * 8;
      textToCtx(ctx, SMALL, r.line.code, x + 5, ry, p.line[r.line.code] || p.led);
      textToCtx(ctx, SMALL, r.line.short, x + 16, ry, p.led);
      const blink = r.text === 'BRD' && Math.floor(t * 1.5) % 2 === 1;
      if (!blink) textToCtx(ctx, SMALL, r.text, x + A.pidsHousing.w - 5 - textWidth(SMALL, r.text), ry, p.led);
    });
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x + A.pidsHousing.w / 2, y + 8, 50, p.led, 0.08, 3, 0.3);
    ctx.globalCompositeOperation = 'source-over';
  }

  // ------------------------------------------------------------------ actors
  const sitter = { spec: null };
  function drawActors(ctx, t) {
    const list = [];
    const k = Math.floor(t / tl.V);
    const ks = tl.loop ? [k - 1, k, k + 1] : [k - 1, k, k + 1];
    for (const kk of ks) {
      for (const person of crowd(kk)) {
        const st = personAt(person, t);
        if (st) list.push({ y: st.y, person, st });
      }
    }
    for (const cx of L.columns) list.push({ y: L.columnBase, column: cx });
    list.push({ y: L.benchY, bench: true });
    list.push({ y: L.benchY - 30, trash: true });
    for (const pg of pigeons) list.push({ y: pg.y, pigeon: pg });
    list.sort((a, b) => a.y - b.y);

    for (const it of list) {
      if (it.column != null) {
        const c = A.column;
        ctx.drawImage(c.canvas, it.column - 10, L.columnBase + 2 - c.h);
      } else if (it.bench) {
        drawSitter(ctx, t);
        ctx.drawImage(A.bench.canvas, L.benchX, L.benchY - A.bench.h);
      } else if (it.pigeon) {
        drawPigeon(ctx, it.pigeon, t);
      } else if (it.trash) {
        ctx.drawImage(A.trashCan.canvas, 456, L.benchY - 30 - 16);
      } else {
        drawPerson(ctx, it.person, it.st, t);
      }
    }
  }

  function drawPerson(ctx, person, st, t) {
    const opts = { walk: st.walk, phone: st.phone };
    const spr = A.people.get(person.spec, person.key, st.pose, st.frame, opts, st.flip);
    const x = Math.round(st.x) - spr.ax, y = Math.round(st.y) - spr.ay;
    // reflection on the wet floor
    ctx.save();
    ctx.globalAlpha = 0.14 * st.alpha;
    ctx.translate(0, Math.round(st.y) * 2 + 1);
    ctx.scale(1, -1);
    ctx.drawImage(spr.canvas, x, y);
    ctx.restore();
    ctx.globalAlpha = st.alpha;
    ctx.drawImage(spr.canvas, x, y);
    ctx.globalAlpha = 1;
    if (st.phone) {
      const hy = y + spr.canvas.height - person.spec.h + 4;
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, Math.round(st.x) + (st.pose === 'front' ? 0 : 0), hy + 3, 5, '#7fb8ff', 0.18, 2);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function drawSitter(ctx, t) {
    if (!sitter.spec) {
      // the lofi regular: headphones on, nodding along, watching the trains
      sitter.spec = { ...randomSpec(p, cfg.seed, 'sitter'), h: 28, build: 1, bag: 'none', coatLen: 'long', coat: '#3b4a3a',
        hair: '#2e2019', hairStyle: 'long', hat: 'beanie', hatColor: '#d9a13a', headphones: true, scarf: '#b83a3a' };
    }
    const s = sitter.spec;
    const seatY = L.benchY - A.bench.h;
    const frame = Math.floor(t / 0.75) % 2; // nodding at ~80 bpm
    const spr = A.people.get(s, 'sitter', 'back', frame, {}, false);
    const hip = Math.round(s.h * 0.56);
    const feet = seatY + (s.h - hip);
    const x = L.benchX + 12 - spr.ax, y = feet - spr.ay;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, seatY + 2); ctx.clip();
    ctx.drawImage(spr.canvas, x, y);
    ctx.restore();
  }

  // Two pigeons working the platform for crumbs.
  const pigeons = [{ cx: 70, y: 258, amp: 16, n: 3, ph: 0.2 }, { cx: 292, y: 262, amp: 22, n: 2, ph: 0.7 }];
  function drawPigeon(ctx, pg, t) {
    const a = (TAU * pg.n * t) / P + pg.ph * TAU;
    // hop between stops: position eased with a squared sine
    const x = Math.round(pg.cx + pg.amp * Math.sin(a) * Math.abs(Math.sin(a)));
    const vel = Math.cos(a);
    const flip = vel < 0;
    const pecking = Math.abs(vel) < 0.45 && Math.floor(t * 3 + pg.ph * 7) % 3 !== 0;
    const step = Math.floor(t * 8) % 2;
    const px = (dx, dy, c) => { ctx.fillStyle = c; ctx.fillRect(x + (flip ? -dx : dx), pg.y + dy, 1, 1); };
    const body = '#737b89', dark = '#4b5262', lite = '#9aa2b0';
    // tail + body
    px(-3, -3, dark); px(-2, -3, body); px(-1, -3, body); px(0, -3, body); px(1, -3, body);
    px(-2, -4, lite); px(-1, -4, body); px(0, -4, body);
    px(-1, -2, dark); px(0, -2, body); px(1, -2, dark);
    // head / neck
    if (pecking) { px(2, -2, '#3f6f5a'); px(3, -1, dark); px(4, -1, '#e0a060'); }
    else { px(2, -4, '#3f6f5a'); px(2, -5, dark); px(3, -5, dark); px(4, -5, '#e0a060'); px(2, -3, '#6a4a7a'); }
    // legs
    ctx.fillStyle = '#c0605a';
    ctx.fillRect(x + (flip ? 0 : 0) - (step && !pecking ? 1 : 0), pg.y - 1, 1, 1);
    ctx.fillRect(x + (flip ? -1 : 1), pg.y - 1, 1, 1);
  }

  return { render, timeline: tl, period: P };
}
