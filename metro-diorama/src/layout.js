// Scene geometry (native 480x270 pixels). Layers are listed back to front.
export const W = 480;
export const H = 270;

export const L = {
  towerX: 84,            // centre of the control tower
  domeTop: 92,           // top of terminal domes
  terminalTop: 88,       // terminal sprite origin
  deckTop: 148,          // top of roadway parapet (cars sit behind it)
  deckBottom: 162,       // bottom of the deck beam
  lowerRoadY: 176,       // lights of the lower arrivals road
  fenceTop: 176,
  trackTop: 198,
  railY: 203,
  platformEdge: 206,     // far edge of our platform; train floor line
  tactileY: 212,
  tileTop: 216,
  trainTop: 156,         // roof line of the train
  canopyBottom: 36,      // lowest point of canopy fascia (at columns)
  canopyApex: 17,
  columns: [204, 444],
  columnBase: 238,       // feet-y of the columns for depth sorting
  signX: 22, signY: 144, // station pylon (behind the track)
  pidsX: 272, pidsY: 36,
  walkMinY: 222, walkMaxY: 264,
  benchX: 352, benchY: 252,
};
