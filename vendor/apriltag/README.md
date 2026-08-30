# AprilTag WASM vendor folder

This folder contains a custom build based on ARENA's browser detector with
runtime family switching for `tag36h11` and `tag16h5`:

- `apriltag.js` — Comlink Web Worker wrapper
- `apriltag_wasm.js` — Emscripten loader
- `apriltag_wasm.wasm` — detector binary

Source:

https://github.com/arenaxr/apriltag-js-standalone

The upstream BSD-3-Clause license is included as `LICENSE`.

The C wrapper and WASM binary were extended locally to switch detector
families without loading a second worker.

For multiple AprilTag families, the next step is to compile our own WASM
wrapper against AprilRobotics/apriltag and expose family selection.
