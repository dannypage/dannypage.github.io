// Procedural commuters. A person is a small spec (height, coat, hair, bag…)
// and sprites are drawn on demand per pose/frame and cached.
//
// Poses:  back (waiting, facing the train), front (stepping off a train),
//         side (walking, facing right; the scene mirrors for left).
import { Pix, mix, makeCanvas } from '../core/pixel.js';
import { rng } from '../core/rng.js';

export const SPR_W = 26;
export const ANCHOR_X = 13; // feet centre within the sprite

export function randomSpec(p, ...seed) {
  const r = rng('person', ...seed);
  const winter = p.season === 'snow';
  const spec = {
    h: r.int(25, 31),
    build: r.weighted([[0, 3], [1, 5], [2, 2]]),
    skin: r.pick(p.skin),
    hair: r.pick(p.hair),
    hairStyle: r.weighted([['short', 5], ['long', 3], ['bun', 2], ['bald', 0.6], ['curly', 2]]),
    hat: r.weighted([[null, 6], ['beanie', winter ? 6 : 1.5], ['cap', 1], ['hood', 1.5]]),
    coat: r.pick(p.coats),
    coatLen: r.weighted([['short', 5], ['long', 3]]),
    pants: r.pick(p.pants),
    shoes: r.pick(['#141418', '#2a1f1a', '#3a3a40', '#d8d8d8']),
    scarf: r.chance(winter ? 0.7 : 0.25) ? r.pick(p.accents) : null,
    bag: r.weighted([['none', 3], ['backpack', 4], ['suitcase', 5], ['tote', 2], ['umbrella', 3], ['briefcase', 1.5]]),
    bagColor: r.pick(p.luggage),
    umbrellaColor: r.pick([...p.accents, '#1c1f28', '#2f4a6a']),
    headphones: r.chance(0.25),
  };
  if (spec.hat === 'beanie') spec.hatColor = r.pick([...p.accents, '#2a3040', '#6a3a3a']);
  if (spec.hat === 'hood') spec.hatColor = spec.coat;
  if (spec.hat === 'cap') spec.hatColor = r.pick(['#1c1f28', '#b83a3a', '#2f4a6a']);
  return spec;
}

function geom(s) {
  const head = s.h >= 28 ? 5 : 4;
  const hip = Math.round(s.h * 0.56);
  const coatBottom = s.coatLen === 'long' ? hip + Math.round((s.h - hip) * 0.5) : hip + 1;
  const tw = [6, 7, 8][s.build];
  return { head, hip, coatBottom, tw, shoulder: head + 1 };
}

function shades(p, c) {
  return { base: c, lite: mix(c, p.lampHot, 0.22), dark: mix(c, p.ink, 0.35), rim: mix(c, p.lamp, 0.35) };
}

