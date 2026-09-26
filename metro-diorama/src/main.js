// Runtime: builds the assets, runs the render loop, handles fullscreen,
// deterministic frame export (used by tools/export.mjs) and in-browser
// recording.
import baseConfig from '../config.js';
import { makePalette, SEASON_NAMES, seasonLabel } from './palette.js';
import { buildAssets } from './assets/index.js';
import { createScene } from './scene.js';
import { W, H } from './layout.js';

function readConfig() {
  const q = new URLSearchParams(location.search);
  const cfg = structuredClone(baseConfig);
  if (q.has('season')) cfg.season = q.get('season');
  if (q.has('mode')) cfg.mode = q.get('mode');
  if (q.has('seed')) cfg.seed = Number(q.get('seed'));
  if (q.has('fps')) cfg.fps = Number(q.get('fps'));
  if (q.has('visit')) cfg.visitSeconds = Number(q.get('visit'));
  if (q.has('station')) cfg.text.station = q.get('station').split('|');
  if (q.has('dests')) q.get('dests').split('|').forEach((d, i) => { if (cfg.text.lines[i] && d) Object.assign(cfg.text.lines[i], { dest: d, short: shortName(d) }); });
  if (cfg.mode === 'live') cfg.liveSeed = q.has('seed') ? cfg.seed : Math.floor(Math.random() * 1e9);
  return { cfg, headless: q.has('headless'), q };
}

function shortName(d) {
  return d.toUpperCase().replace(/^DOWNTOWN /, '').slice(0, 12);
}

const { cfg, headless, q } = readConfig();
const palette = makePalette(cfg.season);
const view = document.getElementById('view');
const vctx = view.getContext('2d');
const frame = document.createElement('canvas');
frame.width = W; frame.height = H;
const fctx = frame.getContext('2d');

const assets = await buildAssets(palette, cfg);
const scene = createScene(cfg, palette, assets);

// ---- display sizing: largest integer scale that fits, else fit exactly
function resize() {
  const dpr = window.devicePixelRatio || 1;
  const sw = window.innerWidth * dpr, sh = window.innerHeight * dpr;
  let s = Math.min(sw / W, sh / H);
  if (s >= 1 && q.get('fit') !== 'fill') s = Math.max(1, Math.floor(s));
  view.width = Math.round(W * s); view.height = Math.round(H * s);
  view.style.width = view.width / dpr + 'px';
  view.style.height = view.height / dpr + 'px';
  vctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

function present() {
  vctx.imageSmoothingEnabled = false;
  vctx.drawImage(frame, 0, 0, view.width, view.height);
}

// ---- clock
const startOffset = q.has('t') ? Number(q.get('t')) : 0;
let t0 = performance.now();
let paused = false, pausedAt = 0;
const now = () => (paused ? pausedAt : (performance.now() - t0) / 1000 + startOffset);

let last = -1;
function loop() {
  requestAnimationFrame(loop);
  const t = now();
  const step = Math.floor(t * cfg.fps);
  if (step === last) return; // hold to the configured frame rate (crisp, choppy-in-a-good-way)
  last = step;
  scene.render(fctx, step / cfg.fps);
  present();
  hud(t);
}

// ---- small HUD (press H)
const hudEl = document.getElementById('hud');
function hud(t) {
  if (hudEl.hidden) return;
  const P = scene.period;
  hudEl.textContent = `${seasonLabel(cfg.season)} · ${cfg.mode} · t=${(t % P).toFixed(1)}/${P}s · seed ${cfg.mode === 'live' ? cfg.liveSeed : cfg.seed}\n` +
    `[F] fullscreen  [H] hud  [space] pause  [S] next season  [M] loop/live  [R] record one loop (.webm)  [P] png`;
}

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'f') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  if (k === 'h') { hudEl.hidden = !hudEl.hidden; hud(now()); }
  if (k === ' ') { if (paused) { t0 = performance.now() - (pausedAt - startOffset) * 1000; paused = false; } else { pausedAt = now(); paused = true; } }
  if (k === 's' || k === 'm') {
    const u = new URL(location.href);
    if (k === 's') u.searchParams.set('season', SEASON_NAMES[(SEASON_NAMES.indexOf(cfg.season) + 1) % SEASON_NAMES.length]);
    else u.searchParams.set('mode', cfg.mode === 'live' ? 'loop' : 'live');
    location.href = u.toString();
  }
  if (k === 'p') download(renderScaled(now(), 4).toDataURL('image/png'), `metro-${cfg.season}.png`);
  if (k === 'r') recordLoop();
});

function renderScaled(t, s) {
  scene.render(fctx, t);
  const c = document.createElement('canvas');
  c.width = W * s; c.height = H * s;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(frame, 0, 0, c.width, c.height);
  return c;
}

function download(url, name) {
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
}

// Real-time capture of exactly one loop at 1080p (browser MediaRecorder).
// For a frame-perfect master use tools/export.mjs instead.
async function recordLoop() {
  const out = document.createElement('canvas');
  out.width = 1920; out.height = 1080;
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = false;
  const stream = out.captureStream(0);
  const track = stream.getVideoTracks()[0];
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 16e6 });
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.start();
  hudEl.hidden = false;
  const P = scene.period, fps = cfg.fps;
  const total = Math.round(P * fps);
  const startWall = performance.now();
  for (let i = 0; i < total; i++) {
    scene.render(fctx, i / fps);
    octx.drawImage(frame, 0, 0, 1920, 1080);
    track.requestFrame();
    present();
    hudEl.textContent = `recording ${i}/${total}`;
    const due = startWall + ((i + 1) * 1000) / fps;
    await new Promise((r) => setTimeout(r, Math.max(0, due - performance.now())));
  }
  rec.stop();
  await new Promise((r) => (rec.onstop = r));
  download(URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })), `metro-${cfg.season}-loop.webm`);
  hudEl.textContent = 'saved';
}

// ---- API for headless export / screenshots
window.diorama = {
  ready: true,
  config: cfg,
  period: scene.period,
  fps: cfg.fps,
  renderAt(t) { scene.render(fctx, t); present(); },
  frameDataURL(t, s = 1) { return s === 1 ? (scene.render(fctx, t), frame.toDataURL('image/png')) : renderScaled(t, s).toDataURL('image/png'); },
  // raw RGBA of the native frame, base64 (fast path for the exporter)
  frameRGBA(t) {
    scene.render(fctx, t);
    const d = fctx.getImageData(0, 0, W, H).data;
    let s = '';
    const CH = 0x8000;
    for (let i = 0; i < d.length; i += CH) s += String.fromCharCode.apply(null, d.subarray(i, i + CH));
    return btoa(s);
  },
};

if (!headless) requestAnimationFrame(loop);
else { scene.render(fctx, startOffset); present(); }
