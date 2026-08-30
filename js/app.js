import { detectQR } from "./detectors/qr.js";
import { initAprilTag, detectAprilTags } from "./detectors/apriltag.js";
import { installR1Controls } from "./r1.js";

const video = document.querySelector("#video");
const overlay = document.querySelector("#overlay");
const workCanvas = document.querySelector("#workCanvas");
const startBtn = document.querySelector("#startBtn");
const copyBtn = document.querySelector("#copyBtn");
const mode = document.querySelector("#mode");
const family = document.querySelector("#family");
const resultType = document.querySelector("#resultType");
const resultValue = document.querySelector("#resultValue");
const resultMeta = document.querySelector("#resultMeta");
const cameraMessage = document.querySelector("#cameraMessage");
const footerStatus = document.querySelector("#footerStatus");
const statusDot = document.querySelector("#statusDot");

let stream = null;
let running = false;
let lastResult = null;
let scanBusy = false;
let lastScan = 0;
const SCAN_INTERVAL_MS = 180;

const ctx = workCanvas.getContext("2d", { willReadFrequently: true });
const overlayCtx = overlay.getContext("2d");

function setResult(hit) {
  lastResult = hit;
  resultType.textContent = hit?.type ?? "—";
  resultValue.textContent = hit?.value ?? "Nothing scanned";
  resultMeta.textContent = hit?.meta ?? "Ready";
}

function drawHit(hit, sx, sy) {
  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
  if (!hit?.corners?.length) return;

  overlayCtx.lineWidth = 3;
  overlayCtx.strokeStyle = "#d9ff00";
  overlayCtx.beginPath();

  const points = hit.corners.map(p => ({
    x: (p.x ?? p[0]) * sx,
    y: (p.y ?? p[1]) * sy
  }));

  overlayCtx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) overlayCtx.lineTo(points[i].x, points[i].y);
  overlayCtx.closePath();
  overlayCtx.stroke();
}

async function startCamera() {
  if (running) {
    stopCamera();
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    });

    video.srcObject = stream;
    await video.play();

    running = true;
    startBtn.textContent = "STOP";
    cameraMessage.hidden = true;
    statusDot.classList.add("live");
    footerStatus.textContent = "Camera live";
    requestAnimationFrame(scanLoop);
  } catch (err) {
    cameraMessage.hidden = false;
    cameraMessage.textContent = "CAMERA BLOCKED";
    footerStatus.textContent = err?.message || "Could not open camera";
  }
}

function stopCamera() {
  running = false;
  stream?.getTracks().forEach(track => track.stop());
  stream = null;
  video.srcObject = null;
  startBtn.textContent = "START";
  cameraMessage.hidden = false;
  cameraMessage.textContent = "Press START";
  statusDot.classList.remove("live");
  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
}

async function scanLoop(now) {
  if (!running) return;

  if (!scanBusy && video.readyState >= 2 && now - lastScan >= SCAN_INTERVAL_MS) {
    scanBusy = true;
    lastScan = now;
    try {
      // Decode at a modest size for R1 performance.
      const width = 320;
      const height = Math.round(width * (video.videoHeight / video.videoWidth || .75));
      workCanvas.width = width;
      workCanvas.height = height;
      ctx.drawImage(video, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      let hits = [];

      if (mode.value === "qr" || mode.value === "auto") {
        hits = detectQR(imageData, width, height);
      }

      if (!hits.length && (mode.value === "apriltag" || mode.value === "auto")) {
        hits = await detectAprilTags(imageData, width, height, family.value);
      }

      if (hits.length) {
        const hit = hits[0];
        setResult(hit);

        overlay.width = video.clientWidth || 320;
        overlay.height = video.clientHeight || 240;
        drawHit(hit, overlay.width / width, overlay.height / height);
      } else {
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
      }
    } catch (err) {
      console.error(err);
    } finally {
      scanBusy = false;
    }
  }

  requestAnimationFrame(scanLoop);
}

startBtn.addEventListener("click", startCamera);

copyBtn.addEventListener("click", async () => {
  if (!lastResult) return;
  const text = `${lastResult.type}: ${lastResult.value}`;
  try {
    await navigator.clipboard.writeText(text);
    footerStatus.textContent = "Copied";
  } catch {
    footerStatus.textContent = text;
  }
});

installR1Controls({
  onClick: startCamera,
  onScrollUp: () => {
    const next = Math.max(0, family.selectedIndex - 1);
    family.selectedIndex = next;
  },
  onScrollDown: () => {
    const next = Math.min(family.options.length - 1, family.selectedIndex + 1);
    family.selectedIndex = next;
  }
});

// Attempt to initialize optional AprilTag module without blocking QR.
initAprilTag().then(ok => {
  footerStatus.textContent = ok
    ? "QR + tag36h11 ready"
    : "QR ready • add AprilTag WASM for tag detection";
});

setResult(null);
