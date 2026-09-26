#!/usr/bin/env node
// Frame-perfect exporter. Renders one full loop headlessly (Playwright +
// Chromium), pipes the native 480x270 frames into ffmpeg, upscales with
// nearest-neighbour to 1080p, then (optionally) stream-copies the loop into
// a long video without re-encoding.
//
//   npm i -D playwright            # once (uses your installed Chromium if PLAYWRIGHT_CHROMIUM is set)
//   node tools/export.mjs                       # out/metro-rain-loop.mp4 (one 3-minute loop)
//   node tools/export.mjs --hours 10            # + out/metro-rain-10h.mp4 (stream copy)
//   node tools/export.mjs --season snow --format gif --scale 2
//   node tools/export.mjs --format frames       # PNG sequence in out/frames-<season>/
//
// Options:
//   --season rain|storm|snow|spring|autumn|night   --seed N   --fps 30
//   --scale 4 (4 = 1920x1080, 8 = 3840x2160)   --format mp4|webm|gif|frames
//   --hours H   --out DIR   --ffmpeg /path/to/ffmpeg   --seconds S (render only S seconds, for tests)
import { spawn } from 'child_process';
import { createRequire } from 'module';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---- args
const args = { season: 'rain', fps: 30, scale: 4, format: 'mp4', out: path.join(root, 'out'), ffmpeg: process.env.FFMPEG || 'ffmpeg' };
for (let i = 2; i < process.argv.length; i++) {
  const k = process.argv[i].replace(/^--/, '');
  args[k] = process.argv[i + 1]; i++;
}
const fps = Number(args.fps), scale = Number(args.scale);
fs.mkdirSync(args.out, { recursive: true });

let chromium;
for (const m of ['playwright', 'playwright-core', '/opt/node22/lib/node_modules/playwright']) {
  try { ({ chromium } = require(m)); break; } catch { /* next */ }
}
if (!chromium) { console.error('Playwright not found. Run: npm i -D playwright && npx playwright install chromium'); process.exit(1); }

// ---- static server for the page
const types = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(p, (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
    res.end(d);
  });
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('[page]', e.message));
const q = new URLSearchParams({ headless: '1', mode: 'loop', season: args.season, fps: String(fps) });
if (args.seed) q.set('seed', args.seed);
await page.goto(`http://localhost:${port}/index.html?${q}`);
await page.waitForFunction(() => window.diorama && window.diorama.ready, null, { timeout: 120000 });
const period = await page.evaluate(() => window.diorama.period);
const seconds = args.seconds ? Number(args.seconds) : period;
const total = Math.round(seconds * fps);
const W = 480 * scale, H = 270 * scale;
const base = path.join(args.out, `metro-${args.season}`);
console.log(`loop ${period}s · rendering ${total} frames @ ${fps}fps → ${W}x${H} ${args.format}`);

// ---- ffmpeg sink
function ffmpegArgs(outFile) {
  const input = ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '480x270', '-r', String(fps), '-i', '-'];
  const up = `scale=${W}:${H}:flags=neighbor`;
  if (args.format === 'mp4') return [...input, '-vf', up, '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outFile];
  if (args.format === 'webm') return [...input, '-vf', up, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '20', '-row-mt', '1', outFile];
  if (args.format === 'gif') return [...input, '-vf', `${up},split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=none`, '-loop', '0', outFile];
  throw new Error('unknown format ' + args.format);
}

let sink = null, outFile = null;
if (args.format !== 'frames') {
  outFile = `${base}-loop.${args.format}`;
  sink = spawn(args.ffmpeg, ffmpegArgs(outFile), { stdio: ['pipe', 'inherit', 'inherit'] });
  sink.on('error', (e) => { console.error(`could not run ffmpeg (${args.ffmpeg}): ${e.message}\nInstall ffmpeg or pass --ffmpeg /path, or use --format frames.`); process.exit(1); });
} else {
  fs.mkdirSync(`${base}-frames`, { recursive: true });
}

const write = (buf) => new Promise((res) => (sink.stdin.write(buf) ? res() : sink.stdin.once('drain', res)));
const t0 = Date.now();
for (let i = 0; i < total; i++) {
  const t = i / fps;
  if (args.format === 'frames') {
    const url = await page.evaluate(([t, s]) => window.diorama.frameDataURL(t, s), [t, scale]);
    fs.writeFileSync(path.join(`${base}-frames`, `f${String(i).padStart(5, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
  } else {
    const b64 = await page.evaluate((t) => window.diorama.frameRGBA(t), t);
    await write(Buffer.from(b64, 'base64'));
  }
  if (i % 150 === 0 || i === total - 1) {
    const el = (Date.now() - t0) / 1000;
    process.stdout.write(`\r  frame ${i + 1}/${total}  ${(((i + 1) / el) || 0).toFixed(1)} fps  eta ${Math.round((el / (i + 1)) * (total - i - 1))}s   `);
  }
}
process.stdout.write('\n');
await browser.close();
server.close();

if (sink) {
  sink.stdin.end();
  await new Promise((res) => sink.on('close', res));
  console.log('wrote', outFile);
  const hours = Number(args.hours || 0);
  if (hours > 0 && args.format !== 'gif') {
    const loops = Math.ceil((hours * 3600) / seconds);
    const long = `${base}-${hours}h.${args.format}`;
    console.log(`stitching ${loops} loops → ${long} (stream copy, no re-encode)`);
    const p = spawn(args.ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-stream_loop', String(loops - 1), '-i', outFile, '-c', 'copy', '-t', String(hours * 3600), long], { stdio: 'inherit' });
    await new Promise((res) => p.on('close', res));
    console.log('wrote', long);
  }
}
