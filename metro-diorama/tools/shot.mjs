// Dev helper: render frames at given times to PNGs.
// usage: node tools/shot.mjs out.png "t=12,season=rain" [scale]
import { createRequire } from 'module';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
    res.end(d);
  });
}).listen(0);
const port = server.address().port;

const [out = 'shot.png', spec = 't=0', scale = '2'] = process.argv.slice(2);
const params = new URLSearchParams(spec.replaceAll(',', '&'));
const times = (params.get('t') || '0').split(';').map(Number);
const crop = params.get('crop'); // x:y:w:h in native pixels
const sheet = params.get('sheet'); // columns
params.delete('t'); params.delete('crop'); params.delete('sheet');
params.set('headless', '1');
if (!params.has('mode')) params.set('mode', 'loop');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage();
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${port}/index.html?${params}`);
await page.waitForFunction(() => window.diorama && window.diorama.ready, null, { timeout: 60000 });
if (sheet) {
  const url = await page.evaluate(async ([times, s, cols, crop]) => {
    const [cx, cy, W, H] = crop ? crop.split(':').map(Number) : [0, 0, 480, 270];
    const rows = Math.ceil(times.length / cols);
    const c = document.createElement('canvas'); c.width = W * s * cols; c.height = (H * s + 12) * rows;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < times.length; i++) {
      const im = new Image();
      await new Promise((r) => { im.onload = r; im.src = window.diorama.frameDataURL(times[i], 1); });
      const x = (i % cols) * W * s, y = Math.floor(i / cols) * (H * s + 12);
      g.drawImage(im, cx, cy, W, H, x, y + 12, W * s, H * s);
      g.fillStyle = '#fff'; g.font = '11px monospace'; g.fillText('t=' + times[i], x + 4, y + 10);
    }
    return c.toDataURL();
  }, [times, Number(scale), Number(sheet), crop]);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote sheet', out);
  await browser.close(); server.close(); process.exit(0);
}
for (let i = 0; i < times.length; i++) {
  const url = await page.evaluate(([t, s, crop]) => {
    if (!crop) return window.diorama.frameDataURL(t, s);
    const [x, y, w, h] = crop.split(':').map(Number);
    const src = new Image();
    return new Promise((res) => {
      src.onload = () => {
        const c = document.createElement('canvas'); c.width = w * s; c.height = h * s;
        const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
        g.drawImage(src, x, y, w, h, 0, 0, w * s, h * s);
        res(c.toDataURL());
      };
      src.src = window.diorama.frameDataURL(t, 1);
    });
  }, [times[i], Number(scale), crop]);
  const file = times.length > 1 ? out.replace('.png', `-${i}.png`) : out;
  fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  console.log('wrote', file, 't=', times[i]);
}
await browser.close();
server.close();
