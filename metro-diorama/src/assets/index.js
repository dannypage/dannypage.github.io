// Asset registry. Every sprite in the scene is generated here, by name,
// from the palette + config. Any entry can be replaced by a PNG listed in
// config.overrides (use assets.html to export the originals as a template).
import * as bg from './background.js';
import * as mid from './midground.js';
import * as fg from './foreground.js';
import * as train from './train.js';
import * as people from './people.js';
import * as veh from './vehicles.js';

// name -> () => Pix | {pix, x, y}
export function assetRecipes(p, cfg) {
  const R = {
    sky: () => bg.sky(p),
    'clouds.far': () => bg.clouds(p, 0),
    'clouds.near': () => bg.clouds(p, 1),
    mist: () => bg.mist(p),
    monument: () => bg.monument(p),
    tower: () => bg.tower(p),
    terminal: () => bg.terminal(p),
    deck: () => bg.deck(p),
    trees: () => mid.trees(p),
    fence: () => mid.fence(p),
    stationSign: () => mid.stationSign(p, cfg.text),
    track: () => mid.track(p),
    platform: () => fg.platform(p),
    canopy: () => fg.canopy(p),
    column: () => fg.column(p),
    bench: () => fg.bench(p),
    trashCan: () => fg.trashCan(p),
    pidsHousing: () => fg.pidsHousing(p),
    plane: () => veh.plane(p),
  };
  cfg.text.lines.forEach((line, i) => {
    for (const kind of ['head', 'mid', 'tail']) {
      R[`train.${line.code}.${kind}`] = () => train.car(p, line, kind, cfg.text.carNumbers[i % 6]);
    }
  });
  R['train.door'] = () => train.doorLeaf(p);
  R['train.interior'] = () => train.doorInterior(p);
  for (const [k, fn] of Object.entries(veh.vehicleRecipes(p, cfg))) R[`vehicle.${k}`] = fn;
  return R;
}

function loadImage(url) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('failed to load ' + url));
    im.src = url;
  });
}

export async function buildAssets(p, cfg, base = '') {
  const recipes = assetRecipes(p, cfg);
  const out = {};
  for (const [name, fn] of Object.entries(recipes)) {
    const r = fn();
    const pix = r.pix || r;
    out[name] = { canvas: pix.toCanvas(), x: r.x || 0, y: r.y || 0, w: pix.w, h: pix.h, meta: r.meta };
  }
  for (const [name, url] of Object.entries(cfg.overrides || {})) {
    if (!out[name]) { console.warn('override for unknown asset', name); continue; }
    try {
      const im = await loadImage(base + url);
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      c.getContext('2d').drawImage(im, 0, 0);
      Object.assign(out[name], { canvas: c, w: im.width, h: im.height });
    } catch (e) { console.warn(e.message); }
  }
  // people are generated lazily (thousands of combos) through this cache
  out.people = people.makeSpriteCache(p);
  return out;
}
