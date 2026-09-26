// Palette: a cold, rain-grey world lit by warm sources.
// Seasons override individual keys; every asset reads colours from here,
// so a season swap re-tints the whole diorama.

const BASE = {
  // cold greys (dark -> light)
  ink: '#0f1118',
  c0: '#161922', c1: '#1d2029', c2: '#262a35', c3: '#303542', c4: '#3d4351',
  c5: '#4b5262', c6: '#5b6374', c7: '#6d7587', c8: '#818a9b', c9: '#97a0b0',
  c10: '#adb4c2', c11: '#c3c9d3', c12: '#dadee5', white: '#eef0f3',

  // sky: top -> horizon
  sky: ['#3a4150', '#434b5b', '#4e5667', '#5a6273', '#687182', '#788193', '#8a92a3'],
  cloudDark: '#3b4250', cloudMid: '#525a6a', cloudLight: '#747d8e',
  haze: '#8d95a5',
  rain: '#b7c1d4', rainFar: '#95a0b4',

  // warm lights
  w0: '#2b1d1b', w1: '#43291f', w2: '#633826', w3: '#86482c', w4: '#b0602f',
  sodium: '#e8913a', lamp: '#ffc46b', lampHot: '#ffe3a8', lampCore: '#fff6dc',
  interior: '#f3cf8f', interiorDim: '#b98f5c', interiorShade: '#7a5a3c',
  led: '#ffa323', ledDim: '#6b3a12', ledRed: '#ff4b33', tail: '#e0283a', tailGlow: '#ff5a4a',
  headlight: '#fff2cf',

  // platform
  tile: ['#40261f', '#462a22', '#4d2e24', '#533126'], grout: '#34201b',
  granite: ['#8c8f97', '#9ea1a8', '#b3b5bb'], tactile: '#2a2c33', tactileDot: '#4a4d57',

  // architecture
  concrete: ['#4a505d', '#5c6270', '#707684', '#858b98', '#9aa0ab'],
  terminalRoof: ['#8e97a7', '#a4acba', '#bcc3ce', '#d0d5dd'],
  terminalTrim: '#b6a57c', terminalTrimDark: '#8a7c5c',
  glass: ['#3c4659', '#4b5670', '#5f6b86'],
  tower: ['#79808d', '#9199a5', '#aab0bb', '#c5cad2', '#d9dde3'],
  walkway: ['#7d8f86', '#9aaaa1', '#b4c2ba'],

  // signage
  signBoard: '#27231f', signEdge: '#3b3530', signText: '#ebe7de', pidsBody: '#15161a',
  line: {
    BL: '#1f72d4', YL: '#f2c21a', OR: '#f0852a', SV: '#a1a3a1', RD: '#d52c30', GR: '#12a150',
  },

  // train
  steel: ['#545b69', '#687080', '#7f8795', '#979fab', '#aeb5c0', '#c7ccd4'],
  stripeRed: '#b83238', stripeWhite: '#d9dbe0', stripeBlue: '#2d4f96',
  rubber: '#1a1c22',

  // foliage
  foliage: ['#1f2b25', '#2b3b31', '#3a4d3d', '#4d624b', '#63795a'],
  blossom: null, leaves: null,

  // people
  skin: ['#f1c7a5', '#e0a883', '#c68862', '#a0694a', '#7a4c34', '#5a3726'],
  hair: ['#1a1515', '#2e2019', '#4a2f22', '#6b4a2e', '#9a7348', '#c9a86b', '#8a8a8a', '#b04a26'],
  coats: ['#2a3040', '#1f2533', '#3b3f47', '#4a3b35', '#6a5a44', '#8a6a42', '#3b4a3a', '#5a2e33',
    '#c69a3e', '#2f4a6a', '#6b2a2a', '#50585f', '#a37a4d', '#243a3a', '#d4a83a'],
  pants: ['#1c1f28', '#2a2f3a', '#3a3530', '#252a33', '#4a4e57', '#2e3a4f'],
  accents: ['#d9a13a', '#b83a3a', '#e07a3a', '#3a8ab8', '#e0c05a', '#8a3ab8', '#3ab88a'],
  luggage: ['#2a2d35', '#3a4a6a', '#6a3a3a', '#1f1f24', '#8a8f99', '#4a5a4a'],

  vignette: '#0b0d14',
};

