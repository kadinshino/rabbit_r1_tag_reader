# AprilTag WASM vendor folder

The ARENA tag36h11 browser build is vendored in this folder:

- `apriltag.js` — Comlink Web Worker wrapper
- `apriltag_wasm.js` — Emscripten loader
- `apriltag_wasm.wasm` — detector binary

Source:

https://github.com/arenaxr/apriltag-js-standalone

The upstream BSD-3-Clause license is included as `LICENSE`.

The ARENA standalone detector is a proven browser/WASM build based on the
official AprilRobotics C library, but its prebuilt detector is tag36h11.

For multiple AprilTag families, the next step is to compile our own WASM
wrapper against AprilRobotics/apriltag and expose family selection.
