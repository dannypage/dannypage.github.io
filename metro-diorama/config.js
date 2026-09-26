// Scene configuration. Everything here can also be overridden from the URL,
// e.g. index.html?season=snow&mode=live&seed=42
//
// Change text, season, timing or swap in hand-drawn PNG overrides without
// touching the generators.

export default {
  // Native pixel resolution. 480x270 upscales exactly 4x to 1920x1080.
  width: 480,
  height: 270,

  // 'live'  = new random passengers/lines/planes every visit (browser / OBS source)
  // 'loop'  = deterministic, repeats perfectly every visitSeconds x lines (video export)
  mode: 'live',
  seed: 1976, // the year Metrorail opened
  season: 'rain', // rain | storm | snow | spring | autumn | night
  fps: 30,

  // Two train visits per loop (one per line in `lines`), 90 s apart.
  visitSeconds: 90,
  planeEveryVisits: 2, // one takeoff per loop in 'loop' mode

  text: {
    station: ['Ronald Reagan Washington', 'National Airport'],
    // Lines serving the platform, in visit order. dest shows on the pylon,
    // short shows on LED signs.
    lines: [
      { code: 'BL', dest: 'Downtown Largo', short: 'LARGO' },
      { code: 'YL', dest: 'Mt Vernon Sq', short: 'MT VERNON' },
    ],
    carNumbers: [7042, 7043, 7118, 7119, 7260, 7261],
    shuttle: 'ECONOMY PARKING',
    pidsIdle: 'WELCOME TO DCA',
  },

  // Replace any generated sprite with your own PNG (same size as the export
  // from assets.html). Keys are asset names, values are URLs relative to
  // this folder. Example: { tower: 'overrides/tower.png' }
  overrides: {},
};
