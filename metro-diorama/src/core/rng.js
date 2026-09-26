// Seeded randomness. Everything in the diorama is a pure function of
// (seed, time), which is what makes the loop seamless and exports repeatable.

export function hashInts(...nums) {
  let h = 0x811c9dc5;
  for (const n of nums) {
    let v = typeof n === 'string' ? strHash(n) : Math.floor(n) | 0;
    h ^= v;
    h = Math.imul(h, 0x01000193);
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
  }
  return h >>> 0;
}

function strHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h | 0;
}

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A small RNG object with conveniences.
export function rng(...keys) {
  const r = mulberry32(hashInts(...keys));
  const api = {
    next: r,
    float: (a = 0, b = 1) => a + (b - a) * r(),
    int: (a, b) => Math.floor(a + (b - a + 1) * r()),
    pick: (arr) => arr[Math.floor(r() * arr.length)],
    chance: (p) => r() < p,
    weighted: (pairs) => {
      const total = pairs.reduce((s, p) => s + p[1], 0);
      let x = r() * total;
      for (const [v, w] of pairs) { if ((x -= w) <= 0) return v; }
      return pairs[pairs.length - 1][0];
    },
  };
  return api;
}

// Stateless hash -> [0,1)
export function h01(...keys) {
  return hashInts(...keys) / 4294967296;
}

// Periodic value noise in x (period px), plain in y. Used for clouds/bushes.
export function makeNoise2D(seed, period) {
  const lat = (ix, iy) => h01(seed, ((ix % period) + period) % period, iy);
  const smooth = (t) => t * t * (3 - 2 * t);
  return function (x, y) {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = smooth(x - x0), fy = smooth(y - y0);
    const a = lat(x0, y0), b = lat(x0 + 1, y0), c = lat(x0, y0 + 1), d = lat(x0 + 1, y0 + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

export function fbm(noise, x, y, octaves = 4, periodCells = 0) {
  let amp = 0.5, f = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(x * f, y * f + o * 17.3);
    norm += amp; amp *= 0.5; f *= 2;
  }
  return sum / norm;
}
