// Passengers as scripted paths. Each person is a list of timed segments;
// position/pose at time t is looked up, never simulated, so frames are
// independent and the loop is exact.
import { rng } from '../core/rng.js';
import { randomSpec } from '../assets/people.js';
import { W, L } from '../layout.js';

const WALK = [20, 28];

function seg(list, t0, dur, from, to, pose, extra = {}) {
  const s = { t0, t1: t0 + dur, from, to, pose, ...extra };
  list.push(s);
  return s.t1;
}

function walkTo(list, t, from, to, speed, extra = {}) {
  const dx = to[0] - from[0], dy = to[1] - from[1];
  const dist = Math.hypot(dx, dy);
  if (dist < 0.5) return t;
  let pose, flip = false;
  if (Math.abs(dx) >= Math.abs(dy) * 1.2) { pose = 'side'; flip = dx < 0; }
  else pose = dy < 0 ? 'back' : 'front';
  return seg(list, t, dist / speed, from, to, pose, { walk: true, flip, ...extra });
}

function clampY(y) { return Math.max(L.walkMinY, Math.min(L.walkMaxY, y)); }

// Build all scripted people for visit v.
export function crowdForVisit(p, tl, v) {
  const r = rng(...v.seedKey, 'crowd');
  const tm = tl.times;
  const doors = tl.doorXs();
  const A = (u) => v.start + u;
  const people = [];
  const doorQueue = new Map();
  const openT = A(tm.openedAt) - 0.4;
  // hand out doors evenly (shuffled) so the crowd spreads along the train
  const deck = [];
  const nextDoor = () => {
    if (!deck.length) { deck.push(...doors); for (let i = deck.length - 1; i > 0; i--) { const j = r.int(0, i); [deck[i], deck[j]] = [deck[j], deck[i]]; } }
    return deck.pop();
  };

  // --- alighting passengers
  const nA = r.int(4, 9);
  for (let i = 0; i < nA; i++) {
    const door = nextDoor();
    const q = doorQueue.get(door) || 0; doorQueue.set(door, q + 1);
    const id = `a${i}`;
    const spec = randomSpec(p, ...v.seedKey, id);
    const segs = [];
    const speed = r.float(...WALK) * (spec.bag === 'suitcase' ? 0.85 : 1);
    let t = openT + 0.2 + q * 1.3;
    const ex = door + r.int(-3, 3);
    t = seg(segs, t, 0.45, [ex, L.platformEdge + 1], [ex, L.platformEdge + 5], 'front', { walk: true, fadeIn: true });
    const mid = [ex + r.int(-12, 12), clampY(r.int(230, 262))];
    t = walkTo(segs, t, [ex, L.platformEdge + 5], mid, speed * 0.8);
    const exitLeft = mid[0] < W / 2 ? r.chance(0.75) : r.chance(0.25);
    const out = [exitLeft ? -24 : W + 24, clampY(mid[1] + r.int(-6, 6))];
    // some stop to check their phone before heading off
    if (r.chance(0.3)) t = seg(segs, t, r.float(2, 5), mid, mid, 'front', { phone: true });
    t = walkTo(segs, t, mid, out, speed);
    people.push({ id: v.k + id, spec, key: [...v.seedKey, id].join('/'), segs });
  }

  // --- boarding passengers
  const nB = r.int(6, 10);
  const lastBoard = A(tm.closeAt) - 1.2;
  for (let i = 0; i < nB; i++) {
    const door = nextDoor();
    const q = doorQueue.get(door) || 0; doorQueue.set(door, q + 1);
    const id = `b${i}`;
    const spec = randomSpec(p, ...v.seedKey, id);
    const segs = [];
    const speed = r.float(...WALK) * (spec.bag === 'suitcase' ? 0.85 : 1);
    const fromLeft = r.chance(0.5);
    const spot = [Math.max(12, Math.min(W - 12, door + (r.chance(0.5) ? -1 : 1) * r.int(10, 26))), clampY(r.int(224, 250))];
    const start = [fromLeft ? -24 : W + 24, clampY(spot[1] + r.int(-8, 14))];
    const arrive = A(tm.openAt) - r.float(4, 84);
    let t = walkTo(segs, arrive, start, spot, speed);
    const board = Math.min(lastBoard - 1.8, openT + 0.8 + q * 1.3 + r.float(0, 0.6));
    const phone = r.chance(0.45);
    if (board > t) seg(segs, t, board - t, spot, spot, 'back', { phone, idle: true });
    t = Math.max(t, board);
    const edge = [door + r.int(-2, 2), L.platformEdge + 4];
    t = walkTo(segs, t, spot, edge, speed);
    seg(segs, t, 0.5, edge, [edge[0], L.platformEdge], 'back', { walk: true, fadeOut: true });
    people.push({ id: v.k + id, spec, key: [...v.seedKey, id].join('/'), segs });
  }

  // --- people passing through (not catching this train)
  const nP = r.int(2, 4);
  for (let i = 0; i < nP; i++) {
    const id = `p${i}`;
    const spec = randomSpec(p, ...v.seedKey, id);
    const segs = [];
    const y = clampY(r.int(236, 264));
    const ltr = r.chance(0.5);
    const t0 = v.start + r.float(0, tl.V - 20);
    walkTo(segs, t0, [ltr ? -24 : W + 24, y], [ltr ? W + 24 : -24, clampY(y + r.int(-8, 8))], r.float(...WALK));
    people.push({ id: v.k + id, spec, key: [...v.seedKey, id].join('/'), segs });
  }
  return people;
}

// Where is this person at time t? -> {x, y, pose, walk, frame, flip, alpha} or null
export function personAt(person, t) {
  const segs = person.segs;
  if (t < segs[0].t0 || t >= segs[segs.length - 1].t1) return null;
  for (const s of segs) {
    if (t < s.t0 || t >= s.t1) continue;
    const f = (t - s.t0) / (s.t1 - s.t0);
    const x = s.from[0] + (s.to[0] - s.from[0]) * f;
    const y = s.from[1] + (s.to[1] - s.from[1]) * f;
    let alpha = 1;
    if (s.fadeIn) alpha = Math.min(1, f * 1.6);
    if (s.fadeOut) alpha = 1 - f;
    let frame;
    if (s.walk) {
      const dist = Math.hypot(x - s.from[0], y - s.from[1]);
      frame = s.pose === 'side' ? Math.floor(dist / 3.2) % 4 : Math.floor(dist / 3) % 2;
    } else {
      frame = Math.floor((t + person.id.length * 0.7) / 1.7) % 2;
    }
    return { x, y, pose: s.pose, walk: !!s.walk, frame, flip: !!s.flip, alpha, phone: !!s.phone, clipTop: s.fadeOut || s.fadeIn };
  }
  return null;
}
