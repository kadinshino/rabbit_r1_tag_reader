# AprilTag WASM vendor folder

The app works as a QR reader without anything in this folder.

For AprilTag v0.1, copy the browser build from:

https://github.com/arenaxr/apriltag-js-standalone

into this directory and make sure the filenames used by
`js/detectors/apriltag.js` match the copied files.

The ARENA standalone detector is a proven browser/WASM build based on the
official AprilRobotics C library, but its prebuilt detector is tag36h11.

For multiple AprilTag families, the next step is to compile our own WASM
wrapper against AprilRobotics/apriltag and expose family selection.