// ---------------------------------------------------------------- back / front
function drawUpright(px, p, s, g, cx, facing, frame, opts = {}) {
  const top = SPR_H(s) - s.h;
  const bob = opts.bob || 0;
  const Y = (y) => top + y + bob;
  const coat = shades(p, s.coat);
  const half = Math.floor(g.tw / 2);
  const x0 = cx - half, x1 = x0 + g.tw - 1;

  // legs
  const legTop = g.coatBottom, feet = s.h - 1;
  const liftL = opts.walk && frame % 2 === 0 ? 1 : 0;
  const liftR = opts.walk && frame % 2 === 1 ? 1 : 0;
  for (let y = legTop; y < feet; y++) {
    if (y < feet - liftL) { px.set(cx - 2, top + y, s.pants); px.set(cx - 1, top + y, s.pants); }
    if (y < feet - liftR) { px.set(cx + 1, top + y, mix(s.pants, p.ink, 0.25)); px.set(cx + 2, top + y, mix(s.pants, p.ink, 0.25)); }
  }
  px.hline(cx - 3, cx - 1, top + feet - liftL, s.shoes);
  px.hline(cx + 1, cx + 3, top + feet - liftR, s.shoes);

  // torso / coat
  for (let y = g.shoulder; y <= g.coatBottom; y++) {
    const flare = s.coatLen === 'long' && y > g.hip ? 1 : 0;
    for (let x = x0 - flare; x <= x1 + flare; x++) {
      if (y === g.shoulder && (x === x0 || x === x1)) continue;
      let c = x <= x0 + 1 ? coat.lite : x >= x1 - 1 ? coat.dark : coat.base;
      if (y === g.shoulder) c = coat.rim;
      px.set(x, Y(y), c);
    }
  }
  if (facing === 'front') px.vline(cx, Y(g.shoulder + 2), Y(g.coatBottom), coat.dark);
  // arms (hands swing when walking)
  const swing = opts.walk ? (frame % 2 ? 1 : -1) : 0;
  px.vline(x0 - 1, Y(g.shoulder + 1), Y(g.hip + 1 + swing), coat.dark);
  px.vline(x1 + 1, Y(g.shoulder + 1), Y(g.hip + 1 - swing), coat.dark);
  if (!opts.phone) {
    px.set(x0 - 1, Y(g.hip + 2 + swing), s.skin);
    px.set(x1 + 1, Y(g.hip + 2 - swing), s.skin);
  }
  // scarf
  if (s.scarf) { px.hline(x0 + 1, x1 - 1, Y(g.shoulder), s.scarf); px.hline(x0 + 1, x1 - 1, Y(g.shoulder + 1), mix(s.scarf, p.ink, 0.2)); }
  // backpack
  if (s.bag === 'backpack') {
    if (facing === 'back') {
      px.rect(cx - 2, Y(g.shoulder + 2), 5, g.hip - g.shoulder - 1, s.bagColor);
      px.hline(cx - 2, cx + 2, Y(g.shoulder + 2), mix(s.bagColor, p.lamp, 0.3));
      px.hline(cx - 1, cx + 1, Y(g.shoulder + 5), mix(s.bagColor, p.ink, 0.3));
    } else {
      px.vline(x0 + 1, Y(g.shoulder + 1), Y(g.hip - 1), mix(s.bagColor, p.ink, 0.2));
      px.vline(x1 - 1, Y(g.shoulder + 1), Y(g.hip - 1), mix(s.bagColor, p.ink, 0.2));
    }
  }
  if (s.bag === 'tote' || s.bag === 'briefcase') {
    const bx = facing === 'back' ? x1 + 1 : x0 - 3;
    const by = g.hip + 1 - (facing === 'back' ? -swing : swing);
    px.rect(bx, Y(by), 3, s.bag === 'tote' ? 5 : 4, s.bagColor);
    px.set(bx + 1, Y(by - 1), mix(s.bagColor, p.ink, 0.3));
  }
  if (s.bag === 'umbrella') {
    const ux = facing === 'back' ? x0 - 1 : x1 + 1;
    const uy = g.hip + 2 + (facing === 'back' ? swing : -swing);
    px.vline(ux, Y(uy), Y(Math.min(s.h - 3, uy + 7)), s.umbrellaColor);
    px.set(ux, Y(uy + 2), mix(s.umbrellaColor, p.lamp, 0.3));
    px.set(ux, Y(uy), '#1a1a1a');
  }
  if (s.bag === 'suitcase' && !opts.noCase) {
    // rolling case parked beside them
    const bx = facing === 'back' ? x1 + 2 : x0 - 7;
    px.rect(bx, top + s.h - 9, 5, 8, s.bagColor);
    px.hline(bx, bx + 4, top + s.h - 9, mix(s.bagColor, p.lamp, 0.3));
    px.vline(bx + 2, top + s.h - 13, top + s.h - 10, p.c6);
    px.set(bx, top + s.h - 1, p.ink); px.set(bx + 4, top + s.h - 1, p.ink);
  }

  // head
  const hx0 = cx - 2, hx1 = cx + 2;
  for (let y = 0; y < g.head; y++) {
    for (let x = hx0; x <= hx1; x++) {
      if ((y === 0) && (x === hx0 || x === hx1)) continue;
      let c = s.hair;
      if (facing === 'front' && y >= 2 && x > hx0 && x < hx1) c = s.skin;
      if (facing === 'front' && y >= 2 && s.hairStyle !== 'long' && s.hairStyle !== 'curly') {
        if (x === hx0 || x === hx1) c = y === 2 ? s.hair : s.skin;
      }
      if (s.hairStyle === 'bald' && facing === 'back' && y > 0) c = s.skin;
      if (y === 0) c = mix(c, p.lamp, 0.3);
      px.set(x, Y(y), c);
    }
  }
  // neck
  if (facing === 'back' && s.hairStyle !== 'long') px.hline(cx - 1, cx + 1, Y(g.head), s.skin);
  if (s.hairStyle === 'long') { px.vline(hx0, Y(g.head), Y(g.head + 2), s.hair); px.vline(hx1, Y(g.head), Y(g.head + 2), s.hair); if (facing === 'back') px.hline(hx0, hx1, Y(g.head), s.hair); }
  if (s.hairStyle === 'bun') { px.rect(cx - 1, Y(-2), 3, 2, s.hair); }
  if (s.hairStyle === 'curly') { px.set(hx0 - 1, Y(1), s.hair); px.set(hx1 + 1, Y(1), s.hair); px.hline(hx0, hx1, Y(-1), s.hair); }
  if (s.hat === 'beanie') { px.hline(hx0, hx1, Y(-1), s.hatColor); px.rect(hx0, Y(0), 5, 2, s.hatColor); px.hline(hx0, hx1, Y(1), mix(s.hatColor, p.ink, 0.3)); }
  if (s.hat === 'cap') { px.rect(hx0, Y(0), 5, 2, s.hatColor); if (facing === 'front') px.hline(hx0 - 1, hx1 + 1, Y(2), mix(s.hatColor, p.ink, 0.3)); }
  if (s.hat === 'hood') {
    px.rect(hx0 - 1, Y(-1), 7, 2, coat.base); px.vline(hx0 - 1, Y(0), Y(g.head), coat.lite); px.vline(hx1 + 1, Y(0), Y(g.head), coat.dark);
    if (facing === 'back') px.rect(hx0, Y(0), 5, g.head, coat.base);
  }
  if (s.headphones) { px.hline(hx0, hx1, Y(0), '#15151a'); px.set(hx0 - 1, Y(2), '#15151a'); px.set(hx1 + 1, Y(2), '#15151a'); px.set(hx0 - 1, Y(3), '#15151a'); px.set(hx1 + 1, Y(3), '#15151a'); }
  // phone held up in front (screen light is added by the scene)
  if (opts.phone) {
    if (facing === 'back') { px.set(x0, Y(g.shoulder + 3), coat.dark); px.set(x1, Y(g.shoulder + 3), coat.dark); }
    else { px.rect(cx - 1, Y(g.shoulder + 2), 3, 2, '#1a1d24'); px.hline(cx - 1, cx + 1, Y(g.shoulder + 2), '#bfe3ff'); px.hline(cx - 1, cx + 1, Y(g.head - 1), mix(s.skin, '#bfe3ff', 0.35)); }
  }
}

