const SUPPORTED_FAMILIES = [
  "tag36h11",
  "tagStandard41h12",
  "tagStandard52h13",
  "tag25h9",
  "tag16h5",
  "tagCircle21h7",
  "tagCircle49h12"
];

let modulePromise = null;
let detector = null;

export function aprilTagFamilies() {
  return [...SUPPORTED_FAMILIES];
}

async function loadScript(src) {
  await new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-apriltag="${src}"]`);
    if (existing) {
      if (window.Apriltag) return resolve();
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.dataset.apriltag = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export async function initAprilTag() {
  if (modulePromise) return modulePromise;

  modulePromise = (async () => {
    try {
      // Copy the ARENA standalone WASM files into vendor/apriltag/.
      // Expected files:
      //   apriltag.js
      //   apriltag_wasm.js
      //   apriltag_wasm.wasm
      //
      // For v0.1 this detector is tag36h11.
      await loadScript("./vendor/apriltag/apriltag.js");
      await loadScript("./vendor/apriltag/apriltag_wasm.js");

      if (typeof window.Apriltag !== "function") {
        throw new Error("Apriltag() global not found");
      }

      detector = await new Promise((resolve, reject) => {
        try {
          let instance;
          instance = window.Apriltag(() => resolve(instance));
        } catch (err) {
          reject(err);
        }
      });

      detector.set_return_pose?.(0);
      detector.set_return_solutions?.(0);
      detector.set_max_detections?.(8);
      return true;
    } catch (err) {
      console.warn("AprilTag WASM not loaded:", err);
      detector = null;
      return false;
    }
  })();

  return modulePromise;
}

export async function detectAprilTags(imageData, width, height, family) {
  if (!detector) return [];

  // The prebuilt ARENA module used by v0.1 is tag36h11 only.
  if (family !== "tag36h11") {
    return [{
      type: "APRILTAG MODULE",
      value: `${family} needs multi-family WASM build`,
      corners: null,
      meta: "v0.1 prebuilt detector supports tag36h11"
    }];
  }

  const rgba = imageData.data;
  const gray = new Uint8Array(width * height);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
    gray[j] = Math.round(
      rgba[i] * 0.299 +
      rgba[i + 1] * 0.587 +
      rgba[i + 2] * 0.114
    );
  }

  const hits = await detector.detect(gray, width, height);
  return (hits || []).map(hit => ({
    type: "APRILTAG",
    value: String(hit.id),
    corners: hit.corners,
    meta: `${family} • ID ${hit.id}`
  }));
}
