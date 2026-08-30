import { detectQR } from "./detectors/qr.js?v=2";
import { initAprilTag, detectAprilTags, isAprilTagReady, BUILD_FAMILY } from "./detectors/apriltag.js?v=2";
import { installR1Controls } from "./r1.js?v=2";

const video = document.querySelector("#video");
const overlay = document.querySelector("#overlay");
const workCanvas = document.querySelector("#workCanvas");
const startBtn = document.querySelector("#startBtn");
const copyBtn = document.querySelector("#copyBtn");
const cameraCard = document.querySelector(".camera-card");
const mode = document.querySelector("#mode");
const family = document.querySelector("#family");
const resultType = document.querySelector("#resultType");
const resultValue = document.querySelector("#resultValue");
const resultMeta = document.querySelector("#resultMeta");
const cameraMessage = document.querySelector("#cameraMessage");

let stream = null;
let running = false;
let starting = false;
let userStopped = false;
let aprilReady = false;
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

function setStatus(text) {
  resultMeta.textContent = text;
}

// Explains AprilTag silence instead of failing invisibly.
function aprilTagWarning() {
  const wantsTags = mode.value === "apriltag" || mode.value === "auto";
  if (!wantsTags) return null;
  if (!aprilReady) return "AprilTag module missing — see vendor/apriltag";
  if (family.value !== BUILD_FAMILY) return `Build supports ${BUILD_FAMILY} only`;
  return null;
}

function refreshIdleStatus() {
  if (lastResult) return;
  const warn = aprilTagWarning();
  setStatus(warn ?? (running ? "Scanning…" : "Ready"));
}

function showMessage(text) {
  if (text === null) {
    cameraMessage.hidden = true;
    return;
  }
  cameraMessage.textContent = text;
  cameraMessage.hidden = false;
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
  if (running || starting) return;
  starting = true;
  showMessage("Starting camera…");

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
    showMessage(null);
    refreshIdleStatus();
    requestAnimationFrame(scanLoop);
  } catch (err) {
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
    startBtn.textContent = "START";
    showMessage("Camera unavailable — tap to retry");
    setStatus(err?.message || "Could not open camera");
  } finally {
    starting = false;
  }
}

function stopCamera() {
  userStopped = true;
  running = false;
  stream?.getTracks().forEach(track => track.stop());
  stream = null;
  video.srcObject = null;
  startBtn.textContent = "START";
  showMessage("Camera off");
  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
}

function toggleCamera() {
  if (running) stopCamera();
  else { userStopped = false; startCamera(); }
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

        overlay.width = cameraCard.clientWidth || 320;
        overlay.height = cameraCard.clientHeight || 240;
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

startBtn.addEventListener("click", toggleCamera);

// Tapping the preview retries a blocked/denied camera.
cameraCard.addEventListener("click", () => {
  if (!running) { userStopped = false; startCamera(); }
});

copyBtn.addEventListener("click", async () => {
  if (!lastResult) return;
  const text = `${lastResult.type}: ${lastResult.value}`;
  try {
    await navigator.clipboard.writeText(text);
    setStatus("Copied");
  } catch {
    setStatus(text);
  }
});

installR1Controls({
  onClick: toggleCamera,
  onScrollUp: () => {
    family.selectedIndex = Math.max(0, family.selectedIndex - 1);
  },
  onScrollDown: () => {
    family.selectedIndex = Math.min(family.options.length - 1, family.selectedIndex + 1);
  }
});

// Optional AprilTag module loads in the background; QR keeps working either way.
initAprilTag().then(ok => {
  aprilReady = ok && isAprilTagReady();
  if (!aprilReady) {
    console.warn("AprilTag detector unavailable: vendor/apriltag WASM not loaded.");
  }
  refreshIdleStatus();
});

mode.addEventListener("change", refreshIdleStatus);
family.addEventListener("change", refreshIdleStatus);

setResult(null);

// Open the camera as soon as the app loads.
startCamera();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && !running && !userStopped) startCamera();
});