const SEASONS = {
  rain: {
    label: 'Grey rain (default)',
    weather: 'rain', rainDensity: 1, snowCover: false,
  },
  storm: {
    label: 'Heavy storm',
    weather: 'rain', rainDensity: 1.8, snowCover: false,
    sky: ['#2c313d', '#333946', '#3b4251', '#454c5c', '#515969', '#5f6778', '#6f7889'],
    haze: '#6f7889', cloudDark: '#2d333f', cloudMid: '#404755', cloudLight: '#5d6576',
  },
  snow: {
    label: 'Winter snow',
    weather: 'snow', rainDensity: 0, snowDensity: 1, snowCover: true,
    sky: ['#5c6474', '#687081', '#767e8f', '#858d9d', '#959cab', '#a6adba', '#b8bec9'],
    haze: '#aab1bd', cloudDark: '#6a7282', cloudMid: '#848c9b', cloudLight: '#a0a7b4',
    foliage: ['#2a3230', '#384340', '#48524d', '#5d6661', '#737b75'],
    snow: ['#c8cfdb', '#dde2ea', '#eef1f5'],
  },
  spring: {
    label: 'Cherry blossom drizzle',
    weather: 'rain', rainDensity: 0.45, snowCover: false, petals: true,
    sky: ['#4a5160', '#555d6c', '#616979', '#6e7686', '#7d8594', '#8d94a2', '#9ea4b1'],
    haze: '#9ba2af',
    foliage: ['#243328', '#324634', '#43603f', '#58784c', '#72915e'],
    blossom: ['#8a5a6e', '#b87a90', '#d99aae', '#f0bccb', '#fbdde5'],
  },
  autumn: {
    label: 'Autumn leaves',
    weather: 'rain', rainDensity: 0.7, snowCover: false, leavesFall: true,
    foliage: ['#3a2418', '#5a3120', '#86441f', '#b0602a', '#d08a3a'],
    leaves: ['#b0602a', '#d08a3a', '#9a3a22', '#c9a040'],
  },
  night: {
    label: 'Late night rain',
    weather: 'rain', rainDensity: 1, snowCover: false, night: true,
    sky: ['#12151e', '#161a24', '#1b202b', '#212633', '#282e3b', '#303645', '#3a4050'],
    haze: '#3a4050', cloudDark: '#141821', cloudMid: '#1d222c', cloudLight: '#2a303c',
    rain: '#8f9bb2', rainFar: '#5d6780',
  },
};

export const SEASON_NAMES = Object.keys(SEASONS);

export function makePalette(season = 'rain') {
  const s = SEASONS[season] || SEASONS.rain;
  const p = { ...BASE, ...s, season: SEASONS[season] ? season : 'rain' };
  if (s.night) {
    // darken the built world so the warm lights carry the scene
    for (const k of ['concrete', 'terminalRoof', 'tower', 'walkway', 'granite', 'steel', 'glass']) {
      p[k] = BASE[k].map((c) => shade(c, 0.45));
    }
    for (const k of ['c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12', 'terminalTrim']) p[k] = shade(BASE[k], 0.5);
    p.tile = BASE.tile.map((c) => shade(c, 0.6));
  }
  return p;
}

function shade(c, k) {
  const n = parseInt(c.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (v, bias) => Math.round(v * k + bias).toString(16).padStart(2, '0');
  return '#' + f(r, 4) + f(g, 6) + f(b, 14);
}

export function seasonLabel(name) { return (SEASONS[name] || SEASONS.rain).label; }