// ---------------------------------------------------------------- side (facing right)
function drawSide(px, p, s, g, cx, frame, opts = {}) {
  const top = SPR_H(s) - s.h;
  const walking = opts.walk;
  const passing = walking && frame % 2 === 1;
  const bob = passing ? -1 : 0;
  const Y = (y) => top + y + bob;
  const coat = shades(p, s.coat);
  const feet = s.h - 1;
  const hipY = g.coatBottom;

  // legs: stride frames 0 and 2 are wide, 1 and 3 are crossing
  const near = s.pants, far = mix(s.pants, p.ink, 0.35);
  const leg = (dx, col, lift) => {
    const len = feet - hipY;
    for (let i = 0; i <= len - lift; i++) {
      const x = Math.round(cx + (dx * i) / len);
      px.set(x, top + hipY + i + (passing ? -1 : 0) * (i < len / 2 ? 1 : 0), col);
      px.set(x - 1, top + hipY + i + (passing ? -1 : 0) * (i < len / 2 ? 1 : 0), col);
    }
    const fx = Math.round(cx + dx), fy = top + feet - lift;
    px.hline(fx - 1, fx + 1, fy, s.shoes);
  };
  if (!walking) { leg(0, far, 0); leg(1, near, 0); }
  else if (frame % 2 === 0) {
    const a = frame === 0 ? 1 : -1;
    leg(-3 * a, far, 0); leg(3 * a, near, 0);
  } else {
    const a = frame === 1 ? 1 : -1;
    leg(1 * a, far, 1); leg(-1 * a, near, 0);
  }

  // torso
  const bx0 = cx - Math.floor(g.tw / 2) + 1, bx1 = bx0 + g.tw - 3;
  for (let y = g.shoulder; y <= g.coatBottom; y++) {
    const flare = s.coatLen === 'long' && y > g.hip ? 1 : 0;
    for (let x = bx0 - flare; x <= bx1; x++) {
      if (y === g.shoulder && x === bx1) continue;
      let c = x === bx1 ? coat.lite : x === bx0 - flare ? coat.dark : coat.base;
      if (y === g.shoulder) c = coat.rim;
      px.set(x, Y(y), c);
    }
  }
  if (s.scarf) { px.hline(bx0, bx1, Y(g.shoulder), s.scarf); px.set(bx1 + 1, Y(g.shoulder + 1), s.scarf); }
  if (s.bag === 'backpack') {
    px.rect(bx0 - 3, Y(g.shoulder + 1), 3, g.hip - g.shoulder - 1, s.bagColor);
    px.vline(bx0 - 3, Y(g.shoulder + 1), Y(g.hip - 1), mix(s.bagColor, p.ink, 0.3));
    px.set(bx0 - 1, Y(g.shoulder + 1), mix(s.bagColor, p.lamp, 0.3));
  }

  // arm swings opposite to near leg
  const swing = !walking ? 0 : frame === 0 ? -2 : frame === 2 ? 2 : 0;
  const shoulderX = cx;
  const handY = g.hip + 1;
  const handX = shoulderX + swing;
  const pulling = s.bag === 'suitcase' && !opts.noCase;
  const hx = pulling ? cx - 3 : opts.phone ? cx + 2 : handX;
  const hy = pulling ? handY : opts.phone ? g.shoulder + 2 : handY;
  px.line(shoulderX, Y(g.shoulder + 1), hx, Y(hy - 1), coat.dark);
  px.set(hx, Y(hy), s.skin);
  if (opts.phone) { px.set(hx + 1, Y(hy - 1), '#1a1d24'); px.set(hx + 1, Y(hy - 2), '#bfe3ff'); }

  if (pulling) {
    // rolling case trailing behind
    const bx = cx - 11;
    const by = top + s.h - 10;
    px.line(hx - 1, Y(hy), bx + 4, by, p.c6);
    px.rect(bx, by, 6, 9, s.bagColor);
    px.hline(bx, bx + 5, by, mix(s.bagColor, p.lamp, 0.3));
    px.vline(bx + 5, by + 1, by + 8, mix(s.bagColor, p.ink, 0.3));
    px.set(bx + 1, top + s.h - 1, p.ink); px.set(bx + 4, top + s.h - 1, p.ink);
  }
  if (s.bag === 'tote' || s.bag === 'briefcase') px.rect(hx - 1, Y(hy + 1), 3, s.bag === 'tote' ? 5 : 4, s.bagColor);
  if (s.bag === 'umbrella') {
    px.line(hx, Y(hy), hx + (walking ? 3 : 1), Y(Math.min(s.h - 2, hy + 8)), s.umbrellaColor);
    px.set(hx, Y(hy + 2), mix(s.umbrellaColor, p.lamp, 0.3));
  }

  // head (facing right)
  const hx0 = cx - 1;
  for (let y = 0; y < g.head; y++) for (let x = hx0; x < hx0 + 4; x++) {
    if (y === 0 && x === hx0 + 3) continue;
    let c = s.hair;
    if (y >= 2 && x >= hx0 + 1 && s.hairStyle !== 'bald') c = s.skin;
    if (s.hairStyle === 'bald' && y >= 1) c = s.skin;
    if (y === 0) c = mix(c, p.lamp, 0.25);
    px.set(x, Y(y), c);
  }
  px.set(hx0 + 4, Y(2), s.skin); // nose
  px.hline(hx0 + 1, hx0 + 2, Y(g.head), s.skin);
  if (s.hairStyle === 'long') px.vline(hx0 - 1, Y(1), Y(g.head + 2), s.hair), px.vline(hx0, Y(g.head), Y(g.head + 1), s.hair);
  if (s.hairStyle === 'bun') px.rect(hx0 - 2, Y(0), 2, 2, s.hair);
  if (s.hairStyle === 'curly') { px.hline(hx0, hx0 + 3, Y(-1), s.hair); px.set(hx0 - 1, Y(1), s.hair); }
  if (s.hat === 'beanie') { px.hline(hx0, hx0 + 3, Y(-1), s.hatColor); px.rect(hx0, Y(0), 4, 2, s.hatColor); }
  if (s.hat === 'cap') { px.rect(hx0, Y(0), 4, 2, s.hatColor); px.hline(hx0 + 3, hx0 + 5, Y(1), mix(s.hatColor, p.ink, 0.3)); }
  if (s.hat === 'hood') { px.rect(hx0 - 1, Y(-1), 5, 2, coat.base); px.vline(hx0 - 1, Y(0), Y(g.head), coat.dark); px.set(hx0, Y(1), coat.base); }
  if (s.headphones) { px.hline(hx0, hx0 + 3, Y(-1 + (s.hat ? 0 : 1)), '#15151a'); px.rect(hx0 + 1, Y(2), 2, 2, '#15151a'); }
}

