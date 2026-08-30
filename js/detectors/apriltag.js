const SUPPORTED_FAMILIES = [
  "tag36h11",
  "tag16h5"
];

let modulePromise = null;
let detector = null;
let worker = null;
let activeFamily = "tag36h11";

export const BUILD_FAMILIES = [...SUPPORTED_FAMILIES];

export function isAprilTagReady() {
  return !!detector;
}

export function aprilTagFamilies() {
  return [...SUPPORTED_FAMILIES];
}

export async function initAprilTag() {
  if (modulePromise) return modulePromise;

  modulePromise = (async () => {
    try {
      // ARENA exposes Apriltag through a Web Worker using Comlink. Loading
      // apriltag.js as a normal page script does not create window.Apriltag.
      const Comlink = await import("https://unpkg.com/comlink/dist/esm/comlink.mjs");
      const workerUrl = new URL("../../vendor/apriltag/apriltag.js", import.meta.url);
      worker = new Worker(workerUrl);
      const Apriltag = Comlink.wrap(worker);

      let signalReady;
      const ready = new Promise(resolve => { signalReady = resolve; });
      detector = await new Apriltag(Comlink.proxy(signalReady));
      await ready;

      detector.set_return_pose?.(0);
      detector.set_return_solutions?.(0);
      detector.set_max_detections?.(8);
      return true;
    } catch (err) {
      console.warn("AprilTag WASM not loaded:", err);
      worker?.terminate();
      worker = null;
      detector = null;
      return false;
    }
  })();

  return modulePromise;
}

export async function detectAprilTags(imageData, width, height, family) {
  if (!detector) return [];

  if (!await setAprilTagFamily(family)) return [];

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

export async function setAprilTagFamily(family) {
  if (!detector || !SUPPORTED_FAMILIES.includes(family)) return false;
  if (family === activeFamily) return true;

  const result = await detector.set_family(family);
  if (result !== 0) throw new Error(`Could not switch AprilTag family to ${family}`);
  activeFamily = family;
  return true;
}
