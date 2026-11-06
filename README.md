# Digital IC Trainer
https://nikhilsk.xyz/dt
A browser-based digital IC trainer modelled on a bench trainer panel: breadboard, two IC sockets, 10 logic switches, 10 lamp monitors, four 7-segment digits with 7447 decoders, mono pulser, clock generator (1 Hz to 1 MHz) and power sources. No dependencies and no build step needed to run.

## Run
Open `index.html` in a browser, or enable GitHub Pages (Settings, Pages, deploy from the `main` branch root).

## Use
- Click a jack or breadboard hole, then another, to run a wire. Remove wires from the Wires list.
- Pick an IC in the library, then click a breadboard column or an empty socket.
- On the breadboard, wire +5V and GND to the chip's VCC and GND pins. Socket ICs are powered automatically. "Require IC power wiring" can be switched off.
- Load a guided experiment from the Experiments list.

## ICs
Basic gates: 7404, 7406, 7407, 7408, 7411, 7432, 7486. Universal gates: 7400, 7402, 7410, 7420, 7427, 7430. Flip-flops: 7474, 7476. Counters and registers: 7490, 7493, 74161, 74164. Decoders, mux, arithmetic: 7447, 7483, 74138, 74151, 74153.

7406 and 7407 are modelled as plain inverter and buffer (not open-collector). Floating inputs read high, as TTL does.

## Develop
```
npm test       # logic tests for the engine and every experiment
npm run build  # regenerate index.html from src/
```
- `src/engine.js`: net solver and IC models. Add a chip by adding an entry to `IC`.
- `src/presets.js`: guided experiments.
- `src/app.js`, `src/style.css`, `src/template.html`: the panel UI.

Fonts load from Google Fonts and fall back to system fonts offline.

## License
MIT
