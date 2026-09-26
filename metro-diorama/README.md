# Metro Diorama: Reagan National, in the rain

An animated pixel-art diorama of the Ronald Reagan Washington National Airport
Metro platform, built as a looping cover for long lofi mixes. It's a side-on,
"fighting game stage" view: Metrorail trains run left to right, people board
and step off, and behind the tracks the domed terminal, the control tower and
the departures deck sit in grey rain. A plane climbs out now and then.

* `index.html`: the live scene (480×270 native, shown at an integer scale, so 4× at 1080p)
* `assets.html`: the asset workshop (every sprite on its own, PNG download, text/season tweaks)
* `tools/export.mjs`: frame-perfect video/GIF export (Playwright + ffmpeg)

No build step and no dependencies. It's plain ES modules and canvas, so it runs
from any static host (GitHub Pages included).

## Controls (index.html)

| key | action |
| --- | --- |
| `F` | fullscreen |
| `H` | show/hide HUD |
| `space` | pause |
| `S` | next season |
| `M` | toggle `live` / `loop` mode |
| `P` | save a 1080p PNG of the current frame |
| `R` | record exactly one loop to `.webm` in real time (browser MediaRecorder) |

URL parameters: `?season=snow&mode=loop&seed=7&fps=24&station=Line%201|Line%202&dests=Downtown%20Largo|Mt%20Vernon%20Sq&fit=fill`

* **live** (the default in the browser) picks a new line, new passengers and new planes
  every visit, so it never repeats. Use this for an OBS browser source.
* **loop** is fully deterministic and repeats every `visitSeconds × lines` (180 s by
  default: a Blue Line train, then a Yellow Line train). Use this for video.

## Exporting a 10-hour video

```sh
npm i -D playwright && npx playwright install chromium   # once
node tools/export.mjs --hours 10                          # needs ffmpeg on PATH
```

This renders the 180 s loop frame by frame at 30 fps (≈5400 frames, a few
minutes), pipes raw frames into ffmpeg, upscales 4× with nearest-neighbour
(crisp pixels), writes `out/metro-rain-loop.mp4`, then stream-copies it into
`out/metro-rain-10h.mp4` with no re-encode. Every animated element
(rain, clouds, traffic, blinking lights, marquee text) completes a whole number
of cycles per loop, so the seam can't be seen.

Other options: `--season snow`, `--format webm|gif|frames`, `--scale 8` (4K),
`--fps 24`, `--seed 42`, `--seconds 10` (quick test), `--ffmpeg /path/to/ffmpeg`.
The long file is big because rain is high-frequency detail; raise `-crf` in
`export.mjs` if you need it smaller. YouTube re-encodes anyway, so uploading
the 3-minute loop and looping it in an editor also works.

## How it's put together

```
config.js            text, season, timing, seed, PNG overrides
src/palette.js       cold greys + warm lights; seasons override keys
src/layout.js        scene geometry (y of the deck, platform edge, columns…)
src/core/            seeded RNG + noise, pixel buffer, 3×5 and 5×7 bitmap fonts
src/assets/          one generator per asset → Pix buffer → canvas
  background.js      sky, clouds, mist, monument, control tower, domed terminal, deck
  midground.js       trees, chain-link fence + overgrowth, station pylon, track
  foreground.js      platform tiles, canopy vaults, columns, bench, bin, PIDS housing
  train.js           car bodies (head/mid/tail per line), door leaves, lit interior
  people.js          procedural commuters: spec → back/front/side poses + walk cycles
  vehicles.js        deck traffic (sedans, SUVs, taxi, buses) and the plane
  index.js           registry + PNG override loader
src/sim/timeline.js  train visits: approach, braking, shudder, doors, departure, PIDS
src/sim/crowd.js     scripted passenger paths (board / alight / pass through)
src/scene.js         composites everything back to front for a time t, plus weather,
                     traffic, lighting, wet-floor reflections
```

Every frame is a pure function of `(config, t)`. Nothing is simulated
frame to frame, so any frame can be rendered in any order, which is how the
exporter can render one loop exactly.

### Tweaking

* **Text**: `config.js → text` (station name, line destinations, car numbers, shuttle LED).
* **Season**: `rain`, `storm`, `snow`, `spring` (cherry blossoms), `autumn`, `night`.
  Add your own in `src/palette.js`; a season is just palette overrides plus weather flags.
* **Hand-painted art**: open `assets.html`, download a sprite, repaint it at the same
  size, drop it in `overrides/`, and add `overrides: { tower: 'overrides/tower.png' }`
  in `config.js`. Any named asset can be replaced; the scene uses your PNG.
* **Timing**: `src/sim/timeline.js → T` (dwell time, braking speed, where the train stops).
* **Crowd size**: `src/sim/crowd.js` (`nA`, `nB`, `nP`).