function SPR_H(s) { return s.h + 4; }

export function drawPerson(p, s, pose, frame, opts = {}) {
  const px = new Pix(SPR_W, SPR_H(s));
  const g = geom(s);
  if (pose === 'side') drawSide(px, p, s, g, ANCHOR_X, frame, opts);
  else drawUpright(px, p, s, g, ANCHOR_X, pose, frame, { ...opts, bob: opts.walk ? 0 : frame % 2 });
  // soft dark outline for readability against busy backgrounds
  px.outline('#0e10168c');
  return px;
}

// Returns {canvas, ax, ay} with ax/ay = feet anchor within the canvas.
export function makeSpriteCache(p) {
  const cache = new Map();
  return {
    get(spec, key, pose, frame, opts = {}, flip = false) {
      const k = `${key}|${pose}|${frame}|${opts.walk ? 1 : 0}|${opts.phone ? 1 : 0}|${opts.noCase ? 1 : 0}|${flip ? 1 : 0}`;
      let v = cache.get(k);
      if (!v) {
        const px = drawPerson(p, spec, pose, frame, opts);
        let c = px.toCanvas();
        if (flip) {
          const f = makeCanvas(c.width, c.height);
          const fx = f.getContext('2d');
          fx.translate(c.width, 0); fx.scale(-1, 1); fx.drawImage(c, 0, 0);
          c = f;
        }
        v = { canvas: c, ax: flip ? SPR_W - 1 - ANCHOR_X : ANCHOR_X, ay: px.h - 1 - 0 };
        cache.set(k, v);
      }
      return v;
    },
    size: () => cache.size,
  };
}
