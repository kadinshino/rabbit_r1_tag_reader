# R1 Tag Reader

A tiny static web app intended for Rabbit R1 Creations / WebView testing.

## v0.1 goals

- Live camera preview
- QR decoding in-browser with `jsQR`
- AprilTag adapter
- `tag36h11` support when the ARENA WASM build is placed in `vendor/apriltag`
- Family selector already prepared for:
  - tag36h11
  - tagStandard41h12
  - tagStandard52h13
  - tag25h9
  - tag16h5
  - tagCircle21h7
  - tagCircle49h12
- Rabbit R1 side-button and scroll-wheel event hooks
- Static hosting: GitHub Pages is enough

## Important camera test

The critical first R1 test is whether the Creation WebView grants
`navigator.mediaDevices.getUserMedia()` camera access.

If stock Creations do not expose camera access, this same UI can be retained
while the camera source is replaced with an R1-native bridge/service.

## Test locally

Camera access normally requires HTTPS or localhost.

Python:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

QR scanning should work immediately after camera permission is granted.

## GitHub Pages deployment

1. Create a new GitHub repo, for example `r1-tag-reader`.
2. Copy this project's files into the repo.
3. Commit and push.
4. Open the repo's **Settings → Pages**.
5. Choose **Deploy from a branch**.
6. Select branch `main` and folder `/ (root)`.
7. Save.
8. GitHub will give you an HTTPS Pages URL such as:
   `https://YOURNAME.github.io/r1-tag-reader/`
9. Open that URL on a phone/desktop first and test QR scanning.
10. Use Rabbit's Creations QR/self-host flow to make an R1-installable code
    that points at the Pages URL.

## First tests

### Desktop/phone
1. Open the Pages URL.
2. Press START.
3. Allow camera.
4. Point at a QR code.
5. Confirm text appears under LAST DETECTION.

### Rabbit R1
1. Install/open the Creation pointing at your GitHub Pages URL.
2. Press START or use the side button.
3. Confirm whether the camera permission prompt appears.
4. If camera opens, test QR.
5. Then add AprilTag WASM and test tag36h11.

## Why QR first?

QR gives us a known-good browser detector and lets us answer the biggest R1
question immediately: does the Creation WebView expose live camera frames?

Once that works, AprilTag is purely a detector/runtime problem.

## Multi-family AprilTag plan

The official AprilRobotics library supports many families. The browser
standalone build we are borrowing for the first proof-of-concept is
tag36h11-only.

For v0.2 we should compile a custom WebAssembly wrapper with functions like:

```text
set_family("tagStandard41h12")
detect(gray, width, height)
```

and include the family constructors we actually need.

Recommended initial production families:

- tagStandard41h12 — current AprilRobotics general recommendation
- tag36h11 — useful compatibility family
- tagStandard52h13 — when a larger ID space is needed

QR remains a separate detector.

## R1 controls

The app listens for the official Creation-style browser events:

- `sideClick`
- `scrollUp`
- `scrollDown`

Desktop equivalents:

- Enter/Space = side button
- Arrow Up/Down = wheel

## Project layout

```text
r1_tag_reader/
├── index.html
├── styles.css
├── README.md
├── js/
│   ├── app.js
│   ├── r1.js
│   └── detectors/
│       ├── qr.js
│       └── apriltag.js
└── vendor/
    └── apriltag/
        └── README.md
```
